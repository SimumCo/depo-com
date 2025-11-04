# 📦 Kurulum Rehberi

Dağıtım Yönetim Sistemi için detaylı kurulum talimatları.

---

## 📋 Ön Gereksinimler

### 1. Python 3.10 veya üzeri
```bash
python --version  # veya python3 --version
```
**İndirme:** https://www.python.org/downloads/

### 2. Node.js 16 veya üzeri
```bash
node --version
```
**İndirme:** https://nodejs.org/

### 3. Yarn
```bash
npm install -g yarn
```

### 4. MongoDB
**Önerilen: MongoDB Compass**
- İndir: https://www.mongodb.com/try/download/compass
- Kurulumdan sonra MongoDB servisinin çalıştığından emin olun

---

## ⚡ Otomatik Kurulum

### Windows
```cmd
.\setup.bat
```

### Linux / macOS
```bash
chmod +x setup.sh
./setup.sh
```

**Not:** Otomatik kurulum tüm adımları sizin için yapar.

---

## 🔧 Manuel Kurulum

### Adım 1: Repository'yi Klonlayın

```bash
git clone <repository-url>
cd depo-com-main
```

### Adım 2: Backend Kurulumu

#### 2.1. Backend klasörüne gidin
```bash
cd backend
```

#### 2.2. Virtual environment oluşturun
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```

#### 2.3. Bağımlılıkları yükleyin
```bash
pip install -r requirements.txt
```

#### 2.4. .env dosyası oluşturun

**Windows (PowerShell):**
```powershell
@"
MONGO_URL=mongodb://localhost:27017
DB_NAME=distribution_db
SECRET_KEY=your-secret-key-change-in-production
HOST=0.0.0.0
PORT=8001
"@ | Out-File -FilePath .env -Encoding utf8
```

**Linux/macOS:**
```bash
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=distribution_db
SECRET_KEY=your-secret-key-change-in-production
HOST=0.0.0.0
PORT=8001
EOF
```

**VEYA `.env.example` dosyasını kopyalayın:**
```bash
cp .env.example .env
```

### Adım 3: Frontend Kurulumu

#### 3.1. Frontend klasörüne gidin
```bash
cd ../frontend
```

#### 3.2. Bağımlılıkları yükleyin
```bash
yarn install
```

#### 3.3. .env dosyası oluşturun

```bash
# Windows
echo REACT_APP_BACKEND_URL=http://localhost:8001 > .env

# Linux/macOS
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

**VEYA `.env.example` dosyasını kopyalayın:**
```bash
cp .env.example .env
```

### Adım 4: Veritabanını Hazırlayın

Root klasöre dönün ve seed script'ini çalıştırın:

```bash
cd ..
python scripts/seed_database.py
```

**Veritabanını sıfırlamak için:**
```bash
python scripts/seed_database.py --reset
```

---

## ▶️ Projeyi Çalıştırma

### Terminal 1 - Backend

```bash
cd backend
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Çıktı:**
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

**Kontrol:**
- Backend: http://localhost:8001
- API Docs: http://localhost:8001/docs

### Terminal 2 - Frontend

```bash
cd frontend
yarn start
```

**Çıktı:**
```
Compiled successfully!
webpack compiled with 1 warning
```

**Kontrol:**
- Frontend: http://localhost:3000

---

## ✅ Kurulum Doğrulama

### 1. Backend Çalışıyor mu?
```bash
curl http://localhost:8001
# veya tarayıcıda http://localhost:8001/docs
```

### 2. Frontend Çalışıyor mu?
Tarayıcıda `http://localhost:3000` adresini açın.
Login ekranı görünmelidir.

### 3. MongoDB Bağlantısı
MongoDB Compass'te `mongodb://localhost:27017` adresine bağlanın.
`distribution_db` database'ini görmelisiniz.

### 4. Test Hesapları
Aşağıdaki hesaplarla giriş yapın:

| Kullanıcı Adı | Şifre | Rol |
|---------------|-------|-----|
| admin | admin123 | Admin |
| muhasebe | muhasebe123 | Muhasebe |
| plasiyer1 | plasiyer123 | Plasiyer |
| musteri1 | musteri123 | Müşteri |

---

## 🐛 Sorun Giderme

### "ModuleNotFoundError: No module named 'motor'"
```bash
cd backend
pip install -r requirements.txt
```

### "Could not open requirements file"
Backend klasöründe olduğunuzdan emin olun:
```bash
pwd  # veya cd
# Output: .../depo-com-main/backend olmalı
```

### MongoDB bağlantı hatası
1. MongoDB Compass'i açın
2. "Connect" butonuna tıklayın
3. Backend'i yeniden başlatın

### Frontend "undefined/api" hatası
```bash
cd frontend
cat .env
# REACT_APP_BACKEND_URL=http://localhost:8001 olmalı

# Dosya yoksa oluşturun:
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Frontend'i yeniden başlatın
yarn start
```

### Port zaten kullanımda (8001 veya 3000)

**Windows:**
```cmd
# Port 8001
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Linux/macOS:**
```bash
# Port 8001
lsof -ti:8001 | xargs kill -9

# Port 3000
lsof -ti:3000 | xargs kill -9
```

### Virtual environment aktif değil
```bash
# Windows
cd backend
venv\Scripts\activate

# Linux/macOS
cd backend
source venv/bin/activate

# Aktif olduğunu kontrol edin:
which python  # veya where python (Windows)
# Output: .../venv/... içermeli
```

---

## 🔄 Güncelleme

Repository'den son değişiklikleri çekin:

```bash
git pull origin main

# Backend güncelleme
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend güncelleme
cd ../frontend
yarn install

# Veritabanı güncellemesi gerekiyorsa
cd ..
python scripts/seed_database.py
```

---

## 🗑️ Temizleme

Projeyi tamamen kaldırmak için:

```bash
# Virtual environment ve node_modules
rm -rf backend/venv
rm -rf frontend/node_modules

# MongoDB veritabanını sil
mongosh
use distribution_db
db.dropDatabase()
exit
```

---

## 📞 Destek

Sorun yaşıyorsanız:
1. QUICK_START.md dosyasına bakın
2. README.md'deki "Yaygın Sorunlar" bölümünü inceleyin
3. GitHub Issues'da arama yapın
4. Yeni issue açın (hata mesajını ve adımları ekleyin)

---

## ✨ İyi Çalışmalar!

Kurulum tamamlandı! Şimdi sistemi kullanmaya başlayabilirsiniz.

**Sonraki Adımlar:**
- Admin hesabı ile giriş yapın
- Kullanıcı oluşturun
- Ürün ekleyin
- İlk faturayı yükleyin
