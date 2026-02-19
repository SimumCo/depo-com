from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel, field_validator
from models.user import UserRole
from utils.auth import require_role
from config.database import db
from services.seftali.utils import (
    gen_id, now_utc, to_iso,
    COL_CUSTOMERS, COL_PRODUCTS, COL_DELIVERIES, COL_ORDERS, std_resp,
)

router = APIRouter(prefix="/sales", tags=["Seftali-Sales"])


# ---------- schemas ----------
class DeliveryItem(BaseModel):
    product_id: str
    qty: float

    @field_validator("qty")
    @classmethod
    def qty_pos(cls, v):
        if v <= 0:
            raise ValueError("qty sifirdan buyuk olmali")
        return v


class CreateDeliveryBody(BaseModel):
    customer_id: str
    delivery_type: str = "route"
    delivered_at: Optional[str] = None
    invoice_no: Optional[str] = None
    items: List[DeliveryItem]

    @field_validator("items")
    @classmethod
    def validate_items(cls, v):
        if not v:
            raise ValueError("En az bir urun gerekli")
        pids = [i.product_id for i in v]
        if len(pids) != len(set(pids)):
            raise ValueError("Tekrarlayan urun_id")
        return v

    @field_validator("delivery_type")
    @classmethod
    def check_type(cls, v):
        if v not in ("route", "off_route"):
            raise ValueError("delivery_type: route veya off_route olmali")
        return v


class OrderActionBody(BaseModel):
    note: str = ""


SALES_ROLES = [UserRole.SALES_REP, UserRole.SALES_AGENT]


# ===========================
# 1. POST /deliveries
# ===========================
@router.post("/deliveries")
async def create_delivery(body: CreateDeliveryBody, current_user=Depends(require_role(SALES_ROLES))):
    # verify customer exists
    cust = await db[COL_CUSTOMERS].find_one({"id": body.customer_id, "is_active": True}, {"_id": 0})
    if not cust:
        raise HTTPException(404, "Musteri bulunamadi")

    now = now_utc()
    dlv = {
        "id": gen_id(),
        "customer_id": body.customer_id,
        "created_by_salesperson_id": current_user.id,
        "delivery_type": body.delivery_type,
        "delivered_at": body.delivered_at or to_iso(now),
        "invoice_no": body.invoice_no,
        "acceptance_status": "pending",
        "accepted_at": None,
        "rejected_at": None,
        "rejection_reason": None,
        "items": [{"product_id": it.product_id, "qty": it.qty} for it in body.items],
        "created_at": to_iso(now),
        "updated_at": to_iso(now),
    }
    await db[COL_DELIVERIES].insert_one(dlv)
    dlv.pop("_id", None)
    return std_resp(True, dlv, "Teslimat olusturuldu (pending)")


# ===========================
# 2. GET /deliveries
# ===========================
@router.get("/deliveries")
async def list_deliveries(
    status: Optional[str] = None,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    current_user=Depends(require_role(SALES_ROLES)),
):
    filt = {}
    if status:
        filt["acceptance_status"] = status
    if from_date or to_date:
        filt["delivered_at"] = {}
        if from_date:
            filt["delivered_at"]["$gte"] = from_date
        if to_date:
            filt["delivered_at"]["$lte"] = to_date

    cursor = db[COL_DELIVERIES].find(filt, {"_id": 0}).sort("delivered_at", -1)
    items = await cursor.to_list(length=200)
    # enrich customer names
    for d in items:
        c = await db[COL_CUSTOMERS].find_one({"id": d["customer_id"]}, {"_id": 0, "name": 1})
        if c:
            d["customer_name"] = c["name"]
    return std_resp(True, items)


# ===========================
# 3. GET /orders
# ===========================
@router.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    current_user=Depends(require_role(SALES_ROLES)),
):
    filt = {}
    if status:
        filt["status"] = status
    if from_date or to_date:
        filt["created_at"] = {}
        if from_date:
            filt["created_at"]["$gte"] = from_date
        if to_date:
            filt["created_at"]["$lte"] = to_date

    cursor = db[COL_ORDERS].find(filt, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=200)
    for o in items:
        c = await db[COL_CUSTOMERS].find_one({"id": o["customer_id"]}, {"_id": 0, "name": 1})
        if c:
            o["customer_name"] = c["name"]
        for it in o.get("items", []):
            p = await db[COL_PRODUCTS].find_one({"id": it["product_id"]}, {"_id": 0, "name": 1})
            if p:
                it["product_name"] = p["name"]
    return std_resp(True, items)


# ===========================
# 4. POST /orders/{id}/approve
# ===========================
@router.post("/orders/{order_id}/approve")
async def approve_order(order_id: str, current_user=Depends(require_role(SALES_ROLES))):
    o = await db[COL_ORDERS].find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Siparis bulunamadi")
    if o["status"] not in ("submitted", "needs_edit"):
        raise HTTPException(409, f"Siparis durumu uygun degil: {o['status']}")

    await db[COL_ORDERS].update_one(
        {"id": order_id}, {"$set": {"status": "approved", "updated_at": to_iso(now_utc())}}
    )
    return std_resp(True, {"order_id": order_id}, "Siparis onaylandi")


# ===========================
# 5. POST /orders/{id}/request-edit
# ===========================
@router.post("/orders/{order_id}/request-edit")
async def request_edit(order_id: str, body: OrderActionBody, current_user=Depends(require_role(SALES_ROLES))):
    o = await db[COL_ORDERS].find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Siparis bulunamadi")
    if o["status"] != "submitted":
        raise HTTPException(409, f"Siparis durumu uygun degil: {o['status']}")

    await db[COL_ORDERS].update_one(
        {"id": order_id},
        {"$set": {"status": "needs_edit", "edit_note": body.note, "updated_at": to_iso(now_utc())}},
    )
    return std_resp(True, {"order_id": order_id}, "Duzenleme istegi gonderildi")


# ===========================
# EXTRA: GET /customers (for delivery creation)
# ===========================
@router.get("/customers")
async def list_customers(current_user=Depends(require_role(SALES_ROLES))):
    cursor = db[COL_CUSTOMERS].find({"is_active": True}, {"_id": 0})
    items = await cursor.to_list(length=500)
    return std_resp(True, items)


@router.get("/products")
async def list_products(current_user=Depends(require_role(SALES_ROLES))):
    cursor = db[COL_PRODUCTS].find({}, {"_id": 0})
    items = await cursor.to_list(length=500)
    return std_resp(True, items)



# ===========================
# 7. GET /warehouse-draft - Depo Sipariş Taslağı
# ===========================
@router.get("/warehouse-draft")
async def get_warehouse_draft(current_user=Depends(require_role(SALES_ROLES))):
    """
    Yarın rutu olan müşteriler için depo sipariş taslağı:
    - Bugün sipariş gönderenler: Gönderilen siparişler
    - Sipariş göndermeyenler: Sistem taslağı (önerilen tüketim)
    """
    from datetime import datetime, timedelta
    
    # Yarının gün kodunu bul (MON, TUE, WED, THU, FRI, SAT, SUN)
    tomorrow = datetime.utcnow() + timedelta(days=1)
    day_codes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    tomorrow_code = day_codes[tomorrow.weekday()]
    
    # Bugünün başlangıcı (sipariş kontrolü için)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
    
    # Yarın rutu olan aktif müşterileri bul
    cursor = db[COL_CUSTOMERS].find(
        {"is_active": True, "route_plan.days": tomorrow_code},
        {"_id": 0}
    )
    tomorrow_customers = await cursor.to_list(length=500)
    
    customer_drafts = []
    product_totals = {}  # Ürün bazında toplam
    
    for cust in tomorrow_customers:
        cust_id = cust["id"]
        cust_name = cust.get("name", "Bilinmeyen")
        
        # Bugün gönderilmiş onaylı sipariş var mı?
        today_order = await db[COL_ORDERS].find_one({
            "customer_id": cust_id,
            "status": {"$in": ["submitted", "approved"]},
            "created_at": {"$gte": today_start}
        }, {"_id": 0})
        
        if today_order:
            # Müşteri sipariş göndermiş
            items = today_order.get("items", [])
            source = "order"
            order_id = today_order.get("id")
        else:
            # Sistem taslağını al
            system_draft = await db["system_drafts"].find_one(
                {"customer_id": cust_id},
                {"_id": 0}
            )
            items = system_draft.get("items", []) if system_draft else []
            source = "draft"
            order_id = None
        
        # Ürün isimlerini ekle ve toplamları hesapla
        enriched_items = []
        for it in items:
            prod = await db[COL_PRODUCTS].find_one({"id": it.get("product_id")}, {"_id": 0, "name": 1, "code": 1})
            qty = it.get("qty") or it.get("suggested_qty") or 0
            
            enriched_items.append({
                "product_id": it.get("product_id"),
                "product_name": prod.get("name") if prod else "Bilinmeyen",
                "product_code": prod.get("code") if prod else "",
                "qty": qty
            })
            
            # Toplama ekle
            pid = it.get("product_id")
            if pid:
                if pid not in product_totals:
                    product_totals[pid] = {
                        "product_id": pid,
                        "product_name": prod.get("name") if prod else "Bilinmeyen",
                        "product_code": prod.get("code") if prod else "",
                        "total_qty": 0
                    }
                product_totals[pid]["total_qty"] += qty
        
        customer_drafts.append({
            "customer_id": cust_id,
            "customer_name": cust_name,
            "source": source,  # "order" veya "draft"
            "order_id": order_id,
            "items": enriched_items,
            "item_count": len(enriched_items),
            "total_qty": sum(it["qty"] for it in enriched_items)
        })
    
    # Özet istatistikler
    order_count = sum(1 for c in customer_drafts if c["source"] == "order")
    draft_count = sum(1 for c in customer_drafts if c["source"] == "draft")
    
    return std_resp(True, {
        "route_day": tomorrow_code,
        "route_day_label": {
            "MON": "Pazartesi", "TUE": "Sali", "WED": "Carsamba",
            "THU": "Persembe", "FRI": "Cuma", "SAT": "Cumartesi", "SUN": "Pazar"
        }.get(tomorrow_code, tomorrow_code),
        "customer_count": len(customer_drafts),
        "order_count": order_count,
        "draft_count": draft_count,
        "customers": customer_drafts,
        "product_totals": list(product_totals.values()),
        "grand_total_qty": sum(pt["total_qty"] for pt in product_totals.values())
    })


# ===========================
# 8. POST /warehouse-draft/submit - Depoya Gönder
# ===========================
class WarehouseSubmitBody(BaseModel):
    note: str = ""


@router.post("/warehouse-draft/submit")
async def submit_warehouse_draft(body: WarehouseSubmitBody, current_user=Depends(require_role(SALES_ROLES))):
    """
    Depo sipariş taslağını depoya gönderir.
    Saat 17:00 kontrolü frontend'de yapılır.
    """
    from datetime import datetime, timedelta
    
    # Yarının gün kodunu bul
    tomorrow = datetime.utcnow() + timedelta(days=1)
    day_codes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    tomorrow_code = day_codes[tomorrow.weekday()]
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
    
    # Yarın rutu olan müşterileri bul
    cursor = db[COL_CUSTOMERS].find(
        {"is_active": True, "route_plan.days": tomorrow_code},
        {"_id": 0}
    )
    tomorrow_customers = await cursor.to_list(length=500)
    
    all_items = []
    customer_details = []
    
    for cust in tomorrow_customers:
        cust_id = cust["id"]
        
        # Bugün gönderilmiş sipariş var mı?
        today_order = await db[COL_ORDERS].find_one({
            "customer_id": cust_id,
            "status": {"$in": ["submitted", "approved"]},
            "created_at": {"$gte": today_start}
        }, {"_id": 0})
        
        if today_order:
            items = today_order.get("items", [])
            source = "order"
        else:
            system_draft = await db["system_drafts"].find_one({"customer_id": cust_id}, {"_id": 0})
            items = system_draft.get("items", []) if system_draft else []
            source = "draft"
        
        for it in items:
            qty = it.get("qty") or it.get("suggested_qty") or 0
            if qty > 0:
                all_items.append({
                    "product_id": it.get("product_id"),
                    "qty": qty,
                    "customer_id": cust_id
                })
        
        customer_details.append({
            "customer_id": cust_id,
            "customer_name": cust.get("name"),
            "source": source
        })
    
    # Ürün bazında topla
    product_totals = {}
    for it in all_items:
        pid = it["product_id"]
        if pid not in product_totals:
            product_totals[pid] = 0
        product_totals[pid] += it["qty"]
    
    # Depo siparişi oluştur
    now = now_utc()
    warehouse_order = {
        "id": gen_id(),
        "type": "warehouse_order",
        "route_day": tomorrow_code,
        "submitted_by": current_user.id,
        "submitted_at": to_iso(now),
        "note": body.note,
        "status": "submitted",
        "customer_count": len(tomorrow_customers),
        "customer_details": customer_details,
        "items": [{"product_id": pid, "qty": qty} for pid, qty in product_totals.items()],
        "total_qty": sum(product_totals.values()),
        "created_at": to_iso(now)
    }
    
    await db["warehouse_orders"].insert_one(warehouse_order)
    warehouse_order.pop("_id", None)
    
    return std_resp(True, warehouse_order, "Depo siparisi basariyla gonderildi")
