# Draft Engine - Matematiksel Formüller
# Tüm hesaplamalar buradan yapılır

from typing import List, Optional, Tuple
from datetime import date

from .constants import (
    SMA_WINDOW, EPSILON, 
    MULTIPLIER_MIN, MULTIPLIER_MAX, MULTIPLIER_DEFAULT,
    ABANDON_MULTIPLIER,
    MODE_MATURE_INTERVAL_COUNT, MODE_MATURE_AGE_DAYS
)
from .helpers import (
    days_between_deliveries, clamp, safe_divide,
    calculate_days_to_next_route, today_date
)


# ==========================================
# 1. DAILY RATE CALCULATION (Model B)
# ==========================================
def calculate_daily_rate_interval(prev_qty: float, days_between: int) -> float:
    """
    Formül 2: Interval bazlı günlük tüketim oranı
    
    daily_rate_interval = prev_qty / days_between
    
    Args:
        prev_qty: Önceki teslimattaki miktar
        days_between: Teslimatlar arası gün sayısı
        
    Returns:
        Günlük tüketim oranı
    """
    return safe_divide(prev_qty, days_between, default=0.0)


def calculate_interval_rate(prev_date: date, curr_date: date, prev_qty: float) -> Tuple[float, int]:
    """
    Tam interval hesaplaması: days_between + daily_rate
    
    Returns:
        (daily_rate_interval, days_between)
    """
    days = days_between_deliveries(prev_date, curr_date)
    rate = calculate_daily_rate_interval(prev_qty, days)
    return rate, days


# ==========================================
# 2. RATE MT - Simple Moving Average
# ==========================================
def calculate_rate_mt(interval_rates: List[float]) -> Optional[float]:
    """
    Formül 4: Orta vadeli oran (SMA)
    
    rate_mt = average(last min(N, interval_count) interval rates)
    N = 8 (SMA window)
    
    Args:
        interval_rates: Son interval oranları listesi (max 8 eleman)
        
    Returns:
        SMA değeri veya None (veri yoksa)
    """
    if not interval_rates:
        return None
    
    # Son N interval'i al
    rates_to_use = interval_rates[-SMA_WINDOW:]
    
    if not rates_to_use:
        return None
    
    return sum(rates_to_use) / len(rates_to_use)


# ==========================================
# 3. WEEKLY MULTIPLIER
# ==========================================
def calculate_weekly_multiplier(
    week_avg_per_day: float,
    baseline_avg_per_day: float
) -> float:
    """
    Formül 6: Haftalık çarpan hesaplama
    
    m_raw = week_avg_per_day / baseline_avg_per_day
    multiplier = clamp(m_raw, 0.7, 1.8)
    
    If baseline_avg_per_day == 0: multiplier = 1.0
    
    Args:
        week_avg_per_day: Hedef haftanın günlük ortalaması
        baseline_avg_per_day: Önceki 8 haftanın günlük ortalaması
        
    Returns:
        Çarpan değeri (0.7 - 1.8 arasında)
    """
    if abs(baseline_avg_per_day) < EPSILON:
        return MULTIPLIER_DEFAULT
    
    m_raw = week_avg_per_day / baseline_avg_per_day
    return clamp(m_raw, MULTIPLIER_MIN, MULTIPLIER_MAX)


# ==========================================
# 4. FINAL RATE USED
# ==========================================
def calculate_rate_used(
    rate_mt: Optional[float],
    multiplier: float = MULTIPLIER_DEFAULT
) -> Optional[float]:
    """
    Formül 7: Draft için kullanılacak nihai oran
    
    rate_used = rate_mt * multiplier
    
    Args:
        rate_mt: Orta vadeli oran (SMA)
        multiplier: Haftalık çarpan
        
    Returns:
        Nihai oran veya None (rate_mt tanımsızsa)
    """
    if rate_mt is None:
        return None
    
    return rate_mt * multiplier


# ==========================================
# 5. DRAFT NEED QUANTITY
# ==========================================
def calculate_need_qty(
    rate_used: Optional[float],
    days_to_next_route: int
) -> Optional[float]:
    """
    Formül 9: Taslak ihtiyaç miktarı
    
    need_qty = rate_used * days_to_next_route
    
    Args:
        rate_used: Nihai tüketim oranı
        days_to_next_route: Sonraki rut gününe kalan gün
        
    Returns:
        İhtiyaç miktarı veya None
    """
    if rate_used is None:
        return None
    
    if days_to_next_route < 1:
        return None
    
    return rate_used * days_to_next_route


# ==========================================
# 6. PASSIVATION CHECK (Abandon Rule K=3)
# ==========================================
def calculate_expected_depletion_days(
    last_delivery_qty: float,
    rate_used: float
) -> float:
    """
    Formül 10a: Beklenen tükenme süresi
    
    expected_depletion_days = last_delivery_qty / max(rate_used, eps)
    """
    return safe_divide(last_delivery_qty, rate_used, default=float('inf'))


def calculate_abandon_threshold_days(expected_depletion_days: float) -> float:
    """
    Formül 10b: Pasifleştirme eşik günü
    
    abandon_threshold_days = expected_depletion_days * K
    K = 3
    """
    return expected_depletion_days * ABANDON_MULTIPLIER


def should_passivate(
    days_since_last_delivery: int,
    last_delivery_qty: float,
    rate_used: Optional[float]
) -> bool:
    """
    Formül 10: Ürünün pasifleştirilip pasifleştirilmeyeceğini kontrol eder
    
    Kural:
    - expected_depletion_days = last_delivery_qty / rate_used
    - abandon_threshold_days = expected_depletion_days * 3
    - if days_since_last_delivery > abandon_threshold_days: is_active = false
    
    Args:
        days_since_last_delivery: Son teslimat tarihi üzerinden geçen gün
        last_delivery_qty: Son teslimattaki miktar
        rate_used: Güncel tüketim oranı
        
    Returns:
        True ise ürün pasifleştirilmeli
    """
    if rate_used is None or rate_used <= EPSILON:
        return False  # Rate yoksa pasifleştirme yapma
    
    expected = calculate_expected_depletion_days(last_delivery_qty, rate_used)
    threshold = calculate_abandon_threshold_days(expected)
    
    return days_since_last_delivery > threshold


# ==========================================
# 7. MATURITY MODE DETERMINATION
# ==========================================
def determine_maturity_mode(
    delivery_count: int,
    interval_count: int,
    age_days: int
) -> int:
    """
    Formül 11: Olgunluk modu belirleme
    
    MODE 1 (FIRST-TIME):
        delivery_count <= 1
        -> no rate, no draft need_qty
    
    MODE 2 (YOUNG):
        delivery_count >= 2 AND (interval_count < 8 OR age_days < 365)
        -> compute rate_mt using available intervals
    
    MODE 3 (MATURE):
        interval_count >= 8 AND age_days >= 365
        -> full rate_mt (SMA 8)
    
    Args:
        delivery_count: Toplam teslimat sayısı
        interval_count: Hesaplanmış interval sayısı
        age_days: Müşteri-ürün ilişkisi yaşı (gün)
        
    Returns:
        Mod numarası (1, 2, veya 3)
    """
    # MODE 1: FIRST-TIME
    if delivery_count <= 1:
        return 1
    
    # MODE 3: MATURE
    if interval_count >= MODE_MATURE_INTERVAL_COUNT and age_days >= MODE_MATURE_AGE_DAYS:
        return 3
    
    # MODE 2: YOUNG (default for delivery_count >= 2)
    return 2


def can_generate_draft(mode: int, is_active: bool) -> bool:
    """
    Bu müşteri-ürün için draft üretilebilir mi?
    
    Args:
        mode: Olgunluk modu (1, 2, 3)
        is_active: Ürün aktif mi?
        
    Returns:
        True ise draft üretilebilir
    """
    # MODE 1 için draft yok
    if mode == 1:
        return False
    
    # Pasif ürünler için draft yok
    if not is_active:
        return False
    
    return True


# ==========================================
# 8. SHELF LIFE WARNING (UX Only)
# ==========================================
def calculate_coverage_days(
    selected_qty: float,
    rate_used: float
) -> float:
    """
    Formül 12a: Seçilen miktarın kaç gün yeteceği
    
    coverage_days = selected_qty / max(rate_used, eps)
    """
    return safe_divide(selected_qty, rate_used, default=float('inf'))


def should_warn_shelf_life(
    selected_qty: float,
    rate_used: float,
    shelf_life_days: Optional[int]
) -> bool:
    """
    Formül 12: Raf ömrü uyarısı gerekli mi?
    
    Kural:
    - coverage_days = selected_qty / rate_used
    - safe_window_days = shelf_life_days / 2
    - if coverage_days > safe_window_days: trigger_warning = true
    
    NOT: Bu sadece UX uyarısı, draft hesaplamasını ETKİLEMEZ
    
    Args:
        selected_qty: Kullanıcının seçtiği miktar
        rate_used: Güncel tüketim oranı
        shelf_life_days: Ürünün raf ömrü (gün)
        
    Returns:
        True ise uyarı gösterilmeli
    """
    if shelf_life_days is None or shelf_life_days <= 0:
        return False
    
    if rate_used is None or rate_used <= EPSILON:
        return False
    
    coverage = calculate_coverage_days(selected_qty, rate_used)
    safe_window = shelf_life_days / 2
    
    return coverage > safe_window


# ==========================================
# 9. LEDGER DISTRIBUTION
# ==========================================
def distribute_consumption_to_ledger(
    prev_date: date,
    curr_date: date,
    prev_qty: float
) -> List[dict]:
    """
    Formül 3: Günlük tüketim dağılımı
    
    Her gün d için (prev_date+1 ... curr_date dahil):
    consumption[d] = daily_rate_interval
    
    Bu garanti eder ki:
    Sum(consumption[d]) == prev_qty
    
    Args:
        prev_date: Önceki teslimat tarihi
        curr_date: Mevcut teslimat tarihi
        prev_qty: Önceki teslimat miktarı
        
    Returns:
        [{"day": date, "consumed_qty": float}, ...]
    """
    from .helpers import interval_dates
    
    dates = interval_dates(prev_date, curr_date)
    if not dates:
        return []
    
    daily_rate = calculate_daily_rate_interval(prev_qty, len(dates))
    
    return [
        {"day": d, "consumed_qty": daily_rate}
        for d in dates
    ]
