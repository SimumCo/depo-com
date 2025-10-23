from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from models.order import ChannelType

class OrderCreate(BaseModel):
    customer_id: str
    channel_type: ChannelType
    products: List[Dict[str, Any]]
    notes: Optional[str] = None
