"""
GURBET DURMUŞ müşterisi için haftalık fatura sistemi
2023 Ocak - 2025 Ocak arası (haftada 1 fatura)
"""

import asyncio
import os
import uuid
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import random

# .env dosyasını yükle
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB bağlantısı
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def create_weekly_consumption():
    """Haftalık fatura sistemi oluştur"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("HAFTALIK FATURA SİSTEMİ OLUŞTURMA")
    print("=" * 60)
    
    # 1. Müşteri kontrolü
    customer_name = "GURBET DURMUŞ"
    customer = await db.users.find_one({"full_name": customer_name})
    
    if not customer:
        print(f"\n❌ '{customer_name}' müşterisi bulunamadı!")
        print("Önce create_consumption_history.py scriptini çalıştırın.")
        client.close()
        return
    
    customer_id = customer["id"]
    print(f"✅ Müşteri bulundu: {customer_name}")
    print(f"   ID: {customer_id}")
    
    # 2. Ürün kontrolü
    product = await db.products.find_one({"sku": "SUT001"})
    
    if not product:
        print("\n❌ Ürün (SUT001) bulunamadı!")
        client.close()
        return
    
    product_code = product["sku"]
    product_name = product["name"]
    product_price = product.get("price", 15.0)
    print(f"✅ Ürün: {product_name} ({product_code})")
    
    # 3. Eski faturaları temizle
    print("\n🗑️  Eski faturaları temizliyorum...")
    deleted_invoices = await db.invoices.delete_many({"customer_id": customer_id})
    print(f"   Silinen fatura sayısı: {deleted_invoices.deleted_count}")
    
    # 4. Eski tüketim kayıtlarını temizle
    deleted_consumption = await db.customer_consumption.delete_many({"customer_id": customer_id})
    print(f"   Silinen tüketim kaydı: {deleted_consumption.deleted_count}")
    
    # 5. Eski periyodik kayıtları temizle
    deleted_periodic = await db.consumption_periods.delete_many({"customer_id": customer_id})
    print(f"   Silinen periyodik kayıt: {deleted_periodic.deleted_count}")
    
    # 6. Haftalık faturalar oluştur (2023 Ocak - 2025 Ocak)
    print("\n📊 Haftalık faturalar oluşturuluyor...")
    print("   Dönem: 2023 Ocak - 2025 Ocak (haftada 1 fatura)")
    
    start_date = datetime(2023, 1, 1)  # 2023 Ocak başlangıcı
    end_date = datetime(2025, 1, 31)   # 2025 Ocak sonu
    
    current_date = start_date
    invoices_created = 0
    week_count = 0
    
    while current_date <= end_date:
        week_count += 1
        
        # Rastgele ama gerçekçi miktar (haftalık: 5-15 adet)
        # Mevsimsel değişiklik
        month = current_date.month
        if month in [12, 1, 2]:  # Kış
            quantity = random.randint(10, 15)
        elif month in [6, 7, 8]:  # Yaz
            quantity = random.randint(5, 9)
        else:  # İlkbahar/Sonbahar
            quantity = random.randint(7, 12)
        
        # Fatura numarası
        invoice_no = f"FAT{current_date.year}{current_date.month:02d}{week_count:04d}"
        invoice_id = str(uuid.uuid4())
        
        # Fatura tarihi formatı
        invoice_date_str = current_date.strftime("%d %m %Y")
        
        # Toplam tutar
        total_amount = quantity * product_price
        
        # Fatura verisi
        invoice_data = {
            "id": invoice_id,
            "invoice_number": invoice_no,
            "invoice_date": invoice_date_str,
            "customer_id": customer_id,
            "customer_name": customer_name,
            "customer_tax_id": "9999888877",
            "total_amount": total_amount,
            "products": [
                {
                    "product_code": product_code,
                    "product_name": product_name,
                    "quantity": quantity,
                    "unit_price": product_price,
                    "total_price": total_amount
                }
            ],
            "created_at": current_date.isoformat(),
            "html_content": f"<html>Mock weekly invoice {invoice_no}</html>"
        }
        
        # Fatura kaydet
        await db.invoices.insert_one(invoice_data)
        invoices_created += 1
        
        # İlerleme göster (her 10 haftada bir)
        if invoices_created % 10 == 0:
            print(f"   ✓ {invoices_created} fatura oluşturuldu ({current_date.strftime('%Y-%m-%d')})")
        
        # Bir sonraki hafta
        current_date += timedelta(days=7)
    
    print(f"\n✅ Toplam {invoices_created} haftalık fatura oluşturuldu")
    
    # 7. Tüketim kayıtlarını hesapla
    print("\n🔄 Tüketim kayıtları hesaplanıyor...")
    
    # Faturaları tarih sırasına göre al
    invoices = await db.invoices.find(
        {"customer_id": customer_id}
    ).sort("created_at", 1).to_list(length=200)
    
    print(f"   📋 {len(invoices)} fatura bulundu")
    
    # Her fatura için tüketim hesapla
    consumption_records = 0
    for i in range(1, len(invoices)):
        current_invoice = invoices[i]
        previous_invoice = invoices[i-1]
        
        # Ürünü her iki faturada da bul
        current_product = None
        prev_product = None
        
        for p in current_invoice.get("products", []):
            if p.get("product_code") == product_code:
                current_product = p
                break
        
        for p in previous_invoice.get("products", []):
            if p.get("product_code") == product_code:
                prev_product = p
                break
        
        if current_product and prev_product:
            # Tarihleri parse et
            current_date = datetime.strptime(current_invoice["invoice_date"], "%d %m %Y")
            prev_date = datetime.strptime(previous_invoice["invoice_date"], "%d %m %Y")
            
            days_between = (current_date - prev_date).days
            
            # Tüketim miktarı (önceki satın alma)
            consumption_qty = prev_product["quantity"]
            daily_rate = consumption_qty / days_between if days_between > 0 else 0
            
            # Tüketim kaydı oluştur
            consumption_data = {
                "id": str(uuid.uuid4()),
                "customer_id": customer_id,
                "product_code": product_code,
                "source_invoice_id": previous_invoice["id"],
                "source_invoice_date": previous_invoice["invoice_date"],
                "source_quantity": prev_product["quantity"],
                "target_invoice_id": current_invoice["id"],
                "target_invoice_date": current_invoice["invoice_date"],
                "target_quantity": current_product["quantity"],
                "days_between": days_between,
                "consumption_quantity": consumption_qty,
                "daily_consumption_rate": round(daily_rate, 2),
                "can_calculate": True,
                "notes": f"Haftalık alım: {consumption_qty} birim, {days_between} günde tüketildi",
                "created_at": datetime.now().isoformat()
            }
            
            await db.customer_consumption.insert_one(consumption_data)
            consumption_records += 1
    
    print(f"   ✅ {consumption_records} tüketim kaydı oluşturuldu")
    
    # 8. Periyodik tüketim kayıtları oluştur
    print("\n📈 Periyodik tüketim kayıtları oluşturuluyor...")
    
    # Aylık periyodik kayıtlar (2023, 2024, 2025)
    for year in [2023, 2024, 2025]:
        max_month = 12 if year != 2025 else 1  # 2025 sadece Ocak
        for month in range(1, max_month + 1):
            # Bu ay için tüketim kayıtlarını bul
            month_consumptions = []
            all_consumptions = await db.customer_consumption.find(
                {"customer_id": customer_id, "product_code": product_code}
            ).to_list(length=500)
            
            for consumption in all_consumptions:
                try:
                    source_date = datetime.strptime(consumption["source_invoice_date"], "%d %m %Y")
                    if source_date.year == year and source_date.month == month:
                        month_consumptions.append(consumption)
                except:
                    continue
            
            if month_consumptions:
                total_consumption = sum(c["consumption_quantity"] for c in month_consumptions)
                total_days = sum(c["days_between"] for c in month_consumptions)
                daily_avg = total_consumption / total_days if total_days > 0 else 0
                
                # Periyodik kayıt oluştur
                period_data = {
                    "id": str(uuid.uuid4()),
                    "customer_id": customer_id,
                    "product_code": product_code,
                    "period_type": "monthly",
                    "period_year": year,
                    "period_number": month,
                    "total_consumption": total_consumption,
                    "daily_average": round(daily_avg, 2),
                    "record_count": len(month_consumptions),
                    "created_at": datetime.now().isoformat()
                }
                
                # Upsert (update or insert)
                await db.consumption_periods.update_one(
                    {
                        "customer_id": customer_id,
                        "product_code": product_code,
                        "period_type": "monthly",
                        "period_year": year,
                        "period_number": month
                    },
                    {"$set": period_data},
                    upsert=True
                )
    
    print("   ✅ Aylık periyodik kayıtlar oluşturuldu")
    
    # 9. Haftalık periyodik kayıtlar oluştur
    print("\n📅 Haftalık periyodik kayıtlar oluşturuluyor...")
    
    for year in [2023, 2024, 2025]:
        max_week = 52 if year != 2025 else 4  # 2025 sadece Ocak (4 hafta)
        for week in range(1, max_week + 1):
            # Bu hafta için tüketim kayıtlarını bul
            week_consumptions = []
            all_consumptions = await db.customer_consumption.find(
                {"customer_id": customer_id, "product_code": product_code}
            ).to_list(length=500)
            
            for consumption in all_consumptions:
                try:
                    source_date = datetime.strptime(consumption["source_invoice_date"], "%d %m %Y")
                    week_number = source_date.isocalendar()[1]
                    if source_date.year == year and week_number == week:
                        week_consumptions.append(consumption)
                except:
                    continue
            
            if week_consumptions:
                total_consumption = sum(c["consumption_quantity"] for c in week_consumptions)
                total_days = sum(c["days_between"] for c in week_consumptions)
                daily_avg = total_consumption / total_days if total_days > 0 else 0
                
                # Haftalık periyodik kayıt
                period_data = {
                    "id": str(uuid.uuid4()),
                    "customer_id": customer_id,
                    "product_code": product_code,
                    "period_type": "weekly",
                    "period_year": year,
                    "period_number": week,
                    "total_consumption": total_consumption,
                    "daily_average": round(daily_avg, 2),
                    "record_count": len(week_consumptions),
                    "created_at": datetime.now().isoformat()
                }
                
                await db.consumption_periods.update_one(
                    {
                        "customer_id": customer_id,
                        "product_code": product_code,
                        "period_type": "weekly",
                        "period_year": year,
                        "period_number": week
                    },
                    {"$set": period_data},
                    upsert=True
                )
    
    print("   ✅ Haftalık periyodik kayıtlar oluşturuldu")
    
    # 10. Özet
    print("\n" + "=" * 60)
    print("✅ HAFTALIK FATURA SİSTEMİ OLUŞTURULDU!")
    print("=" * 60)
    print(f"\n👤 Müşteri: {customer_name}")
    print(f"   ID: {customer_id}")
    print(f"\n📦 Ürün: {product_name}")
    print(f"   Kod: {product_code}")
    print(f"\n📊 Oluşturulan Veriler:")
    print(f"   - {invoices_created} haftalık fatura (2023 Ocak - 2025 Ocak)")
    print(f"   - {consumption_records} tüketim kaydı")
    print(f"   - ~108 haftalık periyodik kayıt")
    print(f"   - ~25 aylık periyodik kayıt")
    
    print("\n📅 Fatura Dağılımı:")
    print("   - 2023: ~52 hafta")
    print("   - 2024: ~52 hafta")
    print("   - 2025 Ocak: ~4 hafta")
    print(f"   - Toplam: {invoices_created} hafta")
    
    print("\n🎯 Test Etmek İçin:")
    print("   1. Admin paneline giriş yapın (admin/admin123)")
    print("   2. Tüketim istatistikleri sayfasına gidin")
    print(f"   3. '{customer_name}' müşterisini seçin")
    print(f"   4. '{product_name}' ürününü seçin")
    print("   5. 2023-2024-2025 yıllarını karşılaştırın")
    print("   6. Haftalık/Aylık periyot seçeneklerini test edin")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_weekly_consumption())
