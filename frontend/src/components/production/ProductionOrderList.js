// Production Order List Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { CheckCircle, Clock, PlayCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../services/productionApi';

const ProductionOrderList = ({ role }) => {
  const [orders, setOrders] = useState([]);
  const [lines, setLines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignData, setAssignData] = useState({
    line_id: '',
    operator_id: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchLines();
    fetchOperators();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = statusFilter !== 'all' ? statusFilter : null;
      const data = await productionApi.getProductionOrders(params);
      setOrders(data.orders || []);
    } catch (error) {
      toast.error('Emirler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchLines = async () => {
    try {
      const data = await productionApi.getProductionLines();
      setLines(data.lines || []);
    } catch (error) {
      console.error('Hatlar yüklenemedi:', error);
    }
  };

  const fetchOperators = async () => {
    try {
      const data = await productionApi.getUsers();
      const operatorsList = (data.users || []).filter(
        u => u.role === 'production_operator'
      );
      setOperators(operatorsList);
    } catch (error) {
      console.error('Operatörler yüklenemedi:', error);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await productionApi.updateOrderStatus(orderId, newStatus);
      toast.success('Durum güncellendi');
      fetchOrders();
    } catch (error) {
      toast.error('Durum güncellenemedi');
    }
  };

  const handleAssignOrder = async () => {
    if (!assignData.line_id) {
      toast.error('Lütfen hat seçin');
      return;
    }

    try {
      await productionApi.assignOrderToLine(
        selectedOrder.id,
        assignData.line_id,
        assignData.operator_id || null
      );
      toast.success('Emir atandı');
      setShowAssignDialog(false);
      setSelectedOrder(null);
      setAssignData({ line_id: '', operator_id: '' });
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Emir atanamadı');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { variant: 'secondary', label: 'Bekliyor', icon: Clock },
      approved: { variant: 'default', label: 'Onaylandı', icon: CheckCircle },
      in_progress: { variant: 'default', label: 'Üretimde', icon: PlayCircle },
      completed: { variant: 'default', label: 'Tamamlandı', icon: CheckCircle },
      quality_check: { variant: 'default', label: 'Kalite Kontrolde', icon: AlertTriangle },
      failed: { variant: 'destructive', label: 'Başarısız', icon: XCircle },
      cancelled: { variant: 'destructive', label: 'İptal', icon: XCircle }
    };
    const { variant, label, icon: Icon } = config[status] || { variant: 'secondary', label: status, icon: Clock };
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = {
      low: { variant: 'secondary', label: 'Düşük' },
      medium: { variant: 'default', label: 'Orta' },
      high: { variant: 'default', label: 'Yüksek' },
      urgent: { variant: 'destructive', label: 'Acil' }
    };
    const { variant, label } = config[priority] || { variant: 'secondary', label: priority };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Üretim Emirleri</h2>
          <p className="text-muted-foreground">Tüm üretim emirlerini görüntüleyin ve yönetin</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Emirler</SelectItem>
            <SelectItem value="pending">Bekliyor</SelectItem>
            <SelectItem value="approved">Onaylandı</SelectItem>
            <SelectItem value="in_progress">Üretimde</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
            <SelectItem value="quality_check">Kalite Kontrolde</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{orders.length} Emir Bulundu</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emir No</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead>Hat</TableHead>
                <TableHead>Operatör</TableHead>
                <TableHead>Öncelik</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                  <TableCell>{order.product_name}</TableCell>
                  <TableCell>
                    {order.produced_quantity} / {order.target_quantity} {order.unit}
                  </TableCell>
                  <TableCell>{order.line_name || '-'}</TableCell>
                  <TableCell>{order.assigned_operator_name || '-'}</TableCell>
                  <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {order.status === 'pending' && role === 'production_manager' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowAssignDialog(true);
                            }}
                          >
                            Ata
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(order.id, 'approved')}
                          >
                            Onayla
                          </Button>
                        </>
                      )}
                      {order.status === 'approved' && role === 'production_operator' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(order.id, 'in_progress')}
                        >
                          Başlat
                        </Button>
                      )}
                      {order.status === 'in_progress' && (
                        <Badge variant="default">Devam Ediyor</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emri Hatta Ata</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Emir: {selectedOrder.order_number}</p>
                <p className="font-semibold">{selectedOrder.product_name}</p>
                <p className="text-sm">{selectedOrder.target_quantity} {selectedOrder.unit}</p>
              </div>
              <div>
                <Label>Üretim Hattı *</Label>
                <Select
                  value={assignData.line_id}
                  onValueChange={(value) => setAssignData({ ...assignData, line_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Hat seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {lines.filter(l => l.status === 'active' || l.status === 'idle').map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.name} ({line.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Operatör (Opsiyonel)</Label>
                <Select
                  value={assignData.operator_id}
                  onValueChange={(value) => setAssignData({ ...assignData, operator_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Operatör seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  İptal
                </Button>
                <Button onClick={handleAssignOrder}>
                  Ata
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionOrderList;