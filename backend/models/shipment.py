from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class ShipmentStatus(str, Enum):
    EXPECTED = "expected"
    ARRIVED = "arrived"
    PROCESSED = "processed"

class IncomingShipment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shipment_number: str
    expected_date: datetime
    arrival_date: Optional[datetime] = None
    status: ShipmentStatus = ShipmentStatus.EXPECTED
    products: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    processed_by: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
