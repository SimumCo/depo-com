import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

async def seed_advanced_campaigns():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.distribution_db
    
    # Get some products
    products = await db.products.find({"is_active": True}).to_list(20)
    if len(products) < 2:
        print("❌ En az 2 ürün gerekli! Önce ürün oluşturun.")
        return
    
    now = datetime.now(timezone.utc)
    
    # Mevcut kampanyaları temizle
    await db.campaigns.delete_many({})
    print("Mevcut kampanyalar temizlendi")
    
    campaigns = []
    
    # 1. SIMPLE_DISCOUNT - Basit indirim kampanyası
    campaigns.append({
        "id": str(uuid.uuid4()),
        "name": "Tüm Ürünlerde %15 İndirim",
        "description": "Kış ayları özel indirim kampanyası",
        "campaign_type": "simple_discount",
        "discount_type": "percentage",
        "discount_value": 15,
        "min_quantity": 0,
        "gift_product_id": None,
        "gift_quantity": 0,
        "bulk_min_quantity": 0,
        "bulk_discount_per_unit": 0,
        "applies_to_product_id": None,
        "start_date": now,
        "end_date": now + timedelta(days=30),
        "customer_groups": ["all"],
        "customer_ids": [],
        "product_ids": [],  # Tüm ürünler
        "is_active": True,
        "created_at": now,
        "updated_at": now
    })
    
    # 2. BUY_X_GET_Y - "10 kova süzme yoğurt al, 1 koli ayran hediye"
    campaigns.append({
        "id": str(uuid.uuid4()),
        "name": "10 Süzme Yoğurt Al, Ayran Hediye!",
        "description": "10 kova süzme yoğurt alana 1 koli (250ml) ayran hediye",
        "campaign_type": "buy_x_get_y",
        "discount_type": "percentage",
        "discount_value": 0,
        "min_quantity": 10,  # Minimum 10 adet
        "gift_product_id": products[1]['id'] if len(products) > 1 else None,  # Ayran
        "gift_quantity": 1,  # 1 koli hediye
        "bulk_min_quantity": 0,
        "bulk_discount_per_unit": 0,
        "applies_to_product_id": products[0]['id'],  # Süzme yoğurt
        "start_date": now,
        "end_date": now + timedelta(days=45),
        "customer_groups": ["all"],
        "customer_ids": [],
        "product_ids": [],
        "is_active": True,
        "created_at": now,
        "updated_at": now
    })
    
    # 3. BULK_DISCOUNT - "30 koli süt alana her birine 5 TL indirim"
    campaigns.append({
        "id": str(uuid.uuid4()),
        "name": "30 Koli Sütte Birim İndirim",
        "description": "30 koli ve üzeri süt alımlarında her birime 5 TL indirim",
        "campaign_type": "bulk_discount",
        "discount_type": "percentage",
        "discount_value": 0,
        "min_quantity": 0,
        "gift_product_id": None,
        "gift_quantity": 0,
        "bulk_min_quantity": 30,  # Minimum 30 koli
        "bulk_discount_per_unit": 5.0,  # Her birime 5 TL indirim
        "applies_to_product_id": products[2]['id'] if len(products) > 2 else None,  # Süt
        "start_date": now,
        "end_date": now + timedelta(days=60),
        "customer_groups": ["all"],
        "customer_ids": [],
        "product_ids": [],
        "is_active": True,
        "created_at": now,
        "updated_at": now
    })
    
    # 4. BUY_X_GET_Y - VIP müşterilere özel
    campaigns.append({
        "id": str(uuid.uuid4()),
        "name": "VIP: 5 Al 1 Kazan",
        "description": "VIP müşterilerimize özel - 5 adet peynir alana 1 adet hediye",
        "campaign_type": "buy_x_get_y",
        "discount_type": "percentage",
        "discount_value": 0,
        "min_quantity": 5,
        "gift_product_id": products[3]['id'] if len(products) > 3 else None,
        "gift_quantity": 1,
        "bulk_min_quantity": 0,
        "bulk_discount_per_unit": 0,
        "applies_to_product_id": products[3]['id'] if len(products) > 3 else None,
        "start_date": now,
        "end_date": now + timedelta(days=90),
        "customer_groups": ["vip"],
        "customer_ids": [],
        "product_ids": [],
        "is_active": True,
        "created_at": now,
        "updated_at": now
    })
    
    # 5. BULK_DISCOUNT - "50 adet tereyağı alana birim 10 TL indirim"
    campaigns.append({
        "id": str(uuid.uuid4()),
        "name": "50+ Tereyağında Süper İndirim",
        "description": "50 adet ve üzeri tereyağı alımlarında her birime 10 TL indirim",
        "campaign_type": "bulk_discount",
        "discount_type": "percentage",
        "discount_value": 0,
        "min_quantity": 0,
        "gift_product_id": None,
        "gift_quantity": 0,
        "bulk_min_quantity": 50,
        "bulk_discount_per_unit": 10.0,
        "applies_to_product_id": products[4]['id'] if len(products) > 4 else None,
        "start_date": now,
        "end_date": now + timedelta(days=30),
        "customer_groups": ["all"],
        "customer_ids": [],
        "product_ids": [],
        "is_active": True,
        "created_at": now,
        "updated_at": now
    })
    
    # Insert campaigns
    result = await db.campaigns.insert_many(campaigns)
    print(f"✅ Created {len(result.inserted_ids)} gelişmiş kampanyalar")
    
    # Print summary
    print("\n🎉 Kampanya Özeti:")
    for campaign in campaigns:
        campaign_type = campaign['campaign_type']
        
        if campaign_type == 'simple_discount':
            print(f"  ✅ {campaign['name']}: {campaign['discount_value']}% indirim")
        
        elif campaign_type == 'buy_x_get_y':
            applies_to = await db.products.find_one({"id": campaign.get('applies_to_product_id')})
            gift = await db.products.find_one({"id": campaign.get('gift_product_id')})
            applies_name = applies_to.get('name') if applies_to else 'Ürün'
            gift_name = gift.get('name') if gift else 'Hediye'
            print(f"  🎁 {campaign['name']}: {campaign['min_quantity']} {applies_name} → {campaign['gift_quantity']} {gift_name} HEDİYE")
        
        elif campaign_type == 'bulk_discount':
            applies_to = await db.products.find_one({"id": campaign.get('applies_to_product_id')})
            applies_name = applies_to.get('name') if applies_to else 'Ürün'
            print(f"  💰 {campaign['name']}: {campaign['bulk_min_quantity']}+ {applies_name} → Her birine {campaign['bulk_discount_per_unit']} TL indirim")
        
        print(f"      Geçerlilik: {campaign['start_date'].strftime('%Y-%m-%d')} - {campaign['end_date'].strftime('%Y-%m-%d')}")
        print(f"      Müşteri Grupları: {', '.join(campaign['customer_groups'])}")
    
    client.close()
    print("\n✨ Gelişmiş kampanya seeding tamamlandı!")

if __name__ == "__main__":
    asyncio.run(seed_advanced_campaigns())
