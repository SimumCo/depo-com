"""
Spare Parts Requests API Routes
Yedek Parça Talepleri API Rotaları
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
from models.maintenance import (
    SparePartsRequest, SparePartsRequestCreate, SparePartsRequestUpdate,
    RequestStatus
)
from models.user import UserRole
from middleware.auth import get_current_user, require_role
from config.database import db
from .utils import check_maintenance_access, serialize_mongo_list

router = APIRouter(tags=["maintenance-spare-parts"])


@router.get("/spare-parts")
async def get_spare_parts_requests(
    status: Optional[str] = None,
    my_requests: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Yedek parça taleplerini getir"""
    check_maintenance_access(current_user)
    
    query = {}
    
    if status:
        query["status"] = status
    
    if my_requests or current_user.role == UserRole.MAINTENANCE_TECHNICIAN:
        query["requested_by"] = current_user.id
    
    requests = await db.spare_parts_requests.find(query).sort("created_at", -1).to_list(length=None)
    
    # Enrich with info
    for req in requests:
        req["_id"] = str(req["_id"])
        
        # Equipment info
        equipment = await db.equipment.find_one({"id": req.get("equipment_id")})
        if equipment:
            req["equipment_name"] = equipment.get("name")
            req["equipment_code"] = equipment.get("code")
        
        # Requester name
        requester = await db.users.find_one({"id": req.get("requested_by")})
        if requester:
            req["requested_by_name"] = requester.get("full_name")
        
        # Approver name
        if req.get("approved_by"):
            approver = await db.users.find_one({"id": req["approved_by"]})
            if approver:
                req["approved_by_name"] = approver.get("full_name")
    
    return {"requests": requests, "total": len(requests)}


@router.post("/spare-parts")
async def create_spare_parts_request(
    request_data: SparePartsRequestCreate,
    current_user: dict = Depends(require_role([UserRole.MAINTENANCE_TECHNICIAN]))
):
    """Yeni yedek parça talebi oluştur"""
    # Verify equipment exists
    equipment = await db.equipment.find_one({"id": request_data.equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    spare_request = SparePartsRequest(**request_data.model_dump())
    spare_request.requested_by = current_user.id
    
    await db.spare_parts_requests.insert_one(spare_request.model_dump())
    
    return {"message": "Yedek parça talebi başarıyla oluşturuldu", "request_id": spare_request.id}


@router.put("/spare-parts/{request_id}")
async def update_spare_parts_request(
    request_id: str,
    request_data: SparePartsRequestUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Yedek parça talebini güncelle"""
    check_maintenance_access(current_user)
    
    spare_request = await db.spare_parts_requests.find_one({"id": request_id})
    if not spare_request:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    
    update_data = {k: v for k, v in request_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If status changed to approved/rejected, record who did it
    if update_data.get("status") in [RequestStatus.APPROVED, RequestStatus.REJECTED]:
        if current_user.role not in [UserRole.ADMIN, UserRole.WAREHOUSE_SUPERVISOR, UserRole.PRODUCTION_MANAGER]:
            raise HTTPException(status_code=403, detail="Talepleri onaylama/reddetme yetkiniz yok")
        
        update_data["approved_by"] = current_user.id
        update_data["approved_at"] = datetime.now(timezone.utc)
    
    if update_data.get("status") == RequestStatus.FULFILLED:
        update_data["fulfilled_at"] = datetime.now(timezone.utc)
    
    await db.spare_parts_requests.update_one({"id": request_id}, {"$set": update_data})
    
    return {"message": "Talep başarıyla güncellendi"}
