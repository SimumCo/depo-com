from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List
from enum import Enum
import uuid

class FaultStatus(str, Enum):
    """Arıza durumu"""
    PENDING = "pending"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"

class FaultReport(BaseModel):
    """Arızalı ürün bildirimi"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    order_id: Optional[str] = None
    product_id: str
    description: str
    photos: List[str] = []  # Base64 encoded (max 3)
    status: FaultStatus = FaultStatus.PENDING
    admin_response: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

class FaultReportCreate(BaseModel):
    order_id: Optional[str] = None
    product_id: str
    description: str
    photos: List[str] = []

class FaultReportUpdate(BaseModel):
    status: FaultStatus
    admin_response: Optional[str] = None

class FaultReportResponse(BaseModel):
    id: str
    user_id: str
    order_id: Optional[str]
    product_id: str
    product_name: Optional[str]
    description: str
    photos: List[str]
    status: str
    admin_response: Optional[str]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
