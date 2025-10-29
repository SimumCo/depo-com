from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def check():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Check sales_rep user
    sales_rep = await db.users.find_one({'role': 'sales_rep'})
    print('Sales Rep User:', sales_rep)
    
    # List all users with their roles
    cursor = db.users.find({}, {'username': 1, 'role': 1, 'full_name': 1, '_id': 0})
    users = await cursor.to_list(length=None)
    print('\nAll Users:')
    for user in users:
        print(f"  - {user.get('username')} ({user.get('role')}) - {user.get('full_name')}")

asyncio.run(check())
