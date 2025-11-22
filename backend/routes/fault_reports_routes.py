from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models.fault_report import FaultReport, FaultReportCreate, FaultReportUpdate, FaultReportResponse, FaultStatus
from models.user import User, UserRole
from utils.auth import get_current_user, require_role
import uuid

router = APIRouter(prefix="/fault-reports", tags=["Fault Reports"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'distribution_management')]

MAX_PHOTOS = 3
MAX_PHOTO_SIZE_MB = 5

def validate_photo_size(base64_photo: str) -> bool:
    size_bytes = len(base64_photo.encode('utf-8'))
    size_mb = size_bytes / (1024 * 1024)
    return size_mb <= MAX_PHOTO_SIZE_MB

@router.get("", response_model=List[FaultReportResponse])
async def get_fault_reports(
    status: str = None,
    limit: int = Query(20, le=50),
    skip: int = 0,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if current_user.role == UserRole.CUSTOMER:
        query["user_id"] = current_user.id
    
    if status:
        query["status"] = status
    
    cursor = db.fault_reports.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    reports = await cursor.to_list(length=limit)
    
    result = []
    for report in reports:
        product = await db.products.find_one({"id": report["product_id"]}, {"_id": 0})
        result.append({
            "id": report["id"],
            "user_id": report["user_id"],
            "order_id": report.get("order_id"),
            "product_id": report["product_id"],
            "product_name": product.get("name") if product else None,
            "description": report["description"],
            "photos": report.get("photos", []),
            "status": report["status"],
            "admin_response": report.get("admin_response"),
            "created_at": report["created_at"],
            "updated_at": report["updated_at"],
            "resolved_at": report.get("resolved_at")
        })
    
    return result

@router.get("/{report_id}", response_model=FaultReportResponse)
async def get_fault_report_detail(
    report_id: str,
    current_user: User = Depends(get_current_user)
):
    report = await db.fault_reports.find_one({"id": report_id}, {"_id": 0})
    
    if not report:
        raise HTTPException(status_code=404, detail="Arıza bildirimi bulunamadı")
    
    if current_user.role == UserRole.CUSTOMER and report["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Bu bildirime erişim yetkiniz yok")
    
    product = await db.products.find_one({"id": report["product_id"]}, {"_id": 0})
    
    return {
        "id": report["id"],
        "user_id": report["user_id"],
        "order_id": report.get("order_id"),
        "product_id": report["product_id"],
        "product_name": product.get("name") if product else None,
        "description": report["description"],
        "photos": report.get("photos", []),
        "status": report["status"],
        "admin_response": report.get("admin_response"),
        "created_at": report["created_at"],
        "updated_at": report["updated_at"],
        "resolved_at": report.get("resolved_at")
    }

@router.post("", response_model=dict)
async def create_fault_report(
    report_data: FaultReportCreate,
    current_user: User = Depends(get_current_user)
):
    if len(report_data.photos) > MAX_PHOTOS:
        raise HTTPException(
            status_code=400,
            detail=f"Maksimum {MAX_PHOTOS} fotoğraf yüklenebilir"
        )
    
    for i, photo in enumerate(report_data.photos):
        if not validate_photo_size(photo):
            raise HTTPException(
                status_code=400,
                detail=f"Fotoğraf {i+1} boyutu {MAX_PHOTO_SIZE_MB}MB'tan büyük"
            )
    
    product = await db.products.find_one({"id": report_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    new_report = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "order_id": report_data.order_id,
        "product_id": report_data.product_id,
        "description": report_data.description,
        "photos": report_data.photos,
        "status": FaultStatus.PENDING,
        "admin_response": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None
    }
    
    await db.fault_reports.insert_one(new_report)
    
    return {
        "message": "Arıza bildirimi oluşturuldu",
        "report_id": new_report["id"],
        "product_name": product.get("name"),
        "photo_count": len(report_data.photos)
    }

@router.put("/{report_id}", response_model=dict)
async def update_fault_report(
    report_id: str,
    update_data: FaultReportUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING]))
):
    report = await db.fault_reports.find_one({"id": report_id}, {"_id": 0})
    
    if not report:
        raise HTTPException(status_code=404, detail="Arıza bildirimi bulunamadı")
    
    update_fields = {
        "status": update_data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if update_data.admin_response:
        update_fields["admin_response"] = update_data.admin_response
    
    if update_data.status in [FaultStatus.RESOLVED, FaultStatus.REJECTED]:
        update_fields["resolved_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.fault_reports.update_one(
        {"id": report_id},
        {"$set": update_fields}
    )
    
    return {
        "message": "Arıza bildirimi güncellendi",
        "status": update_data.status
    }

@router.delete("/{report_id}")
async def delete_fault_report(
    report_id: str,
    current_user: User = Depends(get_current_user)
):
    result = await db.fault_reports.delete_one({
        "id": report_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Arıza bildirimi bulunamadı")
    
    return {"message": "Arıza bildirimi silindi"}
