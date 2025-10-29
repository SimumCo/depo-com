from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict
from datetime import datetime, timezone
import uuid

class ConsumptionRecord(BaseModel):
    """Müşteri tüketim kaydı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    product_id: str
    product_name: str
    
    # Tüketim metrikleri
    period_type: str  # "daily", "weekly", "monthly", "yearly"
    period_start: datetime
    period_end: datetime
    
    # Sipariş bilgileri
    total_ordered: float  # Toplam sipariş miktarı
    order_count: int  # Sipariş sayısı
    days_between_orders: float  # Ortalama sipariş aralığı (gün)
    
    # Hesaplanan tüketim
    daily_consumption: float  # Günlük tüketim
    weekly_consumption: float  # Haftalık tüketim
    monthly_consumption: float  # Aylık tüketim
    
    # Tahmin ve karşılaştırma
    previous_period_consumption: Optional[float] = None  # Geçen dönem tüketimi
    growth_rate: Optional[float] = None  # Artış/azalış oranı (%)
    prediction_next_period: Optional[float] = None  # Sonraki dönem tahmini
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConsumptionSummary(BaseModel):
    """Tüketim özeti response"""
    product_name: str
    weekly_avg: float
    monthly_avg: float
    last_order_date: datetime
    growth_rate: Optional[float] = None
    prediction: Optional[float] = None
