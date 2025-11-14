"""
Veritabanı Temizleme Script'i
Sadece admin, muhasebe ve plasiyer1 kullanıcılarını korur, diğer tüm kullanıcıları siler
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# .env dosyasını yükle
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB bağlantısı
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def cleanup_users():
    """Veritabanındaki kullanıcıları temizle"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("VERİTABANI TEMİZLEME BAŞLIYOR")
    print("=" * 60)
    
    # Mevcut kullanıcı sayısı
    total_users_before = await db.users.count_documents({})
    print(f"\n📊 Toplam kullanıcı sayısı: {total_users_before}")
    
    # Korunacak kullanıcılar
    keep_usernames = ['admin', 'muhasebe', 'plasiyer1']
    
    print(f"\n✅ Korunacak kullanıcılar: {', '.join(keep_usernames)}")
    
    # Korunacak kullanıcıları kontrol et
    for username in keep_usernames:
        user = await db.users.find_one({"username": username})
        if user:
            print(f"   ✓ {username} - bulundu")
        else:
            print(f"   ✗ {username} - BULUNAMADI!")
    
    # Silinecek kullanıcıları listele
    users_to_delete = await db.users.find(
        {"username": {"$nin": keep_usernames}},
        {"username": 1, "role": 1}
    ).to_list(length=1000)
    
    print(f"\n❌ Silinecek kullanıcı sayısı: {len(users_to_delete)}")
    
    if users_to_delete:
        print("\nSilinecek kullanıcılar:")
        for user in users_to_delete[:20]:  # İlk 20'sini göster
            print(f"   - {user.get('username', 'N/A')} ({user.get('role', 'N/A')})")
        
        if len(users_to_delete) > 20:
            print(f"   ... ve {len(users_to_delete) - 20} kullanıcı daha")
    
    # Otomatik onay (script parametresi ile kontrol edilecek)
    print("\n" + "=" * 60)
    print("⚠️  DİKKAT: BU İŞLEM GERİ DÖNDÜRÜLEMEZ!")
    print("=" * 60)
    print("\n🔄 Silme işlemi başlatılıyor...")
    
    # Kullanıcıları sil
    result = await db.users.delete_many(
        {"username": {"$nin": keep_usernames}}
    )
    
    print(f"\n✅ {result.deleted_count} kullanıcı silindi")
    
    # Son durum
    total_users_after = await db.users.count_documents({})
    print(f"📊 Kalan kullanıcı sayısı: {total_users_after}")
    
    # Kalan kullanıcıları listele
    remaining_users = await db.users.find({}, {"username": 1, "role": 1, "is_active": 1}).to_list(length=100)
    
    print("\n✅ Kalan kullanıcılar:")
    for user in remaining_users:
        status = "Aktif" if user.get('is_active', True) else "Pasif"
        print(f"   - {user.get('username', 'N/A')} ({user.get('role', 'N/A')}) - {status}")
    
    print("\n" + "=" * 60)
    print("✅ TEMİZLEME TAMAMLANDI!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_users())
