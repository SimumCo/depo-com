# Draft Engine - Draft Calculator
# Müşteri ve plasiyer bazında draft hesaplama

from typing import List, Dict, Any, Optional
from datetime import date
from motor.motor_asyncio import AsyncIOMotorDatabase

from .constants import (
    COL_CUSTOMER_PRODUCT_STATE,
    COL_CUSTOMERS,
    COL_PRODUCTS,
    COL_ROUTES
)
from .helpers import (
    today_date, to_iso_date, to_date,
    get_next_route_date, get_iso_weekday
)


class DraftCalculator:
    """
    Draft hesaplama servisi.
    
    customer_product_state'den draft verilerini okur ve
    farklı seviyelerde aggregate eder.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.state_col = db[COL_CUSTOMER_PRODUCT_STATE]
        self.customers_col = db[COL_CUSTOMERS]
        self.products_col = db[COL_PRODUCTS]
    
    async def get_customer_draft(
        self,
        customer_id: str,
        include_inactive: bool = False
    ) -> Dict[str, Any]:
        """
        Tek bir müşteri için draft hesaplar.
        
        Args:
            customer_id: Müşteri ID
            include_inactive: Pasif ürünleri dahil et
            
        Returns:
            {
                customer_id, customer_name, next_route_date,
                items: [{product_id, product_name, need_qty, rate_mt, ...}],
                total_need_qty, product_count
            }
        """
        # Müşteri bilgisi
        customer = await self.customers_col.find_one(
            {"customer_id": customer_id},
            {"_id": 0}
        )
        
        if not customer:
            return {"error": "Müşteri bulunamadı"}
        
        # State filtresi
        filter_query = {"customer_id": customer_id}
        if not include_inactive:
            filter_query["is_active"] = True
            filter_query["need_qty"] = {"$gt": 0}
        
        # State'leri çek
        cursor = self.state_col.find(filter_query, {"_id": 0})
        states = await cursor.to_list(length=500)
        
        # Ürün bilgilerini zenginleştir
        items = []
        for state in states:
            product = await self.products_col.find_one(
                {"product_id": state["product_id"]},
                {"_id": 0, "name": 1, "shelf_life_days": 1}
            )
            
            items.append({
                "product_id": state["product_id"],
                "product_name": product.get("name", "Bilinmeyen") if product else "Bilinmeyen",
                "shelf_life_days": product.get("shelf_life_days") if product else None,
                "need_qty": state.get("need_qty"),
                "rate_mt": state.get("rate_mt"),
                "rate_used": state.get("rate_used"),
                "weekly_multiplier": state.get("weekly_multiplier"),
                "delivery_count": state.get("delivery_count"),
                "interval_count": state.get("interval_count"),
                "is_active": state.get("is_active"),
                "last_delivery_date": state.get("last_delivery_date"),
                "last_delivery_qty": state.get("last_delivery_qty")
            })
        
        # need_qty'ye göre sırala
        items.sort(key=lambda x: x.get("need_qty") or 0, reverse=True)
        
        total_need = sum(i.get("need_qty") or 0 for i in items)
        
        return {
            "customer_id": customer_id,
            "customer_name": customer.get("name", "Bilinmeyen"),
            "next_route_date": states[0].get("next_route_date") if states else None,
            "days_to_next_route": states[0].get("days_to_next_route") if states else None,
            "items": items,
            "total_need_qty": round(total_need, 2),
            "product_count": len(items)
        }
    
    async def get_sales_rep_draft(
        self,
        sales_rep_id: str,
        target_route_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Bir plasiyer'in tüm müşterileri için birleştirilmiş draft.
        
        Args:
            sales_rep_id: Plasiyer ID
            target_route_date: Hedef rut tarihi (None ise yarın)
            
        Returns:
            Ürün bazında aggregate edilmiş draft
        """
        today = today_date()
        
        # Hedef tarih belirlenmemişse yarını kullan
        if target_route_date is None:
            from datetime import timedelta
            target_route_date = today + timedelta(days=1)
        
        target_weekday = get_iso_weekday(target_route_date)
        
        # Bu plasiyer'e ait ve hedef güne rut'u olan müşterileri bul
        # Not: route_weekdays dizisinde target_weekday olmalı
        customers_cursor = self.customers_col.find(
            {
                "sales_rep_id": sales_rep_id,
                "is_active": True
            },
            {"_id": 0}
        )
        customers = await customers_cursor.to_list(length=500)
        
        # Hedef günde rut'u olan müşterileri filtrele
        route_customers = []
        for cust in customers:
            route_days = cust.get("route_weekdays", [])
            if target_weekday in route_days:
                route_customers.append(cust)
        
        # Ürün bazında aggregate
        product_totals = {}
        customer_details = []
        
        for cust in route_customers:
            cust_id = cust["customer_id"]
            
            # Bu müşterinin aktif draft'larını çek
            states_cursor = self.state_col.find(
                {
                    "customer_id": cust_id,
                    "is_active": True,
                    "need_qty": {"$gt": 0}
                },
                {"_id": 0}
            )
            states = await states_cursor.to_list(length=500)
            
            cust_total = 0
            cust_items = []
            
            for state in states:
                pid = state["product_id"]
                need = state.get("need_qty", 0)
                
                if need > 0:
                    cust_total += need
                    cust_items.append({
                        "product_id": pid,
                        "need_qty": need
                    })
                    
                    # Ürün toplamına ekle
                    if pid not in product_totals:
                        product_totals[pid] = 0
                    product_totals[pid] += need
            
            if cust_total > 0:
                customer_details.append({
                    "customer_id": cust_id,
                    "customer_name": cust.get("name", "Bilinmeyen"),
                    "total_need_qty": round(cust_total, 2),
                    "item_count": len(cust_items),
                    "items": cust_items
                })
        
        # Ürün bilgilerini zenginleştir
        order_items = []
        for pid, total_qty in product_totals.items():
            product = await self.products_col.find_one(
                {"product_id": pid},
                {"_id": 0, "name": 1, "box_size": 1}
            )
            
            box_size = product.get("box_size", 1) if product else 1
            
            # Koli bazında yuvarla
            if box_size > 1:
                boxes_needed = -(-int(total_qty) // box_size)  # Ceiling division
                final_qty = boxes_needed * box_size
            else:
                final_qty = total_qty
            
            order_items.append({
                "product_id": pid,
                "product_name": product.get("name", "Bilinmeyen") if product else "Bilinmeyen",
                "total_need_qty": round(total_qty, 2),
                "box_size": box_size,
                "final_qty": final_qty,
                "boxes": final_qty // box_size if box_size > 1 else final_qty
            })
        
        # Miktara göre sırala
        order_items.sort(key=lambda x: x["final_qty"], reverse=True)
        customer_details.sort(key=lambda x: x["total_need_qty"], reverse=True)
        
        return {
            "sales_rep_id": sales_rep_id,
            "target_route_date": to_iso_date(target_route_date),
            "target_weekday": target_weekday,
            "customer_count": len(customer_details),
            "customers": customer_details,
            "order_items": order_items,
            "total_need_qty": round(sum(product_totals.values()), 2),
            "total_final_qty": sum(i["final_qty"] for i in order_items),
            "product_count": len(order_items)
        }
    
    async def get_depot_draft(
        self,
        depot_id: str,
        target_route_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Bir depo için tüm plasiyer draft'larının toplamı.
        
        Args:
            depot_id: Depo ID
            target_route_date: Hedef rut tarihi
            
        Returns:
            Depo bazında aggregate edilmiş draft
        """
        today = today_date()
        
        if target_route_date is None:
            from datetime import timedelta
            target_route_date = today + timedelta(days=1)
        
        target_weekday = get_iso_weekday(target_route_date)
        
        # Bu depoya ait tüm müşterileri bul
        customers_cursor = self.customers_col.find(
            {
                "depot_id": depot_id,
                "is_active": True
            },
            {"_id": 0}
        )
        customers = await customers_cursor.to_list(length=2000)
        
        # Hedef günde rut'u olan müşterileri filtrele
        route_customer_ids = []
        for cust in customers:
            route_days = cust.get("route_weekdays", [])
            if target_weekday in route_days:
                route_customer_ids.append(cust["customer_id"])
        
        # Tüm bu müşterilerin draft'larını topla
        product_totals = {}
        
        if route_customer_ids:
            pipeline = [
                {
                    "$match": {
                        "customer_id": {"$in": route_customer_ids},
                        "is_active": True,
                        "need_qty": {"$gt": 0}
                    }
                },
                {
                    "$group": {
                        "_id": "$product_id",
                        "total_need_qty": {"$sum": "$need_qty"},
                        "customer_count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"total_need_qty": -1}
                }
            ]
            
            results = await self.state_col.aggregate(pipeline).to_list(1000)
            
            for r in results:
                product_totals[r["_id"]] = {
                    "total_need_qty": r["total_need_qty"],
                    "customer_count": r["customer_count"]
                }
        
        # Ürün bilgilerini zenginleştir
        order_items = []
        for pid, data in product_totals.items():
            product = await self.products_col.find_one(
                {"product_id": pid},
                {"_id": 0, "name": 1, "box_size": 1}
            )
            
            box_size = product.get("box_size", 1) if product else 1
            total_qty = data["total_need_qty"]
            
            # Koli bazında yuvarla
            if box_size > 1:
                boxes_needed = -(-int(total_qty) // box_size)
                final_qty = boxes_needed * box_size
            else:
                final_qty = total_qty
            
            order_items.append({
                "product_id": pid,
                "product_name": product.get("name", "Bilinmeyen") if product else "Bilinmeyen",
                "total_need_qty": round(total_qty, 2),
                "customer_count": data["customer_count"],
                "box_size": box_size,
                "final_qty": final_qty,
                "boxes": final_qty // box_size if box_size > 1 else final_qty
            })
        
        order_items.sort(key=lambda x: x["final_qty"], reverse=True)
        
        return {
            "depot_id": depot_id,
            "target_route_date": to_iso_date(target_route_date),
            "target_weekday": target_weekday,
            "total_customers": len(route_customer_ids),
            "order_items": order_items,
            "total_need_qty": round(sum(d["total_need_qty"] for d in product_totals.values()), 2),
            "total_final_qty": sum(i["final_qty"] for i in order_items),
            "product_count": len(order_items)
        }
