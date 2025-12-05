// Production Operator Dashboard
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { PlayCircle, PauseCircle, CheckCircle, TrendingUp, Package } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../services/productionApi';

const ProductionOperatorDashboard = () => {
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateData, setUpdateData] = useState({
    produced_quantity: 0,
    waste_quantity: 0,
    notes: ''
  });

  useEffect(() => {
    fetchMyOrders();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchMyOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyOrders = async () => {
    try {
      const data = await productionApi.getProductionOrders();
      // Backend already filters for operator's orders
      setMyOrders(data.orders || []);
    } catch (error) {
      toast.error('Emirler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleStartProduction = async (orderId) => {
    try {
      await productionApi.updateOrderStatus(orderId, 'in_progress');
      toast.success('Üretim başlatıldı');
      fetchMyOrders();
    } catch (error) {
      toast.error('Üretim başlatılamadı');
    }
  };

  const handleUpdateProduction = async () => {
    if (!selectedOrder || updateData.produced_quantity <= 0) {
      toast.error('Lütfen üretilen miktar girin');
      return;
    }

    try {
      await productionApi.createTrackingRecord(
        selectedOrder.id,
        updateData.produced_quantity,
        updateData.waste_quantity,
        updateData.notes
      );
      toast.success('Üretim güncellendi');
      setShowUpdateDialog(false);
      setSelectedOrder(null);
      setUpdateData({ produced_quantity: 0, waste_quantity: 0, notes: '' });
      fetchMyOrders();
    } catch (error) {
      toast.error('Üretim güncellenemedi');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await productionApi.updateOrderStatus(orderId, 'quality_check');
      toast.success('Emir kalite kontrole gönderildi');
      fetchMyOrders();
    } catch (error) {
      toast.error('Emir tamamlanamadı');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      approved: { variant: 'default', label: 'Onaylandı' },
      in_progress: { variant: 'default', label: 'Üretimde' },
      quality_check: { variant: 'default', label: 'Kalite Kontrolde' },
      completed: { variant: 'default', label: 'Tamamlandı' }
    };
    const { variant, label } = config[status] || { variant: 'secondary', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const inProgressOrders = myOrders.filter(o => o.status === 'in_progress');
  const approvedOrders = myOrders.filter(o => o.status === 'approved');
  const completedToday = myOrders.filter(o => 
    o.status === 'completed' || o.status === 'quality_check'
  );

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8" />
            Operatör Dashboard
          </h1>
          <p className="text-green-100 mt-1">Atanmış üretim emirlerini takip edin</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Devam Eden Üretim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {inProgressOrders.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bekleyen Emirler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {approvedOrders.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bugün Tamamlanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {completedToday.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Productions */}
        {inProgressOrders.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-blue-600" />
                Devam Eden Üretimler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inProgressOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-blue-600">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{order.product_name}</h3>
                          <p className="text-sm text-muted-foreground">{order.order_number}</p>
                          <p className="text-sm">{order.line_name}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {order.produced_quantity} / {order.target_quantity}
                          </div>
                          <p className="text-sm text-muted-foreground">{order.unit}</p>
                          <div className="mt-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${Math.min((order.produced_quantity / order.target_quantity) * 100, 100)}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowUpdateDialog(true);
                          }}
                        >
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Üretim Güncelle
                        </Button>
                        {order.produced_quantity >= order.target_quantity && (
                          <Button
                            variant="default"
                            onClick={() => handleCompleteOrder(order.id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Tamamla
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tüm Emirlerim</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emir No</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Hat</TableHead>
                  <TableHead>İlerleme</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                    <TableCell>{order.product_name}</TableCell>
                    <TableCell>{order.line_name || '-'}</TableCell>
                    <TableCell>
                      {order.produced_quantity} / {order.target_quantity} {order.unit}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartProduction(order.id)}
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Başlat
                        </Button>
                      )}
                      {order.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowUpdateDialog(true);
                          }}
                        >
                          Güncelle
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Update Production Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üretim Güncelle</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{selectedOrder.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  Mevcut: {selectedOrder.produced_quantity} / {selectedOrder.target_quantity} {selectedOrder.unit}
                </p>
              </div>
              <div>
                <Label>Üretilen Miktar *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={updateData.produced_quantity}
                  onChange={(e) => setUpdateData({ ...updateData, produced_quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Üretilen miktar"
                />
              </div>
              <div>
                <Label>Fire Miktarı</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={updateData.waste_quantity}
                  onChange={(e) => setUpdateData({ ...updateData, waste_quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Fire miktarı"
                />
              </div>
              <div>
                <Label>Notlar</Label>
                <Input
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                  placeholder="Notlar (opsiyonel)"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                  İptal
                </Button>
                <Button onClick={handleUpdateProduction}>
                  Güncelle
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionOperatorDashboard;