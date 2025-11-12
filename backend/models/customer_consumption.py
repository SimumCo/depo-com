"""
Customer Consumption Model
Müşteri tüketim kayıtları - manuel ve otomatik kayıt
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
import uuid

class CustomerConsumption(BaseModel):
    """Müşteri tüketim kaydı"""
    consumption_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    product_id: str
    consumption_date: datetime
    quantity_used: float
    consumption_type: str = "manual"  # manual, automatic, estimated
    notes: Optional[str] = None
    recorded_at: datetime = Field(default_factory=datetime.now)
    recorded_by: Optional[str] = None  # User ID who recorded
    
    class Config:
        json_schema_extra = {
            "example": {
                "consumption_id": "cons_123456",
                "customer_id": "910780",
                "product_id": "prod_1",
                "consumption_date": "2024-11-01T10:00:00",
                "quantity_used": 50.0,
                "consumption_type": "manual",
                "notes": "Haftalık sayım",
                "recorded_at": "2024-11-01T10:05:00"
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
