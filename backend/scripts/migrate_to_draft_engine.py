# Draft Engine - Veri Migrasyonu Scripti
# sf_ koleksiyonlarından de_ koleksiyonlarına veri aktarımı

import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "dagitim_db")


async def migrate_data():
    """Ana migrasyon fonksiyonu"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 60)
    print("ŞEFTALİ Draft Engine - Veri Migrasyonu")
    print("=" * 60)
    
    stats = {
        "customers": 0,
        "products": 0,
        "deliveries": 0,
        "delivery_items": 0,
        "routes": 0
    }
    
    # 1. Müşteri Migrasyonu (sf_customers -> de_customers)
    print("\n[1/5] Müşteriler migrate ediliyor...")
    sf_customers = await db["sf_customers"].find({}, {"_id": 0}).to_list(length=10000)
    
    for cust in sf_customers:
        # Mevcut kullanıcıları bul ve sales_rep_id ata
        # sf_plasiyer kullanıcısının ID'sini bul
        plasiyer_user = await db["users"].find_one({"username": "sf_plasiyer"}, {"_id": 0, "id": 1})
        sales_rep_id = plasiyer_user["id"] if plasiyer_user else "sf_plasiyer"
        
        # Route days'i weekday integer'lara çevir
        route_days = cust.get("route_plan", {}).get("days", [])
        weekday_map = {"MON": 1, "TUE": 2, "WED": 3, "THU": 4, "FRI": 5, "SAT": 6, "SUN": 7}
        route_weekdays = [weekday_map.get(d, 0) for d in route_days if d in weekday_map]
        
        de_customer = {
            "customer_id": cust.get("id"),
            "name": cust.get("name"),
            "code": cust.get("code"),
            "phone": cust.get("phone"),
            "email": cust.get("email"),
            "address": cust.get("address"),
            "depot_id": "depot_istanbul",  # Default depot
            "segment_id": cust.get("channel", "market"),  # hotel/market/restaurant
            "sales_rep_id": sales_rep_id,
            "route_weekdays": route_weekdays,
            "is_active": cust.get("is_active", True),
            "created_at": cust.get("created_at", datetime.now(timezone.utc).isoformat())
        }
        
        await db["de_customers"].update_one(
            {"customer_id": de_customer["customer_id"]},
            {"$set": de_customer},
            upsert=True
        )
        stats["customers"] += 1
    
    print(f"   ✓ {stats['customers']} müşteri migrate edildi")
    
    # 2. Ürün Migrasyonu (sf_products -> de_products)
    print("\n[2/5] Ürünler migrate ediliyor...")
    sf_products = await db["sf_products"].find({}, {"_id": 0}).to_list(length=1000)
    
    for prod in sf_products:
        de_product = {
            "product_id": prod.get("id"),
            "name": prod.get("name"),
            "code": prod.get("code"),
            "shelf_life_days": prod.get("shelf_life_days", 14),
            "box_size": prod.get("box_size") or prod.get("koli_adeti") or 1
        }
        
        await db["de_products"].update_one(
            {"product_id": de_product["product_id"]},
            {"$set": de_product},
            upsert=True
        )
        stats["products"] += 1
    
    print(f"   ✓ {stats['products']} ürün migrate edildi")
    
    # 3. Teslimat Migrasyonu (sf_deliveries -> de_deliveries + de_delivery_items)
    print("\n[3/5] Teslimatlar migrate ediliyor...")
    sf_deliveries = await db["sf_deliveries"].find(
        {"acceptance_status": "accepted"},  # Sadece kabul edilmişler
        {"_id": 0}
    ).sort("delivered_at", 1).to_list(length=50000)
    
    for dlv in sf_deliveries:
        # Müşteri bilgisini al
        customer = await db["de_customers"].find_one(
            {"customer_id": dlv.get("customer_id")},
            {"_id": 0, "depot_id": 1, "sales_rep_id": 1}
        )
        
        if not customer:
            continue
        
        # Teslimat tarihi
        delivered_at = dlv.get("delivered_at", "")
        if isinstance(delivered_at, str):
            delivery_date = delivered_at[:10]  # YYYY-MM-DD
        else:
            delivery_date = delivered_at.strftime("%Y-%m-%d") if delivered_at else datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        de_delivery = {
            "delivery_id": dlv.get("id"),
            "customer_id": dlv.get("customer_id"),
            "depot_id": customer.get("depot_id", "depot_istanbul"),
            "sales_rep_id": customer.get("sales_rep_id"),
            "delivery_date": delivery_date,
            "status": "finalized",  # Kabul edilmiş = finalized
            "created_at": dlv.get("created_at", datetime.now(timezone.utc).isoformat())
        }
        
        await db["de_deliveries"].update_one(
            {"delivery_id": de_delivery["delivery_id"]},
            {"$set": de_delivery},
            upsert=True
        )
        stats["deliveries"] += 1
        
        # Teslimat kalemleri
        for item in dlv.get("items", []):
            de_item = {
                "delivery_id": dlv.get("id"),
                "customer_id": dlv.get("customer_id"),
                "product_id": item.get("product_id"),
                "qty": item.get("qty", 0)
            }
            
            # Duplicate kontrolü için unique key
            await db["de_delivery_items"].update_one(
                {
                    "delivery_id": de_item["delivery_id"],
                    "product_id": de_item["product_id"]
                },
                {"$set": de_item},
                upsert=True
            )
            stats["delivery_items"] += 1
    
    print(f"   ✓ {stats['deliveries']} teslimat, {stats['delivery_items']} kalem migrate edildi")
    
    # 4. Rut Migrasyonu
    print("\n[4/5] Rut bilgileri migrate ediliyor...")
    de_customers = await db["de_customers"].find({}, {"_id": 0}).to_list(length=10000)
    
    for cust in de_customers:
        if cust.get("route_weekdays"):
            route = {
                "customer_id": cust["customer_id"],
                "weekdays": cust["route_weekdays"],
                "effective_from": "2024-01-01",
                "effective_to": None
            }
            
            await db["de_routes"].update_one(
                {"customer_id": route["customer_id"]},
                {"$set": route},
                upsert=True
            )
            stats["routes"] += 1
    
    print(f"   ✓ {stats['routes']} rut kaydı oluşturuldu")
    
    # 5. Özet
    print("\n" + "=" * 60)
    print("MİGRASYON TAMAMLANDI")
    print("=" * 60)
    print(f"Müşteriler:      {stats['customers']}")
    print(f"Ürünler:         {stats['products']}")
    print(f"Teslimatlar:     {stats['deliveries']}")
    print(f"Teslimat Kalemi: {stats['delivery_items']}")
    print(f"Rut Kayıtları:   {stats['routes']}")
    print("=" * 60)
    
    client.close()
    return stats


async def rebuild_customer_product_states():
    """
    Migrate edilen teslimatlardan customer_product_state'leri yeniden oluşturur.
    Bu işlem Model B hesaplamalarını çalıştırır.
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "=" * 60)
    print("CUSTOMER PRODUCT STATE YENİDEN OLUŞTURULUYOR")
    print("=" * 60)
    
    # Import services
    import sys
    sys.path.insert(0, '/app/backend')
    
    from services.draft_engine.state_manager import CustomerProductStateManager
    from services.draft_engine.multiplier_service import WeeklyMultiplierService
    from services.draft_engine.helpers import to_date, get_week_start, today_date
    
    state_manager = CustomerProductStateManager(db)
    multiplier_service = WeeklyMultiplierService(db)
    
    async def get_multiplier(depot_id, segment_id, product_id, week_start):
        return await multiplier_service.get_multiplier(depot_id, segment_id, product_id, week_start)
    
    # Tüm müşterileri al
    customers = await db["de_customers"].find({}, {"_id": 0}).to_list(length=10000)
    
    processed_customers = 0
    processed_deliveries = 0
    processed_states = 0
    
    for cust in customers:
        customer_id = cust["customer_id"]
        depot_id = cust.get("depot_id", "depot_istanbul")
        segment_id = cust.get("segment_id", "market")
        route_weekdays = cust.get("route_weekdays", [])
        
        # Bu müşterinin teslimatlarını tarihe göre sıralı al
        deliveries = await db["de_deliveries"].find(
            {"customer_id": customer_id},
            {"_id": 0}
        ).sort("delivery_date", 1).to_list(length=1000)
        
        for dlv in deliveries:
            delivery_id = dlv["delivery_id"]
            delivery_date = to_date(dlv["delivery_date"])
            
            # Teslimat kalemlerini al
            items = await db["de_delivery_items"].find(
                {"delivery_id": delivery_id},
                {"_id": 0}
            ).to_list(length=100)
            
            for item in items:
                product_id = item["product_id"]
                qty = item["qty"]
                
                if qty > 0:
                    # State'i process et (Model B hesaplama)
                    await state_manager.process_delivery(
                        customer_id=customer_id,
                        product_id=product_id,
                        delivery_date=delivery_date,
                        qty=qty,
                        depot_id=depot_id,
                        segment_id=segment_id,
                        route_weekdays=route_weekdays,
                        get_multiplier_func=get_multiplier
                    )
                    processed_states += 1
            
            processed_deliveries += 1
        
        processed_customers += 1
        
        if processed_customers % 10 == 0:
            print(f"   İşlenen: {processed_customers} müşteri, {processed_deliveries} teslimat, {processed_states} state")
    
    print("\n" + "=" * 60)
    print("STATE OLUŞTURMA TAMAMLANDI")
    print("=" * 60)
    print(f"İşlenen Müşteri:   {processed_customers}")
    print(f"İşlenen Teslimat:  {processed_deliveries}")
    print(f"Oluşturulan State: {processed_states}")
    print("=" * 60)
    
    client.close()
    return {
        "customers": processed_customers,
        "deliveries": processed_deliveries,
        "states": processed_states
    }


if __name__ == "__main__":
    print("\n🚀 Draft Engine Migrasyon Başlıyor...\n")
    
    # 1. Veri migrasyonu
    asyncio.run(migrate_data())
    
    # 2. State'leri yeniden oluştur
    asyncio.run(rebuild_customer_product_states())
    
    print("\n✅ Tüm migrasyon işlemleri tamamlandı!\n")
