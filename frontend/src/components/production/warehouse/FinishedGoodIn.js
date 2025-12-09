/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const FinishedGoodIn = ({ onRefresh }) => {
  const [transactions, setTransactions] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    batch_number: '',
    product_name: '',
    quantity: 0,
    unit: 'kg',
    to_location: '',
    lot_number: '',
    expiry_date: '',
    notes: ''
  });

  const fetchData = React.useCallback(async () => { // moved
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const data = await productionApi.getWarehouseTransactions('finished_good_in', 7);
      setTransactions(data.transactions || []);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await productionApi.createFinishedGoodIn({
        ...formData,
        product_id: 'PROD001',
        expiry_date: formData.expiry_date || null
      });
      toast.success('Mamul girişi kaydedildi');
      setShowDialog(false);
      fetchTransactions();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Giriş kaydedilemedi');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Mamul Girişi (Üretimden Gelen)
            </CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Giriş
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İşlem No</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead>Lot/Batch</TableHead>
                <TableHead>SKT</TableHead>
                <TableHead>Lokasyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((trans) => (
                <TableRow key={trans.id}>
                  <TableCell className="font-mono">{trans.transaction_number}</TableCell>
                  <TableCell className="text-sm">{new Date(trans.transaction_date).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell>{trans.product_name}</TableCell>
                  <TableCell>{trans.quantity} {trans.unit}</TableCell>
                  <TableCell>{trans.lot_number || trans.batch_number || '-'}</TableCell>
                  <TableCell>{trans.expiry_date ? new Date(trans.expiry_date).toLocaleDateString('tr-TR') : '-'}</TableCell>
                  <TableCell className="font-mono">{trans.to_location || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Mamul Girişi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Batch Numarası *</Label>
                <Input value={formData.batch_number} onChange={(e) => setFormData({...formData, batch_number: e.target.value})} required />
              </div>
              <div>
                <Label>Ürün Adı *</Label>
                <Input value={formData.product_name} onChange={(e) => setFormData({...formData, product_name: e.target.value})} required />
              </div>
              <div>
                <Label>Miktar *</Label>
                <Input type="number" step="0.1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})} required />
              </div>
              <div>
                <Label>Lokasyon (Raf)</Label>
                <Input value={formData.to_location} onChange={(e) => setFormData({...formData, to_location: e.target.value})} placeholder="A-01-05" />
              </div>
              <div>
                <Label>Lot Numarası</Label>
                <Input value={formData.lot_number} onChange={(e) => setFormData({...formData, lot_number: e.target.value})} />
              </div>
              <div>
                <Label>SKT</Label>
                <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button type="submit">Giriş Kaydet</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinishedGoodIn;