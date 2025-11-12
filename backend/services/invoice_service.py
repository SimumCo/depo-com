"""
Invoice Service
===============
Fatura ile ilgili business logic.
"""

from typing import Dict, List, Optional
from repositories.invoice_repository import InvoiceRepository
from repositories.product_repository import ProductRepository
from services.customer_service import CustomerService
from repositories.base_repository import AsyncIOMotorDatabase
from models.invoice import Invoice, InvoiceProduct
from bs4 import BeautifulSoup
import re


class InvoiceService:
    """Service for invoice business logic"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.invoice_repo = InvoiceRepository(db)
        self.product_repo = ProductRepository(db)
        self.customer_service = CustomerService(db)
    
    async def create_manual_invoice(
        self,
        customer_data: Dict,
        invoice_data: Dict,
        products_data: List[Dict],
        uploaded_by: str
    ) -> Dict:
        """
        Create manual invoice with auto customer/product creation
        
        Returns:
            Dict with invoice_id, customer_created, products_created info
        """
        # 1. Find or create customer
        customer = await self.customer_service.find_by_tax_id(customer_data["customer_tax_id"])
        
        customer_created_info = None
        if not customer:
            customer_created_info = await self.customer_service.create_customer_from_invoice(
                customer_name=customer_data["customer_name"],
                tax_id=customer_data["customer_tax_id"],
                address=customer_data.get("address", ""),
                email=customer_data.get("email", ""),
                phone=customer_data.get("phone", "")
            )
            customer_id = customer_created_info["customer_id"]
        else:
            customer_id = customer["id"]
        
        # 2. Find or create products
        products_created = []
        for product_data in products_data:
            existing_product = await self.product_repo.find_by_sku(product_data["product_code"])
            
            if not existing_product:
                # Create new product
                new_product = {
                    "id": f"prod_{product_data['product_code']}",
                    "name": product_data["product_name"],
                    "sku": product_data["product_code"],
                    "category": product_data["category"],
                    "weight": 1.0,
                    "units_per_case": 1,
                    "logistics_price": 0.0,
                    "dealer_price": 0.0,
                    "is_active": True
                }
                await self.product_repo.create_product(new_product)
                products_created.append(product_data["product_name"])
        
        # 3. Create invoice
        invoice_obj = Invoice(
            invoice_number=invoice_data["invoice_number"],
            invoice_date=invoice_data["invoice_date"],
            customer_name=customer_data["customer_name"],
            customer_tax_id=customer_data["customer_tax_id"],
            customer_id=customer_id,
            html_content="",  # Manual invoice has no HTML
            products=[InvoiceProduct(**p) for p in products_data],
            subtotal=invoice_data["subtotal"],
            total_discount=invoice_data.get("total_discount", "0"),
            total_tax=invoice_data["total_tax"],
            grand_total=invoice_data["grand_total"],
            uploaded_by=uploaded_by
        )
        
        doc = invoice_obj.model_dump()
        doc['uploaded_at'] = doc['uploaded_at'].isoformat()
        
        invoice_id = await self.invoice_repo.create_invoice(doc)
        
        # Otomatik tüketim hesaplama
        try:
            from services.consumption_calculation_service import ConsumptionCalculationService
            import logging
            logger = logging.getLogger(__name__)
            
            consumption_service = ConsumptionCalculationService(self.invoice_repo.db)
            consumption_result = await consumption_service.calculate_consumption_for_invoice(invoice_id)
            logger.info(f"Consumption calculation result for manual invoice: {consumption_result}")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Consumption calculation failed for manual invoice {invoice_id}: {e}")
            # Hata olsa bile fatura başarılı kaydedildi, devam et
        
        return {
            "invoice_id": invoice_id,
            "customer_created": customer_created_info is not None,
            "customer_info": customer_created_info,
            "products_created": products_created
        }
    
    def parse_html_invoice(self, html_content: str) -> Dict:
        """
        Parse HTML invoice (SED format)
        
        Returns:
            Dict with parsed invoice data
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        text_content = soup.get_text()
        
        invoice_data = {
            "invoice_number": "",
            "invoice_date": "",
            "customer_name": "",
            "customer_tax_id": "",
            "products": [],
            "subtotal": "0",
            "total_discount": "0",
            "total_tax": "0",
            "grand_total": "0"
        }
        
        # Parse invoice number
        invoice_num_match = re.search(r'([A-Z]{2,3}\d{10,})', text_content, re.IGNORECASE)
        if invoice_num_match:
            invoice_data["invoice_number"] = invoice_num_match.group(1)
        
        # Parse customer name
        customer_id_table = soup.find('table', {'id': 'customerIDTable'})
        if customer_id_table:
            bold_spans = customer_id_table.find_all('span', {'style': lambda x: x and 'font-weight:bold' in x})
            if len(bold_spans) >= 2:
                invoice_data["customer_name"] = bold_spans[1].get_text(strip=True)
        
        # Parse tax ID
        if customer_id_table:
            vkn_cell = customer_id_table.find('td', string=re.compile(r'VKN:?\s*\d{10}'))
            if vkn_cell:
                vkn_match = re.search(r'VKN:?\s*(\d{10,11})', vkn_cell.get_text())
                if vkn_match:
                    invoice_data["customer_tax_id"] = vkn_match.group(1)
        
        # Parse date
        despatch_table = soup.find('table', {'id': 'despatchTable'})
        if despatch_table:
            date_cells = despatch_table.find_all('td')
            for i, cell in enumerate(date_cells):
                if 'Fatura Tarihi' in cell.get_text():
                    if i + 1 < len(date_cells):
                        date_text = date_cells[i + 1].get_text(strip=True)
                        date_match = re.search(r'(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})', date_text)
                        if date_match:
                            invoice_data["invoice_date"] = f"{date_match.group(1)} {date_match.group(2)} {date_match.group(3)}"
                        break
        
        # Parse products
        line_table = soup.find('table', {'id': 'lineTable'})
        if line_table:
            rows = line_table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) < 6:
                    continue
                
                row_text = row.get_text().lower()
                if 'ürün' in row_text and 'hizmet' in row_text:
                    continue
                
                try:
                    product_code = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                    product_name = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                    quantity_text = cells[3].get_text(strip=True) if len(cells) > 3 else "0"
                    unit_price_text = cells[5].get_text(strip=True) if len(cells) > 5 else "0"
                    total_text = cells[8].get_text(strip=True) if len(cells) > 8 else "0"
                    
                    quantity_match = re.search(r'(\d+)', quantity_text)
                    quantity = float(quantity_match.group(1)) if quantity_match else 0.0
                    
                    if product_name and len(product_name) > 2:
                        invoice_data["products"].append({
                            "product_code": product_code,
                            "product_name": product_name,
                            "quantity": quantity,
                            "unit_price": unit_price_text,
                            "total": total_text
                        })
                except:
                    continue
        
        # Parse totals
        budget_table = soup.find('table', {'id': 'budgetContainerTable'})
        if budget_table:
            budget_text = budget_table.get_text()
            
            subtotal_match = re.search(r'Mal\s+Hizmet\s+Toplam\s+Tutarı[:\s]*([\d\.,]+)\s*TL', budget_text, re.IGNORECASE)
            if subtotal_match:
                invoice_data["subtotal"] = subtotal_match.group(1)
            
            discount_match = re.search(r'Toplam\s+İskonto[:\s]*([\d\.,]+)\s*TL', budget_text, re.IGNORECASE)
            if discount_match:
                invoice_data["total_discount"] = discount_match.group(1)
            
            tax_match = re.search(r'(?:KDV|Vergi)[:\s]*([\d\.,]+)\s*TL', budget_text, re.IGNORECASE)
            if tax_match:
                invoice_data["total_tax"] = tax_match.group(1)
            
            grand_match = re.search(r'Ödenecek\s+Tutar[:\s]*([\d\.,]+)\s*TL', budget_text, re.IGNORECASE)
            if grand_match:
                invoice_data["grand_total"] = grand_match.group(1)
        
        return invoice_data
