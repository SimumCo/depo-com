"""
Maintenance Management API Routes
Bakım Yönetimi API Rotaları
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from models.maintenance import (
    Equipment, EquipmentCreate, EquipmentUpdate,
    MaintenanceTask, MaintenanceTaskCreate, MaintenanceTaskUpdate,
    MaintenanceSchedule, MaintenanceScheduleCreate, MaintenanceScheduleUpdate,
    SparePartsRequest, SparePartsRequestCreate, SparePartsRequestUpdate,
    EquipmentStatus, TaskStatus, TaskPriority, RequestStatus
)
from models.user import UserRole
from middleware.auth import get_current_user, require_role
from config.database import Database

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


# Helper function to check maintenance access
def check_maintenance_access(user: dict):
    """Check if user has maintenance management access"""
    allowed_roles = [
        UserRole.ADMIN,
        UserRole.PRODUCTION_MANAGER,
        UserRole.MAINTENANCE_TECHNICIAN,
        UserRole.WAREHOUSE_SUPERVISOR
    ]
    if user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")


# ============================================
# EQUIPMENT MANAGEMENT
# ============================================

@router.get("/equipment")
async def get_equipment_list(
    status: Optional[str] = None,
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Ekipman listesini getir"""
    check_maintenance_access(current_user)
    
    db = get_database()
    query = {}
    
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    
    equipment_list = list(db.equipment.find(query).sort("name", 1))
    
    # Convert MongoDB _id to string
    for eq in equipment_list:
        eq["_id"] = str(eq["_id"])
    
    return {"equipment": equipment_list, "total": len(equipment_list)}


@router.get("/equipment/{equipment_id}")
async def get_equipment_detail(
    equipment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Ekipman detayını getir"""
    check_maintenance_access(current_user)
    
    db = get_database()
    equipment = db.equipment.find_one({"id": equipment_id})
    
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    equipment["_id"] = str(equipment["_id"])
    
    # Get recent maintenance history
    recent_tasks = list(db.maintenance_tasks.find(
        {"equipment_id": equipment_id, "status": TaskStatus.COMPLETED}
    ).sort("completed_at", -1).limit(5))
    
    for task in recent_tasks:
        task["_id"] = str(task["_id"])
    
    equipment["recent_maintenance"] = recent_tasks
    
    return equipment


@router.post("/equipment")
async def create_equipment(
    equipment_data: EquipmentCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PRODUCTION_MANAGER]))
):
    """Yeni ekipman oluştur"""
    db = get_database()
    
    # Check if code already exists
    existing = db.equipment.find_one({"code": equipment_data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Bu ekipman kodu zaten kullanılıyor")
    
    equipment = Equipment(**equipment_data.model_dump())
    db.equipment.insert_one(equipment.model_dump())
    
    return {"message": "Ekipman başarıyla oluşturuldu", "equipment_id": equipment.id}


@router.put("/equipment/{equipment_id}")
async def update_equipment(
    equipment_id: str,
    equipment_data: EquipmentUpdate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PRODUCTION_MANAGER, UserRole.MAINTENANCE_TECHNICIAN]))
):
    """Ekipman güncelle"""
    db = get_database()
    
    equipment = db.equipment.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    update_data = {k: v for k, v in equipment_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    db.equipment.update_one({"id": equipment_id}, {"$set": update_data})
    
    return {"message": "Ekipman başarıyla güncellendi"}


@router.delete("/equipment/{equipment_id}")
async def delete_equipment(
    equipment_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Ekipman sil"""
    db = get_database()
    
    result = db.equipment.delete_one({"id": equipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    return {"message": "Ekipman başarıyla silindi"}


# ============================================
# MAINTENANCE TASKS
# ============================================

@router.get("/tasks")
async def get_maintenance_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_me: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Bakım görevlerini getir"""
    check_maintenance_access(current_user)
    
    db = get_database()
    query = {}
    
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    # If technician, show only assigned tasks (unless explicitly requesting all)
    if current_user.get("role") == UserRole.MAINTENANCE_TECHNICIAN and not assigned_to_me:
        query["assigned_to"] = current_user.get("id")
    elif assigned_to_me:
        query["assigned_to"] = current_user.get("id")
    
    tasks = list(db.maintenance_tasks.find(query).sort("priority", -1).sort("scheduled_date", 1))
    
    # Enrich with equipment info
    for task in tasks:
        task["_id"] = str(task["_id"])
        equipment = db.equipment.find_one({"id": task.get("equipment_id")})
        if equipment:
            task["equipment_name"] = equipment.get("name")
            task["equipment_code"] = equipment.get("code")
            task["equipment_location"] = equipment.get("location")
        
        # Get assigned technician name
        if task.get("assigned_to"):
            technician = db.users.find_one({"id": task["assigned_to"]})
            if technician:
                task["assigned_to_name"] = technician.get("full_name")
        
        # Get assigned by name
        if task.get("assigned_by"):
            assigner = db.users.find_one({"id": task["assigned_by"]})
            if assigner:
                task["assigned_by_name"] = assigner.get("full_name")
    
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/tasks/{task_id}")
async def get_task_detail(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Görev detayını getir"""
    check_maintenance_access(current_user)
    
    db = get_database()
    task = db.maintenance_tasks.find_one({"id": task_id})
    
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    task["_id"] = str(task["_id"])
    
    # Enrich with equipment info
    equipment = db.equipment.find_one({"id": task.get("equipment_id")})
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
    db = get_database()
    
    # Verify equipment exists
    equipment = db.equipment.find_one({"id": task_data.equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    task = MaintenanceTask(**task_data.model_dump())
    task.assigned_by = current_user.get("id")
    
    db.maintenance_tasks.insert_one(task.model_dump())
    
    return {"message": "Bakım görevi başarıyla oluşturuldu", "task_id": task.id}


@router.put("/tasks/{task_id}")
async def update_maintenance_task(
    task_id: str,
    task_data: MaintenanceTaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Bakım görevini güncelle"""
    check_maintenance_access(current_user)
    
    db = get_database()
    
    task = db.maintenance_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    # Technicians can only update their own tasks
    if current_user.get("role") == UserRole.MAINTENANCE_TECHNICIAN:
        if task.get("assigned_to") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Bu görevi güncelleme yetkiniz yok")
    
    update_data = {k: v for k, v in task_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If status changed to completed, update equipment last_maintenance_date
    if update_data.get("status") == TaskStatus.COMPLETED and task.get("status") != TaskStatus.COMPLETED:
        if not update_data.get("completed_at"):
            update_data["completed_at"] = datetime.now(timezone.utc)
        
        # Update equipment
        db.equipment.update_one(
            {"id": task.get("equipment_id")},
            {"$set": {
                "last_maintenance_date": update_data["completed_at"],
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    db.maintenance_tasks.update_one({"id": task_id}, {"$set": update_data})
    
    return {"message": "Görev başarıyla güncellendi"}


@router.post("/tasks/{task_id}/start")
async def start_task(
    task_id: str,
    current_user: dict = Depends(require_role([UserRole.MAINTENANCE_TECHNICIAN]))
):
    """Göreve başla"""
    db = get_database()
    
    task = db.maintenance_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    if task.get("assigned_to") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Bu görev size atanmamış")
    
    if task.get("status") != TaskStatus.PENDING:
        raise HTTPException(status_code=400, detail="Bu görev zaten başlatılmış")
    
    db.maintenance_tasks.update_one(
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
    db = get_database()
    
    task = db.maintenance_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    if task.get("assigned_to") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Bu görev size atanmamış")
    
    completed_at = datetime.now(timezone.utc)
    
    db.maintenance_tasks.update_one(
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
    db.equipment.update_one(
        {"id": task.get("equipment_id")},
        {"$set": {
            "last_maintenance_date": completed_at,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Görev başarıyla tamamlandı"}


# ============================================
# MAINTENANCE SCHEDULE
# ============================================

@router.get("/schedule")
async def get_maintenance_schedule(
    equipment_id: Optional[str] = None,
    overdue: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Bakım takvimini getir"""
    check_maintenance_access(current_user)
    
    db = get_database()
    query = {"is_active": True}
    
    if equipment_id:
        query["equipment_id"] = equipment_id
    
    if overdue:
        query["next_due_date"] = {"$lt": datetime.now(timezone.utc)}
    
    schedules = list(db.maintenance_schedules.find(query).sort("next_due_date", 1))
    
    # Enrich with equipment info
    for schedule in schedules:
        schedule["_id"] = str(schedule["_id"])
        equipment = db.equipment.find_one({"id": schedule.get("equipment_id")})
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
    db = get_database()
    
    # Verify equipment exists
    equipment = db.equipment.find_one({"id": schedule_data.equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    schedule = MaintenanceSchedule(**schedule_data.model_dump())
    schedule.created_by = current_user.get("id")
    
    db.maintenance_schedules.insert_one(schedule.model_dump())
    
    return {"message": "Bakım planı başarıyla oluşturuldu", "schedule_id": schedule.id}


@router.put("/schedule/{schedule_id}")
async def update_maintenance_schedule(
    schedule_id: str,
    schedule_data: MaintenanceScheduleUpdate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PRODUCTION_MANAGER]))
):
    """Bakım planını güncelle"""
    db = get_database()
    
    schedule = db.maintenance_schedules.find_one({"id": schedule_id})
    if not schedule:
        raise HTTPException(status_code=404, detail="Bakım planı bulunamadı")
    
    update_data = {k: v for k, v in schedule_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    db.maintenance_schedules.update_one({"id": schedule_id}, {"$set": update_data})
    
    return {"message": "Bakım planı başarıyla güncellendi"}


# ============================================
# SPARE PARTS REQUESTS
# ============================================

@router.get("/spare-parts")
async def get_spare_parts_requests(
    status: Optional[str] = None,
    my_requests: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Yedek parça taleplerini getir"""
    check_maintenance_access(current_user)
    
    db = get_database()
    query = {}
    
    if status:
        query["status"] = status
    
    if my_requests or current_user.get("role") == UserRole.MAINTENANCE_TECHNICIAN:
        query["requested_by"] = current_user.get("id")
    
    requests = list(db.spare_parts_requests.find(query).sort("created_at", -1))
    
    # Enrich with info
    for req in requests:
        req["_id"] = str(req["_id"])
        
        # Equipment info
        equipment = db.equipment.find_one({"id": req.get("equipment_id")})
        if equipment:
            req["equipment_name"] = equipment.get("name")
            req["equipment_code"] = equipment.get("code")
        
        # Requester name
        requester = db.users.find_one({"id": req.get("requested_by")})
        if requester:
            req["requested_by_name"] = requester.get("full_name")
        
        # Approver name
        if req.get("approved_by"):
            approver = db.users.find_one({"id": req["approved_by"]})
            if approver:
                req["approved_by_name"] = approver.get("full_name")
    
    return {"requests": requests, "total": len(requests)}


@router.post("/spare-parts")
async def create_spare_parts_request(
    request_data: SparePartsRequestCreate,
    current_user: dict = Depends(require_role([UserRole.MAINTENANCE_TECHNICIAN]))
):
    """Yeni yedek parça talebi oluştur"""
    db = get_database()
    
    # Verify equipment exists
    equipment = db.equipment.find_one({"id": request_data.equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadı")
    
    spare_request = SparePartsRequest(**request_data.model_dump())
    spare_request.requested_by = current_user.get("id")
    
    db.spare_parts_requests.insert_one(spare_request.model_dump())
    
    return {"message": "Yedek parça talebi başarıyla oluşturuldu", "request_id": spare_request.id}


@router.put("/spare-parts/{request_id}")
async def update_spare_parts_request(
    request_id: str,
    request_data: SparePartsRequestUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Yedek parça talebini güncelle"""
    check_maintenance_access(current_user)
    
    db = get_database()
    
    spare_request = db.spare_parts_requests.find_one({"id": request_id})
    if not spare_request:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    
    update_data = {k: v for k, v in request_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If status changed to approved/rejected, record who did it
    if update_data.get("status") in [RequestStatus.APPROVED, RequestStatus.REJECTED]:
        if current_user.get("role") not in [UserRole.ADMIN, UserRole.WAREHOUSE_SUPERVISOR, UserRole.PRODUCTION_MANAGER]:
            raise HTTPException(status_code=403, detail="Talepleri onaylama/reddetme yetkiniz yok")
        
        update_data["approved_by"] = current_user.get("id")
        update_data["approved_at"] = datetime.now(timezone.utc)
    
    if update_data.get("status") == RequestStatus.FULFILLED:
        update_data["fulfilled_at"] = datetime.now(timezone.utc)
    
    db.spare_parts_requests.update_one({"id": request_id}, {"$set": update_data})
    
    return {"message": "Talep başarıyla güncellendi"}


# ============================================
# MAINTENANCE HISTORY
# ============================================

@router.get("/history")
async def get_maintenance_history(
    equipment_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Bakım geçmişini getir"""
    check_maintenance_access(current_user)
    
    db = get_database()
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
    
    history = list(db.maintenance_tasks.find(query).sort("completed_at", -1).limit(100))
    
    # Enrich with info
    for record in history:
        record["_id"] = str(record["_id"])
        
        # Equipment info
        equipment = db.equipment.find_one({"id": record.get("equipment_id")})
        if equipment:
            record["equipment_name"] = equipment.get("name")
            record["equipment_code"] = equipment.get("code")
        
        # Technician name
        if record.get("assigned_to"):
            technician = db.users.find_one({"id": record["assigned_to"]})
            if technician:
                record["performed_by_name"] = technician.get("full_name")
    
    return {"history": history, "total": len(history)}


# ============================================
# DASHBOARD STATS
# ============================================

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user)
):
    """Bakım teknisyeni dashboard istatistikleri"""
    check_maintenance_access(current_user)
    
    db = get_database()
    user_id = current_user.get("id")
    user_role = current_user.get("role")
    
    # Equipment stats
    total_equipment = db.equipment.count_documents({})
    operational = db.equipment.count_documents({"status": EquipmentStatus.OPERATIONAL})
    in_maintenance = db.equipment.count_documents({"status": EquipmentStatus.MAINTENANCE})
    broken = db.equipment.count_documents({"status": EquipmentStatus.BROKEN})
    
    # Task stats
    if user_role == UserRole.MAINTENANCE_TECHNICIAN:
        # Technician sees only their tasks
        my_tasks = db.maintenance_tasks.count_documents({"assigned_to": user_id})
        pending_tasks = db.maintenance_tasks.count_documents({
            "assigned_to": user_id,
            "status": TaskStatus.PENDING
        })
        in_progress_tasks = db.maintenance_tasks.count_documents({
            "assigned_to": user_id,
            "status": TaskStatus.IN_PROGRESS
        })
        completed_today = db.maintenance_tasks.count_documents({
            "assigned_to": user_id,
            "status": TaskStatus.COMPLETED,
            "completed_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}
        })
    else:
        # Managers see all tasks
        my_tasks = db.maintenance_tasks.count_documents({})
        pending_tasks = db.maintenance_tasks.count_documents({"status": TaskStatus.PENDING})
        in_progress_tasks = db.maintenance_tasks.count_documents({"status": TaskStatus.IN_PROGRESS})
        completed_today = db.maintenance_tasks.count_documents({
            "status": TaskStatus.COMPLETED,
            "completed_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}
        })
    
    # Emergency tasks
    urgent_tasks = db.maintenance_tasks.count_documents({
        "priority": TaskPriority.URGENT,
        "status": {"$in": [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]}
    })
    
    # Overdue schedules
    overdue_schedules = db.maintenance_schedules.count_documents({
        "is_active": True,
        "next_due_date": {"$lt": datetime.now(timezone.utc)}
    })
    
    # Spare parts requests
    if user_role == UserRole.MAINTENANCE_TECHNICIAN:
        pending_spare_parts = db.spare_parts_requests.count_documents({
            "requested_by": user_id,
            "status": RequestStatus.PENDING
        })
    else:
        pending_spare_parts = db.spare_parts_requests.count_documents({
            "status": RequestStatus.PENDING
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


# ============================================
# EMERGENCY INTERVENTIONS
# ============================================

@router.get("/emergency")
async def get_emergency_tasks(
    current_user: dict = Depends(get_current_user)
):
    """Acil müdahale görevlerini getir"""
    check_maintenance_access(current_user)
    
    db = get_database()
    
    # Get urgent tasks
    query = {
        "priority": TaskPriority.URGENT,
        "status": {"$in": [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]}
    }
    
    emergency_tasks = list(db.maintenance_tasks.find(query).sort("created_at", -1))
    
    # Enrich with info
    for task in emergency_tasks:
        task["_id"] = str(task["_id"])
        
        # Equipment info
        equipment = db.equipment.find_one({"id": task.get("equipment_id")})
        if equipment:
            task["equipment_name"] = equipment.get("name")
            task["equipment_code"] = equipment.get("code")
            task["equipment_location"] = equipment.get("location")
        
        # Technician info
        if task.get("assigned_to"):
            technician = db.users.find_one({"id": task["assigned_to"]})
            if technician:
                task["assigned_to_name"] = technician.get("full_name")
    
    # Get broken equipment
    broken_equipment = list(db.equipment.find({"status": EquipmentStatus.BROKEN}))
    for eq in broken_equipment:
        eq["_id"] = str(eq["_id"])
    
    return {
        "emergency_tasks": emergency_tasks,
        "broken_equipment": broken_equipment,
        "total_emergencies": len(emergency_tasks) + len(broken_equipment)
    }
