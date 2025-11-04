"""
Invoice Repository
==================
Fatura ile ilgili tüm database operasyonları.
"""

from typing import Dict, List, Optional
from repositories.base_repository import BaseRepository, AsyncIOMotorDatabase


class InvoiceRepository(BaseRepository):
    """Repository for invoice operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "invoices")
    
    async def find_by_invoice_number(self, invoice_number: str) -> Optional[Dict]:
        """Find invoice by invoice number"""
        return await self.find_one({"invoice_number": invoice_number})
    
    async def find_by_customer(self, customer_id: str, limit: int = 50) -> List[Dict]:
        """Find invoices for a customer"""
        return await self.find_many(
            {"customer_id": customer_id, "is_active": True},
            sort=[("uploaded_at", -1)],
            limit=limit
        )
    
    async def find_by_tax_id(self, tax_id: str, limit: int = 50) -> List[Dict]:
        """Find invoices by customer tax ID"""
        return await self.find_many(
            {"customer_tax_id": tax_id, "is_active": True},
            sort=[("uploaded_at", -1)],
            limit=limit
        )
    
    async def get_all_invoices(self, limit: int = 100) -> List[Dict]:
        """Get all invoices"""
        return await self.find_many(
            {"is_active": True},
            sort=[("uploaded_at", -1)],
            limit=limit
        )
    
    async def create_invoice(self, invoice_data: Dict) -> str:
        """Create new invoice"""
        invoice_data["is_active"] = True
        return await self.insert_one(invoice_data)
    
    async def get_latest_invoice_for_customer(self, customer_id: str) -> Optional[Dict]:
        """Get latest invoice for a customer"""
        results = await self.find_many(
            {"customer_id": customer_id, "is_active": True},
            sort=[("uploaded_at", -1)],
            limit=1
        )
        return results[0] if results else None
    
    async def soft_delete_invoice(self, invoice_id: str) -> bool:
        """Soft delete invoice"""
        return await self.update_one({"id": invoice_id}, {"is_active": False})
