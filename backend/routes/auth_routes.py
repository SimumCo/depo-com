from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime
from models.user import User, UserCreate, UserLogin, UserRole
from utils.auth import (
    hash_password, 
    verify_password, 
    create_access_token,
    get_current_user,
    require_role
)
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/auth", tags=["Authentication"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.post("/register", response_model=Dict[str, str])
async def register(user_input: UserCreate):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_input.username}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create user
    user_dict = user_input.model_dump()
    password = user_dict.pop("password")
    user_dict["password_hash"] = hash_password(password)
    
    user_obj = User(**user_dict)
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    return {"message": "User registered successfully", "user_id": user_obj.id, "username": user_obj.username}

@router.post("/create-user", response_model=Dict[str, str])
async def create_user(
    user_input: UserCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SALES_REP]))
):
    """
    Satış temsilcisi veya admin tarafından yeni kullanıcı oluşturma.
    Satış temsilcisi sadece müşteri (customer) hesabı oluşturabilir.
    Admin tüm rol türlerinde kullanıcı oluşturabilir.
    """
    # Satış temsilcisi sadece müşteri oluşturabilir
    if current_user.role == UserRole.SALES_REP:
        if user_input.role != UserRole.CUSTOMER:
            raise HTTPException(
                status_code=403, 
                detail="Satış temsilcisi sadece müşteri hesabı oluşturabilir"
            )
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_input.username}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten kullanılıyor")
    
    # Create user
    user_dict = user_input.model_dump()
    password = user_dict.pop("password")
    user_dict["password_hash"] = hash_password(password)
    
    user_obj = User(**user_dict)
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    return {
        "message": "Kullanıcı başarıyla oluşturuldu",
        "user_id": user_obj.id,
        "username": user_obj.username,
        "role": user_obj.role.value
    }

@router.post("/login")
async def login(credentials: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password
    if not verify_password(credentials.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Check if active
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is deactivated")
    
    # Create access token
    access_token = create_access_token(data={"sub": user_doc["id"], "role": user_doc["role"]})
    
    # Convert datetime for response
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user_obj = User(**user_doc)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_obj.model_dump(exclude={"password_hash"})
    }

@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
