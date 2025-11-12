"""
Customer Consumption Model
Müşteri tüketim kayıtları - Fatura bazlı otomatik hesaplama
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
import uuid

class CustomerConsumption(BaseModel):
    """Müşteri tüketim kaydı - Fatura bazlı"""
    consumption_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    product_id: str
    product_code: str  # Ürün eşleştirme için
    product_name: str  # Ürün adı
    
    # Kaynak fatura (önceki fatura)
    source_invoice_id: Optional[str] = None  # None ise ilk fatura
    source_invoice_date: Optional[str] = None  # Format: "DD MM YYYY"
    source_quantity: float = 0.0
    
    # Hedef fatura (yeni fatura)
    target_invoice_id: str
    target_invoice_date: str  # Format: "DD MM YYYY"
    target_quantity: float
    
    # Hesaplanan değerler
    days_between: int = 0  # Faturalar arası gün farkı
    consumption_quantity: float = 0.0  # target_quantity - source_quantity
    daily_consumption_rate: float = 0.0  # consumption_quantity / days_between
    
    # Metadata
    can_calculate: bool = True  # False ise ilk fatura
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "consumption_id": "cons_123456",
                "customer_id": "cust_001",
                "product_id": "prod_001",
                "product_code": "SUT001",
                "product_name": "Süzme Yoğurt 5 KG",
                "source_invoice_id": "inv_001",
                "source_invoice_date": "01 11 2024",
                "source_quantity": 50.0,
                "target_invoice_id": "inv_002",
                "target_invoice_date": "15 11 2024",
                "target_quantity": 80.0,
                "days_between": 14,
                "consumption_quantity": 30.0,
                "daily_consumption_rate": 2.14,
                "can_calculate": True,
                "notes": "Normal tüketim",
                "created_at": "2024-11-15T10:00:00"
            }
        }

class ConsumptionPattern(BaseModel):
    """Tüketim deseni ve trend analizi"""
    pattern_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    product_id: str
    period_type: str = "weekly"  # daily, weekly, monthly, yearly
    average_consumption: float
    trend_direction: int = 0  # -1: azalan, 0: sabit, 1: artan
    trend_percentage: Optional[float] = None
    min_consumption: Optional[float] = None
    max_consumption: Optional[float] = None
    std_deviation: Optional[float] = None
    last_calculated: datetime = Field(default_factory=datetime.now)
    data_points: int = 0  # Kaç veri noktasından hesaplandı
    
    class Config:
        json_schema_extra = {
            "example": {
                "pattern_id": "pattern_123",
                "customer_id": "910780",
                "product_id": "prod_1",
                "period_type": "weekly",
                "average_consumption": 45.5,
                "trend_direction": 1,
                "trend_percentage": 12.5,
                "min_consumption": 30.0,
                "max_consumption": 60.0,
                "std_deviation": 8.2,
                "last_calculated": "2024-11-01T00:00:00",
                "data_points": 12
            }
        }
