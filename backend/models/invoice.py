from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

class InvoiceProduct(BaseModel):
    """Faturadaki ürün bilgisi"""
    product_code: str
    product_name: str
    quantity: float
    unit_price: str
    total: str

class Invoice(BaseModel):
    """HTML Fatura Model"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    invoice_date: str  # Format: "DD MM YYYY"
    customer_name: Optional[str] = None  # Müşteri adı
    customer_tax_id: str
    customer_id: Optional[str] = None  # Link to user
    html_content: str  # Full HTML content
    products: List[InvoiceProduct]
    subtotal: str
    total_discount: str
    total_tax: str
    grand_total: str
    uploaded_by: str  # User ID of accounting staff
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class InvoiceCreate(BaseModel):
    """Fatura yükleme için input model"""
    html_content: str

class InvoiceResponse(BaseModel):
    """Fatura liste response"""
    id: str
    invoice_number: str
    invoice_date: str
    grand_total: str
    product_count: int
    uploaded_at: datetime
