"""
Database Seed Script
====================
Veritabanını test verileri ile doldurur.

Kullanım:
    python scripts/seed_database.py

Not: Mevcut verileri silmez, sadece yeni veriler ekler.
     Tüm verileri silip baştan başlamak için --reset flag'i kullanın.
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from utils.auth import hash_password

# Load environment variables
load_dotenv(Path(__file__).parent.parent / '.env')

# MongoDB connection
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# Seed Data
USERS_SEED = [
    # Admin
    {
        "id": "admin001",
        "username": "admin",
        "password_hash": hash_password("admin123"),
        "full_name": "Sistem Yöneticisi",
        "email": "admin@example.com",
        "phone": "0312 111 11 11",
        "role": "admin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    # Muhasebe
    {
        "id": "acc001",
        "username": "muhasebe",
        "password_hash": hash_password("muhasebe123"),
        "full_name": "Muhasebe Departmanı",
        "email": "muhasebe@example.com",
        "phone": "0312 222 22 22",
        "role": "accounting",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    # Plasiyerler
    {
        "id": "sales001",
        "username": "plasiyer1",
        "password_hash": hash_password("plasiyer123"),
        "full_name": "Ahmet Yılmaz",
        "email": "ahmet@example.com",
        "phone": "0532 111 11 11",
        "role": "sales_rep",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "sales002",
        "username": "plasiyer2",
        "password_hash": hash_password("plasiyer123"),
        "full_name": "Mehmet Kaya",
        "email": "mehmet@example.com",
        "phone": "0532 222 22 22",
        "role": "sales_rep",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    # Müşteriler
    {
        "id": "cust001",
        "username": "musteri1",
        "password_hash": hash_password("musteri123"),
        "full_name": "ABC Gıda San. ve Tic. Ltd. Şti.",
        "email": "abc@example.com",
        "phone": "0312 333 33 33",
        "role": "customer",
        "customer_number": "1111111111",
        "channel_type": "dealer",
        "address": "Ankara, Çankaya",
        "delivery_day": "Monday",
        "assigned_sales_rep": "sales001",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "cust002",
        "username": "musteri2",
        "password_hash": hash_password("musteri123"),
        "full_name": "XYZ Market Zinciri A.Ş.",
        "email": "xyz@example.com",
        "phone": "0312 444 44 44",
        "role": "customer",
        "customer_number": "2222222222",
        "channel_type": "traditional",
        "address": "İstanbul, Kadıköy",
        "delivery_day": "Tuesday",
        "assigned_sales_rep": "sales001",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
]

PRODUCTS_SEED = [
    # Yoğurt Kategorisi
    {
        "id": "prod001",
        "name": "SÜZME YOĞURT 10 KG",
        "sku": "151",
        "category": "Yoğurt",
        "weight": 10.0,
        "units_per_case": 1,
        "logistics_price": 900.0,
        "dealer_price": 1000.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod002",
        "name": "YARIM YAĞLI YOĞURT 10 KG",
        "sku": "152",
        "category": "Yoğurt",
        "weight": 10.0,
        "units_per_case": 1,
        "logistics_price": 850.0,
        "dealer_price": 950.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    # Peynir Kategorisi
    {
        "id": "prod003",
        "name": "KÖY PEYNİRİ 4 KG",
        "sku": "201",
        "category": "Peynir",
        "weight": 4.0,
        "units_per_case": 1,
        "logistics_price": 1200.0,
        "dealer_price": 1350.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "prod004",
        "name": "TAZE KAŞAR 2 KG",
        "sku": "202",
        "category": "Kaşar",
        "weight": 2.0,
        "units_per_case": 1,
        "logistics_price": 600.0,
        "dealer_price": 700.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    # Ayran
    {
        "id": "prod005",
        "name": "AYRAN 200 ML",
        "sku": "301",
        "category": "Ayran",
        "weight": 0.2,
        "units_per_case": 24,
        "logistics_price": 4.0,
        "dealer_price": 5.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    # Süt
    {
        "id": "prod006",
        "name": "YARIM YAĞLI SÜT 10 LT",
        "sku": "401",
        "category": "Süt",
        "weight": 10.0,
        "units_per_case": 1,
        "logistics_price": 180.0,
        "dealer_price": 200.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    # Tereyağı
    {
        "id": "prod007",
        "name": "VAKUMLU TEREYAĞ 500 GR",
        "sku": "501",
        "category": "Tereyağı",
        "weight": 0.5,
        "units_per_case": 20,
        "logistics_price": 150.0,
        "dealer_price": 180.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    # Krema
    {
        "id": "prod008",
        "name": "PİŞİRMELİK KREMA 1000 ML",
        "sku": "601",
        "category": "Krema",
        "weight": 1.0,
        "units_per_case": 12,
        "logistics_price": 45.0,
        "dealer_price": 55.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
]

async def seed_database(reset=False):
    """Veritabanını seed verilerle doldurur"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"🔌 MongoDB'ye bağlanıldı: {DB_NAME}")
    
    if reset:
        print("⚠️  RESET MODE: Tüm veriler silinecek!")
        confirm = input("Devam etmek istediğinize emin misiniz? (yes/no): ")
        if confirm.lower() != 'yes':
            print("❌ İşlem iptal edildi")
            return
        
        # Tüm collection'ları temizle
        await db.users.delete_many({})
        await db.products.delete_many({})
        await db.invoices.delete_many({})
        print("🗑️  Tüm veriler silindi")
    
    # Users
    print("\n👥 Kullanıcılar ekleniyor...")
    existing_usernames = set()
    async for user in db.users.find({}, {"username": 1}):
        existing_usernames.add(user["username"])
    
    users_added = 0
    for user in USERS_SEED:
        if user["username"] not in existing_usernames:
            await db.users.insert_one(user)
            users_added += 1
            print(f"  ✅ {user['username']} ({user['role']})")
        else:
            print(f"  ⏭️  {user['username']} (zaten mevcut)")
    
    print(f"✨ {users_added} yeni kullanıcı eklendi")
    
    # Products
    print("\n📦 Ürünler ekleniyor...")
    existing_skus = set()
    async for product in db.products.find({}, {"sku": 1}):
        existing_skus.add(product["sku"])
    
    products_added = 0
    for product in PRODUCTS_SEED:
        if product["sku"] not in existing_skus:
            await db.products.insert_one(product)
            products_added += 1
            print(f"  ✅ {product['name']} ({product['category']})")
        else:
            print(f"  ⏭️  {product['name']} (zaten mevcut)")
    
    print(f"✨ {products_added} yeni ürün eklendi")
    
    # Summary
    print("\n" + "="*50)
    print("🎉 DATABASE SEED TAMAMLANDI!")
    print("="*50)
    print(f"👥 Toplam Kullanıcı: {await db.users.count_documents({})}")
    print(f"📦 Toplam Ürün: {await db.products.count_documents({})}")
    print(f"📄 Toplam Fatura: {await db.invoices.count_documents({})}")
    print("\n📋 Test Hesapları:")
    print("  • Admin: admin / admin123")
    print("  • Muhasebe: muhasebe / muhasebe123")
    print("  • Plasiyer: plasiyer1 / plasiyer123")
    print("  • Müşteri: musteri1 / musteri123")
    print("="*50)
    
    client.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Database Seed Script')
    parser.add_argument('--reset', action='store_true', help='Tüm verileri sil ve baştan başla')
    args = parser.parse_args()
    
    asyncio.run(seed_database(reset=args.reset))
