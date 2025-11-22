"""
Notification Service
Otomatik bildirim oluşturma servisi
"""
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get('DB_NAME', 'distribution_management')]

async def create_notification(user_id: str, notification_type: str, title: str, message: str, 
                       related_order_id: str = None, related_campaign_id: str = None):
    """Genel bildirim oluşturma fonksiyonu"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "is_read": False,
        "related_order_id": related_order_id,
        "related_campaign_id": related_campaign_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    return notification["id"]

async def create_order_notification(order_id: str, customer_id: str, order_number: str):
    """Sipariş oluşturulduğunda bildirim gönder"""
    title = "Yeni Sipariş Oluşturuldu"
    message = f"Sipariş numaranız: {order_number}. Siparişiniz başarıyla alındı ve işleme konuldu."
    
    return await create_notification(
        user_id=customer_id,
        notification_type="order_created",
        title=title,
        message=message,
        related_order_id=order_id
    )

async def create_status_change_notification(order_id: str, customer_id: str, new_status: str):
    """Sipariş durumu değiştiğinde bildirim gönder"""
    status_messages = {
        "approved": "Siparişiniz onaylandı.",
        "preparing": "Siparişiniz hazırlanıyor.",
        "ready": "Siparişiniz hazır, kısa süre içinde yola çıkacak.",
        "dispatched": "Siparişiniz yola çıktı.",
        "delivered": "Siparişiniz teslim edildi. Keyifli alışverişler!",
        "cancelled": "Siparişiniz iptal edildi."
    }
    
    title = "Sipariş Durumu Güncellendi"
    message = status_messages.get(new_status, f"Sipariş durumu güncellendi: {new_status}")
    
    return await create_notification(
        user_id=customer_id,
        notification_type="order_status",
        title=title,
        message=message,
        related_order_id=order_id
    )

async def create_campaign_notifications(campaign_id: str, sales_agent_ids: list):
    """
    Kampanya oluşturulduğunda ilgili müşterilere bildirim gönder
    """
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    
    if not campaign:
        return
    
    title = f"Yeni Kampanya: {campaign['title']}"
    message = campaign['description']
    
    # Hedef müşterileri belirle
    target_customers = []
    
    if not sales_agent_ids or len(sales_agent_ids) == 0:
        cursor = db.users.find({"role": "customer", "is_active": True}, {"_id": 0})
        target_customers = await cursor.to_list(length=1000)
    else:
        for agent_id in sales_agent_ids:
            cursor = db.sales_routes.find({"sales_agent_id": agent_id}, {"_id": 0})
            routes = await cursor.to_list(length=1000)
            for route in routes:
                customer = await db.users.find_one({"id": route["customer_id"], "is_active": True}, {"_id": 0})
                if customer:
                    target_customers.append(customer)
    
    # Her müşteriye bildirim gönder
    notification_ids = []
    for customer in target_customers:
        notif_id = await create_notification(
            user_id=customer["id"],
            notification_type="campaign",
            title=title,
            message=message,
            related_campaign_id=campaign_id
        )
        notification_ids.append(notif_id)
    
    return notification_ids

async def create_fault_notification(report_id: str, customer_id: str, product_name: str):
    """Arıza bildirimi oluşturulduğunda admin/muhasebe'ye bildirim gönder"""
    cursor = db.users.find({
        "role": {"$in": ["admin", "accounting"]},
        "is_active": True
    }, {"_id": 0})
    admins = await cursor.to_list(length=100)
    
    title = "Yeni Arıza Bildirimi"
    message = f"Müşteri arızalı ürün bildirdi: {product_name}"
    
    notification_ids = []
    for admin in admins:
        notif_id = await create_notification(
            user_id=admin["id"],
            notification_type="system",
            title=title,
            message=message
        )
        notification_ids.append(notif_id)
    
    return notification_ids

async def create_fault_response_notification(report_id: str, customer_id: str, status: str, admin_response: str = None):
    """Arıza bildirimi yanıtlandığında müşteriye bildirim gönder"""
    status_messages = {
        "in_review": "Arıza bildiriminiz inceleniyor.",
        "resolved": "Arıza bildiriminiz çözüldü.",
        "rejected": "Arıza bildiriminiz reddedildi."
    }
    
    title = "Arıza Bildirimi Yanıtlandı"
    message = status_messages.get(status, "Arıza bildirimi durumu güncellendi.")
    
    if admin_response:
        message += f" Açıklama: {admin_response}"
    
    return await create_notification(
        user_id=customer_id,
        notification_type="fault_response",
        title=title,
        message=message
    )
