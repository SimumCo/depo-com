"""
Seed Maintenance Data
Bakım yönetimi için örnek veriler
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import os
from models.maintenance import (
    Equipment, EquipmentType, EquipmentStatus,
    MaintenanceTask, TaskType, TaskPriority, TaskStatus,
    MaintenanceSchedule, ScheduleFrequency,
    SparePartsRequest, RequestStatus
)
from models.user import User, UserRole
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_database():
    """Get MongoDB database connection"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = MongoClient(mongo_url)
    return client['distribution_db']

def create_maintenance_technician_user():
    """Bakım teknisyeni kullanıcısı oluştur"""
    db = get_database()
    
    # Check if already exists
    existing = db.users.find_one({"username": "bakim_teknisyeni"})
    if existing:
        print("✓ Bakım teknisyeni kullanıcısı zaten mevcut")
        return existing["id"]
    
    user = User(
        username="bakim_teknisyeni",
        password_hash=pwd_context.hash("bakim123"),
        email="bakim@example.com",
        full_name="Ahmet Yılmaz",
        role=UserRole.MAINTENANCE_TECHNICIAN,
        is_active=True
    )
    
    db.users.insert_one(user.model_dump())
    print(f"✓ Bakım teknisyeni kullanıcısı oluşturuldu: {user.username} / bakim123")
    return user.id


def create_equipment():
    """Örnek ekipmanlar oluştur"""
    db = get_database()
    
    # Clear existing equipment
    db.equipment.delete_many({})
    print("✓ Mevcut ekipmanlar temizlendi")
    
    equipment_list = [
        {
            "name": "Süt Pastörizasyon Makinesi",
            "code": "EKP-001",
            "type": EquipmentType.PRODUCTION_LINE,
            "location": "Üretim Hattı 1",
            "manufacturer": "Tetra Pak",
            "model_number": "TP-5000",
            "serial_number": "TP5000-2023-001",
            "status": EquipmentStatus.OPERATIONAL,
            "total_runtime_hours": 2450.5,
            "notes": "Ana üretim hattı - Öncelikli bakım"
        },
        {
            "name": "Yoğurt Dolum Makinesi",
            "code": "EKP-002",
            "type": EquipmentType.PACKAGING_MACHINE,
            "location": "Üretim Hattı 2",
            "manufacturer": "Bosch Packaging",
            "model_number": "BP-3200",
            "serial_number": "BP3200-2023-045",
            "status": EquipmentStatus.OPERATIONAL,
            "total_runtime_hours": 1850.0,
            "notes": "Yoğurt üretim hattı"
        },
        {
            "name": "Soğuk Hava Deposu #1",
            "code": "EKP-003",
            "type": EquipmentType.COOLING_SYSTEM,
            "location": "Depo A",
            "manufacturer": "Carrier",
            "model_number": "CR-8000",
            "serial_number": "CR8000-2022-112",
            "status": EquipmentStatus.OPERATIONAL,
            "total_runtime_hours": 12500.0,
            "notes": "Ana soğuk hava deposu - 24/7 çalışır"
        },
        {
            "name": "Peynir Paketleme Hattı",
            "code": "EKP-004",
            "type": EquipmentType.PACKAGING_MACHINE,
            "location": "Üretim Hattı 3",
            "manufacturer": "Multivac",
            "model_number": "MV-2500",
            "serial_number": "MV2500-2023-078",
            "status": EquipmentStatus.MAINTENANCE,
            "total_runtime_hours": 980.5,
            "notes": "Haftalık bakımda"
        },
        {
            "name": "Konveyör Bant Sistemi",
            "code": "EKP-005",
            "type": EquipmentType.CONVEYOR,
            "location": "Ana Üretim Alanı",
            "manufacturer": "Dorner",
            "model_number": "DN-1500",
            "serial_number": "DN1500-2023-034",
            "status": EquipmentStatus.OPERATIONAL,
            "total_runtime_hours": 5600.0,
            "notes": "Tüm üretim hatlarını bağlar"
        },
        {
            "name": "Forklift #1",
            "code": "EKP-006",
            "type": EquipmentType.FORKLIFT,
            "location": "Depo B",
            "manufacturer": "Toyota",
            "model_number": "TY-3000",
            "serial_number": "TY3000-2022-156",
            "status": EquipmentStatus.OPERATIONAL,
            "total_runtime_hours": 3200.0,
            "notes": "Depo operasyonları"
        },
        {
            "name": "Süt Tanklarý",
            "code": "EKP-007",
            "type": EquipmentType.STORAGE_EQUIPMENT,
            "location": "Ham Madde Deposu",
            "manufacturer": "DeLaval",
            "model_number": "DL-10000",
            "serial_number": "DL10000-2021-089",
            "status": EquipmentStatus.OPERATIONAL,
            "total_runtime_hours": 18500.0,
            "notes": "10,000 litre kapasiteli"
        },
        {
            "name": "Ayran Üretim Hattı",
            "code": "EKP-008",
            "type": EquipmentType.PRODUCTION_LINE,
            "location": "Üretim Hattı 4",
            "manufacturer": "Tetra Pak",
            "model_number": "TP-2500",
            "serial_number": "TP2500-2023-067",
            "status": EquipmentStatus.BROKEN,
            "total_runtime_hours": 650.0,
            "notes": "ACİL: Motor arızalı - üretim durdu"
        },
        {
            "name": "Tereyağı Paketleme",
            "code": "EKP-009",
            "type": EquipmentType.PACKAGING_MACHINE,
            "location": "Üretim Hattı 5",
            "manufacturer": "Bosch",
            "model_number": "BP-1800",
            "serial_number": "BP1800-2023-123",
            "status": EquipmentStatus.OPERATIONAL,
            "total_runtime_hours": 1100.0,
            "notes": "Tereyağı üretim hattı"
        },
        {
            "name": "Soğuk Hava Deposu #2",
            "code": "EKP-010",
            "type": EquipmentType.COOLING_SYSTEM,
            "location": "Depo C",
            "manufacturer": "Carrier",
            "model_number": "CR-6000",
            "serial_number": "CR6000-2022-223",
            "status": EquipmentStatus.OPERATIONAL,
            "total_runtime_hours": 11200.0,
            "notes": "Yedek soğuk hava deposu"
        }
    ]
    
    equipment_ids = []
    for eq_data in equipment_list:
        equipment = Equipment(**eq_data)
        
        # Set maintenance dates
        if equipment.status == EquipmentStatus.MAINTENANCE:
            equipment.last_maintenance_date = datetime.now(timezone.utc) - timedelta(days=1)
            equipment.next_maintenance_date = datetime.now(timezone.utc) + timedelta(days=6)
        else:
            equipment.last_maintenance_date = datetime.now(timezone.utc) - timedelta(days=30)
            equipment.next_maintenance_date = datetime.now(timezone.utc) + timedelta(days=30)
        
        db.equipment.insert_one(equipment.model_dump())
        equipment_ids.append(equipment.id)
    
    print(f"✓ {len(equipment_list)} ekipman oluşturuldu")
    return equipment_ids


def create_maintenance_tasks(equipment_ids, technician_id, manager_id):
    """Örnek bakım görevleri oluştur"""
    db = get_database()
    
    # Clear existing tasks
    db.maintenance_tasks.delete_many({})
    print("✓ Mevcut bakım görevleri temizlendi")
    
    tasks = [
        {
            "equipment_id": equipment_ids[7],  # Ayran üretim hattı (BROKEN)
            "task_type": TaskType.EMERGENCY,
            "priority": TaskPriority.URGENT,
            "status": TaskStatus.IN_PROGRESS,
            "title": "ACİL: Motor Arızası",
            "description": "Ayran üretim hattı motoru çalışmıyor. Acil müdahale gerekiyor. Üretim durdu.",
            "assigned_to": technician_id,
            "assigned_by": manager_id,
            "estimated_duration_hours": 4.0,
            "scheduled_date": datetime.now(timezone.utc),
            "started_at": datetime.now(timezone.utc) - timedelta(hours=1)
        },
        {
            "equipment_id": equipment_ids[0],  # Süt pastörizasyon
            "task_type": TaskType.PREVENTIVE,
            "priority": TaskPriority.HIGH,
            "status": TaskStatus.PENDING,
            "title": "Aylık Rutin Bakım",
            "description": "Pastörizasyon makinesinin aylık rutin bakımı: Filtrelerin değişimi, sistem kontrolü, temizlik",
            "assigned_to": technician_id,
            "assigned_by": manager_id,
            "estimated_duration_hours": 3.0,
            "scheduled_date": datetime.now(timezone.utc) + timedelta(days=2)
        },
        {
            "equipment_id": equipment_ids[2],  # Soğuk hava deposu
            "task_type": TaskType.INSPECTION,
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.PENDING,
            "title": "Soğutma Sistemi Kontrolü",
            "description": "Soğuk hava deposu kompresör kontrolü, sıcaklık ayarları ve gaz seviyesi kontrolü",
            "assigned_to": technician_id,
            "assigned_by": manager_id,
            "estimated_duration_hours": 2.0,
            "scheduled_date": datetime.now(timezone.utc) + timedelta(days=3)
        },
        {
            "equipment_id": equipment_ids[3],  # Peynir paketleme (MAINTENANCE)
            "task_type": TaskType.PREVENTIVE,
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.IN_PROGRESS,
            "title": "Haftalık Bakım",
            "description": "Paketleme hattının haftalık rutin bakımı devam ediyor",
            "assigned_to": technician_id,
            "assigned_by": manager_id,
            "estimated_duration_hours": 2.5,
            "scheduled_date": datetime.now(timezone.utc),
            "started_at": datetime.now(timezone.utc) - timedelta(hours=0.5)
        },
        {
            "equipment_id": equipment_ids[4],  # Konveyör
            "task_type": TaskType.REPAIR,
            "priority": TaskPriority.LOW,
            "status": TaskStatus.PENDING,
            "title": "Kayış Değişimi",
            "description": "Konveyör bandı kayışında aşınma tespit edildi. Önlem amaçlı değiştirilmesi önerilir",
            "assigned_to": technician_id,
            "assigned_by": manager_id,
            "estimated_duration_hours": 1.5,
            "scheduled_date": datetime.now(timezone.utc) + timedelta(days=7)
        },
        {
            "equipment_id": equipment_ids[1],  # Yoğurt dolum
            "task_type": TaskType.PREVENTIVE,
            "priority": TaskPriority.HIGH,
            "status": TaskStatus.COMPLETED,
            "title": "Aylık Bakım Tamamlandı",
            "description": "Yoğurt dolum makinesinin aylık bakımı tamamlandı. Tüm sistemler normal",
            "assigned_to": technician_id,
            "assigned_by": manager_id,
            "estimated_duration_hours": 2.0,
            "actual_duration_hours": 2.5,
            "scheduled_date": datetime.now(timezone.utc) - timedelta(days=2),
            "started_at": datetime.now(timezone.utc) - timedelta(days=2, hours=2),
            "completed_at": datetime.now(timezone.utc) - timedelta(days=2),
            "completion_notes": "Tüm kontroller yapıldı. Filtreler değiştirildi. Kalibrasyon yapıldı.",
            "cost": 450.0
        },
        {
            "equipment_id": equipment_ids[5],  # Forklift
            "task_type": TaskType.INSPECTION,
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.PENDING,
            "title": "Forklift Güvenlik Kontrolü",
            "description": "Aylık güvenlik kontrolü: Frenler, hidrolik sistem, lastikler, ışıklandırma",
            "assigned_to": technician_id,
            "assigned_by": manager_id,
            "estimated_duration_hours": 1.0,
            "scheduled_date": datetime.now(timezone.utc) + timedelta(days=5)
        },
        {
            "equipment_id": equipment_ids[6],  # Süt tankları
            "task_type": TaskType.PREVENTIVE,
            "priority": TaskPriority.HIGH,
            "status": TaskStatus.PENDING,
            "title": "Tank Temizlik ve Dezenfeksiyon",
            "description": "Süt tanklarının haftalık derin temizliği ve dezenfeksiyonu",
            "assigned_to": technician_id,
            "assigned_by": manager_id,
            "estimated_duration_hours": 3.0,
            "scheduled_date": datetime.now(timezone.utc) + timedelta(days=1)
        }
    ]
    
    task_ids = []
    for task_data in tasks:
        task = MaintenanceTask(**task_data)
        db.maintenance_tasks.insert_one(task.model_dump())
        task_ids.append(task.id)
    
    print(f"✓ {len(tasks)} bakım görevi oluşturuldu")
    return task_ids


def create_maintenance_schedules(equipment_ids, manager_id):
    """Periyodik bakım planları oluştur"""
    db = get_database()
    
    # Clear existing schedules
    db.maintenance_schedules.delete_many({})
    print("✓ Mevcut bakım planları temizlendi")
    
    schedules = [
        {
            "equipment_id": equipment_ids[0],  # Süt pastörizasyon
            "task_title": "Aylık Rutin Bakım",
            "task_description": "Filtrelerin değişimi, sistem kontrolü, kalibrasyon",
            "frequency": ScheduleFrequency.MONTHLY,
            "estimated_duration_hours": 3.0,
            "next_due_date": datetime.now(timezone.utc) + timedelta(days=30),
            "created_by": manager_id,
            "is_active": True
        },
        {
            "equipment_id": equipment_ids[2],  # Soğuk hava deposu
            "task_title": "Soğutma Sistemi Kontrolü",
            "task_description": "Kompresör kontrolü, gaz seviyesi, sıcaklık kalibrasyonu",
            "frequency": ScheduleFrequency.MONTHLY,
            "estimated_duration_hours": 2.0,
            "next_due_date": datetime.now(timezone.utc) + timedelta(days=30),
            "created_by": manager_id,
            "is_active": True
        },
        {
            "equipment_id": equipment_ids[6],  # Süt tankları
            "task_title": "Haftalık Temizlik",
            "task_description": "Derin temizlik ve dezenfeksiyon",
            "frequency": ScheduleFrequency.WEEKLY,
            "estimated_duration_hours": 3.0,
            "next_due_date": datetime.now(timezone.utc) + timedelta(days=7),
            "created_by": manager_id,
            "is_active": True
        },
        {
            "equipment_id": equipment_ids[5],  # Forklift
            "task_title": "Güvenlik Kontrolü",
            "task_description": "Frenler, hidrolik sistem, lastikler, ışıklandırma kontrolü",
            "frequency": ScheduleFrequency.MONTHLY,
            "estimated_duration_hours": 1.0,
            "next_due_date": datetime.now(timezone.utc) + timedelta(days=30),
            "created_by": manager_id,
            "is_active": True
        },
        {
            "equipment_id": equipment_ids[1],  # Yoğurt dolum
            "task_title": "Aylık Bakım",
            "task_description": "Sistem kontrolü, temizlik, yağlama",
            "frequency": ScheduleFrequency.MONTHLY,
            "estimated_duration_hours": 2.5,
            "next_due_date": datetime.now(timezone.utc) + timedelta(days=30),
            "created_by": manager_id,
            "is_active": True
        },
        {
            "equipment_id": equipment_ids[0],  # Süt pastörizasyon
            "task_title": "Yıllık Kapsamlı Bakım",
            "task_description": "Yıllık genel kontrol, tüm parçaların muayenesi, büyük onarımlar",
            "frequency": ScheduleFrequency.YEARLY,
            "estimated_duration_hours": 16.0,
            "next_due_date": datetime.now(timezone.utc) + timedelta(days=365),
            "created_by": manager_id,
            "is_active": True
        }
    ]
    
    schedule_ids = []
    for schedule_data in schedules:
        schedule = MaintenanceSchedule(**schedule_data)
        db.maintenance_schedules.insert_one(schedule.model_dump())
        schedule_ids.append(schedule.id)
    
    print(f"✓ {len(schedules)} bakım planı oluşturuldu")
    return schedule_ids


def create_spare_parts_requests(equipment_ids, technician_id):
    """Yedek parça talepleri oluştur"""
    db = get_database()
    
    # Clear existing requests
    db.spare_parts_requests.delete_many({})
    print("✓ Mevcut yedek parça talepleri temizlendi")
    
    requests = [
        {
            "equipment_id": equipment_ids[7],  # Ayran üretim hattı (BROKEN)
            "requested_by": technician_id,
            "part_name": "Elektrik Motoru 7.5 kW",
            "part_code": "MOT-7500-TP",
            "quantity": 1,
            "unit": "adet",
            "urgency": TaskPriority.URGENT,
            "reason": "Ayran üretim hattı motoru arızalı - ACİL değişim gerekiyor",
            "status": RequestStatus.APPROVED,
            "estimated_cost": 12500.0,
            "actual_cost": 12500.0,
            "approved_at": datetime.now(timezone.utc) - timedelta(hours=2)
        },
        {
            "equipment_id": equipment_ids[4],  # Konveyör
            "requested_by": technician_id,
            "part_name": "Konveyör Kayışı 15m",
            "part_code": "BELT-15M-DN",
            "quantity": 1,
            "unit": "adet",
            "urgency": TaskPriority.LOW,
            "reason": "Mevcut kayışta aşınma var - önleyici değişim",
            "status": RequestStatus.PENDING,
            "estimated_cost": 850.0
        },
        {
            "equipment_id": equipment_ids[0],  # Süt pastörizasyon
            "requested_by": technician_id,
            "part_name": "HEPA Filtre Seti",
            "part_code": "FLT-HEPA-TP5000",
            "quantity": 3,
            "unit": "adet",
            "urgency": TaskPriority.HIGH,
            "reason": "Aylık bakım için filtre değişimi gerekiyor",
            "status": RequestStatus.FULFILLED,
            "estimated_cost": 1200.0,
            "actual_cost": 1150.0,
            "approved_at": datetime.now(timezone.utc) - timedelta(days=3),
            "fulfilled_at": datetime.now(timezone.utc) - timedelta(days=1),
            "supplier": "Tetra Pak Türkiye"
        },
        {
            "equipment_id": equipment_ids[5],  # Forklift
            "requested_by": technician_id,
            "part_name": "Forklift Lastiği 18x7-8",
            "part_code": "TIRE-18X7-TY",
            "quantity": 4,
            "unit": "adet",
            "urgency": TaskPriority.MEDIUM,
            "reason": "Lastik değişim zamanı geldi",
            "status": RequestStatus.PENDING,
            "estimated_cost": 2400.0
        },
        {
            "equipment_id": equipment_ids[2],  # Soğuk hava deposu
            "requested_by": technician_id,
            "part_name": "R404A Soğutucu Gaz 10kg",
            "part_code": "GAS-R404A-10KG",
            "quantity": 2,
            "unit": "adet",
            "urgency": TaskPriority.MEDIUM,
            "reason": "Soğutma sisteminde gaz seviyesi düşük",
            "status": RequestStatus.APPROVED,
            "estimated_cost": 3200.0,
            "approved_at": datetime.now(timezone.utc) - timedelta(days=1)
        }
    ]
    
    request_ids = []
    for req_data in requests:
        spare_request = SparePartsRequest(**req_data)
        db.spare_parts_requests.insert_one(spare_request.model_dump())
        request_ids.append(spare_request.id)
    
    print(f"✓ {len(requests)} yedek parça talebi oluşturuldu")
    return request_ids


def main():
    """Ana seed fonksiyonu"""
    print("\n" + "="*60)
    print("BAKIM YÖNETİMİ SİSTEMİ - SEED DATA")
    print("="*60 + "\n")
    
    db = get_database()
    
    # Get or create users
    technician_id = create_maintenance_technician_user()
    
    # Get admin and production manager IDs
    admin = db.users.find_one({"role": UserRole.ADMIN})
    manager = db.users.find_one({"role": UserRole.PRODUCTION_MANAGER})
    
    if not admin:
        print("⚠ Admin kullanıcısı bulunamadı!")
        return
    
    manager_id = manager["id"] if manager else admin["id"]
    
    # Create data
    equipment_ids = create_equipment()
    task_ids = create_maintenance_tasks(equipment_ids, technician_id, manager_id)
    schedule_ids = create_maintenance_schedules(equipment_ids, manager_id)
    request_ids = create_spare_parts_requests(equipment_ids, technician_id)
    
    print("\n" + "="*60)
    print("ÖZET:")
    print(f"  • {len(equipment_ids)} Ekipman")
    print(f"  • {len(task_ids)} Bakım Görevi")
    print(f"  • {len(schedule_ids)} Bakım Planı")
    print(f"  • {len(request_ids)} Yedek Parça Talebi")
    print("\nKULLANICI BİLGİLERİ:")
    print("  • Username: bakim_teknisyeni")
    print("  • Password: bakim123")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
