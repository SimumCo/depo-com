#!/bin/bash

echo "================================================"
echo "🚀 Dağıtım Yönetim Sistemi - Hızlı Kurulum"
echo "================================================"
echo ""

# Renk kodları
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Gereksinim kontrolü
echo "📋 Gereksinimleri kontrol ediliyor..."

# Python kontrolü
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d " " -f 2)
    echo -e "${GREEN}✓${NC} Python yüklü: $PYTHON_VERSION"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version | cut -d " " -f 2)
    echo -e "${GREEN}✓${NC} Python yüklü: $PYTHON_VERSION"
    PYTHON_CMD="python"
else
    echo -e "${RED}✗${NC} Python bulunamadı! Lütfen Python 3.10+ yükleyin."
    echo "   İndir: https://www.python.org/downloads/"
    exit 1
fi

# Node.js kontrolü
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js yüklü: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js bulunamadı! Lütfen Node.js 16+ yükleyin."
    echo "   İndir: https://nodejs.org/"
    exit 1
fi

# Yarn kontrolü
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    echo -e "${GREEN}✓${NC} Yarn yüklü: $YARN_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Yarn bulunamadı. Yükleniyor..."
    npm install -g yarn
fi

# MongoDB kontrolü
if command -v mongosh &> /dev/null || command -v mongo &> /dev/null; then
    echo -e "${GREEN}✓${NC} MongoDB CLI yüklü"
else
    echo -e "${YELLOW}⚠${NC} MongoDB CLI bulunamadı"
    echo "   MongoDB'nin çalıştığından emin olun: mongodb://localhost:27017"
fi

echo ""
echo "================================================"
echo "🔧 Backend Kurulumu Başlıyor..."
echo "================================================"

cd backend || exit

# Virtual environment oluştur
echo "📦 Virtual environment oluşturuluyor..."
$PYTHON_CMD -m venv venv

# Virtual environment'ı aktive et
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Paketleri yükle
echo "📥 Python paketleri yükleniyor..."
pip install -r requirements.txt --quiet

# .env dosyası oluştur
if [ ! -f .env ]; then
    echo "📝 .env dosyası oluşturuluyor..."
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=distribution_db
SECRET_KEY=$(openssl rand -hex 32)
HOST=0.0.0.0
PORT=8001
EOF
    echo -e "${GREEN}✓${NC} .env dosyası oluşturuldu"
else
    echo -e "${YELLOW}⚠${NC} .env dosyası zaten mevcut"
fi

# Demo verileri oluştur
echo "🌱 Demo verileri oluşturuluyor..."
$PYTHON_CMD seed_data.py
$PYTHON_CMD seed_sales_agents_data.py
$PYTHON_CMD seed_20_products_orders.py

cd ..

echo ""
echo "================================================"
echo "🎨 Frontend Kurulumu Başlıyor..."
echo "================================================"

cd frontend || exit

# Paketleri yükle
echo "📥 Node.js paketleri yükleniyor..."
yarn install

# .env dosyası oluştur
if [ ! -f .env ]; then
    echo "📝 .env dosyası oluşturuluyor..."
    echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
    echo -e "${GREEN}✓${NC} .env dosyası oluşturuldu"
else
    echo -e "${YELLOW}⚠${NC} .env dosyası zaten mevcut"
fi

cd ..

echo ""
echo "================================================"
echo "✅ KURULUM TAMAMLANDI!"
echo "================================================"
echo ""
echo "🚀 Projeyi başlatmak için:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend"
echo "  source venv/bin/activate  # macOS/Linux"
echo "  venv\\Scripts\\activate     # Windows"
echo "  uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend"
echo "  yarn start"
echo ""
echo "================================================"
echo "🔐 Demo Hesaplar:"
echo "================================================"
echo "  Admin:              admin / admin123"
echo "  Plasiyer:           plasiyer1 / plasiyer123"
echo "  Müşteri:            musteri1 / musteri123"
echo "  Satış Temsilcisi:   satistemsilcisi / satis123"
echo ""
echo "🌐 URL'ler:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8001"
echo "  API Docs: http://localhost:8001/docs"
echo ""
echo "================================================"
