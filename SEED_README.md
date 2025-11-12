# 🌱 Database Seed Scripti Kullanım Kılavuzu

## 📋 Genel Bakış

Fatura bazlı müşteri tüketim hesaplama sistemi için 3 farklı script mevcuttur:

### 1. **clean_database.py** - Veritabanı Temizleme
Admin ve muhasebe kullanıcıları hariç tüm verileri temizler.

### 2. **seed_complete_system.py** - Tam Demo Verisi
Kapsamlı test verileri ile sistemi doldurur.

### 3. **scripts/seed_database.py** - Minimal Kurulum
Sadece admin ve muhasebe kullanıcıları oluşturur.

---

## 🚀 Hızlı Başlangıç

### Adım 1: Veritabanını Temizle (Opsiyonel)

```bash
cd /app/backend
python clean_database.py
```

**Temizlenenler:**
- ❌ Tüm müşteriler
- ❌ Tüm ürünler
- ❌ Tüm faturalar
- ❌ Tüm tüketim kayıtları
- ❌ Tüm periyodik kayıtlar
- ❌ Tüm siparişler

**Korunanlar:**
- ✅ Admin kullanıcısı
- ✅ Muhasebe kullanıcısı

---

### Adım 2: Tam Demo Verilerini Yükle

```bash
cd /app/backend
python seed_complete_system.py
```

**Oluşturulanlar:**

#### 👥 Kullanıcılar (7)
| Tip | Kullanıcı Adı | Şifre | Açıklama |
|-----|---------------|-------|----------|
| Admin | `admin` | `admin123` | Sistem yöneticisi |
| Muhasebe | `muhasebe` | `muhasebe123` | Muhasebe personeli |
| Müşteri 1 | `musteri1` | `musteri123` | Ankara Gıda Ltd Şti |
| Müşteri 2 | `musteri2` | `musteri223` | İstanbul Süt Sanayi A.Ş. |
| Müşteri 3 | `musteri3` | `musteri323` | İzmir Yoğurt Ltd Şti |
| Müşteri 4 | `musteri4` | `musteri423` | Bursa Peynir A.Ş. |
| Müşteri 5 | `musteri5` | `musteri523` | Antalya Süt Ürünleri Ltd |

#### 🥛 Ürünler (10)
| Kod | Ürün Adı | Kategori | Fiyat |
|-----|----------|----------|-------|
| SUT001 | Tam Yağlı Süt 1L | Süt | 2.5 TL |
| SUT002 | Yarım Yağlı Süt 1L | Süt | 2.2 TL |
| YOG001 | Süzme Yoğurt 500g | Yoğurt | 3.5 TL |
| YOG002 | Krem Yoğurt 1kg | Yoğurt | 4.0 TL |
| PEY001 | Beyaz Peynir 1kg | Peynir | 8.5 TL |
| PEY002 | Kaşar Peynir 500g | Peynir | 9.0 TL |
| KRE001 | Krema 200ml | Krema | 3.0 TL |
| TER001 | Tereyağı 500g | Tereyağı | 12.0 TL |
| AYR001 | Ayran 1L | Ayran | 1.5 TL |
| AYR002 | Meyveli Ayran 200ml | Ayran | 1.0 TL |

#### 📄 Faturalar (40)
- **2024 Yılı:** 30 fatura (Her müşteri için 6 fatura: Ocak, Mart, Mayıs, Temmuz, Eylül, Kasım)
- **2025 Yılı:** 10 fatura (Her müşteri için 2 fatura: Ocak, Mart)

Her fatura:
- 3-5 rastgele ürün içerir
- Gerçekçi miktarlar (10-60 adet)
- KDV dahil toplam tutar

#### 📊 Otomatik Hesaplamalar
- **Tüketim Kayıtları:** ~160 kayıt (fatura bazlı)
- **Periyodik Kayıtlar:** ~184 kayıt
  - Aylık: ~111 kayıt
  - Haftalık: ~73 kayıt

---

## 🧪 Test Senaryoları

### 1. Fatura Bazlı Tüketim Görüntüleme

```bash
# Admin ile giriş
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Müşteri 1'in tüketim kayıtları
curl -X GET "http://localhost:8001/api/customer-consumption/invoice-based/customer/cust_001" \
  -H "Authorization: Bearer {token}"
```

### 2. Yıllık Karşılaştırma (2024 vs 2025)

```bash
# Ocak ayı karşılaştırması
curl -X GET "http://localhost:8001/api/consumption-periods/compare/year-over-year?customer_id=cust_001&product_code=SUT001&period_type=monthly&period_number=1&current_year=2025" \
  -H "Authorization: Bearer {token}"
```

**Beklenen Sonuç:**
```json
{
  "customer_id": "cust_001",
  "product_code": "SUT001",
  "product_name": "Tam Yağlı Süt 1L",
  "current_year": 2025,
  "current_year_consumption": 45.0,
  "previous_year": 2024,
  "previous_year_consumption": 30.0,
  "percentage_change": 50.0,
  "trend_direction": "growth"
}
```

### 3. Yıllık Trend Analizi

```bash
curl -X GET "http://localhost:8001/api/consumption-periods/trends/yearly?customer_id=cust_001&product_code=SUT001&year=2024&period_type=monthly" \
  -H "Authorization: Bearer {token}"
```

**Beklenen Sonuç:**
- 12 aylık tüketim verileri
- En yüksek/düşük ay bilgisi
- Genel trend (increasing/decreasing/stable/seasonal)

### 4. Top Consumers (En Çok Tüketenler)

```bash
curl -X GET "http://localhost:8001/api/consumption-periods/top-consumers?product_code=SUT001&year=2024&period_type=monthly&limit=5" \
  -H "Authorization: Bearer {token}"
```

---

## 📁 Script Dosyaları

### `/app/backend/clean_database.py`
```python
# Veritabanını temizle
cd /app/backend
python clean_database.py
```

### `/app/backend/seed_complete_system.py`
```python
# Tam demo verileri yükle
cd /app/backend
python seed_complete_system.py
```

### `/app/scripts/seed_database.py`
```python
# Minimal kurulum (sadece admin + muhasebe)
cd /app
python scripts/seed_database.py
```

---

## 🔍 Veritabanı Kontrol

Seed işleminden sonra verileri kontrol etmek için:

```bash
cd /app/backend
python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('DB_NAME', 'main_db')]
    
    print('=' * 60)
    print('VERİTABANI DURUMU')
    print('=' * 60)
    print(f'Kullanıcılar: {await db.users.count_documents({})}')
    print(f'Ürünler: {await db.products.count_documents({})}')
    print(f'Faturalar: {await db.invoices.count_documents({})}')
    print(f'Tüketim Kayıtları: {await db.customer_consumption.count_documents({})}')
    print(f'Periyodik Kayıtlar: {await db.consumption_periods.count_documents({})}')
    
    client.close()

asyncio.run(check())
"
```

---

## 🎯 Önemli Notlar

1. **Temizleme İşlemi:** `clean_database.py` admin ve muhasebe hariç HER ŞEYİ siler!
2. **İdempotent:** `seed_complete_system.py` birden fazla çalıştırılabilir (mevcut kayıtları kontrol eder)
3. **Gerçekçi Veriler:** Rastgele ama mantıklı veriler oluşturur
4. **Otomatik İlişkiler:** Fatura → Tüketim → Periyodik kayıtlar otomatik oluşturulur
5. **Test Kullanıcıları:** Şifreler basit tutulmuştur (test amaçlı)

---

## 🆘 Sorun Giderme

### Hata: "MONGO_URL environment variable not set"
```bash
cd /app/backend
source .env  # veya
export MONGO_URL="mongodb://localhost:27017"
```

### Hata: "Module not found: passlib"
```bash
pip install passlib bcrypt
```

### Seed başarısız olduysa
```bash
# 1. Temizle
python clean_database.py

# 2. Tekrar dene
python seed_complete_system.py
```

---

## 📞 İletişim

Sorularınız için:
- Admin: admin@example.com
- Muhasebe: muhasebe@example.com
