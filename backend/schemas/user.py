from pydantic import BaseModel, EmailStr
from typing import Optional
from models.user import UserRole, ChannelType

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
