from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models.warehouse import Warehouse
from models.inventory import Inventory
from middleware.auth import get_current_user, require_role
from models.user import UserRole

router = APIRouter(prefix="/warehouses", tags=["Warehouse Management"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.distribution_db

@router.get("", response_model=List[Warehouse])
async def get_warehouses(
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Get all warehouses"""
    warehouses = await db.warehouses.find().to_list(1000)
    return warehouses

@router.get("/{warehouse_id}", response_model=Warehouse)
async def get_warehouse(
    warehouse_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Get single warehouse by ID"""
    warehouse = await db.warehouses.find_one({"id": warehouse_id})
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse

@router.post("", response_model=Warehouse)
async def create_warehouse(
    warehouse: Warehouse,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Create new warehouse (Admin only)"""
    # Check if warehouse with same name exists
    existing = await db.warehouses.find_one({"name": warehouse.name})
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse with this name already exists")
    
    warehouse_dict = warehouse.model_dump()
    warehouse_dict['created_at'] = datetime.now(timezone.utc)
    warehouse_dict['updated_at'] = datetime.now(timezone.utc)
    
    await db.warehouses.insert_one(warehouse_dict)
    return warehouse

@router.put("/{warehouse_id}", response_model=Warehouse)
async def update_warehouse(
    warehouse_id: str,
    warehouse_update: dict,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Update warehouse (Admin only)"""
    existing = await db.warehouses.find_one({"id": warehouse_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    warehouse_update['updated_at'] = datetime.now(timezone.utc)
    
    await db.warehouses.update_one(
        {"id": warehouse_id},
        {"$set": warehouse_update}
    )
    
    updated_warehouse = await db.warehouses.find_one({"id": warehouse_id})
    return updated_warehouse

@router.delete("/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Soft delete warehouse (set is_active=False)"""
    result = await db.warehouses.update_one(
        {"id": warehouse_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    return {"message": "Warehouse deactivated successfully"}

@router.get("/{warehouse_id}/inventory")
async def get_warehouse_inventory(
    warehouse_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Get inventory for specific warehouse"""
    # Check warehouse exists
    warehouse = await db.warehouses.find_one({"id": warehouse_id})
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Get inventory items for this warehouse
    inventory_items = await db.inventory.find({"warehouse_id": warehouse_id}).to_list(1000)
    
    # Enrich with product details
    for item in inventory_items:
        product = await db.products.find_one({"id": item.get("product_id")})
        if product:
            item['product_name'] = product.get('name')
            item['product_sku'] = product.get('sku')
    
    return {
        "warehouse_id": warehouse_id,
        "warehouse_name": warehouse.get('name'),
        "total_items": len(inventory_items),
        "inventory": inventory_items
    }

@router.get("/{warehouse_id}/stats")
async def get_warehouse_stats(
    warehouse_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Get warehouse statistics"""
    warehouse = await db.warehouses.find_one({"id": warehouse_id})
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Calculate stats
    inventory_items = await db.inventory.find({"warehouse_id": warehouse_id}).to_list(1000)
    
    total_stock = sum(item.get('total_units', 0) for item in inventory_items)
    low_stock_count = sum(1 for item in inventory_items if item.get('total_units', 0) < 10)
    out_of_stock_count = sum(1 for item in inventory_items if item.get('is_out_of_stock', False))
    
    capacity = warehouse.get('capacity', 0)
    capacity_usage = (total_stock / capacity * 100) if capacity > 0 else 0
    
    return {
        "warehouse_id": warehouse_id,
        "warehouse_name": warehouse.get('name'),
        "total_stock": total_stock,
        "capacity": capacity,
        "capacity_usage_percentage": round(capacity_usage, 2),
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "total_products": len(inventory_items)
    }
