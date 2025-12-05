# 🔗 VERİTABANI İLİŞKİLER DİYAGRAMI

## Ana Koleksiyonlar ve İlişkileri

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USERS (Kullanıcılar)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                                   │
│ • username (unique)                                                         │
│ • role: admin, accounting, sales_agent, customer, warehouse_*              │
│ • customer_number                                                           │
│ • channel_type: logistics, dealer                                          │
└───────┬─────────────────────────────────────────────────────────────────────┘
        │
        │ (1:N)
        ├──────────────────────────────────────────────────────────────────┐
        │                                                                  │
        ▼                                                                  ▼
┌───────────────────┐                                           ┌──────────────────┐
│     ORDERS        │                                           │  SALES_ROUTES    │
├───────────────────┤                                           ├──────────────────┤
│ • id (PK)         │                                           │ • id (PK)        │
│ • order_number    │                                           │ • sales_agent_id │
│ • customer_id (FK)│◄──────────────┐                          │ • customer_id    │
│ • sales_rep_id    │               │                          │ • delivery_day   │
│ • status          │               │                          │ • route_order    │
│ • products[]      │               │                          └──────────────────┘
│ • total_amount    │               │
└───────┬───────────┘               │
        │                           │
        │ (N:M via products[])      │
        │                           │
        ▼                           │
┌───────────────────────────────────┴──────────────────┐
│                    PRODUCTS                          │
├──────────────────────────────────────────────────────┤
│ • id (PK)                                            │
│ • sku (unique)                                       │
│ • name, category, description                        │
│ • prices: sales, logistics, dealer                   │
│ • stock_quantity, stock_status                       │
│ • warehouse_code, shelf_code                         │
└─────────┬────────────────────────────────────────────┘
          │
          │ (1:N)
          ├────────────────────────────────────────┬────────────────┐
          │                                        │                │
          ▼                                        ▼                ▼
  ┌───────────────┐                    ┌─────────────────┐  ┌─────────────┐
  │   FAVORITES   │                    │    INVENTORY    │  │FAULT_REPORTS│
  ├───────────────┤                    ├─────────────────┤  ├─────────────┤
  │ • id (PK)     │                    │ • id (PK)       │  │ • id (PK)   │
  │ • user_id (FK)│                    │ • product_id(FK)│  │ • user_id   │
  │ • product_id  │                    │ • warehouse_id  │  │ • product_id│
  │ (MAX 10/user) │                    │ • total_units   │  │ • photos[]  │
  └───────────────┘                    │ • expiry_date   │  │ • status    │
                                       └─────────────────┘  └─────────────┘
                                               │
                                               │ (N:1)
                                               ▼
                                       ┌─────────────────┐
                                       │   WAREHOUSES    │
                                       ├─────────────────┤
                                       │ • id (PK)       │
                                       │ • name          │
                                       │ • location      │
                                       │ • manager_id    │
                                       │ • capacity      │
                                       └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        INVOICES (Faturalar)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                                   │
│ • invoice_number (unique)                                                   │
│ • customer_id (FK) → users                                                 │
│ • customer_tax_id                                                           │
│ • invoice_date (DD MM YYYY)                                                │
│ • products[]                                                                │
│ • grand_total                                                               │
│ • uploaded_by (FK) → users                                                 │
└───────┬─────────────────────────────────────────────────────────────────────┘
        │
        │ (1:N)
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                  CUSTOMER_CONSUMPTION (Tüketim Analizi)                   │
├───────────────────────────────────────────────────────────────────────────┤
│ • consumption_id (PK)                                                     │
│ • customer_id (FK) → users                                               │
│ • product_id (FK) → products                                             │
│ • source_invoice_id (FK) → invoices (önceki fatura)                     │
│ • target_invoice_id (FK) → invoices (yeni fatura)                       │
│ • source_quantity, target_quantity                                        │
│ • days_between (faturalar arası gün)                                     │
│ • consumption_quantity (tüketilen)                                        │
│ • daily_consumption_rate (günlük ort.)                                   │
│ • deviation_rate (sapma %)                                                │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        CAMPAIGNS (Kampanyalar)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                                   │
│ • name, description, title                                                  │
│ • campaign_type: simple_discount, buy_x_get_y, bulk_discount              │
│ • discount_value, discount_percentage                                       │
│ • depot_id, sales_agent_ids[] (hedefleme)                                 │
│ • product_ids[] (hangi ürünlere uygulanacak)                              │
│ • start_date, end_date                                                      │
│ • is_active                                                                 │
└───────┬─────────────────────────────────────────────────────────────────────┘
        │
        │ (1:N) Kampanya oluşunca bildirim gönderilir
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      NOTIFICATIONS (Bildirimler)                          │
├───────────────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                                 │
│ • user_id (FK) → users (bildirim alan)                                  │
│ • type: order_created, order_status, campaign, fault_response, etc.     │
│ • title, message                                                          │
│ • is_read                                                                 │
│ • related_order_id (FK) → orders (optional)                             │
│ • related_campaign_id (FK) → campaigns (optional)                       │
│ • created_at                                                              │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                     SAVED_CARTS (Kaydedilmiş Sepetler)                   │
├───────────────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                                 │
│ • user_id (FK) → users (UNIQUE - kullanıcı başına 1 adet)              │
│ • products[] (sepetteki ürünler)                                         │
│ • total_amount                                                            │
│ • updated_at                                                              │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Veri Akışı Senaryoları

### 1️⃣ Sipariş Oluşturma Akışı
```
Müşteri (Customer)
    │
    ├─> 1. OrderManagement.js (Frontend)
    │       • Ürünleri seçer (products koleksiyonundan)
    │       • Sepete ekler (state)
    │       • "Siparişi Tamamla" butonuna basar
    │
    ├─> 2. POST /api/orders (Backend)
    │       • Order kaydı oluşturulur
    │       • order_number generate edilir
    │       • products[] array'i doldurulur
    │       • status: "pending" olarak işaretlenir
    │
    ├─> 3. Notification Service
    │       • Müşteriye "Sipariş Oluşturuldu" bildirimi
    │       • notification koleksiyonuna kayıt
    │
    └─> 4. Saved Cart Temizleme
            • saved_carts koleksiyonundan silinir
```

### 2️⃣ Fatura Yükleme ve Tüketim Hesaplama
```
Muhasebe (Accounting)
    │
    ├─> 1. InvoiceUpload.js (Frontend)
    │       • HTML fatura yükler
    │
    ├─> 2. POST /api/invoices (Backend)
    │       • HTML parse edilir
    │       • Invoice kaydı oluşturulur
    │       • customer_tax_id ile müşteri eşleştirilir
    │
    ├─> 3. Consumption Calculation Service
    │       • Önceki fatura bulunur (source_invoice)
    │       • Yeni fatura (target_invoice)
    │       • Her ürün için:
    │           - consumption_quantity = source_quantity (tüketilen)
    │           - days_between hesaplanır
    │           - daily_consumption_rate = consumption / days
    │           - deviation_rate hesaplanır
    │       • customer_consumption koleksiyonuna kayıt
    │
    └─> 4. Consumption Periods Update
            • Haftalık/Aylık toplamlar güncellenir
            • consumption_periods koleksiyonu
```

### 3️⃣ Kampanya Oluşturma ve Bildirim
```
Admin
    │
    ├─> 1. CampaignManagement.js (Frontend)
    │       • Kampanya detayları girilir
    │       • Hedef plasiyer seçilir (sales_agent_ids[])
    │
    ├─> 2. POST /api/campaigns (Backend)
    │       • Campaign kaydı oluşturulur
    │       • is_active: true olarak işaretlenir
    │
    ├─> 3. Notification Service - Campaign
    │       • sales_agent_ids BOŞ ise:
    │           → Tüm müşterilere bildirim (users.role = customer)
    │       • sales_agent_ids DOLU ise:
    │           → sales_routes koleksiyonundan ilgili müşteriler bulunur
    │           → Sadece o müşterilere bildirim
    │       • Her müşteri için notification kaydı oluşturulur
    │
    └─> 4. Customer Dashboard
            • Müşteri giriş yapar
            • NotificationCenter bildirim sayısını gösterir
            • CampaignsModule kampanyaları listeler
```

### 4️⃣ Favori Ekleme
```
Müşteri
    │
    ├─> 1. ProductCatalog.js (Frontend)
    │       • Ürünün yanındaki kalp ikonuna tıklar
    │
    ├─> 2. POST /api/favorites/toggle/{product_id}
    │       • favorites koleksiyonu kontrol edilir
    │       • count < 10 ise yeni kayıt oluşturulur
    │       • count >= 10 ise hata döner
    │
    └─> 3. FavoritesModule.js
            • Favori liste güncellenir
            • Hızlı sepete ekleme aktif olur
```

### 5️⃣ Plasiyer Rota Yönetimi
```
Admin
    │
    ├─> 1. Rota Atama
    │       • sales_routes kaydı oluşturulur
    │       • sales_agent_id: plasiyer
    │       • customer_id: müşteri
    │       • delivery_day: teslimat günü
    │
    └─> 2. Plasiyer Dashboard
            • GET /api/sales-routes/agent/{agent_id}
            • Kendi rotalarını görür
            • delivery_day bazlı gruplandırılır
            • route_order sırasıyla listelenir
```

---

## Önemli Kısıtlamalar ve Kurallar

### ✅ Veri Bütünlüğü Kuralları

1. **Favorites (MAX 10)**
   - `db.favorites.countDocuments({user_id: X})` < 10 kontrolü

2. **Saved Cart (1 per user)**
   - `user_id` unique index ile garanti edilir

3. **Fault Photos (MAX 3, 5MB each)**
   - Backend'de `len(photos) <= 3` kontrolü
   - Her photo için `size <= 5MB` kontrolü

4. **Order Number Format**
   - `ORD-YYYYMMDD-XXXXXXXX` (UUID 8 karakter)
   - Unique index ile garanti

5. **Campaign Targeting**
   - `sales_agent_ids == []` → Tüm müşteriler
   - `sales_agent_ids != []` → Sadece o plasiyerlerin müşterileri

### 🔄 Cascade Delete Kuralları

```javascript
// User silinirse:
- orders.customer_id → SET NULL veya KEEP (historical)
- favorites → DELETE
- saved_carts → DELETE
- fault_reports → DELETE
- notifications → DELETE

// Product silinirse:
- favorites → DELETE
- inventory → DELETE
- orders.products[] → KEEP (historical)

// Campaign silinirse:
- notifications → KEEP (historical)
```

### 📊 Denormalization Strategy

**Performans için bazı alanlar denormalize edilmiştir:**

```javascript
sales_routes: {
  customer_name: String  // users.full_name'den kopyalanır
  location: String       // users.location'dan (eğer varsa)
}

orders.products[]: {
  product_name: String,  // products.name'den kopyalanır
  product_sku: String,   // products.sku'dan kopyalanır
  price: Float          // products.sales_price'dan kopyalanır
}

customer_consumption: {
  product_name: String   // products.name'den kopyalanır
}
```

**Avantajları:**
- Join işlemi gerektirmez
- Sorgu performansı artar
- Historical data korunur (ürün adı değişse bile)

**Dezavantajları:**
- Data consistency manuel kontrol edilmeli
- Update işlemleri daha kompleks

---

## MongoDB Index Stratejisi

### 🚀 Performans Kritik İndeksler

```javascript
// Unique Constraints
db.users.createIndex({ username: 1 }, { unique: true })
db.products.createIndex({ sku: 1 }, { unique: true })
db.orders.createIndex({ order_number: 1 }, { unique: true })
db.invoices.createIndex({ invoice_number: 1 }, { unique: true })
db.saved_carts.createIndex({ user_id: 1 }, { unique: true })

// Compound Indexes for Performance
db.orders.createIndex({ customer_id: 1, created_at: -1 })
db.favorites.createIndex({ user_id: 1, product_id: 1 }, { unique: true })
db.sales_routes.createIndex({ sales_agent_id: 1, delivery_day: 1, route_order: 1 })
db.customer_consumption.createIndex({ customer_id: 1, product_id: 1, target_invoice_date: -1 })
db.notifications.createIndex({ user_id: 1, is_read: 1, created_at: -1 })

// Campaign Filtering
db.campaigns.createIndex({ 
  is_active: 1, 
  start_date: 1, 
  end_date: 1 
})
```

---

**Son Güncelleme:** 2025-01-20
**Döküman Versiyonu:** 2.0
