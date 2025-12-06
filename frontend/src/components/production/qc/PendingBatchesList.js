// Pending Batches List - QC Panel
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { ClipboardCheck, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const PendingBatchesList = ({ onRefresh }) => {
  const [pending, setPending] = useState({ pending_orders: [], pending_batches: [] });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQCDialog, setShowQCDialog] = useState(false);
  const [qcData, setQcData] = useState({
    tested_quantity: 0,
    passed_quantity: 0,
    failed_quantity: 0,
    unit: 'kg',
    result: 'pending',
    test_parameters: {
      pH: '',
      nem: '',
      yogunluk: '',
      gorsel: ''
    },
    notes: ''
  });

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const data = await productionApi.getQCPendingBatches();
      setPending(data);
    } catch (error) {
      toast.error('Bekleyen batch\'ler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQC = (order) => {
    setSelectedOrder(order);
    setQcData({
      tested_quantity: order.produced_quantity || 0,
      passed_quantity: 0,
      failed_quantity: 0,
      unit: order.unit || 'kg',
      result: 'pending',
      test_parameters: {
        pH: '',
        nem: '',
        yogunluk: '',
        gorsel: ''
      },
      notes: ''
    });
    setShowQCDialog(true);
  };

  const handleSubmitQC = async () => {
    if (!selectedOrder) return;

    // Validation
    if (qcData.tested_quantity <= 0) {
      toast.error('Test edilen miktar girilmeli');
      return;
    }

    if (qcData.passed_quantity + qcData.failed_quantity !== qcData.tested_quantity) {
      toast.error('Geçen + Kalan miktar, test edilen miktara eşit olmalı');
      return;
    }

    try {
      await productionApi.createQualityControl({
        order_id: selectedOrder.id,
        batch_number: selectedOrder.order_number,
        tested_quantity: qcData.tested_quantity,
        passed_quantity: qcData.passed_quantity,
        failed_quantity: qcData.failed_quantity,
        unit: qcData.unit,
        result: qcData.result,
        test_parameters: qcData.test_parameters,
        notes: qcData.notes
      });

      toast.success('Kalite kontrol kaydı oluşturuldu');
      setShowQCDialog(false);
      setSelectedOrder(null);
      fetchPending();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Kalite kontrol kaydı oluşturulamadı');
    }
  };

  const handleResultChange = (result) => {
    setQcData(prev => {
      if (result === 'pass') {
        return {
          ...prev,
          result,
          passed_quantity: prev.tested_quantity,
          failed_quantity: 0
        };
      } else if (result === 'fail') {
        return {
          ...prev,
          result,
          passed_quantity: 0,
          failed_quantity: prev.tested_quantity
        };
      }
      return { ...prev, result };
    });
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Kalite Kontrolü Bekleyen Batch'ler ({pending.pending_orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.pending_orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz kalite kontrolü bekleyen batch bulunmuyor</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emir No</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Hat</TableHead>
                    <TableHead>Operatör</TableHead>
                    <TableHead>Tamamlanma</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.pending_orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-semibold">{order.order_number}</TableCell>
                      <TableCell>{order.product_name}</TableCell>
                      <TableCell>
                        {order.produced_quantity} {order.unit}
                      </TableCell>
                      <TableCell>{order.line_name || '-'}</TableCell>
                      <TableCell>{order.assigned_operator_name || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.actual_end ? new Date(order.actual_end).toLocaleString('tr-TR') : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleStartQC(order)}
                        >
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          Test Başlat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QC Test Dialog */}
      <Dialog open={showQCDialog} onOpenChange={setShowQCDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kalite Kontrol Testi</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold">{selectedOrder.product_name}</p>
                <p className="text-sm text-muted-foreground">Emir: {selectedOrder.order_number}</p>
                <p className="text-sm">Miktar: {selectedOrder.produced_quantity} {selectedOrder.unit}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Birim</Label>
                  <Input
                    value={qcData.unit}
                    onChange={(e) => setQcData({ ...qcData, unit: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Test Sonucu *</Label>
                <Select
                  value={qcData.result}
                  onValueChange={handleResultChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Bekliyor</SelectItem>
                    <SelectItem value="pass">Geçti (Pass)</SelectItem>
                    <SelectItem value="fail">Kaldı (Fail)</SelectItem>
                    <SelectItem value="conditional">Şartlı</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Geçen Miktar</Label>
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

              <div className="border-t pt-4">
                <p className="font-semibold mb-3">Test Parametreleri</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>pH Değeri</Label>
                    <Input
                      value={qcData.test_parameters.pH}
                      onChange={(e) => setQcData({
                        ...qcData,
                        test_parameters: { ...qcData.test_parameters, pH: e.target.value }
                      })}
                      placeholder="6.5"
                    />
                  </div>
                  <div>
                    <Label>Nem (%)</Label>
                    <Input
                      value={qcData.test_parameters.nem}
                      onChange={(e) => setQcData({
                        ...qcData,
                        test_parameters: { ...qcData.test_parameters, nem: e.target.value }
                      })}
                      placeholder="12.5"
                    />
                  </div>
                  <div>
                    <Label>Yoğunluk (g/cm³)</Label>
                    <Input
                      value={qcData.test_parameters.yogunluk}
                      onChange={(e) => setQcData({
                        ...qcData,
                        test_parameters: { ...qcData.test_parameters, yogunluk: e.target.value }
                      })}
                      placeholder="1.025"
                    />
                  </div>
                  <div>
                    <Label>Görsel Kontrol</Label>
                    <Select
                      value={qcData.test_parameters.gorsel}
                      onValueChange={(value) => setQcData({
                        ...qcData,
                        test_parameters: { ...qcData.test_parameters, gorsel: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uygun">Uygun</SelectItem>
                        <SelectItem value="uygun_degil">Uygun Değil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label>Notlar</Label>
                <Textarea
                  value={qcData.notes}
                  onChange={(e) => setQcData({ ...qcData, notes: e.target.value })}
                  placeholder="Test notları..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQCDialog(false);
                    setSelectedOrder(null);
                  }}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSubmitQC}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  QC Kaydını Kaydet
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingBatchesList;