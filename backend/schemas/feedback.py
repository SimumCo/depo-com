from pydantic import BaseModel
from typing import Optional

class ProductFeedbackCreate(BaseModel):
    product_id: str
    order_id: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    is_defective: bool = False
    defect_description: Optional[str] = None
