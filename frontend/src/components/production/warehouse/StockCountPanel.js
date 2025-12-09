/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const StockCountPanel = ({ onRefresh }) => {
  const [counts, setCounts] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    product_id: 'PROD001',
    product_name: '',
    system_quantity: 0,
    counted_quantity: 0,
    unit: 'kg',
    notes: ''
  });

  const fetchData = React.useCallback(async () => { // moved
  }, []);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const data = await productionApi.getStockCounts(30);
      setCounts(data.stock_counts || []);
    } catch (error) {
      toast.error('Sayım kayıtları yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await productionApi.createStockCount(formData);
      toast.success('Sayım kaydı oluşturuldu');
      setShowDialog(false);
      fetchCounts();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Sayım kaydı oluşturulamadı');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Stok Sayımı ve Fark Raporu
            </CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Sayım
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sayım No</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Sistem</TableHead>
                <TableHead>Sayılan</TableHead>
                <TableHead>Fark</TableHead>
                <TableHead>Sayan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.map((count) => (
                <TableRow key={count.id}>
                  <TableCell className="font-mono">{count.count_number}</TableCell>
                  <TableCell className="text-sm">{new Date(count.count_date).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell>{count.product_name}</TableCell>
                  <TableCell>{count.system_quantity} {count.unit}</TableCell>
                  <TableCell>{count.counted_quantity} {count.unit}</TableCell>
                  <TableCell>
                    <Badge variant={count.difference === 0 ? 'default' : 'destructive'}>
                      {count.difference > 0 ? '+' : ''}{count.difference} {count.unit}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{count.counted_by_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Stok Sayımı</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Ürün Adı *</Label>
              <Input value={formData.product_name} onChange={(e) => setFormData({...formData, product_name: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sistem Miktarı *</Label>
                <Input type="number" step="0.1" value={formData.system_quantity} onChange={(e) => setFormData({...formData, system_quantity: parseFloat(e.target.value)})} required />
              </div>
              <div>
                <Label>Sayılan Miktar *</Label>
                <Input type="number" step="0.1" value={formData.counted_quantity} onChange={(e) => setFormData({...formData, counted_quantity: parseFloat(e.target.value)})} required />
              </div>
            </div>
            {formData.counted_quantity !== formData.system_quantity && (
              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-sm font-semibold">Fark: {formData.counted_quantity - formData.system_quantity} {formData.unit}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button type="submit">Kaydet</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockCountPanel;