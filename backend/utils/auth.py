from passlib.context import CryptContext
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Import User model
try:
    from ..models.user import User, UserRole
except:
    # Fallback for when models are not yet available
    from pydantic import BaseModel
    from enum import Enum
    
    class UserRole(str, Enum):
        ADMIN = "admin"
        WAREHOUSE_MANAGER = "warehouse_manager"
        WAREHOUSE_STAFF = "warehouse_staff"
        SALES_REP = "sales_rep"
        CUSTOMER = "customer"
        ACCOUNTING = "accounting"
        SALES_AGENT = "sales_agent"
    
    class User(BaseModel):
        pass

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_doc is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Convert ISO strings back to datetime
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    # Import User class dynamically
    try:
        from ..models.user import User as UserModel
        return UserModel(**user_doc)
    except:
        # Return dict if model not available
        return user_doc

def require_role(allowed_roles: List[UserRole]):
    """Role-based access control"""
    async def role_checker(current_user = Depends(get_current_user)):
        # Handle both User object and dict
        user_role = current_user.role if hasattr(current_user, 'role') else current_user.get('role')
        
        if user_role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorized to perform this action")
        return current_user
    return role_checker
