import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_phase2_data():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Starting Phase 2 data seeding...")
    
    # Create Sales Representative
    print("👤 Creating Sales Representative...")
    sales_rep = {
        "id": str(uuid.uuid4()),
        "username": "salesrep",
        "password_hash": pwd_context.hash("salesrep123"),
        "email": "salesrep@dms.com",
        "full_name": "Ayşe Kaya",
        "role": "sales_rep",
        "channel_type": "dealer",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(sales_rep)
    print("✅ Sales rep created")
    
    # Create Customers
    print("👥 Creating Customers...")
    customers = [
        {
            "id": str(uuid.uuid4()),
            "username": "customer1",
            "password_hash": pwd_context.hash("customer123"),
            "email": "customer1@hotel.com",
            "full_name": "Grand Hotel İstanbul",
            "role": "customer",
            "customer_number": "CUST-2025-001",
            "channel_type": "logistics",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "customer2",
            "password_hash": pwd_context.hash("customer123"),
            "email": "customer2@market.com",
            "full_name": "Mega Market Zinciri",
            "role": "customer",
            "customer_number": "CUST-2025-002",
            "channel_type": "dealer",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "customer3",
            "password_hash": pwd_context.hash("customer123"),
            "email": "customer3@gov.tr",
            "full_name": "Milli Eğitim Bakanlığı",
            "role": "customer",
            "customer_number": "CUST-2025-003",
            "channel_type": "logistics",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.users.insert_many(customers)
    print(f"✅ Created {len(customers)} customers")
    
    # Create Customer Profiles
    print("📋 Creating Customer Profiles...")
    profiles = [
        {
            "id": str(uuid.uuid4()),
            "user_id": customers[0]["id"],
            "company_name": "Grand Hotel İstanbul A.Ş.",
            "phone": "0212 555 1234",
            "address": "Taksim Meydanı No:1",
            "city": "İstanbul",
            "tax_number": "1234567890",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": customers[1]["id"],
            "company_name": "Mega Market Perakende A.Ş.",
            "phone": "0216 555 5678",
            "address": "Bağdat Caddesi No:100",
            "city": "İstanbul",
            "tax_number": "9876543210",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": customers[2]["id"],
            "company_name": "Milli Eğitim Bakanlığı",
            "phone": "0312 555 9999",
            "address": "Atatürk Bulvarı",
            "city": "Ankara",
            "tax_number": "1111111111",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.customer_profiles.insert_many(profiles)
    print(f"✅ Created {len(profiles)} customer profiles")
    
    # Update product prices
    print("💰 Updating Product Prices...")
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    
    prices = {
        "ZYG-1000": {"logistics": 45.0, "dealer": 42.0},
        "SLC-720": {"logistics": 12.5, "dealer": 11.0},
        "MKR-500": {"logistics": 8.5, "dealer": 7.5},
        "BAL-1000": {"logistics": 85.0, "dealer": 80.0},
        "BKL-1000": {"logistics": 22.0, "dealer": 20.0},
    }
    
    for product in products:
        sku = product.get('sku')
        if sku in prices:
            await db.products.update_one(
                {"id": product['id']},
                {"$set": {
                    "logistics_price": prices[sku]["logistics"],
                    "dealer_price": prices[sku]["dealer"]
                }}
            )
    
    print(f"✅ Updated prices for {len(prices)} products")
    
    print("\n🎉 Phase 2 data seeding completed successfully!")
    print("\n📝 New Demo Accounts:")
    print("   Sales Rep: salesrep / salesrep123")
    print("   Customer 1 (Hotel - Logistics): customer1 / customer123")
    print("   Customer 2 (Market - Dealer): customer2 / customer123")
    print("   Customer 3 (Gov - Logistics): customer3 / customer123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_phase2_data())
