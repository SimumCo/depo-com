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
- ✅ **Fatura Yönetimi** - HTML e-fatura yükleme ve görüntüleme
- ✅ **Tüketim Analizi** - Otomatik sarfiyat hesaplama ve tahmin
- ✅ **Kullanıcı Yönetimi** - Satış temsilcisi müşteri/kullanıcı kaydı
- ✅ **Modüler Backend** - Organize edilmiş API yapısı
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

### 1️⃣ Backend
```bash
cd backend

# Virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Bağımlılıklar
pip install -r requirements.txt

# Konfigürasyon
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=distribution_db
SECRET_KEY=your-secret-key-change-in-production
HOST=0.0.0.0
PORT=8001
EOF

# Demo Verileri
python seed_data.py
python seed_sales_agents_data.py
python seed_20_products_orders.py
```

### 2️⃣ Frontend
```bash
cd frontend

# Bağımlılıklar
yarn install

# Konfigürasyon
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

---

## ▶️ Çalıştırma

### Backend (Terminal 1):
```bash
cd backend
source venv/bin/activate
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

## 🔐 Demo Hesaplar

| Rol | Kullanıcı Adı | Şifre | Yetkiler |
|-----|---------------|-------|----------|
| 👤 **Admin** | `admin` | `admin123` | Tüm sistem yönetimi |
| 📦 **Depo Müdürü** | `manager` | `manager123` | Stok, sevkiyat yönetimi |
| 💼 **Satış Temsilcisi** | `satistemsilcisi` | `satis123` | Müşteri/ürün/fatura kaydı |
| 🚗 **Plasiyer** | `plasiyer1` | `plasiyer123` | Müşteri rotaları, sipariş |
| 🛒 **Müşteri** | `musteri1` | `musteri123` | Sipariş verme, fatura görüntüleme |
| 💰 **Muhasebe** | `muhasebe` | `muhasebe123` | Fatura yükleme |

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

## 📦 Proje İçeriği

✅ **41 Müşteri**
✅ **25 Ürün**
✅ **544 Sipariş**
✅ **3 Plasiyer**
✅ **Excel Toplu Veri Girişi**
✅ **Sarfiyat Analizi**
✅ **Sipariş Yönetimi**

---

## 🎯 Özellikler

### Plasiyer (plasiyer1)
- ✅ Müşterilerimi görme (günlere göre)
- ✅ 544 sipariş ve detayları
- ✅ Depoya sipariş verme
- ✅ Sarfiyat analizi

### Müşteri (musteri1)
- ✅ 25 ürün kataloğu
- ✅ Sepet ile sipariş
- ✅ Kendi siparişleri
- ✅ Dönemlik sarfiyat

### Satış Temsilcisi (satistemsilcisi)
- ✅ **Excel ile toplu veri girişi**
- ✅ Müşteri, ürün, sipariş yükleme
- ✅ Template indirme

---

## 📱 Ekran Görüntüleri

### Login Ekranı
Demo hesaplar otomatik listelenir

### Plasiyer Dashboard
- Müşterilerim (günlere göre)
- Siparişler (detaylı görünüm)
- Depoya Sipariş Ver
- Sarfiyat Analizi

### Müşteri Dashboard
- Ürün Kataloğu (+/- sepet)
- Siparişlerim
- Sarfiyat Analizi
- Teslimat günü bilgisi

---

## 🔄 Veritabanını Sıfırlama

```bash
mongosh
use distribution_db
db.dropDatabase()
exit

# Seed scriptlerini tekrar çalıştır
cd backend
python seed_data.py
python seed_sales_agents_data.py
python seed_20_products_orders.py
```

---

## 📁 Proje Yapısı

```
├── backend/
│   ├── config/constants.py      # Sabitler, enum'lar
│   ├── utils/helpers.py         # Yardımcı fonksiyonlar
│   ├── models/                  # Database modelleri
│   ├── routes/                  # API routes
│   ├── server.py               # Ana uygulama (1757 satır)
│   └── seed_*.py               # Demo data
│
├── frontend/
│   ├── src/
│   │   ├── components/         # React bileşenler
│   │   ├── pages/             # Dashboard'lar
│   │   └── services/          # API çağrıları
│   └── package.json
│
└── README.md
```

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
