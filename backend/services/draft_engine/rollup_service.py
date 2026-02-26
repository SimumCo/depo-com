# Draft Engine - Rollup Service
# Hiyerarşik roll-up yönetimi (delta-based, no scans)

from typing import Optional, Dict, Any
from datetime import date
from motor.motor_asyncio import AsyncIOMotorDatabase

from .constants import (
    COL_SALES_REP_DRAFT_TOTALS,
    COL_DEPOT_DRAFT_TOTALS,
    COL_PRODUCTION_DRAFT_TOTALS
)
from .helpers import now_utc, to_iso_date, to_date


class RollupService:
    """
    Hiyerarşik roll-up servisi.
    
    Kural: Delta-based güncelleme, full scan YASAK.
    
    customer need_qty değiştiğinde:
    delta = new_need - old_need
    
    Bu delta şunlara eklenir:
    - sales_rep_draft_totals
    - depot_draft_totals
    - production_draft_totals
    
    Eğer target_route_date değiştiyse:
    - Eski tarihten çıkar (negative delta)
    - Yeni tarihe ekle (positive delta)
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.sales_rep_col = db[COL_SALES_REP_DRAFT_TOTALS]
        self.depot_col = db[COL_DEPOT_DRAFT_TOTALS]
        self.production_col = db[COL_PRODUCTION_DRAFT_TOTALS]
        
        # Varsayılan company_id (single tenant)
        self.default_company_id = "seftali_company"
    
    async def update_delta(
        self,
        customer_id: str,
        product_id: str,
        sales_rep_id: Optional[str],
        depot_id: str,
        old_need_qty: Optional[float],
        new_need_qty: Optional[float],
        old_route_date: Optional[str],
        new_route_date: Optional[str]
    ):
        """
        Need qty değişikliğini roll-up'lara uygular.
        
        Senaryolar:
        1. İlk draft (old=None, new=X) -> +X to new_route
        2. Draft güncelleme, aynı tarih (old=X, new=Y) -> +(Y-X) to route
        3. Draft güncelleme, tarih değişti -> -old from old_route, +new to new_route
        4. Draft silindi (old=X, new=None) -> -X from old_route
        """
        now = now_utc().isoformat()
        
        # Değerleri normalize et
        old_qty = old_need_qty if old_need_qty else 0
        new_qty = new_need_qty if new_need_qty else 0
        
        # Tarihler aynı mı?
        same_route = old_route_date == new_route_date
        
        if same_route and old_route_date:
            # Basit delta güncelleme
            delta = new_qty - old_qty
            if abs(delta) > 0.001:  # Anlamlı değişiklik varsa
                await self._apply_delta(
                    sales_rep_id, depot_id, product_id,
                    old_route_date, delta, now
                )
        else:
            # Tarih değişti veya yeni eklendi
            # Eski tarihten çıkar
            if old_route_date and old_qty > 0:
                await self._apply_delta(
                    sales_rep_id, depot_id, product_id,
                    old_route_date, -old_qty, now
                )
            
            # Yeni tarihe ekle
            if new_route_date and new_qty > 0:
                await self._apply_delta(
                    sales_rep_id, depot_id, product_id,
                    new_route_date, new_qty, now
                )
    
    async def _apply_delta(
        self,
        sales_rep_id: Optional[str],
        depot_id: str,
        product_id: str,
        target_route_date: str,
        delta: float,
        updated_at: str
    ):
        """Delta'yı tüm rollup seviyelerine uygular"""
        
        # 1. Sales Rep Level
        if sales_rep_id:
            await self.sales_rep_col.update_one(
                {
                    "sales_rep_id": sales_rep_id,
                    "target_route_date": target_route_date,
                    "product_id": product_id
                },
                {
                    "$inc": {"total_need_qty": delta},
                    "$set": {"updated_at": updated_at},
                    "$setOnInsert": {
                        "sales_rep_id": sales_rep_id,
                        "target_route_date": target_route_date,
                        "product_id": product_id
                    }
                },
                upsert=True
            )
        
        # 2. Depot Level
        await self.depot_col.update_one(
            {
                "depot_id": depot_id,
                "target_route_date": target_route_date,
                "product_id": product_id
            },
            {
                "$inc": {"total_need_qty": delta},
                "$set": {"updated_at": updated_at},
                "$setOnInsert": {
                    "depot_id": depot_id,
                    "target_route_date": target_route_date,
                    "product_id": product_id
                }
            },
            upsert=True
        )
        
        # 3. Production Level
        await self.production_col.update_one(
            {
                "company_id": self.default_company_id,
                "target_route_date": target_route_date,
                "product_id": product_id
            },
            {
                "$inc": {"total_need_qty": delta},
                "$set": {"updated_at": updated_at},
                "$setOnInsert": {
                    "company_id": self.default_company_id,
                    "target_route_date": target_route_date,
                    "product_id": product_id
                }
            },
            upsert=True
        )
    
    async def get_sales_rep_totals(
        self,
        sales_rep_id: str,
        target_route_date: str
    ) -> Dict[str, float]:
        """Plasiyer için belirli tarihteki ürün toplamları"""
        cursor = self.sales_rep_col.find(
            {
                "sales_rep_id": sales_rep_id,
                "target_route_date": target_route_date,
                "total_need_qty": {"$gt": 0}
            },
            {"_id": 0}
        )
        
        results = await cursor.to_list(length=1000)
        return {r["product_id"]: r["total_need_qty"] for r in results}
    
    async def get_depot_totals(
        self,
        depot_id: str,
        target_route_date: str
    ) -> Dict[str, float]:
        """Depo için belirli tarihteki ürün toplamları"""
        cursor = self.depot_col.find(
            {
                "depot_id": depot_id,
                "target_route_date": target_route_date,
                "total_need_qty": {"$gt": 0}
            },
            {"_id": 0}
        )
        
        results = await cursor.to_list(length=1000)
        return {r["product_id"]: r["total_need_qty"] for r in results}
    
    async def get_production_totals(
        self,
        target_route_date: str
    ) -> Dict[str, float]:
        """Üretim için belirli tarihteki ürün toplamları"""
        cursor = self.production_col.find(
            {
                "company_id": self.default_company_id,
                "target_route_date": target_route_date,
                "total_need_qty": {"$gt": 0}
            },
            {"_id": 0}
        )
        
        results = await cursor.to_list(length=1000)
        return {r["product_id"]: r["total_need_qty"] for r in results}
    
    async def cleanup_zero_totals(self):
        """Sıfır veya negatif toplamları temizler"""
        await self.sales_rep_col.delete_many({"total_need_qty": {"$lte": 0}})
        await self.depot_col.delete_many({"total_need_qty": {"$lte": 0}})
        await self.production_col.delete_many({"total_need_qty": {"$lte": 0}})
