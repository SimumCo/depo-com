# ŞEFTALİ - Dagitim Yonetim Sistemi PRD

## Son Guncelleme: 18 Subat 2026

## Proje Ozeti
Yogurt/ayran dagitimı yapan bir firmada musterilerin tuketimini delivery bazli hesaplayan ve rota gunune gore siparis taslagi olusturan deterministik bir sistem.

## Tamamlanan Ozellikler
- [x] Temel sistem yapisi (Backend + Frontend + DB)
- [x] MODEL B tuketim hesaplama
- [x] Gunluk tuketim hesaplama ve sf_daily_consumption koleksiyonu
- [x] 25 maddelik PRD implementasyonu (42 test senaryosu %100 basarili)
- [x] Musteri dashboard yeniden tasarimi
- [x] Urunler sayfasi
- [x] Taslak siralaması (tuketim miktarina gore)
- [x] Onerilen miktar formulu duzeltmesi
- [x] Siparis son teslim geri sayim sayaci
- [x] **Siparis sayfasi yeniden tasarimi (18 Subat 2026)**
  - "Taslak" sekme adi "Siparis" olarak degistirildi
  - Yeni tasarim: Urun kartları + Siparis Ozeti paneli
  - Filtre sekmeleri, arama, miktar kontrolleri
  - Geri sayim sayaci entegrasyonu
- [x] **Seftali Plasiyer paneline normal Plasiyer sekmeleri eklendi (19 Subat 2026)**
  - Ana sayfada hem Seftali hem normal plasiyer istatistikleri
  - "Daha Fazla" menusunde: Rotalarim, Musterilerim, Eski Siparisler, Urun Katalogu
  - Quick access butonlari ana sayfada
  - Musteri listesi Seftali ve Rota musterilerini birlikte gosteriyor
- [x] **Seftali Plasiyer paneli tamamen yeniden tasarlandi (19 Subat 2026)**
  - Mockup'a uygun sol sidebar navigasyon (Ana Sayfa, Musteriler, Rut, Siparisler, Teslimatlar, Teslimat Olustur, Analizler, Iade Talepleri)
  - "Rota" yerine "Rut" terminolojisi kullanildi
  - Ozet kartlari: Toplam Satislar, Bekleyen Siparisler, Onerilen Siparisler, Iade Talepleri
  - Musteri kartlari: Firma adi, SFT kodu, kanal tipi, son siparis bilgisi, "Uyar" ve "Gorusme Baslat" butonlari
  - **Rut sayfasi:** Sadece o gunun teslimat noktalari, numara siralı, "Ara" ve "Yol Tarifi" butonlari
  - Seftali musteri arayuzuyle tutarli modern tasarim
- [x] **Seftali Tasarim Sistemi olusturuldu (19 Subat 2026)**
  - `SeftaliDesignSystem.js` ortak bilesen kutuphanesi
  - Musteri ve Plasiyer arayuzleri ayni tasarim sablonuna gore guncellendi
  - Ortak bilesenler: SeftaliSidebar, SeftaliHeader, SeftaliStatCard, SeftaliInfoCard, SeftaliButton, SeftaliEmptyState, SeftaliLoading, SeftaliBadge, SeftaliBottomNav
  - Gradient paleti: blue, green, amber, orange, red, sky, purple
  - Responsive tasarim: Desktop (sidebar) + Mobile (bottom nav)
  - Tutarli tipografi, spacing ve renk kullanimi

## Temel Felsefe
- Sistem deterministiktir (AI yok, otomatik siparis yok)
- Tuketim sadece delivery accepted ile guncellenir
- Stock declaration base tuketimi degistirmez
- Sistem sade kalmalidir

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (motor async driver)
- **Frontend:** React, Tailwind CSS
- **Auth:** JWT with role-based access
- **DB:** MongoDB with sf_ prefixed collections

## Roller
1. **Customer** (mobil oncelikli) - siparis taslagi, teslimat onayi, stok bildirimi, sapma yonetimi
2. **Salesperson** (sales_rep/sales_agent - tablet) - teslimat olusturma, siparis onaylama
3. **Admin** (desktop, salt okunur) - metrikler, sapma listesi

## Tuketim Modeli (MODEL B)
```
consumed = previous_delivery_qty
daily_avg_base = previous_delivery_qty / days_between_deliveries
```
- Yeni delivery qty tuketim hesabina girmez, yeni referans olur
- Delivery accepted -> tum hesap pipeline calisir
- Delivery rejected -> yok sayilir

## Spike Kurali
- spike_ratio >= 3 ise major spike
- Spike son 7 gun icinde ise draft'ta avg_effective=spike kullanilir
- Base daily_avg degismez
- Delivery accepted gelince spike resetlenir

## DB Koleksiyonlari
1. sf_customers - Musteri ve rota plani
2. sf_products - Urun katalogu
3. sf_deliveries - Teslimatlar (pending/accepted/rejected)
4. sf_stock_declarations - Stok beyanlari
5. sf_consumption_stats - Tuketim istatistikleri (musteri+urun bazinda tek kayit)
6. sf_system_drafts - Otomatik taslaklar (musteri basina tek)
7. sf_working_copies - Calisma kopyalari
8. sf_orders - Siparisler
9. sf_variance_events - Tuketim sapma olaylari
10. sf_audit_events - Denetim olaylari

## API Endpointleri
### Customer (/api/seftali/customer/)
- GET /draft, POST /working-copy/start, PATCH /working-copy/:id
- POST /working-copy/:id/items, POST /working-copy/:id/submit
- GET /deliveries/pending, POST /deliveries/:id/accept, POST /deliveries/:id/reject
- POST /stock-declarations
- GET /variance/pending, POST /variance/apply-reason-bulk, POST /variance/dismiss-bulk
- GET /products, GET /profile

### Sales (/api/seftali/sales/)
- POST /deliveries, GET /deliveries, GET /orders
- POST /orders/:id/approve, POST /orders/:id/request-edit
- GET /customers, GET /products

### Admin (/api/seftali/admin/)
- GET /health/summary, GET /variance, GET /deliveries

## Tamamlanan Ozellikler (18 Subat 2026)
- [x] Backend servisleri (ConsumptionService, DraftService, VarianceService)
- [x] 19 API endpoint (Customer: 14, Sales: 7, Admin: 3)
- [x] Atomic pipeline'lar (delivery accept, stock declaration)
- [x] Seed data (demo kullanicilar, urunler, teslimatlar)
- [x] MongoDB indexleri
- [x] Customer Dashboard (mobil-first, bottom nav, 5 sekme)
- [x] Sales Dashboard (teslimat olusturma, siparis yonetimi)
- [x] Admin Dashboard (metrikler, sapma tablosu)
- [x] Edge-case validasyonlar (idempotency, qty kontrolleri)
- [x] Turkce hata mesajlari
- [x] %100 backend + frontend test basarisi
- [x] 7 PDF fatura isleme (AILEM MARKET)
- [x] UI birlestirme (eski modulleri yeni arayuze ekleme)
- [x] Gecmis faturalar sekmesi (Faturalar tab)
- [x] Excel tuketim verisi aktarimi (208 teslimat, 9 urun, 2024-2025)

## Excel Import Detaylari (18 Subat 2026)
- Dosya: haftalik_tuketim_dataseti_urun_adli.xlsx
- Musteri: AILEM MARKET (32032404952)
- 208 benzersiz tarih (2024-01-01 - 2025-12-25)
- 9 urun: 200 ML AYRAN, 1000 ml AYRAN, 2000 ml AYRAN, 180 ml KAKAOLU SUT 6LI, 180 ml CILEKLI SUT 6LI, 180 ml YAGLI SUT 6LI, 750 GR T.YAGLI YOGURT, 500 GR T.YAGLI YOGURT, 600 GR KASAR PEYNIRI
- Script: backend/import_excel_consumption.py
- Tuketim istatistikleri MODEL B ile hesaplandi

## Demo Kullanicilar
- Musteri: sf_musteri / musteri123
- Musteri 2: sf_musteri2 / musteri123
- Satici: sf_satici / satici123
- Plasiyer: sf_plasiyer / plasiyer123
- Admin: admin / admin123

## Backlog / Gelecek Gorevler
- [ ] P1: Bakim Teknisyeni Dashboard frontend (7 modul)
- [ ] P2: README ve API dokumantasyonu
- [ ] P2: Integration testleri (Jest/pytest)
- [ ] P3: Refactoring: maintenance_routes.py dosyasini bolme
- [ ] P3: Production notlari (replica set, transaction desteigi)

## Test Suite (18 Subat 2026)
- Test dosyasi: backend/tests/test_seftali_rules.py
- 42 test, tum kurallar R1-R25 dogrulanmistir
- Calistirma: cd /app/backend && python tests/test_seftali_rules.py
- T1: Ilk delivery accepted -> base.avg=0, draft olusur
- T2: Ikinci delivery -> MODEL B (prev_qty/days)
- T3: Stock S > D_last -> spike yok, base degismez
- T4: Spike detection (ratio>=3) + variance
- T5: Working copy deleted_by_delivery
- T6: Idempotent accept (409)
- T7: Order -> tuketim degismez
- T8: Bulk variance reason -> recorded

## Backend Kod Duzetmeleri (18 Subat 2026)
- EPSILON: 0.001 -> 1e-6 (spec uyumu)
- Spike hesabi: base_avg=0 iken de epsilon ile hesaplama (R10)
- Draft siralama: risk -> estimated_finish_at -> product_id (R19)
