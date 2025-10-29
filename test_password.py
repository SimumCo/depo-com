from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv('/app/backend/.env')
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test_password():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    username = "satistemsilcisi"
    test_password = "satis123"
    
    print(f"🔐 Şifre Testi: {username}")
    print("-" * 50)
    
    user = await db.users.find_one({'username': username})
    
    if not user:
        print(f"❌ Kullanıcı bulunamadı: {username}")
        return
    
    print(f"✅ Kullanıcı bulundu: {user.get('full_name')}")
    print(f"   Rol: {user.get('role')}")
    print(f"   Aktif: {user.get('is_active')}")
    
    # Şifre testi
    stored_hash = user.get('password_hash')
    is_valid = pwd_context.verify(test_password, stored_hash)
    
    print(f"\n🔑 Şifre Doğrulama:")
    print(f"   Test Şifre: {test_password}")
    print(f"   Stored Hash: {stored_hash[:50]}...")
    print(f"   Sonuç: {'✅ DOĞRU' if is_valid else '❌ YANLIŞ'}")
    
    if not is_valid:
        print(f"\n⚠️  Şifre yanlış! Yeni şifre oluşturuluyor...")
        new_hash = pwd_context.hash(test_password)
        await db.users.update_one(
            {'username': username},
            {'$set': {'password_hash': new_hash}}
        )
        print(f"✅ Şifre güncellendi!")
        
        # Tekrar test
        is_valid_new = pwd_context.verify(test_password, new_hash)
        print(f"   Yeni test: {'✅ DOĞRU' if is_valid_new else '❌ YANLIŞ'}")
    
    client.close()

asyncio.run(test_password())
