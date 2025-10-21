import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await ordersAPI.getAll();
      setOrders(response.data);
    } catch (error) {
      toast.error('Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      toast.success('Sipariş durumu güncellendi');
      loadOrders();
    } catch (error) {
      toast.error('Durum güncellenemedi');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Beklemede</Badge>,
      approved: <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Onaylandı</Badge>,
      preparing: <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Hazırlanıyor</Badge>,
      ready: <Badge variant="outline" className="bg-cyan-50 text-cyan-600 border-cyan-200">Hazır</Badge>,
      dispatched: <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">Sevk Edildi</Badge>,
      delivered: <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Teslim Edildi</Badge>,
      cancelled: <Badge variant="destructive">İptal</Badge>,
    };
    return badges[status] || status;
  };

  const getChannelBadge = (channel) => {
    return channel === 'logistics' ? (
      <Badge variant="secondary">Lojistik</Badge>
    ) : (
      <Badge variant="secondary">Bayi</Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sipariş Yönetimi</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Sipariş bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş No</TableHead>
                  <TableHead>Kanal</TableHead>
                  <TableHead>Ürün Sayısı</TableHead>
                  <TableHead>Toplam Tutar</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>!şlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} data-testid={`order-row-${order.order_number}`}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{getChannelBadge(order.channel_type)}</TableCell>
                    <TableCell>{order.products?.length || 0}</TableCell>
                    <TableCell className="font-semibold">{order.total_amount.toFixed(2)} TL</TableCell>
                    <TableCell>
                      {format(new Date(order.created_at), 'dd MMM yyyy', { locale: tr })}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`status-select-${order.order_number}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Beklemede</SelectItem>
                            <SelectItem value="approved">Onayla</SelectItem>
                            <SelectItem value="preparing">Hazırlanıyor</SelectItem>
                            <SelectItem value="ready">Hazır</SelectItem>
                            <SelectItem value="dispatched">Sevk Et</SelectItem>
                            <SelectItem value="delivered">Teslim Et</SelectItem>
                            <SelectItem value="cancelled">!İptal</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderManagement;
