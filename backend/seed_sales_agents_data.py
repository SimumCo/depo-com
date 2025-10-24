import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import random

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Days of week
WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

# Sample customer company names
COMPANY_NAMES = [
    "A Market", "B Süpermarket", "C Restaurant", "D Otel", "E Cafe",
    "F Pastane", "G Lokanta", "H Market", "I AVM", "J Restoran",
    "K Otel", "L Kafe", "M Bakkal", "N Manav", "O Market",
    "P Restaurant", "R Süpermarket", "S Otel"
]

CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana"]

async def create_seed_data():
    print("🌱 Sales Agent ve Müşteri Seed Data Oluşturuluyor...")
    
    # Clear existing data
    print("🧹 Eski veriler temizleniyor...")
    await db.sales_routes.delete_many({})
    
    # Create Sales Agents (Plasiyer)
    print("👔 Sales Agent'lar oluşturuluyor...")
    sales_agents = []
    for i in range(1, 4):  # 3 plasiyer
        agent_id = str(uuid.uuid4())
        agent = {
            "id": agent_id,
            "username": f"plasiyer{i}",
            "password_hash": hash_password("plasiyer123"),
            "email": f"plasiyer{i}@example.com",
            "full_name": f"Plasiyer {i}",
            "role": "sales_agent",
            "customer_number": None,
            "channel_type": None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Check if already exists
        existing = await db.users.find_one({"username": agent['username']})
        if not existing:
            await db.users.insert_one(agent)
            sales_agents.append(agent)
            print(f"  ✅ {agent['full_name']} - Username: {agent['username']}, Password: plasiyer123")
        else:
            sales_agents.append(existing)
            print(f"  ⚠️ {agent['username']} zaten mevcut")
    
    # Create Customers (18 müşteri)
    print("\n👥 Müşteriler oluşturuluyor...")
    customers = []
    for i in range(1, 19):  # 18 müşteri
        customer_id = str(uuid.uuid4())
        channel_type = "logistics" if i % 2 == 0 else "dealer"  # Karışık
        
        customer = {
            "id": customer_id,
            "username": f"musteri{i}",
            "password_hash": hash_password("musteri123"),
            "email": f"musteri{i}@example.com",
            "full_name": f"Müşteri {i}",
            "role": "customer",
            "customer_number": f"CUST-{i:04d}",
            "channel_type": channel_type,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Check if already exists
        existing = await db.users.find_one({"username": customer['username']})
        if not existing:
            await db.users.insert_one(customer)
            customers.append(customer)
            
            # Create customer profile
            profile = {
                "id": str(uuid.uuid4()),
                "user_id": customer_id,
                "company_name": COMPANY_NAMES[i-1] if i <= len(COMPANY_NAMES) else f"Firma {i}",
                "phone": f"+90 555 {100+i:03d} {10+i:02d} {20+i:02d}",
                "address": f"Adres {i}, Sokak No: {i}",
                "city": random.choice(CITIES),
                "tax_number": f"{1000000000 + i}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.customer_profiles.insert_one(profile)
            
            print(f"  ✅ {customer['full_name']} ({COMPANY_NAMES[i-1] if i <= len(COMPANY_NAMES) else f'Firma {i}'}) - {channel_type} - Username: {customer['username']}, Password: musteri123")
        else:
            customers.append(existing)
            print(f"  ⚠️ {customer['username']} zaten mevcut")
    
    # Create Sales Routes (Her müşteri için bir route)
    print("\n🛣️ Sales Route'lar oluşturuluyor...")
    routes_by_day = {day: [] for day in WEEKDAYS}
    
    for i, customer in enumerate(customers):
        # Her plasiyere yaklaşık eşit sayıda müşteri dağıt
        agent_index = i % len(sales_agents)
        sales_agent = sales_agents[agent_index]
        
        # Günleri rastgele dağıt
        delivery_day = random.choice(WEEKDAYS)
        route_order = len(routes_by_day[delivery_day]) + 1
        routes_by_day[delivery_day].append(customer)
        
        route = {
            "id": str(uuid.uuid4()),
            "sales_agent_id": sales_agent['id'],
            "customer_id": customer['id'],
            "delivery_day": delivery_day,
            "route_order": route_order,
            "is_active": True,
            "notes": f"{sales_agent['full_name']} - {customer['full_name']}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.sales_routes.insert_one(route)
        
    print("  ✅ Route'lar oluşturuldu:")
    for day, customers_on_day in routes_by_day.items():
        print(f"    {day.capitalize()}: {len(customers_on_day)} müşteri")
    
    # Get some products for orders
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(10)
    if not products:
        print("\n⚠️ Ürün bulunamadı! Önce ürün oluşturmanız gerekiyor.")
        return
    
    # Create Sample Orders (10+ sipariş)
    print("\n📦 Örnek siparişler oluşturuluyor...")
    order_count = 0
    
    # Customer orders
    for i in range(10):
        customer = random.choice(customers)
        channel_type = customer.get('channel_type', 'logistics')
        
        # Select 2-4 random products
        num_products = random.randint(2, 4)
        order_products = random.sample(products, min(num_products, len(products)))
        
        order_items = []
        total_amount = 0.0
        
        for product in order_products:
            units = random.randint(10, 50)
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
        
        # Farklı statuslar
        statuses = ["pending", "approved", "preparing", "ready", "dispatched", "delivered"]
        status = random.choice(statuses)
        
        order = {
            "id": str(uuid.uuid4()),
            "order_number": f"ORD-{datetime.now().strftime('%Y%m%d')}-{order_count+1:04d}",
            "customer_id": customer['id'],
            "sales_rep_id": None,
            "channel_type": channel_type,
            "status": status,
            "products": order_items,
            "total_amount": total_amount,
            "notes": f"Müşteri siparişi - {customer.get('full_name')}",
            "approved_by": None,
            "prepared_by": None,
            "dispatched_date": None,
            "delivered_date": None,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7))).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.insert_one(order)
        order_count += 1
        print(f"  ✅ Sipariş {order_count}: {customer['full_name']} - {len(order_items)} ürün - {total_amount:.2f} TL - Status: {status}")
    
    # Sales agent warehouse orders
    for agent in sales_agents[:2]:  # İlk 2 plasiyer için depot siparişi
        channel_type = random.choice(["logistics", "dealer"])
        
        # Select 3-5 random products
        num_products = random.randint(3, 5)
        order_products = random.sample(products, min(num_products, len(products)))
        
        order_items = []
        total_amount = 0.0
        
        for product in order_products:
            units = random.randint(50, 200)  # Plasiyer daha fazla alır
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
        
        order = {
            "id": str(uuid.uuid4()),
            "order_number": f"WHS-{datetime.now().strftime('%Y%m%d')}-{order_count+1:04d}",
            "customer_id": agent['id'],  # Plasiyer kendisi için
            "sales_rep_id": agent['id'],
            "channel_type": channel_type,
            "status": "pending",
            "products": order_items,
            "total_amount": total_amount,
            "notes": f"Depot siparişi - {agent.get('full_name')}",
            "approved_by": None,
            "prepared_by": None,
            "dispatched_date": None,
            "delivered_date": None,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(0, 3))).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.insert_one(order)
        order_count += 1
        print(f"  ✅ Depot Siparişi {order_count}: {agent['full_name']} - {len(order_items)} ürün - {total_amount:.2f} TL")
    
    print(f"\n✅ Toplam {order_count} sipariş oluşturuldu!")
    
    print("\n" + "="*80)
    print("📊 ÖZET")
    print("="*80)
    print(f"Sales Agent (Plasiyer): {len(sales_agents)} kişi")
    print(f"Müşteri: {len(customers)} kişi")
    print(f"Sales Route: {len(customers)} route")
    print(f"Sipariş: {order_count} adet")
    print("\n🔐 GİRİŞ BİLGİLERİ:")
    print("  Plasiyer: plasiyer1 / plasiyer123")
    print("  Plasiyer: plasiyer2 / plasiyer123")
    print("  Plasiyer: plasiyer3 / plasiyer123")
    print("  Müşteri: musteri1 / musteri123")
    print("  Müşteri: musteri2 / musteri123")
    print("  ... (musteri3-18 hepsi aynı şifre)")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(create_seed_data())
    client.close()
