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

async def seed_campaigns():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.distribution_db
    
    # Clear existing campaigns
    await db.campaigns.delete_many({})
    print("Cleared existing campaigns")
    
    now = datetime.now(timezone.utc)
    
    # Get some products for campaigns
    products = await db.products.find({"is_active": True}).limit(10).to_list(10)
    product_ids = [p['id'] for p in products] if products else []
    
    campaigns = [
        {
            "id": str(uuid.uuid4()),
            "name": "Kış Süt Ürünleri Kampanyası",
            "description": "Süt ürünlerinde %15 indirim",
            "discount_type": "percentage",
            "discount_value": 15,
            "start_date": now,
            "end_date": now + timedelta(days=30),
            "customer_groups": ["all"],
            "customer_ids": [],
            "product_ids": product_ids[:5] if product_ids else [],
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "VIP Müşteri Özel İndirimi",
            "description": "VIP müşterilerimize özel %20 indirim",
            "discount_type": "percentage",
            "discount_value": 20,
            "start_date": now,
            "end_date": now + timedelta(days=60),
            "customer_groups": ["vip"],
            "customer_ids": [],
            "product_ids": [],  # All products
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Toplu Alım Avantajı",
            "description": "Tüm ürünlerde 50 TL sabit indirim",
            "discount_type": "fixed_amount",
            "discount_value": 50,
            "start_date": now,
            "end_date": now + timedelta(days=45),
            "customer_groups": ["regular"],
            "customer_ids": [],
            "product_ids": [],
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Yeni Müşteri Hoş Geldin Kampanyası",
            "description": "Yeni müşterilerimize ilk siparişte %25 indirim",
            "discount_type": "percentage",
            "discount_value": 25,
            "start_date": now - timedelta(days=10),
            "end_date": now + timedelta(days=20),
            "customer_groups": ["new"],
            "customer_ids": [],
            "product_ids": product_ids[5:] if len(product_ids) > 5 else [],
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sezonluk İndirim (Sona Ermiş)",
            "description": "Geçmiş kampanya - artık aktif değil",
            "discount_type": "percentage",
            "discount_value": 10,
            "start_date": now - timedelta(days=60),
            "end_date": now - timedelta(days=10),
            "customer_groups": ["all"],
            "customer_ids": [],
            "product_ids": [],
            "is_active": False,
            "created_at": now - timedelta(days=60),
            "updated_at": now
        }
    ]
    
    # Insert campaigns
    result = await db.campaigns.insert_many(campaigns)
    print(f"✅ Created {len(result.inserted_ids)} campaigns")
    
    # Print summary
    print("\n🎉 Campaign Summary:")
    for campaign in campaigns:
        status = "✅ Active" if campaign['is_active'] and campaign['end_date'] > now else "❌ Inactive"
        discount_text = f"{campaign['discount_value']}%" if campaign['discount_type'] == 'percentage' else f"{campaign['discount_value']} TL"
        print(f"  {status} - {campaign['name']}: {discount_text} discount")
        print(f"      Period: {campaign['start_date'].strftime('%Y-%m-%d')} to {campaign['end_date'].strftime('%Y-%m-%d')}")
        print(f"      Groups: {', '.join(campaign['customer_groups'])}")
    
    client.close()
    print("\n✨ Campaign seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_campaigns())
