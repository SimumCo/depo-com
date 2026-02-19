"""
Maintenance Tasks API Routes
Bakım Görevleri API Rotaları
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
from models.maintenance import (
    MaintenanceTask, MaintenanceTaskCreate, MaintenanceTaskUpdate,
    TaskStatus
)
from models.user import UserRole
from middleware.auth import get_current_user, require_role
from config.database import db
from .utils import check_maintenance_access, serialize_mongo_doc, serialize_mongo_list

router = APIRouter(tags=["maintenance-tasks"])


async def enrich_task_with_info(task):
    """Görev bilgilerini zenginleştir"""
    serialize_mongo_doc(task)
    
    # Equipment info
    equipment = await db.equipment.find_one({"id": task.get("equipment_id")})
    if equipment:
        task["equipment_name"] = equipment.get("name")
        task["equipment_code"] = equipment.get("code")
        task["equipment_location"] = equipment.get("location")
    
    # Assigned technician name
    if task.get("assigned_to"):
        technician = await db.users.find_one({"id": task["assigned_to"]})
        if technician:
            task["assigned_to_name"] = technician.get("full_name")
    
    # Assigned by name
    if task.get("assigned_by"):
        assigner = await db.users.find_one({"id": task["assigned_by"]})
        if assigner:
            task["assigned_by_name"] = assigner.get("full_name")
    
    return task


@router.get("/tasks")
async def get_maintenance_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_me: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Bakım görevlerini getir"""
    check_maintenance_access(current_user)
    
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    # If technician, show only assigned tasks (unless explicitly requesting all)
    if current_user.role == UserRole.MAINTENANCE_TECHNICIAN and not assigned_to_me:
        query["assigned_to"] = current_user.id
    elif assigned_to_me:
        query["assigned_to"] = current_user.id
    
    tasks = await db.maintenance_tasks.find(query).sort("priority", -1).sort("scheduled_date", 1).to_list(length=None)
    
    for task in tasks:
        await enrich_task_with_info(task)
    
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/tasks/{task_id}")
async def get_task_detail(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Görev detayını getir"""
    check_maintenance_access(current_user)
    
    task = await db.maintenance_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    serialize_mongo_doc(task)
    
    # Equipment info
    equipment = await db.equipment.find_one({"id": task.get("equipment_id")})
    if equipment:
        task["equipment"] = {
            "name": equipment.get("name"),
            "code": equipment.get("code"),
            "location": equipment.get("location"),
            "type": equipment.get("type")
        }
    
    return task


@router.post("/tasks")
async def create_maintenance_task(
    task_data: MaintenanceTaskCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PRODUCTION_MANAGER]))
):
    """Yeni bakım görevi oluştur"""
    # Verify equipment exists
    equipment = await db.equipment.find_one({"id": task_data.equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    task = MaintenanceTask(**task_data.model_dump())
    task.assigned_by = current_user.id
    
    await db.maintenance_tasks.insert_one(task.model_dump())
    
    return {"message": "Bakım görevi başarıyla oluşturuldu", "task_id": task.id}


@router.put("/tasks/{task_id}")
async def update_maintenance_task(
    task_id: str,
    task_data: MaintenanceTaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Bakım görevini güncelle"""
    check_maintenance_access(current_user)
    
    task = await db.maintenance_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    # Technicians can only update their own tasks
    if current_user.role == UserRole.MAINTENANCE_TECHNICIAN:
        if task.get("assigned_to") != current_user.id:
            raise HTTPException(status_code=403, detail="Bu görevi güncelleme yetkiniz yok")
    
    update_data = {k: v for k, v in task_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If status changed to completed, update equipment last_maintenance_date
    if update_data.get("status") == TaskStatus.COMPLETED and task.get("status") != TaskStatus.COMPLETED:
        if not update_data.get("completed_at"):
            update_data["completed_at"] = datetime.now(timezone.utc)
        
        await db.equipment.update_one(
            {"id": task.get("equipment_id")},
            {"$set": {
                "last_maintenance_date": update_data["completed_at"],
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    await db.maintenance_tasks.update_one({"id": task_id}, {"$set": update_data})
    
    return {"message": "Görev başarıyla güncellendi"}


@router.post("/tasks/{task_id}/start")
async def start_task(
    task_id: str,
    current_user: dict = Depends(require_role([UserRole.MAINTENANCE_TECHNICIAN]))
):
    """Göreve başla"""
    task = await db.maintenance_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    if task.get("assigned_to") != current_user.id:
        raise HTTPException(status_code=403, detail="Bu görev size atanmamış")
    
    if task.get("status") != TaskStatus.PENDING:
        raise HTTPException(status_code=400, detail="Bu görev zaten başlatılmış")
    
    await db.maintenance_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": TaskStatus.IN_PROGRESS,
            "started_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Görev başlatıldı"}


@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: str,
    completion_notes: str,
    actual_duration_hours: Optional[float] = None,
    cost: Optional[float] = None,
    current_user: dict = Depends(require_role([UserRole.MAINTENANCE_TECHNICIAN]))
):
    """Görevi tamamla"""
    task = await db.maintenance_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    if task.get("assigned_to") != current_user.id:
        raise HTTPException(status_code=403, detail="Bu görev size atanmamış")
    
    completed_at = datetime.now(timezone.utc)
    
    await db.maintenance_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": TaskStatus.COMPLETED,
            "completed_at": completed_at,
            "completion_notes": completion_notes,
            "actual_duration_hours": actual_duration_hours,
            "cost": cost,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Update equipment
    await db.equipment.update_one(
        {"id": task.get("equipment_id")},
        {"$set": {
            "last_maintenance_date": completed_at,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Görev başarıyla tamamlandı"}
