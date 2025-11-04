# 🚀 HIZLI BAŞLANGIÇ REHBERİ

Windows/Linux/macOS'ta projeyi çalıştırmak için adım adım rehber.

> **Not:** Detaylı bilgi için [README.md](README.md) dosyasına bakın.

---

## ⚡ Otomatik Kurulum (Önerilen)

### Windows
```cmd
setup.bat
```

### Linux / macOS
```bash
chmod +x setup.sh
./setup.sh
```

---

## 🔧 Manuel Kurulum

Otomatik kurulum çalışmazsa aşağıdaki adımları takip edin:

### 1. Python Bağımlılıkları

**Backend klasöründen:**
```cmd
cd backend
pip install -r requirements.txt
```

**VEYA root klasöründen:**
```cmd
pip install -r requirements.txt
```

### 2. MongoDB Kurulumu

MongoDB Compass indirin ve çalıştırın:
- İndir: https://www.mongodb.com/try/download/compass
- Varsayılan bağlantı: `mongodb://localhost:27017`

### 3. Ortam Değişkenleri (.env)

**backend/.env oluşturun:**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=distribution_db
SECRET_KEY=your-secret-key-change-in-production
HOST=0.0.0.0
PORT=8001
```

**frontend/.env oluşturun:**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4. Veritabanını Hazırlayın

**Root klasöründen:**
```cmd
python scripts/seed_database.py
```

**Backend klasöründeyseniz:**
```cmd
cd ..
python scripts/seed_database.py
cd backend
```

### 5. Frontend Bağımlılıkları

```cmd
cd frontend
yarn install
```

(yarn yoksa: `npm install -g yarn`)

---

## ▶️ Projeyi Başlatma

### Terminal 1 - Backend:
```cmd
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Terminal 2 - Frontend:
```cmd
cd frontend
yarn start
```

---

## 🔐 Test Hesapları

| Rol | Kullanıcı Adı | Şifre |
|-----|---------------|-------|
| Admin | `admin` | `admin123` |
| Muhasebe | `muhasebe` | `muhasebe123` |
| Plasiyer | `plasiyer1` | `plasiyer123` |
| Müşteri | `musteri1` | `musteri123` |

---

## 🌐 Erişim URL'leri

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

---

## ❗ Yaygın Sorunlar

### "ModuleNotFoundError: No module named 'motor'"

**Çözüm:**
```cmd
cd backend
pip install -r requirements.txt
```

### "ERROR: Could not open requirements file"

**Çözüm:** Backend klasörüne gidin:
```cmd
cd backend
pip install -r requirements.txt
```

### MongoDB bağlantı hatası

**Çözüm:**
1. MongoDB Compass'i açın
2. "Connect" butonuna tıklayın
3. Bağlantıyı doğrulayın
4. Backend'i yeniden başlatın

### Port 8001 zaten kullanımda

**Windows:**
```cmd
netstat -ano | findstr :8001
taskkill /PID <PID_NUMARASI> /F
```

**Linux/macOS:**
```bash
lsof -ti:8001 | xargs kill -9
```

### "yarn: command not found"

**Çözüm:**
```cmd
npm install -g yarn
```

---

## 🔄 Veritabanını Sıfırlama

```cmd
python scripts/seed_database.py --reset
```

**Uyarı:** Bu komut tüm mevcut verileri siler!

---

## 📞 Destek

Sorun yaşıyorsanız:
1. Hata mesajını tam olarak kaydedin
2. Hangi adımda hata aldığınızı not edin
3. Issue açın veya README.md'deki iletişim bilgilerini kullanın

---

## ✅ Başarılı Kurulum

Eğer her şey doğru çalışıyorsa:

✅ Backend: http://localhost:8001 → "Not Found" veya API docs görünmeli
✅ Frontend: http://localhost:3000 → Login ekranı görünmeli
✅ Test hesabı ile giriş yapabilmelisiniz

İyi çalışmalar! 🎉
