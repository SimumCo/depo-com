from fastapi import APIRouter, HTTPException, Depends
from models.user import User, UserRole
from utils.auth import require_role
from services.customer_service import CustomerService
from repositories.base_repository import get_database

router = APIRouter(prefix="/customers", tags=["Customer Lookup"])

@router.get("/lookup/{tax_id}")
async def lookup_customer_by_tax_id(
    tax_id: str,
    current_user: User = Depends(require_role([UserRole.ACCOUNTING, UserRole.ADMIN]))
):
    """Vergi numarasına göre müşteri bilgilerini getir"""
    
    db = get_database()
    customer_service = CustomerService(db)
    
    customer = await customer_service.find_by_tax_id(tax_id)
    
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
