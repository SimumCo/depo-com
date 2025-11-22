from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import List, Optional, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import asyncio
from models.notification import Notification, NotificationType, NotificationPriority
from middleware.auth import get_current_user, require_role
from models.user import User, UserRole

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.distribution_db

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def broadcast(self, message: dict, user_ids: List[str] = None):
        if user_ids:
            for user_id in user_ids:
                await self.send_personal_message(message, user_id)
        else:
            # Broadcast to all
            for user_id in self.active_connections:
                await self.send_personal_message(message, user_id)

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time notifications"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            
            # Handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

@router.get("", response_model=List[Notification])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get notifications for current user"""
    user_id = current_user.id
    user_role = current_user.role
    
    # Build query
    query = {
        "$or": [
            {"target_user_ids": user_id},
            {"target_roles": user_role},
            {"target_user_ids": {"$size": 0}, "target_roles": {"$size": 0}}  # Broadcast to all
        ]
    }
    
    if unread_only:
        query["read_by"] = {"$ne": user_id}
    
    notifications = await db.notifications.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    return notifications

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user)
):
    """Get unread notification count"""
    user_id = current_user.id
    user_role = current_user.role
    
    count = await db.notifications.count_documents({
        "$or": [
            {"target_user_ids": user_id},
            {"target_roles": user_role},
            {"target_user_ids": {"$size": 0}, "target_roles": {"$size": 0}}
        ],
        "read_by": {"$ne": user_id}
    })
    
    return {"unread_count": count}

@router.post("/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark notification as read"""
    user_id = current_user.id
    
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$addToSet": {"read_by": user_id}}
    )
    
    if result.modified_count == 0:
        # Check if notification exists
        notif = await db.notifications.find_one({"id": notification_id})
        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found")
        # Already marked as read
        return {"message": "Notification already marked as read"}
    
    return {"message": "Notification marked as read"}

@router.post("/mark-all-read")
async def mark_all_read(
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read for current user"""
    user_id = current_user.id
    user_role = current_user.role
    
    result = await db.notifications.update_many(
        {
            "$or": [
                {"target_user_ids": user_id},
                {"target_roles": user_role},
                {"target_user_ids": {"$size": 0}, "target_roles": {"$size": 0}}
            ],
            "read_by": {"$ne": user_id}
        },
        {"$addToSet": {"read_by": user_id}}
    )
    
    return {"message": f"{result.modified_count} notifications marked as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Delete notification (Admin only)"""
    result = await db.notifications.delete_one({"id": notification_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}

@router.post("/create")
async def create_notification(
    notification: Notification,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Create and broadcast notification (Admin/System only)"""
    notification_dict = notification.model_dump()
    notification_dict['created_at'] = datetime.now(timezone.utc)
    
    await db.notifications.insert_one(notification_dict)
    
    # Broadcast via WebSocket
    target_users = notification.target_user_ids if notification.target_user_ids else None
    
    notification_message = {
        "type": "notification",
        "data": notification_dict
    }
    
    await manager.broadcast(notification_message, target_users)
    
    return notification

# Helper function to create and broadcast notifications
async def create_and_broadcast_notification(
    title: str,
    message: str,
    notification_type: NotificationType,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    target_user_ids: List[str] = [],
    target_roles: List[str] = [],
    metadata: dict = {},
    action_url: str = None
):
    """Helper function to create and broadcast notifications"""
    notification = Notification(
        title=title,
        message=message,
        type=notification_type,
        priority=priority,
        target_user_ids=target_user_ids,
        target_roles=target_roles,
        metadata=metadata,
        action_url=action_url
    )
    
    notification_dict = notification.model_dump()
    notification_dict['created_at'] = datetime.now(timezone.utc)
    
    await db.notifications.insert_one(notification_dict)
    
    # Broadcast via WebSocket
    notification_message = {
        "type": "notification",
        "data": notification_dict
    }
    
    await manager.broadcast(notification_message, target_user_ids if target_user_ids else None)
    
    return notification
