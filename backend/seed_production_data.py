# Production Management Seed Data
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import uuid
from passlib.context import CryptContext

# Load environment
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "distribution_db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_production_data():
    """Üretim yönetim sistemi için seed data"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🏭 Üretim Yönetim Sistemi - Seed Data Başlıyor...")
    
    # ========== 1. KULLANICILAR (Üretim Rolleri) ==========
    print("\n👥 Üretim kullanıcıları oluşturuluyor...")
    
    production_users = [
        {
            "id": str(uuid.uuid4()),
            "username": "uretim_muduru",
            "password_hash": pwd_context.hash("uretim123"),
            "email": "uretim.muduru@firma.com",
            "full_name": "Ahmet Yılmaz",
            "role": "production_manager",
            "is_active": True,
            "created_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "operator1",
            "password_hash": pwd_context.hash("operator123"),
            "email": "operator1@firma.com",
            "full_name": "Mehmet Demir",
            "role": "production_operator",
            "is_active": True,
            "created_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "operator2",
            "password_hash": pwd_context.hash("operator123"),
            "email": "operator2@firma.com",
            "full_name": "Ayşe Kaya",
            "role": "production_operator",
            "is_active": True,
            "created_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "kalite_kontrol",
            "password_hash": pwd_context.hash("kalite123"),
            "email": "kalite@firma.com",
            "full_name": "Fatma Şahin",
            "role": "quality_control",
            "is_active": True,
            "created_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": pwd_context.hash("admin123"),
            "email": "admin@firma.com",
            "full_name": "Admin Kullanıcı",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "depo_sorumlu",
            "password_hash": pwd_context.hash("depo123"),
            "email": "depo@firma.com",
            "full_name": "Ali Yıldız",
            "role": "warehouse_supervisor",
            "is_active": True,
            "created_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "arge_muhendis",
            "password_hash": pwd_context.hash("arge123"),
            "email": "arge@firma.com",
            "full_name": "Dr. Zeynep Arslan",
            "role": "rnd_engineer",
            "is_active": True,
            "created_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "bakim_teknisyen",
            "password_hash": pwd_context.hash("bakim123"),
            "email": "bakim@firma.com",
            "full_name": "Hasan Çelik",
            "role": "maintenance_technician",
            "is_active": True,
            "created_at": datetime.now()
        }
    ]
    
    # Kullanıcıları ekle
    for user in production_users:
        existing = await db.users.find_one({"username": user["username"]})
        if not existing:
            await db.users.insert_one(user)
            print(f"  ✅ {user['full_name']} ({user['role']}) oluşturuldu")
        else:
            print(f"  ⏭️  {user['username']} zaten mevcut")
    
    # ========== 2. ÜRETİM HATLARI ==========
    print("\n🏭 Üretim hatları oluşturuluyor...")
    
    production_lines = [
        {
            "id": str(uuid.uuid4()),
            "name": "Süt Üretim Hattı 1",
            "line_code": "SUT-01",
            "description": "Pastörize süt üretim hattı",
            "capacity_per_hour": 1000.0,
            "capacity_unit": "litre",
            "status": "active",
            "assigned_operators": [],
            "current_order_id": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Yoğurt Üretim Hattı A",
            "line_code": "YOG-A",
            "description": "Süzme yoğurt ve normal yoğurt üretimi",
            "capacity_per_hour": 500.0,
            "capacity_unit": "kg",
            "status": "active",
            "assigned_operators": [],
            "current_order_id": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Peynir Üretim Hattı 1",
            "line_code": "PEY-01",
            "description": "Beyaz peynir ve kaşar peyniri üretimi",
            "capacity_per_hour": 300.0,
            "capacity_unit": "kg",
            "status": "idle",
            "assigned_operators": [],
            "current_order_id": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Tereyağı Üretim Hattı",
            "line_code": "TER-01",
            "description": "Tereyağı ve krema üretimi",
            "capacity_per_hour": 200.0,
            "capacity_unit": "kg",
            "status": "idle",
            "assigned_operators": [],
            "current_order_id": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    ]
    
    await db.production_lines.delete_many({})
    await db.production_lines.insert_many(production_lines)
    print(f"  ✅ {len(production_lines)} üretim hattı oluşturuldu")
    
    # ========== 3. HAMMADDELER (PRODUCTS) ==========
    print("\n📦 Hammaddeler kontrol ediliyor...")
    
    # Mevcut ürünleri kontrol et
    existing_products = await db.products.find({}).to_list(length=None)
    
    if len(existing_products) == 0:
        print("  ⚠️  Ürün bulunamadı. Örnek ürünler oluşturuluyor...")
        
        sample_products = [
            {
                "id": str(uuid.uuid4()),
                "product_code": "HMSUT001",
                "name": "Çiğ Süt (Hammadde)",
                "description": "Üretim için çiğ süt",
                "category": "Hammadde",
                "unit": "litre",
                "price": 15.0,
                "is_active": True,
                "created_at": datetime.now()
            },
            {
                "id": str(uuid.uuid4()),
                "product_code": "HMMAYA001",
                "name": "Maya (Hammadde)",
                "description": "Yoğurt mayası",
                "category": "Hammadde",
                "unit": "kg",
                "price": 200.0,
                "is_active": True,
                "created_at": datetime.now()
            },
            {
                "id": str(uuid.uuid4()),
                "product_code": "HMTUZ001",
                "name": "Tuz (Hammadde)",
                "description": "Gıda tuzu",
                "category": "Hammadde",
                "unit": "kg",
                "price": 5.0,
                "is_active": True,
                "created_at": datetime.now()
            },
            {
                "id": str(uuid.uuid4()),
                "product_code": "SUT001",
                "name": "Tam Yağlı Süt 1L",
                "description": "Pastörize tam yağlı süt",
                "category": "Süt",
                "unit": "litre",
                "price": 25.0,
                "is_active": True,
                "created_at": datetime.now()
            },
            {
                "id": str(uuid.uuid4()),
                "product_code": "YOG001",
                "name": "Süzme Yoğurt 500g",
                "description": "Tam yağlı süzme yoğurt",
                "category": "Yoğurt",
                "unit": "kg",
                "price": 45.0,
                "is_active": True,
                "created_at": datetime.now()
            },
            {
                "id": str(uuid.uuid4()),
                "product_code": "PEY001",
                "name": "Beyaz Peynir 1kg",
                "description": "Klasik beyaz peynir",
                "category": "Peynir",
                "unit": "kg",
                "price": 180.0,
                "is_active": True,
                "created_at": datetime.now()
            }
        ]
        
        await db.products.insert_many(sample_products)
        print(f"  ✅ {len(sample_products)} örnek ürün oluşturuldu")
        existing_products = sample_products
    else:
        print(f"  ✅ {len(existing_products)} ürün bulundu")
    
    # ========== 4. REÇETELER (BOM) ==========
    print("\n📋 Reçeteler (BOM) oluşturuluyor...")
    
    # Ürünleri bul
    raw_milk = next((p for p in existing_products if "Çiğ Süt" in p.get("name", "")), None)
    maya = next((p for p in existing_products if "Maya" in p.get("name", "")), None)
    tuz = next((p for p in existing_products if "Tuz" in p.get("name", "")), None)
    
    milk_product = next((p for p in existing_products if p.get("product_code") == "SUT001"), None)
    yogurt_product = next((p for p in existing_products if p.get("product_code") == "YOG001"), None)
    cheese_product = next((p for p in existing_products if p.get("product_code") == "PEY001"), None)
    
    uretim_muduru = next((u for u in production_users if u["role"] == "production_manager"), None)
    
    boms = []
    
    # BOM 1: Tam Yağlı Süt 1L
    if milk_product and raw_milk:
        boms.append({
            "id": str(uuid.uuid4()),
            "product_id": milk_product["id"],
            "product_name": milk_product["name"],
            "version": "1.0",
            "items": [
                {
                    "raw_material_id": raw_milk["id"],
                    "raw_material_name": raw_milk["name"],
                    "quantity": 1.05,  # Fire hesabı ile
                    "unit": "litre"
                }
            ],
            "output_quantity": 1.0,
            "output_unit": "litre",
            "notes": "Pastörizasyon işlemi",
            "is_active": True,
            "created_by": uretim_muduru["id"] if uretim_muduru else "system",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        })
    
    # BOM 2: Süzme Yoğurt 500g
    if yogurt_product and raw_milk and maya:
        boms.append({
            "id": str(uuid.uuid4()),
            "product_id": yogurt_product["id"],
            "product_name": yogurt_product["name"],
            "version": "1.0",
            "items": [
                {
                    "raw_material_id": raw_milk["id"],
                    "raw_material_name": raw_milk["name"],
                    "quantity": 0.6,  # 1 kg için 1.2 litre
                    "unit": "litre"
                },
                {
                    "raw_material_id": maya["id"],
                    "raw_material_name": maya["name"],
                    "quantity": 0.002,  # 1 kg için 4 gram
                    "unit": "kg"
                }
            ],
            "output_quantity": 0.5,
            "output_unit": "kg",
            "notes": "Fermantasyon ve süzme işlemi",
            "is_active": True,
            "created_by": uretim_muduru["id"] if uretim_muduru else "system",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        })
    
    # BOM 3: Beyaz Peynir 1kg
    if cheese_product and raw_milk and tuz and maya:
        boms.append({
            "id": str(uuid.uuid4()),
            "product_id": cheese_product["id"],
            "product_name": cheese_product["name"],
            "version": "1.0",
            "items": [
                {
                    "raw_material_id": raw_milk["id"],
                    "raw_material_name": raw_milk["name"],
                    "quantity": 8.0,  # 1 kg peynir için 8 litre süt
                    "unit": "litre"
                },
                {
                    "raw_material_id": maya["id"],
                    "raw_material_name": maya["name"],
                    "quantity": 0.001,
                    "unit": "kg"
                },
                {
                    "raw_material_id": tuz["id"],
                    "raw_material_name": tuz["name"],
                    "quantity": 0.03,  # %3 tuz
                    "unit": "kg"
                }
            ],
            "output_quantity": 1.0,
            "output_unit": "kg",
            "notes": "Pıhtılaştırma, kesme, kalıplama ve salamura",
            "is_active": True,
            "created_by": uretim_muduru["id"] if uretim_muduru else "system",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        })
    
    if boms:
        await db.bill_of_materials.delete_many({})
        await db.bill_of_materials.insert_many(boms)
        print(f"  ✅ {len(boms)} reçete oluşturuldu")
    
    # ========== 5. ÖRNEK ÜRETİM PLANI ==========
    print("\n📅 Örnek üretim planı oluşturuluyor...")
    
    now = datetime.now()
    next_week_start = now + timedelta(days=1)
    next_week_end = now + timedelta(days=7)
    
    plan_items = []
    if milk_product:
        plan_items.append({
            "product_id": milk_product["id"],
            "product_name": milk_product["name"],
            "target_quantity": 5000.0,
            "unit": "litre",
            "priority": "high",
            "notes": "Yüksek talep"
        })
    
    if yogurt_product:
        plan_items.append({
            "product_id": yogurt_product["id"],
            "product_name": yogurt_product["name"],
            "target_quantity": 1000.0,
            "unit": "kg",
            "priority": "medium",
            "notes": None
        })
    
    if cheese_product:
        plan_items.append({
            "product_id": cheese_product["id"],
            "product_name": cheese_product["name"],
            "target_quantity": 500.0,
            "unit": "kg",
            "priority": "medium",
            "notes": None
        })
    
    if plan_items and uretim_muduru:
        sample_plan = {
            "id": str(uuid.uuid4()),
            "plan_number": f"PLAN-{now.strftime('%Y%m%d')}-001",
            "plan_type": "weekly",
            "plan_date": now,
            "start_date": next_week_start,
            "end_date": next_week_end,
            "items": plan_items,
            "status": "approved",
            "created_by": uretim_muduru["id"],
            "approved_by": uretim_muduru["id"],
            "notes": "Haftalık üretim planı - Örnek",
            "created_at": now,
            "updated_at": now
        }
        
        await db.production_plans.delete_many({})
        await db.production_plans.insert_one(sample_plan)
        print(f"  ✅ 1 haftalık üretim planı oluşturuldu: {sample_plan['plan_number']}")
        
        # ========== 6. ÖRNEK ÜRETİM EMİRLERİ ==========
        print("\n📋 Örnek üretim emirleri oluşturuluyor...")
        
        sample_orders = []
        for idx, item in enumerate(plan_items[:2], 1):  # İlk 2 ürün için emir
            order = {
                "id": str(uuid.uuid4()),
                "order_number": f"URT-{now.strftime('%Y%m%d')}-{str(idx).zfill(3)}",
                "plan_id": sample_plan["id"],
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "target_quantity": item["target_quantity"],
                "produced_quantity": 0.0,
                "waste_quantity": 0.0,
                "unit": item["unit"],
                "line_id": None,
                "line_name": None,
                "assigned_operator_id": None,
                "assigned_operator_name": None,
                "status": "pending",
                "priority": item["priority"],
                "scheduled_start": next_week_start + timedelta(days=idx-1),
                "scheduled_end": next_week_start + timedelta(days=idx),
                "actual_start": None,
                "actual_end": None,
                "notes": f"{sample_plan['plan_number']} planından oluşturuldu",
                "created_by": uretim_muduru["id"],
                "created_at": now,
                "updated_at": now
            }
            sample_orders.append(order)
        
        if sample_orders:
            await db.production_orders.delete_many({})
            await db.production_orders.insert_many(sample_orders)
            print(f"  ✅ {len(sample_orders)} üretim emri oluşturuldu")
    
    # ========== 7. DEPO STOK GÜNCELLEMESİ ==========
    print("\n📦 Hammadde stokları kontrol ediliyor...")
    
    # Hammaddelere stok ekle
    if raw_milk:
        existing_inv = await db.inventory.find_one({"product_id": raw_milk["id"]})
        if not existing_inv:
            await db.inventory.insert_one({
                "id": str(uuid.uuid4()),
                "product_id": raw_milk["id"],
                "product_name": raw_milk["name"],
                "quantity_in_stock": 50000.0,
                "unit": "litre",
                "warehouse_id": "warehouse_1",
                "warehouse_name": "Ana Depo",
                "reorder_level": 10000.0,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            })
            print(f"  ✅ {raw_milk['name']} stoğu eklendi: 50000 litre")
    
    if maya:
        existing_inv = await db.inventory.find_one({"product_id": maya["id"]})
        if not existing_inv:
            await db.inventory.insert_one({
                "id": str(uuid.uuid4()),
                "product_id": maya["id"],
                "product_name": maya["name"],
                "quantity_in_stock": 100.0,
                "unit": "kg",
                "warehouse_id": "warehouse_1",
                "warehouse_name": "Ana Depo",
                "reorder_level": 20.0,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            })
            print(f"  ✅ {maya['name']} stoğu eklendi: 100 kg")
    
    if tuz:
        existing_inv = await db.inventory.find_one({"product_id": tuz["id"]})
        if not existing_inv:
            await db.inventory.insert_one({
                "id": str(uuid.uuid4()),
                "product_id": tuz["id"],
                "product_name": tuz["name"],
                "quantity_in_stock": 500.0,
                "unit": "kg",
                "warehouse_id": "warehouse_1",
                "warehouse_name": "Ana Depo",
                "reorder_level": 100.0,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            })
            print(f"  ✅ {tuz['name']} stoğu eklendi: 500 kg")
    
    print("\n✅ Üretim Yönetim Sistemi seed data tamamlandı!")
    print("\n👤 Test Kullanıcıları:")
    print("  - uretim_muduru / uretim123 (Üretim Müdürü)")
    print("  - operator1 / operator123 (Operatör)")
    print("  - operator2 / operator123 (Operatör)")
    print("  - kalite_kontrol / kalite123 (Kalite Kontrol)")
    print("  - depo_sorumlu / depo123 (Depo Sorumlusu)")
    print("  - arge_muhendis / arge123 (AR-GE Mühendisi)")
    print("  - bakim_teknisyen / bakim123 (Bakım Teknisyeni)")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_production_data())
