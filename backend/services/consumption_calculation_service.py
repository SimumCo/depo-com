"""
Consumption Calculation Service
Fatura bazlı müşteri tüketim hesaplama servisi
"""

from datetime import datetime
from typing import List, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.customer_consumption import CustomerConsumption
import logging

logger = logging.getLogger(__name__)


class ConsumptionCalculationService:
    """Fatura bazlı tüketim hesaplama servisi"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def _parse_invoice_date(self, date_str: str) -> datetime:
        """
        Fatura tarihini parse et
        Desteklenen formatlar:
        - "DD MM YYYY" (15 11 2024)
        - "DD-MM-YYYY" (15-11-2024)
        - "DD/MM/YYYY" (15/11/2024)
        - "YYYY-MM-DD" (2024-11-15) - ISO format
        """
        try:
            # ISO format kontrolü (YYYY-MM-DD)
            if len(date_str) == 10 and date_str[4] == '-' and date_str[7] == '-':
                # ISO format: 2024-11-15
                parts = date_str.split('-')
                year, month, day = parts
                return datetime(int(year), int(month), int(day))
            
            # Diğer formatlar (DD MM YYYY, DD-MM-YYYY, DD/MM/YYYY)
            parts = date_str.replace("-", " ").replace("/", " ").split()
            if len(parts) == 3:
                # Hangi format olduğunu tespit et
                if len(parts[0]) == 4:
                    # YYYY MM DD format
                    year, month, day = parts
                else:
                    # DD MM YYYY format
                    day, month, year = parts
                
                return datetime(int(year), int(month), int(day))
        except Exception as e:
            logger.error(f"Date parsing error for {date_str}: {e}")
        
        # Fallback: Şimdiki zaman
        return datetime.utcnow()
    
    async def _find_previous_invoice_with_product(
        self, 
        customer_id: str, 
        product_code: str,
        before_date: datetime,
        current_invoice_id: str
    ) -> Optional[Dict]:
        """
        Belirli bir üründen içeren en yakın önceki faturayı bul
        
        Args:
            customer_id: Müşteri ID
            product_code: Ürün kodu
            before_date: Bu tarihten önce
            current_invoice_id: Mevcut fatura ID (kendini dahil etme)
        
        Returns:
            Fatura dict veya None
        """
        # Müşterinin tüm önceki faturalarını al (tarih sırasına göre azalan)
        cursor = self.db.invoices.find(
            {
                "customer_id": customer_id,
                "is_active": True,
                "id": {"$ne": current_invoice_id}  # Mevcut faturayı dahil etme
            },
            {"_id": 0}
        )
        
        invoices = await cursor.to_list(length=None)
        
        # Faturaları tarih sırasına göre sırala (en yeniden eskiye)
        sorted_invoices = sorted(
            invoices,
            key=lambda inv: self._parse_invoice_date(inv.get("invoice_date", "")),
            reverse=True
        )
        
        # Her faturada bu ürünü ara (en yeniden başlayarak)
        for invoice in sorted_invoices:
            invoice_date = self._parse_invoice_date(invoice.get("invoice_date", ""))
            
            # Sadece belirtilen tarihten önce olanları kontrol et
            if invoice_date >= before_date:
                continue
            
            # Bu faturada ürün var mı?
            products = invoice.get("products", [])
            for product in products:
                if product.get("product_code", "").strip() == product_code.strip():
                    # BULUNDU! Bu ürünü içeren en yakın önceki fatura
                    return {
                        "invoice_id": invoice.get("id"),
                        "invoice_date": invoice.get("invoice_date"),
                        "product_quantity": product.get("quantity", 0.0)
                    }
        
        # Hiçbir önceki faturada bu ürün bulunamadı
        return None
    
    async def calculate_consumption_for_invoice(self, invoice_id: str) -> Dict[str, any]:
        """
        Yeni fatura için tüketim hesapla
        
        Args:
            invoice_id: Yeni fatura ID
        
        Returns:
            Sonuç özeti
        """
        # Faturayı getir
        invoice = await self.db.invoices.find_one(
            {"id": invoice_id, "is_active": True},
            {"_id": 0}
        )
        
        if not invoice:
            logger.error(f"Invoice not found: {invoice_id}")
            return {"success": False, "error": "Invoice not found"}
        
        customer_id = invoice.get("customer_id")
        if not customer_id:
            logger.warning(f"Invoice {invoice_id} has no customer_id - skipping consumption calculation")
            return {
                "success": False, 
                "error": "Invoice has no customer_id"
            }
        
        invoice_date = invoice.get("invoice_date")
        invoice_date_obj = self._parse_invoice_date(invoice_date)
        products = invoice.get("products", [])
        
        consumption_records_created = 0
        first_time_products = 0
        
        # Her ürün için tüketim hesapla
        for product in products:
            product_code = product.get("product_code", "").strip()
            product_name = product.get("product_name", "").strip()
            target_quantity = float(product.get("quantity", 0.0))
            
            if not product_code:
                logger.warning(f"Product without code in invoice {invoice_id}, skipping")
                continue
            
            # Bu ürünü içeren product_id'yi bul (sku ile eşleştir)
            product_doc = await self.db.products.find_one(
                {"sku": product_code},
                {"_id": 0, "id": 1}
            )
            
            product_id = product_doc.get("id") if product_doc else product_code
            
            # Önceki faturada bu ürünü ara
            previous = await self._find_previous_invoice_with_product(
                customer_id=customer_id,
                product_code=product_code,
                before_date=invoice_date_obj,
                current_invoice_id=invoice_id
            )
            
            if previous:
                # ÜRÜN BULUNDU - Tüketim hesapla
                source_invoice_id = previous["invoice_id"]
                source_invoice_date = previous["invoice_date"]
                source_quantity = float(previous["product_quantity"])
                
                # Tarih farkı hesapla
                source_date_obj = self._parse_invoice_date(source_invoice_date)
                days_between = (invoice_date_obj - source_date_obj).days
                
                # Tüketim miktarı = SON ALINAN MİKTAR (source_quantity)
                # Mantık: Son faturada 50 adet almış, ara faturalarda görünmüyor (stokta var),
                # yeni faturada görünüyor demek ki stok bitmiş ve 50 adet tüketilmiş
                consumption_quantity = source_quantity
                
                # Günlük tüketim oranı
                daily_rate = consumption_quantity / days_between if days_between > 0 else 0.0
                
                # Beklenen tüketim hesapla (bir önceki yılın aynı dönemi)
                expected_consumption = await self._calculate_expected_consumption(
                    customer_id=customer_id,
                    product_code=product_code,
                    days=days_between,
                    current_date=invoice_date_obj
                )
                
                # Sapma oranı hesapla
                if expected_consumption > 0:
                    deviation_rate = ((consumption_quantity - expected_consumption) / expected_consumption) * 100
                else:
                    deviation_rate = 0.0
                
                # Tüketim kaydı oluştur
                consumption = CustomerConsumption(
                    customer_id=customer_id,
                    product_id=product_id,
                    product_code=product_code,
                    product_name=product_name,
                    source_invoice_id=source_invoice_id,
                    source_invoice_date=source_invoice_date,
                    source_quantity=source_quantity,
                    target_invoice_id=invoice_id,
                    target_invoice_date=invoice_date,
                    target_quantity=target_quantity,
                    days_between=days_between,
                    consumption_quantity=consumption_quantity,
                    daily_consumption_rate=daily_rate,
                    expected_consumption=expected_consumption,
                    deviation_rate=round(deviation_rate, 2),
                    can_calculate=True,
                    notes=f"Günlük ort: {daily_rate:.2f} | Beklenen (önceki yıl): {expected_consumption:.2f} | Sapma: {deviation_rate:.1f}%"
                )
            else:
                # ÜRÜN BULUNAMADI - İlk fatura kaydı
                first_time_products += 1
                consumption = CustomerConsumption(
                    customer_id=customer_id,
                    product_id=product_id,
                    product_code=product_code,
                    product_name=product_name,
                    source_invoice_id=None,
                    source_invoice_date=None,
                    source_quantity=0.0,
                    target_invoice_id=invoice_id,
                    target_invoice_date=invoice_date,
                    target_quantity=target_quantity,
                    days_between=0,
                    consumption_quantity=0.0,
                    daily_consumption_rate=0.0,
                    expected_consumption=0.0,
                    deviation_rate=0.0,
                    can_calculate=False,
                    notes="İlk fatura - Tüketim hesaplanamaz"
                )
            
            # MongoDB'ye kaydet
            doc = consumption.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            
            # Aynı kayıt var mı kontrol et (중복 önleme)
            existing = await self.db.customer_consumption.find_one({
                "customer_id": customer_id,
                "product_code": product_code,
                "target_invoice_id": invoice_id
            })
            
            if not existing:
                await self.db.customer_consumption.insert_one(doc)
                consumption_records_created += 1
            else:
                logger.info(f"Consumption record already exists for {customer_id}-{product_code}-{invoice_id}")
        
        return {
            "success": True,
            "invoice_id": invoice_id,
            "customer_id": customer_id,
            "total_products": len(products),
            "consumption_records_created": consumption_records_created,
            "first_time_products": first_time_products
        }
    
    async def bulk_calculate_all_invoices(self) -> Dict[str, any]:
        """
        Tüm faturalar için tüketim hesapla (mevcut veriler için)
        Faturaları tarih sırasına göre işler
        """
        # Tüm faturaları tarih sırasına göre al
        cursor = self.db.invoices.find(
            {"is_active": True},
            {"_id": 0}
        )
        
        invoices = await cursor.to_list(length=None)
        
        # Tarih sırasına göre sırala (eskiden yeniye)
        sorted_invoices = sorted(
            invoices,
            key=lambda inv: self._parse_invoice_date(inv.get("invoice_date", ""))
        )
        
        total_invoices = len(sorted_invoices)
        processed = 0
        total_records = 0
        
        logger.info(f"Starting bulk consumption calculation for {total_invoices} invoices")
        
        for invoice in sorted_invoices:
            result = await self.calculate_consumption_for_invoice(invoice.get("id"))
            if result.get("success"):
                total_records += result.get("consumption_records_created", 0)
                processed += 1
        
        return {
            "success": True,
            "total_invoices": total_invoices,
            "invoices_processed": processed,
            "total_consumption_records_created": total_records
        }

    async def _calculate_expected_consumption(
        self, 
        customer_id: str, 
        product_code: str, 
        days: int,
        current_date: datetime = None
    ) -> float:
        """
        Beklenen tüketimi hesapla (bir önceki yılın aynı döneminden)
        
        Mevsimsel tüketim farklılıklarını dikkate alır.
        Örnek: 2024 Ocak için beklenen tüketim = 2023 Ocak'ın günlük ortalaması * gün sayısı
        
        Args:
            customer_id: Müşteri ID
            product_code: Ürün kodu
            days: Kaç günlük tüketim bekleniyor
            current_date: Şu anki fatura tarihi (mevsim tespiti için)
            
        Returns:
            Beklenen tüketim miktarı
        """
        try:
            if not current_date:
                return 0.0
            
            # Bir önceki yılın aynı ayını bul
            previous_year = current_date.year - 1
            current_month = current_date.month
            
            # Bir önceki yılın aynı ayındaki tüm tüketim kayıtlarını al
            all_records = await self.db.customer_consumption.find(
                {
                    "customer_id": customer_id,
                    "product_code": product_code,
                    "can_calculate": True
                }
            ).to_list(length=500)
            
            # Bir önceki yılın aynı ayına ait kayıtları filtrele
            previous_year_same_month = []
            for record in all_records:
                try:
                    target_date_str = record.get("target_invoice_date")
                    if target_date_str:
                        target_date = self._parse_invoice_date(target_date_str)
                        if target_date.year == previous_year and target_date.month == current_month:
                            previous_year_same_month.append(record)
                except:
                    continue
            
            if previous_year_same_month:
                # Bir önceki yılın aynı ayının günlük ortalama tüketimini hesapla
                total_daily_rate = sum(r.get("daily_consumption_rate", 0.0) for r in previous_year_same_month)
                avg_daily_rate = total_daily_rate / len(previous_year_same_month)
                
                # Beklenen tüketim = önceki yılın günlük ortalaması * bu dönemin gün sayısı
                expected = avg_daily_rate * days
                
                return round(expected, 2)
            else:
                # Önceki yıl verisi yoksa, genel ortalama al (son 5 kayıt)
                recent_records = await self.db.customer_consumption.find(
                    {
                        "customer_id": customer_id,
                        "product_code": product_code,
                        "can_calculate": True
                    }
                ).sort("created_at", -1).limit(5).to_list(length=5)
                
                if recent_records:
                    total_daily_rate = sum(r.get("daily_consumption_rate", 0.0) for r in recent_records)
                    avg_daily_rate = total_daily_rate / len(recent_records)
                    expected = avg_daily_rate * days
                    return round(expected, 2)
                
                return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating expected consumption: {e}")
            return 0.0

