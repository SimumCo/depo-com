"""
Minimal Database Setup
======================
Admin ve muhasebe kullanıcılarını oluşturur.

Kullanım:
    python scripts/seed_database.py
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import sys

# .env yükleme
try:
    from dotenv import load_dotenv
    load_dotenv('backend/.env')
except:
    pass

def hash_password(password: str) -> str:
    """Password hash using bcrypt"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)

async def setup_users():
    """Admin ve muhasebe kullanıcılarını oluştur"""
    
    # MongoDB bağlantısı
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'distribution_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"🔌 MongoDB: {db_name}")
    
    # Admin oluştur
    print("\n👤 Admin kullanıcısı kontrol ediliyor...")
    existing_admin = await db.users.find_one({"username": "admin"})
    
    if existing_admin:
        print("⚠️  Admin kullanıcısı zaten mevcut")
    else:
        admin_user = {
            "id": "admin001",
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "full_name": "Sistem Yöneticisi",
            "email": "admin@example.com",
            "phone": "",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(admin_user)
        print("✅ Admin kullanıcısı oluşturuldu")
        print("   Kullanıcı Adı: admin")
        print("   Şifre: admin123")
    
    # Muhasebe oluştur
    print("\n💼 Muhasebe kullanıcısı kontrol ediliyor...")
    existing_muhasebe = await db.users.find_one({"username": "muhasebe"})
    
    if existing_muhasebe:
        print("⚠️  Muhasebe kullanıcısı zaten mevcut")
    else:
        muhasebe_user = {
            "id": "muhasebe001",
            "username": "muhasebe",
            "password_hash": hash_password("muhasebe123"),
            "full_name": "Muhasebe Personeli",
            "email": "muhasebe@example.com",
            "phone": "",
            "role": "accounting",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(muhasebe_user)
        print("✅ Muhasebe kullanıcısı oluşturuldu")
        print("   Kullanıcı Adı: muhasebe")
        print("   Şifre: muhasebe123")
    
    client.close()
    print("\n✨ Kurulum tamamlandı!")
    print("\n📝 Oluşturulan Hesaplar:")
    print("   Admin: admin / admin123")
    print("   Muhasebe: muhasebe / muhasebe123")

if __name__ == "__main__":
    asyncio.run(setup_users())
