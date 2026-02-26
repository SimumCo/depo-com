"""
Plasiyer Sipariş Hesaplama Servisi

İş Akışı:
1. Yarınki rota gününün müşterilerini bul
2. Sipariş atan müşterilerin siparişlerini topla
3. Sipariş atmayan müşterilerin draft'larını topla
4. Toplam ihtiyaçtan plasiyer stoğunu çıkar
5. Plasiyerin depoya vereceği sipariş listesini oluştur
"""

from config.database import db
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from .utils import now_utc, to_iso, DAY_MAP

# Sabitler
ORDER_CUTOFF_HOUR = 16  # 16:00
ORDER_CUTOFF_MINUTE = 30  # 16:30
WEEKDAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]


class PlasiyerOrderService:
    
    @staticmethod
    def get_tomorrow_route_code() -> str:
        """Yarının gün kodunu döndür (MON, TUE, etc.)"""
        tomorrow = now_utc() + timedelta(days=1)
        return WEEKDAY_CODES[tomorrow.weekday()]
    
    @staticmethod
    def get_today_route_code() -> str:
        """Bugünün gün kodunu döndür"""
        return WEEKDAY_CODES[now_utc().weekday()]
    
    @staticmethod
    async def get_route_customers(salesperson_id: str, route_day: str) -> List[dict]:
        """
        Belirli bir rota gününde ziyaret edilecek müşterileri getir.
        """
        cursor = db["sf_customers"].find({
            "salesperson_id": salesperson_id,
            "is_active": True,
            "route_plan.days": route_day
        }, {"_id": 0})
        return await cursor.to_list(length=500)
    
    @staticmethod
    async def get_customer_orders_today(customer_ids: List[str]) -> Dict[str, dict]:
        """
        Bugün gönderilen siparişleri müşteri bazında getir.
        Sadece submitted veya approved durumundaki siparişler.
        """
        today_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
        
        cursor = db["sf_orders"].find({
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
            else:
                # Daha yeni siparişi al
                if order.get("created_at", "") > customer_orders[cid].get("created_at", ""):
                    customer_orders[cid] = order
        
        return customer_orders
    
    @staticmethod
    async def get_customer_drafts(customer_ids: List[str]) -> Dict[str, dict]:
        """
        Müşterilerin sistem tarafından oluşturulan draft'larını getir.
        """
        cursor = db["sf_system_drafts"].find({
            "customer_id": {"$in": customer_ids}
        }, {"_id": 0})
        
        drafts = await cursor.to_list(length=500)
        return {d["customer_id"]: d for d in drafts}
    
    @staticmethod
    async def get_plasiyer_stock(salesperson_id: str) -> Dict[str, float]:
        """
        Plasiyerin mevcut stoğunu ürün bazında getir.
        """
        stock_doc = await db["plasiyer_stock"].find_one(
            {"salesperson_id": salesperson_id},
            {"_id": 0}
        )
        
        if not stock_doc:
            return {}
        
        return {item["product_id"]: item["qty"] for item in stock_doc.get("items", [])}
    
    @staticmethod
    async def calculate_plasiyer_order(
        salesperson_id: str,
        route_day: Optional[str] = None
    ) -> dict:
        """
        Plasiyerin yarınki rota için ihtiyaç listesini hesapla.
        
        Returns:
            {
                "salesperson_id": str,
                "route_day": str,
                "calculated_at": str,
                "customers": [
                    {
                        "customer_id": str,
                        "customer_name": str,
                        "source": "order" | "draft",
                        "items": [{"product_id": str, "qty": float}]
                    }
                ],
                "totals": {
                    "product_id": {
                        "name": str,
                        "orders_qty": float,
                        "drafts_qty": float,
                        "total_need": float,
                        "plasiyer_stock": float,
                        "to_order": float
                    }
                },
                "summary": {
                    "total_customers": int,
                    "customers_with_orders": int,
                    "customers_with_drafts": int,
                    "total_products": int,
                    "total_items_to_order": float
                }
            }
        """
        if not route_day:
            route_day = PlasiyerOrderService.get_tomorrow_route_code()
        
        now = now_utc()
        
        # 1. Rota müşterilerini al
        customers = await PlasiyerOrderService.get_route_customers(salesperson_id, route_day)
        customer_ids = [c["id"] for c in customers]
        customer_names = {c["id"]: c.get("name", "Bilinmeyen") for c in customers}
        
        if not customer_ids:
            return {
                "salesperson_id": salesperson_id,
                "route_day": route_day,
                "calculated_at": to_iso(now),
                "customers": [],
                "totals": {},
                "summary": {
                    "total_customers": 0,
                    "customers_with_orders": 0,
                    "customers_with_drafts": 0,
                    "total_products": 0,
                    "total_items_to_order": 0
                }
            }
        
        # 2. Siparişleri al
        customer_orders = await PlasiyerOrderService.get_customer_orders_today(customer_ids)
        
        # 3. Draft'ları al (sipariş atmayan müşteriler için)
        customers_without_orders = [cid for cid in customer_ids if cid not in customer_orders]
        customer_drafts = await PlasiyerOrderService.get_customer_drafts(customers_without_orders)
        
        # 4. Plasiyer stoğunu al
        plasiyer_stock = await PlasiyerOrderService.get_plasiyer_stock(salesperson_id)
        
        # 5. Ürün bilgilerini al (koli boyutu dahil)
        products_cursor = db["products"].find({}, {"_id": 0, "product_id": 1, "name": 1, "case_size": 1, "case_name": 1})
        products_list = await products_cursor.to_list(length=500)
        product_info = {p["product_id"]: p for p in products_list}
        
        # 6. Hesaplama
        customer_details = []
        totals = {}  # product_id -> {orders_qty, drafts_qty, ...}
        
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
            
            if items:  # Sadece ürün varsa ekle
                customer_details.append({
                    "customer_id": cid,
                    "customer_name": customer_names.get(cid, "Bilinmeyen"),
                    "source": "draft",
                    "items": items
                })
        
        # 7. Final hesaplama (toplam ihtiyaç - plasiyer stoğu + koli yuvarlama)
        import math
        final_totals = {}
        total_items_to_order = 0
        total_cases_to_order = 0
        
        for pid, data in totals.items():
            total_need = data["orders_qty"] + data["drafts_qty"]
            stock = plasiyer_stock.get(pid, 0)
            to_order_raw = max(0, total_need - stock)
            
            # Koli boyutuna göre yuvarla
            pinfo = product_info.get(pid, {})
            case_size = pinfo.get("case_size", 1)
            case_name = pinfo.get("case_name", "Tekli")
            
            if case_size > 1 and to_order_raw > 0:
                cases_needed = math.ceil(to_order_raw / case_size)
                to_order = cases_needed * case_size
            else:
                cases_needed = to_order_raw
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
            total_items_to_order += to_order
            total_cases_to_order += cases_needed if case_size > 1 else 0
        
        return {
            "salesperson_id": salesperson_id,
            "route_day": route_day,
            "route_day_name": {
                "MON": "Pazartesi", "TUE": "Salı", "WED": "Çarşamba",
                "THU": "Perşembe", "FRI": "Cuma", "SAT": "Cumartesi", "SUN": "Pazar"
            }.get(route_day, route_day),
            "calculated_at": to_iso(now),
            "customers": customer_details,
            "totals": final_totals,
            "summary": {
                "total_customers": len(customer_ids),
                "customers_with_orders": len(customer_orders),
                "customers_with_drafts": len([c for c in customer_details if c["source"] == "draft"]),
                "total_products": len(final_totals),
                "total_items_to_order": total_items_to_order
            }
        }
    
    @staticmethod
    async def update_plasiyer_stock(
        salesperson_id: str,
        items: List[dict],
        operation: str = "set"  # "set", "add", "subtract"
    ) -> dict:
        """
        Plasiyer stoğunu güncelle.
        
        Args:
            items: [{"product_id": str, "qty": float}]
            operation: "set" (üzerine yaz), "add" (ekle), "subtract" (çıkar)
        """
        stock_doc = await db["plasiyer_stock"].find_one(
            {"salesperson_id": salesperson_id}
        )
        
        if not stock_doc:
            return {"success": False, "message": "Plasiyer stok kaydı bulunamadı"}
        
        current_items = {item["product_id"]: item["qty"] for item in stock_doc.get("items", [])}
        
        for item in items:
            pid = item["product_id"]
            qty = item["qty"]
            
            if operation == "set":
                current_items[pid] = qty
            elif operation == "add":
                current_items[pid] = current_items.get(pid, 0) + qty
            elif operation == "subtract":
                current_items[pid] = max(0, current_items.get(pid, 0) - qty)
        
        # Güncelle
        new_items = [{"product_id": pid, "qty": qty} for pid, qty in current_items.items()]
        
        await db["plasiyer_stock"].update_one(
            {"salesperson_id": salesperson_id},
            {"$set": {
                "items": new_items,
                "last_updated": to_iso(now_utc())
            }}
        )
        
        return {"success": True, "items_updated": len(items)}
