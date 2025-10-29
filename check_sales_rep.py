from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def check_users():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("📊 Veritabanındaki Kullanıcılar:")
    print("-" * 80)
    
    cursor = db.users.find({}, {'username': 1, 'role': 1, 'full_name': 1, 'is_active': 1, '_id': 0})
    users = await cursor.to_list(length=None)
    
    if not users:
        print("❌ Veritabanında kullanıcı bulunamadı!")
    else:
        for user in users:
            status = "✅" if user.get('is_active', True) else "❌"
            print(f"{status} {user.get('username'):25} | {user.get('role'):20} | {user.get('full_name')}")
    
    print("-" * 80)
    print(f"\n📈 Toplam: {len(users)} kullanıcı")
    
    # Satış temsilcisi kontrolü
    sales_rep = await db.users.find_one({'username': 'satistemsilcisi'})
    print("\n🔍 Satış Temsilcisi Detayı:")
    if sales_rep:
        print(f"   Kullanıcı Adı: {sales_rep.get('username')}")
        print(f"   Rol: {sales_rep.get('role')}")
        print(f"   Ad Soyad: {sales_rep.get('full_name')}")
        print(f"   Email: {sales_rep.get('email')}")
        print(f"   Aktif: {sales_rep.get('is_active')}")
        print(f"   Şifre Hash: {sales_rep.get('password_hash')[:50]}...")
    else:
        print("   ❌ Satış temsilcisi bulunamadı!")
    
    client.close()

asyncio.run(check_users())
