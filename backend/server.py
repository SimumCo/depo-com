from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

# Import route modules
from routes.auth_routes import router as auth_router
from routes.invoice_routes import router as invoice_router
from routes.manual_invoice_routes import router as manual_invoice_router
from routes.customer_lookup_routes import router as customer_lookup_router
from routes.consumption_routes import router as consumption_router
from routes.customer_consumption_routes import router as customer_consumption_router

# Import old routes temporarily (will be refactored)
import server_old as old_server

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="Distribution Management System", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create main API router
api_router = APIRouter(prefix="/api")

# Include new modular routes
api_router.include_router(auth_router)
api_router.include_router(invoice_router)
api_router.include_router(manual_invoice_router)
api_router.include_router(customer_lookup_router)
api_router.include_router(consumption_router)
api_router.include_router(customer_consumption_router)

# Include old routes temporarily
# TODO: Refactor these into separate modules
api_router.include_router(old_server.api_router, tags=["Legacy"])

# Register main router
app.include_router(api_router)

@app.get("/")
async def root():
    return {
        "message": "Distribution Management System API",
        "version": "2.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
