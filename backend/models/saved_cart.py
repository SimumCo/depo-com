from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import List, Dict, Any
import uuid

class SavedCart(BaseModel):
    """Kaydedilmiş sepet - Kullanıcı başına 1 adet"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    products: List[Dict[str, Any]] = []
    total_amount: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SavedCartCreate(BaseModel):
    products: List[Dict[str, Any]]
    total_amount: float

class SavedCartResponse(BaseModel):
    id: str
    user_id: str
    products: List[Dict[str, Any]]
    total_amount: float
    created_at: datetime
    updated_at: datetime
