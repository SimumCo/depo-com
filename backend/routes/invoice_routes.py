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
    """HTML faturadan verileri çıkarır - SED ve EE formatlarını destekler"""
    # Fix encoding issues - try to decode properly
    try:
        # If content is bytes, decode it properly
        if isinstance(html_content, bytes):
            html_content = html_content.decode('utf-8')
        # Fix common encoding issues
        html_content = html_content.encode('latin1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        # If encoding fix fails, use original content
        pass
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract invoice data
    invoice_data = {
        "invoice_number": "",
        "invoice_date": "",
        "customer_name": "",
        "customer_tax_id": "",
        "products": [],
        "subtotal": "0",
        "total_discount": "0",
        "total_tax": "0",
        "grand_total": "0"
    }
    
    # Parse HTML content
    text_content = soup.get_text()
    
    # 1. FATURA NUMARASI - SED veya EE formatı
    # SED formatı: SED2025000000078
    invoice_num_match = re.search(r'(?:Fatura\s*No[:\s]*)?([A-Z]{2,3}\d{10,})', text_content, re.IGNORECASE)
    if invoice_num_match:
        invoice_data["invoice_number"] = invoice_num_match.group(1)
    
    # 2. MÜŞTERİ ADI - customerIDTable'dan
    customer_id_table = soup.find('table', {'id': 'customerIDTable'})
    if customer_id_table:
        # Tüm bold span'leri al, ikincisi müşteri adıdır (birincisi "SAYIN")
        bold_spans = customer_id_table.find_all('span', {'style': lambda x: x and 'font-weight:bold' in x})
        if len(bold_spans) >= 2:
            invoice_data["customer_name"] = bold_spans[1].get_text(strip=True)
    
    # Alternatif: Text içinde "ALICI" veya "MÜŞTERİ" anahtar kelimelerinden sonra gelen firma adı
    if not invoice_data["customer_name"]:
        # Büyük harflerle yazılmış uzun firma adı (genellikle ANONİM ŞİRKETİ ile biter)
        customer_match = re.search(r'ALICI[:\s]*([A-ZÇĞİÖŞÜ\s]+(?:ANONİM ŞİRKETİ|LİMİTED ŞİRKETİ|TİCARET|SANAYİ))', text_content, re.IGNORECASE)
        if customer_match:
            invoice_data["customer_name"] = customer_match.group(1).strip()
    
    # 3. VERGİ NUMARASI - customerIDTable'dan veya VKN: pattern
    if customer_id_table:
        vkn_cell = customer_id_table.find('td', string=re.compile(r'VKN:?\s*\d{10}'))
        if vkn_cell:
            vkn_match = re.search(r'VKN:?\s*(\d{10,11})', vkn_cell.get_text())
            if vkn_match:
                invoice_data["customer_tax_id"] = vkn_match.group(1)
    
    # Alternatif: Text'ten VKN pattern
    if not invoice_data["customer_tax_id"]:
        tax_id_match = re.search(r'VKN[:\s]*(\d{10,11})', text_content)
        if tax_id_match:
            invoice_data["customer_tax_id"] = tax_id_match.group(1)
        else:
            # Son çare: 10-11 haneli sayı bul (ama dikkatli ol, fiyatlarla karışabilir)
            tax_matches = re.findall(r'\b(\d{10,11})\b', text_content)
            if tax_matches:
                invoice_data["customer_tax_id"] = tax_matches[0]
    
    # 4. FATURA TARİHİ - despatchTable'dan
    despatch_table = soup.find('table', {'id': 'despatchTable'})
    if despatch_table:
        date_cells = despatch_table.find_all('td')
        for i, cell in enumerate(date_cells):
            if 'Fatura Tarihi' in cell.get_text():
                if i + 1 < len(date_cells):
                    date_text = date_cells[i + 1].get_text(strip=True)
                    # Format: 27-10-2025 -> 27 10 2025
                    date_match = re.search(r'(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})', date_text)
                    if date_match:
                        invoice_data["invoice_date"] = f"{date_match.group(1)} {date_match.group(2)} {date_match.group(3)}"
                    break
    
    # Alternatif tarih pattern
    if not invoice_data["invoice_date"]:
        date_match = re.search(r'(?:Fatura\s*Tarihi[:\s]*)?(\d{1,2})[-/\.\s](\d{1,2})[-/\.\s](\d{4})', text_content)
        if date_match:
            invoice_data["invoice_date"] = f"{date_match.group(1)} {date_match.group(2)} {date_match.group(3)}"
    
    # 5. ÜRÜN BİLGİLERİ - lineTable'dan
    line_table = soup.find('table', {'id': 'lineTable'})
    if line_table:
        rows = line_table.find_all('tr')
        
        for row in rows:
            cells = row.find_all('td')
            
            # Header satırı veya az hücreli satırları atla
            if len(cells) < 6:
                continue
            
            # Header kontrolü
            row_text = row.get_text().lower()
            if 'ürün' in row_text and 'hizmet' in row_text and 'kod' in row_text:
                continue
            
            # Ürün bilgilerini çıkar
            # Tipik yapı: Sıra No | Ürün Kodu | Ürün Adı | Miktar | Birim | Birim Fiyat | ... | Tutar | KDV | ...
            try:
                product_code = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                product_name = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                quantity_text = cells[3].get_text(strip=True) if len(cells) > 3 else "0"
                unit_price_text = cells[5].get_text(strip=True) if len(cells) > 5 else "0"
                total_text = cells[8].get_text(strip=True) if len(cells) > 8 else "0"
                
                # Miktar değerini temizle - sadece rakamları al
                import re as regex
                quantity_match = regex.search(r'(\d+)', quantity_text)
                quantity = float(quantity_match.group(1)) if quantity_match else 0.0
                
                # Ürün adı ve kodu boş değilse ekle
                if product_name and len(product_name) > 2:
                    invoice_data["products"].append({
                        "product_code": product_code,
                        "product_name": product_name,
                        "quantity": quantity,
                        "unit_price": unit_price_text,
                        "total": total_text
                    })
            except (IndexError, ValueError) as e:
                # Bu satırı atla
                continue
    
    # 6. TOPLAM TUTARLAR - budgetContainerTable'dan
    budget_table = soup.find('table', {'id': 'budgetContainerTable'})
    if budget_table:
        budget_text = budget_table.get_text()
        
        # Mal Hizmet Toplam Tutarı (Subtotal)
        subtotal_match = re.search(r'Mal\s+Hizmet\s+Toplam\s+Tutarı[:\s]*([\d\.,]+)\s*TL', budget_text, re.IGNORECASE)
        if subtotal_match:
            invoice_data["subtotal"] = subtotal_match.group(1)
        
        # Toplam İskonto
        discount_match = re.search(r'Toplam\s+İskonto[:\s]*([\d\.,]+)\s*TL', budget_text, re.IGNORECASE)
        if discount_match:
            invoice_data["total_discount"] = discount_match.group(1)
        
        # KDV Tutarı
        tax_match = re.search(r'(?:KDV|Vergi)[:\s]*([\d\.,]+)\s*TL', budget_text, re.IGNORECASE)
        if tax_match:
            invoice_data["total_tax"] = tax_match.group(1)
        
        # Ödenecek Tutar (Grand Total)
        grand_match = re.search(r'Ödenecek\s+Tutar[:\s]*([\d\.,]+)\s*TL', budget_text, re.IGNORECASE)
        if grand_match:
            invoice_data["grand_total"] = grand_match.group(1)
    
    # Alternatif: Text'ten son TL değeri
    if invoice_data["grand_total"] == "0":
        amounts = re.findall(r'([\d\.]+,\d{2})\s*TL', text_content)
        if amounts:
            invoice_data["grand_total"] = amounts[-1]
    
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
        customer_name=invoice_data.get("customer_name", ""),
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
            customer_name=inv.get("customer_name"),
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
            customer_name=inv.get("customer_name"),
            grand_total=inv["grand_total"],
            product_count=len(inv.get("products", [])),
            uploaded_at=inv["uploaded_at"]
        ))
    
    return result
