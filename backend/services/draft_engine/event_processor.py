# Draft Engine - Delivery Event Processor
# Teslimat olaylarını işler ve state güncellemelerini tetikler

from typing import Dict, Any, List, Optional
from datetime import date
from motor.motor_asyncio import AsyncIOMotorDatabase

from .constants import (
    COL_DELIVERIES,
    COL_DELIVERY_ITEMS,
    COL_CUSTOMERS,
    COL_ROUTES,
    COL_PROCESSED_EVENTS,
    COL_INTERVAL_LEDGER,
    COL_WORKING_COPIES,
    EVENT_DELIVERY_SLIP_CREATED,
    EVENT_DELIVERY_FINALIZED,
    EVENT_DELIVERY_VOIDED
)
from .helpers import (
    gen_id, now_utc, to_iso_date, to_date,
    days_between_deliveries
)
from .formulas import calculate_interval_rate, distribute_consumption_to_ledger
from .state_manager import CustomerProductStateManager
from .multiplier_service import WeeklyMultiplierService
from .rollup_service import RollupService


class DeliveryEventProcessor:
    """
    Teslimat olaylarını işleyen servis.
    
    Ana görevler:
    1. Idempotency kontrolü
    2. customer_product_state güncelleme
    3. interval_ledger kayıt
    4. daily_totals güncelleme (multiplier için)
    5. rollup güncelleme
    6. working_copy silme
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.state_manager = CustomerProductStateManager(db)
        self.multiplier_service = WeeklyMultiplierService(db)
        self.rollup_service = RollupService(db)
        
        self.deliveries_col = db[COL_DELIVERIES]
        self.delivery_items_col = db[COL_DELIVERY_ITEMS]
        self.customers_col = db[COL_CUSTOMERS]
        self.routes_col = db[COL_ROUTES]
        self.events_col = db[COL_PROCESSED_EVENTS]
        self.ledger_col = db[COL_INTERVAL_LEDGER]
        self.working_copies_col = db[COL_WORKING_COPIES]
    
    async def _check_idempotency(self, event_id: str) -> bool:
        """
        Event daha önce işlenmiş mi kontrol eder.
        
        Returns:
            True ise event işlenebilir, False ise zaten işlenmiş
        """
        try:
            await self.events_col.insert_one({
                "event_id": event_id,
                "processed_at": now_utc().isoformat()
            })
            return True
        except Exception:
            # Duplicate key error = zaten işlenmiş
            return False
    
    async def _get_customer_info(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Müşteri bilgilerini getirir"""
        return await self.customers_col.find_one(
            {"customer_id": customer_id},
            {"_id": 0}
        )
    
    async def _get_route_weekdays(self, customer_id: str) -> List[int]:
        """Müşterinin aktif rut günlerini getirir"""
        # Önce routes koleksiyonundan dene
        route = await self.routes_col.find_one(
            {
                "customer_id": customer_id,
                "effective_to": None  # Aktif rut
            },
            {"_id": 0, "weekdays": 1}
        )
        
        if route and route.get("weekdays"):
            return route["weekdays"]
        
        # Yoksa customer'dan al
        customer = await self._get_customer_info(customer_id)
        if customer:
            return customer.get("route_weekdays", [])
        
        return []
    
    async def _get_multiplier(
        self,
        depot_id: str,
        segment_id: str,
        product_id: str,
        week_start: date
    ) -> float:
        """Multiplier lookup helper"""
        return await self.multiplier_service.get_multiplier(
            depot_id, segment_id, product_id, week_start
        )
    
    async def process_delivery_slip_created(
        self,
        delivery_id: str
    ) -> Dict[str, Any]:
        """
        DELIVERY_SLIP_CREATED eventi işler.
        
        Event Contract (spec'ten):
        1. Idempotency check
        2. Read delivery + delivery_items
        3. For each item: update states, ledger, daily_totals, rollups
        4. Delete working_copy
        
        Args:
            delivery_id: Teslimat ID
            
        Returns:
            İşlem sonucu
        """
        # 1. Idempotency check
        event_id = f"{EVENT_DELIVERY_SLIP_CREATED}:{delivery_id}"
        if not await self._check_idempotency(event_id):
            return {
                "success": False,
                "error": "Event zaten işlenmiş",
                "event_id": event_id
            }
        
        # 2. Delivery ve items'ları oku
        delivery = await self.deliveries_col.find_one(
            {"delivery_id": delivery_id},
            {"_id": 0}
        )
        
        if not delivery:
            return {
                "success": False,
                "error": "Teslimat bulunamadı",
                "delivery_id": delivery_id
            }
        
        items_cursor = self.delivery_items_col.find(
            {"delivery_id": delivery_id},
            {"_id": 0}
        )
        items = await items_cursor.to_list(length=500)
        
        if not items:
            return {
                "success": False,
                "error": "Teslimat kalemleri bulunamadı",
                "delivery_id": delivery_id
            }
        
        # Müşteri bilgisi
        customer_id = delivery["customer_id"]
        customer = await self._get_customer_info(customer_id)
        
        if not customer:
            return {
                "success": False,
                "error": "Müşteri bulunamadı",
                "customer_id": customer_id
            }
        
        depot_id = customer.get("depot_id", "default")
        segment_id = customer.get("segment_id", "default")
        sales_rep_id = customer.get("sales_rep_id")
        route_weekdays = await self._get_route_weekdays(customer_id)
        
        delivery_date = to_date(delivery["delivery_date"])
        
        # 3. Her item için işle
        processed_items = []
        
        for item in items:
            product_id = item["product_id"]
            qty = item["qty"]
            
            # a) Daily totals güncelle (multiplier için)
            await self.multiplier_service.increment_daily_total(
                delivery_date, depot_id, segment_id, product_id, qty
            )
            
            # b) State güncelle
            old_state = await self.state_manager.get_state(customer_id, product_id)
            old_need_qty = old_state.get("need_qty") if old_state else None
            old_next_route = old_state.get("next_route_date") if old_state else None
            
            new_state = await self.state_manager.process_delivery(
                customer_id=customer_id,
                product_id=product_id,
                delivery_date=delivery_date,
                qty=qty,
                depot_id=depot_id,
                segment_id=segment_id,
                route_weekdays=route_weekdays,
                get_multiplier_func=self._get_multiplier
            )
            
            # c) Interval ledger kaydet (interval_count > 0 ise)
            if new_state.get("interval_count", 0) > 0 and new_state.get("prev_delivery_date"):
                prev_date = to_date(new_state["prev_delivery_date"])
                prev_qty = new_state.get("prev_delivery_qty", 0)
                
                rate, days = calculate_interval_rate(prev_date, delivery_date, prev_qty)
                
                ledger_entry = {
                    "customer_id": customer_id,
                    "product_id": product_id,
                    "prev_delivery_id": None,  # TODO: track if needed
                    "prev_date": to_iso_date(prev_date),
                    "curr_delivery_id": delivery_id,
                    "curr_date": to_iso_date(delivery_date),
                    "days_between": days,
                    "prev_qty": prev_qty,
                    "daily_rate_interval": rate
                }
                
                await self.ledger_col.insert_one(ledger_entry)
            
            # d) Rollup delta güncelle
            new_need_qty = new_state.get("need_qty")
            new_next_route = new_state.get("next_route_date")
            
            await self.rollup_service.update_delta(
                customer_id=customer_id,
                product_id=product_id,
                sales_rep_id=sales_rep_id,
                depot_id=depot_id,
                old_need_qty=old_need_qty,
                new_need_qty=new_need_qty,
                old_route_date=old_next_route,
                new_route_date=new_next_route
            )
            
            processed_items.append({
                "product_id": product_id,
                "qty": qty,
                "new_rate_mt": new_state.get("rate_mt"),
                "new_need_qty": new_need_qty
            })
        
        # 4. Working copy sil
        deleted_wc = await self.working_copies_col.delete_one({
            "customer_id": customer_id
        })
        
        return {
            "success": True,
            "delivery_id": delivery_id,
            "customer_id": customer_id,
            "processed_items": len(processed_items),
            "items": processed_items,
            "working_copy_deleted": deleted_wc.deleted_count > 0
        }
    
    async def process_delivery_voided(
        self,
        delivery_id: str
    ) -> Dict[str, Any]:
        """
        DELIVERY_VOIDED eventi işler.
        
        Teslimat iptal edildiğinde:
        - State'ler geri alınmalı (karmaşık, V1'de basit tutulabilir)
        - Daily totals'dan çıkarılmalı
        - Rollup güncellemeli
        
        V1 için: Sadece aynı gün iptallere izin ver ve tam rebuild yap.
        """
        event_id = f"{EVENT_DELIVERY_VOIDED}:{delivery_id}"
        if not await self._check_idempotency(event_id):
            return {
                "success": False,
                "error": "Event zaten işlenmiş"
            }
        
        delivery = await self.deliveries_col.find_one(
            {"delivery_id": delivery_id},
            {"_id": 0}
        )
        
        if not delivery:
            return {
                "success": False,
                "error": "Teslimat bulunamadı"
            }
        
        # V1: Sadece işaretle, tam rebuild ayrı job ile yapılır
        return {
            "success": True,
            "delivery_id": delivery_id,
            "note": "V1: Void işlendi, state rebuild gerekebilir"
        }
