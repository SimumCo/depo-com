from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models.campaign import Campaign, CustomerGroupType, DiscountType
from middleware.auth import get_current_user, require_role
from models.user import User, UserRole

router = APIRouter(prefix="/campaigns", tags=["Campaign Management"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.distribution_db

@router.get("", response_model=List[Campaign])
async def get_campaigns(
    is_active: Optional[bool] = None,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING]))
):
    """Get all campaigns with optional filter"""
    query = {}
    if is_active is not None:
        query['is_active'] = is_active
    
    campaigns = await db.campaigns.find(query).sort("created_at", -1).to_list(1000)
    return campaigns

@router.get("/active", response_model=List[Campaign])
async def get_active_campaigns(
    current_user: dict = Depends(get_current_user)
):
    """Get currently active campaigns (within date range)"""
    now = datetime.now(timezone.utc)
    
    campaigns = await db.campaigns.find({
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }).to_list(1000)
    
    return campaigns

@router.get("/{campaign_id}", response_model=Campaign)
async def get_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING]))
):
    """Get single campaign by ID"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.post("", response_model=Campaign)
async def create_campaign(
    campaign: Campaign,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Create new campaign (Admin only)"""
    # Validate dates
    if campaign.start_date >= campaign.end_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    # Check for overlapping campaigns with same products
    if campaign.product_ids:
        overlapping = await db.campaigns.find_one({
            "is_active": True,
            "product_ids": {"$in": campaign.product_ids},
            "$or": [
                {
                    "start_date": {"$lte": campaign.end_date},
                    "end_date": {"$gte": campaign.start_date}
                }
            ]
        })
        
        if overlapping:
            raise HTTPException(
                status_code=400,
                detail=f"Campaign '{overlapping.get('name')}' already exists for some of these products in this date range"
            )
    
    campaign_dict = campaign.model_dump()
    campaign_dict['created_by'] = current_user.id
    campaign_dict['created_at'] = datetime.now(timezone.utc)
    campaign_dict['updated_at'] = datetime.now(timezone.utc)
    
    await db.campaigns.insert_one(campaign_dict)
    return campaign

@router.put("/{campaign_id}", response_model=Campaign)
async def update_campaign(
    campaign_id: str,
    campaign_update: dict,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Update campaign (Admin only)"""
    existing = await db.campaigns.find_one({"id": campaign_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Validate dates if being updated
    start_date = campaign_update.get('start_date', existing.get('start_date'))
    end_date = campaign_update.get('end_date', existing.get('end_date'))
    
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    if start_date >= end_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    campaign_update['updated_at'] = datetime.now(timezone.utc)
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": campaign_update}
    )
    
    updated_campaign = await db.campaigns.find_one({"id": campaign_id})
    return updated_campaign

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Deactivate campaign"""
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Campaign deactivated successfully"}

@router.post("/{campaign_id}/activate")
async def activate_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Activate campaign"""
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Campaign activated successfully"}

@router.get("/{campaign_id}/applicable-products")
async def get_campaign_applicable_products(
    campaign_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get products applicable for this campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # If product_ids is empty, all products are applicable
    if not campaign.get('product_ids'):
        products = await db.products.find({"is_active": True}).to_list(1000)
    else:
        products = await db.products.find({
            "id": {"$in": campaign.get('product_ids')},
            "is_active": True
        }).to_list(1000)
    
    # Apply discount to prices
    discount_type = campaign.get('discount_type')
    discount_value = campaign.get('discount_value', 0)
    
    for product in products:
        original_price = product.get('price', 0)
        
        if discount_type == DiscountType.PERCENTAGE:
            discounted_price = original_price * (1 - discount_value / 100)
        else:  # FIXED_AMOUNT
            discounted_price = max(0, original_price - discount_value)
        
        product['original_price'] = original_price
        product['discounted_price'] = round(discounted_price, 2)
        product['discount_amount'] = round(original_price - discounted_price, 2)
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get('name'),
        "products": products
    }
