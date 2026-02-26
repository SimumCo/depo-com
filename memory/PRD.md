# ŞEFTALİ Dağıtım Yönetim Sistemi PRD

## Son Güncelleme: 26 Şubat 2026

## Proje Özeti
Yoğurt/ayran dağıtımı yapan bir firmada müşterilerin tüketimini teslimat bazlı hesaplayan ve rota gününe göre sipariş taslağı oluşturan **deterministik** bir sistem.

---

## ✅ TÜM FAZLAR TAMAMLANDI (26 Şubat 2026)

### 1. Draft Engine 2.0 - Model B Implicit Consumption ✅
- Interval Rate, SMA-8, Weekly Multiplier, Maturity Modes, K=3 Passivation
- 15 yeni koleksiyon (de_ prefix)
- 15+ API endpoint
- Veri migrasyonu tamamlandı (208 teslimat, 1876 state)

### 2. Cron Job Konfigürasyonu ✅
- `/app/backend/config/cron/seftali-draft-engine`
- multipliers, passivation, cleanup, daily_totals

### 3. Kampanya "Siparişe Ekle" ✅
- `POST /api/seftali/sales/campaigns/add-to-order`
- Müşteri seçim modal'ı

### 4. Mesajlar Sekmesi ✅
- Simüle edilmiş mesaj geçmişi
- Mesaj gönderme arayüzü

### 5. Admin Raporlama Dashboard ✅
- Genel Bakış, Teslimat Analizi, Ürün Performansı, Trendler
- Tarih filtreleme (7d, 30d, 90d)
- Görsel grafikler ve metrikler

### 6. Component Refactoring ✅
- `StockPage.js` → `/components/plasiyer/`
- `CampaignsPage.js` → `/components/plasiyer/`
- `ReportsPage.js` → `/components/admin/`
- PlasiyerDashboard: 1010 → 517 satır

---

## Dosya Yapısı (Refactored)
```
/app/frontend/src/
├── components/
│   ├── admin/
│   │   └── ReportsPage.js ✅ (YENİ)
│   ├── plasiyer/
│   │   ├── CustomerCard.js (MessagesTab eklendi)
│   │   ├── DraftEnginePage.js ✅
│   │   ├── StockPage.js ✅ (EXTRACTED)
│   │   ├── CampaignsPage.js ✅ (EXTRACTED)
│   │   ├── OrdersPage.js
│   │   ├── RutPage.js
│   │   └── WarehouseDraftPage.js
│   └── ui/
├── pages/
│   ├── AdminDashboard.js (ReportsPage import)
│   └── PlasiyerDashboard.js (517 satır - cleaned)
└── services/
    ├── seftaliApi.js
    └── draftEngineApi.js

/app/backend/
├── services/draft_engine/ (Core Engine)
├── routes/
│   ├── draft_engine_routes.py
│   └── seftali/
├── scripts/
│   ├── migrate_to_draft_engine.py
│   └── batch_jobs.py
└── config/cron/
    └── seftali-draft-engine
```

---

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (motor async)
- **Frontend:** React, Tailwind CSS, Shadcn/UI

## Demo Kullanıcılar
- Müşteri: `sf_musteri` / `musteri123`
- Plasiyer: `sf_plasiyer` / `plasiyer123`
- Admin: `admin` / `admin123`

---

## Backlog (Gelecek)

### P1
- [ ] Real SMS/WhatsApp entegrasyonu

### P2
- [ ] Bildirim sistemi
- [ ] Batch job monitoring UI
- [ ] Mobile responsive iyileştirmeler

### P3
- [ ] Multi-tenant desteği
- [ ] Export/Import özelliği
