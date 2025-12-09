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




# ========== QC SPECIALIST MODELS ==========

class NonConformanceType(str, Enum):
    """Uygunsuzluk Tipleri"""
    PHYSICAL = "physical"  # Fiziksel
    CHEMICAL = "chemical"  # Kimyasal
    MICROBIOLOGICAL = "microbiological"  # Mikrobiyolojik
    SENSORY = "sensory"  # Duyusal
    PACKAGING = "packaging"  # Ambalaj
    LABELING = "labeling"  # Etiketleme
    OTHER = "other"  # Diğer


class NonConformanceSeverity(str, Enum):
    """Uygunsuzluk Şiddeti"""
    MINOR = "minor"  # Minör
    MAJOR = "major"  # Majör
    CRITICAL = "critical"  # Kritik


class NonConformanceReport(BaseModel):
    """Uygunsuzluk Raporu"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ncr_number: str  # "NCR-20250105-001"
    qc_record_id: Optional[str] = None
    batch_number: Optional[str] = None
    order_id: Optional[str] = None
    product_id: str
    product_name: str
    nonconformance_type: NonConformanceType
    severity: NonConformanceSeverity
    description: str
    quantity_affected: float
    unit: str
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None
    capa_required: bool = False  # CAPA (Corrective and Preventive Action)
    status: str = "open"  # open, in_progress, closed
    reported_by: str  # User ID
    reported_by_name: str
    assigned_to: Optional[str] = None
    closed_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TestType(str, Enum):
    """Test Tipleri"""
    PHYSICAL = "physical"  # pH, Nem, Yoğunluk
    CHEMICAL = "chemical"  # Kimyasal analiz
    MICROBIOLOGICAL = "microbiological"  # Mikrobiyolojik
    SENSORY = "sensory"  # Duyusal (görsel, tat, koku)
    HACCP = "haccp"  # HACCP kritik kontrol noktaları


class QualityTest(BaseModel):
    """Kalite Test Kaydı (Detaylı)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    qc_record_id: str
    batch_number: str
    test_type: TestType
    test_name: str  # "pH Testi", "Nem Analizi", vb.
    test_method: Optional[str] = None  # "TS EN ISO 1234"
    measured_value: Optional[str] = None
    unit: Optional[str] = None
    specification_min: Optional[float] = None
    specification_max: Optional[float] = None
    result: str = "pending"  # pass, fail, pending
    tested_by: str
    tested_by_name: str
    test_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class HACCPRecord(BaseModel):
    """HACCP Kritik Kontrol Noktası Kaydı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ccp_number: str  # "CCP-1", "CCP-2"
    ccp_name: str  # "Pastörizasyon Sıcaklığı"
    order_id: Optional[str] = None
    batch_number: Optional[str] = None
    monitored_parameter: str  # "Sıcaklık"
    measured_value: str
    unit: str
    critical_limit_min: Optional[float] = None
    critical_limit_max: Optional[float] = None
    status: str = "in_control"  # in_control, deviation
    corrective_action: Optional[str] = None
    monitored_by: str
    monitored_by_name: str
    monitoring_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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


# ========== QC CREATE SCHEMAS ==========

class NonConformanceReportCreate(BaseModel):
    qc_record_id: Optional[str] = None
    batch_number: Optional[str] = None
    order_id: Optional[str] = None
    product_id: str
    product_name: str
    nonconformance_type: NonConformanceType
    severity: NonConformanceSeverity
    description: str
    quantity_affected: float
    unit: str
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None
    capa_required: bool = False


class QualityTestCreate(BaseModel):
    qc_record_id: str
    batch_number: str
    test_type: TestType
    test_name: str
    test_method: Optional[str] = None
    measured_value: Optional[str] = None
    unit: Optional[str] = None
    specification_min: Optional[float] = None
    specification_max: Optional[float] = None
    result: str = "pending"
    notes: Optional[str] = None


class HACCPRecordCreate(BaseModel):
    ccp_number: str
    ccp_name: str
    order_id: Optional[str] = None
    batch_number: Optional[str] = None
    monitored_parameter: str
    measured_value: str
    unit: str



# ========== WAREHOUSE MODELS ==========

class TransactionType(str, Enum):
    """Depo Hareket Tipleri"""
    RAW_MATERIAL_OUT = "raw_material_out"  # Hammadde Çıkışı
    FINISHED_GOOD_IN = "finished_good_in"  # Mamul Girişi
    INTERNAL_TRANSFER = "internal_transfer"  # İç Transfer
    STOCK_ADJUSTMENT = "stock_adjustment"  # Stok Düzeltme
    RETURN = "return"  # İade
    WASTE = "waste"  # Fire


class WarehouseTransaction(BaseModel):
    """Depo Hareket Kaydı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_number: str  # "WHT-20250105-001"
    transaction_type: TransactionType
    order_id: Optional[str] = None
    batch_number: Optional[str] = None
    product_id: str
    product_name: str
    quantity: float
    unit: str
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    lot_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    operator_id: str
    operator_name: str
    notes: Optional[str] = None
    transaction_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StockLocation(BaseModel):
    """Raf ve Lokasyon"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location_code: str  # "A-01-05" (Bölüm-Raf-Göz)
    location_name: str
    zone: str  # "Hammadde", "Yarı Mamul", "Mamul"
    capacity: Optional[float] = None
    unit: Optional[str] = None
    current_stock: float = 0
    is_active: bool = True
    temperature_controlled: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StockItem(BaseModel):
    """Stok Kalemi (Lokasyonda ne var)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location_id: str
    location_code: str
    product_id: str
    product_name: str
    lot_number: Optional[str] = None
    batch_number: Optional[str] = None
    quantity: float
    unit: str
    expiry_date: Optional[datetime] = None
    received_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "available"  # available, blocked, reserved
    block_reason: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StockCount(BaseModel):
    """Stok Sayım Kaydı"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    count_number: str  # "CNT-20250105-001"
    location_id: Optional[str] = None
    product_id: str
    product_name: str
    system_quantity: float
    counted_quantity: float
    difference: float
    unit: str
    counted_by: str
    counted_by_name: str
    count_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    approved: bool = False
    approved_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StockBlock(BaseModel):
    """Stok Blokaj"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    block_number: str  # "BLK-20250105-001"
    stock_item_id: str
    product_id: str
    product_name: str
    lot_number: Optional[str] = None
    batch_number: Optional[str] = None
    quantity: float
    unit: str
    reason: str
    blocked_by: str
    blocked_by_name: str
    block_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    qc_status: str = "pending"  # pending, approved, rejected
    qc_inspected_by: Optional[str] = None
    release_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ========== WAREHOUSE CREATE SCHEMAS ==========

class WarehouseTransactionCreate(BaseModel):
    transaction_type: TransactionType
    order_id: Optional[str] = None
    batch_number: Optional[str] = None
    product_id: str
    product_name: str
    quantity: float
    unit: str
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    lot_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None


class StockLocationCreate(BaseModel):
    location_code: str
    location_name: str
    zone: str
    capacity: Optional[float] = None
    unit: Optional[str] = None
    temperature_controlled: bool = False


class StockItemUpdate(BaseModel):
    quantity: Optional[float] = None
    status: Optional[str] = None
    block_reason: Optional[str] = None


class StockCountCreate(BaseModel):
    location_id: Optional[str] = None
    product_id: str
    product_name: str
    system_quantity: float
    counted_quantity: float
    unit: str
    notes: Optional[str] = None


class StockBlockCreate(BaseModel):
    stock_item_id: str
    product_id: str
    product_name: str
    lot_number: Optional[str] = None
    batch_number: Optional[str] = None
    quantity: float
    unit: str
    reason: str

    critical_limit_min: Optional[float] = None
    critical_limit_max: Optional[float] = None
    status: str = "in_control"
    corrective_action: Optional[str] = None

