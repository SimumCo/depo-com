from fastapi import APIRouter
from .customer_routes import router as customer_router
from .sales_routes import router as sales_router
from .admin_routes import router as admin_router

router = APIRouter(prefix="/seftali", tags=["Seftali"])
router.include_router(customer_router)
router.include_router(sales_router)
router.include_router(admin_router)
