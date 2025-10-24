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

async def seed_accounting_users():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Adding Accounting & Sales Agent users...")
    
    # Create Accounting user
    print("👤 Creating Accounting user...")
    accounting_user = {
        "id": str(uuid.uuid4()),
        "username": "muhasebe",
        "password_hash": pwd_context.hash("muhasebe123"),
        "email": "muhasebe@dms.com",
        "full_name": "Zeynep Accounting",
        "role": "accounting",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if already exists
    existing = await db.users.find_one({"username": "muhasebe"})
    if existing:
        print("⚠️  Muhasebe user already exists, updating...")
        await db.users.update_one(
            {"username": "muhasebe"},
            {"$set": accounting_user}
        )
    else:
        await db.users.insert_one(accounting_user)
    print("✅ Accounting user created/updated")
    
    # Create Sales Agent (Plasiyer) user
    print("👤 Creating Sales Agent (Plasiyer) user...")
    sales_agent_user = {
        "id": str(uuid.uuid4()),
        "username": "plasiyer",
        "password_hash": pwd_context.hash("plasiyer123"),
        "email": "plasiyer@dms.com",
        "full_name": "Burak Plasiyer",
        "role": "sales_agent",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if already exists
    existing = await db.users.find_one({"username": "plasiyer"})
    if existing:
        print("⚠️  Plasiyer user already exists, updating...")
        await db.users.update_one(
            {"username": "plasiyer"},
            {"$set": sales_agent_user}
        )
    else:
        await db.users.insert_one(sales_agent_user)
    print("✅ Sales Agent user created/updated")
    
    print("\n🎉 Users created successfully!")
    print("\n📝 New Demo Accounts:")
    print("   Muhasebe: muhasebe / muhasebe123")
    print("   Plasiyer: plasiyer / plasiyer123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_accounting_users())
