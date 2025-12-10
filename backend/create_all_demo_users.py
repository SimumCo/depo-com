"""
Create demo users for all roles
Tüm roller için demo kullanıcılar oluştur
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pymongo import MongoClient
from passlib.context import CryptContext
from models.user import User, UserRole, ChannelType
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_database():
    """Get MongoDB database connection"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = MongoClient(mongo_url)
    return client['distribution_management']

def create_demo_users():
    """Create demo users for all roles"""
    db = get_database()
    
    # Clear existing demo users (keep admin)
    print("\n" + "="*60)
    print("DEMO KULLANICILAR OLUŞTURULUYOR")
    print("="*60 + "\n")
    
    demo_users = [
        {
            "username": "admin",
            "password": "admin123",
            "email": "admin@example.com",
            "full_name": "Admin Kullanıcısı",
            "role": UserRole.ADMIN
        },
        {
            "username": "depo_muduru",
            "password": "depo123",
            "email": "depo.muduru@example.com",
            "full_name": "Depo Müdürü",
            "role": UserRole.WAREHOUSE_MANAGER
        },
        {
            "username": "depo_personel",
            "password": "depo123",
            "email": "depo.personel@example.com",
            "full_name": "Depo Personeli",
            "role": UserRole.WAREHOUSE_STAFF
        },
        {
            "username": "satis_temsilci",
            "password": "satis123",
            "email": "satis@example.com",
            "full_name": "Satış Temsilcisi",
            "role": UserRole.SALES_REP
        },
        {
            "username": "musteri1",
            "password": "musteri123",
            "email": "musteri1@example.com",
            "full_name": "Demo Müşteri",
            "role": UserRole.CUSTOMER,
            "customer_number": "CUST-001",
            "channel_type": ChannelType.DEALER
        },
        {
            "username": "muhasebe",
            "password": "muhasebe123",
            "email": "muhasebe@example.com",
            "full_name": "Muhasebe Personeli",
            "role": UserRole.ACCOUNTING
        },
        {
            "username": "plasiyer1",
            "password": "plasiyer123",
            "email": "plasiyer1@example.com",
            "full_name": "Plasiyer 1",
            "role": UserRole.SALES_AGENT,
            "channel_type": ChannelType.LOGISTICS
        },
        {
            "username": "uretim_muduru",
            "password": "uretim123",
            "email": "uretim@example.com",
            "full_name": "Üretim Müdürü",
            "role": UserRole.PRODUCTION_MANAGER
        },
        {
            "username": "operator1",
            "password": "operator123",
            "email": "operator1@example.com",
            "full_name": "Üretim Operatörü",
            "role": UserRole.PRODUCTION_OPERATOR
        },
        {
            "username": "kalite_kontrol",
            "password": "kalite123",
            "email": "kalite@example.com",
            "full_name": "Kalite Kontrol Uzmanı",
            "role": UserRole.QUALITY_CONTROL
        },
        {
            "username": "depo_sorumlu",
            "password": "depo123",
            "email": "depo.sorumlu@example.com",
            "full_name": "Depo Sorumlusu",
            "role": UserRole.WAREHOUSE_SUPERVISOR
        },
        {
            "username": "arge_muhendis",
            "password": "arge123",
            "email": "arge@example.com",
            "full_name": "AR-GE Mühendisi",
            "role": UserRole.RND_ENGINEER
        },
        {
            "username": "bakim_teknisyeni",
            "password": "bakim123",
            "email": "bakim@example.com",
            "full_name": "Bakım Teknisyeni",
            "role": UserRole.MAINTENANCE_TECHNICIAN
        }
    ]
    
    created_count = 0
    updated_count = 0
    
    for user_data in demo_users:
        username = user_data["username"]
        existing = db.users.find_one({"username": username})
        
        if existing:
            print(f"✓ {username:20s} - Zaten mevcut")
            updated_count += 1
        else:
            # Create user
            password = user_data.pop("password")
            user_data["password_hash"] = pwd_context.hash(password)
            user_data["id"] = str(uuid.uuid4())
            user_data["is_active"] = True
            
            user = User(**user_data)
            db.users.insert_one(user.model_dump())
            
            print(f"✓ {username:20s} - Oluşturuldu (Şifre: {password})")
            created_count += 1
    
    print("\n" + "="*60)
    print("ÖZET:")
    print(f"  • {created_count} yeni kullanıcı oluşturuldu")
    print(f"  • {updated_count} mevcut kullanıcı")
    print(f"  • Toplam: {created_count + updated_count} kullanıcı")
    print("="*60 + "\n")
    
    print("DEMO KULLANICI LİSTESİ:")
    print("-" * 60)
    for user_data in demo_users:
        role_name = {
            UserRole.ADMIN: "Admin",
            UserRole.WAREHOUSE_MANAGER: "Depo Müdürü",
            UserRole.WAREHOUSE_STAFF: "Depo Personeli",
            UserRole.SALES_REP: "Satış Temsilcisi",
            UserRole.CUSTOMER: "Müşteri",
            UserRole.ACCOUNTING: "Muhasebe",
            UserRole.SALES_AGENT: "Plasiyer",
            UserRole.PRODUCTION_MANAGER: "Üretim Müdürü",
            UserRole.PRODUCTION_OPERATOR: "Üretim Operatörü",
            UserRole.QUALITY_CONTROL: "Kalite Kontrol",
            UserRole.WAREHOUSE_SUPERVISOR: "Depo Sorumlusu",
            UserRole.RND_ENGINEER: "AR-GE Mühendisi",
            UserRole.MAINTENANCE_TECHNICIAN: "Bakım Teknisyeni"
        }
        
        username = user_data.get("username") if isinstance(user_data, dict) else "admin"
        role = user_data.get("role", UserRole.ADMIN)
        
        # Get password (we need to keep track of it)
        passwords = {
            "admin": "admin123",
            "depo_muduru": "depo123",
            "depo_personel": "depo123",
            "satis_temsilci": "satis123",
            "musteri1": "musteri123",
            "muhasebe": "muhasebe123",
            "plasiyer1": "plasiyer123",
            "uretim_muduru": "uretim123",
            "operator1": "operator123",
            "kalite_kontrol": "kalite123",
            "depo_sorumlu": "depo123",
            "arge_muhendis": "arge123",
            "bakim_teknisyeni": "bakim123"
        }
        
        password = passwords.get(username, "demo123")
        print(f"  {username:20s} / {password:15s} - {role_name.get(role, 'Unknown')}")
    
    print("-" * 60 + "\n")

if __name__ == "__main__":
    create_demo_users()
