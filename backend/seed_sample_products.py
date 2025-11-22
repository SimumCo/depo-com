import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

async def seed_products():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.distribution_db
    
    products = [
        {
            "id": str(uuid.uuid4()),
            "sku": "SUZME-YOGURT-5KG",
            "name": "Süzme Yoğurt 5 KG",
            "description": "Tam yağlı süzme yoğurt",
            "category": "Yoğurt",
            "price": 250.0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "sku": "AYRAN-250ML",
            "name": "Ayran 250 ML (Koli - 24 Adet)",
            "description": "Geleneksel ayran",
            "category": "Ayran",
            "price": 120.0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "sku": "SUT-1L",
            "name": "Tam Yağlı Süt 1L (Koli - 12 Adet)",
            "description": "Pastörize tam yağlı süt",
            "category": "Süt",
            "price": 180.0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "sku": "BEYAZ-PEYNIR-1KG",
            "name": "Beyaz Peynir 1 KG",
            "description": "Tam yağlı beyaz peynir",
            "category": "Peynir",
            "price": 320.0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "sku": "TEREYAG-500G",
            "name": "Tereyağı 500 GR",
            "description": "Saf tereyağı",
            "category": "Tereyağı",
            "price": 280.0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    result = await db.products.insert_many(products)
    print(f"✅ {len(result.inserted_ids)} ürün oluşturuldu")
    
    for product in products:
        print(f"  - {product['name']}: {product['price']} TL")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_products())
