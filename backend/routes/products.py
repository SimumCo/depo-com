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
async def get_products(
    current_user: User = Depends(get_current_user),
    active_only: bool = False,
    in_stock_only: bool = False
):
    """
    Ürünleri listele
    - active_only: Sadece aktif ürünler (is_active=True)
    - in_stock_only: Sadece stokta olanlar (stock_quantity > 0)
    """
    query = {}
    
    # Admin ve warehouse manager tüm ürünleri görebilir
    if current_user.role not in [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]:
        query["is_active"] = True
    elif active_only:
        query["is_active"] = True
    
    # Stok filtresi
    if in_stock_only:
        query["stock_quantity"] = {"$gt": 0}
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    
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

@router.put("/{product_id}")
async def update_product(
    product_id: str,
    update_data: dict,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING]))
):
    """Ürün bilgilerini güncelle"""
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Güncellenebilir alanlar - sku ve id güncelleme engellendi
    allowed_fields = [
        'name', 'category', 'description',
        'unit', 'units_per_case', 'sales_unit',
        'gross_weight', 'net_weight', 'weight', 'case_dimensions',
        'production_cost', 'sales_price', 'logistics_price', 'dealer_price', 'vat_rate',
        'barcode', 'warehouse_code', 'shelf_code', 'location_code',
        'lot_number', 'expiry_date',
        'stock_quantity', 'stock_status', 'min_stock_level', 'max_stock_level',
        'supply_time', 'turnover_rate',
        'image_url', 'is_active'
    ]
    
    # Sadece gönderilen ve izin verilen alanları al
    update_fields = {}
    for k, v in update_data.items():
        if k in allowed_fields:
            # Boş string kontrolü
            if isinstance(v, str) and v.strip() == '':
                update_fields[k] = None
            else:
                update_fields[k] = v
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Güncelle
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        # Kayıt bulundu ama değişiklik yapılmadı (aynı değerler)
        pass
    
    # Güncellenmiş ürünü getir
    updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    from datetime import datetime
    if isinstance(updated_product.get('created_at'), str):
        updated_product['created_at'] = datetime.fromisoformat(updated_product['created_at'])
    
    return Product(**updated_product)

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Ürünü sil (soft delete)"""
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Soft delete - is_active = False
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Product deleted successfully"}
