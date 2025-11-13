from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone, date
import uuid

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    # Temel Bilgiler
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str  # Stok Kodu
    name: str  # Ürün Adı
    category: str  # Kategori
    description: Optional[str] = None  # Açıklama
    
    # Birim ve Paketleme
    unit: str = "ADET"  # Birim (ADET, KG, LT, vb.)
    units_per_case: int = 1  # Koli İçi Adet
    sales_unit: str = "ADET"  # Satış Birimi
    
    # Ağırlık ve Ebat
    gross_weight: float = 0.0  # Brüt Ağırlık (kg)
    net_weight: float = 0.0  # Net Ağırlık (kg)
    weight: float = 0.0  # Backward compatibility
    case_dimensions: Optional[str] = None  # Koli Ebatları (EnxBoyxYükseklik cm)
    
    # Fiyatlandırma
    production_cost: float = 0.0  # Üretim Maliyeti
    sales_price: float = 0.0  # Satış Fiyatı
    logistics_price: float = 0.0  # Lojistik Fiyatı
    dealer_price: float = 0.0  # Bayi Fiyatı
    vat_rate: float = 18.0  # KDV Oranı (%)
    
    # Tanımlama ve Lokasyon
    barcode: Optional[str] = None  # Barkod
    warehouse_code: Optional[str] = None  # Depo Kodu
    shelf_code: Optional[str] = None  # Raf Kodu
    location_code: Optional[str] = None  # Konum Kodu
    
    # Lot ve Tarih
    lot_number: Optional[str] = None  # Lot Numarası
    expiry_date: Optional[str] = None  # Son Kullanma Tarihi (YYYY-MM-DD)
    
    # Stok Bilgileri
    stock_quantity: int = 0  # Stok Miktarı
    stock_status: str = "active"  # Stok Durumu (active/passive)
    min_stock_level: int = 0  # Minimum Stok Seviyesi
    max_stock_level: int = 0  # Maximum Stok Seviyesi
    
    # Tedarik ve Devir
    supply_time: int = 0  # Temin Süresi (gün)
    turnover_rate: float = 0.0  # Stok Devir Hızı
    
    # Diğer
    image_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
