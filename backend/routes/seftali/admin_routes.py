from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from models.user import UserRole
from utils.auth import require_role
from config.database import db
from services.seftali.core import (
    COL_DELIVERIES, COL_CUSTOMERS, COL_PRODUCTS, COL_VARIANCE_EVENTS, COL_WAREHOUSE_STOCK, std_resp
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

    total_customers = await db[COL_CUSTOMERS].count_documents({"is_active": True})

    return std_resp(True, {
        "total_deliveries": total_deliveries,
        "pending_deliveries": pending_deliveries,
        "accepted_deliveries": accepted_deliveries,
        "total_customers": total_customers,
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


# ===========================
# SİSTEM AYARLARI
# ===========================
from pydantic import BaseModel
from datetime import datetime, timezone

class SystemSettingsBody(BaseModel):
    order_cutoff_hour: Optional[int] = None
    order_cutoff_minute: Optional[int] = None
    auto_draft_enabled: Optional[bool] = None

COL_SETTINGS = "sf_system_settings"

@router.get("/settings")
async def get_system_settings(current_user=Depends(require_role([UserRole.ADMIN]))):
    """Sistem ayarlarını getir"""
    settings = await db[COL_SETTINGS].find_one({"type": "order_settings"}, {"_id": 0})
    
    if not settings:
        # Varsayılan ayarlar
        settings = {
            "type": "order_settings",
            "order_cutoff_hour": 16,
            "order_cutoff_minute": 30,
            "auto_draft_enabled": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db[COL_SETTINGS].insert_one(settings)
    
    return std_resp(True, settings)

@router.patch("/settings")
async def update_system_settings(
    body: SystemSettingsBody,
    current_user=Depends(require_role([UserRole.ADMIN]))
):
    """Sistem ayarlarını güncelle"""
    update_data = {}
    
    if body.order_cutoff_hour is not None:
        if 0 <= body.order_cutoff_hour <= 23:
            update_data["order_cutoff_hour"] = body.order_cutoff_hour
    
    if body.order_cutoff_minute is not None:
        if 0 <= body.order_cutoff_minute <= 59:
            update_data["order_cutoff_minute"] = body.order_cutoff_minute
    
    if body.auto_draft_enabled is not None:
        update_data["auto_draft_enabled"] = body.auto_draft_enabled
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db[COL_SETTINGS].update_one(
            {"type": "order_settings"},
            {"$set": update_data},
            upsert=True
        )
    
    settings = await db[COL_SETTINGS].find_one({"type": "order_settings"}, {"_id": 0})
    return std_resp(True, settings, "Ayarlar güncellendi")


# ===========================
# ÜRÜN YÖNETİMİ
# ===========================

@router.get("/products")
async def list_products(current_user=Depends(require_role([UserRole.ADMIN]))):
    """Tüm ürünleri listele (Admin için)"""
    cursor = db[COL_PRODUCTS].find({}, {"_id": 0}).sort("name", 1)
    products = await cursor.to_list(length=500)
    
    # SKT'yi string formatına çevir
    for prod in products:
        if prod.get("skt"):
            try:
                if hasattr(prod["skt"], "strftime"):
                    prod["skt"] = prod["skt"].strftime("%Y-%m-%d")
            except:
                pass
    
    return std_resp(True, products)


@router.get("/products/{product_id}")
async def get_product(product_id: str, current_user=Depends(require_role([UserRole.ADMIN]))):
    """Tek bir ürün detayını getir"""
    product = await db[COL_PRODUCTS].find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        return std_resp(False, None, "Ürün bulunamadı")
    
    # SKT'yi string formatına çevir
    if product.get("skt"):
        try:
            if hasattr(product["skt"], "strftime"):
                product["skt"] = product["skt"].strftime("%Y-%m-%d")
        except:
            pass
    
    return std_resp(True, product)


from pydantic import BaseModel
from typing import Optional as Opt
from datetime import datetime, timezone

class ProductUpdateBody(BaseModel):
    name: Opt[str] = None
    category_id: Opt[str] = None
    unit_type: Opt[str] = None
    shelf_life_days: Opt[int] = None
    case_name: Opt[str] = None
    case_size: Opt[int] = None
    skt: Opt[str] = None  # YYYY-MM-DD format
    depo_no: Opt[str] = None
    depo_name: Opt[str] = None
    is_active: Opt[bool] = None


@router.patch("/products/{product_id}")
async def update_product(
    product_id: str,
    body: ProductUpdateBody,
    current_user=Depends(require_role([UserRole.ADMIN]))
):
    """Ürün bilgilerini güncelle"""
    # Mevcut ürünü kontrol et
    existing = await db[COL_PRODUCTS].find_one({"product_id": product_id})
    if not existing:
        return std_resp(False, None, "Ürün bulunamadı")
    
    update_data = {}
    
    if body.name is not None:
        update_data["name"] = body.name
    if body.category_id is not None:
        update_data["category_id"] = body.category_id
    if body.unit_type is not None:
        update_data["unit_type"] = body.unit_type
    if body.shelf_life_days is not None:
        update_data["shelf_life_days"] = body.shelf_life_days
    if body.case_name is not None:
        update_data["case_name"] = body.case_name
    if body.case_size is not None:
        update_data["case_size"] = body.case_size
    if body.is_active is not None:
        update_data["is_active"] = body.is_active
    if body.depo_no is not None:
        update_data["depo_no"] = body.depo_no
    if body.depo_name is not None:
        update_data["depo_name"] = body.depo_name
    
    # SKT'yi datetime'a çevir
    if body.skt is not None:
        try:
            update_data["skt"] = datetime.strptime(body.skt, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            return std_resp(False, None, "Geçersiz SKT formatı (YYYY-MM-DD olmalı)")
    
    if not update_data:
        return std_resp(False, None, "Güncellenecek alan belirtilmedi")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db[COL_PRODUCTS].update_one(
        {"product_id": product_id},
        {"$set": update_data}
    )
    
    # Güncellenmiş ürünü döndür
    updated = await db[COL_PRODUCTS].find_one({"product_id": product_id}, {"_id": 0})
    if updated.get("skt") and hasattr(updated["skt"], "strftime"):
        updated["skt"] = updated["skt"].strftime("%Y-%m-%d")
    
    return std_resp(True, updated, "Ürün güncellendi")


# Depo listesi
DEPOLAR = [
    {"depo_no": "D001", "name": "İstanbul Merkez Depo"},
    {"depo_no": "D002", "name": "İstanbul Anadolu Depo"},
    {"depo_no": "D003", "name": "Ankara Merkez Depo"},
    {"depo_no": "D004", "name": "İzmir Depo"},
    {"depo_no": "D005", "name": "Bursa Depo"},
]

@router.get("/depolar")
async def list_depolar(current_user=Depends(require_role([UserRole.ADMIN]))):
    """Depo listesini getir"""
    return std_resp(True, DEPOLAR)


# ===========================
# DEPO STOK YÖNETİMİ
# ===========================

class WarehouseStockItem(BaseModel):
    product_id: str
    quantity: int
    lot_no: Optional[str] = None
    skt: Optional[str] = None  # YYYY-MM-DD
    depo_no: str = "D001"


class WarehouseStockUpdate(BaseModel):
    quantity: Optional[int] = None
    lot_no: Optional[str] = None
    skt: Optional[str] = None


class WarehouseStockBulkUpdate(BaseModel):
    items: List[dict]  # [{product_id, quantity, lot_no, skt, depo_no}]


@router.get("/warehouse-stock")
async def list_warehouse_stock(
    depo_no: Optional[str] = None,
    product_id: Optional[str] = None,
    current_user=Depends(require_role([UserRole.ADMIN]))
):
    """Depo stok listesini getir"""
    filt = {}
    if depo_no:
        filt["depo_no"] = depo_no
    if product_id:
        filt["product_id"] = product_id
    
    cursor = db[COL_WAREHOUSE_STOCK].find(filt, {"_id": 0}).sort([("depo_no", 1), ("product_id", 1)])
    items = await cursor.to_list(length=1000)
    
    # Ürün bilgilerini ekle
    for item in items:
        product = await db[COL_PRODUCTS].find_one({"product_id": item["product_id"]}, {"_id": 0, "name": 1, "category_id": 1})
        if product:
            item["product_name"] = product.get("name", "")
            item["category_id"] = product.get("category_id", "")
        
        # Depo adını ekle
        depo = next((d for d in DEPOLAR if d["depo_no"] == item.get("depo_no")), None)
        if depo:
            item["depo_name"] = depo["name"]
    
    return std_resp(True, items)


@router.post("/warehouse-stock")
async def add_warehouse_stock(
    body: WarehouseStockItem,
    current_user=Depends(require_role([UserRole.ADMIN]))
):
    """Depoya stok ekle veya güncelle (upsert)"""
    from services.seftali.core import now_utc, to_iso
    
    # Ürün kontrolü
    product = await db[COL_PRODUCTS].find_one({"product_id": body.product_id})
    if not product:
        return std_resp(False, None, "Ürün bulunamadı")
    
    existing = await db[COL_WAREHOUSE_STOCK].find_one({
        "product_id": body.product_id,
        "depo_no": body.depo_no
    })
    
    stock_data = {
        "product_id": body.product_id,
        "depo_no": body.depo_no,
        "quantity": body.quantity,
        "lot_no": body.lot_no or "",
        "skt": body.skt or "",
        "updated_at": to_iso(now_utc()),
        "updated_by": current_user.id
    }
    
    if existing:
        await db[COL_WAREHOUSE_STOCK].update_one(
            {"product_id": body.product_id, "depo_no": body.depo_no},
            {"$set": stock_data}
        )
        message = "Stok güncellendi"
    else:
        stock_data["id"] = str(uuid.uuid4())
        stock_data["created_at"] = to_iso(now_utc())
        await db[COL_WAREHOUSE_STOCK].insert_one(stock_data)
        message = "Stok eklendi"
    
    result = await db[COL_WAREHOUSE_STOCK].find_one(
        {"product_id": body.product_id, "depo_no": body.depo_no}, 
        {"_id": 0}
    )
    return std_resp(True, result, message)


@router.patch("/warehouse-stock/{product_id}")
async def update_warehouse_stock(
    product_id: str,
    body: WarehouseStockUpdate,
    depo_no: str = Query("D001"),
    current_user=Depends(require_role([UserRole.ADMIN]))
):
    """Depo stok güncelle"""
    from services.seftali.core import now_utc, to_iso
    from fastapi import HTTPException
    
    existing = await db[COL_WAREHOUSE_STOCK].find_one({
        "product_id": product_id,
        "depo_no": depo_no
    })
    
    if not existing:
        raise HTTPException(404, "Stok kaydı bulunamadı")
    
    update_data = {"updated_at": to_iso(now_utc()), "updated_by": current_user.id}
    
    if body.quantity is not None:
        update_data["quantity"] = body.quantity
    if body.lot_no is not None:
        update_data["lot_no"] = body.lot_no
    if body.skt is not None:
        update_data["skt"] = body.skt
    
    await db[COL_WAREHOUSE_STOCK].update_one(
        {"product_id": product_id, "depo_no": depo_no},
        {"$set": update_data}
    )
    
    result = await db[COL_WAREHOUSE_STOCK].find_one(
        {"product_id": product_id, "depo_no": depo_no}, 
        {"_id": 0}
    )
    return std_resp(True, result, "Stok güncellendi")


@router.post("/warehouse-stock/bulk")
async def bulk_update_warehouse_stock(
    body: WarehouseStockBulkUpdate,
    current_user=Depends(require_role([UserRole.ADMIN]))
):
    """Toplu stok güncelleme"""
    from services.seftali.core import now_utc, to_iso
    
    updated = 0
    created = 0
    
    for item in body.items:
        product_id = item.get("product_id")
        depo_no = item.get("depo_no", "D001")
        quantity = item.get("quantity", 0)
        lot_no = item.get("lot_no", "")
        skt = item.get("skt", "")
        
        if not product_id:
            continue
        
        existing = await db[COL_WAREHOUSE_STOCK].find_one({
            "product_id": product_id,
            "depo_no": depo_no
        })
        
        stock_data = {
            "product_id": product_id,
            "depo_no": depo_no,
            "quantity": quantity,
            "lot_no": lot_no,
            "skt": skt,
            "updated_at": to_iso(now_utc()),
            "updated_by": current_user.id
        }
        
        if existing:
            await db[COL_WAREHOUSE_STOCK].update_one(
                {"product_id": product_id, "depo_no": depo_no},
                {"$set": stock_data}
            )
            updated += 1
        else:
            stock_data["id"] = str(uuid.uuid4())
            stock_data["created_at"] = to_iso(now_utc())
            await db[COL_WAREHOUSE_STOCK].insert_one(stock_data)
            created += 1
    
    return std_resp(True, {"updated": updated, "created": created}, f"{updated} güncellendi, {created} eklendi")


@router.delete("/warehouse-stock/{product_id}")
async def delete_warehouse_stock(
    product_id: str,
    depo_no: str = Query("D001"),
    current_user=Depends(require_role([UserRole.ADMIN]))
):
    """Depo stok kaydını sil"""
    from fastapi import HTTPException
    
    result = await db[COL_WAREHOUSE_STOCK].delete_one({
        "product_id": product_id,
        "depo_no": depo_no
    })
    
    if result.deleted_count == 0:
        raise HTTPException(404, "Stok kaydı bulunamadı")
    
    return std_resp(True, {"product_id": product_id, "depo_no": depo_no}, "Stok kaydı silindi")

