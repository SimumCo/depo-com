# ŞEFTALİ Dağıtım Yönetim Sistemi PRD

## Son Güncelleme: 26 Şubat 2026

## Proje Özeti
Yoğurt/ayran dağıtımı yapan bir firmada müşterilerin tüketimini teslimat bazlı hesaplayan ve rota gününe göre sipariş taslağı oluşturan **deterministik** bir sistem.

---

## ✅ TAMAMLANAN - Draft Engine 2.0 (26 Şubat 2026)

### Model B - Implicit Consumption Estimation
Tam spesifikasyona uygun deterministik tüketim tahmin sistemi implemente edildi:

| Bileşen | Durum | Açıklama |
|---------|-------|----------|
| **Interval Rate Calculation** | ✅ | `daily_rate = prev_qty / days_between` |
| **SMA-8 Rate (rate_mt)** | ✅ | Son 8 interval'in basit ortalaması |
| **Weekly Multiplier** | ✅ | Depot×Segment×Product haftalık çarpan (0.7-1.8) |
| **Maturity Modes** | ✅ | FIRST-TIME, YOUNG, MATURE (3 seviye) |
| **Passivation (K=3)** | ✅ | Beklenen tükenme × 3 kuralı |
| **Need Qty Calculation** | ✅ | `need_qty = rate_used × days_to_next_route` |
| **Delta Roll-up** | ✅ | Incremental güncelleme (no full scan) |
| **Working Copy** | ✅ | Teslimat sonrası auto-delete |
| **Idempotency** | ✅ | Event duplicate kontrolü |

### Yeni Koleksiyonlar (de_ prefix)
- `de_customers` - Müşteri master data (depot_id, segment_id, sales_rep_id)
- `de_products` - Ürün bilgileri (shelf_life_days, box_size)
- `de_routes` - Rut takvimi (weekdays[], effective_from/to)
- `de_deliveries` - Teslimat başlıkları
- `de_delivery_items` - Teslimat kalemleri
- `de_customer_product_state` - **ANA STATE TABLOSU** (rate_mt, need_qty, interval_rates)
- `de_interval_ledger` - Interval geçmişi
- `de_weekly_product_multipliers` - Haftalık çarpanlar
- `de_depot_segment_product_daily_totals` - Günlük toplamlar
- `de_sales_rep_draft_totals` - Plasiyer rollup
- `de_depot_draft_totals` - Depo rollup
- `de_production_draft_totals` - Üretim rollup
- `de_working_copies` - Kullanıcı düzenlemeleri
- `de_processed_events` - Idempotency

### API Endpoints (/api/draft-engine/)
- `POST /setup/indexes` - Index oluşturma
- `POST /setup/seed` - Demo veri
- `POST /setup/run-multiplier-batch` - Çarpan batch job
- `POST /deliveries` - Teslimat oluştur + state güncelle
- `GET /deliveries` - Teslimat listesi
- `GET /customers/{id}/draft` - Müşteri draft
- `GET /customers/{id}/state` - Müşteri product states
- `GET /sales-rep/draft` - Plasiyer draft (aggregate)
- `GET /sales-rep/customers` - Plasiyer müşterileri
- `GET /depot/{id}/draft` - Depo draft
- `POST/GET/PATCH/DELETE /customers/{id}/working-copy` - Working copy CRUD
- `GET /products` - Ürün listesi
- `GET /multipliers` - Çarpanlar
- `GET /rollup/sales-rep/{id}` - Plasiyer rollup
- `GET /rollup/depot/{id}` - Depo rollup
- `GET /rollup/production` - Üretim rollup

### Batch Jobs
- `/app/backend/scripts/batch_jobs.py`
  - `--job=multipliers` - Haftalık çarpan hesaplama (Her Pazartesi 00:00)
  - `--job=passivation` - K=3 pasifleştirme kontrolü (Her gün 01:00)
  - `--job=cleanup` - Rollup temizliği (Her gün 02:00)
  - `--job=daily_totals` - Günlük toplamlar güncelleme

### Veri Migrasyonu
- `/app/backend/scripts/migrate_to_draft_engine.py`
- sf_ koleksiyonlarından de_ koleksiyonlarına migrasyon tamamlandı
- 208 teslimat, 1876 customer_product_state oluşturuldu

### Frontend
- `DraftEnginePage.js` - Akıllı Sipariş sayfası
- `draftEngineApi.js` - API service
- PlasiyerDashboard'a "Akıllı Sipariş" sekmesi eklendi

---

## Önceki Tamamlanan Özellikler

### Plasiyer Müşteri Yönetimi (23 Şubat 2026)
- [x] Müşteri kartları data-rich görünüm
- [x] Mobil uyumlu tabbed modal (Bilgiler, Tüketim, Teslimatlar, Mesajlar)
- [x] Müşteri düzenleme formu

### Kampanya Sistemi (23 Şubat 2026)
- [x] İki kampanya türü: Miktar İndirimi, Hediyeli
- [x] Admin kampanya yönetimi
- [x] Plasiyer kampanya görüntüleme

### Depo Sipariş Taslağı (23 Şubat 2026)
- [x] Eski warehouse draft (sf_ tabanlı)
- [x] Koli yuvarlaması
- [x] Müşteri detayları

---

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (motor async driver)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Auth:** JWT with role-based access
- **DB:** MongoDB with de_ prefixed collections (Draft Engine)

## Demo Kullanıcılar
- Müşteri: `sf_musteri` / `musteri123`
- Plasiyer: `sf_plasiyer` / `plasiyer123`
- Admin: `admin` / `admin123`

---

## Backlog / Gelecek Görevler

### P0 - Kritik
- [ ] Frontend preview testi (UI doğrulama)
- [ ] Gerçek teslimat akışı testi

### P1 - Önemli
- [ ] Cron job kurulumu (sistemd/crontab)
- [ ] Kampanya "Siparişe Ekle" fonksiyonu
- [ ] Mesajlar sekmesi implementasyonu
- [ ] Admin kampanya formu iyileştirme

### P2 - İyileştirme
- [ ] Analizler modülü
- [ ] Bildirim sistemi
- [ ] Admin raporlama

---

## Formüller Özeti

```
# Model B - Interval Rate
daily_rate_interval = prev_qty / days_between

# SMA-8 Rate
rate_mt = avg(last 8 interval_rates)

# Weekly Multiplier
multiplier = clamp(week_avg / baseline_avg, 0.7, 1.8)

# Final Rate
rate_used = rate_mt × multiplier

# Need Qty (Draft)
need_qty = rate_used × days_to_next_route

# Passivation (K=3)
if days_since_last > (last_qty / rate_used) × 3:
    is_active = false
```

## Maturity Modes
| Mode | Condition | Behavior |
|------|-----------|----------|
| MODE 1 (FIRST-TIME) | delivery_count ≤ 1 | No rate, no draft |
| MODE 2 (YOUNG) | 2+ deliveries, <8 intervals or <365 days | Compute rate_mt |
| MODE 3 (MATURE) | ≥8 intervals AND ≥365 days | Full SMA-8 |
