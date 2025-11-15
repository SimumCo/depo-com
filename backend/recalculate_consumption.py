"""
Tüketim kayıtlarını yeniden hesapla (beklenen tüketim ve sapma ile)
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

# .env dosyasını yükle
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB bağlantısı
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def recalculate_consumption():
    """Tüketim kayıtlarını yeniden hesapla"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("TÜKETİM KAYITLARINI YENİDEN HESAPLAMA")
    print("=" * 60)
    
    customer_id = 'a00f9853-e336-44c3-84db-814827fe0ff6'
    product_code = 'SUT001'
    
    # Tüm tüketim kayıtlarını al (tarih sırasına göre)
    all_consumption = await db.customer_consumption.find(
        {"customer_id": customer_id, "product_code": product_code}
    ).sort("created_at", 1).to_list(length=500)
    
    print(f"\n📊 Toplam {len(all_consumption)} tüketim kaydı bulundu")
    print("🔄 Yeniden hesaplanıyor...\n")
    
    updated_count = 0
    
    for i, record in enumerate(all_consumption):
        # İlk kayıt için hesaplama yapma
        if not record.get("can_calculate", False):
            continue
            
        consumption_qty = record.get("consumption_quantity", 0)
        days_between = record.get("days_between", 0)
        daily_rate = consumption_qty / days_between if days_between > 0 else 0
        
        # Beklenen tüketim hesapla (bu kayıttan önceki son 3 kayıt)
        previous_records = all_consumption[:i]  # Bu kayıttan öncekiler
        
        # Sadece hesaplanabilir kayıtları al
        valid_previous = [r for r in previous_records if r.get("can_calculate", False)]
        
        # Son 3 geçerli kaydı al
        last_3 = valid_previous[-3:] if len(valid_previous) >= 3 else valid_previous
        
        if last_3:
            # Ortalama günlük tüketim hesapla
            total_daily = sum(r.get("daily_consumption_rate", 0) for r in last_3)
            avg_daily_rate = total_daily / len(last_3)
            
            # Beklenen tüketim
            expected_consumption = avg_daily_rate * days_between
            
            # Sapma oranı
            if expected_consumption > 0:
                deviation_rate = ((consumption_qty - expected_consumption) / expected_consumption) * 100
            else:
                deviation_rate = 0.0
        else:
            # İlk birkaç kayıt için beklenen tüketim 0
            expected_consumption = 0.0
            deviation_rate = 0.0
        
        # Kaydı güncelle
        await db.customer_consumption.update_one(
            {"_id": record["_id"]},
            {"$set": {
                "daily_consumption_rate": round(daily_rate, 2),
                "expected_consumption": round(expected_consumption, 2),
                "deviation_rate": round(deviation_rate, 2),
                "notes": f"Günlük ort: {daily_rate:.2f} | Beklenen: {expected_consumption:.2f} | Sapma: {deviation_rate:.1f}%"
            }}
        )
        
        updated_count += 1
        
        # İlerleme göster
        if updated_count % 10 == 0:
            print(f"   ✓ {updated_count} kayıt güncellendi...")
    
    print(f"\n✅ Toplam {updated_count} kayıt başarıyla güncellendi")
    
    # Örnek kayıtları göster
    print("\n📋 Örnek Kayıtlar (Son 5):")
    examples = await db.customer_consumption.find(
        {"customer_id": customer_id, "product_code": product_code, "can_calculate": True}
    ).sort("created_at", -1).limit(5).to_list(length=5)
    
    for ex in examples:
        print(f"\n   Tarih: {ex.get('target_invoice_date')}")
        print(f"   Tüketim: {ex.get('consumption_quantity', 0):.2f}")
        print(f"   Günlük Ort: {ex.get('daily_consumption_rate', 0):.2f}")
        print(f"   Beklenen: {ex.get('expected_consumption', 0):.2f}")
        print(f"   Sapma: {ex.get('deviation_rate', 0):.2f}%")
    
    print("\n" + "=" * 60)
    print("✅ YENİDEN HESAPLAMA TAMAMLANDI!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(recalculate_consumption())
