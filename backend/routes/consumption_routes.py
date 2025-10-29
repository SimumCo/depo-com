from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
from ..models.consumption import ConsumptionRecord, ConsumptionSummary
from ..models.user import User, UserRole
from ..utils.auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from collections import defaultdict

router = APIRouter(prefix="/consumption", tags=["Consumption Tracking"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def calculate_consumption(customer_id: str, product_id: str, start_date: datetime, end_date: datetime) -> Dict:
    """Belirli bir dönem için tüketimi hesapla"""
    
    # Müşterinin siparişlerini getir
    cursor = db.orders.find(
        {
            "customer_id": customer_id,
            "created_at": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        },
        {"_id": 0}
    ).sort("created_at", 1)
    
    orders = await cursor.to_list(length=None)
    
    # Ürün bazlı siparişleri grupla
    product_orders = []
    for order in orders:
        for item in order.get("items", []):
            if item["product_id"] == product_id:
                order_date = datetime.fromisoformat(order["created_at"]) if isinstance(order["created_at"], str) else order["created_at"]
                product_orders.append({
                    "date": order_date,
                    "quantity": item["quantity"]
                })
    
    if not product_orders:
        return None
    
    # Tüketim hesapla
    total_ordered = sum(o["quantity"] for o in product_orders)
    order_count = len(product_orders)
    
    # Siparişler arası gün farkı
    if order_count > 1:
        date_diffs = []
        for i in range(1, len(product_orders)):
            diff = (product_orders[i]["date"] - product_orders[i-1]["date"]).days
            if diff > 0:
                date_diffs.append(diff)
        
        avg_days_between = sum(date_diffs) / len(date_diffs) if date_diffs else 1
    else:
        avg_days_between = 1
    
    # Günlük tüketim = toplam / ortalama gün
    daily_consumption = total_ordered / max(avg_days_between, 1)
    weekly_consumption = daily_consumption * 7
    monthly_consumption = daily_consumption * 30
    
    return {
        "total_ordered": total_ordered,
        "order_count": order_count,
        "days_between_orders": avg_days_between,
        "daily_consumption": daily_consumption,
        "weekly_consumption": weekly_consumption,
        "monthly_consumption": monthly_consumption,
        "last_order_date": product_orders[-1]["date"]
    }

@router.post("/calculate")
async def trigger_consumption_calculation(
    current_user: User = Depends(get_current_user)
):
    """Tüm müşteriler için tüketim hesaplamasını tetikle (Admin/System)"""
    
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTING]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Tüm müşterileri getir
    cursor = db.users.find({"role": UserRole.CUSTOMER.value}, {"_id": 0})
    customers = await cursor.to_list(length=None)
    
    # Tüm ürünleri getir
    products_cursor = db.products.find({}, {"_id": 0})
    products = await products_cursor.to_list(length=None)
    
    # Şu anki ay ve geçen ay
    now = datetime.now(timezone.utc)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    
    records_created = 0
    
    for customer in customers:
        for product in products:
            # Bu ay
            current_data = await calculate_consumption(
                customer["id"], 
                product["id"],
                current_month_start,
                now
            )
            
            if current_data:
                # Geçen aynın verisini kontrol et
                prev_record = await db.consumption.find_one({
                    "customer_id": customer["id"],
                    "product_id": product["id"],
                    "period_type": "monthly",
                    "period_start": last_month_start.isoformat()
                })
                
                growth_rate = None
                prediction = None
                
                if prev_record:
                    prev_consumption = prev_record.get("monthly_consumption", 0)
                    if prev_consumption > 0:
                        growth_rate = ((current_data["monthly_consumption"] - prev_consumption) / prev_consumption) * 100
                        prediction = current_data["monthly_consumption"] * (1 + (growth_rate / 100))
                
                # Kayıt oluştur
                consumption_record = ConsumptionRecord(
                    customer_id=customer["id"],
                    product_id=product["id"],
                    product_name=product["name"],
                    period_type="monthly",
                    period_start=current_month_start,
                    period_end=now,
                    total_ordered=current_data["total_ordered"],
                    order_count=current_data["order_count"],
                    days_between_orders=current_data["days_between_orders"],
                    daily_consumption=current_data["daily_consumption"],
                    weekly_consumption=current_data["weekly_consumption"],
                    monthly_consumption=current_data["monthly_consumption"],
                    previous_period_consumption=prev_record.get("monthly_consumption") if prev_record else None,
                    growth_rate=growth_rate,
                    prediction_next_period=prediction
                )
                
                doc = consumption_record.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                doc['updated_at'] = doc['updated_at'].isoformat()
                doc['period_start'] = doc['period_start'].isoformat()
                doc['period_end'] = doc['period_end'].isoformat()
                
                # Mevcut kayıt var mı kontrol et
                existing = await db.consumption.find_one({
                    "customer_id": customer["id"],
                    "product_id": product["id"],
                    "period_type": "monthly",
                    "period_start": current_month_start.isoformat()
                })
                
                if existing:
                    await db.consumption.update_one(
                        {"id": existing["id"]},
                        {"$set": doc}
                    )
                else:
                    await db.consumption.insert_one(doc)
                
                records_created += 1
    
    return {
        "message": "Consumption calculation completed",
        "records_processed": records_created
    }

@router.get("/my-consumption", response_model=List[ConsumptionSummary])
async def get_my_consumption(
    period_type: str = "monthly",
    current_user: User = Depends(get_current_user)
):
    """Müşteri kendi tüketim verilerini görür"""
    
    if current_user.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can access consumption data")
    
    # En son dönemin verilerini getir
    cursor = db.consumption.find(
        {
            "customer_id": current_user.id,
            "period_type": period_type
        },
        {"_id": 0}
    ).sort("period_start", -1)
    
    records = await cursor.to_list(length=None)
    
    # Ürün bazında en son kayıtları al
    product_latest = {}
    for record in records:
        product_id = record["product_id"]
        if product_id not in product_latest:
            product_latest[product_id] = record
    
    # Summary formatına çevir
    result = []
    for record in product_latest.values():
        last_order = datetime.fromisoformat(record["period_end"]) if isinstance(record["period_end"], str) else record["period_end"]
        
        result.append(ConsumptionSummary(
            product_name=record["product_name"],
            weekly_avg=record["weekly_consumption"],
            monthly_avg=record["monthly_consumption"],
            last_order_date=last_order,
            growth_rate=record.get("growth_rate"),
            prediction=record.get("prediction_next_period")
        ))
    
    return result

@router.get("/customer/{customer_id}", response_model=List[ConsumptionSummary])
async def get_customer_consumption(
    customer_id: str,
    period_type: str = "monthly",
    current_user: User = Depends(get_current_user)
):
    """Plasiyer/Admin müşteri tüketimini görür"""
    
    if current_user.role not in [UserRole.ADMIN, UserRole.SALES_AGENT, UserRole.ACCOUNTING]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Plasiyer sadece kendi müşterilerini görebilir
    if current_user.role == UserRole.SALES_AGENT:
        route = await db.sales_routes.find_one(
            {"sales_agent_id": current_user.id, "customer_id": customer_id},
            {"_id": 0}
        )
        if not route:
            raise HTTPException(status_code=403, detail="Not your customer")
    
    cursor = db.consumption.find(
        {
            "customer_id": customer_id,
            "period_type": period_type
        },
        {"_id": 0}
    ).sort("period_start", -1)
    
    records = await cursor.to_list(length=None)
    
    product_latest = {}
    for record in records:
        product_id = record["product_id"]
        if product_id not in product_latest:
            product_latest[product_id] = record
    
    result = []
    for record in product_latest.values():
        last_order = datetime.fromisoformat(record["period_end"]) if isinstance(record["period_end"], str) else record["period_end"]
        
        result.append(ConsumptionSummary(
            product_name=record["product_name"],
            weekly_avg=record["weekly_consumption"],
            monthly_avg=record["monthly_consumption"],
            last_order_date=last_order,
            growth_rate=record.get("growth_rate"),
            prediction=record.get("prediction_next_period")
        ))
    
    return result
