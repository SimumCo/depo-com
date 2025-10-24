"""
Backend Constants
=================
Tüm sabit değerler, enum'lar ve konfigürasyonlar bu dosyada tanımlanır.
Bu sayede magic number'lar ve hard-coded değerler ortadan kalkar.
"""

from enum import Enum

# =============================================================================
# USER ROLES - Kullanıcı Rolleri
# =============================================================================
class UserRole(str, Enum):
    """
    Sistemdeki tüm kullanıcı rolleri.
    Her rol farklı yetkilere ve dashboard'a sahiptir.
    """
    ADMIN = "admin"                      # Sistem yöneticisi - tüm yetkiler
    WAREHOUSE_MANAGER = "warehouse_manager"  # Depo müdürü - depo yönetimi
    WAREHOUSE_STAFF = "warehouse_staff"      # Depo personeli - günlük işler
    SALES_REP = "sales_rep"              # Satış temsilcisi - saha satış
    SALES_AGENT = "sales_agent"          # Plasiyer - müşteri ziyaretleri
    CUSTOMER = "customer"                # Müşteri - sipariş verme
    ACCOUNTANT = "accountant"            # Muhasebe - finansal raporlar


# =============================================================================
# ORDER STATUS - Sipariş Durumları
# =============================================================================
class OrderStatus(str, Enum):
    """
    Sipariş yaşam döngüsündeki tüm durumlar.
    Her durum workflow'da bir adımı temsil eder.
    """
    PENDING = "pending"          # Bekliyor - yeni oluşturuldu
    APPROVED = "approved"        # Onaylandı - yönetici onayı aldı
    PREPARING = "preparing"      # Hazırlanıyor - depoda toplanıyor
    READY = "ready"             # Hazır - sevkiyata hazır
    DISPATCHED = "dispatched"   # Yola Çıktı - araçta
    DELIVERED = "delivered"     # Teslim Edildi - müşteriye ulaştı
    CANCELLED = "cancelled"     # İptal - iptal edildi


# =============================================================================
# CHANNEL TYPES - Kanal Türleri
# =============================================================================
class ChannelType(str, Enum):
    """
    Müşteri kanal türleri.
    Fiyatlandırma ve işlem şekli bu kanala göre değişir.
    """
    LOGISTICS = "logistics"  # Lojistik kanal - oteller, devlet kurumları
    DEALER = "dealer"       # Bayi kanal - marketler, son kullanıcı


# =============================================================================
# WEEK DAYS - Haftanın Günleri
# =============================================================================
class WeekDay(str, Enum):
    """
    Plasiyerlerin müşteri ziyaret günleri için kullanılır.
    """
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


# =============================================================================
# PAGINATION - Sayfalama Ayarları
# =============================================================================
DEFAULT_PAGE_SIZE = 50           # Varsayılan sayfa başına kayıt
MAX_PAGE_SIZE = 100             # Maksimum sayfa başına kayıt
MAX_ORDERS_DISPLAY = 50         # Frontend'de gösterilecek max sipariş


# =============================================================================
# DATE RANGES - Tarih Aralıkları (gün olarak)
# =============================================================================
DEFAULT_CONSUMPTION_DAYS = 30    # Sarfiyat analizi için varsayılan gün sayısı
CONSUMPTION_PERIOD_OPTIONS = [7, 30, 90]  # Kullanıcının seçebileceği dönemler


# =============================================================================
# PRODUCT SETTINGS - Ürün Ayarları
# =============================================================================
DEFAULT_UNITS_PER_CASE = 12     # Varsayılan koli içi adet
MIN_STOCK_LEVEL = 100           # Minimum stok seviyesi (uyarı için)
LOW_STOCK_THRESHOLD = 50        # Düşük stok eşiği


# =============================================================================
# BULK IMPORT SETTINGS - Toplu Veri Girişi Ayarları
# =============================================================================
MAX_IMPORT_ROWS = 1000          # Tek seferde yüklenebilecek max satır
ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls']  # İzin verilen dosya formatları
MAX_PRODUCTS_PER_ORDER = 10     # Bir siparişte max ürün sayısı


# =============================================================================
# JWT TOKEN SETTINGS - Token Ayarları
# =============================================================================
TOKEN_EXPIRE_HOURS = 24 * 7     # Token geçerlilik süresi (7 gün)
TOKEN_ALGORITHM = "HS256"       # JWT şifreleme algoritması


# =============================================================================
# STATUS TRANSLATIONS - Durum Çevirileri
# =============================================================================
STATUS_TRANSLATIONS = {
    "pending": "Bekliyor",
    "approved": "Onaylandı",
    "preparing": "Hazırlanıyor",
    "ready": "Hazır",
    "dispatched": "Yola Çıktı",
    "delivered": "Teslim Edildi",
    "cancelled": "İptal Edildi"
}

DAY_TRANSLATIONS = {
    "monday": "Pazartesi",
    "tuesday": "Salı",
    "wednesday": "Çarşamba",
    "thursday": "Perşembe",
    "friday": "Cuma",
    "saturday": "Cumartesi",
    "sunday": "Pazar"
}

CHANNEL_TRANSLATIONS = {
    "logistics": "Lojistik",
    "dealer": "Bayi"
}


# =============================================================================
# ERROR MESSAGES - Hata Mesajları
# =============================================================================
ERROR_MESSAGES = {
    "user_not_found": "Kullanıcı bulunamadı",
    "invalid_credentials": "Geçersiz kullanıcı adı veya şifre",
    "unauthorized": "Bu işlem için yetkiniz yok",
    "order_not_found": "Sipariş bulunamadı",
    "product_not_found": "Ürün bulunamadı",
    "customer_not_found": "Müşteri bulunamadı",
    "insufficient_stock": "Yetersiz stok",
    "invalid_file_format": "Geçersiz dosya formatı",
    "duplicate_entry": "Bu kayıt zaten mevcut"
}


# =============================================================================
# SUCCESS MESSAGES - Başarı Mesajları
# =============================================================================
SUCCESS_MESSAGES = {
    "order_created": "Sipariş başarıyla oluşturuldu",
    "order_updated": "Sipariş başarıyla güncellendi",
    "order_deleted": "Sipariş başarıyla silindi",
    "user_created": "Kullanıcı başarıyla oluşturuldu",
    "import_completed": "İçe aktarma tamamlandı"
}
