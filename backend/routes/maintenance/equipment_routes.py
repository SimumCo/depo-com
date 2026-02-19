"""
Equipment Management API Routes
Ekipman Yönetimi API Rotaları
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
from models.maintenance import (
    Equipment, EquipmentCreate, EquipmentUpdate, TaskStatus
)
from models.user import UserRole
from middleware.auth import get_current_user, require_role
from config.database import db
from .utils import check_maintenance_access, serialize_mongo_doc, serialize_mongo_list

router = APIRouter(tags=["maintenance-equipment"])


@router.get("/equipment")
async def get_equipment_list(
    status: Optional[str] = None,
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Ekipman listesini getir"""
    check_maintenance_access(current_user)
    
    query = {}
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    
    equipment_list = await db.equipment.find(query).sort("name", 1).to_list(length=None)
    serialize_mongo_list(equipment_list)
    
    return {"equipment": equipment_list, "total": len(equipment_list)}


@router.get("/equipment/{equipment_id}")
async def get_equipment_detail(
    equipment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Ekipman detayını getir"""
    check_maintenance_access(current_user)
    
    equipment = await db.equipment.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    serialize_mongo_doc(equipment)
    
    # Get recent maintenance history
    recent_tasks = await db.maintenance_tasks.find(
        {"equipment_id": equipment_id, "status": TaskStatus.COMPLETED}
    ).sort("completed_at", -1).limit(5).to_list(length=None)
    
    serialize_mongo_list(recent_tasks)
    equipment["recent_maintenance"] = recent_tasks
    
    return equipment


@router.post("/equipment")
async def create_equipment(
    equipment_data: EquipmentCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PRODUCTION_MANAGER]))
):
    """Yeni ekipman oluştur"""
    # Check if code already exists
    existing = await db.equipment.find_one({"code": equipment_data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Bu ekipman kodu zaten kullanılıyor")
    
    equipment = Equipment(**equipment_data.model_dump())
    await db.equipment.insert_one(equipment.model_dump())
    
    return {"message": "Ekipman başarıyla oluşturuldu", "equipment_id": equipment.id}


@router.put("/equipment/{equipment_id}")
async def update_equipment(
    equipment_id: str,
    equipment_data: EquipmentUpdate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PRODUCTION_MANAGER, UserRole.MAINTENANCE_TECHNICIAN]))
):
    """Ekipman güncelle"""
    equipment = await db.equipment.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    update_data = {k: v for k, v in equipment_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.equipment.update_one({"id": equipment_id}, {"$set": update_data})
    
    return {"message": "Ekipman başarıyla güncellendi"}


@router.delete("/equipment/{equipment_id}")
async def delete_equipment(
    equipment_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Ekipman sil"""
    result = await db.equipment.delete_one({"id": equipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    return {"message": "Ekipman başarıyla silindi"}
