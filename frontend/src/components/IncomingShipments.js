import React, { useState, useEffect } from 'react';
import { shipmentsAPI, productsAPI } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Plus, TruckIcon, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const IncomingShipments = () => {
  const [shipments, setShipments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    shipment_number: '',
    expected_date: '',
    notes: '',
  });
  const [shipmentProducts, setShipmentProducts] = useState([{ product_id: '', expected_units: '', expiry_date: '' }]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [shipmentsRes, productsRes] = await Promise.all([
        shipmentsAPI.getIncoming(),
        productsAPI.getAll(),
      ]);
      setShipments(shipmentsRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const addProductRow = () => {
    setShipmentProducts([...shipmentProducts, { product_id: '', expected_units: '', expiry_date: '' }]);
  };

  const updateProductRow = (index, field, value) => {
    const updated = [...shipmentProducts];
    updated[index][field] = value;
    setShipmentProducts(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const validProducts = shipmentProducts
        .filter(p => p.product_id && p.expected_units)
        .map(p => ({
          product_id: p.product_id,
          expected_units: parseInt(p.expected_units),
          expiry_date: p.expiry_date || null,
        }));

      await shipmentsAPI.createIncoming({
        ...formData,
        expected_date: new Date(formData.expected_date).toISOString(),
        products: validProducts,
      });
      toast.success('Sevkiyat başarıyla eklendi');
      setOpen(false);
      setFormData({ shipment_number: '', expected_date: '', notes: '' });
      setShipmentProducts([{ product_id: '', expected_units: '', expiry_date: '' }]);
      loadData();
    } catch (error) {
      toast.error('Sevkiyat eklenemedi');
    }
  };

  const handleProcess = async (shipmentId) => {
    try {
      await shipmentsAPI.processIncoming(shipmentId);
      toast.success('Sevkiyat işlendi ve envanter güncellendi');
      loadData();
    } catch (error) {
      toast.error('Sevkiyat işlenemedi');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      expected: <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Bekleniyor</Badge>,
      arrived: <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Geldi</Badge>,
      processed: <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">!şlendi</Badge>,
    };
    return badges[status] || status;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gelen Sevkiyatlar</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-shipment-button">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Sevkiyat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Gelen Sevkiyat</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipment_number">Sevkiyat Numarası *</Label>
                  <Input
                    id="shipment_number"
                    value={formData.shipment_number}
                    onChange={(e) => setFormData({ ...formData, shipment_number: e.target.value })}
                    required
                    data-testid="shipment-number-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_date">Beklenen Tarih *</Label>
                  <Input
                    id="expected_date"
                    type="datetime-local"
                    value={formData.expected_date}
                    onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                    required
                    data-testid="expected-date-input"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Ürünler</Label>
                  <Button type="button" size="sm" onClick={addProductRow} data-testid="add-product-row">
                    + Ürün Ekle
                  </Button>
                </div>
                {shipmentProducts.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 p-3 border rounded-lg">
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateProductRow(index, 'product_id', value)}
                    >
                      <SelectTrigger data-testid={`product-select-${index}`}>
                        <SelectValue placeholder="Ürün seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Beklenen birim"
                      value={item.expected_units}
                      onChange={(e) => updateProductRow(index, 'expected_units', e.target.value)}
                      data-testid={`expected-units-${index}`}
                    />
                    <Input
                      type="date"
                      placeholder="SKT"
                      value={item.expiry_date}
                      onChange={(e) => updateProductRow(index, 'expiry_date', e.target.value)}
                      data-testid={`expiry-date-${index}`}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="notes-input"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" data-testid="save-shipment-button">Kaydet</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TruckIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Sevkiyat bulunamadı</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sevkiyat No</TableHead>
                <TableHead>Beklenen Tarih</TableHead>
                <TableHead>Ürün Sayısı</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>!şlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id} data-testid={`shipment-row-${shipment.shipment_number}`}>
                  <TableCell className="font-medium">{shipment.shipment_number}</TableCell>
                  <TableCell>
                    {format(new Date(shipment.expected_date), 'dd MMM yyyy HH:mm', { locale: tr })}
                  </TableCell>
                  <TableCell>{shipment.products?.length || 0}</TableCell>
                  <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                  <TableCell>
                    {shipment.status === 'expected' && (
                      <Button
                        size="sm"
                        onClick={() => handleProcess(shipment.id)}
                        data-testid={`process-shipment-${shipment.shipment_number}`}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        !şle
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default IncomingShipments;
