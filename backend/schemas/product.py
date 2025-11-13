from pydantic import BaseModel
from typing import Optional

class ProductCreate(BaseModel):
    # Temel Bilgiler (Zorunlu)
    sku: str
    name: str
    category: str
    
    # Birim ve Paketleme
    unit: str = "ADET"
    units_per_case: int = 1
    sales_unit: str = "ADET"
    
    # Ağırlık ve Ebat
    gross_weight: float = 0.0
    net_weight: float = 0.0
    weight: float = 0.0
    case_dimensions: Optional[str] = None
    
    # Fiyatlandırma
    production_cost: float = 0.0
    sales_price: float = 0.0
    logistics_price: float = 0.0
    dealer_price: float = 0.0
    vat_rate: float = 18.0
    
    # Tanımlama ve Lokasyon
    barcode: Optional[str] = None
    warehouse_code: Optional[str] = None
    shelf_code: Optional[str] = None
    location_code: Optional[str] = None
    
    # Lot ve Tarih
    lot_number: Optional[str] = None
    expiry_date: Optional[str] = None
    
    # Stok Bilgileri
    stock_quantity: int = 0
    stock_status: str = "active"
    min_stock_level: int = 0
    max_stock_level: int = 0
    
    # Tedarik ve Devir
    supply_time: int = 0
    turnover_rate: float = 0.0
    
    # Diğer
    image_url: Optional[str] = None
    description: Optional[str] = None
