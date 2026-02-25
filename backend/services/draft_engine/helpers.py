# Draft Engine - Helper Fonksiyonları
# Tarih işlemleri, ID üretimi, vb.

from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Tuple
import uuid


def gen_id() -> str:
    """UUID tabanlı benzersiz ID üretir"""
    return str(uuid.uuid4())


def now_utc() -> datetime:
    """Timezone-aware UTC datetime döndürür"""
    return datetime.now(timezone.utc)


def today_date() -> date:
    """Bugünün tarihi (date-only)"""
    return datetime.now(timezone.utc).date()


def to_date(dt: datetime | date | str) -> date:
    """Herhangi bir tarih formatını date'e çevirir"""
    if isinstance(dt, date) and not isinstance(dt, datetime):
        return dt
    if isinstance(dt, datetime):
        return dt.date()
    if isinstance(dt, str):
        # ISO format: YYYY-MM-DD veya YYYY-MM-DDTHH:MM:SS
        return datetime.fromisoformat(dt.replace("Z", "+00:00")).date()
    raise ValueError(f"Geçersiz tarih formatı: {dt}")


def to_iso_date(d: date) -> str:
    """Date'i YYYY-MM-DD formatına çevirir"""
    return d.isoformat()


def to_iso_datetime(dt: datetime) -> str:
    """Datetime'ı ISO formatına çevirir"""
    return dt.isoformat()


def parse_iso_date(s: str) -> date:
    """ISO date string'i date'e çevirir"""
    return date.fromisoformat(s)


def get_week_start(d: date) -> date:
    """
    Verilen tarihin ISO haftasının Pazartesi gününü döndürür.
    
    Args:
        d: Herhangi bir tarih
        
    Returns:
        O haftanın Pazartesi günü (date)
    """
    # weekday() returns 0=Monday, 6=Sunday
    days_since_monday = d.weekday()
    return d - timedelta(days=days_since_monday)


def get_iso_weekday(d: date) -> int:
    """
    ISO weekday döndürür (1=Pazartesi, 7=Pazar)
    
    Python'ın weekday() fonksiyonu 0=Monday döndürür,
    biz 1=Monday istiyoruz.
    """
    return d.weekday() + 1


def days_between_deliveries(prev_date: date, curr_date: date) -> int:
    """
    İki teslimat arasındaki gün sayısını hesaplar (Model B counting rule).
    
    Kural:
    - prev_date + 1 gününden curr_date'e kadar (dahil) olan günleri say
    - Minimum 1 gün
    
    Örnek:
    - prev_date = Salı, curr_date = Cuma
    - Sayılan günler: Çarşamba, Perşembe, Cuma = 3 gün
    
    Args:
        prev_date: Önceki teslimat tarihi
        curr_date: Mevcut teslimat tarihi
        
    Returns:
        Gün sayısı (minimum 1)
    """
    if curr_date <= prev_date:
        return 1  # Invalid case, force minimum
    
    # (prev_date + 1) to curr_date inclusive
    days = (curr_date - prev_date).days
    return max(1, days)


def get_next_route_date(route_weekdays: List[int], from_date: date) -> Optional[date]:
    """
    Bir sonraki rut gününü bulur.
    
    Args:
        route_weekdays: Rut günleri listesi (ISO: 1=Pazartesi, 7=Pazar)
        from_date: Başlangıç tarihi
        
    Returns:
        Bir sonraki rut günü (from_date'den sonraki ilk rut günü)
        None if route_weekdays is empty
    """
    if not route_weekdays:
        return None
    
    # from_date dahil değil, bir sonraki günden başla
    check_date = from_date + timedelta(days=1)
    
    # Maksimum 8 gün içinde bir rut günü bulunmalı
    for _ in range(8):
        if get_iso_weekday(check_date) in route_weekdays:
            return check_date
        check_date += timedelta(days=1)
    
    return None


def calculate_days_to_next_route(today: date, next_route: date) -> int:
    """
    Bugünden bir sonraki rut gününe kaç gün olduğunu hesaplar.
    
    Args:
        today: Bugünün tarihi
        next_route: Sonraki rut günü
        
    Returns:
        Gün sayısı (minimum 1)
    """
    days = (next_route - today).days
    return max(1, days)


def date_range(start: date, end: date) -> List[date]:
    """
    Başlangıç ve bitiş arasındaki tüm tarihleri döndürür (her ikisi dahil).
    
    Args:
        start: Başlangıç tarihi
        end: Bitiş tarihi
        
    Returns:
        Tarih listesi
    """
    if end < start:
        return []
    
    days = (end - start).days + 1
    return [start + timedelta(days=i) for i in range(days)]


def interval_dates(prev_date: date, curr_date: date) -> List[date]:
    """
    İki teslimat arasındaki tüketim günlerini döndürür.
    
    Model B kuralı: prev_date + 1 günden curr_date'e kadar (dahil)
    
    Args:
        prev_date: Önceki teslimat tarihi
        curr_date: Mevcut teslimat tarihi
        
    Returns:
        Tarih listesi
    """
    start = prev_date + timedelta(days=1)
    return date_range(start, curr_date)


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Değeri min ve max arasında sınırlar"""
    return max(min_val, min(max_val, value))


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Güvenli bölme işlemi (sıfıra bölünmeyi önler)
    """
    from .constants import EPSILON
    if abs(denominator) < EPSILON:
        return default
    return numerator / denominator
