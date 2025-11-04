from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from models.invoice import Invoice, InvoiceProduct
from models.user import User, UserRole
from models.product import Product
from utils.auth import get_current_user, require_role
from motor.motor_asyncio import AsyncIOMotorClient
import os
import random

router = APIRouter(prefix="/invoices", tags=["Manual Invoices"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Request models
class ManualInvoiceProduct(BaseModel):
    product_code: str
    product_name: str
    category: str
    quantity: float
    unit: str
    unit_price: str
    total: str

class ManualInvoiceCustomer(BaseModel):
    customer_name: str
    customer_tax_id: str
    address: str = ""
    email: str = ""
    phone: str = ""

class ManualInvoiceRequest(BaseModel):
    customer: ManualInvoiceCustomer
    invoice_number: str
    invoice_date: str
    products: List[ManualInvoiceProduct]
    subtotal: str
    total_discount: str = "0"
    total_tax: str
    grand_total: str

@router.post("/manual-entry")
async def create_manual_invoice(
    invoice_input: ManualInvoiceRequest,
    current_user: User = Depends(require_role([UserRole.ACCOUNTING, UserRole.ADMIN]))
):
    """Manuel fatura girişi - Yeni müşteri ve ürün otomatik oluşturur"""
    
    # 1. Müşteri kontrolü (vergi numarasına göre)
    customer = await db.users.find_one(
        {"customer_number": invoice_input.customer.customer_tax_id},
        {"_id": 0}
    )
    
    customer_id = None
    
    if not customer:
        # Yeni müşteri oluştur
        # Kullanıcı adı oluştur: isim + 3 haneli sayı
        base_username = invoice_input.customer.customer_name.lower()
        base_username = base_username.replace(" ", "_").replace("ş", "s").replace("ğ", "g").replace("ü", "u").replace("ö", "o").replace("ç", "c").replace("ı", "i")
        
        # Son 3 haneli sayı bul
        existing_customers = await db.users.find(
            {"username": {"$regex": f"^{base_username}"}},
            {"_id": 0, "username": 1}
        ).to_list(length=None)
        
        if existing_customers:
            # Mevcut numaraları bul
            numbers = []
            for c in existing_customers:
                username = c.get("username", "")
                if username.startswith(base_username):
                    try:
                        num = int(username.replace(base_username, ""))
                        numbers.append(num)
                    except:
                        pass
            next_number = max(numbers) + 1 if numbers else 100
        else:
            next_number = 100
        
        username = f"{base_username}{next_number}"
        password = f"musteri{next_number}"
        
        # Yeni müşteri kaydı
        customer_id = str(random.randint(100000, 999999))
        new_customer = {
            "id": customer_id,
            "username": username,
            "password": password,  # Production'da hash'lenmeli
            "full_name": invoice_input.customer.customer_name,
            "email": invoice_input.customer.email or f"{username}@example.com",
            "phone": invoice_input.customer.phone or "",
            "role": "customer",
            "customer_number": invoice_input.customer.customer_tax_id,
            "channel_type": "dealer",  # Default
            "address": invoice_input.customer.address or "",
            "is_active": True,
            "created_at": datetime.now().isoformat()
        }
        
        await db.users.insert_one(new_customer)
        print(f"✅ Yeni müşteri oluşturuldu: {username} / {password}")
    else:
        customer_id = customer["id"]
    
    # 2. Ürün kontrolü ve oluşturma
    created_products = []
    
    for product_input in invoice_input.products:
        # Ürün kodu ile kontrol
        product = await db.products.find_one(
            {"sku": product_input.product_code},
            {"_id": 0}
        )
        
        if not product:
            # Yeni ürün oluştur
            new_product = Product(
                name=product_input.product_name,
                sku=product_input.product_code,
                category=product_input.category,
                weight=1.0,  # Default
                units_per_case=1,  # Default
                logistics_price=0.0,
                dealer_price=0.0,
                is_active=True
            )
            
            await db.products.insert_one(new_product.model_dump())
            created_products.append(product_input.product_name)
            print(f"✅ Yeni ürün oluşturuldu: {product_input.product_name} ({product_input.product_code})")
    
    # 3. Fatura oluştur
    invoice_products = [
        InvoiceProduct(
            product_code=p.product_code,
            product_name=p.product_name,
            quantity=p.quantity,
            unit_price=p.unit_price,
            total=p.total
        ) for p in invoice_input.products
    ]
    
    invoice_obj = Invoice(
        invoice_number=invoice_input.invoice_number,
        invoice_date=invoice_input.invoice_date,
        customer_name=invoice_input.customer.customer_name,
        customer_tax_id=invoice_input.customer.customer_tax_id,
        customer_id=customer_id,
        html_content="",  # Manuel giriş için HTML yok
        products=invoice_products,
        subtotal=invoice_input.subtotal,
        total_discount=invoice_input.total_discount,
        total_tax=invoice_input.total_tax,
        grand_total=invoice_input.grand_total,
        uploaded_by=current_user.id
    )
    
    doc = invoice_obj.model_dump()
    doc['uploaded_at'] = doc['uploaded_at'].isoformat()
    
    await db.invoices.insert_one(doc)
    
    return {
        "message": "Manuel fatura başarıyla oluşturuldu",
        "invoice_id": invoice_obj.id,
        "customer_created": customer is None,
        "customer_username": username if customer is None else None,
        "customer_password": password if customer is None else None,
        "products_created": created_products
    }
