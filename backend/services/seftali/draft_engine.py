"""
ŞEFTALİ - Draft Engine 2.0
Gelişmiş tahmini ihtiyaç hesaplama motoru

Kullanılan Parametreler:
- prev_delivery_qty: Önceki teslimat miktarı
- prev_delivery_date: Önceki teslimat tarihi
- curr_delivery_date: Son teslimat tarihi
- interval_rates: Son N interval'in günlük tüketim oranları
- weekly_multiplier: Haftalık mevsimsellik çarpanı
- today_date: Bugünün tarihi
- next_route_date: Sonraki rut tarihi
- supply_days: Ardışık rutlar arası gün sayısı

Hesaplama Formülü:
    daily_rate = prev_qty / days_between (her interval için)
    rate_mt = SMA(son 8 interval rate)
    rate_used = rate_mt × weekly_multiplier
    need_qty = rate_used × supply_days
"""

from typing import Dict, List, Any, Optional
from datetime import timedelta
from config.database import db

from .core import (
    now_utc, to_iso, parse_date, get_route_info,
    SMA_WINDOW, EPSILON, WEEKDAY_NAMES,
    COL_CUSTOMERS, COL_PRODUCTS, COL_DELIVERIES,
    COL_SYSTEM_DRAFTS, COL_DE_STATE, COL_DE_MULTIPLIERS
)


class DraftEngine:
    """
    Draft Engine 2.0 - Ana hesaplama sınıfı
    
    Bu sınıf müşteri bazında tahmini ihtiyaç hesaplaması yapar.
    SMA (Simple Moving Average) tabanlı, interval-based bir algoritma kullanır.
    """
    
    # =========================================================================
    # PUBLIC METHODS
    # =========================================================================
    
    @classmethod
    async def calculate(cls, customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Müşteri için tahmini ihtiyaç hesapla.
        
        Args:
            customer_id: Müşteri ID'si
            
        Returns:
            Draft objesi veya None
        """
        now = now_utc()
        today = now.date()
        
        # Müşteri bilgisi
        customer = await db[COL_CUSTOMERS].find_one(
            {"id": customer_id}, {"_id": 0}
        )
        if not customer:
            return None
        
        route_days = customer.get("route_plan", {}).get("days", [])
        route_info = get_route_info(route_days)
        
        # Ürün durumlarını al
        states = await cls._get_product_states(customer_id)
        if not states:
            return cls._empty_draft(customer_id, customer, route_info, now)
        
        # Ürün bilgileri
        product_ids = [s["product_id"] for s in states]
        products = await cls._get_products(product_ids)
        
        # Haftalık çarpanlar
        multipliers = await cls._get_weekly_multipliers(today)
        
        # Her ürün için hesapla
        items = []
        for state in states:
            item = cls._calculate_item(state, products, multipliers, route_info, today)
            items.append(item)
        
        # Sırala (yüksek ihtiyaçtan düşüğe)
        items.sort(key=lambda x: (x.get("need_qty") or 0), reverse=True)
        for i, item in enumerate(items):
            item["priority_rank"] = i + 1
        
        # Next route date
        next_route_date = (today + timedelta(days=route_info["days_to_next_route"])).isoformat()
        next_route_weekday = WEEKDAY_NAMES[route_info["next_route_weekday"]] if route_info["next_route_weekday"] is not None else None
        
        return {
            "customer_id": customer_id,
            "customer_name": customer.get("name", ""),
            "route_days": route_days,
            "route_info": {
                "days_to_next_route": route_info["days_to_next_route"],
                "supply_days": route_info["supply_days"],
                "next_route_date": next_route_date,
                "next_route_weekday": next_route_weekday
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
    
    @classmethod
    async def save(cls, customer_id: str, source: str = "system") -> Optional[dict]:
        """
        Hesaplanan draft'ı veritabanına kaydet.
        
        Args:
            customer_id: Müşteri ID'si
            source: Kaynak (system, delivery_event, route_change, vb.)
            
        Returns:
            Kaydedilen draft veya None
        """
        draft = await cls.calculate(customer_id)
        if not draft:
            return None
        
        now = now_utc()
        
        # Legacy format için dönüştür
        legacy_items = []
        for item in draft.get("items", []):
            legacy_items.append({
                "product_id": item["product_id"],
                "suggested_qty": item.get("suggested_qty", 0),
                "rate_mt": item.get("rate_mt"),
                "rate_used": item.get("rate_used"),
                "weekly_multiplier": item.get("weekly_multiplier"),
                "supply_days": item.get("supply_days"),
                "interval_count": item.get("interval_count"),
                "last_delivery_qty": item.get("last_delivery_qty"),
                "last_delivery_date": item.get("last_delivery_date"),
                "risk_score": item.get("risk_score"),
                "priority_rank": item.get("priority_rank", 0),
                "flags": item.get("flags", {})
            })
        
        draft_doc = {
            "customer_id": customer_id,
            "generated_from": source,
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
    
    @classmethod
    async def process_delivery(
        cls,
        customer_id: str,
        product_id: str,
        delivery_date: str,
        delivery_qty: float
    ) -> None:
        """
        Yeni teslimat geldiğinde state'i güncelle.
        
        Args:
            customer_id: Müşteri ID'si
            product_id: Ürün ID'si
            delivery_date: Teslimat tarihi
            delivery_qty: Teslimat miktarı
        """
        now = now_utc()
        delivery_dt = parse_date(delivery_date)
        
        # Mevcut state
        state = await db[COL_DE_STATE].find_one(
            {"customer_id": customer_id, "product_id": product_id}
        )
        
        if state:
            await cls._update_existing_state(state, delivery_date, delivery_qty, delivery_dt, now)
        else:
            await cls._create_new_state(customer_id, product_id, delivery_date, delivery_qty, now)
        
        # Draft'ı güncelle
        await cls.save(customer_id, "delivery_event")
    
    # =========================================================================
    # PRIVATE METHODS - Data Fetching
    # =========================================================================
    
    @classmethod
    async def _get_product_states(cls, customer_id: str) -> List[dict]:
        """Müşterinin aktif ürün durumlarını getir."""
        cursor = db[COL_DE_STATE].find(
            {"customer_id": customer_id, "is_active": True},
            {"_id": 0}
        )
        return await cursor.to_list(length=500)
    
    @classmethod
    async def _get_products(cls, product_ids: List[str]) -> Dict[str, dict]:
        """Ürün bilgilerini getir."""
        cursor = db[COL_PRODUCTS].find(
            {"product_id": {"$in": product_ids}},
            {"_id": 0}
        )
        products = await cursor.to_list(length=500)
        return {p["product_id"]: p for p in products}
    
    @classmethod
    async def _get_weekly_multipliers(cls, today) -> Dict[str, float]:
        """Haftalık çarpanları getir."""
        week_start = today - timedelta(days=today.weekday())
        cursor = db[COL_DE_MULTIPLIERS].find(
            {"week_start": week_start.isoformat()},
            {"_id": 0}
        )
        multipliers = await cursor.to_list(length=500)
        return {m["product_id"]: m.get("multiplier", 1.0) for m in multipliers}
    
    # =========================================================================
    # PRIVATE METHODS - Calculation
    # =========================================================================
    
    @classmethod
    def _calculate_item(
        cls,
        state: dict,
        products: Dict[str, dict],
        multipliers: Dict[str, float],
        route_info: dict,
        today
    ) -> dict:
        """Tek bir ürün için hesaplama yap."""
        pid = state["product_id"]
        product = products.get(pid, {})
        
        # Parametreler
        prev_delivery_qty = state.get("prev_delivery_qty")
        prev_delivery_date = state.get("prev_delivery_date")
        last_delivery_date = state.get("last_delivery_date")
        last_delivery_qty = state.get("last_delivery_qty")
        interval_rates = state.get("interval_rates", [])
        
        # Weekly multiplier
        weekly_multiplier = multipliers.get(pid, state.get("weekly_multiplier", 1.0))
        
        # Rate MT (SMA)
        rate_mt = state.get("rate_mt")
        if rate_mt is None and interval_rates:
            rates_to_use = interval_rates[-SMA_WINDOW:]
            rate_mt = sum(rates_to_use) / len(rates_to_use) if rates_to_use else None
        
        # Rate Used
        rate_used = rate_mt * weekly_multiplier if rate_mt else None
        
        # Need Qty
        need_qty = None
        if rate_used and rate_used > EPSILON:
            need_qty = round(rate_used * route_info["supply_days"], 2)
        
        # Days since last delivery
        last_dt = parse_date(last_delivery_date)
        days_since_last = (today - last_dt).days if last_dt else None
        
        # Estimated depletion
        estimated_depletion = None
        if rate_used and rate_used > EPSILON and last_delivery_qty:
            days_to_deplete = last_delivery_qty / rate_used
            estimated_depletion = (today + timedelta(days=days_to_deplete)).isoformat()
        
        # Risk score
        risk_score = None
        if rate_used and rate_used > EPSILON and last_delivery_qty:
            days_stock_lasts = last_delivery_qty / rate_used
            risk_score = round(days_stock_lasts - route_info["days_to_next_route"], 2)
        
        # Maturity
        delivery_count = state.get("delivery_count", 0)
        interval_count = state.get("interval_count", 0)
        age_days = state.get("age_days", 0)
        
        if delivery_count <= 1:
            maturity_mode, maturity_label = "first_time", "İlk Sipariş"
        elif interval_count >= 8 and age_days >= 365:
            maturity_mode, maturity_label = "mature", "Olgun"
        else:
            maturity_mode, maturity_label = "young", "Gelişen"
        
        # SKT risk
        skt_risk = False
        if product.get("shelf_life_days") and need_qty and rate_used:
            coverage_days = need_qty / rate_used if rate_used > EPSILON else 999
            if coverage_days > product["shelf_life_days"] / 2:
                skt_risk = True
        
        return {
            "product_id": pid,
            "product_name": product.get("name", pid),
            "product_code": pid,
            
            # Input parameters
            "prev_delivery_qty": prev_delivery_qty,
            "prev_delivery_date": prev_delivery_date,
            "last_delivery_date": last_delivery_date,
            "last_delivery_qty": last_delivery_qty,
            "interval_rates": interval_rates[-3:],
            "interval_count": interval_count,
            
            # Calculated values
            "rate_mt": round(rate_mt, 4) if rate_mt else None,
            "weekly_multiplier": round(weekly_multiplier, 2),
            "rate_used": round(rate_used, 4) if rate_used else None,
            "supply_days": route_info["supply_days"],
            
            # Result
            "suggested_qty": need_qty or 0,
            "need_qty": need_qty,
            
            # Analysis
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
            
            "priority_rank": 0
        }
    
    @classmethod
    def _empty_draft(cls, customer_id: str, customer: dict, route_info: dict, now) -> dict:
        """Boş draft oluştur."""
        return {
            "customer_id": customer_id,
            "customer_name": customer.get("name", ""),
            "route_days": customer.get("route_plan", {}).get("days", []),
            "route_info": route_info,
            "items": [],
            "summary": {
                "total_products": 0,
                "total_need_qty": 0,
                "products_with_data": 0,
                "products_low_data": 0
            },
            "generated_at": to_iso(now),
            "generated_from": "draft_engine_v2"
        }
    
    # =========================================================================
    # PRIVATE METHODS - State Management
    # =========================================================================
    
    @classmethod
    async def _update_existing_state(cls, state: dict, delivery_date: str, delivery_qty: float, delivery_dt, now):
        """Mevcut state'i güncelle."""
        prev_date = parse_date(state.get("last_delivery_date"))
        prev_qty = state.get("last_delivery_qty")
        
        # Yeni interval rate hesapla
        new_rate = None
        if prev_date and prev_qty and delivery_dt:
            days_between = (delivery_dt - prev_date).days
            if days_between > 0:
                new_rate = prev_qty / days_between
        
        # interval_rates güncelle
        interval_rates = state.get("interval_rates", [])
        if new_rate is not None:
            interval_rates.append(round(new_rate, 4))
            interval_rates = interval_rates[-SMA_WINDOW:]
        
        # Yeni rate_mt
        rate_mt = sum(interval_rates) / len(interval_rates) if interval_rates else None
        
        # Route bilgisi
        customer = await db[COL_CUSTOMERS].find_one({"id": state["customer_id"]}, {"_id": 0})
        route_days = customer.get("route_plan", {}).get("days", []) if customer else []
        route_info = get_route_info(route_days)
        
        # need_qty
        multiplier = state.get("weekly_multiplier", 1.0)
        need_qty = round(rate_mt * multiplier * route_info["supply_days"], 2) if rate_mt else None
        
        # Age days
        first_seen = parse_date(state.get("first_seen_at"))
        age_days = (now.date() - first_seen).days if first_seen else 0
        
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
    
    @classmethod
    async def _create_new_state(cls, customer_id: str, product_id: str, delivery_date: str, delivery_qty: float, now):
        """Yeni state oluştur."""
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


# Backward compatibility alias
DraftService = DraftEngine
