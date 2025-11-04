"""
Customer Repository
===================
Müşteri ile ilgili tüm database operasyonları.
"""

from typing import Dict, List, Optional
from repositories.base_repository import BaseRepository, AsyncIOMotorDatabase


class CustomerRepository(BaseRepository):
    """Repository for customer operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "users")
    
    async def find_by_username(self, username: str) -> Optional[Dict]:
        """Find customer by username"""
        return await self.find_one({"username": username, "role": "customer"})
    
    async def find_by_tax_id(self, tax_id: str) -> Optional[Dict]:
        """Find customer by tax ID (Vergi No)"""
        return await self.find_one({"customer_number": tax_id})
    
    async def find_by_sales_rep(self, sales_rep_id: str) -> List[Dict]:
        """Find customers assigned to a sales rep"""
        return await self.find_many(
            {"assigned_sales_rep": sales_rep_id, "role": "customer"},
            sort=[("full_name", 1)]
        )
    
    async def find_by_delivery_day(self, delivery_day: str) -> List[Dict]:
        """Find customers by delivery day"""
        return await self.find_many(
            {"delivery_day": delivery_day, "role": "customer"},
            sort=[("full_name", 1)]
        )
    
    async def get_all_customers(self, active_only: bool = True) -> List[Dict]:
        """Get all customers"""
        query = {"role": "customer"}
        if active_only:
            query["is_active"] = True
        
        return await self.find_many(query, sort=[("full_name", 1)])
    
    async def create_customer(self, customer_data: Dict) -> str:
        """Create new customer"""
        customer_data["role"] = "customer"
        customer_data["is_active"] = True
        return await self.insert_one(customer_data)
    
    async def update_customer(self, customer_id: str, update_data: Dict) -> bool:
        """Update customer"""
        return await self.update_one({"id": customer_id}, update_data)
    
    async def deactivate_customer(self, customer_id: str) -> bool:
        """Deactivate customer (soft delete)"""
        return await self.update_one({"id": customer_id}, {"is_active": False})
