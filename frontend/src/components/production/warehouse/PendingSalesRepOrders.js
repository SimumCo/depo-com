import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const PendingSalesRepOrders = ({ onRefresh }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await productionApi.getPendingSalesRepOrders();
      setOrders(data.pending_orders || []);
    } catch (error) {
      toast.error('Siparişler yüklenemedi');
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = async (orderId) => {
    setLoading(true);
    try {
      await productionApi.approveSalesRepOrder(orderId);
      toast.success('Sipariş onaylandı');
      fetchOrders();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Onaylama başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Bekleyen Plasiyer Siparişleri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sipariş No</TableHead>
              <TableHead>Plasiyer</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Ürün Sayısı</TableHead>
              <TableHead>Toplam Tutar</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono">{order.order_number}</TableCell>
                <TableCell>{order.sales_rep_name}</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString('tr-TR')}</TableCell>
                <TableCell>{order.items?.length || 0} ürün</TableCell>
                <TableCell className="font-semibold">₺{order.total_amount?.toFixed(2)}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(order.id)}
                    disabled={loading}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Onayla
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Bekleyen sipariş bulunmuyor
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingSalesRepOrders;