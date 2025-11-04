from fastapi import APIRouter, HTTPException, Depends
from models.user import User, UserRole
from utils.auth import require_role
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/customers", tags=["Customer Lookup"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/lookup/{tax_id}")
async def lookup_customer_by_tax_id(
    tax_id: str,
    current_user: User = Depends(require_role([UserRole.ACCOUNTING, UserRole.ADMIN]))
):
    """Vergi numarasına göre müşteri bilgilerini getir"""
    
    # Vergi numarası ile müşteri ara
    customer = await db.users.find_one(
        {"customer_number": tax_id},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1, "address": 1, "customer_number": 1}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Bu vergi numarası ile kayıtlı müşteri bulunamadı")
    
    return {
        "found": True,
        "customer_name": customer.get("full_name", ""),
        "customer_tax_id": customer.get("customer_number", ""),
        "email": customer.get("email", ""),
        "phone": customer.get("phone", ""),
        "address": customer.get("address", "")
    }
