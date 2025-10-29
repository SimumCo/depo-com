from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from dotenv import load_dotenv
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone

load_dotenv('/app/backend/.env')
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_sales_rep():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Check if sales_rep already exists
    existing = await db.users.find_one({'username': 'satistemsilcisi'})
    if existing:
        print('Sales rep already exists')
        return
    
    # Create sales_rep user
    sales_rep = {
        'id': str(uuid.uuid4()),
        'username': 'satistemsilcisi',
        'password_hash': pwd_context.hash('satis123'),
        'email': 'satis@example.com',
        'full_name': 'Satış Temsilcisi',
        'role': 'sales_rep',
        'customer_number': None,
        'channel_type': None,
        'is_active': True,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(sales_rep)
    print(f'Sales rep created: {sales_rep["username"]} / satis123')
    print(f'User ID: {sales_rep["id"]}')

asyncio.run(create_sales_rep())
