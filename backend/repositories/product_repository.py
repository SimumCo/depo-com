"""
Product Repository
==================
Ürün ile ilgili tüm database operasyonları.
"""

from typing import Dict, List, Optional
from repositories.base_repository import BaseRepository, AsyncIOMotorDatabase


class ProductRepository(BaseRepository):
    """Repository for product operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "products")
    
    async def find_by_sku(self, sku: str) -> Optional[Dict]:
        """Find product by SKU"""
        return await self.find_one({"sku": sku, "is_active": True})
    
    async def find_by_category(self, category: str) -> List[Dict]:
        """Find products by category"""
        return await self.find_many(
            {"category": category, "is_active": True},
            sort=[("name", 1)]
        )
    
    async def get_all_products(self, active_only: bool = True) -> List[Dict]:
        """Get all products"""
        query = {}
        if active_only:
            query["is_active"] = True
        
        return await self.find_many(query, sort=[("name", 1)])
    
    async def create_product(self, product_data: Dict) -> str:
        """Create new product"""
        product_data["is_active"] = True
        return await self.insert_one(product_data)
    
    async def update_product(self, product_id: str, update_data: Dict) -> bool:
        """Update product"""
        return await self.update_one({"id": product_id}, update_data)
    
    async def deactivate_product(self, product_id: str) -> bool:
        """Deactivate product (soft delete)"""
        return await self.update_one({"id": product_id}, {"is_active": False})
    
    async def search_products(self, search_term: str) -> List[Dict]:
        """Search products by name or SKU"""
        return await self.find_many({
            "$or": [
                {"name": {"$regex": search_term, "$options": "i"}},
                {"sku": {"$regex": search_term, "$options": "i"}}
            ],
            "is_active": True
        })
