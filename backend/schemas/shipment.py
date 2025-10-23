from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class IncomingShipmentCreate(BaseModel):
    shipment_number: str
    expected_date: datetime
    products: List[Dict[str, Any]]
    notes: Optional[str] = None
