# Draft Engine API Routes
# Yeni deterministik draft sistemi için API endpointleri

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel, field_validator
from datetime import date, datetime, timedelta

from models.user import UserRole
from utils.auth import require_role
from config.database import db

from services.draft_engine.constants import (
    COL_CUSTOMERS, COL_PRODUCTS, COL_DELIVERIES, COL_DELIVERY_ITEMS,
    COL_CUSTOMER_PRODUCT_STATE, COL_WORKING_COPIES
)
from services.draft_engine.helpers import (
    gen_id, now_utc, to_iso_date, today_date, to_date,
    get_next_route_date, get_iso_weekday, get_week_start
)
from services.draft_engine.state_manager import CustomerProductStateManager
from services.draft_engine.multiplier_service import WeeklyMultiplierService
from services.draft_engine.draft_calculator import DraftCalculator
from services.draft_engine.event_processor import DeliveryEventProcessor
from services.draft_engine.rollup_service import RollupService
from services.draft_engine.db_setup import setup_draft_engine_indexes, seed_demo_data
from services.draft_engine.formulas import should_warn_shelf_life


router = APIRouter(prefix="/draft-engine", tags=["Draft-Engine"])

# Rol tanımları
SALES_ROLES = [UserRole.SALES_REP, UserRole.SALES_AGENT]
ADMIN_ROLES = [UserRole.ADMIN]
ALL_AUTH_ROLES = [UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_AGENT, UserRole.CUSTOMER]


# ==========================================
# Schemas
# ==========================================
class DeliveryItemSchema(BaseModel):
    product_id: str
    qty: float

    @field_validator("qty")
    @classmethod
    def qty_pos(cls, v):
        if v <= 0:
            raise ValueError("qty sıfırdan büyük olmalı")
        return v


class CreateDeliverySchema(BaseModel):
    customer_id: str
    delivery_date: str  # YYYY-MM-DD format
    items: List[DeliveryItemSchema]

    @field_validator("items")
    @classmethod
    def validate_items(cls, v):
        if not v:
            raise ValueError("En az bir ürün gerekli")
        pids = [i.product_id for i in v]
        if len(pids) != len(set(pids)):
            raise ValueError("Tekrarlayan product_id")
        return v


class WorkingCopyItemSchema(BaseModel):
    product_id: str
    qty: float


class UpdateWorkingCopySchema(BaseModel):
    items: List[WorkingCopyItemSchema]


# ==========================================
# Helper Functions
# ==========================================
def std_resp(success: bool, data=None, message: str = ""):
    """Standart API response formatı"""
    return {"success": success, "data": data, "message": message}


async def get_multiplier_helper(depot_id: str, segment_id: str, product_id: str, week_start: date) -> float:
    """Multiplier lookup helper"""
    service = WeeklyMultiplierService(db)
    return await service.get_multiplier(depot_id, segment_id, product_id, week_start)


# ==========================================
# 1. SYSTEM SETUP ENDPOINTS
# ==========================================
@router.post("/setup/indexes")
async def setup_indexes(current_user=Depends(require_role(ADMIN_ROLES))):
    """Tüm Draft Engine indexlerini oluşturur"""
    result = await setup_draft_engine_indexes(db)
    return std_resp(True, result, "Indexler oluşturuldu")


@router.post("/setup/seed")
async def seed_data(current_user=Depends(require_role(ADMIN_ROLES))):
    """Demo veriler oluşturur"""
    result = await seed_demo_data(db)
    return std_resp(True, result, "Demo veriler oluşturuldu")


@router.post("/setup/run-multiplier-batch")
async def run_multiplier_batch(current_user=Depends(require_role(ADMIN_ROLES))):
    """Haftalık çarpan batch job'ını manuel çalıştırır"""
    service = WeeklyMultiplierService(db)
    result = await service.run_weekly_batch()
    return std_resp(True, result, "Çarpanlar hesaplandı")


# ==========================================
# 2. DELIVERY ENDPOINTS (Teslimat Oluşturma)
# ==========================================
@router.post("/deliveries")
async def create_delivery(
    body: CreateDeliverySchema,
    current_user=Depends(require_role(SALES_ROLES))
):
    """
    Yeni teslimat oluşturur ve tüm state'leri günceller.
    
    Bu endpoint:
    1. Teslimat ve kalemleri kaydeder
    2. Her ürün için customer_product_state günceller
    3. interval_ledger kaydeder
    4. daily_totals günceller
    5. rollup'ları günceller
    6. working_copy siler
    """
    # Müşteri kontrolü
    customer = await db[COL_CUSTOMERS].find_one(
        {"customer_id": body.customer_id},
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(404, "Müşteri bulunamadı")
    
    delivery_date = to_date(body.delivery_date)
    now = now_utc()
    
    # Teslimat kaydı oluştur
    delivery_id = gen_id()
    delivery_doc = {
        "delivery_id": delivery_id,
        "customer_id": body.customer_id,
        "depot_id": customer.get("depot_id", "default"),
        "sales_rep_id": current_user.id,
        "delivery_date": to_iso_date(delivery_date),
        "status": "slip",
        "created_at": now.isoformat()
    }
    await db[COL_DELIVERIES].insert_one(delivery_doc)
    
    # Teslimat kalemlerini kaydet
    for item in body.items:
        item_doc = {
            "delivery_id": delivery_id,
            "customer_id": body.customer_id,
            "product_id": item.product_id,
            "qty": item.qty
        }
        await db[COL_DELIVERY_ITEMS].insert_one(item_doc)
    
    # Event processor ile state'leri güncelle
    processor = DeliveryEventProcessor(db)
    result = await processor.process_delivery_slip_created(delivery_id)
    
    return std_resp(True, {
        "delivery_id": delivery_id,
        "customer_id": body.customer_id,
        "delivery_date": to_iso_date(delivery_date),
        "items_count": len(body.items),
        "processing_result": result
    }, "Teslimat oluşturuldu ve state'ler güncellendi")


@router.get("/deliveries")
async def list_deliveries(
    customer_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = Query(50, le=200),
    current_user=Depends(require_role(SALES_ROLES))
):
    """Teslimatları listeler"""
    filter_query = {}
    if customer_id:
        filter_query["customer_id"] = customer_id
    if from_date:
        filter_query["delivery_date"] = {"$gte": from_date}
    if to_date:
        if "delivery_date" in filter_query:
            filter_query["delivery_date"]["$lte"] = to_date
        else:
            filter_query["delivery_date"] = {"$lte": to_date}
    
    cursor = db[COL_DELIVERIES].find(filter_query, {"_id": 0}).sort("delivery_date", -1).limit(limit)
    deliveries = await cursor.to_list(length=limit)
    
    # Müşteri isimlerini ekle
    for d in deliveries:
        customer = await db[COL_CUSTOMERS].find_one(
            {"customer_id": d["customer_id"]},
            {"_id": 0, "name": 1}
        )
        d["customer_name"] = customer.get("name", "Bilinmeyen") if customer else "Bilinmeyen"
    
    return std_resp(True, deliveries)


# ==========================================
# 3. CUSTOMER DRAFT ENDPOINTS
# ==========================================
@router.get("/customers/{customer_id}/draft")
async def get_customer_draft(
    customer_id: str,
    include_inactive: bool = False,
    current_user=Depends(require_role(ALL_AUTH_ROLES))
):
    """
    Müşteri için sistem draft'ını getirir.
    
    Draft içeriği:
    - Ürün bazında need_qty (tahmin edilen ihtiyaç)
    - rate_mt, rate_used değerleri
    - Maturity mode bilgisi
    - Son teslimat bilgileri
    """
    calculator = DraftCalculator(db)
    draft = await calculator.get_customer_draft(customer_id, include_inactive)
    
    if "error" in draft:
        raise HTTPException(404, draft["error"])
    
    return std_resp(True, draft)


@router.get("/customers/{customer_id}/state")
async def get_customer_product_states(
    customer_id: str,
    current_user=Depends(require_role(SALES_ROLES))
):
    """Müşterinin tüm ürün state'lerini detaylı getirir"""
    manager = CustomerProductStateManager(db)
    states = await manager.get_all_states_for_customer(customer_id)
    
    # Ürün isimlerini ekle
    for state in states:
        product = await db[COL_PRODUCTS].find_one(
            {"product_id": state["product_id"]},
            {"_id": 0, "name": 1}
        )
        state["product_name"] = product.get("name", "Bilinmeyen") if product else "Bilinmeyen"
    
    return std_resp(True, {
        "customer_id": customer_id,
        "states": states,
        "total_count": len(states),
        "active_count": sum(1 for s in states if s.get("is_active"))
    })


# ==========================================
# 4. SALES REP (PLASIYER) DRAFT ENDPOINTS
# ==========================================
@router.get("/sales-rep/draft")
async def get_sales_rep_draft(
    target_date: Optional[str] = None,
    current_user=Depends(require_role(SALES_ROLES))
):
    """
    Plasiyer için birleştirilmiş draft.
    
    Tüm müşterilerin draft'ları ürün bazında toplanır.
    Koli yuvarlaması uygulanır.
    """
    calculator = DraftCalculator(db)
    
    # Hedef tarih
    target = to_date(target_date) if target_date else today_date() + timedelta(days=1)
    
    draft = await calculator.get_sales_rep_draft(current_user.id, target)
    return std_resp(True, draft)


@router.get("/sales-rep/customers")
async def get_sales_rep_customers(
    current_user=Depends(require_role(SALES_ROLES))
):
    """Plasiyer'e ait müşterileri listeler"""
    cursor = db[COL_CUSTOMERS].find(
        {"sales_rep_id": current_user.id, "is_active": True},
        {"_id": 0}
    )
    customers = await cursor.to_list(length=500)
    
    # Her müşteri için özet draft bilgisi ekle
    for cust in customers:
        states_cursor = db[COL_CUSTOMER_PRODUCT_STATE].find(
            {"customer_id": cust["customer_id"], "is_active": True, "need_qty": {"$gt": 0}},
            {"_id": 0, "need_qty": 1, "next_route_date": 1}
        )
        states = await states_cursor.to_list(length=100)
        
        cust["total_need_qty"] = round(sum(s.get("need_qty", 0) for s in states), 2)
        cust["active_products"] = len(states)
        cust["next_route_date"] = states[0].get("next_route_date") if states else None
    
    return std_resp(True, customers)


# ==========================================
# 5. DEPOT DRAFT ENDPOINTS
# ==========================================
@router.get("/depot/{depot_id}/draft")
async def get_depot_draft(
    depot_id: str,
    target_date: Optional[str] = None,
    current_user=Depends(require_role(ADMIN_ROLES + SALES_ROLES))
):
    """
    Depo bazında birleştirilmiş draft.
    
    Tüm plasiyer draft'larının toplamı.
    """
    calculator = DraftCalculator(db)
    
    target = to_date(target_date) if target_date else today_date() + timedelta(days=1)
    
    draft = await calculator.get_depot_draft(depot_id, target)
    return std_resp(True, draft)


# ==========================================
# 6. WORKING COPY ENDPOINTS
# ==========================================
@router.post("/customers/{customer_id}/working-copy")
async def create_working_copy(
    customer_id: str,
    current_user=Depends(require_role(ALL_AUTH_ROLES))
):
    """
    Müşteri için düzenlenebilir working copy oluşturur.
    
    Sistem draft'ından kopyalanır.
    Mevcut working copy varsa hata döner.
    """
    # Mevcut working copy kontrolü
    existing = await db[COL_WORKING_COPIES].find_one(
        {"customer_id": customer_id},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(409, "Bu müşteri için zaten bir working copy mevcut")
    
    # Sistem draft'ını al
    calculator = DraftCalculator(db)
    draft = await calculator.get_customer_draft(customer_id)
    
    if "error" in draft:
        raise HTTPException(404, draft["error"])
    
    # Working copy oluştur
    now = now_utc()
    working_copy = {
        "customer_id": customer_id,
        "base_draft_route_date": draft.get("next_route_date"),
        "items": [
            {"product_id": item["product_id"], "qty": item.get("need_qty", 0)}
            for item in draft.get("items", [])
            if item.get("need_qty", 0) > 0
        ],
        "status": "editing",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db[COL_WORKING_COPIES].insert_one(working_copy)
    working_copy.pop("_id", None)
    
    return std_resp(True, working_copy, "Working copy oluşturuldu")


@router.get("/customers/{customer_id}/working-copy")
async def get_working_copy(
    customer_id: str,
    current_user=Depends(require_role(ALL_AUTH_ROLES))
):
    """Müşterinin mevcut working copy'sini getirir"""
    wc = await db[COL_WORKING_COPIES].find_one(
        {"customer_id": customer_id},
        {"_id": 0}
    )
    
    if not wc:
        raise HTTPException(404, "Working copy bulunamadı")
    
    return std_resp(True, wc)


@router.patch("/customers/{customer_id}/working-copy")
async def update_working_copy(
    customer_id: str,
    body: UpdateWorkingCopySchema,
    current_user=Depends(require_role(ALL_AUTH_ROLES))
):
    """Working copy'yi günceller"""
    wc = await db[COL_WORKING_COPIES].find_one(
        {"customer_id": customer_id},
        {"_id": 0}
    )
    
    if not wc:
        raise HTTPException(404, "Working copy bulunamadı")
    
    if wc["status"] != "editing":
        raise HTTPException(409, "Working copy düzenlenemez durumda")
    
    # Raf ömrü uyarılarını kontrol et
    warnings = []
    for item in body.items:
        product = await db[COL_PRODUCTS].find_one(
            {"product_id": item.product_id},
            {"_id": 0, "shelf_life_days": 1, "name": 1}
        )
        
        state = await db[COL_CUSTOMER_PRODUCT_STATE].find_one(
            {"customer_id": customer_id, "product_id": item.product_id},
            {"_id": 0, "rate_used": 1}
        )
        
        if product and state and state.get("rate_used"):
            if should_warn_shelf_life(item.qty, state["rate_used"], product.get("shelf_life_days")):
                warnings.append({
                    "product_id": item.product_id,
                    "product_name": product.get("name", "Bilinmeyen"),
                    "message": "Seçilen miktar raf ömrünün yarısından fazla süreyi kapsar"
                })
    
    # Güncelle
    await db[COL_WORKING_COPIES].update_one(
        {"customer_id": customer_id},
        {
            "$set": {
                "items": [{"product_id": i.product_id, "qty": i.qty} for i in body.items],
                "updated_at": now_utc().isoformat()
            }
        }
    )
    
    updated = await db[COL_WORKING_COPIES].find_one(
        {"customer_id": customer_id},
        {"_id": 0}
    )
    
    return std_resp(True, {
        "working_copy": updated,
        "shelf_life_warnings": warnings
    }, "Working copy güncellendi")


@router.delete("/customers/{customer_id}/working-copy")
async def delete_working_copy(
    customer_id: str,
    current_user=Depends(require_role(ALL_AUTH_ROLES))
):
    """Working copy'yi siler"""
    result = await db[COL_WORKING_COPIES].delete_one({"customer_id": customer_id})
    
    if result.deleted_count == 0:
        raise HTTPException(404, "Working copy bulunamadı")
    
    return std_resp(True, None, "Working copy silindi")


# ==========================================
# 7. PRODUCTS ENDPOINT
# ==========================================
@router.get("/products")
async def list_products(
    current_user=Depends(require_role(ALL_AUTH_ROLES))
):
    """Tüm ürünleri listeler"""
    cursor = db[COL_PRODUCTS].find({}, {"_id": 0})
    products = await cursor.to_list(length=500)
    return std_resp(True, products)


# ==========================================
# 8. MULTIPLIER ENDPOINTS
# ==========================================
@router.get("/multipliers")
async def get_multipliers(
    depot_id: str,
    week_start: Optional[str] = None,
    current_user=Depends(require_role(ADMIN_ROLES))
):
    """Belirli bir depo için haftalık çarpanları getirir"""
    service = WeeklyMultiplierService(db)
    
    week = to_date(week_start) if week_start else get_week_start(today_date())
    
    multipliers = await service.get_multipliers_for_depot(depot_id, week)
    
    return std_resp(True, {
        "depot_id": depot_id,
        "week_start": to_iso_date(week),
        "multipliers": multipliers,
        "count": len(multipliers)
    })


# ==========================================
# 9. ROLLUP ENDPOINTS
# ==========================================
@router.get("/rollup/sales-rep/{sales_rep_id}")
async def get_sales_rep_rollup(
    sales_rep_id: str,
    target_date: str,
    current_user=Depends(require_role(ADMIN_ROLES + SALES_ROLES))
):
    """Plasiyer için rollup toplamlarını getirir"""
    service = RollupService(db)
    totals = await service.get_sales_rep_totals(sales_rep_id, target_date)
    
    # Ürün isimlerini ekle
    result = []
    for pid, qty in totals.items():
        product = await db[COL_PRODUCTS].find_one(
            {"product_id": pid},
            {"_id": 0, "name": 1}
        )
        result.append({
            "product_id": pid,
            "product_name": product.get("name", "Bilinmeyen") if product else "Bilinmeyen",
            "total_need_qty": round(qty, 2)
        })
    
    return std_resp(True, {
        "sales_rep_id": sales_rep_id,
        "target_date": target_date,
        "totals": result
    })


@router.get("/rollup/depot/{depot_id}")
async def get_depot_rollup(
    depot_id: str,
    target_date: str,
    current_user=Depends(require_role(ADMIN_ROLES))
):
    """Depo için rollup toplamlarını getirir"""
    service = RollupService(db)
    totals = await service.get_depot_totals(depot_id, target_date)
    
    result = []
    for pid, qty in totals.items():
        product = await db[COL_PRODUCTS].find_one(
            {"product_id": pid},
            {"_id": 0, "name": 1}
        )
        result.append({
            "product_id": pid,
            "product_name": product.get("name", "Bilinmeyen") if product else "Bilinmeyen",
            "total_need_qty": round(qty, 2)
        })
    
    return std_resp(True, {
        "depot_id": depot_id,
        "target_date": target_date,
        "totals": result
    })


@router.get("/rollup/production")
async def get_production_rollup(
    target_date: str,
    current_user=Depends(require_role(ADMIN_ROLES))
):
    """Üretim için rollup toplamlarını getirir"""
    service = RollupService(db)
    totals = await service.get_production_totals(target_date)
    
    result = []
    for pid, qty in totals.items():
        product = await db[COL_PRODUCTS].find_one(
            {"product_id": pid},
            {"_id": 0, "name": 1}
        )
        result.append({
            "product_id": pid,
            "product_name": product.get("name", "Bilinmeyen") if product else "Bilinmeyen",
            "total_need_qty": round(qty, 2)
        })
    
    return std_resp(True, {
        "target_date": target_date,
        "totals": result
    })
