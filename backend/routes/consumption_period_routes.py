"""
Consumption Period Routes
Haftalık/Aylık periyodik tüketim ve yıllık karşılaştırma API'leri
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from models.consumption_period import ConsumptionPeriod, YearOverYearComparison, TrendAnalysis
from models.user import User, UserRole
from utils.auth import get_current_user, require_role
from services.periodic_consumption_service import PeriodicConsumptionService
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/consumption-periods", tags=["Consumption Periods"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.post("/generate")
async def generate_periodic_records(
    period_type: str = Query("monthly", description="weekly veya monthly"),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Tüm müşteriler için haftalık veya aylık periyodik tüketim kayıtları oluştur
    UYARI: Bu işlem uzun sürebilir
    """
    if period_type not in ["weekly", "monthly"]:
        raise HTTPException(status_code=400, detail="period_type 'weekly' veya 'monthly' olmalı")
    
    service = PeriodicConsumptionService(db)
    result = await service.generate_periodic_records(period_type=period_type)
    
    return {
        "message": f"{period_type.capitalize()} periyodik kayıtlar oluşturuldu",
        **result
    }


@router.get("/customer/{customer_id}")
async def get_customer_periodic_consumption(
    customer_id: str,
    period_type: str = Query("monthly", description="weekly veya monthly"),
    year: Optional[int] = Query(None, description="Yıl (varsayılan: mevcut yıl)"),
    current_user: User = Depends(get_current_user)
):
    """
    Müşterinin periyodik tüketim kayıtlarını getir
    """
    # Yetki kontrolü
    if current_user.role == UserRole.CUSTOMER:
        if current_user.id != customer_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == UserRole.SALES_AGENT:
        route = await db.sales_routes.find_one(
            {"sales_agent_id": current_user.id, "customer_id": customer_id},
            {"_id": 0}
        )
        if not route:
            raise HTTPException(status_code=403, detail="Not your customer")
    elif current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTING]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Query oluştur
    query = {
        "customer_id": customer_id,
        "period_type": period_type
    }
    
    if year:
        query["period_year"] = year
    
    # Kayıtları getir
    cursor = db.consumption_periods.find(query, {"_id": 0}).sort([
        ("period_year", -1),
        ("period_number", 1)
    ])
    
    records = await cursor.to_list(length=None)
    
    return records


@router.get("/compare/year-over-year")
async def compare_year_over_year(
    customer_id: str = Query(..., description="Müşteri ID"),
    product_code: str = Query(..., description="Ürün kodu"),
    period_type: str = Query("monthly", description="weekly veya monthly"),
    period_number: int = Query(..., description="Hafta veya ay numarası"),
    current_year: int = Query(..., description="Karşılaştırma yılı"),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.SALES_AGENT]))
):
    """
    Yıllık karşılaştırma (Örnek: 2024 Ocak vs 2025 Ocak)
    
    Örnek:
    - period_type=monthly, period_number=1, current_year=2025
    - Sonuç: 2024 Ocak vs 2025 Ocak karşılaştırması
    """
    service = PeriodicConsumptionService(db)
    
    comparison = await service.compare_year_over_year(
        customer_id=customer_id,
        product_code=product_code,
        period_type=period_type,
        period_number=period_number,
        current_year=current_year
    )
    
    if not comparison:
        raise HTTPException(
            status_code=404,
            detail=f"{current_year} yılı için veri bulunamadı"
        )
    
    return comparison


@router.get("/trends/yearly")
async def get_yearly_trend_analysis(
    customer_id: str = Query(..., description="Müşteri ID"),
    product_code: str = Query(..., description="Ürün kodu"),
    year: int = Query(..., description="Analiz yılı"),
    period_type: str = Query("monthly", description="weekly veya monthly"),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.SALES_AGENT]))
):
    """
    Yıllık trend analizi
    
    Döndürür:
    - Tüm periyotlar (12 ay veya 52 hafta)
    - Toplam ve ortalama tüketim
    - En yüksek ve en düşük periyotlar
    - Genel trend (artan/azalan/sabit/mevsimsel)
    """
    service = PeriodicConsumptionService(db)
    
    analysis = await service.analyze_yearly_trend(
        customer_id=customer_id,
        product_code=product_code,
        year=year,
        period_type=period_type
    )
    
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail=f"{year} yılı için veri bulunamadı"
        )
    
    return analysis


@router.get("/customer/{customer_id}/products")
async def get_customer_products_with_trends(
    customer_id: str,
    year: int = Query(..., description="Analiz yılı"),
    period_type: str = Query("monthly", description="weekly veya monthly"),
    current_user: User = Depends(get_current_user)
):
    """
    Müşterinin tüm ürünleri için trend özeti
    """
    # Yetki kontrolü
    if current_user.role == UserRole.CUSTOMER:
        if current_user.id != customer_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.SALES_AGENT]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Müşterinin tüm ürünlerini bul (periyodik kayıtlardan)
    pipeline = [
        {
            "$match": {
                "customer_id": customer_id,
                "period_year": year,
                "period_type": period_type
            }
        },
        {
            "$group": {
                "_id": "$product_code",
                "product_name": {"$first": "$product_name"},
                "total_consumption": {"$sum": "$total_consumption"},
                "avg_daily": {"$avg": "$daily_average"},
                "avg_yoy_change": {"$avg": "$year_over_year_change"},
                "trend": {"$first": "$trend_direction"}
            }
        },
        {
            "$sort": {"total_consumption": -1}
        }
    ]
    
    cursor = db.consumption_periods.aggregate(pipeline)
    results = await cursor.to_list(length=None)
    
    # Format sonuçları
    products = []
    for result in results:
        products.append({
            "product_code": result["_id"],
            "product_name": result["product_name"],
            "total_consumption": result["total_consumption"],
            "average_daily": result["avg_daily"],
            "year_over_year_change": result.get("avg_yoy_change"),
            "trend_direction": result.get("trend")
        })
    
    return {
        "customer_id": customer_id,
        "year": year,
        "period_type": period_type,
        "total_products": len(products),
        "products": products
    }


@router.get("/top-consumers")
async def get_top_consumers_by_product(
    product_code: str = Query(..., description="Ürün kodu"),
    year: int = Query(..., description="Analiz yılı"),
    period_type: str = Query("monthly", description="weekly veya monthly"),
    limit: int = Query(10, description="Top N müşteri"),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING]))
):
    """
    Belirli bir ürün için en çok tüketen müşteriler
    """
    # Aggregate query
    pipeline = [
        {
            "$match": {
                "product_code": product_code,
                "period_year": year,
                "period_type": period_type
            }
        },
        {
            "$group": {
                "_id": "$customer_id",
                "total_consumption": {"$sum": "$total_consumption"},
                "avg_daily": {"$avg": "$daily_average"},
                "product_name": {"$first": "$product_name"}
            }
        },
        {
            "$sort": {"total_consumption": -1}
        },
        {
            "$limit": limit
        }
    ]
    
    cursor = db.consumption_periods.aggregate(pipeline)
    results = await cursor.to_list(length=None)
    
    # Müşteri isimlerini ekle
    for result in results:
        customer = await db.users.find_one(
            {"id": result["_id"]},
            {"_id": 0, "full_name": 1, "username": 1}
        )
        if customer:
            result["customer_name"] = customer.get("full_name", customer.get("username"))
        else:
            result["customer_name"] = "Unknown"
    
    return {
        "product_code": product_code,
        "product_name": results[0]["product_name"] if results else "",
        "year": year,
        "period_type": period_type,
        "top_consumers": [
            {
                "customer_id": r["_id"],
                "customer_name": r["customer_name"],
                "total_consumption": r["total_consumption"],
                "average_daily": r["avg_daily"]
            }
            for r in results
        ]
    }
