import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
import random

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def create_products_and_orders():
    print("🌱 20 Ürün ve Her Müşteri için 10 Sipariş Oluşturuluyor...")
    
    # Create 20 products
    print("\n📦 20 Ürün oluşturuluyor...")
    categories = ["Gıda", "İçecek", "Temizlik", "Kişisel Bakım", "Tekstil"]
    products = []
    
    for i in range(1, 21):
        product_id = str(uuid.uuid4())
        
        product = {
            "id": product_id,
            "name": f"Ürün {i}",
            "sku": f"PRD{i:03d}",
            "category": random.choice(categories),
            "weight": round(random.uniform(0.5, 5.0), 2),
            "units_per_case": random.choice([6, 12, 24]),
            "logistics_price": round(random.uniform(8.0, 25.0), 2),
            "dealer_price": round(random.uniform(10.0, 30.0), 2),
            "image_url": None,
            "description": f"Ürün {i} açıklaması",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.products.insert_one(product)
        products.append(product)
        
        # Create inventory
        inventory = {
            "id": str(uuid.uuid4()),
            "product_id": product_id,
            "total_units": random.randint(500, 5000),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(180, 365))).isoformat(),
            "last_supply_date": datetime.now(timezone.utc).isoformat(),
            "next_shipment_date": None,
            "is_out_of_stock": False,
            "location": f"Raf {random.randint(1, 10)}-{random.randint(1, 20)}",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.inventory.insert_one(inventory)
        
        if i % 5 == 0:
            print(f"  ✅ {i}/20 ürün oluşturuldu...")
    
    print(f"✅ Toplam 20 ürün oluşturuldu!")
    
    # Get all customers
    print("\n👥 Müşteriler getiriliyor...")
    customers = await db.users.find({"role": "customer"}, {"_id": 0}).to_list(1000)
    print(f"✅ {len(customers)} müşteri bulundu")
    
    # Create 10 orders for each customer
    print(f"\n📦 Her müşteri için 10 sipariş oluşturuluyor...")
    total_orders = 0
    statuses = ["pending", "approved", "preparing", "ready", "dispatched", "delivered"]
    
    for customer_idx, customer in enumerate(customers):
        customer_id = customer['id']
        channel_type = customer.get('channel_type', 'dealer')
        
        for order_num in range(10):
            # Random date in the last 30 days
            days_ago = random.randint(0, 30)
            order_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
            
            # Select 2-5 random products
            num_products = random.randint(2, 5)
            order_products = random.sample(products, num_products)
            
            order_items = []
            total_amount = 0.0
            
            for product in order_products:
                units = random.randint(5, 100)
                units_per_case = product.get('units_per_case', 12)
                cases = units // units_per_case
                
                # Get price based on channel
                if channel_type == "logistics":
                    unit_price = product.get('logistics_price', 10.0)
                else:
                    unit_price = product.get('dealer_price', 12.0)
                
                total_price = units * unit_price
                total_amount += total_price
                
                order_items.append({
                    "product_id": product['id'],
                    "product_name": product['name'],
                    "units": units,
                    "cases": cases,
                    "unit_price": unit_price,
                    "total_price": total_price
                })
            
            # Random status (older orders more likely to be delivered)
            if days_ago > 20:
                status = random.choice(["delivered", "delivered", "dispatched"])
            elif days_ago > 10:
                status = random.choice(["dispatched", "ready", "delivered"])
            elif days_ago > 5:
                status = random.choice(["preparing", "ready", "approved"])
            else:
                status = random.choice(["pending", "approved"])
            
            order = {
                "id": str(uuid.uuid4()),
                "order_number": f"ORD-{order_date.strftime('%Y%m%d')}-{total_orders+1:05d}",
                "customer_id": customer_id,
                "sales_rep_id": None,
                "channel_type": channel_type,
                "status": status,
                "products": order_items,
                "total_amount": total_amount,
                "notes": f"Sipariş {order_num + 1}/10",
                "approved_by": None,
                "prepared_by": None,
                "dispatched_date": (order_date + timedelta(days=1)).isoformat() if status in ["dispatched", "delivered"] else None,
                "delivered_date": (order_date + timedelta(days=2)).isoformat() if status == "delivered" else None,
                "created_at": order_date.isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.orders.insert_one(order)
            total_orders += 1
        
        print(f"  ✅ Müşteri {customer_idx+1}/{len(customers)}: {customer.get('full_name')} - 10 sipariş oluşturuldu")
    
    print(f"\n{'='*80}")
    print(f"✅ TAMAMLANDI!")
    print(f"{'='*80}")
    print(f"Oluşturulan ürün sayısı: 20")
    print(f"Toplam müşteri: {len(customers)}")
    print(f"Müşteri başına sipariş: 10")
    print(f"Toplam sipariş: {total_orders}")
    print(f"Zaman aralığı: Son 30 gün")
    print(f"{'='*80}")

if __name__ == "__main__":
    asyncio.run(create_products_and_orders())
    client.close()
