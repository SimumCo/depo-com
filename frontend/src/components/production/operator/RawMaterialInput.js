// Raw Material Input - Operator Panel
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const RawMaterialInput = () => {
  const [orders, setOrders] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    batch_number: '',
    raw_material_id: 'RM001',
    raw_material_name: 'Süt',
    used_quantity: 0,
    unit: 'kg',
    lot_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchUsageHistory();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await productionApi.getOperatorMyOrders();
      setOrders(data.orders || []);
    } catch (error) {
      toast.error('Emirler yüklenemedi');
    }
  };

  const fetchUsageHistory = async () => {
    try {
      const data = await productionApi.getRawMaterialUsage();
      setUsageHistory(data.usage_records || []);
    } catch (error) {
      console.error('Kullanım geçmişi yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.order_id || formData.used_quantity <= 0) {
      toast.error('Lütfen emir ve miktar seçin');
      return;
    }

    setLoading(true);
    try {
      await productionApi.createRawMaterialUsage(formData);
      toast.success('Hammadde kullanımı kaydedildi');
      setFormData({
        ...formData,
        used_quantity: 0,
        lot_number: '',
        notes: ''
      });
      fetchUsageHistory();
    } catch (error) {
      toast.error('Kayıt oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const rawMaterials = [
    { id: 'RM001', name: 'Süt', unit: 'kg' },
    { id: 'RM002', name: 'Şeker', unit: 'kg' },
    { id: 'RM003', name: 'Maya', unit: 'gr' },
    { id: 'RM004', name: 'Aroma', unit: 'ml' },
    { id: 'RM005', name: 'Stabilizatör', unit: 'gr' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Hammadde Kullanım Girişi
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
                      batch_number: order?.order_number || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Emir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.filter(o => o.status === 'in_progress').map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Hammadde *</Label>
                <Select
                  value={formData.raw_material_id}
                  onValueChange={(value) => {
                    const material = rawMaterials.find(m => m.id === value);
                    setFormData({ 
                      ...formData, 
                      raw_material_id: value,
                      raw_material_name: material?.name || '',
                      unit: material?.unit || 'kg'
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rawMaterials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Kullanılan Miktar *</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.used_quantity}
                    onChange={(e) => setFormData({ ...formData, used_quantity: parseFloat(e.target.value) || 0 })}
                    placeholder="Miktar"
                    required
                  />
                  <div className="w-20 flex items-center justify-center bg-gray-100 rounded text-sm font-medium">
                    {formData.unit}
                  </div>
                </div>
              </div>

              <div>
                <Label>Hammadde Lot No</Label>
                <Input
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  placeholder="Lot numarası (opsiyonel)"
                />
              </div>
            </div>

            <div>
              <Label>Notlar</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notlar (opsiyonel)"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Kullanımı Kaydet
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle>Son Kullanımlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Emir No</TableHead>
                  <TableHead>Hammadde</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Lot No</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageHistory.slice(0, 10).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm">
                      {new Date(record.usage_time).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{record.order_number}</TableCell>
                    <TableCell>{record.raw_material_name}</TableCell>
                    <TableCell>
                      {record.used_quantity} {record.unit}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.lot_number || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {usageHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Henüz hammadde kullanım kaydı bulunmuyor
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RawMaterialInput;