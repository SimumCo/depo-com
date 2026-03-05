# ŞEFTALİ Dağıtım Yönetim Sistemi PRD

## Son Güncelleme: 26 Şubat 2026

## Proje Özeti
Yoğurt/ayran dağıtımı yapan bir firmada müşterilerin tüketimini teslimat bazlı hesaplayan ve rota gününe göre sipariş taslağı oluşturan **deterministik** bir sistem.

---

## ✅ SON GÜNCELLEME - REFACTORING TAMAMLANDI (26 Şubat 2026)

### Yapılan Değişiklikler

#### Backend OOP Refactoring
- ✅ Tüm iş mantığı `/app/backend/services/seftali/` altında service sınıflarına taşındı
- ✅ `core.py`: Ortak sabitler, yardımcı fonksiyonlar
- ✅ `draft_engine.py`: Draft Engine 2.0 hesaplamaları
- ✅ `order_service.py`: Plasiyer sipariş hesaplama servisi
- ✅ Route dosyaları basitleştirildi (controller görevi)

#### Route Order Endpoint Düzeltmesi
- ✅ `GET /api/seftali/sales/route-order/{route_day}` endpoint'i eklendi
- ✅ Koli yuvarlama çalışıyor

#### Frontend Component Düzeltmeleri
- ✅ Eksik placeholder component'ler oluşturuldu:
  - CustomerManagement.js
  - AllCustomersConsumption.js  
  - BulkImport.js
  - CustomerForm.js
  - InventoryView.js
  - IncomingShipments.js

---

## What's Been Implemented (Latest Update: Aralık 2025)

### Plasiyer Panel - Sidebar Menu Refactoring
- **"Depo Taslağı" tab renamed to "Akıllı Sipariş"**
- **Old empty "Akıllı Sipariş" (draft-engine) tab removed**
- **New "Akıllı Sipariş" page redesigned** according to user's visual requirements:
  - 3 stat boxes: Rut Müşterisi, Sipariş Veren, Taslaktan
  - "Sipariş kesim saati geçti!" warning banner
  - "Müşteri Siparişleri & Taslaklar" section with product list
  - "+ Ürün ekle" button
  - "Nasıl Çalışır?" info box
  - Dropdown for "tahmini ihtiyaç" per product

---

## Çalışan Dashboard'lar
- ✅ **Plasiyer Dashboard**: Ana sayfa, Müşteriler, Rota Siparişi, Teslimatlar
- ✅ **Customer Dashboard**: Ana sayfa, Sipariş, Teslimat Onayı, Analizler
- ✅ **Admin Dashboard**: Genel Bakış, Kampanyalar, Müşteriler, Teslimatar

---

## API Endpoints

### Ana Endpoint'ler
- `POST /api/auth/login` - Giriş
- `GET /api/seftali/customer/draft` - Müşteri taslak siparişi (Draft Engine 2.0)
- `GET /api/seftali/sales/customers` - Plasiyer müşteri listesi
- `GET /api/seftali/sales/route-order/{route_day}` - Plasiyer rota siparişi hesaplama
- `GET /api/seftali/admin/health/summary` - Admin özet istatistikler
- `GET/POST /api/seftali/admin/settings` - Sistem ayarları

---

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB
- **Frontend:** React, Tailwind CSS, Shadcn/UI

## Demo Kullanıcılar
- Müşteri: `sf_musteri` / `musteri123`
- Plasiyer: `sf_plasiyer` / `plasiyer123`
- Admin: `admin` / `admin123`

---

## P0 - Tamamlandı ✅
- [x] Draft Engine 2.0 entegrasyonu
- [x] Plasiyer Rota Siparişi hesaplama
- [x] OOP Refactoring
- [x] Frontend stabilizasyonu
- [x] Component'ler İşlevsel Hale Getirildi:
  - CustomerManagement: Müşteri listesi, arama, detay görünümü
  - AllCustomersConsumption: Sarfiyat analizi
  - BulkImport: Excel veri girişi UI
  - CustomerForm: Yeni müşteri ekleme formu
  - InventoryView: Envanter durumu, stok seviyeleri
  - IncomingShipments: Gelen sevkiyat takibi

## P1 - Yaklaşan Görevler
- [ ] Cutoff Time Trigger'ı supervisor ile yapılandır
- [ ] Admin Ayarları UI sayfası oluştur
- [ ] Haftalık çarpan batch job'ını aktive et

## P2 - Gelecek Görevler
- [ ] "Sipariş Gönder" butonu (Rota Siparişi)
- [ ] Plasiyer stok defteri/raporlama
- [ ] Admin raporları ve analizler sayfaları
- [ ] Bildirim sistemi

## P3 - Backlog
- [ ] Real SMS/WhatsApp entegrasyonu
- [ ] Mobile responsive iyileştirmeler
- [ ] Multi-tenant desteği
