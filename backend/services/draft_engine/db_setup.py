# Draft Engine - Database Setup
# Koleksiyonları ve indexleri oluşturur

from motor.motor_asyncio import AsyncIOMotorDatabase

from .constants import (
    COL_CUSTOMERS,
    COL_PRODUCTS,
    COL_ROUTES,
    COL_DELIVERIES,
    COL_DELIVERY_ITEMS,
    COL_CUSTOMER_PRODUCT_STATE,
    COL_INTERVAL_LEDGER,
    COL_DAILY_LEDGER,
    COL_WEEKLY_MULTIPLIERS,
    COL_DAILY_TOTALS,
    COL_SALES_REP_DRAFT_TOTALS,
    COL_DEPOT_DRAFT_TOTALS,
    COL_PRODUCTION_DRAFT_TOTALS,
    COL_WORKING_COPIES,
    COL_PROCESSED_EVENTS
)


async def setup_draft_engine_indexes(db: AsyncIOMotorDatabase):
    """
    Tüm Draft Engine koleksiyonları için indexleri oluşturur.
    
    Bu fonksiyon uygulama başlatılırken çağrılmalıdır.
    """
    
    # 1. Customers
    await db[COL_CUSTOMERS].create_index("customer_id", unique=True)
    await db[COL_CUSTOMERS].create_index([("depot_id", 1), ("sales_rep_id", 1)])
    await db[COL_CUSTOMERS].create_index([("depot_id", 1), ("segment_id", 1)])
    await db[COL_CUSTOMERS].create_index("is_active")
    
    # 2. Products
    await db[COL_PRODUCTS].create_index("product_id", unique=True)
    
    # 3. Routes
    await db[COL_ROUTES].create_index([("customer_id", 1), ("effective_from", -1)])
    
    # 4. Deliveries
    await db[COL_DELIVERIES].create_index("delivery_id", unique=True)
    await db[COL_DELIVERIES].create_index([("customer_id", 1), ("delivery_date", -1)])
    await db[COL_DELIVERIES].create_index([("depot_id", 1), ("sales_rep_id", 1), ("delivery_date", -1)])
    
    # 5. Delivery Items
    await db[COL_DELIVERY_ITEMS].create_index("delivery_id")
    await db[COL_DELIVERY_ITEMS].create_index([("customer_id", 1), ("product_id", 1), ("delivery_id", 1)])
    
    # 6. Customer Product State (EN ÖNEMLİ)
    await db[COL_CUSTOMER_PRODUCT_STATE].create_index(
        [("customer_id", 1), ("product_id", 1)],
        unique=True
    )
    await db[COL_CUSTOMER_PRODUCT_STATE].create_index([("customer_id", 1), ("is_active", 1)])
    await db[COL_CUSTOMER_PRODUCT_STATE].create_index([("product_id", 1), ("is_active", 1)])
    await db[COL_CUSTOMER_PRODUCT_STATE].create_index("next_route_date")
    
    # 7. Interval Ledger
    await db[COL_INTERVAL_LEDGER].create_index([("customer_id", 1), ("product_id", 1), ("curr_date", -1)])
    
    # 8. Daily Ledger (Optional)
    await db[COL_DAILY_LEDGER].create_index([("customer_id", 1), ("product_id", 1), ("day", -1)])
    await db[COL_DAILY_LEDGER].create_index([("product_id", 1), ("day", -1)])
    
    # 9. Weekly Multipliers
    await db[COL_WEEKLY_MULTIPLIERS].create_index(
        [("week_start", 1), ("depot_id", 1), ("segment_id", 1), ("product_id", 1)],
        unique=True
    )
    await db[COL_WEEKLY_MULTIPLIERS].create_index(
        [("depot_id", 1), ("segment_id", 1), ("product_id", 1), ("week_start", -1)]
    )
    
    # 10. Daily Totals (for multiplier batch)
    await db[COL_DAILY_TOTALS].create_index(
        [("day", 1), ("depot_id", 1), ("segment_id", 1), ("product_id", 1)],
        unique=True
    )
    await db[COL_DAILY_TOTALS].create_index(
        [("depot_id", 1), ("segment_id", 1), ("product_id", 1), ("day", -1)]
    )
    
    # 11. Sales Rep Draft Totals
    await db[COL_SALES_REP_DRAFT_TOTALS].create_index(
        [("sales_rep_id", 1), ("target_route_date", 1), ("product_id", 1)],
        unique=True
    )
    
    # 12. Depot Draft Totals
    await db[COL_DEPOT_DRAFT_TOTALS].create_index(
        [("depot_id", 1), ("target_route_date", 1), ("product_id", 1)],
        unique=True
    )
    
    # 13. Production Draft Totals
    await db[COL_PRODUCTION_DRAFT_TOTALS].create_index(
        [("company_id", 1), ("target_route_date", 1), ("product_id", 1)],
        unique=True
    )
    
    # 14. Working Copies
    await db[COL_WORKING_COPIES].create_index("customer_id", unique=True)
    await db[COL_WORKING_COPIES].create_index([("customer_id", 1), ("status", 1)])
    
    # 15. Processed Events (Idempotency)
    await db[COL_PROCESSED_EVENTS].create_index("event_id", unique=True)
    
    return {
        "success": True,
        "message": "Tüm Draft Engine indexleri oluşturuldu",
        "collections": [
            COL_CUSTOMERS,
            COL_PRODUCTS,
            COL_ROUTES,
            COL_DELIVERIES,
            COL_DELIVERY_ITEMS,
            COL_CUSTOMER_PRODUCT_STATE,
            COL_INTERVAL_LEDGER,
            COL_DAILY_LEDGER,
            COL_WEEKLY_MULTIPLIERS,
            COL_DAILY_TOTALS,
            COL_SALES_REP_DRAFT_TOTALS,
            COL_DEPOT_DRAFT_TOTALS,
            COL_PRODUCTION_DRAFT_TOTALS,
            COL_WORKING_COPIES,
            COL_PROCESSED_EVENTS
        ]
    }


async def seed_demo_data(db: AsyncIOMotorDatabase):
    """
    Demo veriler oluşturur (test amaçlı).
    """
    from .helpers import gen_id, now_utc, to_iso_date, today_date
    from datetime import timedelta
    
    now = now_utc()
    today = today_date()
    
    # Demo Depolar ve Segmentler
    depot_id = "depot_istanbul"
    segment_hotel = "hotel"
    segment_market = "market"
    segment_restaurant = "restaurant"
    
    # Demo Ürünler
    products = [
        {"product_id": "prod_ayran_200", "name": "200 ML AYRAN", "shelf_life_days": 14, "box_size": 24},
        {"product_id": "prod_ayran_1000", "name": "1000 ML AYRAN", "shelf_life_days": 14, "box_size": 12},
        {"product_id": "prod_yogurt_750", "name": "750 GR YOGURT", "shelf_life_days": 21, "box_size": 6},
        {"product_id": "prod_sut_1000", "name": "1000 ML SÜT", "shelf_life_days": 7, "box_size": 12},
        {"product_id": "prod_kasar_600", "name": "600 GR KAŞAR PEYNİRİ", "shelf_life_days": 60, "box_size": 4},
    ]
    
    for p in products:
        await db[COL_PRODUCTS].update_one(
            {"product_id": p["product_id"]},
            {"$set": p},
            upsert=True
        )
    
    # Demo Müşteriler (3 farklı plasiyer'e dağıtılmış)
    sales_reps = ["rep_ali", "rep_mehmet", "rep_ayse"]
    
    customers = [
        # Ali'nin müşterileri
        {
            "customer_id": "cust_hotel_a",
            "name": "Grand Hotel",
            "depot_id": depot_id,
            "segment_id": segment_hotel,
            "sales_rep_id": "rep_ali",
            "route_weekdays": [1, 3, 5],  # Pazartesi, Çarşamba, Cuma
            "is_active": True
        },
        {
            "customer_id": "cust_market_a",
            "name": "Merkez Market",
            "depot_id": depot_id,
            "segment_id": segment_market,
            "sales_rep_id": "rep_ali",
            "route_weekdays": [2, 4, 6],  # Salı, Perşembe, Cumartesi
            "is_active": True
        },
        # Mehmet'in müşterileri
        {
            "customer_id": "cust_restaurant_a",
            "name": "Lezzet Lokantası",
            "depot_id": depot_id,
            "segment_id": segment_restaurant,
            "sales_rep_id": "rep_mehmet",
            "route_weekdays": [1, 4],  # Pazartesi, Perşembe
            "is_active": True
        },
        {
            "customer_id": "cust_hotel_b",
            "name": "City Hotel",
            "depot_id": depot_id,
            "segment_id": segment_hotel,
            "sales_rep_id": "rep_mehmet",
            "route_weekdays": [2, 5],  # Salı, Cuma
            "is_active": True
        },
        # Ayşe'nin müşterileri
        {
            "customer_id": "cust_market_b",
            "name": "Süper Market",
            "depot_id": depot_id,
            "segment_id": segment_market,
            "sales_rep_id": "rep_ayse",
            "route_weekdays": [1, 3, 5],  # Pazartesi, Çarşamba, Cuma
            "is_active": True
        },
    ]
    
    for c in customers:
        c["created_at"] = now.isoformat()
        await db[COL_CUSTOMERS].update_one(
            {"customer_id": c["customer_id"]},
            {"$set": c},
            upsert=True
        )
    
    return {
        "success": True,
        "products_count": len(products),
        "customers_count": len(customers),
        "sales_reps": sales_reps
    }
