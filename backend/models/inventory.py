from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class Inventory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    warehouse_id: Optional[str] = None  # Link to warehouse
    total_units: int = 0
    expiry_date: Optional[datetime] = None
    last_supply_date: Optional[datetime] = None
    next_shipment_date: Optional[datetime] = None
    is_out_of_stock: bool = False
    location: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
