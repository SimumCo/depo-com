"""
Minimal Database Setup
======================
Sadece admin kullanıcısı oluşturur.

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
    """Basit password hash (production'da bcrypt kullanın)"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

async def setup_admin():
    """Admin kullanıcısı oluştur"""
    
    # MongoDB bağlantısı
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'distribution_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"🔌 MongoDB: {db_name}")
    
    # Admin var mı kontrol et
    existing_admin = await db.users.find_one({"username": "admin"})
    
    if existing_admin:
        print("⚠️  Admin kullanıcısı zaten mevcut")
    else:
        # Admin oluştur
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
    
    client.close()
    print("\n✨ Kurulum tamamlandı!")

if __name__ == "__main__":
    asyncio.run(setup_admin())
