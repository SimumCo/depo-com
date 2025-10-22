import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const CustomerOrders = ({ orders }) => {
  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Beklemede</Badge>,
      approved: <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Onaylandı</Badge>,
      preparing: <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Hazırlanıyor</Badge>,
      ready: <Badge variant="outline" className="bg-cyan-50 text-cyan-600 border-cyan-200">Hazır</Badge>,
      dispatched: <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">Yolda</Badge>,
      delivered: <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Teslim Edildi</Badge>,
      cancelled: <Badge variant="destructive">İptal</Badge>,
    };
    return badges[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Siparişlerim</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Henüz siparişiniz bulunmuyor</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sipariş No</TableHead>
                <TableHead>Ürün Sayısı</TableHead>
                <TableHead>Toplam Tutar</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} data-testid={`order-row-${order.order_number}`}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.products?.length || 0}</TableCell>
                  <TableCell className="font-semibold">{order.total_amount.toFixed(2)} TL</TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), 'dd MMM yyyy', { locale: tr })}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerOrders;
