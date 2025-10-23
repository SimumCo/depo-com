from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models.user import User, UserRole
from models.product import Product
from models.inventory import Inventory
from schemas.product import ProductCreate
from middleware.auth import get_current_user, require_role
from config.database import db

router = APIRouter(prefix="/products")

@router.post("", response_model=Product)
async def create_product(
    product_input: ProductCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    product_obj = Product(**product_input.model_dump())
    doc = product_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.products.insert_one(doc)
    
    # Initialize inventory
    inventory_obj = Inventory(product_id=product_obj.id)
    inv_doc = inventory_obj.model_dump()
    inv_doc['updated_at'] = inv_doc['updated_at'].isoformat()
    await db.inventory.insert_one(inv_doc)
    
    return product_obj

@router.get("", response_model=List[Product])
async def get_products(current_user: User = Depends(get_current_user)):
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    from datetime import datetime
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str, current_user: User = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    from datetime import datetime
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return Product(**product)
