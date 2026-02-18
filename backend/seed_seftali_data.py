"""Seed script for SEFTALI module - creates test data."""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
from utils.auth import hash_password
import uuid


def gid():
    return str(uuid.uuid4())


def iso(dt):
    return dt.isoformat()


NOW = datetime.now(timezone.utc)


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # ---- 1. Ensure seftali demo users exist ----
    demo_users = [
        {"username": "sf_musteri", "full_name": "Seftali Musteri A", "role": "customer", "pw": "musteri123"},
        {"username": "sf_musteri2", "full_name": "Seftali Musteri B", "role": "customer", "pw": "musteri123"},
        {"username": "sf_satici", "full_name": "Seftali Satici", "role": "sales_rep", "pw": "satici123"},
        {"username": "sf_plasiyer", "full_name": "Seftali Plasiyer", "role": "sales_agent", "pw": "plasiyer123"},
    ]
    user_ids = {}
    for u in demo_users:
        existing = await db.users.find_one({"username": u["username"]}, {"_id": 0})
        if existing:
            user_ids[u["username"]] = existing["id"]
            print(f"  User {u['username']} already exists")
        else:
            uid = gid()
            await db.users.insert_one({
                "id": uid, "username": u["username"], "password_hash": hash_password(u["pw"]),
                "full_name": u["full_name"], "role": u["role"], "is_active": True,
                "created_at": iso(NOW),
            })
            user_ids[u["username"]] = uid
            print(f"  Created user {u['username']}")

    # ---- 2. SF Products ----
    products = [
        {"id": gid(), "code": "AYR_BRD", "name": "Ayran Bardak", "shelf_life_days": 21},
        {"id": gid(), "code": "YOG_KOV", "name": "Yogurt Kova", "shelf_life_days": 28},
        {"id": gid(), "code": "SUZ_YOG", "name": "Suzme Yogurt", "shelf_life_days": 14},
        {"id": gid(), "code": "AYR_PET", "name": "Ayran Pet Sise", "shelf_life_days": 30},
    ]
    existing_count = await db.sf_products.count_documents({})
    if existing_count == 0:
        for p in products:
            p["created_at"] = iso(NOW)
            p["updated_at"] = iso(NOW)
        await db.sf_products.insert_many(products)
        print(f"  Created {len(products)} sf_products")
    else:
        print(f"  sf_products already exist ({existing_count})")
        cursor = db.sf_products.find({}, {"_id": 0, "id": 1, "code": 1})
        products = await cursor.to_list(100)

    prod_map = {}
    cursor = db.sf_products.find({}, {"_id": 0})
    for p in await cursor.to_list(100):
        prod_map[p["code"]] = p["id"]

    # ---- 3. SF Customers ----
    cust_a_id = gid()
    cust_b_id = gid()
    sf_customers = [
        {
            "id": cust_a_id, "user_id": user_ids["sf_musteri"],
            "name": "Musteri A - Market", "route_plan": {"days": ["MON", "FRI"], "effective_from_week": "2025-W01"},
            "is_active": True, "created_at": iso(NOW), "updated_at": iso(NOW),
        },
        {
            "id": cust_b_id, "user_id": user_ids["sf_musteri2"],
            "name": "Musteri B - Restoran", "route_plan": {"days": ["TUE", "THU"], "effective_from_week": "2025-W01"},
            "is_active": True, "created_at": iso(NOW), "updated_at": iso(NOW),
        },
    ]
    existing_custs = await db.sf_customers.count_documents({})
    if existing_custs == 0:
        await db.sf_customers.insert_many(sf_customers)
        print(f"  Created {len(sf_customers)} sf_customers")
    else:
        print(f"  sf_customers already exist ({existing_custs})")
        c = await db.sf_customers.find_one({"user_id": user_ids["sf_musteri"]}, {"_id": 0})
        if c:
            cust_a_id = c["id"]

    # ---- 4. Sample deliveries for Musteri A ----
    existing_dlv = await db.sf_deliveries.count_documents({})
    if existing_dlv == 0:
        d1_id = gid()
        d2_id = gid()
        d3_id = gid()
        seven_days_ago = NOW - timedelta(days=7)
        two_days_ago = NOW - timedelta(days=2)

        deliveries = [
            {
                "id": d1_id, "customer_id": cust_a_id,
                "created_by_salesperson_id": user_ids["sf_satici"],
                "delivery_type": "route", "delivered_at": iso(seven_days_ago),
                "invoice_no": "FTR-001", "acceptance_status": "pending",
                "accepted_at": None, "rejected_at": None, "rejection_reason": None,
                "items": [
                    {"product_id": prod_map.get("AYR_BRD", ""), "qty": 100},
                    {"product_id": prod_map.get("YOG_KOV", ""), "qty": 20},
                ],
                "created_at": iso(seven_days_ago), "updated_at": iso(seven_days_ago),
            },
            {
                "id": d2_id, "customer_id": cust_a_id,
                "created_by_salesperson_id": user_ids["sf_satici"],
                "delivery_type": "route", "delivered_at": iso(two_days_ago),
                "invoice_no": "FTR-002", "acceptance_status": "pending",
                "accepted_at": None, "rejected_at": None, "rejection_reason": None,
                "items": [
                    {"product_id": prod_map.get("AYR_BRD", ""), "qty": 60},
                    {"product_id": prod_map.get("SUZ_YOG", ""), "qty": 15},
                ],
                "created_at": iso(two_days_ago), "updated_at": iso(two_days_ago),
            },
            {
                "id": d3_id, "customer_id": cust_a_id,
                "created_by_salesperson_id": user_ids["sf_satici"],
                "delivery_type": "off_route", "delivered_at": iso(NOW),
                "invoice_no": "FTR-003", "acceptance_status": "pending",
                "accepted_at": None, "rejected_at": None, "rejection_reason": None,
                "items": [
                    {"product_id": prod_map.get("AYR_PET", ""), "qty": 50},
                ],
                "created_at": iso(NOW), "updated_at": iso(NOW),
            },
        ]
        await db.sf_deliveries.insert_many(deliveries)
        print(f"  Created {len(deliveries)} sf_deliveries")
    else:
        print(f"  sf_deliveries already exist ({existing_dlv})")

    # ---- 5. Create indexes ----
    print("\n  Creating indexes...")
    await db.sf_customers.create_index("user_id", unique=True)
    await db.sf_customers.create_index("is_active")
    await db.sf_products.create_index("code", unique=True)
    await db.sf_deliveries.create_index([("customer_id", 1), ("delivered_at", -1)])
    await db.sf_deliveries.create_index("acceptance_status")
    await db.sf_deliveries.create_index([("customer_id", 1), ("acceptance_status", 1)])
    await db.sf_stock_declarations.create_index([("customer_id", 1), ("declared_at", -1)])
    await db.sf_consumption_stats.create_index([("customer_id", 1), ("product_id", 1)], unique=True)
    await db.sf_consumption_stats.create_index([("customer_id", 1), ("spike.detected_at", -1)])
    await db.sf_working_copies.create_index([("customer_id", 1), ("status", 1)])
    await db.sf_variance_events.create_index([("customer_id", 1), ("status", 1)])
    await db.sf_variance_events.create_index([("customer_id", 1), ("product_id", 1), ("detected_at", -1)])
    await db.sf_variance_events.create_index(
        [("trigger.type", 1), ("trigger.ref_id", 1), ("product_id", 1)], unique=True
    )
    print("  Indexes created!")

    print("\n=== SEFTALI seed complete ===")
    print("Demo credentials:")
    print("  Musteri:   sf_musteri / musteri123")
    print("  Musteri2:  sf_musteri2 / musteri123")
    print("  Satici:    sf_satici / satici123")
    print("  Plasiyer:  sf_plasiyer / plasiyer123")
    print("  Admin:     admin / admin123")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
