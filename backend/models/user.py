from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid

class UserRole(str, Enum):
    ADMIN = "admin"
    WAREHOUSE_MANAGER = "warehouse_manager"
    WAREHOUSE_STAFF = "warehouse_staff"
    SALES_REP = "sales_rep"
    CUSTOMER = "customer"

class ChannelType(str, Enum):
    LOGISTICS = "logistics"
    DEALER = "dealer"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    email: Optional[EmailStr] = None
    full_name: str
    role: UserRole
    customer_number: Optional[str] = None
    channel_type: Optional[ChannelType] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
