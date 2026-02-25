# Draft Engine - Sabitler ve Koleksiyon İsimleri
# Tüm magic number'lar burada tanımlı

# ==========================================
# COLLECTION NAMES (de_ prefix = draft engine)
# ==========================================
COL_CUSTOMERS = "de_customers"
COL_PRODUCTS = "de_products"
COL_ROUTES = "de_routes"
COL_DELIVERIES = "de_deliveries"
COL_DELIVERY_ITEMS = "de_delivery_items"
COL_CUSTOMER_PRODUCT_STATE = "de_customer_product_state"
COL_INTERVAL_LEDGER = "de_interval_ledger"
COL_DAILY_LEDGER = "de_daily_ledger"  # Optional
COL_WEEKLY_MULTIPLIERS = "de_weekly_product_multipliers"
COL_DAILY_TOTALS = "de_depot_segment_product_daily_totals"
COL_SALES_REP_DRAFT_TOTALS = "de_sales_rep_draft_totals"
COL_DEPOT_DRAFT_TOTALS = "de_depot_draft_totals"
COL_PRODUCTION_DRAFT_TOTALS = "de_production_draft_totals"
COL_WORKING_COPIES = "de_working_copies"
COL_PROCESSED_EVENTS = "de_processed_events"

# ==========================================
# RATE CALCULATION CONSTANTS
# ==========================================
SMA_WINDOW = 8  # Son 8 interval için Simple Moving Average
EPSILON = 1e-6  # Sıfıra bölünmeyi önlemek için

# ==========================================
# WEEKLY MULTIPLIER CONSTANTS
# ==========================================
MULTIPLIER_MIN = 0.7  # Minimum çarpan değeri
MULTIPLIER_MAX = 1.8  # Maximum çarpan değeri
MULTIPLIER_DEFAULT = 1.0  # Varsayılan çarpan (data yoksa)
BASELINE_WEEKS = 8  # Baseline hesaplama için geriye bakılan hafta sayısı (56 gün)

# ==========================================
# PASSIVATION CONSTANTS (Abandon Rule)
# ==========================================
ABANDON_MULTIPLIER = 3  # K=3 kuralı - beklenen tükenme süresinin 3 katı

# ==========================================
# MATURITY MODE THRESHOLDS
# ==========================================
MODE_MATURE_INTERVAL_COUNT = 8  # Mature için minimum interval sayısı
MODE_MATURE_AGE_DAYS = 365  # Mature için minimum yaş (gün)

# ==========================================
# DELIVERY STATUSES
# ==========================================
DELIVERY_STATUS_SLIP = "slip"
DELIVERY_STATUS_FINALIZED = "finalized"
DELIVERY_STATUS_VOIDED = "voided"
DELIVERY_STATUS_CORRECTED = "corrected"

# ==========================================
# WORKING COPY STATUSES
# ==========================================
WC_STATUS_EDITING = "editing"
WC_STATUS_SUBMITTED = "submitted"

# ==========================================
# EVENT TYPES
# ==========================================
EVENT_DELIVERY_SLIP_CREATED = "delivery_slip_created"
EVENT_DELIVERY_FINALIZED = "delivery_finalized"
EVENT_DELIVERY_VOIDED = "delivery_voided"
EVENT_DELIVERY_CORRECTED = "delivery_corrected"

# ==========================================
# WEEKDAY MAPPINGS (ISO: 1=Monday, 7=Sunday)
# ==========================================
WEEKDAY_NAMES = {
    1: "Pazartesi",
    2: "Salı",
    3: "Çarşamba",
    4: "Perşembe",
    5: "Cuma",
    6: "Cumartesi",
    7: "Pazar"
}

WEEKDAY_CODES = {
    1: "MON",
    2: "TUE",
    3: "WED",
    4: "THU",
    5: "FRI",
    6: "SAT",
    7: "SUN"
}
