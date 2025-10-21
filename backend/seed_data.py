import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Starting database seeding...")
    
    # Clear existing data
    print("🗑️  Clearing existing data...")
    await db.users.delete_many({})
    await db.products.delete_many({})
    await db.inventory.delete_many({})
    await db.incoming_shipments.delete_many({})
    await db.orders.delete_many({})
    await db.tasks.delete_many({})
    
    # Create users
    print("👥 Creating users...")
    users = [
        {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": pwd_context.hash("admin123"),
            "email": "admin@dms.com",
            "full_name": "Admin Yönetici",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "manager",
            "password_hash": pwd_context.hash("manager123"),
            "email": "manager@dms.com",
            "full_name": "Ahmet Yılmaz",
            "role": "warehouse_manager",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "staff",
            "password_hash": pwd_context.hash("staff123"),
            "email": "staff@dms.com",
            "full_name": "Mehmet Demir",
            "role": "warehouse_staff",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    await db.users.insert_many(users)
    print(f"✅ Created {len(users)} users")
    
    # Get staff user for task assignment
    staff_user = await db.users.find_one({"username": "staff"})
    manager_user = await db.users.find_one({"username": "manager"})
    
    # Create products
    print("📦 Creating products...")
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Premium Zeytinyağı 1L",
            "sku": "ZYG-1000",
            "category": "Yağlar",
            "weight": 1.0,
            "units_per_case": 12,
            "description": "Soğuk sıkım zeytinyağı",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Organik Domates Salçası 720g",
            "sku": "SLC-720",
            "category": "Konserveler",
            "weight": 0.72,
            "units_per_case": 24,
            "description": "100% doğal domates salçası",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Tam Buğday Makarna 500g",
            "sku": "MKR-500",
            "category": "Makarna",
            "weight": 0.5,
            "units_per_case": 20,
            "description": "Tam buğday makarna",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Yerli Bal 1kg",
            "sku": "BAL-1000",
            "category": "Şeker ve Tatlandırıcılar",
            "weight": 1.0,
            "units_per_case": 6,
            "description": "Çam balı",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bakliyat Karışımı 1kg",
            "sku": "BKL-1000",
            "category": "Bakliyat",
            "weight": 1.0,
            "units_per_case": 10,
            "description": "Mercimek, nohut, fasulye karışımı",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    await db.products.insert_many(products)
    print(f"✅ Created {len(products)} products")
    
    # Create inventory for each product
    print("📊 Creating inventory...")
    inventory_items = []
    for i, product in enumerate(products):
        units = [305, 180, 520, 95, 420][i]  # Different stock levels
        inventory_items.append({
            "id": str(uuid.uuid4()),
            "product_id": product["id"],
            "total_units": units,
            "is_out_of_stock": units == 0,
            "last_supply_date": (datetime.now(timezone.utc) - timedelta(days=i*2)).isoformat(),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=180 + i*30)).isoformat(),
            "location": f"Raf-{i+1}-A",
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.inventory.insert_many(inventory_items)
    print(f"✅ Created {len(inventory_items)} inventory items")
    
    # Create incoming shipments
    print("🚚 Creating incoming shipments...")
    shipments = [
        {
            "id": str(uuid.uuid4()),
            "shipment_number": "SHP-2025-001",
            "expected_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "status": "expected",
            "products": [
                {
                    "product_id": products[0]["id"],
                    "expected_units": 240
                },
                {
                    "product_id": products[1]["id"],
                    "expected_units": 480
                }
            ],
            "notes": "Fabrikadan normal sevkiyat",
            "created_by": manager_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "shipment_number": "SHP-2025-002",
            "expected_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "status": "expected",
            "products": [
                {
                    "product_id": products[3]["id"],
                    "expected_units": 120
                }
            ],
            "notes": "Bal tedarikçisinden acil sevkiyat",
            "created_by": manager_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.incoming_shipments.insert_many(shipments)
    print(f"✅ Created {len(shipments)} incoming shipments")
    
    # Create orders
    print("🛒 Creating orders...")
    orders = [
        {
            "id": str(uuid.uuid4()),
            "order_number": f"ORD-{datetime.now().strftime('%Y%m%d')}-001",
            "customer_id": str(uuid.uuid4()),
            "channel_type": "logistics",
            "status": "pending",
            "products": [
                {
                    "product_id": products[0]["id"],
                    "units": 60,
                    "cases": 5,
                    "unit_price": 45.0,
                    "total_price": 2700.0
                }
            ],
            "total_amount": 2700.0,
            "notes": "Otel siparişi",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "order_number": f"ORD-{datetime.now().strftime('%Y%m%d')}-002",
            "customer_id": str(uuid.uuid4()),
            "channel_type": "dealer",
            "status": "approved",
            "products": [
                {
                    "product_id": products[1]["id"],
                    "units": 96,
                    "cases": 4,
                    "unit_price": 12.5,
                    "total_price": 1200.0
                }
            ],
            "total_amount": 1200.0,
            "notes": "Market siparişi",
            "approved_by": manager_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.orders.insert_many(orders)
    print(f"✅ Created {len(orders)} orders")
    
    # Create tasks
    print("📋 Creating tasks...")
    tasks = [
        {
            "id": str(uuid.uuid4()),
            "title": "Stok Sayımı - Yağlar Bölümü",
            "description": "Raf 1-A ve 1-B'deki tüm zeytinyağı ürünlerinin sayımını yapın",
            "assigned_to": staff_user["id"],
            "assigned_by": manager_user["id"],
            "status": "pending",
            "priority": "high",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Yarın Gelecek Sevkiyat Hazırlığı",
            "description": "SHP-2025-001 sevkiyatı için boş rafları hazırlayın",
            "assigned_to": staff_user["id"],
            "assigned_by": manager_user["id"],
            "status": "pending",
            "priority": "medium",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "SKT Kontrolü",
            "description": "Bu ay sonu dolacak ürünleri listeleyin",
            "assigned_to": staff_user["id"],
            "assigned_by": manager_user["id"],
            "status": "in_progress",
            "priority": "high",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.tasks.insert_many(tasks)
    print(f"✅ Created {len(tasks)} tasks")
    
    print("\n🎉 Database seeding completed successfully!")
    print("\n📝 Demo Accounts:")
    print("   Admin: admin / admin123")
    print("   Warehouse Manager: manager / manager123")
    print("   Warehouse Staff: staff / staff123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
