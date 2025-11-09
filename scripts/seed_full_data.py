"""
Full Database Seed Script
==========================
Admin, Muhasebe, Müşteri, Faturalar ve Ürünlerle tam veri seti oluşturur.

Kullanım:
    python scripts/seed_full_data.py
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import random

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Password hash using bcrypt"""
    return pwd_context.hash(password)

async def seed_full_database():
    """Tam veri seti ile veritabanını doldur"""
    
    # MongoDB bağlantısı
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'distribution_management')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 FULL DATABASE SEED BAŞLIYOR...\n")
    print(f"🔌 MongoDB: {db_name}\n")
    
    # ===========================================
    # 1. KULLANICILAR
    # ===========================================
    print("=" * 50)
    print("1️⃣  KULLANICILAR OLUŞTURULUYOR")
    print("=" * 50)
    
    # Temizle
    await db.users.delete_many({})
    
    # Admin
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
    print("✅ Admin oluşturuldu: admin / admin123")
    
    # Muhasebe
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
    print("✅ Muhasebe oluşturuldu: muhasebe / muhasebe123")
    
    # Müşteriler
    customers = [
        {
            "id": "910780",
            "username": "ailem_market_910780",
            "password_hash": hash_password("musteri910780"),
            "full_name": "AİLEM MARKET",
            "email": "ailem@example.com",
            "phone": "0555 111 2233",
            "role": "customer",
            "customer_number": "32032404952",
            "channel_type": "dealer",
            "address": "EMEK MAH 3044 SOK NO:29 MANAVGAT/ANTALYA 07000",
            "is_active": True
        },
        {
            "id": "910781",
            "username": "yildiz_market_910781",
            "password_hash": hash_password("musteri910781"),
            "full_name": "YILDIZ MARKET",
            "email": "yildiz@example.com",
            "phone": "0555 222 3344",
            "role": "customer",
            "customer_number": "12345678901",
            "channel_type": "dealer",
            "address": "MERKEZ MAH ATATÜRK CAD NO:45 ANKARA",
            "is_active": True
        },
        {
            "id": "910782",
            "username": "gunes_gida_910782",
            "password_hash": hash_password("musteri910782"),
            "full_name": "GÜNEŞ GIDA",
            "email": "gunes@example.com",
            "phone": "0555 333 4455",
            "role": "customer",
            "customer_number": "98765432109",
            "channel_type": "dealer",
            "address": "YENİ MAH ZÜBEYDE HANIM SOK NO:12 İZMİR",
            "is_active": True
        }
    ]
    
    await db.users.insert_many(customers)
    print(f"✅ {len(customers)} müşteri oluşturuldu")
    for c in customers:
        print(f"   - {c['full_name']}: {c['username']} / musteri{c['id']}")
    
    # ===========================================
    # 2. ÜRÜNLER
    # ===========================================
    print("\n" + "=" * 50)
    print("2️⃣  ÜRÜNLER OLUŞTURULUYOR")
    print("=" * 50)
    
    await db.products.delete_many({})
    
    products = [
        # Süt
        {"id": "prod_1", "code": "SUT001", "name": "Tam Yağlı Süt 1L", "category": "Süt", "unit": "ADET", "price": 25.50},
        {"id": "prod_2", "code": "SUT002", "name": "Yarım Yağlı Süt 1L", "category": "Süt", "unit": "ADET", "price": 23.00},
        {"id": "prod_3", "code": "SUT003", "name": "Light Süt 1L", "category": "Süt", "unit": "ADET", "price": 24.00},
        {"id": "prod_4", "code": "SUT004", "name": "180 ml ÇİLEKLİ UHT SÜT", "category": "Süt", "unit": "ADET", "price": 8.50},
        
        # Yoğurt
        {"id": "prod_5", "code": "YOG001", "name": "Süzme Yoğurt 500g", "category": "Yoğurt", "unit": "ADET", "price": 18.50},
        {"id": "prod_6", "code": "YOG002", "name": "Tam Yağlı Yoğurt 1kg", "category": "Yoğurt", "unit": "ADET", "price": 28.00},
        {"id": "prod_7", "code": "YOG003", "name": "750 GR T.YAGLI YOGURT", "category": "Yoğurt", "unit": "ADET", "price": 22.00},
        
        # Ayran
        {"id": "prod_8", "code": "AYR001", "name": "170 ML AYRAN", "category": "Ayran", "unit": "ADET", "price": 5.00},
        {"id": "prod_9", "code": "AYR002", "name": "200 ML AYRAN", "category": "Ayran", "unit": "ADET", "price": 5.50},
        {"id": "prod_10", "code": "AYR003", "name": "1000 ml AYRAN", "category": "Ayran", "unit": "ADET", "price": 18.00},
        
        # Peynir
        {"id": "prod_11", "code": "PEY001", "name": "Beyaz Peynir 500g", "category": "Peynir", "unit": "ADET", "price": 65.00},
        {"id": "prod_12", "code": "PEY002", "name": "Ezine Peyniri 500g", "category": "Peynir", "unit": "ADET", "price": 85.00},
        {"id": "prod_13", "code": "PEY003", "name": "250 GR SÜZME PEYNIR", "category": "Peynir", "unit": "ADET", "price": 45.00},
        
        # Kaşar
        {"id": "prod_14", "code": "KAS001", "name": "Taze Kaşar 400g", "category": "Kaşar", "unit": "ADET", "price": 95.00},
        {"id": "prod_15", "code": "KAS002", "name": "600 GR KASAR PEYNIRI", "category": "Kaşar", "unit": "ADET", "price": 120.00},
        
        # Tereyağı
        {"id": "prod_16", "code": "TER001", "name": "Tereyağı 250g", "category": "Tereyağı", "unit": "ADET", "price": 75.00},
        
        # Krema
        {"id": "prod_17", "code": "KRE001", "name": "200 ml UHT ÇIRPMA KREMA", "category": "Krema", "unit": "ADET", "price": 22.00},
        {"id": "prod_18", "code": "KRE002", "name": "Şefin Kreması 500ml", "category": "Krema", "unit": "ADET", "price": 45.00}
    ]
    
    await db.products.insert_many(products)
    print(f"✅ {len(products)} ürün oluşturuldu")
    
    # Kategori sayıları
    categories = {}
    for p in products:
        cat = p['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    for cat, count in categories.items():
        print(f"   📦 {cat}: {count} ürün")
    
    # ===========================================
    # 3. FATURALAR
    # ===========================================
    print("\n" + "=" * 50)
    print("3️⃣  FATURALAR OLUŞTURULUYOR")
    print("=" * 50)
    
    await db.invoices.delete_many({})
    
    invoices = [
        # AİLEM MARKET faturaları
        {
            "invoice_id": "inv_001",
            "invoice_number": "FAT2024001",
            "invoice_date": "2024-10-01",
            "customer_name": "AİLEM MARKET",
            "customer_tax_id": "32032404952",
            "customer_address": "EMEK MAH 3044 SOK NO:29 MANAVGAT/ANTALYA",
            "products": [
                {"product_code": "SUT001", "product_name": "Tam Yağlı Süt 1L", "category": "Süt", "quantity": "30", "unit": "ADET", "unit_price": "25.50", "total": "765.00"},
                {"product_code": "YOG001", "product_name": "Süzme Yoğurt 500g", "category": "Yoğurt", "quantity": "20", "unit": "ADET", "unit_price": "18.50", "total": "370.00"},
                {"product_code": "AYR002", "product_name": "200 ML AYRAN", "category": "Ayran", "quantity": "50", "unit": "ADET", "unit_price": "5.50", "total": "275.00"}
            ],
            "subtotal": "1410.00",
            "total_discount": "0",
            "total_tax": "14.10",
            "grand_total": "1424.10",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "invoice_id": "inv_002",
            "invoice_number": "FAT2024002",
            "invoice_date": "2024-10-08",
            "customer_name": "AİLEM MARKET",
            "customer_tax_id": "32032404952",
            "customer_address": "EMEK MAH 3044 SOK NO:29 MANAVGAT/ANTALYA",
            "products": [
                {"product_code": "AYR002", "product_name": "200 ML AYRAN", "category": "Ayran", "quantity": "100", "unit": "ADET", "unit_price": "5.50", "total": "550.00"},
                {"product_code": "PEY001", "product_name": "Beyaz Peynir 500g", "category": "Peynir", "quantity": "15", "unit": "ADET", "unit_price": "65.00", "total": "975.00"}
            ],
            "subtotal": "1525.00",
            "total_discount": "0",
            "total_tax": "15.25",
            "grand_total": "1540.25",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "invoice_id": "inv_003",
            "invoice_number": "FAT2024003",
            "invoice_date": "2024-10-15",
            "customer_name": "AİLEM MARKET",
            "customer_tax_id": "32032404952",
            "customer_address": "EMEK MAH 3044 SOK NO:29 MANAVGAT/ANTALYA",
            "products": [
                {"product_code": "KAS001", "product_name": "Taze Kaşar 400g", "category": "Kaşar", "quantity": "10", "unit": "ADET", "unit_price": "95.00", "total": "950.00"},
                {"product_code": "TER001", "product_name": "Tereyağı 250g", "category": "Tereyağı", "quantity": "8", "unit": "ADET", "unit_price": "75.00", "total": "600.00"}
            ],
            "subtotal": "1550.00",
            "total_discount": "0",
            "total_tax": "15.50",
            "grand_total": "1565.50",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # YILDIZ MARKET faturaları
        {
            "invoice_id": "inv_004",
            "invoice_number": "FAT2024004",
            "invoice_date": "2024-10-05",
            "customer_name": "YILDIZ MARKET",
            "customer_tax_id": "12345678901",
            "customer_address": "MERKEZ MAH ATATÜRK CAD NO:45 ANKARA",
            "products": [
                {"product_code": "SUT002", "product_name": "Yarım Yağlı Süt 1L", "category": "Süt", "quantity": "40", "unit": "ADET", "unit_price": "23.00", "total": "920.00"},
                {"product_code": "YOG002", "product_name": "Tam Yağlı Yoğurt 1kg", "category": "Yoğurt", "quantity": "25", "unit": "ADET", "unit_price": "28.00", "total": "700.00"}
            ],
            "subtotal": "1620.00",
            "total_discount": "50.00",
            "total_tax": "15.70",
            "grand_total": "1585.70",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # GÜNEŞ GIDA faturaları
        {
            "invoice_id": "inv_005",
            "invoice_number": "FAT2024005",
            "invoice_date": "2024-10-10",
            "customer_name": "GÜNEŞ GIDA",
            "customer_tax_id": "98765432109",
            "customer_address": "YENİ MAH ZÜBEYDE HANIM SOK NO:12 İZMİR",
            "products": [
                {"product_code": "AYR001", "product_name": "170 ML AYRAN", "category": "Ayran", "quantity": "200", "unit": "ADET", "unit_price": "5.00", "total": "1000.00"},
                {"product_code": "KRE001", "product_name": "200 ml UHT ÇIRPMA KREMA", "category": "Krema", "quantity": "30", "unit": "ADET", "unit_price": "22.00", "total": "660.00"}
            ],
            "subtotal": "1660.00",
            "total_discount": "0",
            "total_tax": "16.60",
            "grand_total": "1676.60",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.invoices.insert_many(invoices)
    print(f"✅ {len(invoices)} fatura oluşturuldu")
    
    # Müşteri bazında fatura sayıları
    invoice_counts = {}
    for inv in invoices:
        customer = inv['customer_name']
        invoice_counts[customer] = invoice_counts.get(customer, 0) + 1
    
    for customer, count in invoice_counts.items():
        print(f"   📄 {customer}: {count} fatura")
    
    # ===========================================
    # 4. CONSUMPTION HESAPLA
    # ===========================================
    print("\n" + "=" * 50)
    print("4️⃣  CONSUMPTION VERİLERİ HESAPLANIYOR")
    print("=" * 50)
    
    await db.consumption.delete_many({})
    print("✅ Consumption koleksiyonu temizlendi")
    print("⚠️  Admin panelinden 'Tüketim Hesapla' butonuna tıklayın")
    
    client.close()
    
    # ===========================================
    # ÖZET
    # ===========================================
    print("\n" + "=" * 50)
    print("✨ SEED İŞLEMİ TAMAMLANDI!")
    print("=" * 50)
    
    print("\n📊 OLUŞTURULAN VERİLER:")
    print(f"   👤 Kullanıcılar: {1 + 1 + len(customers)} (1 admin, 1 muhasebe, {len(customers)} müşteri)")
    print(f"   📦 Ürünler: {len(products)}")
    print(f"   📄 Faturalar: {len(invoices)}")
    
    print("\n🔐 GİRİŞ BİLGİLERİ:")
    print("   👤 Admin: admin / admin123")
    print("   💼 Muhasebe: muhasebe / muhasebe123")
    print("\n   Müşteriler:")
    for c in customers:
        print(f"   🛒 {c['full_name']}: {c['username']} / musteri{c['id']}")
    
    print("\n🎯 SONRAKİ ADIMLAR:")
    print("   1. Muhasebe ile giriş yapın")
    print("   2. İsterseniz daha fazla fatura yükleyin")
    print("   3. Admin panelinden 'Tüketim Hesapla' yapın")
    print("   4. Müşteri hesapları ile giriş yapıp test edin")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    asyncio.run(seed_full_database())
