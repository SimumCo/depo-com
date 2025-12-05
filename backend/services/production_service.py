# Production Management Services
import uuid
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.production import (
    ProductionPlan, ProductionOrder, BillOfMaterials, 
    RawMaterialRequirement, ProductionOrderStatus,
    ProductionOrderPriority, ProductionPlanStatus
)


class BOMCalculationService:
    """Reçete Hesaplama Servisi"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def calculate_raw_material_needs(self, plan_id: str) -> List[Dict]:
        """Üretim planı için hammadde ihtiyacını hesapla"""
        
        # Üretim planını getir
        plan = await self.db.production_plans.find_one({"id": plan_id})
        if not plan:
            return []
        
        # Tüm hammadde ihtiyaçlarını topla
        raw_material_totals = {}
        
        for item in plan.get("items", []):
            product_id = item["product_id"]
            target_quantity = item["target_quantity"]
            
            # Bu ürün için BOM'u bul
            bom = await self.db.bill_of_materials.find_one({
                "product_id": product_id,
                "is_active": True
            })
            
            if not bom:
                continue
            
            # BOM'daki her hammadde için ihtiyacı hesapla
            for bom_item in bom.get("items", []):
                raw_material_id = bom_item["raw_material_id"]
                raw_material_name = bom_item["raw_material_name"]
                required_per_unit = bom_item["quantity"]
                unit = bom_item["unit"]
                
                # Toplam ihtiyacı hesapla
                total_required = (target_quantity / bom.get("output_quantity", 1.0)) * required_per_unit
                
                # Hammadde toplamlarına ekle
                if raw_material_id not in raw_material_totals:
                    raw_material_totals[raw_material_id] = {
                        "raw_material_id": raw_material_id,
                        "raw_material_name": raw_material_name,
                        "required_quantity": 0.0,
                        "unit": unit
                    }
                
                raw_material_totals[raw_material_id]["required_quantity"] += total_required
        
        # Depo stoklarını kontrol et
        requirements = []
        for raw_material_id, data in raw_material_totals.items():
            # Depo stoğunu bul
            inventory = await self.db.inventory.find_one({
                "product_id": raw_material_id
            })
            
            available_quantity = inventory.get("quantity_in_stock", 0.0) if inventory else 0.0
            required_quantity = data["required_quantity"]
            deficit = max(0, required_quantity - available_quantity)
            
            requirement = RawMaterialRequirement(
                plan_id=plan_id,
                raw_material_id=raw_material_id,
                raw_material_name=data["raw_material_name"],
                required_quantity=required_quantity,
                unit=data["unit"],
                available_quantity=available_quantity,
                deficit_quantity=deficit,
                is_sufficient=(deficit == 0),
                warehouse_id=inventory.get("warehouse_id") if inventory else None
            )
            
            requirements.append(requirement.model_dump())
        
        # Veritabanına kaydet
        if requirements:
            # Eski kayıtları sil
            await self.db.raw_material_requirements.delete_many({"plan_id": plan_id})
            # Yeni kayıtları ekle
            await self.db.raw_material_requirements.insert_many(requirements)
        
        return requirements


class ProductionPlanningService:
    """Üretim Planlama Servisi"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def create_plan_from_orders(
        self, 
        customer_order_ids: List[str],
        plan_type: str = "weekly"
    ) -> Optional[Dict]:
        """Müşteri siparişlerinden otomatik üretim planı oluştur"""
        
        # Müşteri siparişlerini getir
        orders = await self.db.orders.find({
            "id": {"$in": customer_order_ids},
            "status": {"$in": ["pending", "approved"]}
        }).to_list(length=None)
        
        if not orders:
            return None
        
        # Ürünleri topla ve miktarları hesapla
        product_totals = {}
        for order in orders:
            for item in order.get("items", []):
                product_id = item["product_id"]
                product_name = item.get("product_name", "")
                quantity = item["quantity"]
                unit = item.get("unit", "adet")
                
                if product_id not in product_totals:
                    product_totals[product_id] = {
                        "product_id": product_id,
                        "product_name": product_name,
                        "target_quantity": 0.0,
                        "unit": unit,
                        "priority": ProductionOrderPriority.MEDIUM
                    }
                
                product_totals[product_id]["target_quantity"] += quantity
        
        # Plan tarihleri belirle
        now = datetime.now()
        if plan_type == "weekly":
            start_date = now
            end_date = now + timedelta(days=7)
        elif plan_type == "daily":
            start_date = now
            end_date = now + timedelta(days=1)
        else:
            start_date = now
            end_date = now + timedelta(days=30)
        
        # Plan oluştur
        from models.production import ProductionPlan, ProductionPlanItem
        
        plan_items = [ProductionPlanItem(**item) for item in product_totals.values()]
        
        plan_number = f"PLAN-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
        
        plan = ProductionPlan(
            plan_number=plan_number,
            plan_type=plan_type,
            plan_date=now,
            start_date=start_date,
            end_date=end_date,
            items=plan_items,
            status=ProductionPlanStatus.DRAFT,
            created_by="system",
            notes=f"Otomatik oluşturuldu: {len(customer_order_ids)} siparişten"
        )
        
        # Veritabanına kaydet
        result = await self.db.production_plans.insert_one(plan.model_dump())
        
        return plan.model_dump()
    
    async def generate_production_orders_from_plan(self, plan_id: str, created_by: str) -> List[Dict]:
        """Üretim planından üretim emirleri oluştur"""
        
        # Planı getir
        plan = await self.db.production_plans.find_one({"id": plan_id})
        if not plan:
            return []
        
        # Her ürün için üretim emri oluştur
        orders = []
        now = datetime.now()
        
        for item in plan.get("items", []):
            order_number = f"URT-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
            
            order = ProductionOrder(
                order_number=order_number,
                plan_id=plan_id,
                product_id=item["product_id"],
                product_name=item["product_name"],
                target_quantity=item["target_quantity"],
                unit=item["unit"],
                priority=item.get("priority", ProductionOrderPriority.MEDIUM),
                status=ProductionOrderStatus.PENDING,
                created_by=created_by,
                notes=f"{plan['plan_number']} planından oluşturuldu"
            )
            
            orders.append(order.model_dump())
        
        # Veritabanına kaydet
        if orders:
            # Make a copy for database insertion
            orders_for_db = [order.copy() for order in orders]
            await self.db.production_orders.insert_many(orders_for_db)
        
        return orders


class ProductionScheduler:
    """Üretim Zamanlayıcı"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def assign_order_to_line(
        self, 
        order_id: str, 
        line_id: str,
        operator_id: Optional[str] = None
    ) -> bool:
        """Üretim emrini hatta ata"""
        
        # Hat müsait mi kontrol et
        line = await self.db.production_lines.find_one({"id": line_id})
        if not line or line.get("status") not in ["active", "idle"]:
            return False
        
        # Hattı güncelle
        await self.db.production_lines.update_one(
            {"id": line_id},
            {
                "$set": {
                    "current_order_id": order_id,
                    "status": "active",
                    "updated_at": datetime.now()
                }
            }
        )
        
        # Emri güncelle
        update_data = {
            "line_id": line_id,
            "line_name": line.get("name"),
            "status": ProductionOrderStatus.APPROVED.value,
            "updated_at": datetime.now()
        }
        
        if operator_id:
            operator = await self.db.users.find_one({"id": operator_id})
            if operator:
                update_data["assigned_operator_id"] = operator_id
                update_data["assigned_operator_name"] = operator.get("full_name")
        
        await self.db.production_orders.update_one(
            {"id": order_id},
            {"$set": update_data}
        )
        
        return True
    
    async def prioritize_orders(self) -> List[Dict]:
        """Üretim emirlerini önceliklendir"""
        
        # Bekleyen emirleri getir
        orders = await self.db.production_orders.find({
            "status": ProductionOrderStatus.PENDING.value
        }).sort([
            ("priority", -1),  # Önce yüksek öncelikli
            ("created_at", 1)  # Sonra eskiden yeniye
        ]).to_list(length=None)
        
        return orders
