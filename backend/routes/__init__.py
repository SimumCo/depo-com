from fastapi import APIRouter
from .auth_routes import router as auth_router
from .invoice_routes import router as invoice_router
from .consumption_routes import router as consumption_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(invoice_router, tags=["Invoices"])
api_router.include_router(consumption_router, tags=["Consumption"])

@api_router.get("/")
async def root():
    return {"message": "Distribution Management System API"}
