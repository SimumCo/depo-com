import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timedelta

async def debug_consumption():
    # MongoDB bağlantısı
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'distribution_management')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=== MÜŞTERI KONTROL ===")
    customers = await db.users.find({"role": "customer"}).to_list(length=5)
    print(f"Toplam müşteri (ilk 5): {len(customers)}")
    for c in customers:
        print(f"  - ID: {c.get('id')}, VKN: {c.get('customer_number')}, Ad: {c.get('full_name')}")
    
    print("\n=== FATURA KONTROL ===")
    invoices = await db.invoices.find({}).to_list(length=5)
    print(f"Toplam fatura (ilk 5): {len(invoices)}")
    for inv in invoices:
        print(f"  - No: {inv.get('invoice_number')}, VKN: {inv.get('customer_tax_id')}, Tarih: {inv.get('invoice_date')}, Ürün sayısı: {len(inv.get('products', []))}")
    
    print("\n=== ÜRÜN KONTROL ===")
    products = await db.products.find({}).to_list(length=5)
    print(f"Toplam ürün (ilk 5): {len(products)}")
    for p in products:
        print(f"  - ID: {p.get('id')}, Code: {p.get('code')}, Name: {p.get('name')}")
    
    # Müşteri ve fatura eşleştirme testi
    if customers and invoices:
        print("\n=== EŞLEŞTIRME TESTİ ===")
        customer = customers[0]
        customer_tax_id = customer.get('customer_number', '').strip()
        print(f"Test Müşteri VKN: [{customer_tax_id}]")
        
        matching_invoices = await db.invoices.find({
            "customer_tax_id": customer_tax_id
        }).to_list(length=None)
        
        print(f"Eşleşen fatura sayısı: {len(matching_invoices)}")
        
        if matching_invoices:
            inv = matching_invoices[0]
            print(f"  Fatura: {inv.get('invoice_number')}, Tarih: {inv.get('invoice_date')}")
            print(f"  Ürünler:")
            for item in inv.get('products', [])[:3]:
                print(f"    - {item.get('product_name')} (Miktar: {item.get('quantity')})")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_consumption())
