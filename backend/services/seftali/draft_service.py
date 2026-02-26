"""
Draft Service - Draft Engine 2.0 Entegrasyonu
Tüm parametreleri kullanan gelişmiş hesaplama
"""
from config.database import db
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

# Constants
SMA_WINDOW = 8
EPSILON = 1e-6
DAY_MAP = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6}
WEEKDAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

# Collections
COL_CUSTOMERS = "sf_customers"
COL_PRODUCTS = "products"
COL_DELIVERIES = "sf_deliveries"
COL_SYSTEM_DRAFTS = "sf_system_drafts"
COL_DE_STATE = "de_customer_product_state"
COL_DE_MULTIPLIERS = "de_weekly_product_multipliers"


def now_utc():
    return datetime.now(timezone.utc)


def to_iso(dt):
    return dt.isoformat() if dt else None


def parse_date(date_str):
    """ISO date string'i date objesine çevir"""
    if not date_str:
        return None
    if isinstance(date_str, datetime):
        return date_str.date()
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
    except:
        return None


def get_route_info(route_days: List[str]) -> Dict[str, int]:
    """
    Rota günlerinden hesaplama bilgilerini çıkar.
    
    Returns:
        {
            "days_to_next_route": int,  # Sonraki ruta gün sayısı
            "supply_days": int,         # Ardışık rutlar arası gün
            "next_route_weekday": int   # Sonraki rut günü (0=Pzt)
        }
    """
    if not route_days:
        return {"days_to_next_route": 7, "supply_days": 7, "next_route_weekday": None}
    
    today_weekday = now_utc().weekday()
    route_weekdays = sorted(set(DAY_MAP.get(d, 0) for d in route_days))
    
    # Days to next route
    min_days = 8
    next_route_wd = None
    for rd in route_weekdays:
        diff = (rd - today_weekday) % 7
        if diff == 0:
            diff = 7
        if diff < min_days:
            min_days = diff
            next_route_wd = rd
    
    # Supply days (minimum gap between routes)
    supply_days = 7
    if len(route_weekdays) >= 2:
        min_gap = 7
        for i in range(len(route_weekdays)):
            curr = route_weekdays[i]
            next_idx = (i + 1) % len(route_weekdays)
            next_rd = route_weekdays[next_idx]
            gap = (next_rd - curr) % 7
            if gap == 0:
                gap = 7
            if gap < min_gap:
                min_gap = gap
        supply_days = min_gap
    
    return {
        "days_to_next_route": min_days,
        "supply_days": supply_days,
        "next_route_weekday": next_route_wd
    }


class DraftService:
    """
    Draft Engine 2.0 Entegrasyonu
    
    Kullanılan parametreler:
    - prev_delivery_qty: Önceki teslimat miktarı
    - prev_delivery_date: Önceki teslimat tarihi
    - curr_delivery_date: Son teslimat tarihi
    - interval_rates: Son 8 interval'in günlük tüketim oranları
    - weekly_multiplier: Haftalık mevsimsellik çarpanı
    - today_date: Bugünün tarihi
    - next_route_date: Sonraki rut tarihi
    """
    
    @staticmethod
    async def calculate_draft_for_customer(customer_id: str) -> Dict[str, Any]:
        """
        Müşteri için draft hesapla - Draft Engine 2.0 formülleri ile.
        
        Formül:
            daily_rate = prev_qty / days_between (her interval için)
            rate_mt = SMA(son 8 interval rate)
            rate_used = rate_mt × weekly_multiplier
            need_qty = rate_used × supply_days
        """
        now = now_utc()
        today = now.date()
        
        # Müşteri bilgisi
        customer = await db[COL_CUSTOMERS].find_one({"id": customer_id}, {"_id": 0})
        if not customer:
            return None
        
        route_days = customer.get("route_plan", {}).get("days", [])
        route_info = get_route_info(route_days)
        
        # de_customer_product_state'den verileri çek
        cursor = db[COL_DE_STATE].find(
            {"customer_id": customer_id, "is_active": True},
            {"_id": 0}
        )
        states = await cursor.to_list(length=500)
        
        # Ürün bilgilerini al
        product_ids = [s["product_id"] for s in states]
        products_cursor = db[COL_PRODUCTS].find(
            {"product_id": {"$in": product_ids}},
            {"_id": 0}
        )
        products = {p["product_id"]: p for p in await products_cursor.to_list(500)}
        
        # Weekly multipliers (eğer varsa)
        week_start = today - timedelta(days=today.weekday())
        multipliers_cursor = db[COL_DE_MULTIPLIERS].find(
            {"week_start": week_start.isoformat()},
            {"_id": 0}
        )
        multipliers = {m["product_id"]: m.get("multiplier", 1.0) 
                       for m in await multipliers_cursor.to_list(500)}
        
        items = []
        for state in states:
            pid = state["product_id"]
            product = products.get(pid, {})
            
            # Parametreler
            prev_delivery_qty = state.get("prev_delivery_qty")
            prev_delivery_date = parse_date(state.get("prev_delivery_date"))
            last_delivery_date = parse_date(state.get("last_delivery_date"))
            last_delivery_qty = state.get("last_delivery_qty")
            interval_rates = state.get("interval_rates", [])
            
            # Weekly multiplier
            weekly_multiplier = multipliers.get(pid, state.get("weekly_multiplier", 1.0))
            
            # Rate MT (SMA)
            rate_mt = state.get("rate_mt")
            if rate_mt is None and interval_rates:
                rates_to_use = interval_rates[-SMA_WINDOW:]
                rate_mt = sum(rates_to_use) / len(rates_to_use) if rates_to_use else None
            
            # Rate Used (multiplier uygulanmış)
            rate_used = None
            if rate_mt is not None:
                rate_used = rate_mt * weekly_multiplier
            
            # Need Qty
            need_qty = None
            if rate_used is not None and rate_used > EPSILON:
                need_qty = round(rate_used * route_info["supply_days"], 2)
            
            # Son teslimat üzerinden geçen gün
            days_since_last = None
            if last_delivery_date:
                days_since_last = (today - last_delivery_date).days
            
            # Tahmini tükenme tarihi
            estimated_depletion = None
            if rate_used and rate_used > EPSILON and last_delivery_qty:
                days_to_deplete = last_delivery_qty / rate_used
                estimated_depletion = (today + timedelta(days=days_to_deplete)).isoformat()
            
            # Risk score (negatif = stok bitecek)
            risk_score = None
            if rate_used and rate_used > EPSILON and last_delivery_qty:
                days_stock_lasts = last_delivery_qty / rate_used
                risk_score = round(days_stock_lasts - route_info["days_to_next_route"], 2)
            
            # Maturity mode
            delivery_count = state.get("delivery_count", 0)
            interval_count = state.get("interval_count", 0)
            age_days = state.get("age_days", 0)
            
            if delivery_count <= 1:
                maturity_mode = "first_time"
                maturity_label = "İlk Sipariş"
            elif interval_count >= 8 and age_days >= 365:
                maturity_mode = "mature"
                maturity_label = "Olgun"
            else:
                maturity_mode = "young"
                maturity_label = "Gelişen"
            
            # SKT risk kontrolü
            skt_risk = False
            if product.get("shelf_life_days") and need_qty and rate_used:
                coverage_days = need_qty / rate_used if rate_used > EPSILON else 999
                if coverage_days > product["shelf_life_days"] / 2:
                    skt_risk = True
            
            items.append({
                "product_id": pid,
                "product_name": product.get("name", pid),
                "product_code": pid,
                
                # Draft Engine 2.0 Parametreleri
                "prev_delivery_qty": prev_delivery_qty,
                "prev_delivery_date": state.get("prev_delivery_date"),
                "last_delivery_date": state.get("last_delivery_date"),
                "last_delivery_qty": last_delivery_qty,
                "interval_rates": interval_rates[-3:],  # Son 3 göster
                "interval_count": interval_count,
                
                # Hesaplanan değerler
                "rate_mt": round(rate_mt, 4) if rate_mt else None,
                "weekly_multiplier": round(weekly_multiplier, 2),
                "rate_used": round(rate_used, 4) if rate_used else None,
                "supply_days": route_info["supply_days"],
                
                # Final
                "suggested_qty": need_qty or 0,
                "need_qty": need_qty,
                
                # Analiz
                "days_since_last_delivery": days_since_last,
                "estimated_depletion_at": estimated_depletion,
                "risk_score": risk_score,
                "maturity_mode": maturity_mode,
                "maturity_label": maturity_label,
                
                # Flags
                "flags": {
                    "skt_risk": skt_risk,
                    "low_data": interval_count < 3,
                    "new_product": delivery_count <= 1
                },
                
                # Priority
                "priority_rank": 0
            })
        
        # Sıralama ve öncelik
        items.sort(key=lambda x: (x.get("need_qty") or 0), reverse=True)
        for i, item in enumerate(items):
            item["priority_rank"] = i + 1
        
        # Next route date
        next_route_date = (today + timedelta(days=route_info["days_to_next_route"])).isoformat()
        
        return {
            "customer_id": customer_id,
            "customer_name": customer.get("name", ""),
            "route_days": route_days,
            "route_info": {
                "days_to_next_route": route_info["days_to_next_route"],
                "supply_days": route_info["supply_days"],
                "next_route_date": next_route_date,
                "next_route_weekday": WEEKDAY_NAMES[route_info["next_route_weekday"]] if route_info["next_route_weekday"] is not None else None
            },
            "calculation_params": {
                "today_date": today.isoformat(),
                "sma_window": SMA_WINDOW,
                "formula": "need_qty = rate_mt × weekly_multiplier × supply_days"
            },
            "items": items,
            "summary": {
                "total_products": len(items),
                "total_need_qty": sum(i.get("need_qty") or 0 for i in items),
                "products_with_data": len([i for i in items if i.get("rate_mt")]),
                "products_low_data": len([i for i in items if i.get("flags", {}).get("low_data")])
            },
            "generated_at": to_iso(now),
            "generated_from": "draft_engine_v2"
        }
    
    @staticmethod
    async def update_draft_for_customer(customer_id: str, changed_product_ids: list, source: str):
        """
        Müşterin draft'ını hesapla ve kaydet.
        Backward compatible - eski format için de çalışır.
        """
        draft = await DraftService.calculate_draft_for_customer(customer_id)
        
        if not draft:
            return None
        
        now = now_utc()
        
        # sf_system_drafts formatına dönüştür (backward compatibility)
        legacy_items = []
        for item in draft.get("items", []):
            legacy_items.append({
                "product_id": item["product_id"],
                "suggested_qty": item.get("suggested_qty", 0),
                "avg_effective_used": "draft_engine_v2",
                "stock_effective_used": item.get("last_delivery_qty", 0),
                "estimated_finish_at": item.get("estimated_depletion_at"),
                "risk_score": item.get("risk_score"),
                "priority_rank": item.get("priority_rank", 0),
                "flags": item.get("flags", {}),
                # Yeni alanlar
                "rate_mt": item.get("rate_mt"),
                "rate_used": item.get("rate_used"),
                "weekly_multiplier": item.get("weekly_multiplier"),
                "supply_days": item.get("supply_days"),
                "interval_count": item.get("interval_count"),
                "last_delivery_qty": item.get("last_delivery_qty"),
                "last_delivery_date": item.get("last_delivery_date")
            })
        
        draft_doc = {
            "customer_id": customer_id,
            "generated_from": source or "draft_engine_v2",
            "items": legacy_items,
            "route_info": draft.get("route_info"),
            "calculation_params": draft.get("calculation_params"),
            "updated_at": to_iso(now)
        }
        
        await db[COL_SYSTEM_DRAFTS].update_one(
            {"customer_id": customer_id},
            {"$set": draft_doc, "$setOnInsert": {"created_at": to_iso(now)}},
            upsert=True
        )
        
        return draft_doc
    
    @staticmethod
    async def process_delivery_event(
        customer_id: str,
        product_id: str,
        delivery_date: str,
        delivery_qty: float
    ):
        """
        Yeni teslimat geldiğinde state'i güncelle.
        Bu event-driven yaklaşım Draft Engine 2.0'ın temelini oluşturur.
        """
        now = now_utc()
        today = now.date()
        
        # Mevcut state'i al
        state = await db[COL_DE_STATE].find_one(
            {"customer_id": customer_id, "product_id": product_id}
        )
        
        delivery_dt = parse_date(delivery_date)
        
        if state:
            # Mevcut state'i güncelle
            prev_date = parse_date(state.get("last_delivery_date"))
            prev_qty = state.get("last_delivery_qty")
            
            # Yeni interval rate hesapla
            new_rate = None
            if prev_date and prev_qty:
                days_between = (delivery_dt - prev_date).days
                if days_between > 0:
                    new_rate = prev_qty / days_between
            
            # interval_rates güncelle
            interval_rates = state.get("interval_rates", [])
            if new_rate is not None:
                interval_rates.append(round(new_rate, 4))
                interval_rates = interval_rates[-SMA_WINDOW:]  # Son 8
            
            # Yeni rate_mt hesapla
            rate_mt = None
            if interval_rates:
                rate_mt = sum(interval_rates) / len(interval_rates)
            
            # Müşteri route bilgisi
            customer = await db[COL_CUSTOMERS].find_one({"id": customer_id}, {"_id": 0})
            route_days = customer.get("route_plan", {}).get("days", []) if customer else []
            route_info = get_route_info(route_days)
            
            # need_qty hesapla
            need_qty = None
            multiplier = state.get("weekly_multiplier", 1.0)
            if rate_mt:
                rate_used = rate_mt * multiplier
                need_qty = round(rate_used * route_info["supply_days"], 2)
            
            # Age days
            first_seen = parse_date(state.get("first_seen_at"))
            age_days = (today - first_seen).days if first_seen else 0
            
            update_data = {
                "prev_delivery_date": state.get("last_delivery_date"),
                "prev_delivery_qty": state.get("last_delivery_qty"),
                "last_delivery_date": delivery_date,
                "last_delivery_qty": delivery_qty,
                "delivery_count": state.get("delivery_count", 0) + 1,
                "interval_count": len(interval_rates),
                "interval_rates": interval_rates,
                "rate_mt": round(rate_mt, 4) if rate_mt else None,
                "rate_used": round(rate_mt * multiplier, 4) if rate_mt else None,
                "need_qty": need_qty,
                "supply_days": route_info["supply_days"],
                "days_to_next_route": route_info["days_to_next_route"],
                "age_days": age_days,
                "last_seen_at": delivery_date,
                "updated_at": to_iso(now)
            }
            
            await db[COL_DE_STATE].update_one(
                {"_id": state["_id"]},
                {"$set": update_data}
            )
        else:
            # Yeni state oluştur
            new_state = {
                "customer_id": customer_id,
                "product_id": product_id,
                "first_seen_at": delivery_date,
                "last_seen_at": delivery_date,
                "delivery_count": 1,
                "last_delivery_date": delivery_date,
                "last_delivery_qty": delivery_qty,
                "prev_delivery_date": None,
                "prev_delivery_qty": None,
                "interval_count": 0,
                "interval_rates": [],
                "rate_mt": None,
                "weekly_multiplier": 1.0,
                "rate_used": None,
                "need_qty": None,
                "is_active": True,
                "created_at": to_iso(now),
                "updated_at": to_iso(now)
            }
            await db[COL_DE_STATE].insert_one(new_state)
        
        # Draft'ı güncelle
        await DraftService.update_draft_for_customer(customer_id, [product_id], "delivery_event")
