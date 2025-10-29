"""
Demo Kullanıcıları MongoDB'ye Import Etme Script
Kullanım: python import_demo_users.py
"""

from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from dotenv import load_dotenv
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
import json

load_dotenv('/app/backend/.env')
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Demo kullanıcılar
DEMO_USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "email": "admin@example.com",
        "full_name": "Admin Yönetici",
        "role": "admin",
        "customer_number": None,
        "channel_type": None
    },
    {
        "username": "manager",
        "password": "manager123",
        "email": "manager@example.com",
        "full_name": "Ahmet Yılmaz",
        "role": "warehouse_manager",
        "customer_number": None,
        "channel_type": None
    },
    {
        "username": "staff",
        "password": "staff123",
        "email": "staff@example.com",
        "full_name": "Mehmet Demir",
        "role": "warehouse_staff",
        "customer_number": None,
        "channel_type": None
    },
    {
        "username": "satistemsilcisi",
        "password": "satis123",
        "email": "satis@example.com",
        "full_name": "Satış Temsilcisi",
        "role": "sales_rep",
        "customer_number": None,
        "channel_type": None
    },
    {
        "username": "muhasebe",
        "password": "muhasebe123",
        "email": "muhasebe@example.com",
        "full_name": "Zeynep Accounting",
        "role": "accounting",
        "customer_number": None,
        "channel_type": None
    },
    {
        "username": "plasiyer1",
        "password": "plasiyer123",
        "email": "plasiyer1@example.com",
        "full_name": "Plasiyer 1",
        "role": "sales_agent",
        "customer_number": None,
        "channel_type": None
    },
    {
        "username": "plasiyer2",
        "password": "plasiyer123",
        "email": "plasiyer2@example.com",
        "full_name": "Plasiyer 2",
        "role": "sales_agent",
        "customer_number": None,
        "channel_type": None
    },
    {
        "username": "musteri1",
        "password": "musteri123",
        "email": "musteri1@example.com",
        "full_name": "Müşteri 1",
        "role": "customer",
        "customer_number": "1234567890",
        "channel_type": "dealer"
    },
    {
        "username": "musteri2",
        "password": "musteri123",
        "email": "musteri2@example.com",
        "full_name": "Müşteri 2",
        "role": "customer",
        "customer_number": "1234567891",
        "channel_type": "logistics"
    },
    {
        "username": "musteri3",
        "password": "musteri123",
        "email": "musteri3@example.com",
        "full_name": "Müşteri 3",
        "role": "customer",
        "customer_number": "1234567892",
        "channel_type": "dealer"
    }
]

async def import_users():
    """Demo kullanıcıları veritabanına ekle"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("🚀 Demo kullanıcılar import ediliyor...")
    print(f"📊 Toplam {len(DEMO_USERS)} kullanıcı")
    print("-" * 50)
    
    created_count = 0
    updated_count = 0
    skipped_count = 0
    
    for user_data in DEMO_USERS:
        username = user_data["username"]
        
        # Mevcut kullanıcı kontrolü
        existing = await db.users.find_one({"username": username})
        
        # Kullanıcı oluştur
        user_doc = {
            "id": str(uuid.uuid4()) if not existing else existing["id"],
            "username": user_data["username"],
            "password_hash": pwd_context.hash(user_data["password"]),
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "role": user_data["role"],
            "customer_number": user_data["customer_number"],
            "channel_type": user_data["channel_type"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            # Güncelle (şifre dahil)
            await db.users.update_one(
                {"username": username},
                {"$set": user_doc}
            )
            print(f"✅ Güncellendi: {username} ({user_data['role']})")
            updated_count += 1
        else:
            # Yeni ekle
            await db.users.insert_one(user_doc)
            print(f"✅ Oluşturuldu: {username} ({user_data['role']})")
            created_count += 1
    
    print("-" * 50)
    print(f"\n📈 Özet:")
    print(f"   ✅ Yeni oluşturulan: {created_count}")
    print(f"   🔄 Güncellenen: {updated_count}")
    print(f"   ⏭️  Atlanan: {skipped_count}")
    print(f"\n🎉 İşlem tamamlandı!")
    print("\n📋 Demo Hesaplar:")
    print("-" * 50)
    for user in DEMO_USERS:
        print(f"   {user['role']:20} | {user['username']:20} | {user['password']}")
    
    client.close()

async def export_to_json():
    """Kullanıcıları JSON dosyasına export et"""
    users_json = []
    
    for user_data in DEMO_USERS:
        user_json = {
            "id": str(uuid.uuid4()),
            "username": user_data["username"],
            "password_hash": pwd_context.hash(user_data["password"]),
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "role": user_data["role"],
            "customer_number": user_data["customer_number"],
            "channel_type": user_data["channel_type"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        users_json.append(user_json)
    
    # JSON dosyasına yaz
    with open('/app/demo_users.json', 'w', encoding='utf-8') as f:
        json.dump(users_json, f, indent=2, ensure_ascii=False)
    
    print("\n📄 JSON export tamamlandı: /app/demo_users.json")
    print("   MongoDB'ye import için:")
    print("   mongoimport --db distribution_db --collection users --file /app/demo_users.json --jsonArray")

if __name__ == "__main__":
    print("=" * 50)
    print("  DEMO KULLANICILAR IMPORT TOOL")
    print("=" * 50)
    print()
    
    # Import işlemini çalıştır
    asyncio.run(import_users())
    
    # JSON export
    asyncio.run(export_to_json())
