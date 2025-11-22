from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models.favorite import Favorite, FavoriteCreate, FavoriteResponse
from models.user import User
from utils.auth import get_current_user
import uuid

router = APIRouter(prefix="/favorites", tags=["Favorites"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'distribution_management')]

MAX_FAVORITES = 10

@router.get("", response_model=List[FavoriteResponse])
async def get_favorites(current_user: User = Depends(get_current_user)):
    cursor = db.favorites.find({"user_id": current_user.id}, {"_id": 0}).sort("created_at", -1)
    favorites = await cursor.to_list(length=MAX_FAVORITES)
    
    result = []
    for fav in favorites:
        product = await db.products.find_one({"id": fav["product_id"]}, {"_id": 0})
        if product:
            result.append({
                "id": fav["id"],
                "user_id": fav["user_id"],
                "product_id": fav["product_id"],
                "product_name": product.get("name", ""),
                "product_sku": product.get("sku", ""),
                "product_price": product.get("price", 0.0),
                "product_category": product.get("category", ""),
                "created_at": fav["created_at"]
            })
    
    return result

@router.post("", response_model=dict)
async def add_favorite(
    favorite_data: FavoriteCreate,
    current_user: User = Depends(get_current_user)
):
    count = await db.favorites.count_documents({"user_id": current_user.id})
    if count >= MAX_FAVORITES:
        raise HTTPException(
            status_code=400, 
            detail=f"Maksimum {MAX_FAVORITES} ürün favorilere eklenebilir"
        )
    
    product = await db.products.find_one({"id": favorite_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    existing = await db.favorites.find_one({
        "user_id": current_user.id,
        "product_id": favorite_data.product_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Ürün zaten favorilerde")
    
    new_favorite = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "product_id": favorite_data.product_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.favorites.insert_one(new_favorite)
    
    return {
        "message": "Ürün favorilere eklendi",
        "favorite_id": new_favorite["id"],
        "product_name": product.get("name")
    }

@router.delete("/{product_id}")
async def remove_favorite(
    product_id: str,
    current_user: User = Depends(get_current_user)
):
    result = await db.favorites.delete_one({
        "user_id": current_user.id,
        "product_id": product_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favori bulunamadı")
    
    return {"message": "Ürün favorilerden çıkarıldı"}

@router.post("/toggle/{product_id}")
async def toggle_favorite(
    product_id: str,
    current_user: User = Depends(get_current_user)
):
    existing = await db.favorites.find_one({
        "user_id": current_user.id,
        "product_id": product_id
    })
    
    if existing:
        await db.favorites.delete_one({"id": existing["id"]})
        return {"message": "Favorilerden çıkarıldı", "is_favorite": False}
    else:
        count = await db.favorites.count_documents({"user_id": current_user.id})
        if count >= MAX_FAVORITES:
            raise HTTPException(
                status_code=400,
                detail=f"Maksimum {MAX_FAVORITES} ürün favorilere eklenebilir"
            )
        
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
        new_favorite = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "product_id": product_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.favorites.insert_one(new_favorite)
        
        return {
            "message": "Favorilere eklendi",
            "is_favorite": True,
            "product_name": product.get("name")
        }

@router.get("/check/{product_id}")
async def check_favorite(
    product_id: str,
    current_user: User = Depends(get_current_user)
):
    exists = await db.favorites.find_one({
        "user_id": current_user.id,
        "product_id": product_id
    })
    
    return {"is_favorite": exists is not None}
