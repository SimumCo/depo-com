import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, BellOff, CheckCircle, AlertCircle, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { notificationsAPI } from '../../services/api';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // WebSocket connection
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      connectWebSocket(user.id);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [showUnreadOnly]);

  const connectWebSocket = (userId) => {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
    const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/api/notifications/ws/${userId}`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send('ping');
        }
      }, 30000);
      wsRef.current.pingInterval = pingInterval;
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        if (event.data === 'pong') return;
        
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          setNotifications(prev => [data.data, ...prev]);
          setUnreadCount(prev => prev + 1);
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(data.data.title, {
              body: data.data.message,
              icon: '/favicon.ico'
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      if (wsRef.current?.pingInterval) {
        clearInterval(wsRef.current.pingInterval);
      }
      // Reconnect after 5 seconds
      setTimeout(() => connectWebSocket(userId), 5000);
    };
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getAll(showUnreadOnly);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      loadNotifications();
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bildirimi silmek istediğinizden emin misiniz?')) return;
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type, priority) => {
    if (priority === 'critical') return <AlertCircle className="h-5 w-5 text-red-500" />;
    
    switch (type) {
      case 'critical_stock':
      case 'low_stock':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'approval_pending':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'critical') return <Badge variant="destructive">Kritik</Badge>;
    if (priority === 'high') return <Badge variant="warning" className="bg-orange-500">Yüksek</Badge>;
    if (priority === 'medium') return <Badge variant="warning" className="bg-yellow-500">Orta</Badge>;
    return <Badge variant="secondary">Düşük</Badge>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold">Bildirim Merkezi</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={showUnreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            {showUnreadOnly ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
            {showUnreadOnly ? 'Tümünü Göster' : 'Okunmamışlar'}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Tümünü Okundu
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">Yükleniyor...</div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-muted-foreground">
              {showUnreadOnly ? 'Okunmamış bildirim yok' : 'Hiçbir bildirim yok'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isRead = notification.read_by?.includes(user.id);
            
            return (
              <Card 
                key={notification.id} 
                className={`hover:shadow-md transition-shadow ${
                  !isRead ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type, notification.priority)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <CardTitle className="text-base">{notification.title}</CardTitle>
                          {getPriorityBadge(notification.priority)}
                        </div>
                        <CardDescription>{notification.message}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!isRead && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleMarkRead(notification.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(notification.created_at)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;