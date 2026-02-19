"""
Maintenance Dashboard & Statistics API Routes
Bakım Dashboard ve İstatistik API Rotaları
"""
from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime, timezone
from models.maintenance import (
    EquipmentStatus, TaskStatus, TaskPriority, RequestStatus
)
from models.user import UserRole
from middleware.auth import get_current_user
from config.database import db
from .utils import check_maintenance_access, serialize_mongo_list

router = APIRouter(tags=["maintenance-dashboard"])


@router.get("/history")
async def get_maintenance_history(
    equipment_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Bakım geçmişini getir"""
    check_maintenance_access(current_user)
    
    query = {"status": TaskStatus.COMPLETED}
    
    if equipment_id:
        query["equipment_id"] = equipment_id
    
    if start_date:
        query["completed_at"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "completed_at" in query:
            query["completed_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["completed_at"] = {"$lte": datetime.fromisoformat(end_date)}
    
    history = await db.maintenance_tasks.find(query).sort("completed_at", -1).limit(100).to_list(length=None)
    
    # Enrich with info
    for record in history:
        record["_id"] = str(record["_id"])
        
        # Equipment info
        equipment = await db.equipment.find_one({"id": record.get("equipment_id")})
        if equipment:
            record["equipment_name"] = equipment.get("name")
            record["equipment_code"] = equipment.get("code")
        
        # Technician name
        if record.get("assigned_to"):
            technician = await db.users.find_one({"id": record["assigned_to"]})
            if technician:
                record["performed_by_name"] = technician.get("full_name")
    
    return {"history": history, "total": len(history)}


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user = Depends(get_current_user)
):
    """Bakım teknisyeni dashboard istatistikleri"""
    check_maintenance_access(current_user)
    
    user_id = current_user.id
    user_role = current_user.role
    
    # Equipment stats
    total_equipment = await db.equipment.count_documents({})
    operational = await db.equipment.count_documents({"status": EquipmentStatus.OPERATIONAL})
    in_maintenance = await db.equipment.count_documents({"status": EquipmentStatus.MAINTENANCE})
    broken = await db.equipment.count_documents({"status": EquipmentStatus.BROKEN})
    
    # Task stats - different for technicians vs managers
    if user_role == UserRole.MAINTENANCE_TECHNICIAN:
        my_tasks = await db.maintenance_tasks.count_documents({"assigned_to": user_id})
        pending_tasks = await db.maintenance_tasks.count_documents({
            "assigned_to": user_id,
            "status": TaskStatus.PENDING
        })
        in_progress_tasks = await db.maintenance_tasks.count_documents({
            "assigned_to": user_id,
            "status": TaskStatus.IN_PROGRESS
        })
        completed_today = await db.maintenance_tasks.count_documents({
            "assigned_to": user_id,
            "status": TaskStatus.COMPLETED,
            "completed_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}
        })
        pending_spare_parts = await db.spare_parts_requests.count_documents({
            "requested_by": user_id,
            "status": RequestStatus.PENDING
        })
    else:
        my_tasks = await db.maintenance_tasks.count_documents({})
        pending_tasks = await db.maintenance_tasks.count_documents({"status": TaskStatus.PENDING})
        in_progress_tasks = await db.maintenance_tasks.count_documents({"status": TaskStatus.IN_PROGRESS})
        completed_today = await db.maintenance_tasks.count_documents({
            "status": TaskStatus.COMPLETED,
            "completed_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}
        })
        pending_spare_parts = await db.spare_parts_requests.count_documents({
            "status": RequestStatus.PENDING
        })
    
    # Emergency stats
    urgent_tasks = await db.maintenance_tasks.count_documents({
        "priority": TaskPriority.URGENT,
        "status": {"$in": [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]}
    })
    
    overdue_schedules = await db.maintenance_schedules.count_documents({
        "is_active": True,
        "next_due_date": {"$lt": datetime.now(timezone.utc)}
    })
    
    return {
        "equipment": {
            "total": total_equipment,
            "operational": operational,
            "in_maintenance": in_maintenance,
            "broken": broken
        },
        "tasks": {
            "my_tasks": my_tasks,
            "pending": pending_tasks,
            "in_progress": in_progress_tasks,
            "completed_today": completed_today,
            "urgent": urgent_tasks
        },
        "schedules": {
            "overdue": overdue_schedules
        },
        "spare_parts": {
            "pending": pending_spare_parts
        }
    }


@router.get("/emergency")
async def get_emergency_tasks(
    current_user: dict = Depends(get_current_user)
):
    """Acil müdahale görevlerini getir"""
    check_maintenance_access(current_user)
    
    # Get urgent tasks
    query = {
        "priority": TaskPriority.URGENT,
        "status": {"$in": [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]}
    }
    
    emergency_tasks = await db.maintenance_tasks.find(query).sort("created_at", -1).to_list(length=None)
    
    # Enrich with info
    for task in emergency_tasks:
        task["_id"] = str(task["_id"])
        
        # Equipment info
        equipment = await db.equipment.find_one({"id": task.get("equipment_id")})
        if equipment:
            task["equipment_name"] = equipment.get("name")
            task["equipment_code"] = equipment.get("code")
            task["equipment_location"] = equipment.get("location")
        
        # Technician info
        if task.get("assigned_to"):
            technician = await db.users.find_one({"id": task["assigned_to"]})
            if technician:
                task["assigned_to_name"] = technician.get("full_name")
    
    # Get broken equipment
    broken_equipment = await db.equipment.find({"status": EquipmentStatus.BROKEN}).to_list(length=None)
    serialize_mongo_list(broken_equipment)
    
    return {
        "emergency_tasks": emergency_tasks,
        "broken_equipment": broken_equipment,
        "total_emergencies": len(emergency_tasks) + len(broken_equipment)
    }
