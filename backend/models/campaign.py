from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"

class CustomerGroupType(str, Enum):
    ALL = "all"
    VIP = "vip"
    REGULAR = "regular"
    NEW = "new"
    CUSTOM = "custom"

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_value: float  # Percentage (e.g., 10 for 10%) or fixed amount
    start_date: datetime
    end_date: datetime
    customer_groups: List[CustomerGroupType] = [CustomerGroupType.ALL]
    customer_ids: List[str] = []  # Specific customers (if CUSTOM group)
    product_ids: List[str] = []  # Empty = all products
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
