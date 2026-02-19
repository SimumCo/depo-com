"""
Maintenance Module - Router Aggregator
Bakım Modülü - Ana Router
"""
from fastapi import APIRouter
from .equipment_routes import router as equipment_router
from .task_routes import router as task_router
from .schedule_routes import router as schedule_router
from .spare_parts_routes import router as spare_parts_router
from .dashboard_routes import router as dashboard_router

# Ana router
router = APIRouter(prefix="/maintenance", tags=["maintenance"])

# Alt router'ları ekle
router.include_router(equipment_router)
router.include_router(task_router)
router.include_router(schedule_router)
router.include_router(spare_parts_router)
router.include_router(dashboard_router)

__all__ = ["router"]
