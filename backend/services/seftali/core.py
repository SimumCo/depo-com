"""
ŞEFTALİ - Core Utilities
Temel yardımcı fonksiyonlar ve sabitler
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
import uuid

# =============================================================================
# CONSTANTS
# =============================================================================

SMA_WINDOW = 8  # Simple Moving Average için kullanılacak interval sayısı
EPSILON = 1e-6  # Float karşılaştırmaları için minimum değer

DAY_MAP = {
    "MON": 0, "TUE": 1, "WED": 2, "THU": 3, 
    "FRI": 4, "SAT": 5, "SUN": 6
}

WEEKDAY_NAMES = [
    "Pazartesi", "Salı", "Çarşamba", "Perşembe", 
    "Cuma", "Cumartesi", "Pazar"
]

WEEKDAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

# Collection names
COL_USERS = "users"
COL_PRODUCTS = "products"
COL_CUSTOMERS = "sf_customers"
COL_DELIVERIES = "sf_deliveries"
COL_ORDERS = "sf_orders"
COL_SYSTEM_DRAFTS = "sf_system_drafts"
COL_WORKING_COPIES = "sf_working_copies"
COL_CAMPAIGNS = "sf_campaigns"
COL_SETTINGS = "sf_system_settings"
COL_AUDIT_EVENTS = "sf_audit_events"
COL_STOCK_DECLARATIONS = "sf_stock_declarations"
COL_PLASIYER_STOCK = "plasiyer_stock"
COL_WAREHOUSE_STOCK = "sf_warehouse_stock"

# Draft Engine collections
COL_DE_STATE = "de_customer_product_state"
COL_DE_LEDGER = "de_interval_ledger"
COL_DE_MULTIPLIERS = "de_weekly_product_multipliers"

# Variance collections
COL_VARIANCE_EVENTS = "sf_variance_events"


# =============================================================================
# DATE/TIME UTILITIES
# =============================================================================

def now_utc() -> datetime:
    """UTC olarak şu anki zamanı döndür."""
    return datetime.now(timezone.utc)


def to_iso(dt: datetime) -> Optional[str]:
    """Datetime'ı ISO formatına çevir."""
    return dt.isoformat() if dt else None


def parse_date(date_str) -> Optional[datetime.date]:
    """
    ISO date string'i date objesine çevir.
    
    Args:
        date_str: ISO format tarih string'i veya datetime objesi
        
    Returns:
        date objesi veya None
    """
    if not date_str:
        return None
    if isinstance(date_str, datetime):
        return date_str.date()
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
    except:
        return None


# =============================================================================
# ROUTE UTILITIES
# =============================================================================

def get_route_info(route_days: List[str]) -> Dict[str, int]:
    """
    Rota günlerinden hesaplama bilgilerini çıkar.
    
    Args:
        route_days: Rota günleri listesi (örn: ["TUE", "SAT"])
        
    Returns:
        {
            "days_to_next_route": int,  # Sonraki rotaya gün sayısı
            "supply_days": int,         # Ardışık rotalar arası gün
            "next_route_weekday": int   # Sonraki rota günü (0=Pzt)
        }
    """
    if not route_days:
        return {
            "days_to_next_route": 7, 
            "supply_days": 7, 
            "next_route_weekday": None
        }
    
    today_weekday = now_utc().weekday()
    route_weekdays = sorted(set(DAY_MAP.get(d, 0) for d in route_days))
    
    # Days to next route
    min_days = 8
    next_route_wd = None
    for rd in route_weekdays:
        diff = (rd - today_weekday) % 7
        if diff == 0:
            diff = 7
        if diff < min_days:
            min_days = diff
            next_route_wd = rd
    
    # Supply days (minimum gap between consecutive routes)
    supply_days = 7
    if len(route_weekdays) >= 2:
        min_gap = 7
        for i in range(len(route_weekdays)):
            curr = route_weekdays[i]
            next_idx = (i + 1) % len(route_weekdays)
            next_rd = route_weekdays[next_idx]
            gap = (next_rd - curr) % 7
            if gap == 0:
                gap = 7
            if gap < min_gap:
                min_gap = gap
        supply_days = min_gap
    
    return {
        "days_to_next_route": min_days,
        "supply_days": supply_days,
        "next_route_weekday": next_route_wd
    }


def days_between_routes(route_days: List[str]) -> int:
    """
    Ardışık rota günleri arasındaki minimum gün sayısını hesapla.
    
    Args:
        route_days: Rota günleri listesi
        
    Returns:
        Minimum gün sayısı (varsayılan 7)
    """
    return get_route_info(route_days).get("supply_days", 7)


# =============================================================================
# ID GENERATION
# =============================================================================

def gen_id() -> str:
    """Benzersiz UUID oluştur."""
    return str(uuid.uuid4())


# =============================================================================
# API RESPONSE HELPERS
# =============================================================================

def std_resp(success: bool, data=None, message: str = "") -> dict:
    """
    Standart API response formatı oluştur.
    
    Args:
        success: İşlem başarılı mı?
        data: Döndürülecek veri
        message: Opsiyonel mesaj
        
    Returns:
        {"success": bool, "data": any, "message": str}
    """
    resp = {"success": success}
    if data is not None:
        resp["data"] = data
    if message:
        resp["message"] = message
    return resp


# =============================================================================
# PRODUCT UTILITIES
# =============================================================================

async def get_product_by_id(db, product_id: str) -> Optional[dict]:
    """
    Ürünü ID'ye göre getir.
    
    Args:
        db: Database instance
        product_id: Ürün ID'si
        
    Returns:
        Ürün bilgileri veya None
    """
    product = await db[COL_PRODUCTS].find_one(
        {"product_id": product_id}, 
        {"_id": 0}
    )
    
    if product:
        return {
            "id": product.get("product_id"),
            "name": product.get("name", ""),
            "code": product.get("product_id", ""),
            "category_id": product.get("category_id"),
            "shelf_life_days": product.get("shelf_life_days"),
            "case_size": product.get("case_size", 1),
            "case_name": product.get("case_name", "Tekli")
        }
    
    return None
