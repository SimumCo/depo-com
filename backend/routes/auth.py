from fastapi import APIRouter, HTTPException, Depends
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Dict
from models.user import User
from schemas.user import UserCreate, UserLogin
from utils.security import hash_password, verify_password, create_access_token, validate_password
from middleware.auth import get_current_user
from config.database import db
from config.settings import settings
import logging

router = APIRouter(prefix="/auth")
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

@router.post("/register", response_model=Dict[str, str])
async def register(user_input: UserCreate):
    """Register a new user"""
    # Validate password strength
    is_valid, message = validate_password(user_input.password)
    if not is_valid:
        logger.warning(f"Registration failed - weak password for user: {user_input.username}")
        raise HTTPException(status_code=400, detail=message)
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_input.username}, {"_id": 0})
    if existing_user:
        logger.warning(f"Registration failed - username already exists: {user_input.username}")
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create user
    user_dict = user_input.model_dump()
    password = user_dict.pop("password")
    user_dict["password_hash"] = hash_password(password)
    
    user_obj = User(**user_dict)
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    logger.info(f"New user registered: {user_obj.username} (Role: {user_obj.role})")
    return {"message": "User registered successfully", "user_id": user_obj.id}

@router.post("/login")
@limiter.limit(settings.LOGIN_RATE_LIMIT)
async def login(credentials: UserLogin):
    """Login and get access token"""
    # Find user
    user_doc = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user_doc:
        logger.warning(f"Login failed - user not found: {credentials.username}")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password
    if not verify_password(credentials.password, user_doc["password_hash"]):
        logger.warning(f"Login failed - incorrect password for user: {credentials.username}")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Check if active
    if not user_doc.get("is_active", True):
        logger.warning(f"Login failed - account deactivated: {credentials.username}")
        raise HTTPException(status_code=401, detail="User account is deactivated")
    
    # Create access token
    access_token = create_access_token(data={"sub": user_doc["id"], "role": user_doc["role"]})
    
    # Convert datetime for response
    if isinstance(user_doc.get('created_at'), str):
        from datetime import datetime
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user_obj = User(**user_doc)
    
    logger.info(f"Successful login: {credentials.username} (Role: {user_obj.role})")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_obj.model_dump(exclude={"password_hash"})
    }

@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user
