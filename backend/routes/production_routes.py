# Production Management API Routes
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
import uuid

from models.production import (
    ProductionPlan, ProductionPlanCreate, ProductionPlanStatus,
    ProductionOrder, ProductionOrderCreate, ProductionOrderStatus,
    BillOfMaterials, BOMCreate,
    ProductionLine, ProductionLineCreate,
    RawMaterialRequirement, ProductionTracking, QualityControl, QualityControlCreate,
    ProductionOrderPriority,
    MachineDowntime, MachineDowntimeCreate, DowntimeType,
    RawMaterialUsage, RawMaterialUsageCreate,
    BatchRecord, BatchRecordCreate,
    OperatorNote, OperatorNoteCreate,
    NonConformanceReport, NonConformanceReportCreate, NonConformanceType, NonConformanceSeverity,
    QualityTest, QualityTestCreate, TestType,
    HACCPRecord, HACCPRecordCreate,
    WarehouseTransaction, WarehouseTransactionCreate, TransactionType,
    StockLocation, StockLocationCreate,
    StockItem, StockItemUpdate,
    StockCount, StockCountCreate,
    StockBlock, StockBlockCreate
)
from models.user import UserRole
from middleware.auth import get_current_user, require_role
from config.database import db

from services.production_service import (
    BOMCalculationService, 
    ProductionPlanningService,
    ProductionScheduler
)

router = APIRouter(prefix="/production", tags=["Production Management"])

# ========== PRODUCTION PLANS ==========

@router.get("/plans")
async def get_production_plans(
    status: Optional[str] = None,
    plan_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Tüm üretim planlarını getir"""
    
    query = {}
    if status:
        query["status"] = status
    if plan_type:
        query["plan_type"] = plan_type
    
    plans = await db.production_plans.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    return {"plans": plans, "total": len(plans)}


@router.get("/plans/{plan_id}")
async def get_production_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Belirli bir üretim planını getir"""
    
    plan = await db.production_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan bulunamadı")
    
    return plan


@router.post("/plans")
async def create_production_plan(
    plan_data: ProductionPlanCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Yeni üretim planı oluştur"""
    
    import uuid
    from datetime import datetime
    
    # Plan numarası oluştur
    plan_number = f"PLAN-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    plan = ProductionPlan(
        plan_number=plan_number,
        plan_type=plan_data.plan_type,
        plan_date=plan_data.plan_date,
        start_date=plan_data.start_date,
        end_date=plan_data.end_date,
        items=plan_data.items,
        notes=plan_data.notes,
        created_by=current_user.id,
        status=ProductionPlanStatus.DRAFT
    )
    
    await db.production_plans.insert_one(plan.model_dump())
    
    return {
        "message": "Üretim planı oluşturuldu",
        "plan": plan.model_dump()
    }


@router.put("/plans/{plan_id}")
async def update_production_plan(
    plan_id: str,
    plan_data: ProductionPlanCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Üretim planını güncelle"""
    
    plan = await db.production_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan bulunamadı")
    
    # Sadece DRAFT veya APPROVED planlar güncellenebilir
    if plan.get("status") not in [ProductionPlanStatus.DRAFT.value, ProductionPlanStatus.APPROVED.value]:
        raise HTTPException(
            status_code=400, 
            detail="Bu durumdaki plan güncellenemez"
        )
    
    update_data = {
        "plan_type": plan_data.plan_type.value,
        "plan_date": plan_data.plan_date,
        "start_date": plan_data.start_date,
        "end_date": plan_data.end_date,
        "items": [item.model_dump() for item in plan_data.items],
        "notes": plan_data.notes,
        "updated_at": datetime.now()
    }
    
    await db.production_plans.update_one(
        {"id": plan_id},
        {"$set": update_data}
    )
    
    return {"message": "Plan güncellendi"}


@router.post("/plans/{plan_id}/approve")
async def approve_production_plan(
    plan_id: str,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Üretim planını onayla"""
    
    plan = await db.production_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan bulunamadı")
    
    await db.production_plans.update_one(
        {"id": plan_id},
        {
            "$set": {
                "status": ProductionPlanStatus.APPROVED.value,
                "approved_by": current_user.id,
                "updated_at": datetime.now()
            }
        }
    )
    
    return {"message": "Plan onaylandı"}


@router.post("/plans/{plan_id}/generate-orders")
async def generate_orders_from_plan(
    plan_id: str,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Plandan üretim emirleri oluştur"""
    
    planning_service = ProductionPlanningService(db)
    orders = await planning_service.generate_production_orders_from_plan(
        plan_id, 
        current_user.id
    )
    
    # Hammadde ihtiyacını hesapla
    bom_service = BOMCalculationService(db)
    await bom_service.calculate_raw_material_needs(plan_id)
    
    return {
        "message": f"{len(orders)} üretim emri oluşturuldu",
        "orders": orders
    }


@router.delete("/plans/{plan_id}")
async def delete_production_plan(
    plan_id: str,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Üretim planını sil (iptal et)"""
    
    await db.production_plans.update_one(
        {"id": plan_id},
        {"$set": {"status": ProductionPlanStatus.CANCELLED.value}}
    )
    
    return {"message": "Plan iptal edildi"}


# ========== PRODUCTION ORDERS ==========

@router.get("/orders")
async def get_production_orders(
    status: Optional[str] = None,
    line_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Üretim emirlerini getir"""
    
    query = {}
    if status:
        query["status"] = status
    if line_id:
        query["line_id"] = line_id
    
    # Operatör ise sadece kendi emirlerini görsün
    if current_user.role == UserRole.PRODUCTION_OPERATOR:
        query["assigned_operator_id"] = current_user.id
    
    orders = await db.production_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=200)
    return {"orders": orders, "total": len(orders)}


@router.get("/orders/{order_id}")
async def get_production_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Belirli bir üretim emrini getir"""
    
    order = await db.production_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    return order


@router.post("/orders")
async def create_production_order(
    order_data: ProductionOrderCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Yeni üretim emri oluştur"""
    
    import uuid
    
    order_number = f"URT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    order = ProductionOrder(
        order_number=order_number,
        plan_id=order_data.plan_id,
        product_id=order_data.product_id,
        product_name=order_data.product_name,
        target_quantity=order_data.target_quantity,
        unit=order_data.unit,
        priority=order_data.priority,
        scheduled_start=order_data.scheduled_start,
        scheduled_end=order_data.scheduled_end,
        notes=order_data.notes,
        status=ProductionOrderStatus.PENDING,
        created_by=current_user.id
    )
    
    await db.production_orders.insert_one(order.model_dump())
    
    return {
        "message": "Üretim emri oluşturuldu",
        "order": order.model_dump()
    }


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: ProductionOrderStatus,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Üretim emri durumunu güncelle"""
    
    order = await db.production_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    update_data = {
        "status": status.value,
        "updated_at": datetime.now()
    }
    
    if notes:
        update_data["notes"] = notes
    
    # Eğer üretim başlatılıyorsa
    if status == ProductionOrderStatus.IN_PROGRESS and not order.get("actual_start"):
        update_data["actual_start"] = datetime.now()
    
    # Eğer üretim tamamlanıyorsa
    if status == ProductionOrderStatus.COMPLETED and not order.get("actual_end"):
        update_data["actual_end"] = datetime.now()
    
    await db.production_orders.update_one(
        {"id": order_id},
        {"$set": update_data}
    )
    
    return {"message": "Durum güncellendi"}


@router.post("/orders/{order_id}/assign")
async def assign_order_to_line(
    order_id: str,
    line_id: str,
    operator_id: Optional[str] = None,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Üretim emrini hatta ata"""
    
    scheduler = ProductionScheduler(db)
    success = await scheduler.assign_order_to_line(order_id, line_id, operator_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Hat müsait değil veya bulunamadı")
    
    return {"message": "Emir hatta atandı"}


# ========== BILL OF MATERIALS (BOM) ==========

@router.get("/bom")
async def get_boms(
    product_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Tüm reçeteleri getir"""
    
    query = {"is_active": True}
    if product_id:
        query["product_id"] = product_id
    
    boms = await db.bill_of_materials.find(query, {"_id": 0}).to_list(length=100)
    return {"boms": boms, "total": len(boms)}


@router.get("/bom/{bom_id}")
async def get_bom(
    bom_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Belirli bir reçeteyi getir"""
    
    bom = await db.bill_of_materials.find_one({"id": bom_id}, {"_id": 0})
    if not bom:
        raise HTTPException(status_code=404, detail="Reçete bulunamadı")
    
    return bom


@router.post("/bom")
async def create_bom(
    bom_data: BOMCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.RND_ENGINEER,
        UserRole.ADMIN
    ]))
):
    """Yeni reçete oluştur"""
    
    bom = BillOfMaterials(
        product_id=bom_data.product_id,
        product_name=bom_data.product_name,
        version=bom_data.version,
        items=bom_data.items,
        output_quantity=bom_data.output_quantity,
        output_unit=bom_data.output_unit,
        notes=bom_data.notes,
        created_by=current_user.id
    )
    
    await db.bill_of_materials.insert_one(bom.model_dump())
    
    return {
        "message": "Reçete oluşturuldu",
        "bom": bom.model_dump()
    }


@router.put("/bom/{bom_id}")
async def update_bom(
    bom_id: str,
    bom_data: BOMCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.RND_ENGINEER,
        UserRole.ADMIN
    ]))
):
    """Reçeteyi güncelle"""
    
    bom = await db.bill_of_materials.find_one({"id": bom_id}, {"_id": 0})
    if not bom:
        raise HTTPException(status_code=404, detail="Reçete bulunamadı")
    
    update_data = {
        "product_id": bom_data.product_id,
        "product_name": bom_data.product_name,
        "version": bom_data.version,
        "items": [item.model_dump() for item in bom_data.items],
        "output_quantity": bom_data.output_quantity,
        "output_unit": bom_data.output_unit,
        "notes": bom_data.notes,
        "updated_at": datetime.now()
    }
    
    await db.bill_of_materials.update_one(
        {"id": bom_id},
        {"$set": update_data}
    )
    
    return {"message": "Reçete güncellendi"}


@router.delete("/bom/{bom_id}")
async def delete_bom(
    bom_id: str,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Reçeteyi sil (deaktif et)"""
    
    await db.bill_of_materials.update_one(
        {"id": bom_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Reçete deaktif edildi"}


# ========== PRODUCTION LINES ==========

@router.get("/lines")
async def get_production_lines(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Tüm üretim hatlarını getir"""
    
    query = {}
    if status:
        query["status"] = status
    
    lines = await db.production_lines.find(query, {"_id": 0}).to_list(length=100)
    return {"lines": lines, "total": len(lines)}


@router.get("/lines/{line_id}")
async def get_production_line(
    line_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Belirli bir üretim hattını getir"""
    
    line = await db.production_lines.find_one({"id": line_id}, {"_id": 0})
    if not line:
        raise HTTPException(status_code=404, detail="Hat bulunamadı")
    
    return line


@router.post("/lines")
async def create_production_line(
    line_data: ProductionLineCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Yeni üretim hattı oluştur"""
    
    line = ProductionLine(
        name=line_data.name,
        line_code=line_data.line_code,
        description=line_data.description,
        capacity_per_hour=line_data.capacity_per_hour,
        capacity_unit=line_data.capacity_unit
    )
    
    await db.production_lines.insert_one(line.model_dump())
    
    return {
        "message": "Üretim hattı oluşturuldu",
        "line": line.model_dump()
    }


@router.put("/lines/{line_id}")
async def update_production_line(
    line_id: str,
    line_data: ProductionLineCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER, 
        UserRole.ADMIN
    ]))
):
    """Üretim hattını güncelle"""
    
    line = await db.production_lines.find_one({"id": line_id}, {"_id": 0})
    if not line:
        raise HTTPException(status_code=404, detail="Hat bulunamadı")
    
    update_data = {
        "name": line_data.name,
        "line_code": line_data.line_code,
        "description": line_data.description,
        "capacity_per_hour": line_data.capacity_per_hour,
        "capacity_unit": line_data.capacity_unit,
        "updated_at": datetime.now()
    }
    
    await db.production_lines.update_one(
        {"id": line_id},
        {"$set": update_data}
    )
    
    return {"message": "Hat güncellendi"}


@router.patch("/lines/{line_id}/status")
async def update_line_status(
    line_id: str,
    status: str,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER,
        UserRole.MAINTENANCE_TECHNICIAN,
        UserRole.ADMIN
    ]))
):
    """Üretim hattı durumunu güncelle"""
    
    await db.production_lines.update_one(
        {"id": line_id},
        {"$set": {"status": status, "updated_at": datetime.now()}}
    )
    
    return {"message": "Hat durumu güncellendi"}


# ========== RAW MATERIAL REQUIREMENTS ==========

@router.get("/raw-materials/analysis/{plan_id}")
async def get_raw_material_analysis(
    plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Hammadde ihtiyaç analizini getir"""
    
    requirements = await db.raw_material_requirements.find({
        "plan_id": plan_id
    }, {"_id": 0}).to_list(length=None)
    
    # Özet istatistikler
    total_items = len(requirements)
    sufficient_items = sum(1 for r in requirements if r.get("is_sufficient"))
    insufficient_items = total_items - sufficient_items
    total_deficit_value = sum(r.get("deficit_quantity", 0) for r in requirements)
    
    return {
        "requirements": requirements,
        "summary": {
            "total_items": total_items,
            "sufficient_items": sufficient_items,
            "insufficient_items": insufficient_items,
            "total_deficit_value": total_deficit_value
        }
    }


@router.post("/raw-materials/calculate/{plan_id}")
async def calculate_raw_materials(
    plan_id: str,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_MANAGER,
        UserRole.WAREHOUSE_SUPERVISOR,
        UserRole.WAREHOUSE_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Hammadde ihtiyacını yeniden hesapla"""
    
    bom_service = BOMCalculationService(db)
    requirements = await bom_service.calculate_raw_material_needs(plan_id)
    
    return {
        "message": "Hammadde ihtiyacı hesaplandı",
        "requirements": requirements
    }


# ========== QUALITY CONTROL ==========

@router.get("/quality-control")
async def get_quality_controls(
    order_id: Optional[str] = None,
    result: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Kalite kontrol kayıtlarını getir"""
    
    query = {}
    if order_id:
        query["order_id"] = order_id
    if result:
        query["result"] = result
    
    qc_records = await db.quality_control.find(query, {"_id": 0}).sort("inspection_date", -1).to_list(length=100)
    return {"quality_controls": qc_records, "total": len(qc_records)}


@router.post("/quality-control")
async def create_quality_control(
    qc_data: QualityControlCreate,
    current_user: dict = Depends(require_role([
        UserRole.QUALITY_CONTROL,
        UserRole.PRODUCTION_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Kalite kontrol kaydı oluştur"""
    
    # Emri getir
    order = await db.production_orders.find_one({"id": qc_data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    qc = QualityControl(
        order_id=qc_data.order_id,
        order_number=order.get("order_number", ""),
        product_id=order.get("product_id", ""),
        product_name=order.get("product_name", ""),
        batch_number=qc_data.batch_number,
        inspector_id=current_user.id,
        inspector_name=current_user.full_name,
        result=qc_data.result,
        tested_quantity=qc_data.tested_quantity,
        passed_quantity=qc_data.passed_quantity,
        failed_quantity=qc_data.failed_quantity,
        unit=qc_data.unit,
        test_parameters=qc_data.test_parameters,
        notes=qc_data.notes
    )
    
    await db.quality_control.insert_one(qc.model_dump())
    
    # Emrin durumunu güncelle
    if qc_data.result == "pass":
        await db.production_orders.update_one(
            {"id": qc_data.order_id},
            {"$set": {"status": ProductionOrderStatus.COMPLETED.value}}
        )
    elif qc_data.result == "fail":
        await db.production_orders.update_one(
            {"id": qc_data.order_id},
            {"$set": {"status": ProductionOrderStatus.FAILED.value}}
        )
    
    return {
        "message": "Kalite kontrol kaydı oluşturuldu",
        "quality_control": qc.model_dump()
    }


# ========== PRODUCTION TRACKING ==========

@router.get("/tracking")
async def get_production_tracking(
    line_id: Optional[str] = None,
    order_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Üretim takip kayıtlarını getir (canlı üretim durumu)"""
    
    query = {}
    if line_id:
        query["line_id"] = line_id
    if order_id:
        query["order_id"] = order_id
    
    tracking = await db.production_tracking.find(query).sort("created_at", -1).to_list(length=100)
    return {"tracking": tracking, "total": len(tracking)}


@router.post("/tracking")
async def create_tracking_record(
    order_id: str,
    produced_quantity: float,
    waste_quantity: float = 0.0,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Üretim takip kaydı oluştur (operatör güncelleme)"""
    
    # Emri getir
    order = await db.production_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    # Operatör kontrolü
    if current_user.role == UserRole.PRODUCTION_OPERATOR:
        if order.get("assigned_operator_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Bu emre erişim yetkiniz yok")
    
    tracking = ProductionTracking(
        order_id=order_id,
        order_number=order.get("order_number", ""),
        product_name=order.get("product_name", ""),
        line_id=order.get("line_id", ""),
        line_name=order.get("line_name", ""),
        operator_id=current_user.id,
        operator_name=current_user.full_name,
        produced_quantity=produced_quantity,
        waste_quantity=waste_quantity,
        unit=order.get("unit", ""),
        notes=notes
    )
    
    # Eğer ilk kayıt ise başlangıç zamanını set et
    if not order.get("actual_start"):
        tracking.start_time = datetime.now()
        await db.production_orders.update_one(
            {"id": order_id},
            {"$set": {"actual_start": tracking.start_time}}
        )
    
    await db.production_tracking.insert_one(tracking.model_dump())
    
    # Emirdeki toplam üretimi güncelle
    await db.production_orders.update_one(
        {"id": order_id},
        {
            "$inc": {
                "produced_quantity": produced_quantity,
                "waste_quantity": waste_quantity
            },
            "$set": {"status": ProductionOrderStatus.IN_PROGRESS.value}
        }
    )
    
    return {
        "message": "Üretim kaydı oluşturuldu",
        "tracking": tracking.model_dump()
    }


# ========== DASHBOARD STATS ==========

@router.get("/dashboard/stats")
async def get_production_dashboard_stats(
    current_user: dict = Depends(get_current_user)
):
    """Üretim dashboard istatistikleri"""
    
    # Toplam plan sayısı
    total_plans = await db.production_plans.count_documents({})
    active_plans = await db.production_plans.count_documents({
        "status": {"$in": [ProductionPlanStatus.APPROVED.value, ProductionPlanStatus.IN_PROGRESS.value]}
    })
    
    # Toplam emir sayısı
    total_orders = await db.production_orders.count_documents({})
    pending_orders = await db.production_orders.count_documents({
        "status": ProductionOrderStatus.PENDING.value
    })
    in_progress_orders = await db.production_orders.count_documents({
        "status": ProductionOrderStatus.IN_PROGRESS.value
    })
    completed_orders = await db.production_orders.count_documents({
        "status": ProductionOrderStatus.COMPLETED.value
    })
    
    # Üretim hatları
    total_lines = await db.production_lines.count_documents({})
    active_lines = await db.production_lines.count_documents({
        "status": "active"
    })
    
    # Kalite kontrol
    total_qc = await db.quality_control.count_documents({})
    passed_qc = await db.quality_control.count_documents({
        "result": "pass"
    })
    
    # BOM sayısı
    total_boms = await db.bill_of_materials.count_documents({
        "is_active": True
    })
    
    return {
        "plans": {
            "total": total_plans,
            "active": active_plans
        },
        "orders": {
            "total": total_orders,
            "pending": pending_orders,
            "in_progress": in_progress_orders,
            "completed": completed_orders
        },
        "lines": {
            "total": total_lines,
            "active": active_lines
        },
        "quality_control": {
            "total": total_qc,
            "passed": passed_qc,
            "pass_rate": round((passed_qc / total_qc * 100), 2) if total_qc > 0 else 0
        },
        "boms": {
            "total": total_boms
        }
    }


# ========== OPERATOR PANEL ENDPOINTS ==========

@router.get("/operator/my-orders")
async def get_operator_assigned_orders(
    current_user: dict = Depends(require_role([UserRole.PRODUCTION_OPERATOR]))
):
    """Operatöre atanmış emirleri getir"""
    
    orders = await db.production_orders.find({
        "assigned_operator_id": current_user.id,
        "status": {"$in": [
            ProductionOrderStatus.APPROVED.value,
            ProductionOrderStatus.IN_PROGRESS.value
        ]}
    }, {"_id": 0}).sort("priority", -1).to_list(length=50)
    
    return {"orders": orders, "total": len(orders)}


@router.post("/operator/orders/{order_id}/start")
async def start_production_order(
    order_id: str,
    current_user: dict = Depends(require_role([UserRole.PRODUCTION_OPERATOR]))
):
    """Üretim emrini başlat"""
    
    order = await db.production_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    # Operatör kontrolü
    if order.get("assigned_operator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Bu emre erişim yetkiniz yok")
    
    # Durumu güncelle
    await db.production_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": ProductionOrderStatus.IN_PROGRESS.value,
                "actual_start": datetime.now(),
                "updated_at": datetime.now()
            }
        }
    )
    
    return {"message": "Üretim başlatıldı"}


@router.post("/operator/orders/{order_id}/pause")
async def pause_production_order(
    order_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.PRODUCTION_OPERATOR]))
):
    """Üretimi duraklat"""
    
    order = await db.production_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    if order.get("assigned_operator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Bu emre erişim yetkiniz yok")
    
    # Notu kaydet
    note = f"Üretim duraklatıldı. {reason if reason else ''}"
    
    await db.production_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "notes": note,
                "updated_at": datetime.now()
            }
        }
    )
    
    return {"message": "Üretim duraklatıldı"}


@router.post("/operator/orders/{order_id}/complete")
async def complete_production_order(
    order_id: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.PRODUCTION_OPERATOR]))
):
    """Üretimi tamamla"""
    
    order = await db.production_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    if order.get("assigned_operator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Bu emre erişim yetkiniz yok")
    
    update_data = {
        "status": ProductionOrderStatus.QUALITY_CHECK.value,  # Kalite kontrole gönder
        "actual_end": datetime.now(),
        "updated_at": datetime.now()
    }
    
    if notes:
        update_data["notes"] = notes
    
    await db.production_orders.update_one(
        {"id": order_id},
        {"$set": update_data}
    )
    
    return {"message": "Üretim tamamlandı, kalite kontrole gönderildi"}


# ========== MACHINE DOWNTIME ==========

@router.get("/downtime")
async def get_machine_downtimes(
    line_id: Optional[str] = None,
    downtime_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Makine duruş kayıtlarını getir"""
    
    query = {}
    if line_id:
        query["line_id"] = line_id
    if downtime_type:
        query["downtime_type"] = downtime_type
    
    downtimes = await db.machine_downtime.find(query, {"_id": 0}).sort("start_time", -1).to_list(length=100)
    return {"downtimes": downtimes, "total": len(downtimes)}


@router.post("/downtime")
async def create_machine_downtime(
    downtime_data: MachineDowntimeCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_OPERATOR,
        UserRole.PRODUCTION_MANAGER,
        UserRole.MAINTENANCE_TECHNICIAN
    ]))
):
    """Makine duruş kaydı oluştur"""
    
    # Hat bilgisini al
    line = await db.production_lines.find_one({"id": downtime_data.line_id}, {"_id": 0})
    if not line:
        raise HTTPException(status_code=404, detail="Hat bulunamadı")
    
    start_time = downtime_data.start_time or datetime.now()
    
    downtime = MachineDowntime(
        order_id=downtime_data.order_id,
        line_id=downtime_data.line_id,
        line_name=line.get("name", ""),
        downtime_type=downtime_data.downtime_type,
        start_time=start_time,
        end_time=downtime_data.end_time,
        reason=downtime_data.reason,
        operator_id=current_user.id,
        operator_name=current_user.full_name
    )
    
    # Süreyi hesapla
    if downtime.end_time:
        duration = (downtime.end_time - downtime.start_time).total_seconds() / 60
        downtime.duration_minutes = duration
    
    await db.machine_downtime.insert_one(downtime.model_dump())
    
    # Hat durumunu güncelle (eğer hala duruyorsa)
    if not downtime.end_time:
        await db.production_lines.update_one(
            {"id": downtime_data.line_id},
            {"$set": {"status": "maintenance" if downtime_data.downtime_type == DowntimeType.MAINTENANCE else "idle"}}
        )
    
    return {
        "message": "Duruş kaydı oluşturuldu",
        "downtime": downtime.model_dump()
    }


@router.patch("/downtime/{downtime_id}/end")
async def end_machine_downtime(
    downtime_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Makine duruşunu sonlandır"""
    
    downtime = await db.machine_downtime.find_one({"id": downtime_id}, {"_id": 0})
    if not downtime:
        raise HTTPException(status_code=404, detail="Duruş kaydı bulunamadı")
    
    end_time = datetime.now()
    start_time = downtime.get("start_time")
    duration = (end_time - start_time).total_seconds() / 60
    
    await db.machine_downtime.update_one(
        {"id": downtime_id},
        {
            "$set": {
                "end_time": end_time,
                "duration_minutes": duration,
                "updated_at": datetime.now()
            }
        }
    )
    
    # Hat durumunu aktif yap
    await db.production_lines.update_one(
        {"id": downtime.get("line_id")},
        {"$set": {"status": "active"}}
    )
    
    return {"message": "Duruş sonlandırıldı", "duration_minutes": duration}


# ========== RAW MATERIAL USAGE ==========

@router.get("/raw-material-usage")
async def get_raw_material_usage(
    order_id: Optional[str] = None,
    batch_number: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Hammadde kullanım kayıtlarını getir"""
    
    query = {}
    if order_id:
        query["order_id"] = order_id
    if batch_number:
        query["batch_number"] = batch_number
    
    usage_records = await db.raw_material_usage.find(query, {"_id": 0}).sort("usage_time", -1).to_list(length=200)
    return {"usage_records": usage_records, "total": len(usage_records)}


@router.post("/raw-material-usage")
async def create_raw_material_usage(
    usage_data: RawMaterialUsageCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_OPERATOR,
        UserRole.PRODUCTION_MANAGER
    ]))
):
    """Hammadde kullanım kaydı oluştur"""
    
    # Emri getir
    order = await db.production_orders.find_one({"id": usage_data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    usage = RawMaterialUsage(
        order_id=usage_data.order_id,
        order_number=order.get("order_number", ""),
        batch_number=usage_data.batch_number,
        raw_material_id=usage_data.raw_material_id,
        raw_material_name=usage_data.raw_material_name,
        used_quantity=usage_data.used_quantity,
        unit=usage_data.unit,
        lot_number=usage_data.lot_number,
        operator_id=current_user.id,
        operator_name=current_user.full_name,
        notes=usage_data.notes
    )
    
    await db.raw_material_usage.insert_one(usage.model_dump())
    
    return {
        "message": "Hammadde kullanımı kaydedildi",
        "usage": usage.model_dump()
    }


# ========== BATCH RECORDS ==========

@router.get("/batches")
async def get_batch_records(
    order_id: Optional[str] = None,
    product_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Batch kayıtlarını getir"""
    
    query = {}
    if order_id:
        query["order_id"] = order_id
    if product_id:
        query["product_id"] = product_id
    
    batches = await db.batch_records.find(query, {"_id": 0}).sort("production_date", -1).to_list(length=100)
    return {"batches": batches, "total": len(batches)}


@router.post("/batches")
async def create_batch_record(
    batch_data: BatchRecordCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_OPERATOR,
        UserRole.PRODUCTION_MANAGER
    ]))
):
    """Batch kaydı oluştur"""
    
    # Emri getir
    order = await db.production_orders.find_one({"id": batch_data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    # Batch numarası oluştur
    batch_number = f"BATCH-{datetime.now().strftime('%Y%m%d')}-{order.get('order_number', '')[-6:]}"
    
    batch = BatchRecord(
        batch_number=batch_number,
        order_id=batch_data.order_id,
        order_number=order.get("order_number", ""),
        product_id=order.get("product_id", ""),
        product_name=order.get("product_name", ""),
        quantity=batch_data.quantity,
        unit=order.get("unit", ""),
        line_id=order.get("line_id", ""),
        line_name=order.get("line_name", ""),
        operator_id=current_user.id,
        operator_name=current_user.full_name,
        expiry_date=batch_data.expiry_date,
        notes=batch_data.notes
    )
    
    await db.batch_records.insert_one(batch.model_dump())
    
    return {
        "message": "Batch kaydı oluşturuldu",
        "batch": batch.model_dump()
    }


# ========== OPERATOR NOTES ==========

@router.get("/operator-notes")
async def get_operator_notes(
    order_id: Optional[str] = None,
    line_id: Optional[str] = None,
    note_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Operatör notlarını getir"""
    
    query = {}
    if order_id:
        query["order_id"] = order_id
    if line_id:
        query["line_id"] = line_id
    if note_type:
        query["note_type"] = note_type
    
    notes = await db.operator_notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    return {"notes": notes, "total": len(notes)}


@router.post("/operator-notes")
async def create_operator_note(
    note_data: OperatorNoteCreate,
    current_user: dict = Depends(require_role([
        UserRole.PRODUCTION_OPERATOR,
        UserRole.PRODUCTION_MANAGER
    ]))
):
    """Operatör notu oluştur"""
    
    note = OperatorNote(
        order_id=note_data.order_id,
        line_id=note_data.line_id,
        note_type=note_data.note_type,
        note_text=note_data.note_text,
        operator_id=current_user.id,
        operator_name=current_user.full_name,
        shift=note_data.shift
    )
    
    await db.operator_notes.insert_one(note.model_dump())
    
    return {
        "message": "Not kaydedildi",
        "note": note.model_dump()
    }


@router.delete("/operator-notes/{note_id}")
async def delete_operator_note(
    note_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Operatör notunu sil"""
    
    note = await db.operator_notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Not bulunamadı")
    
    # Sadece notu yazan silebilir veya manager
    if note.get("operator_id") != current_user.id and current_user.role != UserRole.PRODUCTION_MANAGER:
        raise HTTPException(status_code=403, detail="Bu notu silme yetkiniz yok")
    
    await db.operator_notes.delete_one({"id": note_id})
    
    return {"message": "Not silindi"}


# ========== OPERATOR DASHBOARD STATS ==========

@router.get("/operator/dashboard/stats")
async def get_operator_dashboard_stats(
    current_user: dict = Depends(require_role([UserRole.PRODUCTION_OPERATOR]))
):
    """Operatör dashboard istatistikleri"""
    
    # Atanmış emirler
    my_orders = await db.production_orders.count_documents({
        "assigned_operator_id": current_user.id,
        "status": {"$in": [
            ProductionOrderStatus.APPROVED.value,
            ProductionOrderStatus.IN_PROGRESS.value
        ]}
    })
    
    # Devam eden emirler
    in_progress = await db.production_orders.count_documents({
        "assigned_operator_id": current_user.id,
        "status": ProductionOrderStatus.IN_PROGRESS.value
    })
    
    # Bugün tamamlanan emirler
    from datetime import timedelta
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    completed_today = await db.production_orders.count_documents({
        "assigned_operator_id": current_user.id,
        "status": ProductionOrderStatus.COMPLETED.value,
        "actual_end": {"$gte": today_start}
    })
    
    # Aktif duruşlar
    active_downtimes = await db.machine_downtime.count_documents({
        "operator_id": current_user.id,
        "end_time": None
    })
    
    # Son notlar
    recent_notes = await db.operator_notes.find({
        "operator_id": current_user.id
    }, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "my_orders": my_orders,
        "in_progress": in_progress,
        "completed_today": completed_today,
        "active_downtimes": active_downtimes,
        "recent_notes": recent_notes
    }


# ========== QC SPECIALIST ENDPOINTS ==========

@router.get("/qc/pending-batches")
async def get_qc_pending_batches(
    current_user: dict = Depends(require_role([
        UserRole.QUALITY_CONTROL,
        UserRole.PRODUCTION_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Kalite kontrolü bekleyen batch'leri getir"""
    
    # Quality check statüsündeki emirleri al
    orders = await db.production_orders.find({
        "status": ProductionOrderStatus.QUALITY_CHECK.value
    }, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    
    # İlgili batch'leri al
    batch_numbers = [order.get("order_number") for order in orders if order.get("order_number")]
    batches = await db.batch_records.find({
        "order_number": {"$in": batch_numbers}
    }, {"_id": 0}).to_list(length=100)
    
    return {
        "pending_orders": orders,
        "pending_batches": batches,
        "total": len(orders)
    }


@router.get("/qc/dashboard/stats")
async def get_qc_dashboard_stats(
    current_user: dict = Depends(require_role([
        UserRole.QUALITY_CONTROL,
        UserRole.PRODUCTION_MANAGER,
        UserRole.ADMIN
    ]))
):
    """QC dashboard istatistikleri"""
    
    from datetime import timedelta
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # Bekleyen testler
    pending_tests = await db.production_orders.count_documents({
        "status": ProductionOrderStatus.QUALITY_CHECK.value
    })
    
    # Bugün yapılan testler
    tests_today = await db.quality_control.count_documents({
        "inspection_date": {"$gte": today_start}
    })
    
    # Bu hafta geçen/kalan
    qc_pass_week = await db.quality_control.count_documents({
        "result": "pass",
        "inspection_date": {"$gte": week_start}
    })
    
    qc_fail_week = await db.quality_control.count_documents({
        "result": "fail",
        "inspection_date": {"$gte": week_start}
    })
    
    # Açık NCR'ler
    open_ncrs = await db.non_conformance_reports.count_documents({
        "status": {"$in": ["open", "in_progress"]}
    })
    
    # Kritik HACCP sapmaları
    haccp_deviations = await db.haccp_records.count_documents({
        "status": "deviation",
        "monitoring_time": {"$gte": week_start}
    })
    
    return {
        "pending_tests": pending_tests,
        "tests_today": tests_today,
        "qc_pass_week": qc_pass_week,
        "qc_fail_week": qc_fail_week,
        "pass_rate_week": round((qc_pass_week / (qc_pass_week + qc_fail_week) * 100), 2) if (qc_pass_week + qc_fail_week) > 0 else 0,
        "open_ncrs": open_ncrs,
        "haccp_deviations": haccp_deviations
    }


# ========== NON-CONFORMANCE REPORTS ==========

@router.get("/qc/ncr")
async def get_non_conformance_reports(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Uygunsuzluk raporlarını getir"""
    
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    
    ncrs = await db.non_conformance_reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    return {"ncrs": ncrs, "total": len(ncrs)}


@router.post("/qc/ncr")
async def create_non_conformance_report(
    ncr_data: NonConformanceReportCreate,
    current_user: dict = Depends(require_role([
        UserRole.QUALITY_CONTROL,
        UserRole.PRODUCTION_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Uygunsuzluk raporu oluştur"""
    
    # NCR numarası oluştur
    ncr_number = f"NCR-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}"
    
    ncr = NonConformanceReport(
        ncr_number=ncr_number,
        qc_record_id=ncr_data.qc_record_id,
        batch_number=ncr_data.batch_number,
        order_id=ncr_data.order_id,
        product_id=ncr_data.product_id,
        product_name=ncr_data.product_name,
        nonconformance_type=ncr_data.nonconformance_type,
        severity=ncr_data.severity,
        description=ncr_data.description,
        quantity_affected=ncr_data.quantity_affected,
        unit=ncr_data.unit,
        root_cause=ncr_data.root_cause,
        corrective_action=ncr_data.corrective_action,
        preventive_action=ncr_data.preventive_action,
        capa_required=ncr_data.capa_required,
        reported_by=current_user.id,
        reported_by_name=current_user.full_name
    )
    
    await db.non_conformance_reports.insert_one(ncr.model_dump())
    
    return {
        "message": "Uygunsuzluk raporu oluşturuldu",
        "ncr": ncr.model_dump()
    }


@router.patch("/qc/ncr/{ncr_id}/status")
async def update_ncr_status(
    ncr_id: str,
    status: str,
    assigned_to: Optional[str] = None,
    current_user: dict = Depends(require_role([
        UserRole.QUALITY_CONTROL,
        UserRole.PRODUCTION_MANAGER,
        UserRole.ADMIN
    ]))
):
    """NCR durumunu güncelle"""
    
    update_data = {
        "status": status,
        "updated_at": datetime.now()
    }
    
    if assigned_to:
        update_data["assigned_to"] = assigned_to
    
    if status == "closed":
        update_data["closed_date"] = datetime.now()
    
    await db.non_conformance_reports.update_one(
        {"id": ncr_id},
        {"$set": update_data}
    )
    
    return {"message": "NCR durumu güncellendi"}


# ========== QUALITY TESTS ==========

@router.get("/qc/tests")
async def get_quality_tests(
    qc_record_id: Optional[str] = None,
    batch_number: Optional[str] = None,
    test_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Kalite test kayıtlarını getir"""
    
    query = {}
    if qc_record_id:
        query["qc_record_id"] = qc_record_id
    if batch_number:
        query["batch_number"] = batch_number
    if test_type:
        query["test_type"] = test_type
    
    tests = await db.quality_tests.find(query, {"_id": 0}).sort("test_date", -1).to_list(length=200)
    return {"tests": tests, "total": len(tests)}


@router.post("/qc/tests")
async def create_quality_test(
    test_data: QualityTestCreate,
    current_user: dict = Depends(require_role([
        UserRole.QUALITY_CONTROL,
        UserRole.PRODUCTION_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Kalite test kaydı oluştur"""
    
    test = QualityTest(
        qc_record_id=test_data.qc_record_id,
        batch_number=test_data.batch_number,
        test_type=test_data.test_type,
        test_name=test_data.test_name,
        test_method=test_data.test_method,
        measured_value=test_data.measured_value,
        unit=test_data.unit,
        specification_min=test_data.specification_min,
        specification_max=test_data.specification_max,
        result=test_data.result,
        tested_by=current_user.id,
        tested_by_name=current_user.full_name,
        notes=test_data.notes
    )
    
    await db.quality_tests.insert_one(test.model_dump())
    
    return {
        "message": "Test kaydı oluşturuldu",
        "test": test.model_dump()
    }


# ========== HACCP RECORDS ==========

@router.get("/qc/haccp")
async def get_haccp_records(
    ccp_number: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """HACCP kayıtlarını getir"""
    
    query = {}
    if ccp_number:
        query["ccp_number"] = ccp_number
    if status:
        query["status"] = status
    
    records = await db.haccp_records.find(query, {"_id": 0}).sort("monitoring_time", -1).to_list(length=200)
    return {"haccp_records": records, "total": len(records)}


@router.post("/qc/haccp")
async def create_haccp_record(
    haccp_data: HACCPRecordCreate,
    current_user: dict = Depends(require_role([
        UserRole.QUALITY_CONTROL,
        UserRole.PRODUCTION_MANAGER,
        UserRole.PRODUCTION_OPERATOR,
        UserRole.ADMIN
    ]))
):
    """HACCP kaydı oluştur"""
    
    record = HACCPRecord(
        ccp_number=haccp_data.ccp_number,
        ccp_name=haccp_data.ccp_name,
        order_id=haccp_data.order_id,
        batch_number=haccp_data.batch_number,
        monitored_parameter=haccp_data.monitored_parameter,
        measured_value=haccp_data.measured_value,
        unit=haccp_data.unit,
        critical_limit_min=haccp_data.critical_limit_min,
        critical_limit_max=haccp_data.critical_limit_max,
        status=haccp_data.status,
        corrective_action=haccp_data.corrective_action,
        monitored_by=current_user.id,
        monitored_by_name=current_user.full_name
    )
    
    await db.haccp_records.insert_one(record.model_dump())
    
    return {
        "message": "HACCP kaydı oluşturuldu",
        "record": record.model_dump()
    }


# ========== QC TREND ANALYSIS ==========

@router.get("/qc/trend-analysis")
async def get_qc_trend_analysis(
    product_id: Optional[str] = None,
    days: int = 30,
    current_user: dict = Depends(require_role([
        UserRole.QUALITY_CONTROL,
        UserRole.PRODUCTION_MANAGER,
        UserRole.ADMIN
    ]))
):
    """QC trend analizi"""
    
    from datetime import timedelta
    start_date = datetime.now() - timedelta(days=days)
    
    query = {"inspection_date": {"$gte": start_date}}
    if product_id:
        query["product_id"] = product_id
    
    # Tüm QC kayıtlarını al
    qc_records = await db.quality_control.find(query, {"_id": 0}).sort("inspection_date", 1).to_list(length=500)
    
    # Günlük bazda grupla
    daily_stats = {}
    for record in qc_records:
        date_key = record.get("inspection_date").strftime("%Y-%m-%d")
        if date_key not in daily_stats:
            daily_stats[date_key] = {"pass": 0, "fail": 0, "total": 0}
        
        daily_stats[date_key]["total"] += 1
        if record.get("result") == "pass":
            daily_stats[date_key]["pass"] += 1
        elif record.get("result") == "fail":
            daily_stats[date_key]["fail"] += 1
    
    # Pass rate hesapla
    trend_data = []
    for date_key, stats in sorted(daily_stats.items()):
        pass_rate = (stats["pass"] / stats["total"] * 100) if stats["total"] > 0 else 0
        trend_data.append({
            "date": date_key,
            "pass": stats["pass"],
            "fail": stats["fail"],
            "total": stats["total"],
            "pass_rate": round(pass_rate, 2)
        })
    
    return {
        "trend_data": trend_data,
        "period_days": days
    }




# ========== WAREHOUSE SUPERVISOR ENDPOINTS ==========

@router.get("/warehouse/dashboard/stats")
async def get_warehouse_dashboard_stats(
    current_user: dict = Depends(require_role([
        UserRole.WAREHOUSE_SUPERVISOR,
        UserRole.WAREHOUSE_MANAGER,
        UserRole.PRODUCTION_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Depo dashboard istatistikleri"""
    
    from datetime import timedelta
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # Bugünkü hareketler
    transactions_today = await db.warehouse_transactions.count_documents({
        "transaction_date": {"$gte": today_start}
    })
    
    # Bu hafta çıkışlar
    raw_material_outs = await db.warehouse_transactions.count_documents({
        "transaction_type": TransactionType.RAW_MATERIAL_OUT.value,
        "transaction_date": {"$gte": week_start}
    })
    
    # Bu hafta girişler
    finished_good_ins = await db.warehouse_transactions.count_documents({
        "transaction_type": TransactionType.FINISHED_GOOD_IN.value,
        "transaction_date": {"$gte": week_start}
    })
    
    # Blokeli stoklar
    blocked_items = await db.stock_items.count_documents({
        "status": "blocked"
    })
    
    # Yaklaşan SKT'ler (30 gün içinde)
    expiry_threshold = datetime.now() + timedelta(days=30)
    expiring_soon = await db.stock_items.count_documents({
        "expiry_date": {"$lte": expiry_threshold, "$gte": datetime.now()}
    })
    
    # Toplam lokasyon
    total_locations = await db.stock_locations.count_documents({"is_active": True})
    
    # Dolu lokasyonlar
    occupied_locations = await db.stock_items.count_documents({
        "quantity": {"$gt": 0}
    })
    
    return {
        "transactions_today": transactions_today,
        "raw_material_outs": raw_material_outs,
        "finished_good_ins": finished_good_ins,
        "blocked_items": blocked_items,
        "expiring_soon": expiring_soon,
        "total_locations": total_locations,
        "occupied_locations": occupied_locations,
        "occupancy_rate": round((occupied_locations / total_locations * 100), 2) if total_locations > 0 else 0
    }


# ========== WAREHOUSE TRANSACTIONS ==========

@router.get("/warehouse/transactions")
async def get_warehouse_transactions(
    transaction_type: Optional[str] = None,
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Depo hareketlerini getir"""
    
    from datetime import timedelta
    start_date = datetime.now() - timedelta(days=days)
    
    query = {"transaction_date": {"$gte": start_date}}
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    transactions = await db.warehouse_transactions.find(query, {"_id": 0}).sort("transaction_date", -1).to_list(length=200)
    return {"transactions": transactions, "total": len(transactions)}


@router.post("/warehouse/transactions/raw-material-out")
async def create_raw_material_out(
    transaction_data: WarehouseTransactionCreate,
    current_user: dict = Depends(require_role([
        UserRole.WAREHOUSE_SUPERVISOR,
        UserRole.WAREHOUSE_MANAGER,
        UserRole.PRODUCTION_MANAGER
    ]))
):
    """Hammadde çıkışı"""
    
    # Transaction number oluştur
    trans_number = f"WHT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}"
    
    transaction = WarehouseTransaction(
        transaction_number=trans_number,
        transaction_type=TransactionType.RAW_MATERIAL_OUT,
        order_id=transaction_data.order_id,
        batch_number=transaction_data.batch_number,
        product_id=transaction_data.product_id,
        product_name=transaction_data.product_name,
        quantity=transaction_data.quantity,
        unit=transaction_data.unit,
        from_location=transaction_data.from_location,
        to_location=transaction_data.to_location,
        lot_number=transaction_data.lot_number,
        expiry_date=transaction_data.expiry_date,
        operator_id=current_user.id,
        operator_name=current_user.full_name,
        notes=transaction_data.notes
    )
    
    await db.warehouse_transactions.insert_one(transaction.model_dump())
    
    # Stoktan düş (eğer lokasyon belirtilmişse)
    if transaction_data.from_location:
        await db.stock_items.update_one(
            {
                "location_code": transaction_data.from_location,
                "product_id": transaction_data.product_id
            },
            {"$inc": {"quantity": -transaction_data.quantity}}
        )
    
    return {
        "message": "Hammadde çıkışı kaydedildi",
        "transaction": transaction.model_dump()
    }


@router.post("/warehouse/transactions/finished-good-in")
async def create_finished_good_in(
    transaction_data: WarehouseTransactionCreate,
    current_user: dict = Depends(require_role([
        UserRole.WAREHOUSE_SUPERVISOR,
        UserRole.WAREHOUSE_MANAGER,
        UserRole.PRODUCTION_MANAGER
    ]))
):
    """Mamul girişi (Üretimden gelen)"""
    
    trans_number = f"WHT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}"
    
    transaction = WarehouseTransaction(
        transaction_number=trans_number,
        transaction_type=TransactionType.FINISHED_GOOD_IN,
        order_id=transaction_data.order_id,
        batch_number=transaction_data.batch_number,
        product_id=transaction_data.product_id,
        product_name=transaction_data.product_name,
        quantity=transaction_data.quantity,
        unit=transaction_data.unit,
        from_location=transaction_data.from_location,
        to_location=transaction_data.to_location,
        lot_number=transaction_data.lot_number,
        expiry_date=transaction_data.expiry_date,
        operator_id=current_user.id,
        operator_name=current_user.full_name,
        notes=transaction_data.notes
    )
    
    await db.warehouse_transactions.insert_one(transaction.model_dump())
    
    # Stok item oluştur veya güncelle
    if transaction_data.to_location:
        existing = await db.stock_items.find_one({
            "location_code": transaction_data.to_location,
            "product_id": transaction_data.product_id,
            "lot_number": transaction_data.lot_number
        })
        
        if existing:
            await db.stock_items.update_one(
                {"id": existing["id"]},
                {"$inc": {"quantity": transaction_data.quantity}}
            )
        else:
            # Yeni stok item
            stock_item = StockItem(
                location_id="",
                location_code=transaction_data.to_location,
                product_id=transaction_data.product_id,
                product_name=transaction_data.product_name,
                lot_number=transaction_data.lot_number,
                batch_number=transaction_data.batch_number,
                quantity=transaction_data.quantity,
                unit=transaction_data.unit,
                expiry_date=transaction_data.expiry_date
            )
            await db.stock_items.insert_one(stock_item.model_dump())
    
    return {
        "message": "Mamul girişi kaydedildi",
        "transaction": transaction.model_dump()
    }


# ========== STOCK LOCATIONS ==========

@router.get("/warehouse/locations")
async def get_stock_locations(
    zone: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Stok lokasyonlarını getir"""
    
    query = {"is_active": True}
    if zone:
        query["zone"] = zone
    
    locations = await db.stock_locations.find(query, {"_id": 0}).sort("location_code", 1).to_list(length=500)
    return {"locations": locations, "total": len(locations)}


@router.post("/warehouse/locations")
async def create_stock_location(
    location_data: StockLocationCreate,
    current_user: dict = Depends(require_role([
        UserRole.WAREHOUSE_SUPERVISOR,
        UserRole.WAREHOUSE_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Yeni lokasyon oluştur"""
    
    # Aynı kod var mı kontrol et
    existing = await db.stock_locations.find_one({"location_code": location_data.location_code})
    if existing:
        raise HTTPException(status_code=400, detail="Bu lokasyon kodu zaten mevcut")
    
    location = StockLocation(**location_data.model_dump())
    await db.stock_locations.insert_one(location.model_dump())
    
    return {
        "message": "Lokasyon oluşturuldu",
        "location": location.model_dump()
    }


# ========== STOCK ITEMS ==========

@router.get("/warehouse/stock-items")
async def get_stock_items(
    location_code: Optional[str] = None,
    product_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Stok kalemlerini getir"""
    
    query = {}
    if location_code:
        query["location_code"] = location_code
    if product_id:
        query["product_id"] = product_id
    if status:
        query["status"] = status
    
    items = await db.stock_items.find(query, {"_id": 0}).sort("updated_at", -1).to_list(length=500)
    return {"stock_items": items, "total": len(items)}


@router.get("/warehouse/stock-items/expiring")
async def get_expiring_stock_items(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Yaklaşan SKT'li ürünleri getir (FIFO/FEFO uyarısı)"""
    
    from datetime import timedelta
    threshold = datetime.now() + timedelta(days=days)
    
    items = await db.stock_items.find({
        "expiry_date": {"$lte": threshold, "$gte": datetime.now()},
        "quantity": {"$gt": 0}
    }, {"_id": 0}).sort("expiry_date", 1).to_list(length=200)
    
    return {"expiring_items": items, "total": len(items)}


@router.patch("/warehouse/stock-items/{item_id}")
async def update_stock_item(
    item_id: str,
    update_data: StockItemUpdate,
    current_user: dict = Depends(require_role([
        UserRole.WAREHOUSE_SUPERVISOR,
        UserRole.WAREHOUSE_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Stok kalemi güncelle"""
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now()
    
    await db.stock_items.update_one(
        {"id": item_id},
        {"$set": update_dict}
    )
    
    return {"message": "Stok kalemi güncellendi"}


# ========== STOCK COUNT ==========

@router.get("/warehouse/stock-counts")
async def get_stock_counts(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Stok sayım kayıtlarını getir"""
    
    from datetime import timedelta
    start_date = datetime.now() - timedelta(days=days)
    
    counts = await db.stock_counts.find({
        "count_date": {"$gte": start_date}
    }, {"_id": 0}).sort("count_date", -1).to_list(length=200)
    
    return {"stock_counts": counts, "total": len(counts)}


@router.post("/warehouse/stock-counts")
async def create_stock_count(
    count_data: StockCountCreate,
    current_user: dict = Depends(require_role([
        UserRole.WAREHOUSE_SUPERVISOR,
        UserRole.WAREHOUSE_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Stok sayımı oluştur"""
    
    count_number = f"CNT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}"
    
    difference = count_data.counted_quantity - count_data.system_quantity
    
    count = StockCount(
        count_number=count_number,
        location_id=count_data.location_id,
        product_id=count_data.product_id,
        product_name=count_data.product_name,
        system_quantity=count_data.system_quantity,
        counted_quantity=count_data.counted_quantity,
        difference=difference,
        unit=count_data.unit,
        counted_by=current_user.id,
        counted_by_name=current_user.full_name,
        notes=count_data.notes
    )
    
    await db.stock_counts.insert_one(count.model_dump())
    
    return {
        "message": "Sayım kaydı oluşturuldu",
        "count": count.model_dump(),
        "difference": difference
    }


# ========== STOCK BLOCK ==========

@router.get("/warehouse/stock-blocks")
async def get_stock_blocks(
    qc_status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Stok blokaj kayıtlarını getir"""
    
    query = {}
    if qc_status:
        query["qc_status"] = qc_status
    
    blocks = await db.stock_blocks.find(query, {"_id": 0}).sort("block_date", -1).to_list(length=100)
    return {"stock_blocks": blocks, "total": len(blocks)}


@router.post("/warehouse/stock-blocks")
async def create_stock_block(
    block_data: StockBlockCreate,
    current_user: dict = Depends(require_role([
        UserRole.WAREHOUSE_SUPERVISOR,
        UserRole.WAREHOUSE_MANAGER,
        UserRole.QUALITY_CONTROL,
        UserRole.ADMIN
    ]))
):
    """Stok blokajı oluştur"""
    
    block_number = f"BLK-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6]}"
    
    block = StockBlock(
        block_number=block_number,
        stock_item_id=block_data.stock_item_id,
        product_id=block_data.product_id,
        product_name=block_data.product_name,
        lot_number=block_data.lot_number,
        batch_number=block_data.batch_number,
        quantity=block_data.quantity,
        unit=block_data.unit,
        reason=block_data.reason,
        blocked_by=current_user.id,
        blocked_by_name=current_user.full_name
    )
    
    await db.stock_blocks.insert_one(block.model_dump())
    
    # Stok item'ı blokeli yap
    await db.stock_items.update_one(
        {"id": block_data.stock_item_id},
        {"$set": {"status": "blocked", "block_reason": block_data.reason}}
    )
    
    return {
        "message": "Stok blokajı oluşturuldu",
        "block": block.model_dump()
    }


@router.patch("/warehouse/stock-blocks/{block_id}/release")
async def release_stock_block(
    block_id: str,
    qc_status: str,
    current_user: dict = Depends(require_role([
        UserRole.QUALITY_CONTROL,
        UserRole.WAREHOUSE_SUPERVISOR,
        UserRole.WAREHOUSE_MANAGER,
        UserRole.ADMIN
    ]))
):
    """Stok blokajını kaldır"""
    
    block = await db.stock_blocks.find_one({"id": block_id}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Blokaj kaydı bulunamadı")
    
    await db.stock_blocks.update_one(
        {"id": block_id},
        {
            "$set": {
                "qc_status": qc_status,
                "qc_inspected_by": current_user.id,
                "release_date": datetime.now()
            }
        }
    )
    
    # Stok item'ı serbest bırak
    if qc_status == "approved":
        await db.stock_items.update_one(
            {"id": block.get("stock_item_id")},
            {"$set": {"status": "available", "block_reason": None}}
        )
    
    return {"message": f"Blokaj {'kaldırıldı' if qc_status == 'approved' else 'reddedildi'}"}

