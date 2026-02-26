#!/usr/bin/env python3
"""
Kesim Saati Tetikleyici
Her gün ayarlanan saatte çalışır ve yarınki rota için sipariş hesaplamasını tetikler.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, '/app/backend')

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "distribution_management")

WEEKDAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]


def get_tomorrow_route_code():
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    return WEEKDAY_CODES[tomorrow.weekday()]


async def trigger_cutoff_calculation():
    """Kesim saati hesaplaması"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 60)
    print("KESIM SAATI TETIKLEME")
    print(f"Çalışma Zamanı: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    
    route_day = get_tomorrow_route_code()
    print(f"Yarınki rota günü: {route_day}")
    
    # Tüm plasiyerleri al
    salespersons = await db["users"].find(
        {"role": "sales_rep"},
        {"_id": 0, "id": 1, "username": 1}
    ).to_list(length=100)
    
    print(f"Toplam plasiyer: {len(salespersons)}")
    
    results = []
    for sp in salespersons:
        sp_id = sp["id"]
        
        # Bu plasiyerin yarınki rota müşterilerini bul
        customers = await db["sf_customers"].find(
            {
                "salesperson_id": sp_id,
                "is_active": True,
                "route_plan.days": route_day
            },
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(length=500)
        
        customer_ids = [c["id"] for c in customers]
        
        if not customer_ids:
            continue
        
        # Bugün sipariş atanları bul
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        orders = await db["sf_orders"].find(
            {
                "customer_id": {"$in": customer_ids},
                "status": {"$in": ["submitted", "approved"]},
                "created_at": {"$gte": today_start.isoformat()}
            },
            {"_id": 0, "customer_id": 1}
        ).to_list(length=500)
        
        ordered_customer_ids = set(o["customer_id"] for o in orders)
        
        # Draft kullananlar
        draft_customer_ids = [cid for cid in customer_ids if cid not in ordered_customer_ids]
        
        result = {
            "salesperson_id": sp_id,
            "salesperson_username": sp.get("username"),
            "route_day": route_day,
            "total_customers": len(customer_ids),
            "customers_with_orders": len(ordered_customer_ids),
            "customers_with_drafts": len(draft_customer_ids),
            "calculated_at": datetime.now(timezone.utc).isoformat()
        }
        results.append(result)
        
        # Hesaplama sonucunu kaydet
        await db["sf_cutoff_calculations"].insert_one({
            **result,
            "customer_details": {
                "ordered": list(ordered_customer_ids),
                "draft": draft_customer_ids
            }
        })
        
        print(f"  {sp.get('username')}: {len(customer_ids)} müşteri, {len(ordered_customer_ids)} sipariş, {len(draft_customer_ids)} draft")
    
    print("\n" + "=" * 60)
    print(f"Toplam hesaplama: {len(results)}")
    print("=" * 60)
    
    client.close()
    return results


if __name__ == "__main__":
    asyncio.run(trigger_cutoff_calculation())
