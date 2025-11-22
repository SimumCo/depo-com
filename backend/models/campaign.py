from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

class CampaignType(str, Enum):
    SIMPLE_DISCOUNT = "simple_discount"  # Basit indirim (yüzde veya sabit tutar)
    BUY_X_GET_Y = "buy_x_get_y"  # X al Y kazan
    BULK_DISCOUNT = "bulk_discount"  # Toplu alımda birim indirim

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
    
    # Campaign Type
    campaign_type: CampaignType = CampaignType.SIMPLE_DISCOUNT
    
    # Simple Discount Fields
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_value: float = 0  # Percentage (e.g., 10 for 10%) or fixed amount
    
    # Buy X Get Y Fields
    min_quantity: int = 0  # Minimum alım miktarı
    gift_product_id: Optional[str] = None  # Hediye ürün ID
    gift_quantity: int = 0  # Hediye miktar
    
    # Bulk Discount Fields
    bulk_min_quantity: int = 0  # Toplu alım için minimum miktar
    bulk_discount_per_unit: float = 0  # Her birime indirim tutarı (TL)
    
    # Common Fields
    applies_to_product_id: Optional[str] = None  # Hangi ürüne uygulanır (None = tümü)
    start_date: datetime
    end_date: datetime
    customer_groups: List[CustomerGroupType] = [CustomerGroupType.ALL]
    customer_ids: List[str] = []  # Specific customers (if CUSTOM group)
    product_ids: List[str] = []  # Empty = all products (for simple_discount only)
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
