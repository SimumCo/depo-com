from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from pydantic import BaseModel, field_validator
from models.user import UserRole
from utils.auth import require_role
from config.database import db
from services.seftali.utils import (
    gen_id, now_utc, to_iso,
    COL_CUSTOMERS, COL_PRODUCTS, COL_DELIVERIES, COL_STOCK_DECLARATIONS,
    COL_CONSUMPTION_STATS, COL_SYSTEM_DRAFTS, COL_WORKING_COPIES,
    COL_ORDERS, COL_VARIANCE_EVENTS, COL_AUDIT_EVENTS, std_resp,
)
from services.seftali.consumption_service import ConsumptionService
from services.seftali.draft_service import DraftService
from services.seftali.variance_service import VarianceService

router = APIRouter(prefix="/customer", tags=["Seftali-Customer"])


# ---------- helpers ----------
async def _get_sf_customer(user):
    c = await db[COL_CUSTOMERS].find_one({"user_id": user.id, "is_active": True}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Musteri profili bulunamadi")
    return c


# ---------- schemas ----------
class ItemQty(BaseModel):
    product_id: str
    qty: float

    @field_validator("qty")
    @classmethod
    def qty_positive(cls, v):
        if v < 0:
            raise ValueError("qty negatif olamaz")
        return v


class DeliveryItemQty(BaseModel):
    product_id: str
    qty: float

    @field_validator("qty")
    @classmethod
    def qty_positive(cls, v):
        if v <= 0:
            raise ValueError("qty sifirdan buyuk olmali")
        return v


class WCUpdateItem(BaseModel):
    product_id: str
    user_qty: Optional[float] = None
    removed: bool = False

    @field_validator("user_qty")
    @classmethod
    def check_qty(cls, v):
        if v is not None and v == 0:
            raise ValueError("Gecerli bir adet girin veya urunu listeden cikarin.")
        if v is not None and v < 0:
            raise ValueError("Adet negatif olamaz")
        return v


class WCAddItem(BaseModel):
    product_id: str
    user_qty: float

    @field_validator("user_qty")
    @classmethod
    def check_qty(cls, v):
        if v <= 0:
            raise ValueError("Adet sifirdan buyuk olmali")
        return v


class StockDeclBody(BaseModel):
    declared_at: Optional[str] = None
    items: List[ItemQty]

    @field_validator("items")
    @classmethod
    def not_empty(cls, v):
        if not v:
            raise ValueError("En az bir urun gerekli")
        pids = [i.product_id for i in v]
        if len(pids) != len(set(pids)):
            raise ValueError("Tekrarlayan urun_id")
        return v


class RejectBody(BaseModel):
    reason: str = ""


class BulkReasonBody(BaseModel):
    event_ids: List[str]
    reason_code: str
    reason_note: str = ""


class BulkDismissBody(BaseModel):
    event_ids: List[str]
    reason_code: str = "BILINMIYOR"


# ===========================
# 1. GET /draft
# ===========================
@router.get("/draft")
async def get_draft(current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    draft = await db[COL_SYSTEM_DRAFTS].find_one({"customer_id": cust["id"]}, {"_id": 0})
    if not draft:
        return std_resp(True, {"customer_id": cust["id"], "items": [], "generated_from": None}, "Henuz taslak yok")
    # enrich product names
    for it in draft.get("items", []):
        p = await db[COL_PRODUCTS].find_one({"id": it["product_id"]}, {"_id": 0, "name": 1, "code": 1})
        if p:
            it["product_name"] = p.get("name", "")
            it["product_code"] = p.get("code", "")
    return std_resp(True, draft)


# ===========================
# 2. POST /working-copy/start
# ===========================
@router.post("/working-copy/start")
async def start_working_copy(current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    cid = cust["id"]

    active = await db[COL_WORKING_COPIES].find_one(
        {"customer_id": cid, "status": "active"}, {"_id": 0}
    )
    if active:
        return std_resp(True, active, "Mevcut calisma kopyasi")

    draft = await db[COL_SYSTEM_DRAFTS].find_one({"customer_id": cid}, {"_id": 0})
    wc_items = []
    if draft:
        for di in draft.get("items", []):
            wc_items.append({
                "product_id": di["product_id"],
                "user_qty": None,
                "removed": False,
                "source": "draft",
            })

    wc = {
        "id": gen_id(),
        "customer_id": cid,
        "status": "active",
        "items": wc_items,
        "created_at": to_iso(now_utc()),
        "updated_at": to_iso(now_utc()),
    }
    await db[COL_WORKING_COPIES].insert_one(wc)
    wc.pop("_id", None)
    return std_resp(True, wc, "Calisma kopyasi olusturuldu")


# ===========================
# 3. PATCH /working-copy/{id}
# ===========================
@router.patch("/working-copy/{wc_id}")
async def update_working_copy(wc_id: str, items: List[WCUpdateItem], current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    wc = await db[COL_WORKING_COPIES].find_one({"id": wc_id, "customer_id": cust["id"], "status": "active"}, {"_id": 0})
    if not wc:
        raise HTTPException(404, "Calisma kopyasi bulunamadi")

    existing_map = {it["product_id"]: it for it in wc["items"]}
    for upd in items:
        if upd.product_id in existing_map:
            existing_map[upd.product_id]["user_qty"] = upd.user_qty
            existing_map[upd.product_id]["removed"] = upd.removed

    await db[COL_WORKING_COPIES].update_one(
        {"id": wc_id},
        {"$set": {"items": list(existing_map.values()), "updated_at": to_iso(now_utc())}},
    )
    fresh = await db[COL_WORKING_COPIES].find_one({"id": wc_id}, {"_id": 0})
    return std_resp(True, fresh)


# ===========================
# 4. POST /working-copy/{id}/items
# ===========================
@router.post("/working-copy/{wc_id}/items")
async def add_wc_item(wc_id: str, body: WCAddItem, current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    wc = await db[COL_WORKING_COPIES].find_one({"id": wc_id, "customer_id": cust["id"], "status": "active"}, {"_id": 0})
    if not wc:
        raise HTTPException(404, "Calisma kopyasi bulunamadi")

    for it in wc["items"]:
        if it["product_id"] == body.product_id and not it.get("removed"):
            raise HTTPException(409, "Urun zaten mevcut")

    new_item = {"product_id": body.product_id, "user_qty": body.user_qty, "removed": False, "source": "manual_add"}
    await db[COL_WORKING_COPIES].update_one(
        {"id": wc_id},
        {"$push": {"items": new_item}, "$set": {"updated_at": to_iso(now_utc())}},
    )
    fresh = await db[COL_WORKING_COPIES].find_one({"id": wc_id}, {"_id": 0})
    return std_resp(True, fresh)


# ===========================
# 5. POST /working-copy/{id}/submit
# ===========================
@router.post("/working-copy/{wc_id}/submit")
async def submit_working_copy(wc_id: str, current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    wc = await db[COL_WORKING_COPIES].find_one({"id": wc_id, "customer_id": cust["id"], "status": "active"}, {"_id": 0})
    if not wc:
        raise HTTPException(404, "Calisma kopyasi bulunamadi")

    valid_items = [it for it in wc["items"] if not it.get("removed") and it.get("user_qty") and it["user_qty"] > 0]
    if not valid_items:
        raise HTTPException(400, "En az 1 kalem gecerli olmali (removed=false ve user_qty>0)")

    order = {
        "id": gen_id(),
        "customer_id": cust["id"],
        "created_from_working_copy_id": wc_id,
        "status": "submitted",
        "items": [{"product_id": it["product_id"], "qty": it["user_qty"]} for it in valid_items],
        "created_at": to_iso(now_utc()),
        "updated_at": to_iso(now_utc()),
    }
    await db[COL_ORDERS].insert_one(order)
    order.pop("_id", None)

    await db[COL_WORKING_COPIES].update_one(
        {"id": wc_id}, {"$set": {"status": "submitted", "updated_at": to_iso(now_utc())}}
    )
    return std_resp(True, order, "Siparis olusturuldu")


# ===========================
# 6. GET /deliveries/pending
# ===========================
@router.get("/deliveries/pending")
async def pending_deliveries(current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    cursor = db[COL_DELIVERIES].find(
        {"customer_id": cust["id"], "acceptance_status": "pending"}, {"_id": 0}
    ).sort("delivered_at", -1)
    items = await cursor.to_list(length=100)
    # enrich product names
    for d in items:
        for it in d.get("items", []):
            p = await db[COL_PRODUCTS].find_one({"id": it["product_id"]}, {"_id": 0, "name": 1, "code": 1})
            if p:
                it["product_name"] = p.get("name", "")
                it["product_code"] = p.get("code", "")
    return std_resp(True, items)


# ===========================
# 7. POST /deliveries/{id}/accept
# ===========================
@router.post("/deliveries/{delivery_id}/accept")
async def accept_delivery(delivery_id: str, current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    cid = cust["id"]

    dlv = await db[COL_DELIVERIES].find_one({"id": delivery_id, "customer_id": cid}, {"_id": 0})
    if not dlv:
        raise HTTPException(404, "Teslimat bulunamadi")
    if dlv["acceptance_status"] == "accepted":
        raise HTTPException(409, "Teslimat zaten onaylanmis.")
    if dlv["acceptance_status"] == "rejected":
        raise HTTPException(409, "Teslimat zaten reddedilmis.")

    now = now_utc()
    # 1 - mark accepted
    await db[COL_DELIVERIES].update_one(
        {"id": delivery_id},
        {"$set": {"acceptance_status": "accepted", "accepted_at": to_iso(now), "updated_at": to_iso(now)}},
    )
    dlv["accepted_at"] = now

    # 2 - consumption
    await ConsumptionService.apply_delivery_accepted(cid, dlv)

    # 3 - draft
    pids = [it["product_id"] for it in dlv["items"]]
    await DraftService.update_draft_for_customer(cid, pids, "delivery_accept")

    # 4 - kill active working copy
    wc_deleted = False
    active_wc = await db[COL_WORKING_COPIES].find_one({"customer_id": cid, "status": "active"}, {"_id": 0})
    if active_wc:
        await db[COL_WORKING_COPIES].update_one(
            {"id": active_wc["id"]},
            {"$set": {"status": "deleted_by_delivery", "updated_at": to_iso(now)}},
        )
        wc_deleted = True

    # 5 - audit
    await db[COL_AUDIT_EVENTS].insert_one({
        "type": "delivery_accepted", "customer_id": cid, "delivery_id": delivery_id,
        "performed_by": current_user.id, "at": to_iso(now),
    })

    return std_resp(True, {"delivery_id": delivery_id, "working_copy_deleted": wc_deleted},
                    "Teslimat onaylandi. Tuketim hesaplamalari guncellendi.")


# ===========================
# 8. POST /deliveries/{id}/reject
# ===========================
@router.post("/deliveries/{delivery_id}/reject")
async def reject_delivery(delivery_id: str, body: RejectBody = Body(default=RejectBody()), current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    dlv = await db[COL_DELIVERIES].find_one({"id": delivery_id, "customer_id": cust["id"]}, {"_id": 0})
    if not dlv:
        raise HTTPException(404, "Teslimat bulunamadi")
    if dlv["acceptance_status"] == "rejected":
        raise HTTPException(409, "Teslimat zaten reddedilmis.")
    if dlv["acceptance_status"] == "accepted":
        raise HTTPException(409, "Teslimat zaten onaylanmis.")

    now = now_utc()
    await db[COL_DELIVERIES].update_one(
        {"id": delivery_id},
        {"$set": {"acceptance_status": "rejected", "rejected_at": to_iso(now),
                  "rejection_reason": body.reason, "updated_at": to_iso(now)}},
    )
    return std_resp(True, {"delivery_id": delivery_id}, "Teslimat reddedildi.")


# ===========================
# 9. POST /stock-declarations
# ===========================
@router.post("/stock-declarations")
async def create_stock_declaration(body: StockDeclBody, current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    cid = cust["id"]
    now = now_utc()
    declared_at = body.declared_at or to_iso(now)

    sd = {
        "id": gen_id(),
        "customer_id": cid,
        "declared_at": declared_at,
        "items": [{"product_id": it.product_id, "qty": it.qty} for it in body.items],
        "created_at": to_iso(now),
        "updated_at": to_iso(now),
    }
    await db[COL_STOCK_DECLARATIONS].insert_one(sd)
    sd.pop("_id", None)

    # pipeline
    sd_for_svc = {"id": sd["id"], "declared_at": declared_at, "items": sd["items"]}
    _, spike_events = await ConsumptionService.apply_stock_declaration(cid, sd_for_svc)

    for se in spike_events:
        await VarianceService.create_variance_for_spike(
            se["customer_id"], se["product_id"], se["stock_decl_id"],
            se["spike_ratio"], se["observed_daily"], se["base_avg"],
        )

    pids = [it.product_id for it in body.items]
    await DraftService.update_draft_for_customer(cid, pids, "stock_decl")

    await db[COL_AUDIT_EVENTS].insert_one({
        "type": "stock_declaration", "customer_id": cid, "stock_decl_id": sd["id"],
        "performed_by": current_user.id, "at": to_iso(now),
    })

    return std_resp(True, {"stock_declaration_id": sd["id"], "spikes_detected": len(spike_events)},
                    "Stok beyani kaydedildi.")


# ===========================
# 10. GET /variance/pending
# ===========================
@router.get("/variance/pending")
async def pending_variance(current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    cursor = db[COL_VARIANCE_EVENTS].find(
        {"customer_id": cust["id"], "status": "needs_reason"}, {"_id": 0}
    ).sort("detected_at", -1)
    items = await cursor.to_list(length=100)
    for it in items:
        p = await db[COL_PRODUCTS].find_one({"id": it["product_id"]}, {"_id": 0, "name": 1, "code": 1})
        if p:
            it["product_name"] = p.get("name", "")
    return std_resp(True, items)


# ===========================
# 11. POST /variance/apply-reason-bulk
# ===========================
@router.post("/variance/apply-reason-bulk")
async def apply_reason_bulk(body: BulkReasonBody, current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    now = now_utc()
    modified = 0
    for eid in body.event_ids:
        ev = await db[COL_VARIANCE_EVENTS].find_one(
            {"id": eid, "customer_id": cust["id"]}, {"_id": 0}
        )
        if not ev:
            continue
        if ev["status"] != "needs_reason":
            continue
        await db[COL_VARIANCE_EVENTS].update_one(
            {"id": eid},
            {"$set": {
                "status": "recorded", "reason_code": body.reason_code,
                "reason_note": body.reason_note, "customer_action_at": to_iso(now),
                "updated_at": to_iso(now),
            }},
        )
        modified += 1
    return std_resp(True, {"modified": modified})


# ===========================
# 12. POST /variance/dismiss-bulk
# ===========================
@router.post("/variance/dismiss-bulk")
async def dismiss_bulk(body: BulkDismissBody, current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    now = now_utc()
    modified = 0
    for eid in body.event_ids:
        ev = await db[COL_VARIANCE_EVENTS].find_one(
            {"id": eid, "customer_id": cust["id"]}, {"_id": 0}
        )
        if not ev:
            continue
        if ev["status"] != "needs_reason":
            continue
        await db[COL_VARIANCE_EVENTS].update_one(
            {"id": eid},
            {"$set": {
                "status": "dismissed", "reason_code": body.reason_code,
                "customer_action_at": to_iso(now), "updated_at": to_iso(now),
            }},
        )
        modified += 1
    return std_resp(True, {"modified": modified})


# ===========================
# EXTRA: GET /products (list sf products for UI)
# ===========================
@router.get("/products")
async def list_products(current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cursor = db[COL_PRODUCTS].find({}, {"_id": 0})
    items = await cursor.to_list(length=500)
    return std_resp(True, items)


# ===========================
# EXTRA: GET /profile (customer profile)
# ===========================
@router.get("/profile")
async def get_profile(current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    return std_resp(True, cust)



# ===========================
# EXTRA: GET /deliveries/history (all past deliveries)
# ===========================
@router.get("/deliveries/history")
async def delivery_history(current_user=Depends(require_role([UserRole.CUSTOMER]))):
    cust = await _get_sf_customer(current_user)
    cursor = db[COL_DELIVERIES].find(
        {"customer_id": cust["id"]}, {"_id": 0}
    ).sort("delivered_at", -1)
    items = await cursor.to_list(length=500)
    for d in items:
        for it in d.get("items", []):
            p = await db[COL_PRODUCTS].find_one({"id": it["product_id"]}, {"_id": 0, "name": 1, "code": 1})
            if p:
                it["product_name"] = p.get("name", "")
                it["product_code"] = p.get("code", "")
    return std_resp(True, items)
