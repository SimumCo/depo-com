# ŞEFTALİ Dağıtım Yönetim Sistemi PRD

## Son Güncelleme: 26 Şubat 2026

## Proje Özeti
Yoğurt/ayran dağıtımı yapan bir firmada müşterilerin tüketimini teslimat bazlı hesaplayan ve rota gününe göre sipariş taslağı oluşturan **deterministik** bir sistem.

---

## ✅ TAMAMLANAN - Tüm Fazlar (26 Şubat 2026)

### 1. Draft Engine 2.0 - Model B Implicit Consumption ✅
| Bileşen | Durum |
|---------|-------|
| Interval Rate Calculation | ✅ `daily_rate = prev_qty / days_between` |
| SMA-8 Rate (rate_mt) | ✅ Son 8 interval ortalaması |
| Weekly Multiplier | ✅ Depot×Segment×Product (0.7-1.8) |
| Maturity Modes | ✅ FIRST-TIME, YOUNG, MATURE |
| Passivation (K=3) | ✅ Beklenen tükenme × 3 kuralı |
| Need Qty Calculation | ✅ `rate_used × days_to_next_route` |
| Delta Roll-up | ✅ Incremental güncelleme |
| Working Copy | ✅ Teslimat sonrası auto-delete |
| Idempotency | ✅ Event duplicate kontrolü |

### 2. Veri Migrasyonu ✅
- sf_ → de_ koleksiyonlarına migrasyon tamamlandı
- 208 teslimat, 1876 customer_product_state

### 3. Cron Job Konfigürasyonu ✅
```
/app/backend/config/cron/seftali-draft-engine
- multipliers: Her Pazartesi 00:00
- passivation: Her gün 01:00  
- cleanup: Her gün 02:00
- daily_totals: Her gün 03:00
```

### 4. Kampanya "Siparişe Ekle" ✅
- `POST /api/seftali/sales/campaigns/add-to-order`
- Discount ve Gift kampanya türleri desteklenir
- Müşteri working_copy'ye ürün ekleme
- Frontend'de müşteri seçim modal'ı

### 5. Mesajlar Sekmesi ✅
- Simüle edilmiş mesaj geçmişi
- Gelen/giden mesaj görünümü
- Mesaj gönderme arayüzü
- Timestamp formatting

---

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (motor async)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Auth:** JWT with role-based access

## Koleksiyonlar
### Draft Engine (de_ prefix)
- `de_customers`, `de_products`, `de_routes`
- `de_deliveries`, `de_delivery_items`
- `de_customer_product_state` (ANA STATE)
- `de_interval_ledger`
- `de_weekly_product_multipliers`
- `de_depot_segment_product_daily_totals`
- `de_sales_rep_draft_totals`, `de_depot_draft_totals`, `de_production_draft_totals`
- `de_working_copies`, `de_processed_events`

### ŞEFTALİ (sf_ prefix)
- `sf_customers`, `sf_products`
- `sf_deliveries`, `sf_orders`
- `sf_campaigns`, `sf_working_copies`

## API Endpoints
### Draft Engine (/api/draft-engine/)
- Setup: indexes, seed, run-multiplier-batch
- Deliveries: create, list
- Customer Draft: draft, state
- Sales Rep: draft, customers
- Depot: draft
- Working Copy: CRUD
- Rollup: sales-rep, depot, production

### ŞEFTALİ Sales (/api/seftali/sales/)
- customers, deliveries, orders
- warehouse-draft
- campaigns, campaigns/add-to-order ✅ (YENİ)

## Demo Kullanıcılar
- Müşteri: `sf_musteri` / `musteri123`
- Plasiyer: `sf_plasiyer` / `plasiyer123`
- Admin: `admin` / `admin123`

---

## Formüller
```python
# Interval Rate (Model B)
daily_rate_interval = prev_qty / days_between

# SMA-8 Rate
rate_mt = avg(last 8 interval_rates)

# Weekly Multiplier
multiplier = clamp(week_avg / baseline_avg, 0.7, 1.8)

# Final Rate
rate_used = rate_mt × multiplier

# Need Qty
need_qty = rate_used × days_to_next_route

# Passivation (K=3)
if days_since > (last_qty / rate_used) × 3:
    is_active = false
```

## Maturity Modes
| Mode | Condition | Behavior |
|------|-----------|----------|
| FIRST-TIME | delivery_count ≤ 1 | No draft |
| YOUNG | 2+ deliveries, <8 intervals | Compute rate_mt |
| MATURE | ≥8 intervals AND ≥365 days | Full SMA-8 |

---

## Backlog

### P1 - Önemli
- [ ] Real SMS/WhatsApp entegrasyonu (şu an simüle)
- [ ] Admin raporlama dashboard

### P2 - İyileştirme
- [ ] Analizler modülü
- [ ] Bildirim sistemi
- [ ] Batch job monitoring UI

### P3 - Refactoring
- [ ] PlasiyerDashboard component extraction
- [ ] AdminDashboard component extraction

---

## Dosya Yapısı
```
/app/backend/
├── services/draft_engine/
│   ├── __init__.py
│   ├── constants.py
│   ├── helpers.py
│   ├── formulas.py
│   ├── state_manager.py
│   ├── multiplier_service.py
│   ├── draft_calculator.py
│   ├── event_processor.py
│   ├── rollup_service.py
│   └── db_setup.py
├── routes/
│   ├── draft_engine_routes.py
│   └── seftali/
│       ├── sales_routes.py (campaigns/add-to-order eklendi)
│       └── admin_routes.py
├── scripts/
│   ├── migrate_to_draft_engine.py
│   └── batch_jobs.py
└── config/cron/
    └── seftali-draft-engine

/app/frontend/src/
├── components/plasiyer/
│   ├── DraftEnginePage.js (YENİ)
│   ├── CustomerCard.js (MessagesTab eklendi)
│   └── ...
├── services/
│   ├── seftaliApi.js (addCampaignToOrder eklendi)
│   └── draftEngineApi.js (YENİ)
└── pages/
    └── PlasiyerDashboard.js (CampaignsPage güncellendi)
```
