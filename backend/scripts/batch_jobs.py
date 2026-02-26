# Draft Engine - Batch Jobs
# Weekly multiplier ve diğer periyodik işler için script

import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "dagitim_db")


async def run_weekly_multiplier_batch():
    """
    Haftalık çarpan hesaplama batch job.
    Her Pazartesi 00:00'da çalıştırılmalı.
    
    Crontab örneği:
    0 0 * * 1 cd /app/backend && python scripts/batch_jobs.py --job=multipliers
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    import sys
    sys.path.insert(0, '/app/backend')
    
    from services.draft_engine.multiplier_service import WeeklyMultiplierService
    
    print("=" * 60)
    print("WEEKLY MULTIPLIER BATCH JOB")
    print(f"Çalışma Zamanı: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    
    service = WeeklyMultiplierService(db)
    result = await service.run_weekly_batch()
    
    print(f"\nSonuç:")
    print(f"  Hafta Başlangıcı: {result.get('week_start')}")
    print(f"  İşlenen Kombinasyon: {result.get('processed_combinations')}")
    print(f"  Hesaplanan Çarpan: {result.get('total_multipliers_computed')}")
    print("=" * 60)
    
    client.close()
    return result


async def run_passivation_check():
    """
    Pasifleştirme kontrolü batch job.
    Her gün 01:00'da çalıştırılmalı.
    
    K=3 kuralına göre uzun süredir teslimat almayan ürünleri pasifleştirir.
    
    Crontab örneği:
    0 1 * * * cd /app/backend && python scripts/batch_jobs.py --job=passivation
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    import sys
    sys.path.insert(0, '/app/backend')
    
    from services.draft_engine.state_manager import CustomerProductStateManager
    from services.draft_engine.multiplier_service import WeeklyMultiplierService
    
    print("=" * 60)
    print("PASSIVATION CHECK BATCH JOB")
    print(f"Çalışma Zamanı: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    
    state_manager = CustomerProductStateManager(db)
    multiplier_service = WeeklyMultiplierService(db)
    
    async def get_multiplier(depot_id, segment_id, product_id, week_start):
        return await multiplier_service.get_multiplier(depot_id, segment_id, product_id, week_start)
    
    # Tüm aktif müşterileri al
    customers = await db["de_customers"].find({"is_active": True}, {"_id": 0, "customer_id": 1}).to_list(length=100000)
    
    total_passivated = 0
    for cust in customers:
        passivated = await state_manager.passivate_check_all(cust["customer_id"], get_multiplier)
        total_passivated += passivated
    
    print(f"\nSonuç:")
    print(f"  Kontrol Edilen Müşteri: {len(customers)}")
    print(f"  Pasifleştirilen Ürün: {total_passivated}")
    print("=" * 60)
    
    client.close()
    return {"customers_checked": len(customers), "passivated": total_passivated}


async def run_rollup_cleanup():
    """
    Rollup temizleme batch job.
    Her gün 02:00'da çalıştırılmalı.
    
    Sıfır veya negatif değerli rollup kayıtlarını temizler.
    
    Crontab örneği:
    0 2 * * * cd /app/backend && python scripts/batch_jobs.py --job=cleanup
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    import sys
    sys.path.insert(0, '/app/backend')
    
    from services.draft_engine.rollup_service import RollupService
    
    print("=" * 60)
    print("ROLLUP CLEANUP BATCH JOB")
    print(f"Çalışma Zamanı: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    
    service = RollupService(db)
    await service.cleanup_zero_totals()
    
    print("Temizlik tamamlandı.")
    print("=" * 60)
    
    client.close()


async def run_daily_totals_update():
    """
    Günlük toplamları güncelleme.
    Multiplier hesaplaması için gerekli.
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    import sys
    sys.path.insert(0, '/app/backend')
    
    from services.draft_engine.multiplier_service import WeeklyMultiplierService
    from services.draft_engine.helpers import to_date
    
    print("=" * 60)
    print("DAILY TOTALS UPDATE")
    print(f"Çalışma Zamanı: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    
    service = WeeklyMultiplierService(db)
    
    # Son 60 günün teslimatlarından günlük toplamları oluştur
    pipeline = [
        {
            "$lookup": {
                "from": "de_delivery_items",
                "localField": "delivery_id",
                "foreignField": "delivery_id",
                "as": "items"
            }
        },
        {"$unwind": "$items"},
        {
            "$lookup": {
                "from": "de_customers",
                "localField": "customer_id",
                "foreignField": "customer_id",
                "as": "customer"
            }
        },
        {"$unwind": "$customer"},
        {
            "$group": {
                "_id": {
                    "day": "$delivery_date",
                    "depot_id": "$customer.depot_id",
                    "segment_id": "$customer.segment_id",
                    "product_id": "$items.product_id"
                },
                "total_qty": {"$sum": "$items.qty"}
            }
        }
    ]
    
    results = await db["de_deliveries"].aggregate(pipeline).to_list(length=100000)
    
    updated = 0
    for r in results:
        await db["de_depot_segment_product_daily_totals"].update_one(
            {
                "day": r["_id"]["day"],
                "depot_id": r["_id"]["depot_id"],
                "segment_id": r["_id"]["segment_id"],
                "product_id": r["_id"]["product_id"]
            },
            {
                "$set": {
                    "day": r["_id"]["day"],
                    "depot_id": r["_id"]["depot_id"],
                    "segment_id": r["_id"]["segment_id"],
                    "product_id": r["_id"]["product_id"],
                    "total_qty": r["total_qty"]
                }
            },
            upsert=True
        )
        updated += 1
    
    print(f"\nSonuç:")
    print(f"  Güncellenen Günlük Toplam: {updated}")
    print("=" * 60)
    
    client.close()
    return {"updated": updated}


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Draft Engine Batch Jobs")
    parser.add_argument("--job", choices=["multipliers", "passivation", "cleanup", "daily_totals", "all"],
                       default="all", help="Çalıştırılacak job")
    
    args = parser.parse_args()
    
    if args.job == "multipliers":
        asyncio.run(run_weekly_multiplier_batch())
    elif args.job == "passivation":
        asyncio.run(run_passivation_check())
    elif args.job == "cleanup":
        asyncio.run(run_rollup_cleanup())
    elif args.job == "daily_totals":
        asyncio.run(run_daily_totals_update())
    else:
        # Tümünü çalıştır
        asyncio.run(run_daily_totals_update())
        asyncio.run(run_weekly_multiplier_batch())
        asyncio.run(run_passivation_check())
        asyncio.run(run_rollup_cleanup())
