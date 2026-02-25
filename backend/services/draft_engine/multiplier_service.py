# Draft Engine - Weekly Multiplier Service
# Haftalık çarpan hesaplama ve yönetimi

from typing import Optional, Dict, Any, List
from datetime import date, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

from .constants import (
    COL_WEEKLY_MULTIPLIERS,
    COL_DAILY_TOTALS,
    MULTIPLIER_DEFAULT,
    BASELINE_WEEKS
)
from .helpers import (
    gen_id, now_utc, to_iso_date, to_date,
    get_week_start, date_range
)
from .formulas import calculate_weekly_multiplier


class WeeklyMultiplierService:
    """
    Haftalık çarpan yönetim servisi.
    
    Çarpanlar batch olarak hesaplanır ve cache'lenir.
    Runtime'da sadece lookup yapılır.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.multipliers_col = db[COL_WEEKLY_MULTIPLIERS]
        self.daily_totals_col = db[COL_DAILY_TOTALS]
    
    async def get_multiplier(
        self,
        depot_id: str,
        segment_id: str,
        product_id: str,
        week_start: date
    ) -> float:
        """
        Belirli bir kombinasyon için haftalık çarpanı getirir.
        
        Cache'de yoksa 1.0 (default) döndürür.
        
        Args:
            depot_id: Depo ID
            segment_id: Segment ID
            product_id: Ürün ID
            week_start: Haftanın Pazartesi günü
            
        Returns:
            Çarpan değeri (0.7 - 1.8 arası veya 1.0 default)
        """
        doc = await self.multipliers_col.find_one(
            {
                "week_start": to_iso_date(week_start),
                "depot_id": depot_id,
                "segment_id": segment_id,
                "product_id": product_id
            },
            {"_id": 0, "multiplier": 1}
        )
        
        if doc:
            return doc.get("multiplier", MULTIPLIER_DEFAULT)
        
        return MULTIPLIER_DEFAULT
    
    async def increment_daily_total(
        self,
        day: date,
        depot_id: str,
        segment_id: str,
        product_id: str,
        qty: float
    ):
        """
        Günlük toplama delta ekler.
        
        Her teslimat için çağrılır.
        Upsert ile atomik increment.
        """
        await self.daily_totals_col.update_one(
            {
                "day": to_iso_date(day),
                "depot_id": depot_id,
                "segment_id": segment_id,
                "product_id": product_id
            },
            {
                "$inc": {"total_qty": qty},
                "$setOnInsert": {
                    "day": to_iso_date(day),
                    "depot_id": depot_id,
                    "segment_id": segment_id,
                    "product_id": product_id
                }
            },
            upsert=True
        )
    
    async def compute_multipliers_for_week(
        self,
        target_week_start: date,
        depot_id: str,
        segment_id: str
    ) -> int:
        """
        Belirli bir hafta için tüm ürünlerin çarpanlarını hesaplar.
        
        Bu fonksiyon batch job tarafından çağrılır (weekly cron).
        
        Args:
            target_week_start: Hedef haftanın Pazartesi'si
            depot_id: Depo ID
            segment_id: Segment ID
            
        Returns:
            Hesaplanan çarpan sayısı
        """
        # Hedef hafta tarihleri (7 gün)
        target_week_end = target_week_start + timedelta(days=6)
        
        # Baseline: önceki 8 hafta (56 gün)
        baseline_end = target_week_start - timedelta(days=1)
        baseline_start = baseline_end - timedelta(days=BASELINE_WEEKS * 7 - 1)
        
        # Hedef hafta için günlük toplamları çek
        target_pipeline = [
            {
                "$match": {
                    "depot_id": depot_id,
                    "segment_id": segment_id,
                    "day": {
                        "$gte": to_iso_date(target_week_start),
                        "$lte": to_iso_date(target_week_end)
                    }
                }
            },
            {
                "$group": {
                    "_id": "$product_id",
                    "total_qty": {"$sum": "$total_qty"},
                    "day_count": {"$sum": 1}
                }
            }
        ]
        
        target_results = await self.daily_totals_col.aggregate(target_pipeline).to_list(1000)
        target_by_product = {
            r["_id"]: {
                "total_qty": r["total_qty"],
                "day_count": r["day_count"]
            }
            for r in target_results
        }
        
        # Baseline için günlük toplamları çek
        baseline_pipeline = [
            {
                "$match": {
                    "depot_id": depot_id,
                    "segment_id": segment_id,
                    "day": {
                        "$gte": to_iso_date(baseline_start),
                        "$lte": to_iso_date(baseline_end)
                    }
                }
            },
            {
                "$group": {
                    "_id": "$product_id",
                    "total_qty": {"$sum": "$total_qty"},
                    "day_count": {"$sum": 1}
                }
            }
        ]
        
        baseline_results = await self.daily_totals_col.aggregate(baseline_pipeline).to_list(1000)
        baseline_by_product = {
            r["_id"]: {
                "total_qty": r["total_qty"],
                "day_count": r["day_count"]
            }
            for r in baseline_results
        }
        
        # Tüm ürünler için çarpan hesapla
        all_products = set(target_by_product.keys()) | set(baseline_by_product.keys())
        computed = 0
        now = now_utc()
        
        for product_id in all_products:
            target_data = target_by_product.get(product_id, {"total_qty": 0, "day_count": 0})
            baseline_data = baseline_by_product.get(product_id, {"total_qty": 0, "day_count": 0})
            
            # Günlük ortalama hesapla
            week_avg_per_day = target_data["total_qty"] / 7  # Her zaman 7 güne böl
            baseline_avg_per_day = baseline_data["total_qty"] / (BASELINE_WEEKS * 7)  # 56 güne böl
            
            # Çarpan hesapla
            multiplier = calculate_weekly_multiplier(week_avg_per_day, baseline_avg_per_day)
            
            # Kaydet (upsert)
            await self.multipliers_col.update_one(
                {
                    "week_start": to_iso_date(target_week_start),
                    "depot_id": depot_id,
                    "segment_id": segment_id,
                    "product_id": product_id
                },
                {
                    "$set": {
                        "week_start": to_iso_date(target_week_start),
                        "depot_id": depot_id,
                        "segment_id": segment_id,
                        "product_id": product_id,
                        "multiplier": multiplier,
                        "baseline_avg_per_day": baseline_avg_per_day,
                        "week_avg_per_day": week_avg_per_day,
                        "computed_at": now.isoformat(),
                        "method_version": "1.0"
                    }
                },
                upsert=True
            )
            computed += 1
        
        return computed
    
    async def run_weekly_batch(self) -> Dict[str, Any]:
        """
        Tüm depo-segment kombinasyonları için haftalık çarpanları hesaplar.
        
        Cron job tarafından çağrılır (örn: her Pazartesi 00:00).
        
        Returns:
            İşlem istatistikleri
        """
        from .constants import COL_CUSTOMERS
        
        # Bugünün haftası
        today = to_date(now_utc())
        week_start = get_week_start(today)
        
        # Tüm benzersiz depot-segment kombinasyonlarını bul
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "depot_id": "$depot_id",
                        "segment_id": "$segment_id"
                    }
                }
            }
        ]
        
        combinations = await self.db[COL_CUSTOMERS].aggregate(pipeline).to_list(1000)
        
        total_computed = 0
        processed_combos = 0
        
        for combo in combinations:
            depot_id = combo["_id"].get("depot_id")
            segment_id = combo["_id"].get("segment_id")
            
            if not depot_id or not segment_id:
                continue
            
            count = await self.compute_multipliers_for_week(
                week_start,
                depot_id,
                segment_id
            )
            total_computed += count
            processed_combos += 1
        
        return {
            "week_start": to_iso_date(week_start),
            "processed_combinations": processed_combos,
            "total_multipliers_computed": total_computed,
            "computed_at": now_utc().isoformat()
        }
    
    async def get_multipliers_for_depot(
        self,
        depot_id: str,
        week_start: date
    ) -> List[Dict[str, Any]]:
        """Bir depo için tüm çarpanları getirir"""
        cursor = self.multipliers_col.find(
            {
                "depot_id": depot_id,
                "week_start": to_iso_date(week_start)
            },
            {"_id": 0}
        )
        return await cursor.to_list(length=10000)
