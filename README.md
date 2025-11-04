# 🚛 Dağıtım Yönetim Sistemi (B2B Distribution Management System)

Modern B2B dağıtım ve satış yönetim platformu - FastAPI + React + MongoDB

## ✨ Özellikler

### 🎯 Temel Özellikler
- ✅ **Multi-Role Sistem** - Admin, Depo, Satış Temsilcisi, Plasiyer, Müşteri, Muhasebe
- ✅ **Sipariş Yönetimi** - Müşteri ve plasiyer siparişleri
- ✅ **Stok Takibi** - Gerçek zamanlı envanter yönetimi
- ✅ **Rota Planlaması** - Haftalık teslimat rotaları
- ✅ **Excel Toplu Veri Girişi** - Hızlı sipariş oluşturma

### 🆕 Yeni Özellikler (v2.0)
- ✅ **Fatura Yönetimi** - HTML e-fatura yükleme (SED/EE formatı) ve manuel fatura girişi
- ✅ **Otomatik Müşteri/Ürün Kaydı** - Vergi no ile müşteri bulma, otomatik kayıt
- ✅ **Genişletilmiş Ürün Kategorileri** - 12 kategori (Yoğurt, Ayran, Peynir, Kaşar, Tereyağı, Krema, vb.)
- ✅ **Tüketim Analizi** - Otomatik sarfiyat hesaplama ve tahmin
- ✅ **Modüler Backend** - OOP prensipleri (Repository/Service pattern)
- ✅ **Dropdown Formlar** - Veritabanından dinamik seçim

---

## 📋 Gereksinimler

### 1. Python 3.10+
```bash
python --version
```
**İndirme:** https://www.python.org/downloads/

### 2. Node.js 16+ ve Yarn
```bash
node --version
npm install -g yarn
```
**İndirme:** https://nodejs.org/

### 3. MongoDB
**MongoDB Compass (Önerilen)**
- İndir: https://www.mongodb.com/try/download/compass
- Varsayılan: `mongodb://localhost:27017`

---

## 🚀 Hızlı Kurulum

### ⚡ Otomatik Kurulum (Önerilen)

**Windows:**
```cmd
setup.bat
```

**Linux / macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

✅ Otomatik kurulum şunları yapar:
- Python ve Node.js bağımlılıklarını yükler
- `.env` dosyalarını oluşturur
- Veritabanını test verileriyle doldurur

---

### 🔧 Manuel Kurulum

<details>
<summary>Manuel kurulum adımlarını görmek için tıklayın</summary>

### 1️⃣ Backend Kurulumu

```bash
cd backend

# Virtual environment oluştur
python -m venv venv

# Virtual environment'ı aktive et
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# Bağımlılıkları yükle
pip install -r requirements.txt

# .env dosyası oluştur
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=distribution_db
SECRET_KEY=your-secret-key-change-in-production
HOST=0.0.0.0
PORT=8001
EOF
```

**Windows için .env oluşturma:**
```cmd
echo MONGO_URL=mongodb://localhost:27017 > .env
echo DB_NAME=distribution_db >> .env
echo SECRET_KEY=your-secret-key-change-in-production >> .env
echo HOST=0.0.0.0 >> .env
echo PORT=8001 >> .env
```

### 2️⃣ Veritabanını Hazırlayın

**Root klasöründen:**
```bash
python scripts/seed_database.py
```

**Veritabanını sıfırlayıp baştan başlamak için:**
```bash
python scripts/seed_database.py --reset
```

### 3️⃣ Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükle
yarn install

# .env dosyası oluştur
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

</details>

---

## ▶️ Çalıştırma

### Backend (Terminal 1):
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
- 🌐 Backend: http://localhost:8001
- 📖 API Docs: http://localhost:8001/docs

### Frontend (Terminal 2):
```bash
cd frontend
yarn start
```
- 🌐 Frontend: http://localhost:3000

---

## ❗ Yaygın Sorunlar ve Çözümler

### 🔴 "ModuleNotFoundError: No module named 'motor'"

**Çözüm:**
```bash
cd backend
pip install -r requirements.txt
```

### 🔴 "Could not open requirements file"

**Çözüm:** Backend klasöründe olduğunuzdan emin olun:
```bash
cd backend
pip install -r requirements.txt
```

### 🔴 MongoDB bağlantı hatası

**Çözüm:**
1. MongoDB Compass'i açın ve "Connect" butonuna tıklayın
2. Bağlantı URL'si: `mongodb://localhost:27017`
3. Backend'i yeniden başlatın

### 🔴 "Faturalar yüklenemedi" (Frontend 404 hatası)

**Çözüm:** Frontend `.env` dosyasını kontrol edin:
```bash
cd frontend
# Dosya içeriği:
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Frontend'i yeniden başlatın:**
```bash
# Ctrl+C ile durdurup
yarn start
```

### 🔴 Port 8001 zaten kullanımda

**Windows:**
```cmd
netstat -ano | findstr :8001
taskkill /PID <PID_NUMARASI> /F
```

**Linux/macOS:**
```bash
lsof -ti:8001 | xargs kill -9
```

### 🔴 "yarn: command not found"

**Çözüm:**
```bash
npm install -g yarn
```

---
- 🌐 Frontend: http://localhost:3000

---

## 🔐 Demo Hesaplar

| Rol | Kullanıcı Adı | Şifre | Açıklama |
|-----|---------------|-------|----------|
| 👤 **Admin** | `admin` | `admin123` | Tüm sistem yönetimi, kullanıcı ekleme |
| 💰 **Muhasebe** | `muhasebe` | `muhasebe123` | HTML fatura yükleme, manuel fatura gir |
| 🚗 **Plasiyer** | `plasiyer1` | `plasiyer123` | Müşteri rotaları, sipariş alma |
| 🛒 **Müşteri** | `musteri1` | `musteri123` | Sipariş verme, fatura görüntüleme |

**Test için:** Herhangi bir hesapla `http://localhost:3000` adresinden giriş yapın.

---

## 🎯 Özellikler Detayı

### 👤 Admin
- ✅ Tüm kullanıcı yönetimi
- ✅ Sistem geneli raporlar
- ✅ Tüketim analizi tetikleme

### 💼 Satış Temsilcisi
- ✅ **Müşteri Kaydı** - Kullanıcı adı ve şifre oluşturma
- ✅ **Ürün Kaydı** - Kategori, fiyat, stok yönetimi
- ✅ **Fatura Oluşturma** - Dropdown ile müşteri/ürün seçimi
- ✅ **Excel Toplu Veri Girişi** - Hızlı sipariş yükleme
- ✅ Tüm müşterileri görüntüleme

### 🚗 Plasiyer (Sales Agent)
- ✅ Müşterilerimi görme (günlere göre gruplu)
- ✅ Rotalarım (Pazartesi-Cumartesi)
- ✅ Depoya sipariş verme
- ✅ Müşteri siparişleri
- ✅ İstatistikler ve raporlar

### 🛒 Müşteri
- ✅ **Faturalarım** - HTML fatura görüntüleme
- ✅ **Tüketim İstatistikleri** - Haftalık/aylık sarfiyat
- ✅ Ürün kataloğu ve sipariş
- ✅ Teslimat günü bilgisi
- ✅ Büyüme oranı ve tahminler

### 💰 Muhasebe
- ✅ **HTML E-Fatura Yükleme** - SED/EE formatı otomatik parse
- ✅ **Manuel Fatura Girişi** - Vergi no ile müşteri otomatik bulma
- ✅ **Otomatik Müşteri/Ürün Oluşturma** - Yeni kayıtlar otomatik
- ✅ **Genişletilmiş Ürün Kategorileri** - 12 kategori (Yoğurt, Ayran, Peynir, vb.)
- ✅ Fatura listeleme ve raporlar

---

## 📊 Sistem Özellikleri

### 🆕 Fatura Yönetimi (v2.0)
- HTML e-fatura yükleme ve otomatik parsing
- Fatura numarası, vergi no, ürün bilgileri otomatik çıkarma
- Vergi numarasına göre müşteri eşleştirme
- Müşteri fatura görüntüleme arayüzü

### 📈 Tüketim Analizi (v2.0)
- Sipariş geçmişinden otomatik hesaplama
- Günlük/haftalık/aylık sarfiyat metrikleri
- Yıl bazlı karşılaştırma ve büyüme oranı
- Gelecek dönem tahminleri
- Ürün bazlı tüketim takibi

### 🔧 Teknik Özellikler
- **Modüler Backend** - Organize API yapısı (routes/, models/, utils/)
- **Role-Based Access Control** - Rol bazlı yetkilendirme
- **JWT Authentication** - Güvenli kimlik doğrulama
- **MongoDB** - NoSQL veritabanı
- **React + Tailwind** - Modern UI
- **FastAPI** - Yüksek performanslı backend

---

## 📦 Proje İçeriği

✅ **41 Müşteri**  
✅ **25 Ürün**  
✅ **544+ Sipariş**  
✅ **3 Plasiyer**  
✅ **Haftalık Rota Sistemi**  
✅ **Fatura Yönetimi**  
✅ **Tüketim Analizi**  

---

## 📁 Proje Yapısı (v2.0)

```
├── backend/
│   ├── routes/                   # API Endpoints (Modüler)
│   │   ├── auth_routes.py       # Kimlik doğrulama
│   │   ├── invoice_routes.py    # Fatura yönetimi
│   │   └── consumption_routes.py # Tüketim takibi
│   ├── models/                   # Data Models
│   │   ├── user.py
│   │   ├── invoice.py
│   │   └── consumption.py
│   ├── utils/                    # Helper Functions
│   │   ├── auth.py              # JWT, password hashing
│   │   └── helpers.py
│   ├── server.py                # Ana application
│   ├── server_old.py            # Legacy routes
│   ├── seed_*.py                # Demo data generators
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/          # React Components
│   │   │   ├── CustomerForm.js         # Müşteri kayıt
│   │   │   ├── ProductForm.js          # Ürün kayıt
│   │   │   ├── InvoiceFormWithDropdown.js # Fatura oluşturma
│   │   │   ├── CustomerInvoices.js     # Fatura görüntüleme
│   │   │   ├── CustomerConsumptionStats.js # Tüketim analizi
│   │   │   └── ...
│   │   ├── pages/               # Dashboard Pages
│   │   │   ├── CustomerDashboard.js
│   │   │   ├── SalesRepDashboard.js
│   │   │   ├── AccountingDashboard.js
│   │   │   └── ...
│   │   └── services/api.js     # API calls
│   └── package.json
│
└── README.md
```

---

## 🔄 Veritabanı Kurulumu

### ⚡ Hızlı Kurulum (Önerilen)
Tek komutla tüm test verilerini yükleyin:

```bash
cd /app
python scripts/seed_database.py
```

**Ne yüklenir?**
- ✅ **Kullanıcılar** - Admin, Muhasebe, Plasiyer, Müşteriler
- ✅ **Ürünler** - 8 ürün (Yoğurt, Peynir, Ayran, Süt, Tereyağı, Krema)
- ✅ **Test Hesapları** - Hazır kullanıcı adı/şifre

### 🗑️ Sıfırlama ve Yeniden Yükleme
Tüm verileri silip baştan başlamak için:

```bash
python scripts/seed_database.py --reset
```

**Uyarı:** Bu komut tüm mevcut verileri siler!

### 📊 Manuel Kurulum
Seed script yerine manuel olarak veritabanı oluşturmak isterseniz:

```bash
mongosh
use distribution_db
db.dropDatabase()
exit

# Eski seed scriptleri
cd backend
python seed_data.py
python seed_sales_agents_data.py
python seed_20_products_orders.py
```

### 📥 Demo Kullanıcıları Import Etme

Eğer sadece demo kullanıcıları güncellemek veya eklemek isterseniz:

```bash
# Python script ile import
cd /app
python import_demo_users.py

# Veya MongoDB import komutu ile
mongoimport --db distribution_db --collection users --file /app/demo_users.json --jsonArray --mode upsert
```

**Demo Kullanıcılar:**
- Admin, Depo Müdürü, Satış Temsilcisi
- Muhasebe, Plasiyer (2 adet)
- Müşteri (3 adet)

**Not:** `import_demo_users.py` scripti hem veritabanına import eder hem de `/app/demo_users.json` dosyasını oluşturur.

---

## 🔧 Yaygın Sorunlar

### MongoDB bağlanamıyor?
```bash
# MongoDB'nin çalıştığını kontrol edin
mongosh

# Çalışmıyorsa başlatın
mongod --dbpath /path/to/data
```

### Port zaten kullanımda?
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8001 | xargs kill -9
```

### Module not found?
```bash
# Backend
pip install -r requirements.txt

# Frontend
rm -rf node_modules && yarn install
```

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Giriş yap
- `GET /api/auth/me` - Kullanıcı bilgileri

### Invoices (Faturalar)
- `POST /api/invoices/upload` - HTML fatura yükle
- `GET /api/invoices/my-invoices` - Faturalarım
- `GET /api/invoices/{id}` - Fatura detayı
- `GET /api/invoices/all/list` - Tüm faturalar (muhasebe)

### Consumption (Tüketim)
- `POST /api/consumption/calculate` - Tüketim hesapla
- `GET /api/consumption/my-consumption` - Tüketimim
- `GET /api/consumption/customer/{id}` - Müşteri tüketimi

### Products & Orders
- `GET /api/products` - Ürün listesi
- `POST /api/products` - Ürün ekle
- `POST /api/orders` - Sipariş oluştur
- `GET /api/orders` - Sipariş listesi

**📖 Tam API Dokümantasyonu:** http://localhost:8001/docs

---

## 🚀 Deployment

### Production Build
```bash
# Frontend
cd frontend
yarn build

# Backend
cd backend
pip install gunicorn
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker
```

---

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing`)
5. Pull Request açın

---

## 📝 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın

---

## 📧 İletişim

Sorularınız için issue açabilir veya pull request gönderebilirsiniz.

**API Docs:** http://localhost:8001/docs

İyi çalışmalar! 🚀

---

## 🛑 Projeyi Durdurma

1. Her iki terminalde `Ctrl + C`
2. Backend virtual environment'tan çık: `deactivate`

---

## 🎉 Başarıyla Kuruldu!

**Backend:** http://localhost:8001
**Frontend:** http://localhost:3000
**API Docs:** http://localhost:8001/docs

İyi çalışmalar! 🚀
