"""
Maintenance Schedule API Routes
Bakım Takvimi API Rotaları
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
from models.maintenance import (
    MaintenanceSchedule, MaintenanceScheduleCreate, MaintenanceScheduleUpdate
)
from models.user import UserRole
from middleware.auth import get_current_user, require_role
from config.database import db
from .utils import check_maintenance_access, serialize_mongo_list

router = APIRouter(tags=["maintenance-schedule"])


@router.get("/schedule")
async def get_maintenance_schedule(
    equipment_id: Optional[str] = None,
    overdue: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Bakım takvimini getir"""
    check_maintenance_access(current_user)
    
    query = {"is_active": True}
    
    if equipment_id:
        query["equipment_id"] = equipment_id
    
    if overdue:
        query["next_due_date"] = {"$lt": datetime.now(timezone.utc)}
    
    schedules = await db.maintenance_schedules.find(query).sort("next_due_date", 1).to_list(length=None)
    
    # Enrich with equipment info
    for schedule in schedules:
        schedule["_id"] = str(schedule["_id"])
        equipment = await db.equipment.find_one({"id": schedule.get("equipment_id")})
        if equipment:
            schedule["equipment_name"] = equipment.get("name")
            schedule["equipment_code"] = equipment.get("code")
            schedule["equipment_location"] = equipment.get("location")
        
        # Check if overdue
        schedule["is_overdue"] = schedule.get("next_due_date") < datetime.now(timezone.utc)
    
    return {"schedules": schedules, "total": len(schedules)}


@router.post("/schedule")
async def create_maintenance_schedule(
    schedule_data: MaintenanceScheduleCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PRODUCTION_MANAGER]))
):
    """Yeni bakım planı oluştur"""
    # Verify equipment exists
    equipment = await db.equipment.find_one({"id": schedule_data.equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    schedule = MaintenanceSchedule(**schedule_data.model_dump())
    schedule.created_by = current_user.id
    
    await db.maintenance_schedules.insert_one(schedule.model_dump())
    
    return {"message": "Bakım planı başarıyla oluşturuldu", "schedule_id": schedule.id}


@router.put("/schedule/{schedule_id}")
async def update_maintenance_schedule(
    schedule_id: str,
    schedule_data: MaintenanceScheduleUpdate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PRODUCTION_MANAGER]))
):
    """Bakım planını güncelle"""
    schedule = await db.maintenance_schedules.find_one({"id": schedule_id})
    if not schedule:
        raise HTTPException(status_code=404, detail="Bakım planı bulunamadı")
    
    update_data = {k: v for k, v in schedule_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.maintenance_schedules.update_one({"id": schedule_id}, {"$set": update_data})
    
    return {"message": "Bakım planı başarıyla güncellendi"}
