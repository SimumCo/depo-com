from pydantic import BaseModel
from typing import Optional

class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str
    weight: float
    units_per_case: int
    logistics_price: float = 0.0
    dealer_price: float = 0.0
    image_url: Optional[str] = None
    description: Optional[str] = None
