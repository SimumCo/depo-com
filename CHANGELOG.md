# Changelog

Projedeki tüm önemli değişiklikler bu dosyada dokümante edilmektedir.

## [2.0.0] - 2025-01-18

### ✨ Yeni Özellikler

#### Fatura Yönetimi
- **HTML E-Fatura Yükleme**: SED ve EE formatı otomatik parsing desteği
- **Manuel Fatura Girişi**: Kullanıcı dostu form ile fatura oluşturma
- **Otomatik Müşteri Bulma**: Vergi numarası ile müşteri arama ve otomatik doldurma
- **Otomatik Müşteri Oluşturma**: Yeni müşteri otomatik kayıt (kullanıcı adı + şifre)
- **Otomatik Ürün Oluşturma**: Yeni ürünler kategori ile otomatik kayıt
- **Genişletilmiş Ürün Kategorileri**: 12 kategori (Yoğurt, Ayran, Peynir, Kaşar, Tereyağı, Krema, Süt, Kefir, Labne, Lor, Süt Ürünleri, Diğer)

#### Backend Architecture (OOP Refactoring)
- **Repository Pattern**: Database operations için ayrı katman
  - `BaseRepository`: Generic CRUD operations
  - `CustomerRepository`: Müşteri DB işlemleri
  - `InvoiceRepository`: Fatura DB işlemleri
  - `ProductRepository`: Ürün DB işlemleri
- **Service Layer**: Business logic için ayrı katman
  - `CustomerService`: Müşteri iş mantığı
  - `InvoiceService`: Fatura iş mantığı ve HTML parsing
- **Separation of Concerns**: Route/Service/Repository katmanları
- **Kod Kalitesi**: %40 kod azaltma, daha okunabilir yapı

#### Developer Experience
- **Database Seed Script**: Tek komutla veritabanı kurulumu (`python scripts/seed_database.py`)
- **Otomatik Kurulum**: `setup.bat` (Windows) ve `setup.sh` (Linux/macOS)
- **Improved Documentation**: Detaylı README ve QUICK_START rehberi
- **.env.example**: Örnek konfigürasyon dosyaları

### 🔧 İyileştirmeler

#### API Endpoints
- `POST /api/invoices/manual-entry` - Manuel fatura girişi
- `GET /api/customers/lookup/{tax_id}` - Vergi no ile müşteri arama
- `POST /api/invoices/upload` - HTML fatura yükleme (SED/EE formatı)

#### Frontend
- **InvoiceUpload Component**: SED formatı için optimize edilmiş parsing
- **ManualInvoiceEntry Component**: Müşteri otomatik bulma özelliği
- **AccountingDashboard**: "Manuel Fatura Gir" tab'ı eklendi
- **UserManagement**: Tüm roller dropdown'a eklendi (Admin, Muhasebe, Plasiyer, Müşteri)

#### Parsing Improvements
- Türkçe karakter desteği iyileştirildi
- SED fatura formatı için özel parsing algoritması
- customerIDTable, despatchTable, lineTable, budgetContainerTable parsing
- Müşteri adı, vergi no, fatura no, tarih, ürünler, toplam tutarlar doğru parse ediliyor

### 🐛 Düzeltmeler
- Password hashing sorunu düzeltildi (manuel oluşturulan müşteriler giriş yapabiliyor)
- Frontend CORS hatası düzeltildi (.env dosyası kontrolleri eklendi)
- Ürün miktarları doğru parse ediliyor (0.0 yerine gerçek değerler)
- Header satırları ürün olarak eklenmeme sorunu düzeltildi

### 📚 Dokümantasyon
- README.md tam güncellendi
  - Otomatik kurulum bölümü
  - Yaygın sorunlar ve çözümler
  - OOP prensipleri açıklaması
  - Güncel proje yapısı
- QUICK_START.md eklendi
- .env.example dosyaları eklendi
- setup.bat ve setup.sh scriptleri güncellendi

---

## [1.0.0] - 2024-12-XX

### İlk Sürüm
- Multi-role sistem (Admin, Plasiyer, Müşteri)
- Sipariş yönetimi
- Stok takibi
- Rota planlaması
- Excel toplu veri girişi
- Tüketim analizi (temel)

---

## Changelog Formatı

Bu proje [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) formatını takip eder.

### Versiyon Numaralandırma
[Semantic Versioning](https://semver.org/) kullanılır: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes
- **MINOR**: Yeni özellikler (geriye uyumlu)
- **PATCH**: Bug fix'ler (geriye uyumlu)
