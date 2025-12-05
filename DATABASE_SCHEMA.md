# 📊 VERİTABANI ŞEMASI - Distribution Management System

## Genel Bilgiler
- **Veritabanı Türü:** MongoDB
- **Veritabanı Adı:** `distribution_management`
- **Bağlantı:** Motor (Async MongoDB Driver)

---

## 📑 İÇİNDEKİLER

1. [Kullanıcı Yönetimi](#1-kullanici-yonetimi)
2. [Ürün Yönetimi](#2-urun-yonetimi)
3. [Sipariş Yönetimi](#3-siparis-yonetimi)
4. [Fatura Yönetimi](#4-fatura-yonetimi)
5. [Müşteri Özellikleri](#5-musteri-ozellikleri)
6. [Stok ve Depo](#6-stok-ve-depo)
7. [Tüketim Analizi](#7-tuketim-analizi)
8. [Kampanya ve Bildirimler](#8-kampanya-ve-bildirimler)
9. [Satış Rotaları](#9-satis-rotalari)
10. [İlişkiler Diyagramı](#10-iliskiler-diyagrami)

---

## 1. KULLANICI YÖNETİMİ

### Collection: `users`

**Açıklama:** Sistemdeki tüm kullanıcıların bilgilerini tutar.

```javascript
{
  id: String (UUID),
  username: String (unique),
  password_hash: String (bcrypt),
  email: String (optional),
  full_name: String,
  role: Enum {
    admin,
    warehouse_manager,
    warehouse_staff,
    sales_agent,      // Plasiyer
    customer,
    accounting
  },
  customer_number: String (optional, sadece müşteriler için),
  channel_type: Enum {
    logistics,        // Otel, Hastane, Devlet
    dealer           // Market, Son kullanıcı
  },
  is_active: Boolean,
  created_at: DateTime
}
```

**İndeksler:**
- `username` (unique)
- `role`
- `customer_number`

**İlişkiler:**
- `orders.customer_id` → `users.id`
- `sales_routes.sales_agent_id` → `users.id`
- `sales_routes.customer_id` → `users.id`

---

## 2. ÜRÜN YÖNETİMİ

### Collection: `products`

**Açıklama:** Ürün kataloğu ve stok bilgileri.

```javascript
{
  id: String (UUID),
  sku: String (Stok Kodu),
  name: String,
  category: String,
  description: String (optional),
  
  // Birim ve Paketleme
  unit: String (default: "ADET"),
  units_per_case: Integer,
  sales_unit: String,
  
  // Ağırlık ve Ebat
  gross_weight: Float (kg),
  net_weight: Float (kg),
  case_dimensions: String (optional),
  
  // Fiyatlandırma
  production_cost: Float,
  sales_price: Float,
  logistics_price: Float,
  dealer_price: Float,
  vat_rate: Float (default: 18.0),
  
  // Tanımlama
  barcode: String (optional),
  warehouse_code: String (optional),
  shelf_code: String (optional),
  location_code: String (optional),
  
  // Lot ve Tarih
  lot_number: String (optional),
  expiry_date: String (YYYY-MM-DD, optional),
  
  // Stok Bilgileri
  stock_quantity: Integer,
  stock_status: String (active/passive),
  min_stock_level: Integer,
  max_stock_level: Integer,
  
  // Tedarik
  supply_time: Integer (gün),
  turnover_rate: Float,
  
  image_url: String (optional),
  is_active: Boolean,
  created_at: DateTime
}
```

**İndeksler:**
- `sku` (unique)
- `category`
- `stock_status`
- `is_active`

**İlişkiler:**
- `orders.products[].product_id` → `products.id`
- `favorites.product_id` → `products.id`
- `inventory.product_id` → `products.id`

---

## 3. SİPARİŞ YÖNETİMİ

### Collection: `orders`

**Açıklama:** Müşteri siparişleri ve durumları.

```javascript
{
  id: String (UUID),
  order_number: String (unique, format: ORD-YYYYMMDD-XXXXXXXX),
  customer_id: String → users.id,
  sales_rep_id: String → users.id (optional, plasiyer),
  channel_type: Enum { logistics, dealer },
  status: Enum {
    pending,
    approved,
    preparing,
    ready,
    dispatched,
    delivered,
    cancelled
  },
  products: Array [
    {
      product_id: String,
      product_name: String,
      product_sku: String,
      quantity: Integer,
      price: Float,
      total: Float
    }
  ],
  total_amount: Float,
  notes: String (optional),
  approved_by: String (optional, user_id),
  prepared_by: String (optional, user_id),
  dispatched_date: DateTime (optional),
  delivered_date: DateTime (optional),
  created_at: DateTime,
  updated_at: DateTime
}
```

**İndeksler:**
- `order_number` (unique)
- `customer_id`
- `sales_rep_id`
- `status`
- `created_at`

**İlişkiler:**
- `customer_id` → `users.id`
- `sales_rep_id` → `users.id`
- `products[].product_id` → `products.id`

---

## 4. FATURA YÖNETİMİ

### Collection: `invoices`

**Açıklama:** HTML fatura kayıtları ve detayları.

```javascript
{
  id: String (UUID),
  invoice_number: String (unique),
  invoice_date: String (DD MM YYYY),
  customer_name: String (optional),
  customer_tax_id: String,
  customer_id: String → users.id (optional),
  html_content: String (Full HTML),
  products: Array [
    {
      product_code: String,
      product_name: String,
      quantity: Float,
      unit_price: String,
      total: String
    }
  ],
  subtotal: String,
  total_discount: String,
  total_tax: String,
  grand_total: String,
  uploaded_by: String → users.id,
  uploaded_at: DateTime,
  is_active: Boolean
}
```

**İndeksler:**
- `invoice_number` (unique)
- `customer_id`
- `customer_tax_id`
- `invoice_date`

**İlişkiler:**
- `customer_id` → `users.id`
- `uploaded_by` → `users.id`

---

## 5. MÜŞTERİ ÖZELLİKLERİ

### Collection: `favorites`

**Açıklama:** Müşterilerin favori ürünleri (maksimum 10).

```javascript
{
  id: String (UUID),
  user_id: String → users.id,
  product_id: String → products.id,
  created_at: DateTime
}
```

**İndeksler:**
- `user_id`
- `product_id`
- Compound: `(user_id, product_id)` (unique)

**Kısıtlamalar:**
- Her müşteri maksimum 10 ürün ekleyebilir

---

### Collection: `saved_carts`

**Açıklama:** Müşterilerin kaydedilmiş sepetleri (kullanıcı başına 1 adet).

```javascript
{
  id: String (UUID),
  user_id: String → users.id (unique),
  products: Array [
    {
      product_id: String,
      product_name: String,
      product_sku: String,
      quantity: Integer,
      price: Float
    }
  ],
  total_amount: Float,
  created_at: DateTime,
  updated_at: DateTime
}
```

**İndeksler:**
- `user_id` (unique)

**Kısıtlamalar:**
- Her müşteri sadece 1 kaydedilmiş sepet tutabilir

---

### Collection: `fault_reports`

**Açıklama:** Müşteri arıza bildirimleri.

```javascript
{
  id: String (UUID),
  user_id: String → users.id,
  order_id: String → orders.id (optional),
  product_id: String → products.id,
  description: String,
  photos: Array[String] (Base64, max 3, 5MB each),
  status: Enum {
    pending,
    in_review,
    resolved,
    rejected
  },
  admin_response: String (optional),
  created_at: DateTime,
  updated_at: DateTime,
  resolved_at: DateTime (optional)
}
```

**İndeksler:**
- `user_id`
- `status`
- `created_at`

**Kısıtlamalar:**
- Maksimum 3 fotoğraf
- Her fotoğraf 5MB'dan küçük olmalı

---

## 6. STOK VE DEPO

### Collection: `warehouses`

**Açıklama:** Depo lokasyonları ve bilgileri.

```javascript
{
  id: String (UUID),
  name: String,
  location: String (Şehir),
  address: String (optional),
  manager_id: String → users.id (optional),
  manager_name: String (optional),
  capacity: Integer (toplam kapasite),
  current_stock: Integer (mevcut stok),
  is_active: Boolean,
  created_at: DateTime,
  updated_at: DateTime
}
```

**İndeksler:**
- `location`
- `manager_id`
- `is_active`

---

### Collection: `inventory`

**Açıklama:** Depo bazlı ürün stok kayıtları.

```javascript
{
  id: String (UUID),
  product_id: String → products.id,
  warehouse_id: String → warehouses.id (optional),
  total_units: Integer,
  expiry_date: DateTime (optional),
  last_supply_date: DateTime (optional),
  next_shipment_date: DateTime (optional),
  is_out_of_stock: Boolean,
  location: String (Depo içi konum, optional),
  updated_at: DateTime
}
```

**İndeksler:**
- `product_id`
- `warehouse_id`
- Compound: `(product_id, warehouse_id)`

---

## 7. TÜKETİM ANALİZİ

### Collection: `customer_consumption`

**Açıklama:** Fatura bazlı müşteri tüketim hesaplamaları.

```javascript
{
  consumption_id: String (UUID),
  customer_id: String → users.id,
  product_id: String → products.id,
  product_code: String,
  product_name: String,
  
  // Kaynak fatura (önceki)
  source_invoice_id: String → invoices.id (optional, null ise ilk fatura),
  source_invoice_date: String (DD MM YYYY),
  source_quantity: Float,
  
  // Hedef fatura (yeni)
  target_invoice_id: String → invoices.id,
  target_invoice_date: String (DD MM YYYY),
  target_quantity: Float,
  
  // Hesaplanan değerler
  days_between: Integer (faturalar arası gün),
  consumption_quantity: Float (tüketilen miktar),
  daily_consumption_rate: Float (günlük ortalama),
  expected_consumption: Float (beklenen tüketim),
  deviation_rate: Float (sapma oranı %),
  
  can_calculate: Boolean (false ise ilk fatura),
  notes: String (optional),
  created_at: DateTime
}
```

**İndeksler:**
- `customer_id`
- `product_id`
- Compound: `(customer_id, product_id)`
- `target_invoice_date`

---

### Collection: `consumption_periods`

**Açıklama:** Periyodik tüketim analiz kayıtları.

```javascript
{
  id: String (UUID),
  customer_id: String → users.id,
  product_id: String → products.id,
  product_name: String,
  period_type: String (daily, weekly, monthly, yearly),
  period_start: DateTime,
  period_end: DateTime,
  
  // Sipariş bilgileri
  total_ordered: Float,
  order_count: Integer,
  days_between_orders: Float,
  
  // Hesaplanan tüketim
  daily_consumption: Float,
  weekly_consumption: Float,
  monthly_consumption: Float,
  
  // Tahmin ve karşılaştırma
  previous_period_consumption: Float (optional),
  growth_rate: Float (% artış/azalış, optional),
  prediction_next_period: Float (optional),
  
  created_at: DateTime,
  updated_at: DateTime
}
```

**İndeksler:**
- `customer_id`
- `product_id`
- `period_type`
- Compound: `(customer_id, product_id, period_type)`

---

## 8. KAMPANYA VE BİLDİRİMLER

### Collection: `campaigns`

**Açıklama:** Kampanya tanımları ve kuralları.

```javascript
{
  id: String (UUID),
  name: String,
  description: String (optional),
  title: String,
  
  // Kampanya Tipi
  campaign_type: Enum {
    simple_discount,   // Basit indirim
    buy_x_get_y,      // X al Y kazan
    bulk_discount     // Toplu alım indirimi
  },
  
  // İndirim Detayları
  discount_type: Enum { percentage, fixed_amount },
  discount_value: Float,
  discount_percentage: Float (for simple display),
  
  // Buy X Get Y
  min_quantity: Integer,
  gift_product_id: String → products.id (optional),
  gift_quantity: Integer,
  
  // Bulk Discount
  bulk_min_quantity: Integer,
  bulk_discount_per_unit: Float,
  
  // Hedefleme
  applies_to_product_id: String → products.id (optional),
  product_ids: Array[String] (empty = all products),
  customer_groups: Array[Enum] { all, vip, regular, new, custom },
  customer_ids: Array[String] (for custom group),
  
  // Plasiyer/Depo Bazlı (Müşteri Paneli için)
  depot_id: String (optional),
  sales_agent_ids: Array[String] → users.id,
  target_products: Array[String] → products.id,
  
  // Tarih
  start_date: DateTime,
  end_date: DateTime,
  
  is_active: Boolean,
  created_by: String → users.id (optional),
  created_at: DateTime,
  updated_at: DateTime
}
```

**İndeksler:**
- `is_active`
- `start_date`
- `end_date`
- Compound: `(is_active, start_date, end_date)`

**Özel Kurallar:**
- `sales_agent_ids` boşsa tüm müşterilere görünür
- `sales_agent_ids` doluysa sadece o plasiyerlerin müşterilerine görünür

---

### Collection: `notifications`

**Açıklama:** Sistem bildirimleri.

```javascript
{
  id: String (UUID),
  user_id: String → users.id,
  type: Enum {
    order_created,
    order_status,
    campaign,
    system,
    fault_response,
    critical_stock,
    low_stock,
    approval_pending,
    campaign_started,
    campaign_ending
  },
  title: String,
  message: String,
  priority: Enum { low, medium, high, critical },
  is_read: Boolean,
  read_by: Array[String] (user IDs),
  
  // İlişkiler
  related_order_id: String → orders.id (optional),
  related_campaign_id: String → campaigns.id (optional),
  
  // Hedefleme
  target_user_ids: Array[String] (empty = all admins),
  target_roles: Array[String] (admin, accounting, etc.),
  
  metadata: Object (additional data),
  action_url: String (optional),
  created_at: DateTime,
  expires_at: DateTime (optional)
}
```

**İndeksler:**
- `user_id`
- `is_read`
- `type`
- `created_at`

---

## 9. SATIŞ ROTALARI

### Collection: `sales_routes`

**Açıklama:** Plasiyer teslimat rotaları.

```javascript
{
  id: String (UUID),
  sales_agent_id: String → users.id (plasiyer),
  customer_id: String → users.id,
  customer_name: String (denormalized),
  location: String (optional),
  delivery_day: Enum {
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday
  },
  route_order: Integer (ziyaret sırası),
  is_active: Boolean,
  notes: String (optional),
  created_at: DateTime,
  updated_at: DateTime
}
```

**İndeksler:**
- `sales_agent_id`
- `customer_id`
- `delivery_day`
- Compound: `(sales_agent_id, delivery_day, route_order)`

---

## 10. İLİŞKİLER DİYAGRAMI

```
users (1) ──< orders (N)
  │
  ├──< sales_routes (N) [as customer]
  ├──< sales_routes (N) [as sales_agent]
  ├──< favorites (N)
  ├──< saved_carts (1)
  ├──< fault_reports (N)
  ├──< customer_consumption (N)
  └──< notifications (N)

products (1) ──< orders.products (N)
  │
  ├──< favorites (N)
  ├──< fault_reports (N)
  ├──< inventory (N)
  ├──< customer_consumption (N)
  └──< campaigns.product_ids (N)

warehouses (1) ──< inventory (N)

invoices (1) ──< customer_consumption (N) [as source/target]

campaigns (1) ──< notifications (N)
```

---

## 📈 VERİ AKIŞI

### Sipariş Akışı
```
1. Müşteri → Order (pending)
2. Admin → Order (approved)
3. Warehouse → Order (preparing)
4. Warehouse → Order (ready)
5. Sales Agent → Order (dispatched)
6. Sales Agent → Order (delivered)
   ↓
   Notification oluşturulur (her aşamada)
```

### Tüketim Hesaplama Akışı
```
1. Accounting → Invoice yükler
2. System → customer_consumption hesaplar
   - Önceki faturadan kalan miktarı tüketim olarak işaretler
   - Günlük tüketim oranı hesaplar
   - Sapma oranı hesaplar
3. System → consumption_periods günceller
4. Customer → Dashboard'da grafikleri görür
```

### Kampanya Bildirim Akışı
```
1. Admin/Accounting → Campaign oluşturur
2. System → Hedef müşterileri belirler
   - sales_agent_ids boşsa → tüm müşteriler
   - sales_agent_ids doluysa → o plasiyerlerin müşterileri
3. System → Her müşteriye notification oluşturur
4. Customer → Bildirim alır
```

---

## 🔒 GÜVENLİK VE KISITLAMALAR

### Kullanıcı Kısıtlamaları
- **Customer:** Sadece kendi kayıtlarına erişebilir
- **Sales Agent:** Sadece kendi rotalarındaki müşterilere erişebilir
- **Accounting:** Fatura ve finans işlemlerine tam erişim
- **Admin:** Tüm sisteme tam erişim
- **Warehouse Staff:** Sadece stok ve sipariş hazırlama

### Veri Kısıtlamaları
- **Favorites:** Max 10 ürün per customer
- **Saved Cart:** 1 per customer
- **Fault Photos:** Max 3, 5MB each
- **Password:** Bcrypt hash
- **UUID:** Tüm ID'ler UUID v4

---

## 📊 İNDEKS PERFORMANS ÖNERİLERİ

### Kritik İndeksler (Mutlaka Oluşturulmalı)
```javascript
// Users
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ role: 1, is_active: 1 })

// Products
db.products.createIndex({ sku: 1 }, { unique: true })
db.products.createIndex({ category: 1, is_active: 1 })

// Orders
db.orders.createIndex({ order_number: 1 }, { unique: true })
db.orders.createIndex({ customer_id: 1, created_at: -1 })
db.orders.createIndex({ status: 1, created_at: -1 })

// Invoices
db.invoices.createIndex({ invoice_number: 1 }, { unique: true })
db.invoices.createIndex({ customer_id: 1, invoice_date: -1 })

// Favorites
db.favorites.createIndex({ user_id: 1, product_id: 1 }, { unique: true })

// Saved Carts
db.saved_carts.createIndex({ user_id: 1 }, { unique: true })

// Sales Routes
db.sales_routes.createIndex({ sales_agent_id: 1, delivery_day: 1 })

// Customer Consumption
db.customer_consumption.createIndex({ customer_id: 1, product_id: 1 })

// Notifications
db.notifications.createIndex({ user_id: 1, is_read: 1, created_at: -1 })

// Campaigns
db.campaigns.createIndex({ is_active: 1, start_date: 1, end_date: 1 })
```

---

## 📝 NOTLAR

1. **MongoDB Motor:** Tüm veritabanı işlemleri async (await) kullanır
2. **UUID v4:** Tüm ID'ler UUID formatında
3. **Datetime:** UTC timezone kullanılır, ISO format string olarak saklanır
4. **Fiyatlar:** Float olarak saklanır (TL)
5. **Denormalization:** Performans için bazı alanlar denormalize edilmiştir (örn: product_name, customer_name)

---

**Son Güncelleme:** 2025-01-20
**Versiyon:** 2.0
**Geliştirici:** Distribution Management System Team
