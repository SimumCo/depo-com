"""
Consumption Period Model
Haftalık ve aylık periyodik tüketim kayıtları
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
import uuid


class ConsumptionPeriod(BaseModel):
    """Periyodik tüketim kaydı (Haftalık/Aylık)"""
    period_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    product_id: str
    product_code: str
    product_name: str
    
    # Periyot bilgileri
    period_type: str  # "weekly" veya "monthly"
    period_year: int  # 2024, 2025
    period_number: int  # Hafta: 1-52, Ay: 1-12
    period_start_date: str  # "2024-01-01"
    period_end_date: str  # "2024-01-07" veya "2024-01-31"
    
    # Tüketim verileri
    total_consumption: float  # Bu periyottaki toplam tüketim
    daily_average: float  # Günlük ortalama
    invoice_count: int  # Bu periyotta kaç fatura var
    
    # Karşılaştırma verileri
    previous_period_consumption: Optional[float] = None  # Önceki hafta/ay
    previous_year_same_period: Optional[float] = None  # Geçen yılın aynı periyodu
    
    # Trend ve büyüme
    period_over_period_change: Optional[float] = None  # % değişim (önceki periyot)
    year_over_year_change: Optional[float] = None  # % değişim (geçen yıl)
    trend_direction: str = "stable"  # "increasing", "decreasing", "stable"
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "period_id": "period_001",
                "customer_id": "cust_001",
                "product_id": "prod_001",
                "product_code": "SUT001",
                "product_name": "Süzme Yoğurt 5 KG",
                "period_type": "monthly",
                "period_year": 2024,
                "period_number": 1,
                "period_start_date": "2024-01-01",
                "period_end_date": "2024-01-31",
                "total_consumption": 155.0,
                "daily_average": 5.0,
                "invoice_count": 3,
                "previous_period_consumption": 150.0,
                "previous_year_same_period": 120.0,
                "period_over_period_change": 3.33,
                "year_over_year_change": 29.17,
                "trend_direction": "increasing"
            }
        }


class YearOverYearComparison(BaseModel):
    """Yıllık karşılaştırma response modeli"""
    customer_id: str
    product_code: str
    product_name: str
    period_type: str  # "weekly" veya "monthly"
    period_number: int  # Hafta veya ay numarası
    
    current_year: int
    current_year_consumption: float
    current_year_daily_avg: float
    
    previous_year: int
    previous_year_consumption: float
    previous_year_daily_avg: float
    
    absolute_change: float  # Fark (adet)
    percentage_change: float  # % değişim
    trend_direction: str  # "growth", "decline", "stable"
    
    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": "cust_001",
                "product_code": "SUT001",
                "product_name": "Süzme Yoğurt 5 KG",
                "period_type": "monthly",
                "period_number": 1,
                "current_year": 2025,
                "current_year_consumption": 155.0,
                "current_year_daily_avg": 5.0,
                "previous_year": 2024,
                "previous_year_consumption": 120.0,
                "previous_year_daily_avg": 3.87,
                "absolute_change": 35.0,
                "percentage_change": 29.17,
                "trend_direction": "growth"
            }
        }


class TrendAnalysis(BaseModel):
    """Trend analizi response modeli"""
    customer_id: str
    product_code: str
    product_name: str
    period_type: str
    analysis_year: int
    
    # Periyotlar (12 ay veya 52 hafta)
    periods: list[dict]  # [{period: 1, consumption: 120, daily_avg: 3.87}, ...]
    
    # Genel istatistikler
    total_consumption: float
    average_consumption: float
    peak_period: int
    peak_consumption: float
    lowest_period: int
    lowest_consumption: float
    
    # Trend
    overall_trend: str  # "increasing", "decreasing", "stable", "seasonal"
    trend_percentage: float  # Yıllık büyüme %
    
    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": "cust_001",
                "product_code": "SUT001",
                "product_name": "Süzme Yoğurt 5 KG",
                "period_type": "monthly",
                "analysis_year": 2024,
                "periods": [
                    {"period": 1, "consumption": 120, "daily_avg": 3.87},
                    {"period": 2, "consumption": 130, "daily_avg": 4.64}
                ],
                "total_consumption": 1560,
                "average_consumption": 130,
                "peak_period": 12,
                "peak_consumption": 180,
                "lowest_period": 1,
                "lowest_consumption": 120,
                "overall_trend": "increasing",
                "trend_percentage": 15.5
            }
        }
