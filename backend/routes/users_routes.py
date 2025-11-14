"""
Users Management Routes
Admin için kullanıcı CRUD işlemleri
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from models.user import User, UserRole
from utils.auth import get_current_user, require_role, hash_password
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/users", tags=["Users Management"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.get("", response_model=List[dict])
async def get_all_users(
    role: Optional[str] = None,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Tüm kullanıcıları listele (Sadece Admin)
    """
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(length=1000)
    
    return users


@router.get("/{user_id}")
async def get_user_by_id(
    user_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Belirli bir kullanıcıyı getir (şifre hariç)
    """
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.post("/create")
async def create_user(
    user_data: dict,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Yeni kullanıcı oluştur
    """
    # Username kontrolü
    existing = await db.users.find_one({"username": user_data.get("username")})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Şifreyi hash'le
    if "password" in user_data:
        user_data["password_hash"] = hash_password(user_data["password"])
        del user_data["password"]
    else:
        raise HTTPException(status_code=400, detail="Password is required")
    
    # ID oluştur
    import uuid
    from datetime import datetime, timezone
    
    if "id" not in user_data:
        user_data["id"] = str(uuid.uuid4())
    
    if "created_at" not in user_data:
        user_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    if "is_active" not in user_data:
        user_data["is_active"] = True
    
    # Kaydet
    await db.users.insert_one(user_data)
    
    # Şifre olmadan döndür
    user_data.pop("password_hash", None)
    user_data.pop("_id", None)
    
    return {
        "message": "User created successfully",
        "user": user_data
    }


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    update_data: dict,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Kullanıcı bilgilerini güncelle
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Güncellenebilir alanlar
    allowed_fields = [
        'username', 'full_name', 'email', 'phone', 'role', 
        'is_active', 'address', 'customer_number', 'channel_type'
    ]
    
    update_fields = {}
    for key, value in update_data.items():
        if key in allowed_fields:
            update_fields[key] = value
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Username değişiyorsa kontrol et
    if 'username' in update_fields and update_fields['username'] != user.get('username'):
        existing = await db.users.find_one({"username": update_fields['username']})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
    
    # Güncelle
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_fields}
    )
    
    # Güncellenmiş kullanıcıyı getir
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    
    return {
        "message": "User updated successfully",
        "user": updated_user
    }


@router.put("/{user_id}/password")
async def change_user_password(
    user_id: str,
    password_data: dict,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Kullanıcı şifresini değiştir
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_password = password_data.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Şifreyi hash'le ve güncelle
    new_password_hash = hash_password(new_password)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": new_password_hash}}
    )
    
    return {
        "message": "Password changed successfully",
        "username": user.get("username")
    }


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Kullanıcıyı sil (soft delete - is_active=false)
    """
    # Kendini silmeye çalışıyor mu?
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": False}}
    )
    
    return {
        "message": "User deleted successfully (deactivated)",
        "username": user.get("username")
    }


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Kullanıcıyı aktif et
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": True}}
    )
    
    return {
        "message": "User activated successfully",
        "username": user.get("username")
    }


@router.get("/stats/summary")
async def get_users_stats(
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Kullanıcı istatistikleri
    """
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    inactive_users = await db.users.count_documents({"is_active": False})
    
    # Rol bazında sayım
    roles_pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    
    roles_cursor = db.users.aggregate(roles_pipeline)
    roles_data = await roles_cursor.to_list(length=None)
    
    role_counts = {}
    for item in roles_data:
        role_counts[item["_id"]] = item["count"]
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "by_role": role_counts
    }
