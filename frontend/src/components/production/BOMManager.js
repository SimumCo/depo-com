// BOM (Bill of Materials) Manager Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../services/productionApi';

const BOMManager = () => {
  const [boms, setBoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBOM, setNewBOM] = useState({
    product_id: '',
    product_name: '',
    version: '1.0',
    output_quantity: 1.0,
    output_unit: 'kg',
    items: [],
    notes: ''
  });
  const [newItem, setNewItem] = useState({
    raw_material_id: '',
    raw_material_name: '',
    quantity: 0,
    unit: 'kg'
  });

  useEffect(() => {
    fetchBOMs();
    fetchProducts();
  }, []);

  const fetchBOMs = async () => {
    try {
      const data = await productionApi.getBOMs();
      setBoms(data.boms || []);
    } catch (error) {
      toast.error('Reçeteler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await productionApi.getProducts();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Ürünler yüklenemedi:', error);
    }
  };

  const handleAddItem = () => {
    if (!newItem.raw_material_id || newItem.quantity <= 0) {
      toast.error('Lütfen hammadde ve miktar girin');
      return;
    }

    const rawMaterial = products.find(p => p.id === newItem.raw_material_id);
    setNewBOM({
      ...newBOM,
      items: [...newBOM.items, {
        ...newItem,
        raw_material_name: rawMaterial?.name || ''
      }]
    });

    setNewItem({
      raw_material_id: '',
      raw_material_name: '',
      quantity: 0,
      unit: 'kg'
    });
  };

  const handleRemoveItem = (index) => {
    setNewBOM({
      ...newBOM,
      items: newBOM.items.filter((_, i) => i !== index)
    });
  };

  const handleCreateBOM = async () => {
    if (!newBOM.product_id) {
      toast.error('Lütfen ürün seçin');
      return;
    }

    if (newBOM.items.length === 0) {
      toast.error('Lütfen en az bir hammadde ekleyin');
      return;
    }

    try {
      const product = products.find(p => p.id === newBOM.product_id);
      await productionApi.createBOM({
        ...newBOM,
        product_name: product?.name || ''
      });
      toast.success('Reçete oluşturuldu');
      setShowCreateDialog(false);
      setNewBOM({
        product_id: '',
        product_name: '',
        version: '1.0',
        output_quantity: 1.0,
        output_unit: 'kg',
        items: [],
        notes: ''
      });
      fetchBOMs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Reçete oluşturulamadı');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Reçete Yönetimi (BOM)</h2>
          <p className="text-muted-foreground">Ürün reçetelerini ve hammadde gereksinimlerini yönetin</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Reçete
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Reçete Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ürün *</Label>
                  <Select
                    value={newBOM.product_id}
                    onValueChange={(value) => setNewBOM({ ...newBOM, product_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ürün seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Versiyon</Label>
                  <Input
                    value={newBOM.version}
                    onChange={(e) => setNewBOM({ ...newBOM, version: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Çıktı Miktarı</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newBOM.output_quantity}
                    onChange={(e) => setNewBOM({ ...newBOM, output_quantity: parseFloat(e.target.value) || 1.0 })}
                  />
                </div>
                <div>
                  <Label>Çıktı Birimi</Label>
                  <Select
                    value={newBOM.output_unit}
                    onValueChange={(value) => setNewBOM({ ...newBOM, output_unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="litre">litre</SelectItem>
                      <SelectItem value="adet">adet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Hammaddeler</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <Select
                    value={newItem.raw_material_id}
                    onValueChange={(value) => setNewItem({ ...newItem, raw_material_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hammadde" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Miktar"
                    value={newItem.quantity || ''}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                  />
                  <Select
                    value={newItem.unit}
                    onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="litre">litre</SelectItem>
                      <SelectItem value="adet">adet</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddItem} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {newBOM.items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hammadde</TableHead>
                        <TableHead>Miktar</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newBOM.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.raw_material_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div>
                <Label>Notlar</Label>
                <Input
                  value={newBOM.notes}
                  onChange={(e) => setNewBOM({ ...newBOM, notes: e.target.value })}
                  placeholder="Reçete notları..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  İptal
                </Button>
                <Button onClick={handleCreateBOM}>
                  Reçete Oluştur
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {boms.map((bom) => (
          <Card key={bom.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {bom.product_name}
                <span className="text-sm text-muted-foreground font-normal">v{bom.version}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Çıktı: {bom.output_quantity} {bom.output_unit}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hammadde</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Birim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bom.items || []).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.raw_material_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {bom.notes && (
                <p className="text-sm text-muted-foreground mt-4">
                  Not: {bom.notes}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BOMManager;