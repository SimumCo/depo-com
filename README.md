# Dağıtım Yönetim Sistemi - Kurulum Rehberi

## 📋 Gereksinimler

Projeyi çalıştırmak için bilgisayarınızda şunlar kurulu olmalı:

### 1. Python 3.10 veya üzeri
```bash
python --version
```
**İndirme:** https://www.python.org/downloads/

### 2. Node.js 16+ ve Yarn
```bash
node --version
npm install -g yarn
yarn --version
```
**İndirme:** https://nodejs.org/

### 3. MongoDB
**Önerilen: MongoDB Compass**
- İndir: https://www.mongodb.com/try/download/compass
- Otomatik `mongodb://localhost:27017` üzerinde çalışır

---

## 🚀 Hızlı Kurulum

### 1️⃣ Backend Kurulumu
```bash
cd backend

# Virtual environment oluştur
python -m venv venv

# Aktive et
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# Paketleri yükle
pip install -r requirements.txt

# .env dosyası oluştur
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=distribution_db
SECRET_KEY=your-super-secret-key-change-this
HOST=0.0.0.0
PORT=8001
EOF

# Demo verileri oluştur
python seed_data.py
python seed_sales_agents_data.py
python seed_20_products_orders.py
```

### 2️⃣ Frontend Kurulumu
```bash
cd ../frontend

# Paketleri yükle
yarn install

# .env dosyası oluştur
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

---

## ▶️ Çalıştırma

### Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate  # veya venv\Scripts\activate (Windows)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
✅ Backend: http://localhost:8001
📖 API Docs: http://localhost:8001/docs

### Terminal 2 - Frontend:
```bash
cd frontend
yarn start
```
✅ Frontend: http://localhost:3000

---

## 🔐 Demo Hesaplar

| Rol | Username | Password |
|-----|----------|----------|
| 👤 Admin | `admin` | `admin123` |
| 📦 Depo Müdürü | `manager` | `manager123` |
| 👔 Satış Temsilcisi | `satistemsilcisi` | `satis123` |
| 🚗 Plasiyer | `plasiyer1` | `plasiyer123` |
| 🛒 Müşteri | `musteri1` | `musteri123` |

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
