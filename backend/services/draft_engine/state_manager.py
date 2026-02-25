# Draft Engine - Customer Product State Manager
# customer_product_state koleksiyonunu yöneten servis

from typing import Optional, List, Dict, Any
from datetime import date, datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

from .constants import (
    COL_CUSTOMER_PRODUCT_STATE,
    COL_CUSTOMERS,
    COL_PRODUCTS,
    SMA_WINDOW
)
from .helpers import (
    gen_id, now_utc, today_date, to_iso_date, to_date,
    days_between_deliveries, get_next_route_date,
    calculate_days_to_next_route, get_week_start
)
from .formulas import (
    calculate_interval_rate,
    calculate_rate_mt,
    calculate_rate_used,
    calculate_need_qty,
    determine_maturity_mode,
    should_passivate,
    can_generate_draft
)


class CustomerProductStateManager:
    """
    Customer-Product State yönetim sınıfı.
    
    Her (customer_id, product_id) çifti için tek bir state document tutar.
    Bu document draft hesaplama için tek kaynak (source of truth).
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.col = db[COL_CUSTOMER_PRODUCT_STATE]
    
    async def get_state(
        self,
        customer_id: str,
        product_id: str
    ) -> Optional[Dict[str, Any]]:
        """Mevcut state'i getirir"""
        return await self.col.find_one(
            {"customer_id": customer_id, "product_id": product_id},
            {"_id": 0}
        )
    
    async def get_or_create_state(
        self,
        customer_id: str,
        product_id: str,
        initial_date: date
    ) -> Dict[str, Any]:
        """
        State varsa getirir, yoksa yeni oluşturur.
        
        Yeni state first_seen_at = initial_date ile oluşturulur.
        """
        state = await self.get_state(customer_id, product_id)
        
        if state:
            return state
        
        # Yeni state oluştur
        new_state = {
            "customer_id": customer_id,
            "product_id": product_id,
            
            # Maturity
            "first_seen_at": to_iso_date(initial_date),
            "last_seen_at": to_iso_date(initial_date),
            "delivery_count": 0,
            
            # Son iki teslimat (Model B için)
            "last_delivery_date": None,
            "last_delivery_qty": None,
            "prev_delivery_date": None,
            "prev_delivery_qty": None,
            
            # Intervals
            "interval_count": 0,
            "interval_rates": [],  # Max 8 eleman
            
            # Computed rates
            "rate_mt": None,
            "is_active": True,
            
            # Cached draft
            "next_route_date": None,
            "days_to_next_route": None,
            "need_qty": None,
            
            # Multiplier context
            "week_start": None,
            "weekly_multiplier": None,
            "rate_used": None,
            
            # Housekeeping
            "updated_at": now_utc().isoformat()
        }
        
        await self.col.insert_one(new_state.copy())
        return new_state
    
    async def process_delivery(
        self,
        customer_id: str,
        product_id: str,
        delivery_date: date,
        qty: float,
        depot_id: str,
        segment_id: str,
        route_weekdays: List[int],
        get_multiplier_func
    ) -> Dict[str, Any]:
        """
        Yeni teslimat işlenir ve state güncellenir.
        
        Event processing contract'ın ana fonksiyonu.
        
        Args:
            customer_id: Müşteri ID
            product_id: Ürün ID
            delivery_date: Teslimat tarihi
            qty: Teslimat miktarı
            depot_id: Depo ID (multiplier için)
            segment_id: Segment ID (multiplier için)
            route_weekdays: Müşteri rut günleri
            get_multiplier_func: Çarpan getiren async fonksiyon
            
        Returns:
            Güncellenmiş state
        """
        # 1. State'i getir veya oluştur
        state = await self.get_or_create_state(customer_id, product_id, delivery_date)
        
        today = today_date()
        
        # 2. delivery_count artır, last_seen_at güncelle
        old_delivery_count = state["delivery_count"]
        state["delivery_count"] = old_delivery_count + 1
        state["last_seen_at"] = to_iso_date(delivery_date)
        
        # 3. Son teslimatları kaydır: last -> prev, current -> last
        state["prev_delivery_date"] = state["last_delivery_date"]
        state["prev_delivery_qty"] = state["last_delivery_qty"]
        state["last_delivery_date"] = to_iso_date(delivery_date)
        state["last_delivery_qty"] = qty
        
        # 4. Interval hesapla (delivery_count >= 2 ise)
        interval_rate = None
        if state["delivery_count"] >= 2 and state["prev_delivery_date"] and state["prev_delivery_qty"]:
            prev_date = to_date(state["prev_delivery_date"])
            curr_date = delivery_date
            prev_qty = state["prev_delivery_qty"]
            
            # Günlük oran hesapla
            rate, days = calculate_interval_rate(prev_date, curr_date, prev_qty)
            interval_rate = rate
            
            # interval_rates'e ekle (max 8)
            rates = state.get("interval_rates", [])
            rates.append(rate)
            if len(rates) > SMA_WINDOW:
                rates = rates[-SMA_WINDOW:]
            state["interval_rates"] = rates
            state["interval_count"] = state.get("interval_count", 0) + 1
            
            # rate_mt hesapla (SMA)
            state["rate_mt"] = calculate_rate_mt(rates)
        
        # 5. Multiplier lookup
        week_start = get_week_start(today)
        multiplier = await get_multiplier_func(depot_id, segment_id, product_id, week_start)
        state["week_start"] = to_iso_date(week_start)
        state["weekly_multiplier"] = multiplier
        
        # 6. rate_used hesapla
        rate_used = calculate_rate_used(state["rate_mt"], multiplier)
        state["rate_used"] = rate_used
        
        # 7. Pasifleştirme kontrolü - Yeni teslimat varsa aktifleştir
        state["is_active"] = True  # Teslimat geldi = aktif
        
        # 8. Next route hesapla
        next_route = get_next_route_date(route_weekdays, today)
        if next_route:
            state["next_route_date"] = to_iso_date(next_route)
            state["days_to_next_route"] = calculate_days_to_next_route(today, next_route)
        else:
            state["next_route_date"] = None
            state["days_to_next_route"] = None
        
        # 9. Draft need_qty hesapla
        # Önce maturity mode belirle
        first_seen = to_date(state["first_seen_at"])
        age_days = (today - first_seen).days
        mode = determine_maturity_mode(
            state["delivery_count"],
            state["interval_count"],
            age_days
        )
        
        if can_generate_draft(mode, state["is_active"]) and state["days_to_next_route"]:
            state["need_qty"] = calculate_need_qty(rate_used, state["days_to_next_route"])
        else:
            state["need_qty"] = None
        
        # 10. Kaydet
        state["updated_at"] = now_utc().isoformat()
        
        await self.col.update_one(
            {"customer_id": customer_id, "product_id": product_id},
            {"$set": state},
            upsert=True
        )
        
        return state
    
    async def recalculate_draft(
        self,
        customer_id: str,
        product_id: str,
        depot_id: str,
        segment_id: str,
        route_weekdays: List[int],
        get_multiplier_func
    ) -> Optional[Dict[str, Any]]:
        """
        Mevcut state için draft'ı yeniden hesaplar.
        
        Teslimat olmadan sadece draft güncelleme için kullanılır.
        Örneğin: Rut günü değişikliği, multiplier güncellenmesi
        """
        state = await self.get_state(customer_id, product_id)
        if not state:
            return None
        
        today = today_date()
        
        # Multiplier güncelle
        week_start = get_week_start(today)
        multiplier = await get_multiplier_func(depot_id, segment_id, product_id, week_start)
        state["week_start"] = to_iso_date(week_start)
        state["weekly_multiplier"] = multiplier
        
        # rate_used güncelle
        rate_used = calculate_rate_used(state["rate_mt"], multiplier)
        state["rate_used"] = rate_used
        
        # Pasifleştirme kontrolü
        if state["last_delivery_date"] and state["last_delivery_qty"] and rate_used:
            last_date = to_date(state["last_delivery_date"])
            days_since = (today - last_date).days
            
            if should_passivate(days_since, state["last_delivery_qty"], rate_used):
                state["is_active"] = False
        
        # Next route güncelle
        next_route = get_next_route_date(route_weekdays, today)
        if next_route:
            state["next_route_date"] = to_iso_date(next_route)
            state["days_to_next_route"] = calculate_days_to_next_route(today, next_route)
        else:
            state["next_route_date"] = None
            state["days_to_next_route"] = None
        
        # Draft need_qty hesapla
        first_seen = to_date(state["first_seen_at"])
        age_days = (today - first_seen).days
        mode = determine_maturity_mode(
            state["delivery_count"],
            state["interval_count"],
            age_days
        )
        
        if can_generate_draft(mode, state["is_active"]) and state["days_to_next_route"]:
            state["need_qty"] = calculate_need_qty(rate_used, state["days_to_next_route"])
        else:
            state["need_qty"] = None
        
        # Kaydet
        state["updated_at"] = now_utc().isoformat()
        
        await self.col.update_one(
            {"customer_id": customer_id, "product_id": product_id},
            {"$set": state}
        )
        
        return state
    
    async def get_customer_draft(self, customer_id: str) -> List[Dict[str, Any]]:
        """
        Bir müşterinin tüm aktif ürünleri için draft listesi.
        
        Returns:
            Aktif ve need_qty > 0 olan ürünlerin listesi
        """
        cursor = self.col.find(
            {
                "customer_id": customer_id,
                "is_active": True,
                "need_qty": {"$gt": 0}
            },
            {"_id": 0}
        ).sort("need_qty", -1)
        
        return await cursor.to_list(length=500)
    
    async def get_all_states_for_customer(self, customer_id: str) -> List[Dict[str, Any]]:
        """Bir müşterinin tüm ürün state'lerini getirir"""
        cursor = self.col.find(
            {"customer_id": customer_id},
            {"_id": 0}
        )
        return await cursor.to_list(length=500)
    
    async def passivate_check_all(self, customer_id: str, get_multiplier_func) -> int:
        """
        Bir müşterinin tüm ürünlerini pasifleştirme kontrolü.
        
        Returns:
            Pasifleştirilen ürün sayısı
        """
        states = await self.get_all_states_for_customer(customer_id)
        today = today_date()
        passivated = 0
        
        for state in states:
            if not state["is_active"]:
                continue
            
            if not state["last_delivery_date"] or not state["rate_used"]:
                continue
            
            last_date = to_date(state["last_delivery_date"])
            days_since = (today - last_date).days
            
            if should_passivate(days_since, state["last_delivery_qty"], state["rate_used"]):
                await self.col.update_one(
                    {"customer_id": customer_id, "product_id": state["product_id"]},
                    {"$set": {"is_active": False, "need_qty": None, "updated_at": now_utc().isoformat()}}
                )
                passivated += 1
        
        return passivated
