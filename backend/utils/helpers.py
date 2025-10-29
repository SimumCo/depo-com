"""
Utility Helper Functions
========================
Tekrar eden kod bloklarını ve yardımcı fonksiyonları içerir.
DRY (Don't Repeat Yourself) prensibine uygun kod yazımı için.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import uuid


# =============================================================================
# DATE & TIME HELPERS - Tarih ve Zaman Yardımcıları
# =============================================================================

def get_current_utc_time() -> datetime:
    """Şu anki UTC zamanını döndürür."""
    return datetime.now(timezone.utc)


def get_iso_timestamp() -> str:
    """ISO formatında string timestamp döndürür."""
    return get_current_utc_time().isoformat()


def generate_uuid() -> str:
    """Benzersiz UUID üretir."""
    return str(uuid.uuid4())


def generate_order_number(prefix: str = "ORD") -> str:
    """Benzersiz sipariş numarası üretir. Format: PREFIX-YYYYMMDD-XXXXX"""
    now = get_current_utc_time()
    date_part = now.strftime('%Y%m%d')
    random_part = str(uuid.uuid4())[:8].upper()
    return f"{prefix}-{date_part}-{random_part}"


def calculate_order_total(products: List[Dict[str, Any]]) -> float:
    """Siparişteki tüm ürünlerin toplam tutarını hesaplar."""
    total = sum(item.get('total_price', 0) for item in products)
    return round(total, 2)


def get_unit_price_by_channel(product: Dict[str, Any], channel_type: str) -> float:
    """Kanal tipine göre ürün birim fiyatını döndürür."""
    if channel_type == "logistics":
        return product.get('logistics_price', 0.0)
    return product.get('dealer_price', 0.0)


def calculate_cases_from_units(units: int, units_per_case: int) -> int:
    """Adet sayısından koli sayısını hesaplar."""
    if units_per_case <= 0:
        return 0
    return units // units_per_case



def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings for MongoDB"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj
