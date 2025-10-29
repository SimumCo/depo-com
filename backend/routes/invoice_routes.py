from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Dict, Any
from datetime import datetime
from models.invoice import Invoice, InvoiceCreate, InvoiceResponse, InvoiceProduct
from models.user import User, UserRole
from utils.auth import get_current_user, require_role
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
from bs4 import BeautifulSoup

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def parse_invoice_html(html_content: str) -> Dict[str, Any]:
    """HTML faturadan verileri çıkarır"""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract invoice data (bu basit bir örnek, gerçek HTML yapısına göre ayarlanmalı)
    invoice_data = {
        "invoice_number": "",
        "invoice_date": "",
        "customer_tax_id": "",
        "products": [],
        "subtotal": "0",
        "total_discount": "0",
        "total_tax": "0",
        "grand_total": "0"
    }
    
    # Parse HTML content
    text_content = soup.get_text()
    
    # Fatura numarası pattern: EE12025000004134
    invoice_num_match = re.search(r'EE\d+', text_content)
    if invoice_num_match:
        invoice_data["invoice_number"] = invoice_num_match.group()
    
    # Vergi numarası pattern: 10-11 digit number
    tax_id_match = re.search(r'\b\d{10,11}\b', text_content)
    if tax_id_match:
        invoice_data["customer_tax_id"] = tax_id_match.group()
    
    # Tarih pattern: DD MM YYYY
    date_match = re.search(r'\b(\d{1,2})\s+(\d{1,2})\s+(\d{4})\b', text_content)
    if date_match:
        invoice_data["invoice_date"] = f"{date_match.group(1)} {date_match.group(2)} {date_match.group(3)}"
    
    # Ürünler için tablo parse et (basitleştirilmiş)
    # Gerçek implementasyonda HTML yapısına göre detaylı parse yapılmalı
    
    # Toplam tutarlar
    amounts = re.findall(r'([\d\.]+,\d{2})\s*TL', text_content)
    if amounts:
        invoice_data["grand_total"] = amounts[-1] if amounts else "0"
    
    return invoice_data

@router.post("/upload", response_model=Dict[str, str])
async def upload_invoice(
    invoice_input: InvoiceCreate,
    current_user: User = Depends(require_role([UserRole.ACCOUNTING, UserRole.ADMIN]))
):
    """Muhasebe personeli HTML fatura yükler"""
    
    # HTML'den veri çıkar
    try:
        invoice_data = parse_invoice_html(invoice_input.html_content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"HTML parse error: {str(e)}")
    
    # Müşteri bul (vergi numarasına göre)
    customer = await db.users.find_one(
        {"customer_number": invoice_data["customer_tax_id"]},
        {"_id": 0}
    )
    
    # Invoice oluştur
    invoice_obj = Invoice(
        invoice_number=invoice_data["invoice_number"],
        invoice_date=invoice_data["invoice_date"],
        customer_tax_id=invoice_data["customer_tax_id"],
        customer_id=customer["id"] if customer else None,
        html_content=invoice_input.html_content,
        products=[InvoiceProduct(**p) for p in invoice_data["products"]],
        subtotal=invoice_data["subtotal"],
        total_discount=invoice_data["total_discount"],
        total_tax=invoice_data["total_tax"],
        grand_total=invoice_data["grand_total"],
        uploaded_by=current_user.id
    )
    
    doc = invoice_obj.model_dump()
    doc['uploaded_at'] = doc['uploaded_at'].isoformat()
    
    await db.invoices.insert_one(doc)
    
    return {
        "message": "Invoice uploaded successfully",
        "invoice_id": invoice_obj.id
    }

@router.get("/my-invoices", response_model=List[InvoiceResponse])
async def get_my_invoices(
    current_user: User = Depends(get_current_user)
):
    """Müşteri kendi faturalarını görür"""
    
    if current_user.role not in [UserRole.CUSTOMER]:
        raise HTTPException(status_code=403, detail="Only customers can access their invoices")
    
    # Müşterinin faturalarını getir
    cursor = db.invoices.find(
        {"customer_id": current_user.id, "is_active": True},
        {"_id": 0}
    ).sort("uploaded_at", -1)
    
    invoices = await cursor.to_list(length=None)
    
    # Response formatına çevir
    result = []
    for inv in invoices:
        if isinstance(inv.get('uploaded_at'), str):
            inv['uploaded_at'] = datetime.fromisoformat(inv['uploaded_at'])
        
        result.append(InvoiceResponse(
            id=inv["id"],
            invoice_number=inv["invoice_number"],
            invoice_date=inv["invoice_date"],
            grand_total=inv["grand_total"],
            product_count=len(inv.get("products", [])),
            uploaded_at=inv["uploaded_at"]
        ))
    
    return result

@router.get("/{invoice_id}", response_model=Invoice)
async def get_invoice_detail(
    invoice_id: str,
    current_user: User = Depends(get_current_user)
):
    """Fatura detayını getirir (HTML içeriği ile)"""
    
    invoice_doc = await db.invoices.find_one(
        {"id": invoice_id, "is_active": True},
        {"_id": 0}
    )
    
    if not invoice_doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Müşteri sadece kendi faturalarını görebilir
    if current_user.role == UserRole.CUSTOMER:
        if invoice_doc.get("customer_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Convert datetime
    if isinstance(invoice_doc.get('uploaded_at'), str):
        invoice_doc['uploaded_at'] = datetime.fromisoformat(invoice_doc['uploaded_at'])
    
    return Invoice(**invoice_doc)

@router.get("/all/list", response_model=List[InvoiceResponse])
async def get_all_invoices(
    current_user: User = Depends(require_role([UserRole.ACCOUNTING, UserRole.ADMIN]))
):
    """Muhasebe tüm faturaları görür"""
    
    cursor = db.invoices.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("uploaded_at", -1)
    
    invoices = await cursor.to_list(length=None)
    
    result = []
    for inv in invoices:
        if isinstance(inv.get('uploaded_at'), str):
            inv['uploaded_at'] = datetime.fromisoformat(inv['uploaded_at'])
        
        result.append(InvoiceResponse(
            id=inv["id"],
            invoice_number=inv["invoice_number"],
            invoice_date=inv["invoice_date"],
            grand_total=inv["grand_total"],
            product_count=len(inv.get("products", [])),
            uploaded_at=inv["uploaded_at"]
        ))
    
    return result
