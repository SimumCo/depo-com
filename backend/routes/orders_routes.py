from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models.order import Order, OrderStatus
from models.saved_cart import SavedCart, SavedCartCreate, SavedCartResponse
from models.user import User, UserRole
from utils.auth import get_current_user, require_role
import uuid

router = APIRouter(prefix="/orders", tags=["Orders"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'distribution_management')]

@router.get("", response_model=List[dict])
async def get_orders(
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Müşterinin siparişlerini getir
    - Customer: Sadece kendi siparişleri
    - Sales Agent: Kendi müşterilerinin siparişleri
    - Admin/Accounting: Tüm siparişler
    """
    query = {}
    
    # Role-based filtering
    if current_user.role == UserRole.CUSTOMER:
        query["customer_id"] = current_user.id
    elif current_user.role == UserRole.SALES_AGENT:
        query["sales_rep_id"] = current_user.id
    
    if status:
        query["status"] = status
    
    cursor = db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    orders = await cursor.to_list(length=limit)
    
    return orders

@router.get("/last", response_model=dict)
async def get_last_order(current_user: User = Depends(get_current_user)):
    """Son tamamlanmış siparişi getir (tekrar sipariş için)"""
    last_order = await db.orders.find_one(
        {
            "customer_id": current_user.id,
            "status": {"$in": ["delivered", "dispatched"]}
        },
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if not last_order:
        raise HTTPException(status_code=404, detail="Henüz tamamlanmış sipariş bulunamadı")
    
    return last_order

@router.get("/{order_id}", response_model=dict)
async def get_order_detail(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Sipariş detayını getir"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    
    # Authorization check
    if current_user.role == UserRole.CUSTOMER and order.get("customer_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Bu siparişe erişim yetkiniz yok")
    
    return order

@router.post("", response_model=dict)
async def create_order(
    order_data: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Yeni sipariş oluştur
    Sipariş oluşturulunca otomatik bildirim gönderilir
    """
    # Generate order number
    order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    # Create order
    new_order = {
        "id": str(uuid.uuid4()),
        "order_number": order_number,
        "customer_id": current_user.id,
        "sales_rep_id": order_data.get("sales_rep_id"),
        "channel_type": order_data.get("channel_type", "dealer"),
        "status": "pending",
        "products": order_data.get("products", []),
        "total_amount": order_data.get("total_amount", 0.0),
        "notes": order_data.get("notes"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(new_order)
    
    # Kaydedilmiş sepeti temizle
    await db.saved_carts.delete_one({"user_id": current_user.id})
    
    # Bildirim oluştur
    try:
        from services.notification_service import create_order_notification
        await create_order_notification(new_order["id"], current_user.id, order_number)
    except:
        pass  # Bildirim hatası siparişi engellemez
    
    new_order.pop('_id', None)
    return new_order

@router.post("/reorder/{order_id}", response_model=dict)
async def reorder(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Son siparişi tekrar oluştur"""
    # Get original order
    original_order = await db.orders.find_one(
        {
            "id": order_id,
            "customer_id": current_user.id
        },
        {"_id": 0}
    )
    
    if not original_order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    
    # Generate new order number
    order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    # Create new order with same products
    new_order = {
        "id": str(uuid.uuid4()),
        "order_number": order_number,
        "customer_id": current_user.id,
        "sales_rep_id": original_order.get("sales_rep_id"),
        "channel_type": original_order.get("channel_type", "dealer"),
        "status": "pending",
        "products": original_order.get("products", []),
        "total_amount": original_order.get("total_amount", 0.0),
        "notes": f"Tekrar sipariş: {original_order.get('order_number')}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(new_order)
    
    # Bildirim oluştur
    try:
        from services.notification_service import create_order_notification
        await create_order_notification(new_order["id"], current_user.id, order_number)
    except:
        pass
    
    new_order.pop('_id', None)
    return new_order

@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.SALES_AGENT]))
):
    """Sipariş durumunu güncelle (sadece yetkili kullanıcılar)"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    
    # Update status
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Durum değişikliği bildirimi
    try:
        from services.notification_service import create_status_change_notification
        await create_status_change_notification(order_id, order.get("customer_id"), status)
    except:
        pass
    
    return {"message": "Sipariş durumu güncellendi", "status": status}

# Saved Cart Routes

@router.get("/saved-cart/current", response_model=Optional[SavedCartResponse])
async def get_saved_cart(current_user: User = Depends(get_current_user)):
    """Kaydedilmiş sepeti getir"""
    saved_cart = await db.saved_carts.find_one({"user_id": current_user.id}, {"_id": 0})
    
    if not saved_cart:
        return None
    
    return saved_cart

@router.post("/saved-cart", response_model=SavedCartResponse)
async def save_cart(
    cart_data: SavedCartCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Sepeti kaydet (kullanıcı başına 1 adet)
    """
    # Check if cart already exists
    existing_cart = await db.saved_carts.find_one({"user_id": current_user.id}, {"_id": 0})
    
    cart_obj = {
        "id": existing_cart.get("id") if existing_cart else str(uuid.uuid4()),
        "user_id": current_user.id,
        "products": cart_data.products,
        "total_amount": cart_data.total_amount,
        "created_at": existing_cart.get("created_at") if existing_cart else datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing_cart:
        await db.saved_carts.update_one(
            {"user_id": current_user.id},
            {"$set": cart_obj}
        )
    else:
        await db.saved_carts.insert_one(cart_obj)
    
    cart_obj.pop('_id', None)
    return cart_obj

@router.delete("/saved-cart")
async def delete_saved_cart(current_user: User = Depends(get_current_user)):
    """Kaydedilmiş sepeti sil"""
    result = await db.saved_carts.delete_one({"user_id": current_user.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kaydedilmiş sepet bulunamadı")
    
    return {"message": "Kaydedilmiş sepet silindi"}
