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
