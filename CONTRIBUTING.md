# 🤝 Katkıda Bulunma Rehberi

Dağıtım Yönetim Sistemi'ne katkıda bulunmak istediğiniz için teşekkür ederiz! Bu rehber, projeye nasıl katkı sağlayabileceğinizi açıklar.

---

## 📋 İçindekiler

1. [Geliştirme Ortamı Kurulumu](#geliştirme-ortamı-kurulumu)
2. [Kod Standartları](#kod-standartları)
3. [Commit Mesajları](#commit-mesajları)
4. [Pull Request Süreci](#pull-request-süreci)
5. [Test Yazma](#test-yazma)
6. [Dokümantasyon](#dokümantasyon)

---

## 🛠️ Geliştirme Ortamı Kurulumu

### 1. Fork ve Clone

```bash
# Repository'yi fork edin (GitHub web arayüzünden)
# Kendi fork'unuzu klonlayın
git clone https://github.com/YOUR_USERNAME/dagitim-yonetim-sistemi.git
cd dagitim-yonetim-sistemi

# Upstream repository'yi ekleyin
git remote add upstream https://github.com/ORIGINAL_OWNER/dagitim-yonetim-sistemi.git
```

### 2. Backend Kurulumu

```bash
cd backend

# Virtual environment oluşturun
python -m venv venv
source venv/bin/activate  # Linux/Mac
# veya
venv\Scripts\activate  # Windows

# Bağımlılıkları yükleyin
pip install -r requirements.txt

# .env dosyasını oluşturun
cp .env.example .env

# MongoDB'yi başlatın
# MongoDB Compass veya mongod daemon
```

### 3. Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükleyin (npm KULLANMAYIN!)
yarn install

# .env dosyasını oluşturun
cp .env.example .env
```

### 4. Veritabanı Seed

```bash
cd ..
python scripts/seed_database.py
cd backend
python seed_accounting_users.py
python seed_sales_agents_data.py
```

### 5. Servisleri Başlatın

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Terminal 2 - Frontend
cd frontend
yarn start
```

---

## 📝 Kod Standartları

### Python (Backend)

**Stil Kılavuzu:** PEP 8

```python
# ✅ İyi
def calculate_consumption(customer_id: str, period: str) -> dict:
    """
    Müşteri tüketimini hesaplar.
    
    Args:
        customer_id: Müşteri ID'si
        period: Dönem (daily, weekly, monthly)
        
    Returns:
        Tüketim verileri dictionary
    """
    consumption = {}
    # ...
    return consumption

# ❌ Kötü
def calc(c, p):
    cons = {}
    return cons
```

**Önemli Kurallar:**
- Type hints kullanın
- Docstring ekleyin
- Değişken isimleri açıklayıcı olsun
- Maximum line length: 100 karakter
- 4 space indentation

### JavaScript/React (Frontend)

**Stil Kılavuzu:** Airbnb JavaScript Style Guide

```javascript
// ✅ İyi
const CustomerList = ({ customers, onSelect }) => {
  const [selectedId, setSelectedId] = useState(null);
  
  const handleClick = useCallback((id) => {
    setSelectedId(id);
    onSelect(id);
  }, [onSelect]);
  
  return (
    <div className="customer-list">
      {customers.map(customer => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onClick={handleClick}
          isSelected={selectedId === customer.id}
        />
      ))}
    </div>
  );
};

// ❌ Kötü
function list(c, s) {
  return <div>{c.map(x => <div>{x.name}</div>)}</div>
}
```

**Önemli Kurallar:**
- Functional components kullanın
- Hooks kullanın (useState, useEffect, useCallback)
- PropTypes veya TypeScript
- Tailwind CSS sınıfları kullanın
- Bileşen isimleri PascalCase

---

## 💬 Commit Mesajları

### Format

```
<tip>(<scope>): <kısa açıklama>

<detaylı açıklama (opsiyonel)>

<footer (opsiyonel)>
```

### Commit Tipleri

- `feat`: Yeni özellik
- `fix`: Bug düzeltme
- `docs`: Dokümantasyon
- `style`: Kod formatı (logic değişikliği yok)
- `refactor`: Kod yeniden yapılandırma
- `test`: Test ekleme/düzeltme
- `chore`: Build/tool değişiklikleri

### Örnekler

```bash
# ✅ İyi
feat(invoice): HTML fatura yükleme özelliği eklendi

SED ve EE formatı destekleniyor.
Otomatik müşteri ve ürün oluşturma dahil.

Closes #123

# ✅ İyi
fix(auth): şifre sıfırlama token süresi düzeltildi

Token süresi 1 saat yerine 24 saat olarak güncellendi.

# ✅ İyi
docs(readme): kurulum adımları güncellendi

# ❌ Kötü
update stuff
# ❌ Kötü
fixed bug
# ❌ Kötü
made changes
```

---

## 🔀 Pull Request Süreci

### 1. Branch Oluşturma

```bash
# Upstream'den en son değişiklikleri alın
git fetch upstream
git checkout main
git merge upstream/main

# Yeni branch oluşturun
git checkout -b feature/invoice-upload
# veya
git checkout -b fix/login-bug
```

**Branch İsimlendirme:**
- `feature/feature-name` - Yeni özellik
- `fix/bug-description` - Bug düzeltme
- `docs/what-changed` - Dokümantasyon
- `refactor/what-refactored` - Refactoring

### 2. Değişiklik Yapma

```bash
# Değişikliklerinizi yapın
# ...

# Testleri çalıştırın
cd backend
pytest

cd ../frontend
yarn test

# Linting kontrol edin
cd backend
ruff check .

cd ../frontend
yarn lint
```

### 3. Commit ve Push

```bash
git add .
git commit -m "feat(invoice): HTML fatura yükleme eklendi"
git push origin feature/invoice-upload
```

### 4. Pull Request Oluşturma

GitHub web arayüzünde:

1. "New Pull Request" butonuna tıklayın
2. Base: `main`, Compare: `feature/invoice-upload`
3. PR şablonunu doldurun:

```markdown
## 📝 Açıklama
HTML fatura yükleme özelliği eklendi. SED ve EE formatları destekleniyor.

## 🔗 İlgili Issue
Closes #123

## 📸 Ekran Görüntüleri (varsa)
[Ekran görüntüleri buraya]

## ✅ Checklist
- [x] Kodda değişiklik yapıldı
- [x] Testler eklendi/güncellendi
- [x] Dokümantasyon güncellendi
- [x] Tüm testler geçiyor
- [x] Linting temiz

## 🧪 Test Edilen Senaryolar
- [x] HTML fatura yükleme
- [x] Otomatik müşteri oluşturma
- [x] Hatalı format kontrolü
```

### 5. Code Review

- Reviewers'ların yorumlarını bekleyin
- Gelen feedback'lere yanıt verin
- Gerekli değişiklikleri yapın
- Review sonrası merge edilecek

---

## 🧪 Test Yazma

### Backend Test (Pytest)

```python
# tests/test_invoice.py
import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_upload_invoice():
    """Fatura yükleme testi"""
    with open("test_data/sample_invoice.html", "rb") as f:
        response = client.post(
            "/api/invoices/upload",
            files={"file": ("invoice.html", f, "text/html")},
            headers={"Authorization": f"Bearer {get_test_token()}"}
        )
    
    assert response.status_code == 200
    assert "invoice_id" in response.json()

def test_invalid_invoice_format():
    """Geçersiz format testi"""
    response = client.post(
        "/api/invoices/upload",
        files={"file": ("invalid.txt", b"invalid", "text/plain")},
        headers={"Authorization": f"Bearer {get_test_token()}"}
    )
    
    assert response.status_code == 400
```

### Frontend Test (Jest + React Testing Library)

```javascript
// src/components/InvoiceUpload.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvoiceUpload from './InvoiceUpload';

describe('InvoiceUpload Component', () => {
  test('renders upload button', () => {
    render(<InvoiceUpload />);
    const button = screen.getByText(/Fatura Yükle/i);
    expect(button).toBeInTheDocument();
  });

  test('uploads file successfully', async () => {
    render(<InvoiceUpload />);
    
    const file = new File(['invoice'], 'invoice.html', { type: 'text/html' });
    const input = screen.getByLabelText(/Dosya Seç/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Başarılı/i)).toBeInTheDocument();
    });
  });
});
```

### Test Çalıştırma

```bash
# Backend
cd backend
pytest tests/ -v

# Frontend
cd frontend
yarn test

# Coverage raporu
cd backend
pytest --cov=. --cov-report=html

cd frontend
yarn test --coverage
```

---

## 📚 Dokümantasyon

### Kod Dokümantasyonu

**Python:**
```python
def calculate_delivery_route(
    sales_agent_id: str,
    delivery_date: str,
    optimize: bool = True
) -> dict:
    """
    Plasiyer için teslimat rotası hesaplar.
    
    Args:
        sales_agent_id: Plasiyerin benzersiz ID'si
        delivery_date: Teslimat tarihi (YYYY-MM-DD formatında)
        optimize: Rota optimizasyonu yapılsın mı? (varsayılan: True)
        
    Returns:
        dict: Rota bilgileri içeren dictionary
            {
                "route_id": str,
                "customers": List[dict],
                "total_distance": float,
                "estimated_time": int  # dakika cinsinden
            }
            
    Raises:
        ValueError: Geçersiz tarih formatı
        NotFoundError: Plasiyer bulunamadı
        
    Example:
        >>> route = calculate_delivery_route(
        ...     "agent_001",
        ...     "2024-11-15",
        ...     optimize=True
        ... )
        >>> print(route["total_distance"])
        45.6
    """
    pass
```

**JavaScript:**
```javascript
/**
 * Müşteri siparişi oluşturur
 * 
 * @param {Object} orderData - Sipariş verileri
 * @param {string} orderData.customerId - Müşteri ID
 * @param {Array<Object>} orderData.items - Sipariş ürünleri
 * @param {string} orderData.deliveryDate - Teslimat tarihi
 * @returns {Promise<Object>} Oluşturulan sipariş
 * @throws {Error} API hatası durumunda
 * 
 * @example
 * const order = await createOrder({
 *   customerId: "cust_123",
 *   items: [{ productId: "prod_1", quantity: 10 }],
 *   deliveryDate: "2024-11-15"
 * });
 */
async function createOrder(orderData) {
  // ...
}
```

### API Dokümantasyonu

Backend'de FastAPI otomatik dokümantasyon üretir:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

Yeni endpoint eklerken:
```python
@router.post("/orders", response_model=OrderResponse, status_code=201)
async def create_order(
    order: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Yeni sipariş oluşturur.
    
    - **customer_id**: Müşteri ID'si (zorunlu)
    - **items**: Sipariş kalemleri listesi (zorunlu)
    - **delivery_date**: Teslimat tarihi (opsiyonel)
    - **notes**: Sipariş notları (opsiyonel)
    
    Returns:
        Oluşturulan sipariş bilgileri
    """
    pass
```

---

## 🐛 Bug Raporlama

### Issue Şablonu

```markdown
**Bug Açıklaması**
Fatura yüklerken sistem donuyor.

**Adımlar (Tekrar Etmek İçin)**
1. Login olun (muhasebe hesabı)
2. Fatura Yönetimi > Fatura Yükle
3. 5MB'den büyük dosya seçin
4. Yükle butonuna tıklayın

**Beklenen Davranış**
Fatura yüklenmeli ve işlem tamamlanmalı.

**Gerçekleşen Davranış**
Sayfa donuyor ve timeout hatası veriyor.

**Ekran Görüntüleri**
[Ekran görüntüsü buraya]

**Ortam Bilgileri**
- OS: macOS 14.0
- Browser: Chrome 119
- Node: 18.16.0
- Python: 3.11.0

**Ek Notlar**
Küçük dosyalarda (< 1MB) sorun yok.
```

---

## ❓ Sık Sorulan Sorular

### Backend

**S: Python versiyonu neden 3.10+?**  
C: Type hints ve async/await özellikleri için.

**S: MongoDB'ye alternatif olabilir mi?**  
C: Şu an için hayır, sistem MongoDB'ye optimize edilmiş.

**S: Hangi Python paketleri kullanılıyor?**  
C: `requirements.txt` dosyasına bakın.

### Frontend

**S: Neden npm değil yarn?**  
C: Yarn daha hızlı ve güvenilir lock file mekanizması sunuyor.

**S: TypeScript'e geçecek miyiz?**  
C: Yol haritasında var, 2025 Q2 planlanıyor.

**S: Hangi UI kütüphanesi kullanılıyor?**  
C: Tailwind CSS + shadcn/ui komponenler.

---

## 📞 İletişim

### Yardım Almak İçin

1. **Dokümantasyon:** İlk olarak dokümantasyonu kontrol edin
2. **Issues:** Mevcut issue'lara bakın
3. **Discussions:** GitHub Discussions'da soru sorun
4. **Discord/Slack:** [Link eklenecek]

### Proje Sahipleri

- **Lead Developer:** [İsim] - [@github_username]
- **Backend Lead:** [İsim] - [@github_username]
- **Frontend Lead:** [İsim] - [@github_username]

---

## 📜 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

---

## 🙏 Teşekkürler

Projeye katkıda bulunan herkese teşekkür ederiz! 🎉

Katkıda bulunanların listesi için: [CONTRIBUTORS.md](./CONTRIBUTORS.md)

---

**Mutlu kodlamalar! 🚀**
