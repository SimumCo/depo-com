"""
Periodic Consumption Service
Haftalık ve aylık tüketim aggregation ve analiz servisi
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.consumption_period import ConsumptionPeriod, YearOverYearComparison, TrendAnalysis
import logging

logger = logging.getLogger(__name__)


class PeriodicConsumptionService:
    """Periyodik tüketim hesaplama ve analiz servisi"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def _get_week_number(self, date: datetime) -> int:
        """ISO hafta numarasını döndür (1-52/53)"""
        return date.isocalendar()[1]
    
    def _get_week_start_end(self, year: int, week: int) -> tuple:
        """Hafta başlangıç ve bitiş tarihlerini döndür"""
        # ISO 8601: Hafta Pazartesi başlar
        jan_1 = datetime(year, 1, 1)
        # İlk Pazartesi'yi bul
        days_to_monday = (7 - jan_1.weekday()) % 7
        if days_to_monday == 0 and jan_1.weekday() != 0:
            days_to_monday = 7
        first_monday = jan_1 + timedelta(days=days_to_monday)
        
        # Hedef haftaya git
        week_start = first_monday + timedelta(weeks=week - 1)
        week_end = week_start + timedelta(days=6)
        
        return week_start, week_end
    
    def _get_month_start_end(self, year: int, month: int) -> tuple:
        """Ay başlangıç ve bitiş tarihlerini döndür"""
        month_start = datetime(year, month, 1)
        
        # Sonraki ayın ilk günü - 1 gün = bu ayın son günü
        if month == 12:
            month_end = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = datetime(year, month + 1, 1) - timedelta(days=1)
        
        return month_start, month_end
    
    def _parse_invoice_date(self, date_str: str) -> datetime:
        """Fatura tarihini parse et (DD MM YYYY formatı)"""
        try:
            parts = date_str.replace("-", " ").replace("/", " ").split()
            if len(parts) == 3:
                day, month, year = parts
                return datetime(int(year), int(month), int(day))
        except Exception as e:
            logger.error(f"Date parsing error for {date_str}: {e}")
        
        return datetime.utcnow()
    
    async def calculate_weekly_consumption(
        self, 
        customer_id: str, 
        product_code: str,
        year: int,
        week: int
    ) -> Optional[Dict]:
        """
        Belirli bir hafta için tüketim hesapla
        """
        week_start, week_end = self._get_week_start_end(year, week)
        
        # Bu hafta içindeki tüketim kayıtlarını getir
        cursor = self.db.customer_consumption.find(
            {
                "customer_id": customer_id,
                "product_code": product_code,
                "can_calculate": True
            },
            {"_id": 0}
        )
        
        records = await cursor.to_list(length=None)
        
        # Tarihleri parse et ve bu haftaya ait olanları filtrele
        week_records = []
        for record in records:
            target_date_str = record.get("target_invoice_date", "")
            target_date = self._parse_invoice_date(target_date_str)
            
            if week_start <= target_date <= week_end:
                week_records.append(record)
        
        if not week_records:
            return None
        
        # Toplam tüketim hesapla
        total_consumption = sum(r.get("consumption_quantity", 0.0) for r in week_records)
        days_in_week = 7
        daily_average = total_consumption / days_in_week
        
        return {
            "total_consumption": total_consumption,
            "daily_average": daily_average,
            "invoice_count": len(week_records),
            "period_start": week_start.strftime("%Y-%m-%d"),
            "period_end": week_end.strftime("%Y-%m-%d")
        }
    
    async def calculate_monthly_consumption(
        self,
        customer_id: str,
        product_code: str,
        year: int,
        month: int
    ) -> Optional[Dict]:
        """
        Belirli bir ay için tüketim hesapla
        """
        month_start, month_end = self._get_month_start_end(year, month)
        
        # Bu ay içindeki tüketim kayıtlarını getir
        cursor = self.db.customer_consumption.find(
            {
                "customer_id": customer_id,
                "product_code": product_code,
                "can_calculate": True
            },
            {"_id": 0}
        )
        
        records = await cursor.to_list(length=None)
        
        # Tarihleri parse et ve bu aya ait olanları filtrele
        month_records = []
        for record in records:
            target_date_str = record.get("target_invoice_date", "")
            target_date = self._parse_invoice_date(target_date_str)
            
            if month_start <= target_date <= month_end:
                month_records.append(record)
        
        if not month_records:
            return None
        
        # Toplam tüketim hesapla
        total_consumption = sum(r.get("consumption_quantity", 0.0) for r in month_records)
        days_in_month = (month_end - month_start).days + 1
        daily_average = total_consumption / days_in_month
        
        return {
            "total_consumption": total_consumption,
            "daily_average": daily_average,
            "invoice_count": len(month_records),
            "period_start": month_start.strftime("%Y-%m-%d"),
            "period_end": month_end.strftime("%Y-%m-%d")
        }
    
    async def generate_periodic_records(
        self,
        period_type: str = "monthly"
    ) -> Dict:
        """
        Tüm müşteriler ve ürünler için periyodik kayıtlar oluştur
        """
        # Tüm tüketim kayıtlarını al
        cursor = self.db.customer_consumption.find(
            {"can_calculate": True},
            {"_id": 0, "customer_id": 1, "product_code": 1, "product_name": 1, "target_invoice_date": 1}
        )
        
        records = await cursor.to_list(length=None)
        
        # Benzersiz müşteri-ürün-periyot kombinasyonları
        combinations = set()
        for record in records:
            target_date = self._parse_invoice_date(record.get("target_invoice_date", ""))
            year = target_date.year
            
            if period_type == "weekly":
                period_num = self._get_week_number(target_date)
            else:  # monthly
                period_num = target_date.month
            
            combinations.add((
                record.get("customer_id"),
                record.get("product_code"),
                record.get("product_name"),
                year,
                period_num
            ))
        
        created_count = 0
        updated_count = 0
        
        # Her kombinasyon için periyodik kayıt oluştur
        for customer_id, product_code, product_name, year, period_num in combinations:
            # Ürün ID'sini bul
            product = await self.db.products.find_one(
                {"sku": product_code},
                {"_id": 0, "id": 1}
            )
            product_id = product.get("id") if product else product_code
            
            # Tüketim hesapla
            if period_type == "weekly":
                consumption_data = await self.calculate_weekly_consumption(
                    customer_id, product_code, year, period_num
                )
            else:
                consumption_data = await self.calculate_monthly_consumption(
                    customer_id, product_code, year, period_num
                )
            
            if not consumption_data:
                continue
            
            # Önceki periyot verilerini al (karşılaştırma için)
            if period_type == "weekly":
                prev_period_num = period_num - 1 if period_num > 1 else None
            else:
                prev_period_num = period_num - 1 if period_num > 1 else None
            
            previous_period_consumption = None
            period_over_period_change = None
            
            if prev_period_num:
                prev_data = await self.db.consumption_periods.find_one({
                    "customer_id": customer_id,
                    "product_code": product_code,
                    "period_type": period_type,
                    "period_year": year,
                    "period_number": prev_period_num
                })
                
                if prev_data:
                    previous_period_consumption = prev_data.get("total_consumption", 0)
                    if previous_period_consumption > 0:
                        period_over_period_change = (
                            (consumption_data["total_consumption"] - previous_period_consumption) 
                            / previous_period_consumption
                        ) * 100
            
            # Geçen yılın aynı periyodu
            previous_year_consumption = None
            year_over_year_change = None
            
            prev_year_data = await self.db.consumption_periods.find_one({
                "customer_id": customer_id,
                "product_code": product_code,
                "period_type": period_type,
                "period_year": year - 1,
                "period_number": period_num
            })
            
            if prev_year_data:
                previous_year_consumption = prev_year_data.get("total_consumption", 0)
                if previous_year_consumption > 0:
                    year_over_year_change = (
                        (consumption_data["total_consumption"] - previous_year_consumption)
                        / previous_year_consumption
                    ) * 100
            
            # Trend direction
            trend_direction = "stable"
            if year_over_year_change:
                if year_over_year_change > 10:
                    trend_direction = "increasing"
                elif year_over_year_change < -10:
                    trend_direction = "decreasing"
            
            # ConsumptionPeriod oluştur
            period_record = ConsumptionPeriod(
                customer_id=customer_id,
                product_id=product_id,
                product_code=product_code,
                product_name=product_name,
                period_type=period_type,
                period_year=year,
                period_number=period_num,
                period_start_date=consumption_data["period_start"],
                period_end_date=consumption_data["period_end"],
                total_consumption=consumption_data["total_consumption"],
                daily_average=consumption_data["daily_average"],
                invoice_count=consumption_data["invoice_count"],
                previous_period_consumption=previous_period_consumption,
                previous_year_same_period=previous_year_consumption,
                period_over_period_change=period_over_period_change,
                year_over_year_change=year_over_year_change,
                trend_direction=trend_direction
            )
            
            doc = period_record.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            
            # Mevcut kayıt var mı kontrol et
            existing = await self.db.consumption_periods.find_one({
                "customer_id": customer_id,
                "product_code": product_code,
                "period_type": period_type,
                "period_year": year,
                "period_number": period_num
            })
            
            if existing:
                await self.db.consumption_periods.update_one(
                    {"period_id": existing["period_id"]},
                    {"$set": doc}
                )
                updated_count += 1
            else:
                await self.db.consumption_periods.insert_one(doc)
                created_count += 1
        
        return {
            "success": True,
            "period_type": period_type,
            "created": created_count,
            "updated": updated_count,
            "total": created_count + updated_count
        }
    
    async def compare_year_over_year(
        self,
        customer_id: str,
        product_code: str,
        period_type: str,
        period_number: int,
        current_year: int
    ) -> Optional[YearOverYearComparison]:
        """
        Yıllık karşılaştırma yap (örnek: 2024 Ocak vs 2025 Ocak)
        """
        # Mevcut yıl verisi
        current = await self.db.consumption_periods.find_one({
            "customer_id": customer_id,
            "product_code": product_code,
            "period_type": period_type,
            "period_year": current_year,
            "period_number": period_number
        })
        
        # Önceki yıl verisi
        previous = await self.db.consumption_periods.find_one({
            "customer_id": customer_id,
            "product_code": product_code,
            "period_type": period_type,
            "period_year": current_year - 1,
            "period_number": period_number
        })
        
        if not current:
            return None
        
        current_consumption = current.get("total_consumption", 0)
        current_daily = current.get("daily_average", 0)
        product_name = current.get("product_name", "")
        
        if previous:
            previous_consumption = previous.get("total_consumption", 0)
            previous_daily = previous.get("daily_average", 0)
            
            absolute_change = current_consumption - previous_consumption
            percentage_change = (absolute_change / previous_consumption * 100) if previous_consumption > 0 else 0
            
            # Trend
            if percentage_change > 5:
                trend = "growth"
            elif percentage_change < -5:
                trend = "decline"
            else:
                trend = "stable"
        else:
            previous_consumption = 0
            previous_daily = 0
            absolute_change = current_consumption
            percentage_change = 0
            trend = "no_data"
        
        return YearOverYearComparison(
            customer_id=customer_id,
            product_code=product_code,
            product_name=product_name,
            period_type=period_type,
            period_number=period_number,
            current_year=current_year,
            current_year_consumption=current_consumption,
            current_year_daily_avg=current_daily,
            previous_year=current_year - 1,
            previous_year_consumption=previous_consumption,
            previous_year_daily_avg=previous_daily,
            absolute_change=absolute_change,
            percentage_change=percentage_change,
            trend_direction=trend
        )
    
    async def analyze_yearly_trend(
        self,
        customer_id: str,
        product_code: str,
        year: int,
        period_type: str = "monthly"
    ) -> Optional[TrendAnalysis]:
        """
        Yıllık trend analizi (12 ay veya 52 hafta)
        """
        max_periods = 12 if period_type == "monthly" else 52
        
        # Yıllık tüm periyot kayıtlarını getir
        cursor = self.db.consumption_periods.find(
            {
                "customer_id": customer_id,
                "product_code": product_code,
                "period_type": period_type,
                "period_year": year
            },
            {"_id": 0}
        ).sort("period_number", 1)
        
        records = await cursor.to_list(length=None)
        
        if not records:
            return None
        
        # Periyot listesi oluştur
        periods = []
        total_consumption = 0
        peak_period = 1
        peak_consumption = 0
        lowest_period = 1
        lowest_consumption = float('inf')
        
        for record in records:
            period_num = record.get("period_number")
            consumption = record.get("total_consumption", 0)
            daily_avg = record.get("daily_average", 0)
            
            periods.append({
                "period": period_num,
                "consumption": consumption,
                "daily_avg": daily_avg
            })
            
            total_consumption += consumption
            
            if consumption > peak_consumption:
                peak_consumption = consumption
                peak_period = period_num
            
            if consumption < lowest_consumption:
                lowest_consumption = consumption
                lowest_period = period_num
        
        average_consumption = total_consumption / len(periods) if periods else 0
        
        # Trend hesapla (ilk ve son çeyrek karşılaştırması)
        trend_direction = "stable"
        trend_percentage = 0.0
        
        if len(periods) >= 4:
            first_quarter = periods[:len(periods)//4]
            last_quarter = periods[-len(periods)//4:]
            
            first_avg = sum(p["consumption"] for p in first_quarter) / len(first_quarter)
            last_avg = sum(p["consumption"] for p in last_quarter) / len(last_quarter)
            
            if first_avg > 0:
                trend_percentage = ((last_avg - first_avg) / first_avg) * 100
                
                if trend_percentage > 15:
                    trend_direction = "increasing"
                elif trend_percentage < -15:
                    trend_direction = "decreasing"
                else:
                    # Mevsimsellik kontrolü
                    consumptions = [p["consumption"] for p in periods]
                    std_dev = (sum((x - average_consumption) ** 2 for x in consumptions) / len(consumptions)) ** 0.5
                    if std_dev > average_consumption * 0.3:
                        trend_direction = "seasonal"
        
        product_name = records[0].get("product_name", "")
        
        return TrendAnalysis(
            customer_id=customer_id,
            product_code=product_code,
            product_name=product_name,
            period_type=period_type,
            analysis_year=year,
            periods=periods,
            total_consumption=total_consumption,
            average_consumption=average_consumption,
            peak_period=peak_period,
            peak_consumption=peak_consumption,
            lowest_period=lowest_period,
            lowest_consumption=lowest_consumption if lowest_consumption != float('inf') else 0,
            overall_trend=trend_direction,
            trend_percentage=trend_percentage
        )
