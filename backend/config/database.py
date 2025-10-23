from motor.motor_asyncio import AsyncIOMotorClient
from .settings import settings

class Database:
    client: AsyncIOMotorClient = None
    
    @classmethod
    def get_client(cls) -> AsyncIOMotorClient:
        if cls.client is None:
            cls.client = AsyncIOMotorClient(settings.MONGO_URL)
        return cls.client
    
    @classmethod
    def get_database(cls):
        client = cls.get_client()
        return client[settings.DB_NAME]
    
    @classmethod
    def close_connection(cls):
        if cls.client:
            cls.client.close()
            cls.client = None

db = Database.get_database()
