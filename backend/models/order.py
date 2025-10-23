from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class ChannelType(str, Enum):
    LOGISTICS = "logistics"
    DEALER = "dealer"

class OrderStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PREPARING = "preparing"
    READY = "ready"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_id: str
    sales_rep_id: Optional[str] = None
    channel_type: ChannelType
    status: OrderStatus = OrderStatus.PENDING
    products: List[Dict[str, Any]] = []
    total_amount: float = 0.0
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    prepared_by: Optional[str] = None
    dispatched_date: Optional[datetime] = None
    delivered_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
