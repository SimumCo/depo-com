import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

async def seed_warehouses():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.distribution_db
    
    # Clear existing warehouses
    await db.warehouses.delete_many({})
    print("Cleared existing warehouses")
    
    # 7 warehouses in different cities
    warehouses = [
        {
            "id": str(uuid.uuid4()),
            "name": "İstanbul Merkez Depo",
            "location": "İstanbul",
            "address": "İkitelli OSB, Atatürk Bulvarı No:123, İstanbul",
            "manager_name": "Ahmet Yılmaz",
            "capacity": 50000,
            "current_stock": 35000,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Ankara Depo",
            "location": "Ankara",
            "address": "Sincan OSB, İvedik Cad. No:45, Ankara",
            "manager_name": "Mehmet Kaya",
            "capacity": 35000,
            "current_stock": 28000,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "İzmir Depo",
            "location": "İzmir",
            "address": "Kemalpaşa OSB, Ege Cad. No:67, İzmir",
            "manager_name": "Ayşe Demir",
            "capacity": 40000,
            "current_stock": 32000,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bursa Depo",
            "location": "Bursa",
            "address": "Hasanağa OSB, Nilüfer Yolu No:89, Bursa",
            "manager_name": "Fatma Şahin",
            "capacity": 30000,
            "current_stock": 22000,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Antalya Depo",
            "location": "Antalya",
            "address": "Organize Sanayi, Akdeniz Bulvarı No:234, Antalya",
            "manager_name": "Hasan Özdemir",
            "capacity": 25000,
            "current_stock": 18000,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Adana Depo",
            "location": "Adana",
            "address": "Hacı Sabancı OSB, Seyhan Yolu No:156, Adana",
            "manager_name": "Zeynep Arslan",
            "capacity": 28000,
            "current_stock": 20000,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Gaziantep Depo",
            "location": "Gaziantep",
            "address": "5. OSB, Fıstık Yolu No:78, Gaziantep",
            "manager_name": "Mustafa Çelik",
            "capacity": 22000,
            "current_stock": 16000,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # Insert warehouses
    result = await db.warehouses.insert_many(warehouses)
    print(f"✅ Created {len(result.inserted_ids)} warehouses")
    
    # Print summary
    print("\n📦 Warehouse Summary:")
    for warehouse in warehouses:
        capacity_usage = (warehouse['current_stock'] / warehouse['capacity'] * 100)
        print(f"  - {warehouse['name']}: {warehouse['current_stock']:,}/{warehouse['capacity']:,} units ({capacity_usage:.1f}% full)")
    
    # Update inventory items to assign to warehouses
    print("\n🔄 Assigning inventory to warehouses...")
    
    # Get all inventory items
    inventory_items = await db.inventory.find({}).to_list(1000)
    
    if inventory_items:
        # Distribute inventory across warehouses
        for i, item in enumerate(inventory_items):
            warehouse = warehouses[i % len(warehouses)]  # Round-robin distribution
            await db.inventory.update_one(
                {"id": item['id']},
                {"$set": {"warehouse_id": warehouse['id']}}
            )
        
        print(f"✅ Assigned {len(inventory_items)} inventory items to warehouses")
    else:
        print("⚠️ No inventory items found to assign")
    
    client.close()
    print("\n✨ Warehouse seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_warehouses())
