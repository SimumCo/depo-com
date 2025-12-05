# Production Management API Routes
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime

from models.production import (
    ProductionPlan, ProductionPlanCreate, ProductionPlanStatus,
    ProductionOrder, ProductionOrderCreate, ProductionOrderStatus,
    BillOfMaterials, BOMCreate,
    ProductionLine, ProductionLineCreate,
    RawMaterialRequirement, ProductionTracking, QualityControl, QualityControlCreate,
    ProductionOrderPriority
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
    
    plans = await db.production_plans.find(query).sort("created_at", -1).to_list(length=100)
    return {"plans": plans, "total": len(plans)}


@router.get("/plans/{plan_id}")
async def get_production_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Belirli bir üretim planını getir"""
    
    plan = await db.production_plans.find_one({"id": plan_id})
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
    
    plan = await db.production_plans.find_one({"id": plan_id})
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
    
    plan = await db.production_plans.find_one({"id": plan_id})
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
        current_user["id"]
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
    if current_user.get("role") == UserRole.PRODUCTION_OPERATOR.value:
        query["assigned_operator_id"] = current_user["id"]
    
    orders = await db.production_orders.find(query).sort("created_at", -1).to_list(length=200)
    return {"orders": orders, "total": len(orders)}


@router.get("/orders/{order_id}")
async def get_production_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Belirli bir üretim emrini getir"""
    
    order = await db.production_orders.find_one({"id": order_id})
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
    
    order = await db.production_orders.find_one({"id": order_id})
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
    
    boms = await db.bill_of_materials.find(query).to_list(length=100)
    return {"boms": boms, "total": len(boms)}


@router.get("/bom/{bom_id}")
async def get_bom(
    bom_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Belirli bir reçeteyi getir"""
    
    bom = await db.bill_of_materials.find_one({"id": bom_id})
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
    
    bom = await db.bill_of_materials.find_one({"id": bom_id})
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
    
    lines = await db.production_lines.find(query).to_list(length=100)
    return {"lines": lines, "total": len(lines)}


@router.get("/lines/{line_id}")
async def get_production_line(
    line_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Belirli bir üretim hattını getir"""
    
    line = await db.production_lines.find_one({"id": line_id})
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
    
    line = await db.production_lines.find_one({"id": line_id})
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
    }).to_list(length=None)
    
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
    
    qc_records = await db.quality_control.find(query).sort("inspection_date", -1).to_list(length=100)
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
    order = await db.production_orders.find_one({"id": qc_data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    qc = QualityControl(
        order_id=qc_data.order_id,
        order_number=order.get("order_number", ""),
        product_id=order.get("product_id", ""),
        product_name=order.get("product_name", ""),
        batch_number=qc_data.batch_number,
        inspector_id=current_user["id"],
        inspector_name=current_user.get("full_name", ""),
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
    order = await db.production_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    
    # Operatör kontrolü
    if current_user.get("role") == UserRole.PRODUCTION_OPERATOR.value:
        if order.get("assigned_operator_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Bu emre erişim yetkiniz yok")
    
    tracking = ProductionTracking(
        order_id=order_id,
        order_number=order.get("order_number", ""),
        product_name=order.get("product_name", ""),
        line_id=order.get("line_id", ""),
        line_name=order.get("line_name", ""),
        operator_id=current_user["id"],
        operator_name=current_user.get("full_name", ""),
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
