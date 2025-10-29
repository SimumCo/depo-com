from fastapi import APIRouter
from .auth_routes import router as auth_router
from .products import router as products_router
from .inventory import router as inventory_router
from .shipments import router as shipments_router
from .orders import router as orders_router
from .tasks import router as tasks_router
from .feedback import router as feedback_router
from .catalog import router as catalog_router
from .salesrep import router as salesrep_router
from .customer_profile import router as customer_profile_router
from .dashboard import router as dashboard_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(products_router, tags=["Products"])
api_router.include_router(inventory_router, tags=["Inventory"])
api_router.include_router(shipments_router, tags=["Shipments"])
api_router.include_router(orders_router, tags=["Orders"])
api_router.include_router(tasks_router, tags=["Tasks"])
api_router.include_router(feedback_router, tags=["Feedback"])
api_router.include_router(catalog_router, tags=["Catalog"])
api_router.include_router(salesrep_router, tags=["Sales Rep"])
api_router.include_router(customer_profile_router, tags=["Customer Profile"])
api_router.include_router(dashboard_router, tags=["Dashboard"])

@api_router.get("/")
async def root():
    return {"message": "Distribution Management System API"}
