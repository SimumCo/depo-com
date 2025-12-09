import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { TruckIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const RawMaterialOut = ({ onRefresh }) => {
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    product_id: 'RM001',
    product_name: 'Süt',
    quantity: 0,
    unit: 'kg',
    from_location: '',
    lot_number: '',
    notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [transData, ordersData, locsData] = await Promise.all([
        productionApi.getWarehouseTransactions('raw_material_out', 7),
        productionApi.getOperatorMyOrders(),
        productionApi.getStockLocations('Hammadde')
      ]);
      setTransactions(transData.transactions || []);
      setOrders(ordersData.orders || []);
      setLocations(locsData.locations || []);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.product_name || formData.quantity <= 0) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      await productionApi.createRawMaterialOut(formData);
      toast.success('Hammadde çıkışı kaydedildi');
      setShowDialog(false);
      setFormData({
        order_id: '',
        product_id: 'RM001',
        product_name: 'Süt',
        quantity: 0,
        unit: 'kg',
        from_location: '',
        lot_number: '',
        notes: ''
      });
      fetchData();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Hammadde çıkışı kaydedilemedi');
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TruckIcon className="h-5 w-5" />
              Hammadde Çıkışı (Son 7 Gün)
            </CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Çıkış
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İşlem No</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Hammadde</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Lokasyon</TableHead>
                  <TableHead>Emir No</TableHead>
                  <TableHead>Operatör</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((trans) => (
                  <TableRow key={trans.id}>
                    <TableCell className="font-mono font-semibold">{trans.transaction_number}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(trans.transaction_date).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>{trans.product_name}</TableCell>
                    <TableCell className="font-semibold">
                      {trans.quantity} {trans.unit}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{trans.from_location || '-'}</TableCell>
                    <TableCell className="text-sm">{trans.order_id || '-'}</TableCell>
                    <TableCell className="text-sm">{trans.operator_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {transactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Henüz hammadde çıkışı bulunmuyor
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Hammadde Çıkışı</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Üretim Emri (Opsiyonel)</Label>
                <Select
                  value={formData.order_id}
                  onValueChange={(value) => setFormData({ ...formData, order_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Emir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
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
                  value={formData.product_id}
                  onValueChange={(value) => {
                    const material = rawMaterials.find(m => m.id === value);
                    setFormData({
                      ...formData,
                      product_id: value,
                      product_name: material?.name || '',
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
                <Label>Miktar *</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <div className="w-20 flex items-center justify-center bg-gray-100 rounded text-sm font-medium">
                    {formData.unit}
                  </div>
                </div>
              </div>

              <div>
                <Label>Lokasyon (Çıkış)</Label>
                <Select
                  value={formData.from_location}
                  onValueChange={(value) => setFormData({ ...formData, from_location: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lokasyon seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.location_code}>
                        {loc.location_code} - {loc.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Lot Numarası</Label>
                <Input
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  placeholder="LOT-2025-001"
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                <TruckIcon className="mr-2 h-4 w-4" />
                Çıkış Kaydet
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RawMaterialOut;