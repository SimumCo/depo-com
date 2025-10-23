from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InventoryUpdate(BaseModel):
    product_id: str
    units_change: int
    expiry_date: Optional[datetime] = None
    location: Optional[str] = None
