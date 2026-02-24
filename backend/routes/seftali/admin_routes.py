from fastapi import APIRouter, Depends, Query
from typing import Optional
from models.user import UserRole
from utils.auth import require_role
from config.database import db
from services.seftali.utils import (
    COL_DELIVERIES, COL_VARIANCE_EVENTS, COL_CONSUMPTION_STATS,
    COL_CUSTOMERS, COL_PRODUCTS, std_resp,
)

router = APIRouter(prefix="/admin", tags=["Seftali-Admin"])


# ===========================
# 1. GET /health/summary
# ===========================
@router.get("/health/summary")
async def health_summary(current_user=Depends(require_role([UserRole.ADMIN]))):
    total_deliveries = await db[COL_DELIVERIES].count_documents({})
    pending_deliveries = await db[COL_DELIVERIES].count_documents({"acceptance_status": "pending"})
    accepted_deliveries = await db[COL_DELIVERIES].count_documents({"acceptance_status": "accepted"})

    spike_count = await db[COL_CONSUMPTION_STATS].count_documents({"spike.active": True})
    open_variance = await db[COL_VARIANCE_EVENTS].count_documents({"status": "needs_reason"})
    total_customers = await db[COL_CUSTOMERS].count_documents({"is_active": True})

    # top spike products
    pipeline = [
        {"$match": {"spike.active": True}},
        {"$group": {"_id": "$product_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_spikes_raw = await db[COL_CONSUMPTION_STATS].aggregate(pipeline).to_list(length=5)
    top_spikes = []
    for ts in top_spikes_raw:
        p = await db[COL_PRODUCTS].find_one({"id": ts["_id"]}, {"_id": 0, "name": 1, "code": 1})
        top_spikes.append({"product_id": ts["_id"], "spike_count": ts["count"],
                           "product_name": p.get("name", "") if p else ""})

    return std_resp(True, {
        "total_deliveries": total_deliveries,
        "pending_deliveries": pending_deliveries,
        "accepted_deliveries": accepted_deliveries,
        "active_spikes": spike_count,
        "open_variance": open_variance,
        "total_customers": total_customers,
        "top_spike_products": top_spikes,
    })


# ===========================
# 2. GET /variance
# ===========================
@router.get("/variance")
async def list_variance(
    customer_id: Optional[str] = None,
    product_id: Optional[str] = None,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    current_user=Depends(require_role([UserRole.ADMIN])),
):
    filt = {}
    if customer_id:
        filt["customer_id"] = customer_id
    if product_id:
        filt["product_id"] = product_id
    if from_date or to_date:
        filt["detected_at"] = {}
        if from_date:
            filt["detected_at"]["$gte"] = from_date
        if to_date:
            filt["detected_at"]["$lte"] = to_date

    cursor = db[COL_VARIANCE_EVENTS].find(filt, {"_id": 0}).sort("detected_at", -1)
    items = await cursor.to_list(length=200)
    for it in items:
        c = await db[COL_CUSTOMERS].find_one({"id": it["customer_id"]}, {"_id": 0, "name": 1})
        if c:
            it["customer_name"] = c["name"]
        p = await db[COL_PRODUCTS].find_one({"id": it["product_id"]}, {"_id": 0, "name": 1})
        if p:
            it["product_name"] = p["name"]
    return std_resp(True, items)


# ===========================
# 3. GET /deliveries
# ===========================
@router.get("/deliveries")
async def list_deliveries(
    status: Optional[str] = None,
    current_user=Depends(require_role([UserRole.ADMIN])),
):
    filt = {}
    if status:
        filt["acceptance_status"] = status
    cursor = db[COL_DELIVERIES].find(filt, {"_id": 0}).sort("delivered_at", -1)
    items = await cursor.to_list(length=200)
    for d in items:
        c = await db[COL_CUSTOMERS].find_one({"id": d["customer_id"]}, {"_id": 0, "name": 1})
        if c:
            d["customer_name"] = c["name"]
    return std_resp(True, items)



# ===========================
# 4. GET /warehouse-orders - Depo Siparişleri
# ===========================
@router.get("/warehouse-orders")
async def list_warehouse_orders(
    status: Optional[str] = None,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    current_user=Depends(require_role([UserRole.ADMIN])),
):
    """
    Plasiyerlerin gönderdiği depo siparişlerini listeler.
    """
    filt = {"type": "warehouse_order"}
    if status:
        filt["status"] = status
    if from_date or to_date:
        filt["submitted_at"] = {}
        if from_date:
            filt["submitted_at"]["$gte"] = from_date
        if to_date:
            filt["submitted_at"]["$lte"] = to_date

    cursor = db["warehouse_orders"].find(filt, {"_id": 0}).sort("submitted_at", -1)
    items = await cursor.to_list(length=100)
    
    # Enrich with product names
    for order in items:
        for it in order.get("items", []):
            p = await db[COL_PRODUCTS].find_one({"id": it.get("product_id")}, {"_id": 0, "name": 1, "code": 1})
            if p:
                it["product_name"] = p.get("name", "")
                it["product_code"] = p.get("code", "")
    
    return std_resp(True, items)


# ===========================
# 5. POST /warehouse-orders/{id}/process - Depo Siparişi İşle
# ===========================
@router.post("/warehouse-orders/{order_id}/process")
async def process_warehouse_order(
    order_id: str,
    current_user=Depends(require_role([UserRole.ADMIN])),
):
    """
    Depo siparişini işlendi olarak işaretle.
    """
    from services.seftali.utils import now_utc, to_iso
    
    order = await db["warehouse_orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        from fastapi import HTTPException
        raise HTTPException(404, "Siparis bulunamadi")
    
    await db["warehouse_orders"].update_one(
        {"id": order_id},
        {"$set": {
            "status": "processed",
            "processed_at": to_iso(now_utc()),
            "processed_by": current_user.id
        }}
    )
    
    return std_resp(True, {"id": order_id, "status": "processed"}, "Siparis islendi olarak isaretlendi")


# ===========================
# KAMPANYA YÖNETİMİ
# ===========================
from pydantic import BaseModel
from typing import List
import uuid

COL_CAMPAIGNS = "sf_campaigns"


class CampaignCreate(BaseModel):
    type: str  # 'discount' veya 'gift'
    title: str
    product_id: str
    product_name: str
    product_code: str
    min_qty: int
    normal_price: float
    campaign_price: float
    valid_until: str
    description: str
    # Hediyeli kampanyalar için
    gift_product_id: Optional[str] = None
    gift_product_name: Optional[str] = None
    gift_qty: Optional[int] = None
    gift_value: Optional[float] = None


class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    min_qty: Optional[int] = None
    normal_price: Optional[float] = None
    campaign_price: Optional[float] = None
    valid_until: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    gift_qty: Optional[int] = None
    gift_value: Optional[float] = None


# 6. GET /campaigns - Kampanya Listesi
@router.get("/campaigns")
async def list_campaigns(
    status: Optional[str] = None,
    type: Optional[str] = None,
    current_user=Depends(require_role([UserRole.ADMIN])),
):
    """Tüm kampanyaları listele"""
    from services.seftali.utils import now_utc
    
    filt = {}
    if status:
        filt["status"] = status
    if type:
        filt["type"] = type
    
    cursor = db[COL_CAMPAIGNS].find(filt, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=100)
    
    # Süresi geçmiş kampanyaları otomatik güncelle
    now = now_utc().isoformat()[:10]
    for item in items:
        if item.get("status") == "active" and item.get("valid_until", "") < now:
            await db[COL_CAMPAIGNS].update_one(
                {"id": item["id"]},
                {"$set": {"status": "expired"}}
            )
            item["status"] = "expired"
    
    return std_resp(True, items)


# 7. POST /campaigns - Yeni Kampanya Oluştur
@router.post("/campaigns")
async def create_campaign(
    body: CampaignCreate,
    current_user=Depends(require_role([UserRole.ADMIN])),
):
    """Yeni kampanya oluştur"""
    from services.seftali.utils import now_utc, to_iso
    
    campaign_id = str(uuid.uuid4())
    
    campaign = {
        "id": campaign_id,
        "type": body.type,
        "title": body.title,
        "product_id": body.product_id,
        "product_name": body.product_name,
        "product_code": body.product_code,
        "min_qty": body.min_qty,
        "normal_price": body.normal_price,
        "campaign_price": body.campaign_price,
        "valid_until": body.valid_until,
        "description": body.description,
        "status": "active",
        "created_at": to_iso(now_utc()),
        "created_by": current_user.id,
    }
    
    # Hediyeli kampanya ise
    if body.type == "gift":
        campaign["gift_product_id"] = body.gift_product_id
        campaign["gift_product_name"] = body.gift_product_name
        campaign["gift_qty"] = body.gift_qty
        campaign["gift_value"] = body.gift_value
    
    await db[COL_CAMPAIGNS].insert_one(campaign)
    campaign.pop("_id", None)
    
    return std_resp(True, campaign, "Kampanya oluşturuldu")


# 8. PATCH /campaigns/{id} - Kampanya Güncelle
@router.patch("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    body: CampaignUpdate,
    current_user=Depends(require_role([UserRole.ADMIN])),
):
    """Kampanya güncelle"""
    from fastapi import HTTPException
    from services.seftali.utils import now_utc, to_iso
    
    campaign = await db[COL_CAMPAIGNS].find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(404, "Kampanya bulunamadı")
    
    update_data = {}
    for field, value in body.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = to_iso(now_utc())
        await db[COL_CAMPAIGNS].update_one(
            {"id": campaign_id},
            {"$set": update_data}
        )
    
    updated = await db[COL_CAMPAIGNS].find_one({"id": campaign_id}, {"_id": 0})
    return std_resp(True, updated, "Kampanya güncellendi")


# 9. DELETE /campaigns/{id} - Kampanya Sil
@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user=Depends(require_role([UserRole.ADMIN])),
):
    """Kampanya sil"""
    from fastapi import HTTPException
    
    result = await db[COL_CAMPAIGNS].delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Kampanya bulunamadı")
    
    return std_resp(True, {"id": campaign_id}, "Kampanya silindi")
