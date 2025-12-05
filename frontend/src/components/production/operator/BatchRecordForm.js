// Batch Record Form - Operator Panel
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { FileText, Plus, Package2 } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const BatchRecordForm = () => {
  const [orders, setOrders] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    quantity: 0,
    expiry_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchBatches();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await productionApi.getOperatorMyOrders();
      setOrders(data.orders || []);
    } catch (error) {
      toast.error('Emirler yüklenemedi');
    }
  };

  const fetchBatches = async () => {
    try {
      const data = await productionApi.getBatchRecords();
      setBatches(data.batches || []);
    } catch (error) {
      console.error('Batch kayıtları yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.order_id || formData.quantity <= 0) {
      toast.error('Lütfen emir ve miktar girin');
      return;
    }

    setLoading(true);
    try {
      await productionApi.createBatchRecord({
        ...formData,
        expiry_date: formData.expiry_date || null
      });
      toast.success('Batch kaydı oluşturuldu');
      setFormData({
        order_id: '',
        quantity: 0,
        expiry_date: '',
        notes: ''
      });
      fetchBatches();
      fetchOrders();
    } catch (error) {
      toast.error('Batch kaydı oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Yeni Batch/Lot Kaydı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Üretim Emri *</Label>
                <Select
                  value={formData.order_id}
                  onValueChange={(value) => {
                    const order = orders.find(o => o.id === value);
                    setFormData({ 
                      ...formData, 
                      order_id: value,
                      quantity: order?.produced_quantity || 0
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Emir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.filter(o => o.status === 'in_progress' || o.status === 'quality_check').map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Batch Miktarı *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Batch miktarı"
                  required
                />
              </div>

              <div>
                <Label>Son Kullanma Tarihi</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Notlar</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notlar (opsiyonel)"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Batch Oluştur
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Batch Records */}
      <Card>
        <CardHeader>
          <CardTitle>Son Batch Kayıtları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Üretim Tarihi</TableHead>
                  <TableHead>SKT</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.slice(0, 10).map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono font-semibold">{batch.batch_number}</TableCell>
                    <TableCell>{batch.product_name}</TableCell>
                    <TableCell>
                      {batch.quantity} {batch.unit}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(batch.production_date).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('tr-TR') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {batch.status === 'completed' ? 'Tamamlandı' : batch.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {batches.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Henüz batch kaydı bulunmuyor
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchRecordForm;