@echo off
chcp 65001 >nul
echo ================================================
echo 🚀 Dağıtım Yönetim Sistemi - Hızlı Kurulum
echo ================================================
echo.

echo 📋 Gereksinimleri kontrol ediliyor...

REM Python kontrolü
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Python bulunamadı! Lütfen Python 3.10+ yükleyin.
    echo    İndir: https://www.python.org/downloads/
    pause
    exit /b 1
) else (
    for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo ✓ Python yüklü: %PYTHON_VERSION%
)

REM Node.js kontrolü
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Node.js bulunamadı! Lütfen Node.js 16+ yükleyin.
    echo    İndir: https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✓ Node.js yüklü: %NODE_VERSION%
)

REM Yarn kontrolü
yarn --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ Yarn bulunamadı. Yükleniyor...
    npm install -g yarn
) else (
    for /f %%i in ('yarn --version') do set YARN_VERSION=%%i
    echo ✓ Yarn yüklü: %YARN_VERSION%
)

echo.
echo ================================================
echo 🔧 Backend Kurulumu Başlıyor...
echo ================================================

cd backend

REM Virtual environment oluştur
echo 📦 Virtual environment oluşturuluyor...
python -m venv venv

REM Virtual environment'ı aktive et
call venv\Scripts\activate.bat

REM Paketleri yükle
echo 📥 Python paketleri yükleniyor...
pip install -r requirements.txt --quiet

REM .env dosyası oluştur
if not exist .env (
    echo 📝 .env dosyası oluşturuluyor...
    (
        echo MONGO_URL=mongodb://localhost:27017
        echo DB_NAME=distribution_db
        echo SECRET_KEY=your-super-secret-key-change-this-in-production
        echo HOST=0.0.0.0
        echo PORT=8001
    ) > .env
    echo ✓ .env dosyası oluşturuldu
) else (
    echo ⚠ .env dosyası zaten mevcut
)

REM Demo verileri oluştur
echo 🌱 Demo verileri oluşturuluyor...
python seed_data.py
python seed_sales_agents_data.py
python seed_20_products_orders.py

cd ..

echo.
echo ================================================
echo 🎨 Frontend Kurulumu Başlıyor...
echo ================================================

cd frontend

REM Paketleri yükle
echo 📥 Node.js paketleri yükleniyor...
call yarn install

REM .env dosyası oluştur
if not exist .env (
    echo 📝 .env dosyası oluşturuluyor...
    echo REACT_APP_BACKEND_URL=http://localhost:8001 > .env
    echo ✓ .env dosyası oluşturuldu
) else (
    echo ⚠ .env dosyası zaten mevcut
)

cd ..

echo.
echo ================================================
echo ✅ KURULUM TAMAMLANDI!
echo ================================================
echo.
echo 🚀 Projeyi başlatmak için:
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   venv\Scripts\activate
echo   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
echo.
echo Terminal 2 - Frontend:
echo   cd frontend
echo   yarn start
echo.
echo ================================================
echo 🔐 Demo Hesaplar:
echo ================================================
echo   Admin:              admin / admin123
echo   Plasiyer:           plasiyer1 / plasiyer123
echo   Müşteri:            musteri1 / musteri123
echo   Satış Temsilcisi:   satistemsilcisi / satis123
echo.
echo 🌐 URL'ler:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8001
echo   API Docs: http://localhost:8001/docs
echo.
echo ================================================
pause
