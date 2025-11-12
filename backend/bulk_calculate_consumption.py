"""
Bulk Consumption Calculation Script
Mevcut tüm faturalar için tüketim hesaplama scripti
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from services.consumption_calculation_service import ConsumptionCalculationService
import logging

# Logging ayarla
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Ana fonksiyon"""
    
    try:
        # MongoDB bağlantısı
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME', 'main_db')
        
        if not mongo_url:
            logger.error("MONGO_URL environment variable not set!")
            sys.exit(1)
        
        logger.info(f"Connecting to MongoDB: {db_name}")
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Mevcut consumption kayıtlarını temizle mi?
        clear_existing = input("Mevcut tüketim kayıtlarını temizlemek ister misiniz? (y/n): ").lower()
        
        if clear_existing == 'y':
            logger.info("Mevcut tüketim kayıtları siliniyor...")
            result = await db.customer_consumption.delete_many({})
            logger.info(f"{result.deleted_count} kayıt silindi")
        
        # Consumption service oluştur
        consumption_service = ConsumptionCalculationService(db)
        
        logger.info("=" * 60)
        logger.info("TOPLU TÜKETİM HESAPLAMA BAŞLIYOR")
        logger.info("=" * 60)
        
        # Tüm faturalar için hesapla
        result = await consumption_service.bulk_calculate_all_invoices()
        
        logger.info("=" * 60)
        logger.info("SONUÇLAR:")
        logger.info("=" * 60)
        logger.info(f"✅ Toplam Fatura: {result['total_invoices']}")
        logger.info(f"✅ İşlenen Fatura: {result['invoices_processed']}")
        logger.info(f"✅ Oluşturulan Tüketim Kaydı: {result['total_consumption_records_created']}")
        logger.info("=" * 60)
        
        # MongoDB bağlantısını kapat
        client.close()
        
        logger.info("İşlem tamamlandı!")
        
    except Exception as e:
        logger.error(f"Hata oluştu: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
