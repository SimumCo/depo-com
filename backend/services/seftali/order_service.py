"""
ŞEFTALİ - Order Service
Plasiyer sipariş hesaplama servisi

İş Akışı:
1. Yarınki rota gününün müşterilerini bul
2. Sipariş atan müşterilerin siparişlerini topla
3. Sipariş atmayan müşterilerin draft'larını topla
4. Toplam ihtiyaçtan plasiyer stoğunu çıkar
5. Koli yuvarlaması uygula
6. Final sipariş listesini oluştur
"""

from typing import Dict, List, Optional, Any
from datetime import timedelta
import math
from config.database import db

from .core import (
    now_utc, to_iso,
    COL_CUSTOMERS, COL_PRODUCTS, COL_ORDERS,
    COL_SYSTEM_DRAFTS, COL_PLASIYER_STOCK,
    WEEKDAY_CODES
)


class OrderService:
    """
    Plasiyer Sipariş Hesaplama Servisi
    
    Plasiyerin günlük rota için ihtiyaç listesini hesaplar.
    """
    
    # =========================================================================
    # PUBLIC METHODS
    # =========================================================================
    
    @classmethod
    def get_tomorrow_route_code(cls) -> str:
        """Yarının gün kodunu döndür (MON, TUE, etc.)"""
        tomorrow = now_utc() + timedelta(days=1)
        return WEEKDAY_CODES[tomorrow.weekday()]
    
    @classmethod
    async def calculate(
        cls,
        salesperson_id: str,
        route_day: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Plasiyerin belirtilen gün için sipariş ihtiyacını hesapla.
        
        Args:
            salesperson_id: Plasiyer ID'si
            route_day: Rota günü (örn: "SAT"). None ise yarın.
            
        Returns:
            Sipariş hesaplama sonucu
        """
        if not route_day:
            route_day = cls.get_tomorrow_route_code()
        
        now = now_utc()
        
        # Rota müşterilerini al
        customers = await cls._get_route_customers(salesperson_id, route_day)
        customer_ids = [c["id"] for c in customers]
        customer_names = {c["id"]: c.get("name", "Bilinmeyen") for c in customers}
        
        if not customer_ids:
            return cls._empty_result(salesperson_id, route_day, now)
        
        # Siparişleri al
        customer_orders = await cls._get_customer_orders(customer_ids)
        
        # Draft'ları al (sipariş atmayanlar için)
        customers_without_orders = [cid for cid in customer_ids if cid not in customer_orders]
        customer_drafts = await cls._get_customer_drafts(customers_without_orders)
        
        # Plasiyer stoğu
        plasiyer_stock = await cls._get_plasiyer_stock(salesperson_id)
        
        # Ürün bilgileri
        product_info = await cls._get_product_info()
        
        # Hesapla
        customer_details, totals = cls._aggregate_orders(
            customer_orders, customer_drafts, customer_names
        )
        
        # Final hesaplama (stok düşürme + koli yuvarlama)
        final_totals, total_items, total_cases = cls._calculate_final_totals(
            totals, plasiyer_stock, product_info
        )
        
        return {
            "salesperson_id": salesperson_id,
            "route_day": route_day,
            "route_day_name": cls._day_name(route_day),
            "calculated_at": to_iso(now),
            "customers": customer_details,
            "totals": final_totals,
            "summary": {
                "total_customers": len(customer_ids),
                "customers_with_orders": len(customer_orders),
                "customers_with_drafts": len([c for c in customer_details if c["source"] == "draft"]),
                "total_products": len(final_totals),
                "total_items_to_order": total_items,
                "total_cases_to_order": total_cases
            }
        }
    
    @classmethod
    async def get_route_customers(
        cls,
        salesperson_id: str,
        route_day: str
    ) -> List[dict]:
        """
        Belirli bir rota gününün müşterilerini getir.
        """
        return await cls._get_route_customers(salesperson_id, route_day)
    
    @classmethod
    async def get_stock(cls, salesperson_id: str) -> Dict[str, float]:
        """Plasiyerin mevcut stoğunu getir."""
        return await cls._get_plasiyer_stock(salesperson_id)
    
    @classmethod
    async def update_stock(
        cls,
        salesperson_id: str,
        items: List[dict],
        operation: str = "set"
    ) -> dict:
        """
        Plasiyer stoğunu güncelle.
        
        Args:
            salesperson_id: Plasiyer ID'si
            items: [{"product_id": str, "qty": float}]
            operation: "set" (üzerine yaz), "add" (ekle), "subtract" (çıkar)
            
        Returns:
            Güncelleme sonucu
        """
        stock_doc = await db[COL_PLASIYER_STOCK].find_one(
            {"salesperson_id": salesperson_id}
        )
        
        if not stock_doc:
            return {"success": False, "message": "Plasiyer stok kaydı bulunamadı"}
        
        current_items = {
            item["product_id"]: item["qty"] 
            for item in stock_doc.get("items", [])
        }
        
        for item in items:
            pid = item["product_id"]
            qty = item["qty"]
            
            if operation == "set":
                current_items[pid] = qty
            elif operation == "add":
                current_items[pid] = current_items.get(pid, 0) + qty
            elif operation == "subtract":
                current_items[pid] = max(0, current_items.get(pid, 0) - qty)
        
        new_items = [{"product_id": pid, "qty": qty} for pid, qty in current_items.items()]
        
        await db[COL_PLASIYER_STOCK].update_one(
            {"salesperson_id": salesperson_id},
            {"$set": {"items": new_items, "last_updated": to_iso(now_utc())}}
        )
        
        return {"success": True, "items_updated": len(items)}
    
    # =========================================================================
    # PRIVATE METHODS - Data Fetching
    # =========================================================================
    
    @classmethod
    async def _get_route_customers(cls, salesperson_id: str, route_day: str) -> List[dict]:
        """Rota müşterilerini getir."""
        cursor = db[COL_CUSTOMERS].find({
            "salesperson_id": salesperson_id,
            "is_active": True,
            "route_plan.days": route_day
        }, {"_id": 0})
        return await cursor.to_list(length=500)
    
    @classmethod
    async def _get_customer_orders(cls, customer_ids: List[str]) -> Dict[str, dict]:
        """Bugünkü siparişleri getir."""
        today_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
        
        cursor = db[COL_ORDERS].find({
            "customer_id": {"$in": customer_ids},
            "status": {"$in": ["submitted", "approved"]},
            "created_at": {"$gte": to_iso(today_start)}
        }, {"_id": 0})
        
        orders = await cursor.to_list(length=500)
        
        # Müşteri bazında grupla (en son sipariş)
        customer_orders = {}
        for order in orders:
            cid = order["customer_id"]
            if cid not in customer_orders:
                customer_orders[cid] = order
            elif order.get("created_at", "") > customer_orders[cid].get("created_at", ""):
                customer_orders[cid] = order
        
        return customer_orders
    
    @classmethod
    async def _get_customer_drafts(cls, customer_ids: List[str]) -> Dict[str, dict]:
        """Müşteri draft'larını getir."""
        cursor = db[COL_SYSTEM_DRAFTS].find({
            "customer_id": {"$in": customer_ids}
        }, {"_id": 0})
        
        drafts = await cursor.to_list(length=500)
        return {d["customer_id"]: d for d in drafts}
    
    @classmethod
    async def _get_plasiyer_stock(cls, salesperson_id: str) -> Dict[str, float]:
        """Plasiyer stoğunu getir."""
        stock_doc = await db[COL_PLASIYER_STOCK].find_one(
            {"salesperson_id": salesperson_id},
            {"_id": 0}
        )
        
        if not stock_doc:
            return {}
        
        return {item["product_id"]: item["qty"] for item in stock_doc.get("items", [])}
    
    @classmethod
    async def _get_product_info(cls) -> Dict[str, dict]:
        """Ürün bilgilerini getir."""
        cursor = db[COL_PRODUCTS].find({}, {"_id": 0})
        products = await cursor.to_list(length=500)
        return {p["product_id"]: p for p in products}
    
    # =========================================================================
    # PRIVATE METHODS - Calculation
    # =========================================================================
    
    @classmethod
    def _aggregate_orders(
        cls,
        customer_orders: Dict[str, dict],
        customer_drafts: Dict[str, dict],
        customer_names: Dict[str, str]
    ) -> tuple:
        """Siparişleri ve draft'ları topla."""
        customer_details = []
        totals = {}  # product_id -> {orders_qty, drafts_qty}
        
        # Sipariş atan müşteriler
        for cid, order in customer_orders.items():
            items = []
            for item in order.get("items", []):
                pid = item["product_id"]
                qty = item.get("qty", 0)
                items.append({"product_id": pid, "qty": qty})
                
                if pid not in totals:
                    totals[pid] = {"orders_qty": 0, "drafts_qty": 0}
                totals[pid]["orders_qty"] += qty
            
            customer_details.append({
                "customer_id": cid,
                "customer_name": customer_names.get(cid, "Bilinmeyen"),
                "source": "order",
                "items": items
            })
        
        # Sipariş atmayan müşteriler (draft)
        for cid, draft in customer_drafts.items():
            items = []
            for item in draft.get("items", []):
                pid = item["product_id"]
                qty = item.get("suggested_qty", 0)
                if qty > 0:
                    items.append({"product_id": pid, "qty": qty})
                    
                    if pid not in totals:
                        totals[pid] = {"orders_qty": 0, "drafts_qty": 0}
                    totals[pid]["drafts_qty"] += qty
            
            if items:
                customer_details.append({
                    "customer_id": cid,
                    "customer_name": customer_names.get(cid, "Bilinmeyen"),
                    "source": "draft",
                    "items": items
                })
        
        return customer_details, totals
    
    @classmethod
    def _calculate_final_totals(
        cls,
        totals: dict,
        plasiyer_stock: Dict[str, float],
        product_info: Dict[str, dict]
    ) -> tuple:
        """Final hesaplama (stok düşürme + koli yuvarlama)."""
        final_totals = {}
        total_items = 0
        total_cases = 0
        
        for pid, data in totals.items():
            total_need = data["orders_qty"] + data["drafts_qty"]
            stock = plasiyer_stock.get(pid, 0)
            to_order_raw = max(0, total_need - stock)
            
            # Koli yuvarlama
            pinfo = product_info.get(pid, {})
            case_size = pinfo.get("case_size", 1)
            case_name = pinfo.get("case_name", "Tekli")
            
            if case_size > 1 and to_order_raw > 0:
                cases_needed = math.ceil(to_order_raw / case_size)
                to_order = cases_needed * case_size
            else:
                cases_needed = to_order_raw if case_size == 1 else 0
                to_order = to_order_raw
            
            final_totals[pid] = {
                "name": pinfo.get("name", pid),
                "orders_qty": data["orders_qty"],
                "drafts_qty": data["drafts_qty"],
                "total_need": total_need,
                "plasiyer_stock": stock,
                "to_order_raw": to_order_raw,
                "to_order": to_order,
                "case_size": case_size,
                "case_name": case_name,
                "cases_needed": cases_needed
            }
            
            total_items += to_order
            total_cases += cases_needed if case_size > 1 else 0
        
        return final_totals, total_items, total_cases
    
    @classmethod
    def _empty_result(cls, salesperson_id: str, route_day: str, now) -> dict:
        """Boş sonuç döndür."""
        return {
            "salesperson_id": salesperson_id,
            "route_day": route_day,
            "route_day_name": cls._day_name(route_day),
            "calculated_at": to_iso(now),
            "customers": [],
            "totals": {},
            "summary": {
                "total_customers": 0,
                "customers_with_orders": 0,
                "customers_with_drafts": 0,
                "total_products": 0,
                "total_items_to_order": 0,
                "total_cases_to_order": 0
            }
        }
    
    @classmethod
    def _day_name(cls, day_code: str) -> str:
        """Gün kodunu isme çevir."""
        names = {
            "MON": "Pazartesi", "TUE": "Salı", "WED": "Çarşamba",
            "THU": "Perşembe", "FRI": "Cuma", "SAT": "Cumartesi", "SUN": "Pazar"
        }
        return names.get(day_code, day_code)


# Backward compatibility alias
PlasiyerOrderService = OrderService
