from pydantic import BaseModel
from typing import Optional

class CustomerProfileCreate(BaseModel):
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    tax_number: Optional[str] = None
