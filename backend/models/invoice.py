from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class InvoiceItem(BaseModel):
    product_name: str
    quantity: float
    unit: str
    unit_price: float
    total_price: float
    vat_rate: float = 0.0
    vat_amount: float = 0.0

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    invoice_number: str
    invoice_date: datetime
    supplier_name: Optional[str] = None
    supplier_tax_id: Optional[str] = None
    items: List[InvoiceItem] = []
    subtotal: float = 0.0
    vat_total: float = 0.0
    total_amount: float = 0.0
    file_url: Optional[str] = None
    file_type: Optional[str] = None  # pdf, image
    ocr_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PurchasePattern(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    product_name: str
    analysis_period: str  # monthly, quarterly, yearly
    total_quantity: float
    average_quantity_per_period: float
    frequency: int  # number of purchases
    last_purchase_date: Optional[datetime] = None
    predicted_next_purchase: Optional[datetime] = None
    trend: str = "stable"  # increasing, decreasing, stable
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
