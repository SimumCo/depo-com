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

async def create_weekly_orders():
    print("🌱 Plasiyer1 için haftalık siparişler oluşturuluyor...")
    
    # Get plasiyer1
    plasiyer1 = await db.users.find_one({"username": "plasiyer1"})
    if not plasiyer1:
        print("❌ Plasiyer1 bulunamadı!")
        return
    
    print(f"✅ Plasiyer: {plasiyer1['full_name']} ({plasiyer1['id']})")
    
    # Get plasiyer1's customers from routes
    routes = await db.sales_routes.find({"sales_agent_id": plasiyer1['id'], "is_active": True}, {"_id": 0}).to_list(100)
    print(f"✅ {len(routes)} müşteri rotası bulundu")
    
    if not routes:
        print("❌ Plasiyer1'in müşterisi yok!")
        return
    
    # Get products
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(100)
    if not products:
        print("❌ Ürün bulunamadı!")
        return
    
    print(f"✅ {len(products)} ürün bulundu")
    
    # Create 20 orders for each customer (distributed over 7 days)
    total_orders = 0
    statuses = ["pending", "approved", "preparing", "ready", "dispatched", "delivered"]
    
    for route in routes:
        customer_id = route['customer_id']
        
        # Get customer info
        customer = await db.users.find_one({"id": customer_id})
        if not customer:
            continue
        
        channel_type = customer.get('channel_type', 'logistics')
        
        print(f"\n📦 {customer['full_name']} için siparişler oluşturuluyor...")
        
        # Create 20 orders for this customer (spread over 7 days)
        for order_num in range(20):
            # Random day in the past week
            days_ago = random.randint(0, 7)
            order_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
            
            # Select 2-5 random products
            num_products = random.randint(2, 5)
            order_products_list = random.sample(products, min(num_products, len(products)))
            
            order_items = []
            total_amount = 0.0
            
            for product in order_products_list:
                units = random.randint(5, 50)
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
            if days_ago > 5:
                status = random.choice(["delivered", "delivered", "dispatched"])
            elif days_ago > 3:
                status = random.choice(["dispatched", "ready", "delivered"])
            elif days_ago > 1:
                status = random.choice(["preparing", "ready", "approved"])
            else:
                status = random.choice(["pending", "approved"])
            
            order = {
                "id": str(uuid.uuid4()),
                "order_number": f"ORD-{order_date.strftime('%Y%m%d')}-{total_orders+1:04d}",
                "customer_id": customer_id,
                "sales_rep_id": None,  # Direct customer order
                "channel_type": channel_type,
                "status": status,
                "products": order_items,
                "total_amount": total_amount,
                "notes": f"Müşteri siparişi - {customer['full_name']} - {order_date.strftime('%d.%m.%Y')}",
                "approved_by": None,
                "prepared_by": None,
                "dispatched_date": (order_date + timedelta(days=1)).isoformat() if status in ["dispatched", "delivered"] else None,
                "delivered_date": (order_date + timedelta(days=2)).isoformat() if status == "delivered" else None,
                "created_at": order_date.isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.orders.insert_one(order)
            total_orders += 1
            
            if (order_num + 1) % 5 == 0:
                print(f"  ✅ {order_num + 1}/20 sipariş oluşturuldu...")
        
        print(f"  ✅ {customer['full_name']} için toplam 20 sipariş oluşturuldu")
    
    print(f"\n{'='*80}")
    print(f"✅ TOPLAM {total_orders} SİPARİŞ OLUŞTURULDU!")
    print(f"{'='*80}")
    print(f"Her müşteri için: 20 sipariş")
    print(f"Toplam müşteri: {len(routes)}")
    print(f"Zaman aralığı: Son 7 gün")
    print(f"{'='*80}")

if __name__ == "__main__":
    asyncio.run(create_weekly_orders())
    client.close()
