"""
Customer Consumption Routes
Müşteri tüketim kayıtları ve analiz API'leri
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from models.user import User, UserRole
from models.customer_consumption import CustomerConsumption, ConsumptionPattern
from middleware.auth import get_current_user, require_role
from config.database import db
import statistics

router = APIRouter(prefix="/customer-consumption", tags=["Customer Consumption"])


# =============================================
# CONSUMPTION RECORDS (Tüketim Kayıtları)
# =============================================

@router.post("/record")
async def create_consumption_record(
    customer_id: str,
    product_id: str,
    consumption_date: str,
    quantity_used: float,
    consumption_type: str = "manual",
    notes: Optional[str] = None,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.SALES_AGENT]))
):
    """Yeni tüketim kaydı oluştur"""
    
    # Müşteri kontrolü
    customer = await db.users.find_one({"id": customer_id, "role": "customer"})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Ürün kontrolü
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Tüketim kaydı oluştur
    consumption = CustomerConsumption(
        customer_id=customer_id,
        product_id=product_id,
        consumption_date=datetime.fromisoformat(consumption_date),
        quantity_used=quantity_used,
        consumption_type=consumption_type,
        notes=notes,
        recorded_by=current_user.id
    )
    
    # MongoDB'ye kaydet
    doc = consumption.model_dump()
    doc['consumption_date'] = doc['consumption_date'].isoformat()
    doc['recorded_at'] = doc['recorded_at'].isoformat()
    
    await db.customer_consumption.insert_one(doc)
    
    return {
        "message": "Consumption record created",
        "consumption_id": consumption.consumption_id
    }


@router.get("/records")
async def get_consumption_records(
    customer_id: Optional[str] = None,
    product_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Tüketim kayıtlarını listele"""
    
    # Query oluştur
    query = {}
    
    # Müşteri filtresi
    if current_user.role == UserRole.CUSTOMER:
        query["customer_id"] = current_user.id
    elif customer_id:
        query["customer_id"] = customer_id
    
    # Ürün filtresi
    if product_id:
        query["product_id"] = product_id
    
    # Tarih filtresi
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        query["consumption_date"] = date_query
    
    # Kayıtları getir
    cursor = db.customer_consumption.find(query, {"_id": 0}).sort("consumption_date", -1).limit(limit)
    records = await cursor.to_list(length=limit)
    
    # Müşteri ve ürün isimlerini ekle
    for record in records:
        customer = await db.users.find_one({"id": record["customer_id"]}, {"full_name": 1})
        product = await db.products.find_one({"id": record["product_id"]}, {"name": 1, "unit": 1})
        
        record["customer_name"] = customer.get("full_name") if customer else "Unknown"
        record["product_name"] = product.get("name") if product else "Unknown"
        record["unit"] = product.get("unit", "ADET") if product else "ADET"
    
    return records


@router.delete("/records/{consumption_id}")
async def delete_consumption_record(
    consumption_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING]))
):
    """Tüketim kaydını sil"""
    
    result = await db.customer_consumption.delete_one({"consumption_id": consumption_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return {"message": "Record deleted successfully"}


# =============================================
# ESKİ CONSUMPTION PATTERNS VE ANALYTICS SİLİNDİ
# Artık consumption_period_routes.py kullanılıyor
# =============================================


# =============================================
# FATURA BAZLI TÜKETİM API'LERİ (YENİ)
# =============================================

@router.get("/invoice-based/customer/{customer_id}")
async def get_invoice_based_consumption_history(
    customer_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Müşterinin fatura bazlı tüketim geçmişini görüntüle
    Admin, Muhasebe, Plasiyer ve müşteri kendi kaydını görebilir
    """
    # Yetki kontrolü
    if current_user.role == UserRole.CUSTOMER:
        if current_user.id != customer_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this customer's data")
    elif current_user.role == UserRole.SALES_AGENT:
        # Plasiyer sadece kendi müşterilerini görebilir
        route = await db.sales_routes.find_one(
            {"sales_agent_id": current_user.id, "customer_id": customer_id},
            {"_id": 0}
        )
        if not route:
            raise HTTPException(status_code=403, detail="Not your customer")
    elif current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTING]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Tüketim kayıtlarını getir
    cursor = db.customer_consumption.find(
        {"customer_id": customer_id},
        {"_id": 0}
    ).sort("created_at", -1)
    
    records = await cursor.to_list(length=None)
    
    return records


@router.get("/invoice-based/invoice/{invoice_id}")
async def get_invoice_consumption_records(
    invoice_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.SALES_AGENT]))
):
    """
    Belirli bir fatura için hesaplanan tüketim kayıtlarını görüntüle
    """
    cursor = db.customer_consumption.find(
        {"target_invoice_id": invoice_id},
        {"_id": 0}
    ).sort("product_name", 1)
    
    records = await cursor.to_list(length=None)
    
    if not records:
        raise HTTPException(status_code=404, detail="No consumption records found for this invoice")
    
    return records


@router.get("/invoice-based/product/{product_code}")
async def get_product_consumption_across_all_customers(
    product_code: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING]))
):
    """
    Belirli bir ürün için tüm müşterilerin tüketim kayıtlarını görüntüle
    """
    cursor = db.customer_consumption.find(
        {"product_code": product_code, "can_calculate": True},
        {"_id": 0}
    ).sort([("customer_id", 1), ("created_at", -1)])
    
    records = await cursor.to_list(length=None)
    
    return records


@router.post("/invoice-based/recalculate/{invoice_id}")
async def recalculate_invoice_consumption(
    invoice_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING]))
):
    """
    Belirli bir fatura için tüketimi yeniden hesapla
    Mevcut kayıtları siler ve yeniden hesaplar
    """
    from services.consumption_calculation_service import ConsumptionCalculationService
    
    # Önce mevcut kayıtları sil
    result = await db.customer_consumption.delete_many({"target_invoice_id": invoice_id})
    deleted_count = result.deleted_count
    
    # Yeniden hesapla
    consumption_service = ConsumptionCalculationService(db)
    calc_result = await consumption_service.calculate_consumption_for_invoice(invoice_id)
    
    if not calc_result.get("success"):
        raise HTTPException(status_code=400, detail=calc_result.get("error", "Calculation failed"))
    
    return {
        "message": "Consumption recalculated successfully",
        "deleted_records": deleted_count,
        **calc_result
    }


@router.post("/invoice-based/bulk-calculate")
async def bulk_calculate_all_invoice_consumption(
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Tüm faturalar için tüketim hesapla (mevcut veriler için)
    UYARI: Bu işlem uzun sürebilir
    """
    from services.consumption_calculation_service import ConsumptionCalculationService
    
    consumption_service = ConsumptionCalculationService(db)
    result = await consumption_service.bulk_calculate_all_invoices()
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Bulk calculation failed")
    
    return {
        "message": "Bulk consumption calculation completed",
        **result
    }


@router.get("/invoice-based/stats/customer/{customer_id}")
async def get_invoice_based_consumption_stats(
    customer_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Müşteri fatura bazlı tüketim istatistikleri
    - Toplam ürün sayısı
    - En çok tüketilen ürünler
    - Ortalama günlük tüketim
    """
    # Yetki kontrolü
    if current_user.role == UserRole.CUSTOMER:
        if current_user.id != customer_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.SALES_AGENT]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Tüm tüketim kayıtlarını getir
    cursor = db.customer_consumption.find(
        {"customer_id": customer_id, "can_calculate": True},
        {"_id": 0}
    )
    
    records = await cursor.to_list(length=None)
    
    if not records:
        return {
            "customer_id": customer_id,
            "total_products": 0,
            "total_consumption_records": 0,
            "top_products": [],
            "average_daily_consumption": 0.0
        }
    
    # İstatistikleri hesapla
    product_stats = {}
    total_daily_rate = 0.0
    
    for record in records:
        product_code = record.get("product_code")
        product_name = record.get("product_name")
        consumption_qty = record.get("consumption_quantity", 0.0)
        daily_rate = record.get("daily_consumption_rate", 0.0)
        
        if product_code not in product_stats:
            product_stats[product_code] = {
                "product_code": product_code,
                "product_name": product_name,
                "total_consumption": 0.0,
                "record_count": 0,
                "avg_daily_rate": 0.0
            }
        
        product_stats[product_code]["total_consumption"] += consumption_qty
        product_stats[product_code]["record_count"] += 1
        product_stats[product_code]["avg_daily_rate"] += daily_rate
        total_daily_rate += daily_rate
    
    # Ortalama hesapla
    for stats in product_stats.values():
        stats["avg_daily_rate"] = stats["avg_daily_rate"] / stats["record_count"]
    
    # En çok tüketilen ürünler (top 10)
    top_products = sorted(
        product_stats.values(),
        key=lambda x: x["total_consumption"],
        reverse=True
    )[:10]
    
    return {
        "customer_id": customer_id,
        "total_products": len(product_stats),
        "total_consumption_records": len(records),
        "top_products": top_products,
        "average_daily_consumption": total_daily_rate / len(records) if records else 0.0
    }
