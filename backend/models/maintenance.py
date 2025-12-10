"""
Maintenance Management Models
Bakım Yönetimi Modelleri
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional, List
from enum import Enum
import uuid


# Equipment (Ekipman/Makine) Models
class EquipmentStatus(str, Enum):
    """Ekipman durumu"""
    OPERATIONAL = "operational"  # Çalışıyor
    MAINTENANCE = "maintenance"  # Bakımda
    BROKEN = "broken"  # Arızalı
    RETIRED = "retired"  # Kullanım dışı


class EquipmentType(str, Enum):
    """Ekipman tipi"""
    PRODUCTION_LINE = "production_line"  # Üretim hattı
    PACKAGING_MACHINE = "packaging_machine"  # Paketleme makinesi
    STORAGE_EQUIPMENT = "storage_equipment"  # Depolama ekipmanı
    COOLING_SYSTEM = "cooling_system"  # Soğutma sistemi
    CONVEYOR = "conveyor"  # Konveyör
    FORKLIFT = "forklift"  # Forklift
    OTHER = "other"  # Diğer


class Equipment(BaseModel):
    """Ekipman/Makine modeli"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Ekipman adı
    code: str  # Ekipman kodu (örn: EKP-001)
    type: EquipmentType
    location: str  # Konum (örn: Üretim Hattı 1, Depo A)
    manufacturer: Optional[str] = None  # Üretici firma
    model_number: Optional[str] = None  # Model numarası
    serial_number: Optional[str] = None  # Seri numarası
    purchase_date: Optional[datetime] = None  # Satın alma tarihi
    warranty_expiry: Optional[datetime] = None  # Garanti bitiş tarihi
    status: EquipmentStatus = EquipmentStatus.OPERATIONAL
    last_maintenance_date: Optional[datetime] = None  # Son bakım tarihi
    next_maintenance_date: Optional[datetime] = None  # Sonraki bakım tarihi
    total_runtime_hours: float = 0.0  # Toplam çalışma saati
    notes: Optional[str] = None  # Notlar
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Maintenance Task Models
class TaskPriority(str, Enum):
    """Görev önceliği"""
    LOW = "low"  # Düşük
    MEDIUM = "medium"  # Orta
    HIGH = "high"  # Yüksek
    URGENT = "urgent"  # Acil


class TaskStatus(str, Enum):
    """Görev durumu"""
    PENDING = "pending"  # Bekliyor
    IN_PROGRESS = "in_progress"  # Devam ediyor
    COMPLETED = "completed"  # Tamamlandı
    CANCELLED = "cancelled"  # İptal edildi


class TaskType(str, Enum):
    """Görev tipi"""
    PREVENTIVE = "preventive"  # Önleyici bakım
    CORRECTIVE = "corrective"  # Düzeltici bakım
    INSPECTION = "inspection"  # Muayene
    REPAIR = "repair"  # Onarım
    REPLACEMENT = "replacement"  # Değiştirme
    EMERGENCY = "emergency"  # Acil müdahale


class MaintenanceTask(BaseModel):
    """Bakım görevi modeli"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipment_id: str  # Ekipman ID
    task_type: TaskType
    priority: TaskPriority
    status: TaskStatus = TaskStatus.PENDING
    title: str  # Görev başlığı
    description: str  # Görev açıklaması
    assigned_to: Optional[str] = None  # Atanan teknisyen user_id
    assigned_by: Optional[str] = None  # Atayan kişi user_id (Production Manager/Admin)
    estimated_duration_hours: Optional[float] = None  # Tahmini süre (saat)
    actual_duration_hours: Optional[float] = None  # Gerçekleşen süre (saat)
    scheduled_date: Optional[datetime] = None  # Planlanan tarih
    started_at: Optional[datetime] = None  # Başlama zamanı
    completed_at: Optional[datetime] = None  # Tamamlanma zamanı
    completion_notes: Optional[str] = None  # Tamamlama notları
    spare_parts_used: List[str] = []  # Kullanılan yedek parçalar (ID listesi)
    cost: Optional[float] = None  # Maliyet
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Maintenance Schedule Models
class ScheduleFrequency(str, Enum):
    """Bakım sıklığı"""
    DAILY = "daily"  # Günlük
    WEEKLY = "weekly"  # Haftalık
    MONTHLY = "monthly"  # Aylık
    QUARTERLY = "quarterly"  # 3 Aylık
    YEARLY = "yearly"  # Yıllık


class MaintenanceSchedule(BaseModel):
    """Bakım takvimi/planı modeli"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipment_id: str  # Ekipman ID
    task_title: str  # Görev başlığı
    task_description: str  # Görev açıklaması
    frequency: ScheduleFrequency  # Bakım sıklığı
    estimated_duration_hours: float  # Tahmini süre (saat)
    last_performed_date: Optional[datetime] = None  # Son yapılma tarihi
    next_due_date: datetime  # Sonraki yapılma tarihi
    is_active: bool = True  # Aktif mi?
    assigned_to: Optional[str] = None  # Atanan teknisyen user_id
    created_by: str  # Oluşturan kişi user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Spare Parts Request Models
class RequestStatus(str, Enum):
    """Yedek parça talep durumu"""
    PENDING = "pending"  # Bekliyor
    APPROVED = "approved"  # Onaylandı
    REJECTED = "rejected"  # Reddedildi
    FULFILLED = "fulfilled"  # Karşılandı
    CANCELLED = "cancelled"  # İptal edildi


class SparePartsRequest(BaseModel):
    """Yedek parça talebi modeli"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipment_id: str  # Ekipman ID
    maintenance_task_id: Optional[str] = None  # İlişkili bakım görevi ID
    requested_by: str  # Talep eden teknisyen user_id
    part_name: str  # Parça adı
    part_code: Optional[str] = None  # Parça kodu
    quantity: int  # Miktar
    unit: str = "adet"  # Birim
    urgency: TaskPriority  # Aciliyet durumu
    reason: str  # Talep nedeni
    status: RequestStatus = RequestStatus.PENDING
    approved_by: Optional[str] = None  # Onaylayan kişi user_id
    approved_at: Optional[datetime] = None  # Onaylanma zamanı
    fulfilled_at: Optional[datetime] = None  # Karşılanma zamanı
    rejection_reason: Optional[str] = None  # Red nedeni
    estimated_cost: Optional[float] = None  # Tahmini maliyet
    actual_cost: Optional[float] = None  # Gerçek maliyet
    supplier: Optional[str] = None  # Tedarikçi
    notes: Optional[str] = None  # Notlar
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Maintenance History Model (Read-only aggregation)
class MaintenanceHistory(BaseModel):
    """Bakım geçmişi modeli"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    equipment_id: str
    equipment_name: str
    equipment_code: str
    task_type: str
    task_title: str
    description: str
    performed_by: str  # Teknisyen user_id
    performed_by_name: str  # Teknisyen adı
    duration_hours: Optional[float]
    cost: Optional[float]
    spare_parts_used: List[str]
    completed_at: datetime
    notes: Optional[str]


# Create/Update DTOs
class EquipmentCreate(BaseModel):
    name: str
    code: str
    type: EquipmentType
    location: str
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = None


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[EquipmentType] = None
    location: Optional[str] = None
    status: Optional[EquipmentStatus] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    warranty_expiry: Optional[datetime] = None
    last_maintenance_date: Optional[datetime] = None
    next_maintenance_date: Optional[datetime] = None
    total_runtime_hours: Optional[float] = None
    notes: Optional[str] = None


class MaintenanceTaskCreate(BaseModel):
    equipment_id: str
    task_type: TaskType
    priority: TaskPriority
    title: str
    description: str
    assigned_to: Optional[str] = None
    estimated_duration_hours: Optional[float] = None
    scheduled_date: Optional[datetime] = None


class MaintenanceTaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    estimated_duration_hours: Optional[float] = None
    actual_duration_hours: Optional[float] = None
    scheduled_date: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completion_notes: Optional[str] = None
    spare_parts_used: Optional[List[str]] = None
    cost: Optional[float] = None


class MaintenanceScheduleCreate(BaseModel):
    equipment_id: str
    task_title: str
    task_description: str
    frequency: ScheduleFrequency
    estimated_duration_hours: float
    next_due_date: datetime
    assigned_to: Optional[str] = None


class MaintenanceScheduleUpdate(BaseModel):
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    frequency: Optional[ScheduleFrequency] = None
    estimated_duration_hours: Optional[float] = None
    last_performed_date: Optional[datetime] = None
    next_due_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    assigned_to: Optional[str] = None


class SparePartsRequestCreate(BaseModel):
    equipment_id: str
    maintenance_task_id: Optional[str] = None
    part_name: str
    part_code: Optional[str] = None
    quantity: int
    unit: str = "adet"
    urgency: TaskPriority
    reason: str
    estimated_cost: Optional[float] = None
    notes: Optional[str] = None


class SparePartsRequestUpdate(BaseModel):
    status: Optional[RequestStatus] = None
    rejection_reason: Optional[str] = None
    actual_cost: Optional[float] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None
