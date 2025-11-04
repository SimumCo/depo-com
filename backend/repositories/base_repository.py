"""
Base Repository Pattern
=======================
Tüm repository'lerin extend edeceği temel sınıf.
CRUD operasyonları için generic implementasyon sağlar.
"""

from typing import Dict, List, Optional, Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os


class BaseRepository:
    """Generic repository for database operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        """
        Args:
            db: MongoDB database instance
            collection_name: Collection name in database
        """
        self.db = db
        self.collection = db[collection_name]
        self.collection_name = collection_name
    
    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict]:
        """Find single document"""
        return await self.collection.find_one(query, projection or {"_id": 0})
    
    async def find_many(
        self, 
        query: Dict[str, Any], 
        projection: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        skip: int = 0,
        sort: Optional[List[tuple]] = None
    ) -> List[Dict]:
        """Find multiple documents"""
        cursor = self.collection.find(query, projection or {"_id": 0})
        
        if sort:
            cursor = cursor.sort(sort)
        
        if skip > 0:
            cursor = cursor.skip(skip)
        
        if limit > 0:
            cursor = cursor.limit(limit)
        
        return await cursor.to_list(length=None)
    
    async def insert_one(self, document: Dict[str, Any]) -> str:
        """Insert single document"""
        result = await self.collection.insert_one(document)
        return str(result.inserted_id)
    
    async def insert_many(self, documents: List[Dict[str, Any]]) -> List[str]:
        """Insert multiple documents"""
        result = await self.collection.insert_many(documents)
        return [str(id) for id in result.inserted_ids]
    
    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> bool:
        """Update single document"""
        result = await self.collection.update_one(query, {"$set": update})
        return result.modified_count > 0
    
    async def update_many(self, query: Dict[str, Any], update: Dict[str, Any]) -> int:
        """Update multiple documents"""
        result = await self.collection.update_many(query, {"$set": update})
        return result.modified_count
    
    async def delete_one(self, query: Dict[str, Any]) -> bool:
        """Delete single document"""
        result = await self.collection.delete_one(query)
        return result.deleted_count > 0
    
    async def delete_many(self, query: Dict[str, Any]) -> int:
        """Delete multiple documents"""
        result = await self.collection.delete_many(query)
        return result.deleted_count
    
    async def count(self, query: Dict[str, Any] = {}) -> int:
        """Count documents"""
        return await self.collection.count_documents(query)
    
    async def exists(self, query: Dict[str, Any]) -> bool:
        """Check if document exists"""
        return await self.collection.count_documents(query, limit=1) > 0


def get_database() -> AsyncIOMotorDatabase:
    """Get MongoDB database instance"""
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]
