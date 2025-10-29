# User models for authentication and user management
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
    ACCOUNTING = "accounting"
    SALES_AGENT = "sales_agent"  # Plasiyer

class ChannelType(str, Enum):
    LOGISTICS = "logistics"  # Hotels, Government
    DEALER = "dealer"  # Supermarkets, End-users

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    email: Optional[EmailStr] = None
    full_name: str
    role: UserRole
    customer_number: Optional[str] = None  # For customers only
    channel_type: Optional[ChannelType] = None  # For customers/sales reps
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    full_name: str
    role: UserRole
    customer_number: Optional[str] = None
    channel_type: Optional[ChannelType] = None

class UserLogin(BaseModel):
    username: str
    password: str
