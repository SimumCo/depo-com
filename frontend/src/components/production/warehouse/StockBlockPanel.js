import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Lock, Plus, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const StockBlockPanel = ({ onRefresh }) => {
  const [blocks, setBlocks] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    stock_item_id: 'ITEM001',
    product_id: 'PROD001',
    product_name: '',
    lot_number: '',
    quantity: 0,
    unit: 'kg',
    reason: ''
  });

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const data = await productionApi.getStockBlocks();
      setBlocks(data.stock_blocks || []);
    } catch (error) {
      toast.error('Blokaj kayıtları yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await productionApi.createStockBlock(formData);
      toast.success('Stok blokajı oluşturuldu');
      setShowDialog(false);
      fetchBlocks();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Blokaj oluşturulamadı');
    }
  };

  const handleRelease = async (blockId, status) => {
    try {
      await productionApi.releaseStockBlock(blockId, status);
      toast.success('Blokaj kaldırıldı');
      fetchBlocks();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Blokaj kaldırılamadı');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Stok Blokaj Yönetimi (QC Bekliyor)
            </CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Blokaj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blokaj No</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead>Sebep</TableHead>
                <TableHead>QC Durumu</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.map((block) => (
                <TableRow key={block.id}>
                  <TableCell className="font-mono">{block.block_number}</TableCell>
                  <TableCell>{block.product_name}</TableCell>
                  <TableCell>{block.lot_number || '-'}</TableCell>
                  <TableCell>{block.quantity} {block.unit}</TableCell>
                  <TableCell className="text-sm">{block.reason}</TableCell>
                  <TableCell>
                    <Badge variant={block.qc_status === 'pending' ? 'secondary' : block.qc_status === 'approved' ? 'default' : 'destructive'}>
                      {block.qc_status === 'pending' ? 'Bekliyor' : block.qc_status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {block.qc_status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => handleRelease(block.id, 'approved')}>
                        <Unlock className="mr-1 h-3 w-3" />
                        Serbest Bırak
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Stok Blokajı</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Ürün Adı *</Label>
              <Input value={formData.product_name} onChange={(e) => setFormData({...formData, product_name: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lot Numarası</Label>
                <Input value={formData.lot_number} onChange={(e) => setFormData({...formData, lot_number: e.target.value})} />
              </div>
              <div>
                <Label>Miktar *</Label>
                <Input type="number" step="0.1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})} required />
              </div>
            </div>
            <div>
              <Label>Blokaj Sebebi *</Label>
              <Textarea value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} rows={3} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button type="submit">Blokaj Oluştur</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockBlockPanel;