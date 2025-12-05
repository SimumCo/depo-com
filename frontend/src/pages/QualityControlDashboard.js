// Quality Control Dashboard
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CheckCircle, XCircle, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../services/productionApi';

const QualityControlDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [qcRecords, setQcRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQCDialog, setShowQCDialog] = useState(false);
  const [qcData, setQcData] = useState({
    tested_quantity: 0,
    passed_quantity: 0,
    failed_quantity: 0,
    result: 'pending',
    test_parameters: {},
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchQCRecords();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await productionApi.getProductionOrders();
      const qcOrders = (data.orders || []).filter(
        o => o.status === 'quality_check' || o.status === 'in_progress' || o.status === 'completed'
      );
      setOrders(qcOrders);
    } catch (error) {
      toast.error('Emirler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchQCRecords = async () => {
    try {
      const data = await productionApi.getQualityControls();
      setQcRecords(data.quality_controls || []);
    } catch (error) {
      console.error('Kalite kayıtları yüklenemedi:', error);
    }
  };

  const handleCreateQC = async () => {
    if (!selectedOrder || qcData.tested_quantity <= 0) {
      toast.error('Lütfen test edilen miktarı girin');
      return;
    }

    if (qcData.result === 'pending') {
      toast.error('Lütfen test sonucunu seçin (Pass/Fail)');
      return;
    }

    try {
      await productionApi.createQualityControl({
        order_id: selectedOrder.id,
        tested_quantity: qcData.tested_quantity,
        passed_quantity: qcData.passed_quantity,
        failed_quantity: qcData.failed_quantity,
        unit: selectedOrder.unit,
        result: qcData.result,
        test_parameters: qcData.test_parameters,
        notes: qcData.notes
      });
      toast.success('Kalite kontrol kaydı oluşturuldu');
      setShowQCDialog(false);
      setSelectedOrder(null);
      setQcData({
        tested_quantity: 0,
        passed_quantity: 0,
        failed_quantity: 0,
        result: 'pending',
        test_parameters: {},
        notes: ''
      });
      fetchOrders();
      fetchQCRecords();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'QC kaydı oluşturulamadı');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      quality_check: { variant: 'default', label: 'Kalite Kontrolde', icon: AlertTriangle },
      completed: { variant: 'default', label: 'Tamamlandı', icon: CheckCircle },
      failed: { variant: 'destructive', label: 'Başarısız', icon: XCircle }
    };
    const { variant, label, icon: Icon } = config[status] || { variant: 'secondary', label: status, icon: AlertTriangle };
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getQCResultBadge = (result) => {
    const config = {
      pass: { variant: 'default', label: 'GEÇTI', icon: CheckCircle },
      fail: { variant: 'destructive', label: 'KALDI', icon: XCircle },
      pending: { variant: 'secondary', label: 'BEKLİYOR', icon: AlertTriangle },
      conditional: { variant: 'default', label: 'KOŞULLU', icon: AlertTriangle }
    };
    const { variant, label, icon: Icon } = config[result] || { variant: 'secondary', label: result, icon: AlertTriangle };
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const pendingQC = orders.filter(o => o.status === 'quality_check');
  const passedToday = qcRecords.filter(r => r.result === 'pass').length;
  const failedToday = qcRecords.filter(r => r.result === 'fail').length;
  const totalTests = qcRecords.length;
  const passRate = totalTests > 0 ? ((passedToday / totalTests) * 100).toFixed(1) : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8" />
            Kalite Kontrol Dashboard
          </h1>
          <p className="text-purple-100 mt-1">Üretim kalitesini kontrol edin ve onaylayın</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bekleyen Kontroller
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {pendingQC.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Geçen Testler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {passedToday}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kalan Testler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {failedToday}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Başarı Oranı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {passRate}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending QC Orders */}
        {pendingQC.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Kalite Kontrolü Bekleyen Emirler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emir No</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Hat</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingQC.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                      <TableCell>{order.product_name}</TableCell>
                      <TableCell>
                        {order.produced_quantity} {order.unit}
                      </TableCell>
                      <TableCell>{order.line_name || '-'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setQcData({
                              ...qcData,
                              tested_quantity: order.produced_quantity,
                              passed_quantity: order.produced_quantity
                            });
                            setShowQCDialog(true);
                          }}
                        >
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          Test Et
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* QC Records */}
        <Card>
          <CardHeader>
            <CardTitle>Kalite Kontrol Kayıtları</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Emir No</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Test Edilen</TableHead>
                  <TableHead>Geçen</TableHead>
                  <TableHead>Kalan</TableHead>
                  <TableHead>Sonuç</TableHead>
                  <TableHead>Kontrol Eden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qcRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.inspection_date).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{record.order_number}</TableCell>
                    <TableCell>{record.product_name}</TableCell>
                    <TableCell>
                      {record.tested_quantity} {record.unit}
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {record.passed_quantity} {record.unit}
                    </TableCell>
                    <TableCell className="text-red-600 font-semibold">
                      {record.failed_quantity} {record.unit}
                    </TableCell>
                    <TableCell>{getQCResultBadge(record.result)}</TableCell>
                    <TableCell>{record.inspector_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* QC Dialog */}
      <Dialog open={showQCDialog} onOpenChange={setShowQCDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kalite Kontrol Testi</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-lg">{selectedOrder.product_name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.order_number}</p>
                <p className="mt-2">
                  Üretilen Miktar: <span className="font-semibold">{selectedOrder.produced_quantity} {selectedOrder.unit}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Test Edilen Miktar *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={qcData.tested_quantity}
                    onChange={(e) => setQcData({ ...qcData, tested_quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Geçen Miktar *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={qcData.passed_quantity}
                    onChange={(e) => setQcData({ ...qcData, passed_quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Kalan Miktar</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={qcData.failed_quantity}
                    onChange={(e) => setQcData({ ...qcData, failed_quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Test Sonucu *</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={qcData.result === 'pass' ? 'default' : 'outline'}
                    onClick={() => setQcData({ ...qcData, result: 'pass' })}
                    className="flex-1"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    GEÇTI
                  </Button>
                  <Button
                    variant={qcData.result === 'fail' ? 'destructive' : 'outline'}
                    onClick={() => setQcData({ ...qcData, result: 'fail' })}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    KALDI
                  </Button>
                </div>
              </div>

              <div>
                <Label>Test Notları</Label>
                <Input
                  value={qcData.notes}
                  onChange={(e) => setQcData({ ...qcData, notes: e.target.value })}
                  placeholder="Test notları (opsiyonel)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowQCDialog(false)}>
                  İptal
                </Button>
                <Button onClick={handleCreateQC}>
                  Kaydı Tamamla
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QualityControlDashboard;
