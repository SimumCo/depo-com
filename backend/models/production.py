# Production Management Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
from enum import Enum
import uuid

# ========== ENUMS ==========

class ProductionLineStatus(str, Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    IDLE = "idle"
    BROKEN = "broken"

class ProductionPlanType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class ProductionPlanStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ProductionOrderStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    QUALITY_CHECK = "quality_check"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ProductionOrderPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class QualityControlResult(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    PENDING = "pending"
    CONDITIONAL = "conditional"

# ========== MODELS ==========

class ProductionLine(BaseModel):
    """Üretim Hattı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # "Süt Hattı 1", "Yoğurt Hattı A"
    line_code: str  # "SUT-01", "YOG-A"
    description: Optional[str] = None
    capacity_per_hour: float  # Saatlik üretim kapasitesi (birim)
    capacity_unit: str = "kg"  # kg, litre, adet
    status: ProductionLineStatus = ProductionLineStatus.IDLE
    assigned_operators: List[str] = []  # User ID'leri
    current_order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BOMItem(BaseModel):
    """Reçete Kalemi"""
    raw_material_id: str  # Product ID (hammadde)
    raw_material_name: str
    quantity: float
    unit: str  # kg, litre, adet


class BillOfMaterials(BaseModel):
    """Reçete (Bill of Materials)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str  # Üretilecek ürün ID
    product_name: str
    version: str = "1.0"
    items: List[BOMItem] = []
    output_quantity: float = 1.0  # Çıktı miktarı
    output_unit: str = "kg"
    notes: Optional[str] = None
    is_active: bool = True
    created_by: str  # User ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductionPlanItem(BaseModel):
    """Üretim Planı Kalemi"""
    product_id: str
    product_name: str
    target_quantity: float
    unit: str
    priority: ProductionOrderPriority = ProductionOrderPriority.MEDIUM
    notes: Optional[str] = None


class ProductionPlan(BaseModel):
    """Üretim Planı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_number: str  # "PLAN-2025-001"
    plan_type: ProductionPlanType
    plan_date: datetime  # Planlanan tarih
    start_date: datetime
    end_date: datetime
    items: List[ProductionPlanItem] = []
    status: ProductionPlanStatus = ProductionPlanStatus.DRAFT
    created_by: str  # User ID (Üretim Müdürü)
    approved_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductionOrder(BaseModel):
    """Üretim Emri"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str  # "URT-20250103-001"
    plan_id: Optional[str] = None  # Hangi plandan geldiği
    product_id: str
    product_name: str
    target_quantity: float
    produced_quantity: float = 0.0
    waste_quantity: float = 0.0
    unit: str
    line_id: Optional[str] = None  # Atanan üretim hattı
    line_name: Optional[str] = None
    assigned_operator_id: Optional[str] = None
    assigned_operator_name: Optional[str] = None
    status: ProductionOrderStatus = ProductionOrderStatus.PENDING
    priority: ProductionOrderPriority = ProductionOrderPriority.MEDIUM
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RawMaterialRequirement(BaseModel):
    """Hammadde İhtiyaç Kaydı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str
    raw_material_id: str
    raw_material_name: str
    required_quantity: float
    unit: str
    available_quantity: float = 0.0
    deficit_quantity: float = 0.0  # Eksik miktar
    is_sufficient: bool = False
    warehouse_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductionTracking(BaseModel):
    """Üretim Takip (Gerçek Zamanlı)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    order_number: str
    product_name: str
    line_id: str
    line_name: str
    operator_id: str
    operator_name: str
    produced_quantity: float = 0.0
    waste_quantity: float = 0.0
    unit: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    efficiency_rate: Optional[float] = None  # Verimlilik oranı (%)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class QualityControl(BaseModel):
    """Kalite Kontrol"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    order_number: str
    product_id: str
    product_name: str
    batch_number: Optional[str] = None
    inspector_id: str  # Kalite kontrol uzmanı
    inspector_name: str
    result: QualityControlResult = QualityControlResult.PENDING
    tested_quantity: float
    passed_quantity: float = 0.0
    failed_quantity: float = 0.0
    unit: str
    test_parameters: Dict[str, str] = {}  # {"pH": "6.5", "sıcaklık": "4°C"}
    notes: Optional[str] = None
    inspection_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ========== CREATE/UPDATE SCHEMAS ==========

class ProductionLineCreate(BaseModel):
    name: str
    line_code: str
    description: Optional[str] = None
    capacity_per_hour: float
    capacity_unit: str = "kg"


class BOMCreate(BaseModel):
    product_id: str
    product_name: str
    version: str = "1.0"
    items: List[BOMItem]
    output_quantity: float = 1.0
    output_unit: str = "kg"
    notes: Optional[str] = None


class ProductionPlanCreate(BaseModel):
    plan_type: ProductionPlanType
    plan_date: datetime
    start_date: datetime
    end_date: datetime
    items: List[ProductionPlanItem]
    notes: Optional[str] = None


class ProductionOrderCreate(BaseModel):
    plan_id: Optional[str] = None
    product_id: str
    product_name: str
    target_quantity: float
    unit: str
    priority: ProductionOrderPriority = ProductionOrderPriority.MEDIUM
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    notes: Optional[str] = None


class QualityControlCreate(BaseModel):
    order_id: str
    batch_number: Optional[str] = None
    tested_quantity: float
    passed_quantity: float
    failed_quantity: float
    unit: str
    result: QualityControlResult
    test_parameters: Dict[str, str] = {}
    notes: Optional[str] = None


# ========== NEW MODELS FOR OPERATOR PANEL ==========

class DowntimeType(str, Enum):
    """Makine Duruş Tipleri"""
    BREAKDOWN = "breakdown"  # Arıza
    MAINTENANCE = "maintenance"  # Bakım
    SETUP = "setup"  # Ayar/Kurulum
    NO_MATERIAL = "no_material"  # Hammadde Yok
    NO_OPERATOR = "no_operator"  # Operatör Yok
    PLANNED_STOP = "planned_stop"  # Planlı Duruş
    OTHER = "other"  # Diğer


class MachineDowntime(BaseModel):
    """Makine Duruş Kaydı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: Optional[str] = None
    line_id: str
    line_name: str
    downtime_type: DowntimeType
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    reason: Optional[str] = None  # Detaylı açıklama
    operator_id: str
    operator_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RawMaterialUsage(BaseModel):
    """Hammadde Kullanım Kaydı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    order_number: str
    batch_number: Optional[str] = None  # Üretim batch numarası
    raw_material_id: str
    raw_material_name: str
    used_quantity: float
    unit: str
    lot_number: Optional[str] = None  # Hammadde lot numarası
    operator_id: str
    operator_name: str
    usage_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BatchRecord(BaseModel):
    """Batch/Lot Üretim Kaydı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_number: str  # "BATCH-20250105-001"
    order_id: str
    order_number: str
    product_id: str
    product_name: str
    quantity: float
    unit: str
    line_id: str
    line_name: str
    operator_id: str
    operator_name: str
    production_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expiry_date: Optional[datetime] = None
    status: str = "completed"  # completed, in_progress, quality_check
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OperatorNote(BaseModel):
    """Operatör Notları"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: Optional[str] = None
    line_id: Optional[str] = None
    note_type: str = "general"  # general, issue, quality, safety
    note_text: str
    operator_id: str
    operator_name: str
    shift: Optional[str] = None  # "Sabah", "Akşam", "Gece"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ========== CREATE SCHEMAS FOR NEW MODELS ==========

class MachineDowntimeCreate(BaseModel):
    order_id: Optional[str] = None
    line_id: str
    downtime_type: DowntimeType
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    reason: Optional[str] = None


class RawMaterialUsageCreate(BaseModel):
    order_id: str
    batch_number: Optional[str] = None
    raw_material_id: str
    raw_material_name: str
    used_quantity: float
    unit: str
    lot_number: Optional[str] = None
    notes: Optional[str] = None


class BatchRecordCreate(BaseModel):
    order_id: str
    quantity: float
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None


class OperatorNoteCreate(BaseModel):
    order_id: Optional[str] = None
    line_id: Optional[str] = None
    note_type: str = "general"
    note_text: str
    shift: Optional[str] = None
