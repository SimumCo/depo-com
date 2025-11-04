from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel
from models.invoice import Invoice, InvoiceProduct
from models.user import User, UserRole
from utils.auth import require_role
from services.invoice_service import InvoiceService
from repositories.base_repository import get_database

router = APIRouter(prefix="/invoices", tags=["Manual Invoices"])

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
    
    db = get_database()
    invoice_service = InvoiceService(db)
    
    result = await invoice_service.create_manual_invoice(
        customer_data=invoice_input.customer.model_dump(),
        invoice_data={
            "invoice_number": invoice_input.invoice_number,
            "invoice_date": invoice_input.invoice_date,
            "subtotal": invoice_input.subtotal,
            "total_discount": invoice_input.total_discount,
            "total_tax": invoice_input.total_tax,
            "grand_total": invoice_input.grand_total
        },
        products_data=[p.model_dump() for p in invoice_input.products],
        uploaded_by=current_user.id
    )
    
    response = {
        "message": "Manuel fatura başarıyla oluşturuldu",
        "invoice_id": result["invoice_id"],
        "customer_created": result["customer_created"],
        "products_created": result["products_created"]
    }
    
    if result["customer_info"]:
        response["customer_username"] = result["customer_info"]["username"]
        response["customer_password"] = result["customer_info"]["password"]
    
    return response
