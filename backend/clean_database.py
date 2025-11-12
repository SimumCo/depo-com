"""
Database Cleanup Script
Admin ve muhasebeci hariç tüm verileri temizler
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging

# Logging ayarla
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()


async def clean_database():
    """Admin ve muhasebeci hariç tüm verileri temizle"""
    
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ.get('DB_NAME', 'main_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    logger.info("=" * 70)
    logger.info("DATABASE CLEANUP BAŞLIYOR")
    logger.info("=" * 70)
    
    # 1. KULLANICILAR - Admin ve Muhasebeci hariç tümünü sil
    logger.info("\n1. Kullanıcılar temizleniyor...")
    users_before = await db.users.count_documents({})
    logger.info(f"   Mevcut kullanıcı sayısı: {users_before}")
    
    # Admin ve muhasebe kullanıcıları koru
    protected_users = ["admin", "muhasebe"]
    result = await db.users.delete_many({
        "username": {"$nin": protected_users}
    })
    logger.info(f"   ✅ {result.deleted_count} kullanıcı silindi")
    logger.info(f"   ✅ Admin ve muhasebeci korundu")
    
    # 2. ÜRÜNLER - Tümünü sil
    logger.info("\n2. Ürünler temizleniyor...")
    products_count = await db.products.count_documents({})
    logger.info(f"   Mevcut ürün sayısı: {products_count}")
    
    result = await db.products.delete_many({})
    logger.info(f"   ✅ {result.deleted_count} ürün silindi")
    
    # 3. FATURALAR - Tümünü sil
    logger.info("\n3. Faturalar temizleniyor...")
    invoices_count = await db.invoices.count_documents({})
    logger.info(f"   Mevcut fatura sayısı: {invoices_count}")
    
    result = await db.invoices.delete_many({})
    logger.info(f"   ✅ {result.deleted_count} fatura silindi")
    
    # 4. TÜKETİM KAYITLARI - Tümünü sil
    logger.info("\n4. Tüketim kayıtları temizleniyor...")
    consumption_count = await db.customer_consumption.count_documents({})
    logger.info(f"   Mevcut tüketim kaydı: {consumption_count}")
    
    result = await db.customer_consumption.delete_many({})
    logger.info(f"   ✅ {result.deleted_count} tüketim kaydı silindi")
    
    # 5. PERİYODİK TÜKETİM KAYITLARI - Tümünü sil
    logger.info("\n5. Periyodik tüketim kayıtları temizleniyor...")
    periods_count = await db.consumption_periods.count_documents({})
    logger.info(f"   Mevcut periyodik kayıt: {periods_count}")
    
    result = await db.consumption_periods.delete_many({})
    logger.info(f"   ✅ {result.deleted_count} periyodik kayıt silindi")
    
    # 6. SİPARİŞLER - Tümünü sil
    logger.info("\n6. Siparişler temizleniyor...")
    orders_count = await db.orders.count_documents({})
    logger.info(f"   Mevcut sipariş sayısı: {orders_count}")
    
    result = await db.orders.delete_many({})
    logger.info(f"   ✅ {result.deleted_count} sipariş silindi")
    
    # 7. SALES ROUTES - Tümünü sil
    logger.info("\n7. Sales routes temizleniyor...")
    routes_count = await db.sales_routes.count_documents({})
    logger.info(f"   Mevcut route sayısı: {routes_count}")
    
    result = await db.sales_routes.delete_many({})
    logger.info(f"   ✅ {result.deleted_count} route silindi")
    
    # 8. ESKİ CONSUMPTION KAYITLARI - Tümünü sil
    logger.info("\n8. Eski consumption kayıtları temizleniyor...")
    old_consumption_count = await db.consumption.count_documents({})
    logger.info(f"   Mevcut eski consumption kaydı: {old_consumption_count}")
    
    result = await db.consumption.delete_many({})
    logger.info(f"   ✅ {result.deleted_count} eski consumption kaydı silindi")
    
    # 9. CONSUMPTION PATTERNS - Tümünü sil
    logger.info("\n9. Consumption patterns temizleniyor...")
    patterns_count = await db.consumption_patterns.count_documents({})
    logger.info(f"   Mevcut pattern kaydı: {patterns_count}")
    
    result = await db.consumption_patterns.delete_many({})
    logger.info(f"   ✅ {result.deleted_count} pattern kaydı silindi")
    
    # Final durum
    logger.info("\n" + "=" * 70)
    logger.info("TEMİZLEME TAMAMLANDI - FİNAL DURUM")
    logger.info("=" * 70)
    
    final_users = await db.users.count_documents({})
    final_products = await db.products.count_documents({})
    final_invoices = await db.invoices.count_documents({})
    final_consumption = await db.customer_consumption.count_documents({})
    final_periods = await db.consumption_periods.count_documents({})
    final_orders = await db.orders.count_documents({})
    
    logger.info(f"\n✅ Kullanıcılar: {final_users} (Admin + Muhasebe korundu)")
    logger.info(f"✅ Ürünler: {final_products}")
    logger.info(f"✅ Faturalar: {final_invoices}")
    logger.info(f"✅ Tüketim Kayıtları: {final_consumption}")
    logger.info(f"✅ Periyodik Kayıtlar: {final_periods}")
    logger.info(f"✅ Siparişler: {final_orders}")
    
    logger.info("\n🎯 Veritabanı teste hazır!")
    
    # Admin ve muhasebe kullanıcılarını listele
    logger.info("\n" + "=" * 70)
    logger.info("KORUNAN KULLANICILAR")
    logger.info("=" * 70)
    
    protected = await db.users.find(
        {"username": {"$in": protected_users}},
        {"_id": 0, "username": 1, "role": 1, "full_name": 1}
    ).to_list(length=None)
    
    for user in protected:
        logger.info(f"\n👤 {user.get('username')}")
        logger.info(f"   Rol: {user.get('role')}")
        logger.info(f"   Ad: {user.get('full_name', 'N/A')}")
        logger.info(f"   🔑 Şifre: {user.get('username')}123")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(clean_database())
