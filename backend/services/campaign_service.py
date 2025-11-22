from typing import List, Dict, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.distribution_db

class CampaignService:
    """Kampanya uygulama servisi"""
    
    @staticmethod
    async def get_active_campaigns(customer_id: str = None, customer_group: str = "regular") -> List[Dict]:
        """Aktif kampanyaları getir"""
        now = datetime.now(timezone.utc)
        
        query = {
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        }
        
        campaigns = await db.campaigns.find(query).to_list(1000)
        
        # Müşteri grubuna göre filtrele
        filtered_campaigns = []
        for campaign in campaigns:
            groups = campaign.get('customer_groups', [])
            customer_ids = campaign.get('customer_ids', [])
            
            if 'all' in groups:
                filtered_campaigns.append(campaign)
            elif customer_group in groups:
                filtered_campaigns.append(campaign)
            elif customer_id and customer_id in customer_ids:
                filtered_campaigns.append(campaign)
        
        return filtered_campaigns
    
    @staticmethod
    async def apply_campaigns_to_order(order_items: List[Dict], customer_id: str = None, customer_group: str = "regular") -> Dict:
        """
        Siparişe kampanyaları uygula
        
        Returns:
            {
                'items': [...],  # Güncellenmiş ürünler (indirim uygulanmış)
                'gifts': [...],  # Hediye ürünler
                'total_discount': 0,  # Toplam indirim
                'applied_campaigns': [...]  # Uygulanan kampanyalar
            }
        """
        campaigns = await CampaignService.get_active_campaigns(customer_id, customer_group)
        
        updated_items = []
        gift_items = []
        total_discount = 0
        applied_campaigns = []
        
        for item in order_items:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 0)
            unit_price = item.get('price', 0)
            item_total = unit_price * quantity
            item_discount = 0
            
            # Her kampanyayı kontrol et
            for campaign in campaigns:
                campaign_type = campaign.get('campaign_type', 'simple_discount')
                applies_to = campaign.get('applies_to_product_id')
                
                # Bu ürüne uygulanabilir mi?
                if applies_to and applies_to != product_id:
                    continue
                
                # 1. SIMPLE_DISCOUNT - Basit indirim
                if campaign_type == 'simple_discount':
                    product_ids = campaign.get('product_ids', [])
                    if not product_ids or product_id in product_ids:
                        discount_type = campaign.get('discount_type')
                        discount_value = campaign.get('discount_value', 0)
                        
                        if discount_type == 'percentage':
                            discount = item_total * (discount_value / 100)
                        else:  # fixed_amount
                            discount = discount_value * quantity
                        
                        item_discount += discount
                        if campaign['id'] not in [c['id'] for c in applied_campaigns]:
                            applied_campaigns.append({
                                'id': campaign['id'],
                                'name': campaign['name'],
                                'type': 'simple_discount',
                                'discount': discount
                            })
                
                # 2. BUY_X_GET_Y - X al Y kazan
                elif campaign_type == 'buy_x_get_y':
                    min_qty = campaign.get('min_quantity', 0)
                    gift_product_id = campaign.get('gift_product_id')
                    gift_qty = campaign.get('gift_quantity', 0)
                    
                    if quantity >= min_qty and gift_product_id:
                        # Hediye ürün ekle
                        gift_product = await db.products.find_one({"id": gift_product_id})
                        if gift_product:
                            gift_items.append({
                                'product_id': gift_product_id,
                                'product_name': gift_product.get('name'),
                                'quantity': gift_qty,
                                'unit_price': 0,  # Hediye - fiyat 0
                                'total': 0,
                                'is_gift': True,
                                'campaign_name': campaign['name']
                            })
                            
                            if campaign['id'] not in [c['id'] for c in applied_campaigns]:
                                applied_campaigns.append({
                                    'id': campaign['id'],
                                    'name': campaign['name'],
                                    'type': 'buy_x_get_y',
                                    'gift_product': gift_product.get('name'),
                                    'gift_quantity': gift_qty
                                })
                
                # 3. BULK_DISCOUNT - Toplu alımda birim indirim
                elif campaign_type == 'bulk_discount':
                    bulk_min = campaign.get('bulk_min_quantity', 0)
                    discount_per_unit = campaign.get('bulk_discount_per_unit', 0)
                    
                    if quantity >= bulk_min:
                        discount = discount_per_unit * quantity
                        item_discount += discount
                        
                        if campaign['id'] not in [c['id'] for c in applied_campaigns]:
                            applied_campaigns.append({
                                'id': campaign['id'],
                                'name': campaign['name'],
                                'type': 'bulk_discount',
                                'discount': discount,
                                'per_unit_discount': discount_per_unit
                            })
            
            # Güncellenmiş item
            updated_items.append({
                **item,
                'original_price': unit_price,
                'discount': item_discount,
                'final_price': unit_price - (item_discount / quantity) if quantity > 0 else unit_price,
                'total': item_total - item_discount
            })
            
            total_discount += item_discount
        
        return {
            'items': updated_items,
            'gifts': gift_items,
            'total_discount': round(total_discount, 2),
            'applied_campaigns': applied_campaigns
        }
    
    @staticmethod
    async def get_campaign_summary(campaign_id: str) -> Dict:
        """Kampanya özeti"""
        campaign = await db.campaigns.find_one({"id": campaign_id})
        if not campaign:
            return None
        
        campaign_type = campaign.get('campaign_type', 'simple_discount')
        
        summary = {
            'id': campaign['id'],
            'name': campaign['name'],
            'type': campaign_type,
            'description': campaign.get('description', ''),
            'start_date': campaign['start_date'],
            'end_date': campaign['end_date'],
            'is_active': campaign['is_active']
        }
        
        # Tip bazlı detaylar
        if campaign_type == 'simple_discount':
            summary['discount_type'] = campaign.get('discount_type')
            summary['discount_value'] = campaign.get('discount_value')
        
        elif campaign_type == 'buy_x_get_y':
            summary['min_quantity'] = campaign.get('min_quantity')
            summary['gift_quantity'] = campaign.get('gift_quantity')
            
            # Hediye ürün bilgisi
            gift_product_id = campaign.get('gift_product_id')
            if gift_product_id:
                gift_product = await db.products.find_one({"id": gift_product_id})
                if gift_product:
                    summary['gift_product_name'] = gift_product.get('name')
            
            # Ana ürün bilgisi
            applies_to = campaign.get('applies_to_product_id')
            if applies_to:
                product = await db.products.find_one({"id": applies_to})
                if product:
                    summary['applies_to_product_name'] = product.get('name')
        
        elif campaign_type == 'bulk_discount':
            summary['bulk_min_quantity'] = campaign.get('bulk_min_quantity')
            summary['bulk_discount_per_unit'] = campaign.get('bulk_discount_per_unit')
            
            # Ana ürün bilgisi
            applies_to = campaign.get('applies_to_product_id')
            if applies_to:
                product = await db.products.find_one({"id": applies_to})
                if product:
                    summary['applies_to_product_name'] = product.get('name')
        
        return summary
