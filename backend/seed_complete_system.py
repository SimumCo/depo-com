"""
Complete System Seed Script
============================
Fatura bazlı tüketim sistemi için demo verileri oluşturur.

Oluşturulacaklar:
1. Admin ve muhasebe kullanıcıları
2. 5 müşteri
3. 10 ürün (süt ürünleri)
4. 2024 ve 2025 yılları için faturalar
5. Otomatik tüketim hesaplaması
6. Periyodik kayıtlar

Kullanım:
    cd /app/backend
    python seed_complete_system.py
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import logging
import uuid
from passlib.context import CryptContext

# Logging ayarla
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Password hash"""
    return pwd_context.hash(password)


async def seed_system():
    """Sistemi seed veriler ile doldur"""
    
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ.get('DB_NAME', 'main_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    logger.info("=" * 70)
    logger.info("SİSTEM SEED BAŞLIYOR")
    logger.info("=" * 70)
    
    # 1. KULLANICILAR
    logger.info("\n1. Kullanıcılar oluşturuluyor...")
    
    users = []
    
    # Admin
    if not await db.users.find_one({"username": "admin"}):
        admin = {
            "id": "admin001",
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "full_name": "Sistem Yöneticisi",
            "email": "admin@example.com",
            "phone": "0555 000 00 01",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin)
        logger.info("   ✅ Admin oluşturuldu (admin/admin123)")
    
    # Muhasebe
    if not await db.users.find_one({"username": "muhasebe"}):
        muhasebe = {
            "id": "muhasebe001",
            "username": "muhasebe",
            "password_hash": hash_password("muhasebe123"),
            "full_name": "Muhasebe Personeli",
            "email": "muhasebe@example.com",
            "phone": "0555 000 00 02",
            "role": "accounting",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(muhasebe)
        logger.info("   ✅ Muhasebe oluşturuldu (muhasebe/muhasebe123)")
    
    # 5 Müşteri
    companies = [
        ("Ankara Gıda Ltd Şti", "1111111111", "Ankara"),
        ("İstanbul Süt Sanayi A.Ş.", "2222222222", "İstanbul"),
        ("İzmir Yoğurt Ltd Şti", "3333333333", "İzmir"),
        ("Bursa Peynir A.Ş.", "4444444444", "Bursa"),
        ("Antalya Süt Ürünleri Ltd", "5555555555", "Antalya")
    ]
    
    customer_ids = []
    for i, (company, tax_id, city) in enumerate(companies, 1):
        username = f"musteri{i}"
        customer_id = f"cust_{i:03d}"
        
        if not await db.users.find_one({"username": username}):
            customer = {
                "id": customer_id,
                "username": username,
                "password_hash": hash_password(f"musteri{i}23"),
                "full_name": company,
                "email": f"info@musteri{i}.com",
                "phone": f"0555 000 00 {i+10}",
                "role": "customer",
                "customer_number": tax_id,
                "address": f"{city} Merkez",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(customer)
            customer_ids.append(customer_id)
            logger.info(f"   ✅ Müşteri {i}: {username}/musteri{i}23 ({company})")
    
    # 2. ÜRÜNLER
    logger.info("\n2. Ürünler oluşturuluyor...")
    
    products = [
        ("SUT001", "Tam Yağlı Süt 1L", "Süt", 2.5, 12),
        ("SUT002", "Yarım Yağlı Süt 1L", "Süt", 2.2, 12),
        ("YOG001", "Süzme Yoğurt 500g", "Yoğurt", 3.5, 10),
        ("YOG002", "Krem Yoğurt 1kg", "Yoğurt", 4.0, 8),
        ("PEY001", "Beyaz Peynir 1kg", "Peynir", 8.5, 6),
        ("PEY002", "Kaşar Peynir 500g", "Peynir", 9.0, 8),
        ("KRE001", "Krema 200ml", "Krema", 3.0, 12),
        ("TER001", "Tereyağı 500g", "Tereyağı", 12.0, 6),
        ("AYR001", "Ayran 1L", "Ayran", 1.5, 12),
        ("AYR002", "Meyveli Ayran 200ml", "Ayran", 1.0, 20)
    ]
    
    product_ids = []
    for code, name, category, price, units in products:
        product_id = f"prod_{code}"
        
        if not await db.products.find_one({"sku": code}):
            product = {
                "id": product_id,
                "name": name,
                "sku": code,
                "category": category,
                "weight": 1.0,
                "units_per_case": units,
                "logistics_price": price,
                "dealer_price": price * 1.2,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.products.insert_one(product)
            product_ids.append(product_id)
            logger.info(f"   ✅ {name} ({code})")
    
    # 3. FATURALAR (2024 ve 2025)
    logger.info("\n3. Faturalar oluşturuluyor...")
    
    invoice_count = 0
    
    # Her müşteri için 2024 ve 2025 yıllarında faturalar
    for customer_id in customer_ids:
        customer = await db.users.find_one({"id": customer_id})
        customer_name = customer.get("full_name")
        customer_tax_id = customer.get("customer_number")
        
        # 2024 Faturaları (Ocak, Mart, Mayıs, Temmuz, Eylül, Kasım)
        months_2024 = [1, 3, 5, 7, 9, 11]
        
        for month in months_2024:
            invoice_date = datetime(2024, month, 15)
            invoice_date_str = invoice_date.strftime("%d %m %Y")
            
            # Rastgele 3-5 ürün seç
            import random
            selected_products = random.sample(products, random.randint(3, 5))
            
            invoice_products = []
            subtotal = 0.0
            
            for code, name, category, price, units in selected_products:
                quantity = random.randint(10, 50)
                total = quantity * price
                subtotal += total
                
                invoice_products.append({
                    "product_code": code,
                    "product_name": name,
                    "quantity": float(quantity),
                    "unit_price": f"{price:.2f}",
                    "total": f"{total:.2f}"
                })
            
            tax = subtotal * 0.18
            grand_total = subtotal + tax
            
            invoice = {
                "id": str(uuid.uuid4()),
                "invoice_number": f"FAT2024{month:02d}{customer_id[-3:]}",
                "invoice_date": invoice_date_str,
                "customer_name": customer_name,
                "customer_tax_id": customer_tax_id,
                "customer_id": customer_id,
                "html_content": "",
                "products": invoice_products,
                "subtotal": f"{subtotal:.2f}",
                "total_discount": "0.00",
                "total_tax": f"{tax:.2f}",
                "grand_total": f"{grand_total:.2f}",
                "uploaded_by": "muhasebe001",
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }
            
            await db.invoices.insert_one(invoice)
            invoice_count += 1
        
        # 2025 Faturaları (Ocak, Mart)
        months_2025 = [1, 3]
        
        for month in months_2025:
            invoice_date = datetime(2025, month, 15)
            invoice_date_str = invoice_date.strftime("%d %m %Y")
            
            # Aynı ürünlerden bazılarını seç (tüketim karşılaştırması için)
            import random
            selected_products = random.sample(products, random.randint(3, 5))
            
            invoice_products = []
            subtotal = 0.0
            
            for code, name, category, price, units in selected_products:
                quantity = random.randint(15, 60)  # 2025'te biraz daha fazla
                total = quantity * price
                subtotal += total
                
                invoice_products.append({
                    "product_code": code,
                    "product_name": name,
                    "quantity": float(quantity),
                    "unit_price": f"{price:.2f}",
                    "total": f"{total:.2f}"
                })
            
            tax = subtotal * 0.18
            grand_total = subtotal + tax
            
            invoice = {
                "id": str(uuid.uuid4()),
                "invoice_number": f"FAT2025{month:02d}{customer_id[-3:]}",
                "invoice_date": invoice_date_str,
                "customer_name": customer_name,
                "customer_tax_id": customer_tax_id,
                "customer_id": customer_id,
                "html_content": "",
                "products": invoice_products,
                "subtotal": f"{subtotal:.2f}",
                "total_discount": "0.00",
                "total_tax": f"{tax:.2f}",
                "grand_total": f"{grand_total:.2f}",
                "uploaded_by": "muhasebe001",
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }
            
            await db.invoices.insert_one(invoice)
            invoice_count += 1
    
    logger.info(f"   ✅ {invoice_count} fatura oluşturuldu (2024: {len(customer_ids)*6}, 2025: {len(customer_ids)*2})")
    
    # 4. TÜKETİM HESAPLAMALARI
    logger.info("\n4. Tüketim hesaplamaları yapılıyor...")
    
    from services.consumption_calculation_service import ConsumptionCalculationService
    
    consumption_service = ConsumptionCalculationService(db)
    result = await consumption_service.bulk_calculate_all_invoices()
    
    logger.info(f"   ✅ {result['invoices_processed']}/{result['total_invoices']} fatura işlendi")
    logger.info(f"   ✅ {result['total_consumption_records_created']} tüketim kaydı oluşturuldu")
    
    # 5. PERİYODİK KAYITLAR
    logger.info("\n5. Periyodik kayıtlar oluşturuluyor...")
    
    from services.periodic_consumption_service import PeriodicConsumptionService
    
    periodic_service = PeriodicConsumptionService(db)
    
    # Aylık kayıtlar
    result_monthly = await periodic_service.generate_periodic_records(period_type="monthly")
    logger.info(f"   ✅ Aylık: {result_monthly['total']} kayıt oluşturuldu")
    
    # Haftalık kayıtlar
    result_weekly = await periodic_service.generate_periodic_records(period_type="weekly")
    logger.info(f"   ✅ Haftalık: {result_weekly['total']} kayıt oluşturuldu")
    
    # Final durum
    logger.info("\n" + "=" * 70)
    logger.info("SEED TAMAMLANDI - FİNAL DURUM")
    logger.info("=" * 70)
    
    final_users = await db.users.count_documents({})
    final_customers = await db.users.count_documents({"role": "customer"})
    final_products = await db.products.count_documents({})
    final_invoices = await db.invoices.count_documents({})
    final_consumption = await db.customer_consumption.count_documents({})
    final_periods = await db.consumption_periods.count_documents({})
    
    logger.info(f"\n✅ Toplam Kullanıcı: {final_users}")
    logger.info(f"   - Admin: 1")
    logger.info(f"   - Muhasebe: 1")
    logger.info(f"   - Müşteriler: {final_customers}")
    logger.info(f"✅ Ürünler: {final_products}")
    logger.info(f"✅ Faturalar: {final_invoices}")
    logger.info(f"   - 2024: {len(customer_ids)*6}")
    logger.info(f"   - 2025: {len(customer_ids)*2}")
    logger.info(f"✅ Tüketim Kayıtları: {final_consumption}")
    logger.info(f"✅ Periyodik Kayıtlar: {final_periods}")
    
    # Test kullanıcıları
    logger.info("\n" + "=" * 70)
    logger.info("TEST KULLANICILARI")
    logger.info("=" * 70)
    
    logger.info("\n👤 Admin:")
    logger.info("   Kullanıcı: admin")
    logger.info("   Şifre: admin123")
    
    logger.info("\n💼 Muhasebe:")
    logger.info("   Kullanıcı: muhasebe")
    logger.info("   Şifre: muhasebe123")
    
    logger.info("\n🏢 Müşteriler:")
    for i in range(1, 6):
        logger.info(f"   Kullanıcı: musteri{i}")
        logger.info(f"   Şifre: musteri{i}23")
    
    logger.info("\n🎯 Sistem teste hazır!")
    logger.info("\nTest Senaryoları:")
    logger.info("1. Fatura bazlı tüketim: GET /api/customer-consumption/invoice-based/customer/{id}")
    logger.info("2. Yıllık karşılaştırma: GET /api/consumption-periods/compare/year-over-year")
    logger.info("3. Trend analizi: GET /api/consumption-periods/trends/yearly")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_system())
