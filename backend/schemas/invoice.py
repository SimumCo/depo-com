from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class InvoiceItemCreate(BaseModel):
    product_name: str
    quantity: float
    unit: str
    unit_price: float
    total_price: float
    vat_rate: float = 0.0
    vat_amount: float = 0.0

class InvoiceCreate(BaseModel):
    invoice_number: str
    invoice_date: datetime
    supplier_name: Optional[str] = None
    supplier_tax_id: Optional[str] = None
    items: List[InvoiceItemCreate]
    subtotal: float
    vat_total: float
    total_amount: float
    notes: Optional[str] = None

class InvoiceUpload(BaseModel):
    file_data: str  # base64 encoded file
    file_type: str  # pdf, jpg, png
