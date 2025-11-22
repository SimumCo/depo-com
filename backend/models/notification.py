from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class NotificationType(str, Enum):
    CRITICAL_STOCK = "critical_stock"
    LOW_STOCK = "low_stock"
    APPROVAL_PENDING = "approval_pending"
    SYSTEM = "system"
    ORDER_UPDATE = "order_update"
    CAMPAIGN_STARTED = "campaign_started"
    CAMPAIGN_ENDING = "campaign_ending"

class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: str
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.MEDIUM
    target_user_ids: List[str] = []  # Empty = all admins
    target_roles: List[str] = []  # ["admin", "accounting", etc.]
    is_read: bool = False
    read_by: List[str] = []  # User IDs who read it
    metadata: Optional[Dict[str, Any]] = {}  # Additional data (product_id, warehouse_id, etc.)
    action_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
