"""
ŞEFTALİ - Servis Modülleri

Bu paket, ŞEFTALİ dağıtım yönetim sisteminin temel servislerini içerir.

Modüller:
- core: Temel yardımcı fonksiyonlar ve sabitler
- draft_engine: Draft Engine 2.0 hesaplama motoru
- order_service: Plasiyer sipariş hesaplama servisi
"""

from .core import (
    now_utc,
    to_iso,
    parse_date,
    get_route_info,
    DAY_MAP,
    WEEKDAY_NAMES,
    SMA_WINDOW,
    EPSILON,
    std_resp,
    gen_id,
    get_product_by_id,
)

from .draft_engine import DraftEngine
from .order_service import OrderService

__all__ = [
    # Core utilities
    'now_utc',
    'to_iso',
    'parse_date',
    'get_route_info',
    'DAY_MAP',
    'WEEKDAY_NAMES',
    'SMA_WINDOW',
    'EPSILON',
    'std_resp',
    'gen_id',
    'get_product_by_id',
    
    # Services
    'DraftEngine',
    'OrderService',
]
