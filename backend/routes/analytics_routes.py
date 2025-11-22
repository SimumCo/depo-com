from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from middleware.auth import get_current_user, require_role
from models.user import User, UserRole
from enum import Enum

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.distribution_db

class PeriodType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

@router.get("/dashboard-stats")
async def get_dashboard_stats(
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Get consolidated dashboard statistics"""
    
    # Total products
    total_products = await db.products.count_documents({"is_active": True})
    
    # Total inventory
    inventory_items = await db.inventory.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$total_units"}}}
    ]).to_list(1)
    total_inventory = inventory_items[0]['total'] if inventory_items else 0
    
    # Pending orders
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    # Out of stock count
    out_of_stock = await db.inventory.count_documents({"is_out_of_stock": True})
    
    # Total customers
    total_customers = await db.users.count_documents({"role": "customer", "is_active": True})
    
    # Active sales agents
    active_sales_agents = await db.users.count_documents({"role": "sales_agent", "is_active": True})
    
    # Total orders (all time)
    total_orders = await db.orders.count_documents({})
    
    # Active warehouses
    active_warehouses = await db.warehouses.count_documents({"is_active": True})
    
    # Active campaigns
    now = datetime.now(timezone.utc)
    active_campaigns = await db.campaigns.count_documents({
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    })
    
    return {
        "total_products": total_products,
        "total_inventory_units": total_inventory,
        "pending_orders": pending_orders,
        "out_of_stock_count": out_of_stock,
        "total_customers": total_customers,
        "active_sales_agents": active_sales_agents,
        "total_orders": total_orders,
        "active_warehouses": active_warehouses,
        "active_campaigns": active_campaigns
    }

@router.get("/sales")
async def get_sales_analytics(
    period: PeriodType = Query(PeriodType.DAILY),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTING]))
):
    """Get sales analytics with period filtering"""
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    
    if start_date and end_date:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    elif period == PeriodType.DAILY:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == PeriodType.WEEKLY:
        start = now - timedelta(days=7)
        end = now
    else:  # MONTHLY
        start = now - timedelta(days=30)
        end = now
    
    # Get orders in period
    orders = await db.orders.find({
        "created_at": {"$gte": start, "$lte": end},
        "status": {"$in": ["delivered", "dispatched", "ready", "preparing", "approved"]}
    }).to_list(10000)
    
    # Total sales amount
    total_sales = sum(order.get('total_amount', 0) for order in orders)
    
    # Total orders count
    total_orders_count = len(orders)
    
    # Sales trend (day by day)
    sales_by_date = {}
    for order in orders:
        date_key = order.get('created_at').strftime('%Y-%m-%d')
        if date_key not in sales_by_date:
            sales_by_date[date_key] = {"date": date_key, "amount": 0, "count": 0}
        sales_by_date[date_key]['amount'] += order.get('total_amount', 0)
        sales_by_date[date_key]['count'] += 1
    
    sales_trend = sorted(sales_by_date.values(), key=lambda x: x['date'])
    
    # Top products (most sold)
    product_sales = {}
    for order in orders:
        for product in order.get('products', []):
            product_id = product.get('product_id')
            quantity = product.get('quantity', 0)
            
            if product_id not in product_sales:
                product_sales[product_id] = {
                    "product_id": product_id,
                    "quantity": 0,
                    "revenue": 0
                }
            
            product_sales[product_id]['quantity'] += quantity
            product_sales[product_id]['revenue'] += product.get('price', 0) * quantity
    
    # Enrich with product details and get top 5
    top_products_list = sorted(product_sales.values(), key=lambda x: x['quantity'], reverse=True)[:5]
    
    for item in top_products_list:
        product = await db.products.find_one({"id": item['product_id']})
        if product:
            item['product_name'] = product.get('name')
            item['product_sku'] = product.get('sku')
    
    # Declining products (compare with previous period)
    prev_start = start - (end - start)
    prev_orders = await db.orders.find({
        "created_at": {"$gte": prev_start, "$lt": start},
        "status": {"$in": ["delivered", "dispatched", "ready", "preparing", "approved"]}
    }).to_list(10000)
    
    prev_product_sales = {}
    for order in prev_orders:
        for product in order.get('products', []):
            product_id = product.get('product_id')
            quantity = product.get('quantity', 0)
            prev_product_sales[product_id] = prev_product_sales.get(product_id, 0) + quantity
    
    declining_products = []
    for product_id, current_qty in product_sales.items():
        prev_qty = prev_product_sales.get(product_id, 0)
        if prev_qty > 0 and current_qty['quantity'] < prev_qty:
            decline_percentage = ((prev_qty - current_qty['quantity']) / prev_qty) * 100
            
            product = await db.products.find_one({"id": product_id})
            if product:
                declining_products.append({
                    "product_id": product_id,
                    "product_name": product.get('name'),
                    "product_sku": product.get('sku'),
                    "current_quantity": current_qty['quantity'],
                    "previous_quantity": prev_qty,
                    "decline_percentage": round(decline_percentage, 2)
                })
    
    declining_products.sort(key=lambda x: x['decline_percentage'], reverse=True)
    
    # Calculate trend direction
    if len(sales_trend) >= 2:
        recent_avg = sum(d['amount'] for d in sales_trend[-3:]) / min(3, len(sales_trend[-3:]))
        older_avg = sum(d['amount'] for d in sales_trend[:3]) / min(3, len(sales_trend[:3]))
        trend_direction = "up" if recent_avg > older_avg else "down" if recent_avg < older_avg else "stable"
    else:
        trend_direction = "stable"
    
    return {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "total_sales": round(total_sales, 2),
        "total_orders": total_orders_count,
        "average_order_value": round(total_sales / total_orders_count, 2) if total_orders_count > 0 else 0,
        "sales_trend": sales_trend,
        "trend_direction": trend_direction,
        "top_products": top_products_list,
        "declining_products": declining_products[:5]
    }

@router.get("/performance")
async def get_performance_analytics(
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Get performance and operations analytics"""
    
    # Get all sales agents
    sales_agents = await db.users.find({"role": "sales_agent", "is_active": True}).to_list(1000)
    
    # Calculate sales for each agent (last 30 days)
    now = datetime.now(timezone.utc)
    last_30_days = now - timedelta(days=30)
    
    agent_performance = []
    for agent in sales_agents:
        agent_id = agent.get('id')
        
        # Get orders for this agent's customers
        agent_orders = await db.orders.find({
            "sales_rep_id": agent_id,
            "created_at": {"$gte": last_30_days},
            "status": {"$in": ["delivered", "dispatched", "ready", "preparing", "approved"]}
        }).to_list(10000)
        
        total_sales = sum(order.get('total_amount', 0) for order in agent_orders)
        total_orders = len(agent_orders)
        
        # Get customer count
        customers = await db.sales_routes.count_documents({"sales_rep_id": agent_id})
        
        agent_performance.append({
            "agent_id": agent_id,
            "agent_name": agent.get('full_name', agent.get('username')),
            "total_sales": round(total_sales, 2),
            "total_orders": total_orders,
            "total_customers": customers,
            "average_order_value": round(total_sales / total_orders, 2) if total_orders > 0 else 0
        })
    
    # Sort by total sales
    agent_performance.sort(key=lambda x: x['total_sales'], reverse=True)
    top_agents = agent_performance[:5]
    
    # Active agents count
    active_agents_count = len(sales_agents)
    
    # Total deliveries (last 30 days)
    total_deliveries = await db.orders.count_documents({
        "status": "delivered",
        "delivered_date": {"$gte": last_30_days}
    })
    
    # Stock turnover rate (simplified calculation)
    # Turnover = Cost of Goods Sold / Average Inventory
    # Simplified: Total orders quantity / Current inventory
    total_order_quantity = 0
    all_orders = await db.orders.find({
        "created_at": {"$gte": last_30_days},
        "status": {"$in": ["delivered", "dispatched"]}
    }).to_list(10000)
    
    for order in all_orders:
        for product in order.get('products', []):
            total_order_quantity += product.get('quantity', 0)
    
    inventory_items = await db.inventory.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$total_units"}}}
    ]).to_list(1)
    total_inventory = inventory_items[0]['total'] if inventory_items else 1
    
    # Turnover rate (times per month)
    stock_turnover_rate = round(total_order_quantity / total_inventory, 2) if total_inventory > 0 else 0
    
    return {
        "top_sales_agents": top_agents,
        "active_agents_count": active_agents_count,
        "total_deliveries_last_30_days": total_deliveries,
        "stock_turnover_rate": stock_turnover_rate,
        "all_agents_performance": agent_performance
    }

@router.get("/stock")
async def get_stock_analytics(
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Get stock control analytics"""
    
    # Get all warehouses
    warehouses = await db.warehouses.find({"is_active": True}).to_list(100)
    
    warehouse_summaries = []
    critical_stock_alerts = []
    low_stock_products = []
    
    for warehouse in warehouses:
        warehouse_id = warehouse.get('id')
        
        # Get inventory for this warehouse
        inventory_items = await db.inventory.find({"warehouse_id": warehouse_id}).to_list(1000)
        
        total_stock = sum(item.get('total_units', 0) for item in inventory_items)
        low_stock_count = 0
        out_of_stock_count = 0
        
        for item in inventory_items:
            product = await db.products.find_one({"id": item.get('product_id')})
            if not product:
                continue
            
            product_name = product.get('name')
            product_sku = product.get('sku')
            units = item.get('total_units', 0)
            
            # Critical stock (< 5 units)
            if units < 5:
                critical_stock_alerts.append({
                    "product_id": item.get('product_id'),
                    "product_name": product_name,
                    "product_sku": product_sku,
                    "warehouse_id": warehouse_id,
                    "warehouse_name": warehouse.get('name'),
                    "current_stock": units,
                    "severity": "critical"
                })
                out_of_stock_count += 1
            # Low stock (< 20 units)
            elif units < 20:
                low_stock_products.append({
                    "product_id": item.get('product_id'),
                    "product_name": product_name,
                    "product_sku": product_sku,
                    "warehouse_id": warehouse_id,
                    "warehouse_name": warehouse.get('name'),
                    "current_stock": units,
                    "severity": "low"
                })
                low_stock_count += 1
        
        capacity = warehouse.get('capacity', 0)
        capacity_usage = (total_stock / capacity * 100) if capacity > 0 else 0
        
        warehouse_summaries.append({
            "warehouse_id": warehouse_id,
            "warehouse_name": warehouse.get('name'),
            "location": warehouse.get('location'),
            "total_stock": total_stock,
            "capacity": capacity,
            "capacity_usage_percentage": round(capacity_usage, 2),
            "low_stock_count": low_stock_count,
            "critical_stock_count": out_of_stock_count,
            "status": "critical" if capacity_usage > 90 else "warning" if capacity_usage > 70 else "healthy"
        })
    
    # Sort alerts by severity
    critical_stock_alerts.sort(key=lambda x: x['current_stock'])
    low_stock_products.sort(key=lambda x: x['current_stock'])
    
    return {
        "warehouse_summaries": warehouse_summaries,
        "critical_stock_alerts": critical_stock_alerts[:20],
        "low_stock_products": low_stock_products[:20],
        "total_warehouses": len(warehouses),
        "total_critical_alerts": len(critical_stock_alerts),
        "total_low_stock": len(low_stock_products)
    }
