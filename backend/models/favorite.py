from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
import uuid

class Favorite(BaseModel):
    """Müşteri favori ürünleri - Maksimum 10 ürün"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Müşteri ID
    product_id: str  # Ürün ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FavoriteCreate(BaseModel):
    product_id: str

class FavoriteResponse(BaseModel):
    id: str
    user_id: str
    product_id: str
    product_name: str
    product_sku: str
    product_price: float
    product_category: str
    created_at: datetime
