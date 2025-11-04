"""
Customer Service
================
Müşteri ile ilgili business logic.
"""

from typing import Dict, Optional
from repositories.customer_repository import CustomerRepository
from repositories.base_repository import AsyncIOMotorDatabase
import random


class CustomerService:
    """Service for customer business logic"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.customer_repo = CustomerRepository(db)
    
    async def find_by_tax_id(self, tax_id: str) -> Optional[Dict]:
        """Find customer by tax ID"""
        return await self.customer_repo.find_by_tax_id(tax_id)
    
    async def create_customer_from_invoice(
        self, 
        customer_name: str, 
        tax_id: str,
        address: str = "",
        email: str = "",
        phone: str = ""
    ) -> Dict:
        """
        Create customer from invoice data with auto-generated username/password
        
        Returns:
            Dict with customer_id, username, password
        """
        # Generate username from name
        base_username = customer_name.lower()
        base_username = (base_username.replace(" ", "_")
                        .replace("ş", "s").replace("ğ", "g")
                        .replace("ü", "u").replace("ö", "o")
                        .replace("ç", "c").replace("ı", "i"))
        
        # Find next available number
        existing_customers = await self.customer_repo.find_many(
            {"username": {"$regex": f"^{base_username}"}},
            projection={"username": 1}
        )
        
        if existing_customers:
            numbers = []
            for c in existing_customers:
                username = c.get("username", "")
                if username.startswith(base_username):
                    try:
                        num = int(username.replace(base_username, "").replace("_", ""))
                        numbers.append(num)
                    except:
                        pass
            next_number = max(numbers) + 1 if numbers else 100
        else:
            next_number = 100
        
        username = f"{base_username}_{next_number}"
        password = f"musteri{next_number}"
        
        # Create customer
        customer_id = str(random.randint(100000, 999999))
        customer_data = {
            "id": customer_id,
            "username": username,
            "password_hash": self._hash_password(password),
            "full_name": customer_name,
            "email": email or f"{username}@example.com",
            "phone": phone,
            "role": "customer",
            "customer_number": tax_id,
            "channel_type": "dealer",
            "address": address,
            "is_active": True
        }
        
        await self.customer_repo.create_customer(customer_data)
        
        return {
            "customer_id": customer_id,
            "username": username,
            "password": password  # Plain password for user notification
        }
    
    def _hash_password(self, password: str) -> str:
        """Hash password (import from utils.auth)"""
        from utils.auth import hash_password
        return hash_password(password)
