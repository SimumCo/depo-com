from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel, field_validator
from models.user import UserRole
from utils.auth import require_role
from config.database import db
from services.seftali.utils import (
    gen_id, now_utc, to_iso,
    COL_CUSTOMERS, COL_PRODUCTS, COL_DELIVERIES, COL_ORDERS, std_resp,
    get_product_by_id,
)

router = APIRouter(prefix="/sales", tags=["Seftali-Sales"])


# ---------- schemas ----------
class DeliveryItem(BaseModel):
    product_id: str
    qty: float

    @field_validator("qty")
    @classmethod
    def qty_pos(cls, v):
        if v <= 0:
            raise ValueError("qty sifirdan buyuk olmali")
        return v


class CreateDeliveryBody(BaseModel):
    customer_id: str
    delivery_type: str = "route"
    delivered_at: Optional[str] = None
    invoice_no: Optional[str] = None
    items: List[DeliveryItem]

    @field_validator("items")
    @classmethod
    def validate_items(cls, v):
        if not v:
            raise ValueError("En az bir urun gerekli")
        pids = [i.product_id for i in v]
        if len(pids) != len(set(pids)):
            raise ValueError("Tekrarlayan urun_id")
        return v

    @field_validator("delivery_type")
    @classmethod
    def check_type(cls, v):
        if v not in ("route", "off_route"):
            raise ValueError("delivery_type: route veya off_route olmali")
        return v


class OrderActionBody(BaseModel):
    note: str = ""


SALES_ROLES = [UserRole.SALES_REP, UserRole.SALES_AGENT]


# ===========================
# 1. POST /deliveries
# ===========================
@router.post("/deliveries")
async def create_delivery(body: CreateDeliveryBody, current_user=Depends(require_role(SALES_ROLES))):
    # verify customer exists
    cust = await db[COL_CUSTOMERS].find_one({"id": body.customer_id, "is_active": True}, {"_id": 0})
    if not cust:
        raise HTTPException(404, "Musteri bulunamadi")

    now = now_utc()
    dlv = {
        "id": gen_id(),
        "customer_id": body.customer_id,
        "created_by_salesperson_id": current_user.id,
        "delivery_type": body.delivery_type,
        "delivered_at": body.delivered_at or to_iso(now),
        "invoice_no": body.invoice_no,
        "acceptance_status": "pending",
        "accepted_at": None,
        "rejected_at": None,
        "rejection_reason": None,
        "items": [{"product_id": it.product_id, "qty": it.qty} for it in body.items],
        "created_at": to_iso(now),
        "updated_at": to_iso(now),
    }
    await db[COL_DELIVERIES].insert_one(dlv)
    dlv.pop("_id", None)
    return std_resp(True, dlv, "Teslimat olusturuldu (pending)")


# ===========================
# 2. GET /deliveries
# ===========================
@router.get("/deliveries")
async def list_deliveries(
    status: Optional[str] = None,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    current_user=Depends(require_role(SALES_ROLES)),
):
    filt = {}
    if status:
        filt["acceptance_status"] = status
    if from_date or to_date:
        filt["delivered_at"] = {}
        if from_date:
            filt["delivered_at"]["$gte"] = from_date
        if to_date:
            filt["delivered_at"]["$lte"] = to_date

    cursor = db[COL_DELIVERIES].find(filt, {"_id": 0}).sort("delivered_at", -1)
    items = await cursor.to_list(length=200)
    # enrich customer names
    for d in items:
        c = await db[COL_CUSTOMERS].find_one({"id": d["customer_id"]}, {"_id": 0, "name": 1})
        if c:
            d["customer_name"] = c["name"]
    return std_resp(True, items)


# ===========================
# 3. GET /orders
# ===========================
@router.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    current_user=Depends(require_role(SALES_ROLES)),
):
    filt = {}
    if status:
        filt["status"] = status
    if from_date or to_date:
        filt["created_at"] = {}
        if from_date:
            filt["created_at"]["$gte"] = from_date
        if to_date:
            filt["created_at"]["$lte"] = to_date

    cursor = db[COL_ORDERS].find(filt, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=200)
    for o in items:
        c = await db[COL_CUSTOMERS].find_one({"id": o["customer_id"]}, {"_id": 0, "name": 1})
        if c:
            o["customer_name"] = c["name"]
        for it in o.get("items", []):
            p = await get_product_by_id(db, it["product_id"])
            if p:
                it["product_name"] = p.get("name", "")
    return std_resp(True, items)


# ===========================
# 4. POST /orders/{id}/approve
# ===========================
@router.post("/orders/{order_id}/approve")
async def approve_order(order_id: str, current_user=Depends(require_role(SALES_ROLES))):
    o = await db[COL_ORDERS].find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Siparis bulunamadi")
    if o["status"] not in ("submitted", "needs_edit"):
        raise HTTPException(409, f"Siparis durumu uygun degil: {o['status']}")

    await db[COL_ORDERS].update_one(
        {"id": order_id}, {"$set": {"status": "approved", "updated_at": to_iso(now_utc())}}
    )
    return std_resp(True, {"order_id": order_id}, "Siparis onaylandi")


# ===========================
# 5. POST /orders/{id}/request-edit
# ===========================
@router.post("/orders/{order_id}/request-edit")
async def request_edit(order_id: str, body: OrderActionBody, current_user=Depends(require_role(SALES_ROLES))):
    o = await db[COL_ORDERS].find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Siparis bulunamadi")
    if o["status"] != "submitted":
        raise HTTPException(409, f"Siparis durumu uygun degil: {o['status']}")

    await db[COL_ORDERS].update_one(
        {"id": order_id},
        {"$set": {"status": "needs_edit", "edit_note": body.note, "updated_at": to_iso(now_utc())}},
    )
    return std_resp(True, {"order_id": order_id}, "Duzenleme istegi gonderildi")


# ===========================
# EXTRA: GET /customers (for delivery creation)
# ===========================
@router.get("/customers")
async def list_customers(current_user=Depends(require_role(SALES_ROLES))):
    cursor = db[COL_CUSTOMERS].find({"is_active": True}, {"_id": 0})
    items = await cursor.to_list(length=500)
    return std_resp(True, items)


# ===========================
# EXTRA: PATCH /customers/{id} - Müşteri Güncelleme
# ===========================
class UpdateCustomerBody(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    channel: Optional[str] = None
    route_days: Optional[List[str]] = None


@router.patch("/customers/{customer_id}")
async def update_customer(customer_id: str, body: UpdateCustomerBody, current_user=Depends(require_role(SALES_ROLES))):
    """Müşteri bilgilerini günceller (plasiyer tarafından)"""
    
    # Müşteri var mı kontrol et
    customer = await db[COL_CUSTOMERS].find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(404, "Müşteri bulunamadı")
    
    # Güncellenecek alanları hazırla
    update_data = {}
    
    if body.name is not None:
        update_data["name"] = body.name
    if body.code is not None:
        update_data["code"] = body.code
    if body.phone is not None:
        update_data["phone"] = body.phone
    if body.email is not None:
        update_data["email"] = body.email
    if body.address is not None:
        update_data["address"] = body.address
    if body.channel is not None:
        update_data["channel"] = body.channel
    if body.route_days is not None:
        # Rut günlerini route_plan içinde güncelle
        update_data["route_plan.days"] = body.route_days
    
    if not update_data:
        return std_resp(True, customer, "Güncellenecek alan yok")
    
    update_data["updated_at"] = to_iso(now_utc())
    
    await db[COL_CUSTOMERS].update_one(
        {"id": customer_id},
        {"$set": update_data}
    )
    
    # Güncellenmiş müşteriyi döndür
    updated_customer = await db[COL_CUSTOMERS].find_one({"id": customer_id}, {"_id": 0})
    return std_resp(True, updated_customer, "Müşteri bilgileri güncellendi")


@router.get("/products")
async def list_products(current_user=Depends(require_role(SALES_ROLES))):
    cursor = db[COL_PRODUCTS].find({}, {"_id": 0})
    items = await cursor.to_list(length=500)
    return std_resp(True, items)


# ===========================
# EXTRA: GET /campaigns - Aktif Kampanyalar (Plasiyer için)
# ===========================
@router.get("/campaigns")
async def list_active_campaigns(current_user=Depends(require_role(SALES_ROLES))):
    """Plasiyer için aktif kampanyaları listele"""
    cursor = db["sf_campaigns"].find({"status": "active"}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=50)
    return std_resp(True, items)


# ===========================
# EXTRA: GET /customers/{id}/consumption - Müşteri Tüketim İstatistikleri (Plasiyer için)
# ===========================
@router.get("/customers/{customer_id}/consumption")
async def get_customer_consumption(customer_id: str, current_user=Depends(require_role(SALES_ROLES))):
    """
    Plasiyer'in müşteri tüketim istatistiklerini görmesi için endpoint.
    Ürün bazında günlük ortalama tüketim ve toplam tüketim.
    """
    # Müşteri var mı kontrol et
    customer = await db[COL_CUSTOMERS].find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(404, "Müşteri bulunamadı")
    
    # sf_daily_consumption koleksiyonundan tüketim verilerini çek
    pipeline = [
        {"$match": {"customer_id": customer_id}},
        {"$group": {
            "_id": "$product_id",
            "total_consumption": {"$sum": "$consumption"},
            "daily_avg": {"$avg": "$consumption"},
            "record_count": {"$sum": 1},
            "first_date": {"$min": "$date"},
            "last_date": {"$max": "$date"},
        }},
        {"$sort": {"daily_avg": -1}},
    ]
    
    results = await db["sf_daily_consumption"].aggregate(pipeline).to_list(50)
    
    consumption_data = []
    for r in results:
        product_id = r.pop("_id")
        product = await get_product_by_id(db, product_id)
        
        consumption_data.append({
            "product_id": product_id,
            "product_name": product.get("name", "Bilinmeyen") if product else "Bilinmeyen",
            "product_code": product.get("code", "") if product else "",
            "daily_avg": round(r["daily_avg"], 2),
            "total_consumption": round(r["total_consumption"], 2),
            "record_count": r["record_count"],
            "first_date": r["first_date"],
            "last_date": r["last_date"],
        })
    
    return std_resp(True, {
        "customer_id": customer_id,
        "customer_name": customer.get("name"),
        "products": consumption_data,
        "total_products": len(consumption_data)
    })


# ===========================
# 7. GET /warehouse-draft - Depo Sipariş Taslağı (Gelişmiş)
# ===========================
@router.get("/warehouse-draft")
async def get_warehouse_draft(
    route_day: Optional[str] = None,
    current_user=Depends(require_role(SALES_ROLES))
):
    """
    Belirli bir rut günü için depo sipariş taslağı hesaplar.
    
    Mantık:
    1. Müşteri siparişleri (submitted/approved) toplanır
    2. 16:30'a kadar gönderilmeyen müşterilerin taslakları toplanır
    3. Toplam ihtiyaç hesaplanır
    4. Plasiyer stoğu çıkarılır (opsiyonel)
    5. Koli bazında yuvarlanır
    
    Örnek:
    - Müşteri siparişleri: 40 ayran
    - Taslaklar: 30 ayran
    - Toplam: 70 ayran
    - Plasiyer stoğu: 20 ayran
    - İhtiyaç: 50 ayran
    - Koli (20'lik): 60 adet sipariş
    """
    from datetime import datetime, timedelta
    
    # Rut günü belirtilmemişse yarını al
    if not route_day:
        tomorrow = datetime.utcnow() + timedelta(days=1)
        day_codes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        route_day = day_codes[tomorrow.weekday()]
    
    # Bugünün saat 16:30 kontrolü
    now = datetime.utcnow()
    cutoff_time = now.replace(hour=16, minute=30, second=0, microsecond=0)
    is_after_cutoff = now > cutoff_time
    
    # Bugünün başlangıcı
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
    
    # Belirtilen rut gününde olan aktif müşterileri bul
    cursor = db[COL_CUSTOMERS].find(
        {"is_active": True, "route_plan.days": route_day},
        {"_id": 0}
    )
    route_customers = await cursor.to_list(length=500)
    
    customer_details = []
    product_totals = {}  # Ürün bazında toplam
    
    # Ürün koli bilgilerini çek - yeni products koleksiyonundan
    products_cursor = db["products"].find({}, {"_id": 0})
    products_list = await products_cursor.to_list(length=500)
    products_map = {p["product_id"]: p for p in products_list}
    
    # Eski sf_products koleksiyonundan da al (backward compatibility)
    sf_products_cursor = db[COL_PRODUCTS].find({}, {"_id": 0})
    sf_products_list = await sf_products_cursor.to_list(length=500)
    for p in sf_products_list:
        if p.get("id") not in products_map:
            products_map[p.get("id")] = p
    
    orders_total = {}  # Siparişlerden gelen toplam
    drafts_total = {}  # Taslaklardan gelen toplam
    
    for cust in route_customers:
        cust_id = cust["id"]
        cust_name = cust.get("name", "Bilinmeyen")
        
        # Bu müşterinin bugün gönderilmiş siparişi var mı?
        today_orders = await db[COL_ORDERS].find({
            "customer_id": cust_id,
            "status": {"$in": ["submitted", "approved"]},
            "created_at": {"$gte": today_start}
        }, {"_id": 0}).sort("created_at", -1).to_list(length=10)
        
        customer_items = []
        source = "none"
        
        if today_orders:
            # Müşteri sipariş göndermiş
            source = "order"
            for order in today_orders:
                for it in order.get("items", []):
                    pid = it.get("product_id")
                    qty = it.get("qty") or it.get("user_qty") or 0
                    if pid and qty > 0:
                        customer_items.append({
                            "product_id": pid,
                            "qty": qty,
                            "source": "order"
                        })
                        # Sipariş toplamına ekle
                        if pid not in orders_total:
                            orders_total[pid] = 0
                        orders_total[pid] += qty
        else:
            # 16:30'dan sonraysa veya sipariş yoksa taslağı al
            source = "draft"
            # Önce working_copy (müşteri taslağı) kontrol et
            working_copy = await db["sf_working_copies"].find_one(
                {"customer_id": cust_id, "status": "active"},
                {"_id": 0}
            )
            
            if working_copy:
                for it in working_copy.get("items", []):
                    pid = it.get("product_id")
                    qty = it.get("user_qty") or it.get("qty") or 0
                    if pid and qty > 0:
                        customer_items.append({
                            "product_id": pid,
                            "qty": qty,
                            "source": "working_copy"
                        })
                        if pid not in drafts_total:
                            drafts_total[pid] = 0
                        drafts_total[pid] += qty
            else:
                # Sistem taslağını al
                system_draft = await db["sf_system_drafts"].find_one(
                    {"customer_id": cust_id},
                    {"_id": 0}
                )
                if system_draft:
                    for it in system_draft.get("items", []):
                        pid = it.get("product_id")
                        qty = it.get("suggested_qty") or 0
                        if pid and qty > 0:
                            customer_items.append({
                                "product_id": pid,
                                "qty": qty,
                                "source": "system_draft"
                            })
                            if pid not in drafts_total:
                                drafts_total[pid] = 0
                            drafts_total[pid] += qty
        
        # Müşteri detayını ekle
        total_qty = sum(it["qty"] for it in customer_items)
        if total_qty > 0:
            customer_details.append({
                "customer_id": cust_id,
                "customer_name": cust_name,
                "source": source,
                "items": customer_items,
                "total_qty": total_qty
            })
    
    # Tüm ürünleri birleştir ve koli hesapla
    all_product_ids = set(orders_total.keys()) | set(drafts_total.keys())
    
    final_order_items = []
    for pid in all_product_ids:
        prod = products_map.get(pid, {})
        order_qty = orders_total.get(pid, 0)
        draft_qty = drafts_total.get(pid, 0)
        total_need = order_qty + draft_qty
        
        # Koli bilgisi (varsayılan 1)
        box_size = prod.get("box_size") or prod.get("koli_adeti") or 1
        
        # Plasiyer stoğu (şimdilik 0, ileride eklenebilir)
        plasiyer_stock = 0
        
        # Net ihtiyaç
        net_need = max(0, total_need - plasiyer_stock)
        
        # Koli bazında yuvarla (yukarı)
        if box_size > 1 and net_need > 0:
            boxes_needed = -(-net_need // box_size)  # Ceiling division
            final_qty = boxes_needed * box_size
        else:
            final_qty = net_need
        
        if final_qty > 0:
            final_order_items.append({
                "product_id": pid,
                "product_name": prod.get("name", "Bilinmeyen"),
                "product_code": prod.get("code", ""),
                "order_qty": order_qty,  # Siparişlerden
                "draft_qty": draft_qty,  # Taslaklardan
                "total_need": total_need,
                "plasiyer_stock": plasiyer_stock,
                "net_need": net_need,
                "box_size": box_size,
                "final_qty": final_qty,  # Koli bazında yuvarlanmış
                "boxes": final_qty // box_size if box_size > 1 else final_qty
            })
    
    # Sırala (miktar bazında azalan)
    final_order_items.sort(key=lambda x: x["final_qty"], reverse=True)
    
    # Özet istatistikler
    order_customer_count = sum(1 for c in customer_details if c["source"] == "order")
    draft_customer_count = sum(1 for c in customer_details if c["source"] == "draft")
    
    return std_resp(True, {
        "route_day": route_day,
        "route_day_label": {
            "MON": "Pazartesi", "TUE": "Salı", "WED": "Çarşamba",
            "THU": "Perşembe", "FRI": "Cuma", "SAT": "Cumartesi", "SUN": "Pazar"
        }.get(route_day, route_day),
        "is_after_cutoff": is_after_cutoff,
        "cutoff_time": "16:30",
        "customer_count": len(customer_details),
        "order_customer_count": order_customer_count,
        "draft_customer_count": draft_customer_count,
        "customers": customer_details,
        "order_items": final_order_items,
        "total_order_qty": sum(it["final_qty"] for it in final_order_items),
        "total_products": len(final_order_items)
    })


# ===========================
# 8. POST /warehouse-draft/submit - Depoya Gönder
# ===========================
class WarehouseSubmitBody(BaseModel):
    note: str = ""


# ===========================
# 9. GET /customers/summary - Müşteri Kartları için Özet Veri
# ===========================
@router.get("/customers/summary")
async def get_customers_summary(current_user=Depends(require_role(SALES_ROLES))):
    """
    Plasiyer müşteri kartları için özet veriler:
    - Vadesi geçmiş faturalar
    - Bekleyen siparişler
    - Son teslimat tarihi
    - Toplam sipariş sayısı
    """
    from datetime import datetime, timedelta
    
    # Tüm aktif müşterileri al
    cursor = db[COL_CUSTOMERS].find({"is_active": True}, {"_id": 0})
    customers = await cursor.to_list(length=500)
    
    customer_summaries = []
    
    for cust in customers:
        cust_id = cust["id"]
        
        # Bekleyen siparişler (submitted veya approved)
        pending_orders = await db[COL_ORDERS].find({
            "customer_id": cust_id,
            "status": {"$in": ["submitted", "approved"]}
        }, {"_id": 0, "id": 1, "status": 1, "items": 1, "created_at": 1}).to_list(length=50)
        
        # Toplam siparişler
        total_orders = await db[COL_ORDERS].count_documents({"customer_id": cust_id})
        
        # Son teslimat
        last_delivery = await db[COL_DELIVERIES].find_one(
            {"customer_id": cust_id, "acceptance_status": "accepted"},
            {"_id": 0, "delivered_at": 1, "items": 1}
        )
        
        # Vadesi geçmiş teslimatlar (beklemede olan ve 7 günden eski)
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat() + "Z"
        overdue_deliveries = await db[COL_DELIVERIES].count_documents({
            "customer_id": cust_id,
            "acceptance_status": "pending",
            "delivered_at": {"$lt": seven_days_ago}
        })
        
        # Toplam teslimat
        total_deliveries = await db[COL_DELIVERIES].count_documents({"customer_id": cust_id})
        
        # Son sipariş tarihi
        last_order = await db[COL_ORDERS].find_one(
            {"customer_id": cust_id},
            {"_id": 0, "created_at": 1}
        )
        
        # Son sipariş kaç gün önce
        days_since_last_order = None
        if last_order:
            try:
                last_date = datetime.fromisoformat(last_order["created_at"].replace("Z", "+00:00"))
                days_since_last_order = (datetime.now(last_date.tzinfo) - last_date).days
            except:
                pass
        
        customer_summaries.append({
            **cust,
            "pending_orders_count": len(pending_orders),
            "pending_orders": pending_orders[:3],  # İlk 3 bekleyen sipariş
            "total_orders": total_orders,
            "overdue_deliveries_count": overdue_deliveries,
            "total_deliveries": total_deliveries,
            "last_delivery_date": last_delivery.get("delivered_at") if last_delivery else None,
            "last_order_date": last_order.get("created_at") if last_order else None,
            "days_since_last_order": days_since_last_order
        })
    
    return std_resp(True, customer_summaries)


@router.post("/warehouse-draft/submit")
async def submit_warehouse_draft(body: WarehouseSubmitBody, current_user=Depends(require_role(SALES_ROLES))):
    """
    Depo sipariş taslağını depoya gönderir.
    Saat 17:00 kontrolü frontend'de yapılır.
    """
    from datetime import datetime, timedelta
    
    # Yarının gün kodunu bul
    tomorrow = datetime.utcnow() + timedelta(days=1)
    day_codes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    tomorrow_code = day_codes[tomorrow.weekday()]
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
    
    # Yarın rutu olan müşterileri bul
    cursor = db[COL_CUSTOMERS].find(
        {"is_active": True, "route_plan.days": tomorrow_code},
        {"_id": 0}
    )
    tomorrow_customers = await cursor.to_list(length=500)
    
    all_items = []
    customer_details = []
    
    for cust in tomorrow_customers:
        cust_id = cust["id"]
        
        # Bugün gönderilmiş sipariş var mı?
        today_order = await db[COL_ORDERS].find_one({
            "customer_id": cust_id,
            "status": {"$in": ["submitted", "approved"]},
            "created_at": {"$gte": today_start}
        }, {"_id": 0})
        
        if today_order:
            items = today_order.get("items", [])
            source = "order"
        else:
            system_draft = await db["system_drafts"].find_one({"customer_id": cust_id}, {"_id": 0})
            items = system_draft.get("items", []) if system_draft else []
            source = "draft"
        
        for it in items:
            qty = it.get("qty") or it.get("suggested_qty") or 0
            if qty > 0:
                all_items.append({
                    "product_id": it.get("product_id"),
                    "qty": qty,
                    "customer_id": cust_id
                })
        
        customer_details.append({
            "customer_id": cust_id,
            "customer_name": cust.get("name"),
            "source": source
        })
    
    # Ürün bazında topla
    product_totals = {}
    for it in all_items:
        pid = it["product_id"]
        if pid not in product_totals:
            product_totals[pid] = 0
        product_totals[pid] += it["qty"]
    
    # Depo siparişi oluştur
    now = now_utc()
    warehouse_order = {
        "id": gen_id(),
        "type": "warehouse_order",
        "route_day": tomorrow_code,
        "submitted_by": current_user.id,
        "submitted_at": to_iso(now),
        "note": body.note,
        "status": "submitted",
        "customer_count": len(tomorrow_customers),
        "customer_details": customer_details,
        "items": [{"product_id": pid, "qty": qty} for pid, qty in product_totals.items()],
        "total_qty": sum(product_totals.values()),
        "created_at": to_iso(now)
    }
    
    await db["warehouse_orders"].insert_one(warehouse_order)
    warehouse_order.pop("_id", None)
    
    return std_resp(True, warehouse_order, "Depo siparisi basariyla gonderildi")



# ===========================
# Kampanya Siparişe Ekle
# ===========================
class CampaignOrderItem(BaseModel):
    campaign_id: str
    customer_id: str
    qty: int  # Kampanya miktarı


@router.post("/campaigns/add-to-order")
async def add_campaign_to_order(
    body: CampaignOrderItem,
    current_user=Depends(require_role(SALES_ROLES)),
):
    """
    Kampanyayı müşteri siparişine/working_copy'ye ekler.
    
    Kampanya türlerine göre:
    - discount: Sadece ürün eklenir (indirimli fiyatla)
    - gift: Ürün + hediye ürünü eklenir
    """
    from services.seftali.utils import now_utc, to_iso
    
    # Kampanya kontrolü
    campaign = await db["sf_campaigns"].find_one(
        {"id": body.campaign_id, "status": "active"},
        {"_id": 0}
    )
    if not campaign:
        raise HTTPException(404, "Kampanya bulunamadı veya aktif değil")
    
    # Müşteri kontrolü
    customer = await db[COL_CUSTOMERS].find_one(
        {"id": body.customer_id, "is_active": True},
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(404, "Müşteri bulunamadı")
    
    # Minimum miktar kontrolü
    min_qty = campaign.get("min_qty", 1)
    if body.qty < min_qty:
        raise HTTPException(400, f"Minimum {min_qty} adet sipariş gerekli")
    
    now = now_utc()
    
    # Mevcut working_copy'yi al veya oluştur
    working_copy = await db["sf_working_copies"].find_one(
        {"customer_id": body.customer_id, "status": "active"},
        {"_id": 0}
    )
    
    items_to_add = []
    
    # Ana ürün
    main_item = {
        "product_id": campaign.get("product_id"),
        "product_name": campaign.get("product_name"),
        "qty": body.qty,
        "user_qty": body.qty,
        "unit_price": campaign.get("campaign_price") or campaign.get("normal_price"),
        "source": "campaign",
        "campaign_id": body.campaign_id,
        "campaign_title": campaign.get("title")
    }
    items_to_add.append(main_item)
    
    # Hediyeli kampanya ise hediye ürünü de ekle
    if campaign.get("type") == "gift" and campaign.get("gift_product_id"):
        gift_qty = campaign.get("gift_qty", 1) * (body.qty // min_qty)  # Her min_qty için 1 hediye
        gift_item = {
            "product_id": campaign.get("gift_product_id"),
            "product_name": campaign.get("gift_product_name"),
            "qty": gift_qty,
            "user_qty": gift_qty,
            "unit_price": 0,  # Hediye ücretsiz
            "source": "campaign_gift",
            "campaign_id": body.campaign_id,
            "campaign_title": campaign.get("title") + " (Hediye)"
        }
        items_to_add.append(gift_item)
    
    if working_copy:
        # Mevcut working_copy'ye ekle
        existing_items = working_copy.get("items", [])
        
        for new_item in items_to_add:
            # Aynı ürün var mı kontrol et
            found = False
            for i, ex_item in enumerate(existing_items):
                if ex_item.get("product_id") == new_item["product_id"]:
                    # Miktarı güncelle
                    existing_items[i]["qty"] = existing_items[i].get("qty", 0) + new_item["qty"]
                    existing_items[i]["user_qty"] = existing_items[i]["qty"]
                    found = True
                    break
            
            if not found:
                existing_items.append(new_item)
        
        await db["sf_working_copies"].update_one(
            {"customer_id": body.customer_id, "status": "active"},
            {
                "$set": {
                    "items": existing_items,
                    "updated_at": to_iso(now)
                }
            }
        )
    else:
        # Yeni working_copy oluştur
        new_working_copy = {
            "id": gen_id(),
            "customer_id": body.customer_id,
            "status": "active",
            "items": items_to_add,
            "created_at": to_iso(now),
            "updated_at": to_iso(now),
            "created_by": current_user.id
        }
        await db["sf_working_copies"].insert_one(new_working_copy)
    
    # Sonucu döndür
    result = {
        "customer_id": body.customer_id,
        "customer_name": customer.get("name"),
        "campaign_id": body.campaign_id,
        "campaign_title": campaign.get("title"),
        "items_added": items_to_add,
        "total_qty": sum(i["qty"] for i in items_to_add)
    }
    
    return std_resp(True, result, "Kampanya siparişe eklendi")


@router.get("/campaigns")
async def list_campaigns_for_sales(
    current_user=Depends(require_role(SALES_ROLES)),
):
    """Plasiyer için aktif kampanyaları listele"""
    from services.seftali.utils import now_utc
    
    now = now_utc().isoformat()[:10]
    
    cursor = db["sf_campaigns"].find(
        {
            "status": "active",
            "valid_until": {"$gte": now}
        },
        {"_id": 0}
    ).sort("created_at", -1)
    
    campaigns = await cursor.to_list(length=50)
    return std_resp(True, campaigns)
