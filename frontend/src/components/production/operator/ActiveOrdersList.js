// Active Orders List - Operator Panel
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { PlayCircle, PauseCircle, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const ActiveOrdersList = ({ onRefresh }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateData, setUpdateData] = useState({
    produced_quantity: 0,
    waste_quantity: 0,
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await productionApi.getOperatorMyOrders();
      setOrders(data.orders || []);
    } catch (error) {
      toast.error('Emirler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (orderId) => {
    try {
      await productionApi.startProductionOrder(orderId);
      toast.success('Üretim başlatıldı');
      fetchOrders();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Üretim başlatılamadı');
    }
  };

  const handlePause = async (orderId) => {
    const reason = prompt('Duraklatma sebebini girin:');
    try {
      await productionApi.pauseProductionOrder(orderId, reason);
      toast.success('Üretim duraklatıldı');
      fetchOrders();
    } catch (error) {
      toast.error('Üretim durdurulamadı');
    }
  };

  const handleComplete = async (orderId) => {
    try {
      await productionApi.completeProductionOrder(orderId);
      toast.success('Üretim tamamlandı, kalite kontrole gönderildi');
      fetchOrders();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Üretim tamamlanamadı');
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
      toast.success('Üretim kaydı eklendi');
      setShowUpdateDialog(false);
      setSelectedOrder(null);
      setUpdateData({ produced_quantity: 0, waste_quantity: 0, notes: '' });
      fetchOrders();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Üretim güncellenemedi');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      approved: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      quality_check: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      approved: 'Onaylandı',
      in_progress: 'Üretimde',
      quality_check: 'Kalite Kontrolde',
      completed: 'Tamamlandı'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Henüz atanmış emir bulunmuyor</p>
        </CardContent>
      </Card>
    );
  }

  const inProgressOrders = orders.filter(o => o.status === 'in_progress');
  const approvedOrders = orders.filter(o => o.status === 'approved');

  return (
    <div className="space-y-6">
      {/* In Progress Orders */}
      {inProgressOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Devam Eden Üretimler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressOrders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-blue-600">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <div className="text-lg">{order.product_name}</div>
                      <div className="text-sm font-mono text-muted-foreground">{order.order_number}</div>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Hat: {order.line_name || 'Atanmamış'}</div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold">
                          {order.produced_quantity || 0}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-lg">
                          {order.target_quantity} {order.unit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.min(((order.produced_quantity || 0) / order.target_quantity) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round(((order.produced_quantity || 0) / order.target_quantity) * 100)}% tamamlandı
                      </div>
                    </div>

                    {order.waste_quantity > 0 && (
                      <div className="text-sm text-red-600">
                        Fire: {order.waste_quantity} {order.unit}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowUpdateDialog(true);
                        }}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Güncelle
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePause(order.id)}
                      >
                        <PauseCircle className="mr-2 h-4 w-4" />
                        Duraklat
                      </Button>
                      {(order.produced_quantity || 0) >= order.target_quantity * 0.95 && (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleComplete(order.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Tamamla
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved Orders */}
      {approvedOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Başlanmayı Bekleyen Emirler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedOrders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-yellow-600">
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg">{order.product_name}</h3>
                    <p className="text-sm font-mono text-muted-foreground">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">Hat: {order.line_name || 'Atanmamış'}</p>
                    <p className="mt-2">
                      <span className="text-2xl font-bold">{order.target_quantity}</span>
                      <span className="text-sm text-muted-foreground ml-1">{order.unit}</span>
                    </p>
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleStart(order.id)}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Üretimi Başlat
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Update Production Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Üretim Güncelle</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold">{selectedOrder.product_name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.order_number}</p>
                <p className="text-sm mt-2">
                  Mevcut: <span className="font-bold">{selectedOrder.produced_quantity || 0}</span> / {selectedOrder.target_quantity} {selectedOrder.unit}
                </p>
              </div>

              <div>
                <Label>Üretilen Miktar (Bu Kayıt) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={updateData.produced_quantity}
                  onChange={(e) => setUpdateData({ ...updateData, produced_quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Üretilen miktar"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Toplam olacak: {(selectedOrder.produced_quantity || 0) + updateData.produced_quantity} {selectedOrder.unit}
                </p>
              </div>

              <div>
                <Label>Fire Miktarı</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={updateData.waste_quantity}
                  onChange={(e) => setUpdateData({ ...updateData, waste_quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Fire miktarı (varsa)"
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUpdateDialog(false);
                    setSelectedOrder(null);
                    setUpdateData({ produced_quantity: 0, waste_quantity: 0, notes: '' });
                  }}
                >
                  İptal
                </Button>
                <Button onClick={handleUpdateProduction}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Kaydet
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActiveOrdersList;