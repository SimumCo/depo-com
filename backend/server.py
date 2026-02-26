"""
ŞEFTALİ - Dağıtım Yönetim Sistemi
Ana Sunucu Dosyası (Refaktör Edilmiş)
"""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

# Route imports - Sadece aktif modüller
from routes.auth_routes import router as auth_router
from routes.products import router as products_router
from routes.users_routes import router as users_router
from routes.seftali import router as seftali_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(
    title="ŞEFTALİ - Dağıtım Yönetim Sistemi",
    description="Süt ürünleri dağıtım ve sipariş yönetim sistemi",
    version="3.0.0"
)

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

# Core routes
api_router.include_router(auth_router)           # /api/auth/*
api_router.include_router(products_router)       # /api/products/*
api_router.include_router(users_router)          # /api/users/*

# ŞEFTALİ routes
api_router.include_router(seftali_router)        # /api/seftali/*

# Register main router
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "app": "ŞEFTALİ",
        "description": "Dağıtım Yönetim Sistemi",
        "version": "3.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
