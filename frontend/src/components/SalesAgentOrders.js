import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import api from '../services/api';
import { Package, Calendar, User, DollarSign, Filter, Eye, X } from 'lucide-react';

const SalesAgentOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

const SalesAgentOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const statusTranslations = {
    pending: 'Bekliyor',
    approved: 'Onaylandı',
    preparing: 'Hazırlanıyor',
    ready: 'Hazır',
    dispatched: 'Yola Çıktı',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal'
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-blue-100 text-blue-800 border-blue-200',
    preparing: 'bg-purple-100 text-purple-800 border-purple-200',
    ready: 'bg-green-100 text-green-800 border-green-200',
    dispatched: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    delivered: 'bg-green-200 text-green-900 border-green-300',
    cancelled: 'bg-red-100 text-red-800 border-red-200'
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      // Sort by date descending
      const sortedOrders = response.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(sortedOrders);
      setError('');
    } catch (err) {
      setError('Siparişler yüklenirken hata oluştu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  const getOrderStats = () => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      approved: orders.filter(o => o.status === 'approved').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      dispatched: orders.filter(o => o.status === 'dispatched').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      totalAmount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    };
  };

  const stats = getOrderStats();

  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="bg-gray-50">
          <CardContent className="p-3">
            <div className="text-xs text-gray-600">Toplam</div>
            <div className="text-xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardContent className="p-3">
            <div className="text-xs text-yellow-700">Bekliyor</div>
            <div className="text-xl font-bold text-yellow-800">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-3">
            <div className="text-xs text-blue-700">Onaylı</div>
            <div className="text-xl font-bold text-blue-800">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="p-3">
            <div className="text-xs text-purple-700">Hazırlanıyor</div>
            <div className="text-xl font-bold text-purple-800">{stats.preparing}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-3">
            <div className="text-xs text-green-700">Hazır</div>
            <div className="text-xl font-bold text-green-800">{stats.ready}</div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50">
          <CardContent className="p-3">
            <div className="text-xs text-indigo-700">Yolda</div>
            <div className="text-xl font-bold text-indigo-800">{stats.dispatched}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-100">
          <CardContent className="p-3">
            <div className="text-xs text-green-800">Teslim</div>
            <div className="text-xl font-bold text-green-900">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-100">
          <CardContent className="p-3">
            <div className="text-xs text-blue-800">Toplam Tutar</div>
            <div className="text-lg font-bold text-blue-900">{stats.totalAmount.toFixed(0)} ₺</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Müşteri Siparişleri
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü ({orders.length})</SelectItem>
                  <SelectItem value="pending">Bekliyor ({stats.pending})</SelectItem>
                  <SelectItem value="approved">Onaylı ({stats.approved})</SelectItem>
                  <SelectItem value="preparing">Hazırlanıyor ({stats.preparing})</SelectItem>
                  <SelectItem value="ready">Hazır ({stats.ready})</SelectItem>
                  <SelectItem value="dispatched">Yolda ({stats.dispatched})</SelectItem>
                  <SelectItem value="delivered">Teslim ({stats.delivered})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Sipariş bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Ürün Sayısı</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.slice(0, 50).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {new Date(order.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.products?.length || 0} ürün
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status] || ''}>
                          {statusTranslations[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {order.total_amount?.toFixed(2)} ₺
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredOrders.length > 50 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  İlk 50 sipariş gösteriliyor. Toplam: {filteredOrders.length}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesAgentOrders;
