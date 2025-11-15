"""
GURBET DURMUŞ müşterisi için 2 yıllık tüketim geçmişi oluştur
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

async def create_consumption_history():
    """2 yıllık tüketim geçmişi oluştur"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("TÜKETİM GEÇMİŞİ OLUŞTURMA")
    print("=" * 60)
    
    # 1. Müşteri kontrolü veya oluşturma
    customer_name = "GURBET DURMUŞ"
    customer = await db.users.find_one({"full_name": customer_name})
    
    if not customer:
        print(f"\n📝 '{customer_name}' müşterisi bulunamadı, oluşturuluyor...")
        customer_id = str(uuid.uuid4())
        customer_data = {
            "id": customer_id,
            "username": "gurbet_durmus",
            "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jzHyVr5H.7.G",  # gurbet123
            "full_name": customer_name,
            "email": "gurbet.durmus@example.com",
            "phone": "0532 555 12 34",
            "role": "customer",
            "customer_number": "9999888877",
            "is_active": True,
            "created_at": datetime.now().isoformat()
        }
        await db.users.insert_one(customer_data)
        print(f"✅ Müşteri oluşturuldu: {customer_name} (gurbet_durmus/gurbet123)")
    else:
        customer_id = customer["id"]
        print(f"✅ Müşteri bulundu: {customer_name}")
    
    # 2. Ürün seçimi veya oluşturma
    product = await db.products.find_one({})
    
    if not product:
        print("\n📝 Ürün bulunamadı, yeni ürün oluşturuluyor...")
        product_data = {
            "id": str(uuid.uuid4()),
            "sku": "PROD-YOGURT-001",
            "name": "SÜZME YOĞURT 5 KG",
            "category": "Yoğurt",
            "description": "Premium süzme yoğurt 5 kg kova",
            "price": 450.00,
            "unit": "adet",
            "is_active": True
        }
        await db.products.insert_one(product_data)
        product_code = product_data["sku"]
        product_name = product_data["name"]
        product_price = product_data["price"]
        print(f"✅ Ürün oluşturuldu: {product_name}")
    else:
        product_code = product.get("sku", "PROD-001")
        product_name = product.get("name", "Test Ürün")
        product_price = product.get("price", 100.0)
        print(f"✅ Ürün seçildi: {product_name} ({product_code})")
    
    # 3. 2 yıllık fatura kayıtları oluştur (2023-2024)
    print("\n📊 2 yıllık fatura kayıtları oluşturuluyor...")
    
    start_date = datetime(2023, 1, 1)
    invoices_created = 0
    
    # 24 ay için fatura oluştur
    for month_offset in range(24):
        invoice_date = start_date + timedelta(days=30 * month_offset)
        
        # Rastgele ama gerçekçi miktar (5-50 adet arası)
        # Kış aylarında daha fazla, yaz aylarında daha az
        month = invoice_date.month
        if month in [12, 1, 2]:  # Kış
            quantity = random.randint(30, 50)
        elif month in [6, 7, 8]:  # Yaz
            quantity = random.randint(10, 25)
        else:  # İlkbahar/Sonbahar
            quantity = random.randint(20, 35)
        
        # Fatura numarası
        invoice_no = f"FAT{invoice_date.year}{invoice_date.month:02d}{random.randint(1000, 9999)}"
        invoice_id = str(uuid.uuid4())
        
        # Fatura tarihi formatı
        invoice_date_str = invoice_date.strftime("%d %m %Y")
        
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
            "created_at": invoice_date.isoformat(),
            "html_content": f"<html>Mock invoice {invoice_no}</html>"
        }
        
        # Fatura kaydet
        await db.invoices.insert_one(invoice_data)
        invoices_created += 1
        
        # İlerleme göster
        if invoices_created % 6 == 0:
            print(f"   ✓ {invoices_created} fatura oluşturuldu ({invoice_date.strftime('%Y-%m')})")
    
    print(f"\n✅ Toplam {invoices_created} fatura oluşturuldu")
    
    # 4. Tüketim kayıtlarını hesapla
    print("\n🔄 Tüketim kayıtları hesaplanıyor...")
    
    # Önce mevcut tüketim kayıtlarını temizle
    deleted_count = await db.customer_consumption.delete_many({"customer_id": customer_id})
    print(f"   🗑️  {deleted_count.deleted_count} eski tüketim kaydı silindi")
    
    # Faturaları tarih sırasına göre al
    invoices = await db.invoices.find(
        {"customer_id": customer_id}
    ).sort("created_at", 1).to_list(length=100)
    
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
                "notes": f"Son alım: {consumption_qty} birim, {days_between} günde tüketildi",
                "created_at": datetime.now().isoformat()
            }
            
            await db.customer_consumption.insert_one(consumption_data)
            consumption_records += 1
    
    print(f"   ✅ {consumption_records} tüketim kaydı oluşturuldu")
    
    # 5. Periyodik tüketim kayıtları oluştur
    print("\n📈 Periyodik tüketim kayıtları oluşturuluyor...")
    
    # Aylık periyodik kayıtlar
    for year in [2023, 2024]:
        for month in range(1, 13):
            # Bu ay için tüketim kayıtlarını bul
            month_consumptions = []
            for consumption in await db.customer_consumption.find(
                {"customer_id": customer_id, "product_code": product_code}
            ).to_list(length=100):
                source_date = datetime.strptime(consumption["source_invoice_date"], "%d %m %Y")
                if source_date.year == year and source_date.month == month:
                    month_consumptions.append(consumption)
            
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
                    "period_year": year,  # Fixed: use period_year instead of year
                    "period_number": month,
                    "total_consumption": total_consumption,
                    "daily_average": round(daily_avg, 2),
                    "record_count": len(month_consumptions),
                    "created_at": datetime.now().isoformat()
                }
                
                # Upsert (update or insert)
                await db.consumption_periods.update_one(  # Fixed: use consumption_periods collection
                    {
                        "customer_id": customer_id,
                        "product_code": product_code,
                        "period_type": "monthly",
                        "period_year": year,  # Fixed: use period_year instead of year
                        "period_number": month
                    },
                    {"$set": period_data},
                    upsert=True
                )
    
    print("   ✅ Aylık periyodik kayıtlar oluşturuldu")
    
    # 6. Özet
    print("\n" + "=" * 60)
    print("✅ TÜKETİM GEÇMİŞİ OLUŞTURULDU!")
    print("=" * 60)
    print(f"\n👤 Müşteri: {customer_name}")
    print(f"   Kullanıcı Adı: gurbet_durmus")
    print(f"   Şifre: gurbet123")
    print(f"   ID: {customer_id}")
    print(f"\n📦 Ürün: {product_name}")
    print(f"   Kod: {product_code}")
    print(f"\n📊 Oluşturulan Veriler:")
    print(f"   - {invoices_created} fatura (2023-2024)")
    print(f"   - {consumption_records} tüketim kaydı")
    print(f"   - 24 aylık periyodik kayıt")
    
    print("\n🎯 Test Etmek İçin:")
    print("   1. Admin paneline giriş yapın")
    print("   2. Tüketim istatistikleri sayfasına gidin")
    print(f"   3. '{customer_name}' müşterisini seçin")
    print(f"   4. '{product_name}' ürününü seçin")
    print("   5. 2023-2024 yıllarını karşılaştırın")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_consumption_history())
