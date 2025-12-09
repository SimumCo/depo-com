# Seed Warehouse Supervisor Data
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import uuid
import random

async def seed_warehouse_data():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['distribution_management']
    
    print("🏭 Depo verileri oluşturuluyor...")
    
    # 1. Sample Products
    products = [
        {"id": str(uuid.uuid4()), "name": "Süt", "code": "PRD-001", "barcode": "8690123456789", "category": "Süt Ürünleri", "unit": "litre", "unit_price": 25.0, "daily_average_sales": 50, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Yoğurt", "code": "PRD-002", "barcode": "8690123456790", "category": "Süt Ürünleri", "unit": "kg", "unit_price": 35.0, "daily_average_sales": 30, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Peynir", "code": "PRD-003", "barcode": "8690123456791", "category": "Süt Ürünleri", "unit": "kg", "unit_price": 120.0, "daily_average_sales": 20, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Ayran", "code": "PRD-004", "barcode": "8690123456792", "category": "İçecekler", "unit": "litre", "unit_price": 15.0, "daily_average_sales": 100, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Tereyağı", "code": "PRD-005", "barcode": "8690123456793", "category": "Süt Ürünleri", "unit": "kg", "unit_price": 180.0, "daily_average_sales": 5, "is_active": True},
    ]
    
    for product in products:
        existing = await db.products.find_one({"code": product["code"]})
        if not existing:
            await db.products.insert_one(product)
            print(f"  ✅ Ürün eklendi: {product['name']}")
    
    # 2. Stock Items (some critical, some normal)
    stock_items = []
    for product in products:
        # Critical stock simulation
        if product['name'] in ['Ayran', 'Tereyağı']:
            quantity = product['daily_average_sales'] * 2  # 2 days stock (critical)
        else:
            quantity = product['daily_average_sales'] * 10  # 10 days stock (safe)
        
        stock_item = {
            "id": str(uuid.uuid4()),
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": quantity,
            "unit": product["unit"],
            "status": "available",
            "location_code": f"A-0{random.randint(1,5)}-0{random.randint(1,9)}",
            "created_at": datetime.now()
        }
        
        existing_stock = await db.stock_items.find_one({"product_id": product["id"]})
        if not existing_stock:
            await db.stock_items.insert_one(stock_item)
            stock_items.append(stock_item)
            print(f"  📦 Stok eklendi: {product['name']} - {quantity} {product['unit']}")
    
    # 3. Sales Rep Orders (pending approval)
    sales_reps = ["Ahmet Yılmaz", "Mehmet Demir", "Ayşe Kara"]
    for i in range(3):
        order = {
            "id": str(uuid.uuid4()),
            "order_number": f"PLO-2025-{100 + i}",
            "sales_rep_name": sales_reps[i],
            "sales_rep_id": f"SR-{i+1}",
            "status": "pending_warehouse_approval",
            "items": [
                {"product_id": products[0]["id"], "product_name": products[0]["name"], "quantity": 20},
                {"product_id": products[1]["id"], "product_name": products[1]["name"], "quantity": 15}
            ],
            "total_amount": 20 * products[0]["unit_price"] + 15 * products[1]["unit_price"],
            "created_at": datetime.now() - timedelta(days=i),
            "is_active": True
        }
        
        existing = await db.sales_rep_orders.find_one({"order_number": order["order_number"]})
        if not existing:
            await db.sales_rep_orders.insert_one(order)
            print(f"  📋 Plasiyer siparişi eklendi: {order['order_number']}")
    
    # 4. Logistics Loading Requests
    for i in range(2):
        loading = {
            "id": str(uuid.uuid4()),
            "request_number": f"LOG-2025-{200 + i}",
            "scheduled_date": datetime.now() + timedelta(days=i+1),
            "destination": f"İstanbul - Bölge {i+1}",
            "items": [
                {"product_id": products[i]["id"], "product_name": products[i]["name"], "quantity": 100}
            ],
            "status": "pending",
            "created_at": datetime.now(),
            "is_active": True
        }
        
        existing = await db.logistics_loading_requests.find_one({"request_number": loading["request_number"]})
        if not existing:
            await db.logistics_loading_requests.insert_one(loading)
            print(f"  🚚 Lojistik yükleme talebi eklendi: {loading['request_number']}")
    
    # 5. Daily Product Entries (from factory)
    for i in range(5):
        entry = {
            "id": str(uuid.uuid4()),
            "transaction_number": f"FGI-2025-{300 + i}",
            "type": "finished_good_in",
            "source": "factory",
            "product_id": products[i % len(products)]["id"],
            "product_name": products[i % len(products)]["name"],
            "quantity": 500,
            "unit": products[i % len(products)]["unit"],
            "lot_number": f"LOT-2025-{100+i}",
            "batch_number": f"BATCH-2025-{100+i}",
            "transaction_date": datetime.now() - timedelta(days=i),
            "created_at": datetime.now() - timedelta(days=i)
        }
        
        existing = await db.warehouse_transactions.find_one({"transaction_number": entry["transaction_number"]})
        if not existing:
            await db.warehouse_transactions.insert_one(entry)
            print(f"  📥 Fabrika girişi eklendi: {entry['transaction_number']}")
    
    print("\n✅ Depo seed verileri başarıyla oluşturuldu!")

if __name__ == "__main__":
    asyncio.run(seed_warehouse_data())
