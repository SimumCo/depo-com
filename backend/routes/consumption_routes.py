from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
from models.consumption import ConsumptionRecord, ConsumptionSummary
from models.user import User, UserRole
from utils.auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from collections import defaultdict

router = APIRouter(prefix="/consumption", tags=["Consumption Tracking"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def calculate_consumption(customer_id: str, product_id: str, start_date: datetime, end_date: datetime) -> Dict:
    """Belirli bir dönem için tüketimi hesapla - FATURALARDAN"""
    
    # Müşterinin faturalarını getir (customer_id yerine müşteri vergi numarasını kullanarak)
    # Önce müşteriyi bulalım
    customer = await db.users.find_one({"id": customer_id}, {"_id": 0, "customer_number": 1})
    
    if not customer or not customer.get("customer_number"):
        return None
    
    # VKN'yi normalize et (boşlukları temizle)
    customer_tax_id = str(customer["customer_number"]).strip()
    
    # Fatura tarihine göre filtrele
    cursor = db.invoices.find(
        {
            "customer_tax_id": customer_tax_id,
            "invoice_date": {
                "$gte": start_date.strftime("%Y-%m-%d"),
                "$lte": end_date.strftime("%Y-%m-%d")
            }
        },
        {"_id": 0}
    ).sort("invoice_date", 1)
    
    invoices = await cursor.to_list(length=None)
    
    if not invoices:
        return None
    
    # Ürün bilgisini al
    product = await db.products.find_one({"id": product_id}, {"_id": 0, "code": 1, "name": 1})
    if not product:
        return None
    
    product_code = product.get("code", "")
    product_name = product.get("name", "").strip().lower()
    
    # Ürün bazlı fatura kalemlerini grupla
    product_invoices = []
    for invoice in invoices:
        for item in invoice.get("products", []):
            # Ürün adını normalize et
            item_name = item.get("product_name", "").strip().lower()
            item_code = item.get("product_code", "").strip()
            
            # Ürün kodu veya ismi ile eşleştir (önce kod, sonra isim)
            matched = False
            if product_code and item_code and item_code == product_code:
                matched = True
            elif product_name and item_name and item_name == product_name:
                matched = True
            
            if matched:
                
                # Tarih parse et
                invoice_date_str = invoice.get("invoice_date", "")
                try:
                    if isinstance(invoice_date_str, str):
                        # YYYY-MM-DD formatında
                        invoice_date = datetime.strptime(invoice_date_str, "%Y-%m-%d")
                    else:
                        invoice_date = invoice_date_str
                except:
                    continue
                
                # Miktar al (string olabilir)
                quantity = item.get("quantity", 0)
                if isinstance(quantity, str):
                    try:
                        quantity = float(quantity)
                    except:
                        quantity = 0
                
                product_invoices.append({
                    "date": invoice_date,
                    "quantity": quantity,
                    "invoice_number": invoice.get("invoice_number", "")
                })
    
    if not product_invoices:
        return None
    
    # Tüketim hesapla
    total_ordered = sum(inv["quantity"] for inv in product_invoices)
    invoice_count = len(product_invoices)
    
    # Faturalar arası gün farkı
    if invoice_count > 1:
        date_diffs = []
        for i in range(1, len(product_invoices)):
            diff = (product_invoices[i]["date"] - product_invoices[i-1]["date"]).days
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
        "order_count": invoice_count,
        "days_between_orders": avg_days_between,
        "daily_consumption": daily_consumption,
        "weekly_consumption": weekly_consumption,
        "monthly_consumption": monthly_consumption,
        "last_order_date": product_invoices[-1]["date"]
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
