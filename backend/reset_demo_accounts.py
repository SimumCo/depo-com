import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from passlib.context import CryptContext
from datetime import datetime, timezone
import uuid

load_dotenv()
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

async def reset_demo_accounts():
    print("🔐 Demo Hesapları Güncelleniyor...\n")
    
    demo_accounts = [
        # Admin
        {"username": "admin", "password": "admin123", "role": "admin", "full_name": "Admin"},
        
        # Warehouse
        {"username": "manager", "password": "manager123", "role": "warehouse_manager", "full_name": "Warehouse Manager"},
        {"username": "staff", "password": "staff123", "role": "warehouse_staff", "full_name": "Warehouse Staff"},
        
        # Sales Rep
        {"username": "satistemsilcisi", "password": "satis123", "role": "sales_rep", "full_name": "Satış Temsilcisi"},
        
        # Sales Agents (Plasiyer)
        {"username": "plasiyer1", "password": "plasiyer123", "role": "sales_agent", "full_name": "Plasiyer 1"},
        {"username": "plasiyer2", "password": "plasiyer123", "role": "sales_agent", "full_name": "Plasiyer 2"},
        {"username": "plasiyer3", "password": "plasiyer123", "role": "sales_agent", "full_name": "Plasiyer 3"},
        
        # Customers
        {"username": "musteri1", "password": "musteri123", "role": "customer", "full_name": "Müşteri 1"},
        {"username": "musteri2", "password": "musteri123", "role": "customer", "full_name": "Müşteri 2"},
        {"username": "musteri3", "password": "musteri123", "role": "customer", "full_name": "Müşteri 3"},
    ]
    
    print("=" * 80)
    print("DEMO HESAPLARI")
    print("=" * 80)
    
    for account in demo_accounts:
        user = await db.users.find_one({"username": account["username"]})
        
        if user:
            # Update existing user
            await db.users.update_one(
                {"username": account["username"]},
                {"$set": {
                    "password_hash": pwd_context.hash(account["password"]),
                    "is_active": True
                }}
            )
            print(f"✅ Güncellendi: {account['username']:20} | {account['password']:15} | {account['role']:20}")
        else:
            # Create new user
            new_user = {
                "id": str(uuid.uuid4()),
                "username": account["username"],
                "password_hash": pwd_context.hash(account["password"]),
                "email": f"{account['username']}@example.com",
                "full_name": account["full_name"],
                "role": account["role"],
                "customer_number": None if account["role"] != "customer" else f"CUST-{account['username'][-1]:04}",
                "channel_type": None if account["role"] != "customer" else "dealer",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            print(f"✅ Oluşturuldu: {account['username']:20} | {account['password']:15} | {account['role']:20}")
    
    print("=" * 80)
    print("\n📋 GİRİŞ BİLGİLERİ:")
    print("=" * 80)
    
    print("\n🔧 YÖNETİM:")
    print("  Admin:              admin / admin123")
    print("  Warehouse Manager:  manager / manager123")
    print("  Warehouse Staff:    staff / staff123")
    
    print("\n👔 SAHA:")
    print("  Satış Temsilcisi:   satistemsilcisi / satis123")
    print("  Plasiyer 1:         plasiyer1 / plasiyer123")
    print("  Plasiyer 2:         plasiyer2 / plasiyer123")
    print("  Plasiyer 3:         plasiyer3 / plasiyer123")
    
    print("\n👥 MÜŞTERİLER:")
    print("  Müşteri 1:          musteri1 / musteri123")
    print("  Müşteri 2:          musteri2 / musteri123")
    print("  Müşteri 3:          musteri3 / musteri123")
    
    print("\n" + "=" * 80)
    print("✅ Tüm hesaplar hazır!")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(reset_demo_accounts())
    client.close()
