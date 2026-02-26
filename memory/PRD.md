# ŞEFTALİ Dağıtım Yönetim Sistemi PRD

## Son Güncelleme: 26 Şubat 2026

## Proje Özeti
Yoğurt/ayran dağıtımı yapan bir firmada müşterilerin tüketimini teslimat bazlı hesaplayan ve rota gününe göre sipariş taslağı oluşturan **deterministik** bir sistem.

---

## ✅ SON GÜNCELLEME (26 Şubat 2026)

### Müşteri Paneli İyileştirmeleri
1. **Kaldırılan Sekmeler:**
   - ❌ "Stok Bildirimi" sekmesi kaldırıldı
   - ❌ "Tüketim Sapmaları" sekmesi kaldırıldı

2. **Sipariş Sekmesi İyileştirmeleri:**
   - ✅ "Tahmini İhtiyaç" açıklaması eklendi: `rate×gün` tooltip
   - ✅ "Son Alış" miktarı eklendi: `last_delivery_qty`
   - Backend: `/api/seftali/customer/draft` son teslimat miktarını döndürüyor

3. **Analizler Sayfası:**
   - ✅ Günlük tüketim < 1 ise "1/2 gün", "1/3 gün" formatında gösterim
   - `formatDailyRate()` fonksiyonu eklendi

---

## Mevcut Sekmeler (Müşteri Paneli)
1. Ana Sayfa
2. Sipariş (Tahmini ihtiyaç + Son alış)
3. Teslimat Onayı
4. Faturalar
5. Analizler (Günlük tüketim formatlaması)
6. Kampanyalar
7. Favorilerim

---

## Önceki Tamamlanan Özellikler

### Draft Engine 2.0 ✅
- Model B Implicit Consumption
- SMA-8, Weekly Multiplier, Maturity Modes, K=3 Passivation

### Admin & Plasiyer ✅
- Raporlama Dashboard
- Kampanya "Siparişe Ekle"
- Component Refactoring
- Mesajlar Sekmesi (simüle)

---

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB
- **Frontend:** React, Tailwind CSS, Shadcn/UI

## Demo Kullanıcılar
- Müşteri: `sf_musteri` / `musteri123`
- Plasiyer: `sf_plasiyer` / `plasiyer123`
- Admin: `admin` / `admin123`

---

## Formüller

### Tahmini İhtiyaç Hesaplama
```
suggested_qty = rate_mt × days_to_next_route

rate_mt = SMA(son 8 interval)
interval_rate = prev_delivery_qty / days_between
```

### Günlük Tüketim Gösterimi
```javascript
if (rate >= 1) → "1.5/gün"
if (rate < 1)  → "1/2 gün" (= 1 / rate)
```

---

## Backlog

### P1
- [ ] Real SMS/WhatsApp entegrasyonu

### P2
- [ ] Bildirim sistemi
- [ ] Mobile responsive iyileştirmeler

### P3
- [ ] Multi-tenant desteği
