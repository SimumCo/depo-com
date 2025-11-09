# 🚛 Dağıtım Yönetim Sistemi

B2B dağıtım firmaları için sipariş, fatura ve tüketim yönetim sistemi.

> 📋 **[3 Yıllık Geliştirme Yol Haritası](./ROADMAP.md)** | **[Hızlı Özet](./ROADMAP_SUMMARY.md)**

---

## 🎯 Özellikler

- **Fatura Yönetimi**: HTML e-fatura yükleme, manuel fatura girişi
- **Otomatik İşlemler**: Müşteri ve ürün otomatik kayıt
- **Multi-Role**: Admin, Muhasebe, Plasiyer, Müşteri rolleri
- **Tüketim Analizi**: Otomatik sarfiyat hesaplama

---

## 📋 Gereksinimler

- Python 3.10+
- Node.js 16+
- MongoDB
- Yarn (npm install -g yarn)

---

## 🛠️ Kurulum

### 1. Repository'yi klonlayın

```bash
git clone <repository-url>
cd depo-com-main
```

### 2. MongoDB'yi başlatın

MongoDB Compass'i açın ve bağlantıyı kurun:
- URL: `mongodb://localhost:27017`

### 3. Backend kurulumu

```bash
cd backend

# Virtual environment
python -m venv venv

# Aktive et
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# Bağımlılıkları yükle
pip install -r requirements.txt
```

**backend/.env** dosyası oluşturun:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=distribution_db
SECRET_KEY=your-secret-key-change-in-production
HOST=0.0.0.0
PORT=8001
```

```bash
# Admin ve muhasebe kullanıcılarını oluştur
cd ..
python scripts/seed_database.py
cd backend
```

### 4. Frontend kurulumu

```bash
cd ../frontend

# Bağımlılıkları yükle
yarn install
```

**frontend/.env** dosyası oluşturun:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## ▶️ Çalıştırma

### Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Terminal 2 - Frontend:
```bash
cd frontend
yarn start
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

---

## 🔐 Giriş Bilgileri

**Admin Hesabı:**
- Kullanıcı Adı: `admin`
- Şifre: `admin123`

Diğer kullanıcılar admin panelinden oluşturulabilir.

---

## 📁 Proje Yapısı

```
├── backend/
│   ├── repositories/     # Database operations
│   ├── services/         # Business logic
│   ├── routes/           # API endpoints
│   ├── models/           # Data models
│   ├── server.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
└── scripts/
    └── seed_database.py  # Admin oluşturma
```

---

## 🔧 Yaygın Sorunlar

### MongoDB bağlanamıyor
```bash
# MongoDB servisini kontrol edin
mongosh
```

### Port zaten kullanımda
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8001 | xargs kill -9
```

### Module not found
```bash
cd backend
pip install -r requirements.txt
```

### Frontend "undefined/api" hatası
`frontend/.env` dosyasını kontrol edin:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```
Frontend'i yeniden başlatın: `yarn start`

---

## 🔄 Veritabanını Sıfırlama

```bash
mongosh
use distribution_db
db.dropDatabase()
exit

python scripts/seed_database.py
```

---

## 📚 API Dokümantasyonu

Backend çalışırken: http://localhost:8001/docs

---

## 🛡️ Teknolojiler

- **Backend**: FastAPI, Python, MongoDB
- **Frontend**: React, Tailwind CSS
- **Authentication**: JWT

---

## 📄 Lisans

MIT

---

**Not:** Production ortamında `SECRET_KEY` ve database şifrelerini değiştirmeyi unutmayın.
