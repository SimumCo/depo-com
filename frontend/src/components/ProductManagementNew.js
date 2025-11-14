import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { Plus, Package, Edit, Trash2, Save, X, Info } from 'lucide-react';

// Kategori seçenekleri
const CATEGORIES = [
  'Süt',
  'Yoğurt',
  'Peynir',
  'Ayran',
  'Krema',
  'Tereyağı',
  'Diğer'
];

// Birim seçenekleri
const UNITS = ['ADET', 'KG', 'LT', 'GR', 'ML', 'PAKET', 'KOLİ'];

// Stok durumu
const STOCK_STATUS = [
  { value: 'active', label: 'Aktif' },
  { value: 'passive', label: 'Pasif' }
];

// Ürün durumu
const PRODUCT_STATUS = [
  { value: true, label: 'Aktif' },
  { value: false, label: 'Pasif' }
];

const ProductManagementNew = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Süt',
    unit: 'ADET',
    units_per_case: 1,
    sales_unit: 'ADET',
    gross_weight: 0,
    net_weight: 0,
    weight: 0,
    case_dimensions: '',
    production_cost: 0,
    sales_price: 0,
    logistics_price: 0,
    dealer_price: 0,
    vat_rate: 18,
    barcode: '',
    warehouse_code: '',
    shelf_code: '',
    location_code: '',
    lot_number: '',
    expiry_date: '',
    stock_quantity: 0,
    stock_status: 'active',
    min_stock_level: 0,
    max_stock_level: 0,
    supply_time: 0,
    turnover_rate: 0,
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await productsAPI.create(formData);
      toast.success('Ürün başarıyla eklendi');
      setOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      toast.error('Ürün eklenemedi: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      category: 'Süt',
      unit: 'ADET',
      units_per_case: 1,
      sales_unit: 'ADET',
      gross_weight: 0,
      net_weight: 0,
      weight: 0,
      case_dimensions: '',
      production_cost: 0,
      sales_price: 0,
      logistics_price: 0,
      dealer_price: 0,
      vat_rate: 18,
      barcode: '',
      warehouse_code: '',
      shelf_code: '',
      location_code: '',
      lot_number: '',
      expiry_date: '',
      stock_quantity: 0,
      stock_status: 'active',
      min_stock_level: 0,
      max_stock_level: 0,
      supply_time: 0,
      turnover_rate: 0,
      description: '',
      is_active: true,
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product.id);
    setEditFormData({
      name: product.name || '',
      category: product.category || 'Süt',
      unit: product.unit || 'ADET',
      units_per_case: product.units_per_case || 1,
      sales_unit: product.sales_unit || 'ADET',
      gross_weight: product.gross_weight || 0,
      net_weight: product.net_weight || 0,
      weight: product.weight || 0,
      case_dimensions: product.case_dimensions || '',
      production_cost: product.production_cost || 0,
      sales_price: product.sales_price || 0,
      logistics_price: product.logistics_price || 0,
      dealer_price: product.dealer_price || 0,
      vat_rate: product.vat_rate || 18,
      barcode: product.barcode || '',
      warehouse_code: product.warehouse_code || '',
      shelf_code: product.shelf_code || '',
      location_code: product.location_code || '',
      lot_number: product.lot_number || '',
      expiry_date: product.expiry_date || '',
      stock_quantity: product.stock_quantity || 0,
      stock_status: product.stock_status || 'active',
      min_stock_level: product.min_stock_level || 0,
      max_stock_level: product.max_stock_level || 0,
      supply_time: product.supply_time || 0,
      turnover_rate: product.turnover_rate || 0,
      description: product.description || '',
      is_active: product.is_active !== undefined ? product.is_active : true,
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditFormData(null);
  };

  const handleUpdateProduct = async (productId) => {
    try {
      await productsAPI.update(productId, editFormData);
      toast.success('Ürün başarıyla güncellendi');
      setEditingProduct(null);
      setEditFormData(null);
      loadProducts();
    } catch (error) {
      toast.error('Ürün güncellenemedi: ' + (error.response?.data?.detail || error.message));
      console.error('Update error:', error);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`"${productName}" ürününü silmek istediğinizden emin misiniz?`)) {
      try {
        await productsAPI.delete(productId);
        toast.success('Ürün başarıyla silindi');
        loadProducts();
      } catch (error) {
        toast.error('Ürün silinemedi');
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Detaylı Ürün Yönetimi</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Ürün
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Ürün Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
                  <TabsTrigger value="pricing">Fiyatlandırma</TabsTrigger>
                  <TabsTrigger value="stock">Stok</TabsTrigger>
                  <TabsTrigger value="location">Lokasyon</TabsTrigger>
                </TabsList>

                {/* Temel Bilgiler */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">Stok Kodu *</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Ürün Adı *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori *</Label>
                      <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Birim</Label>
                      <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sales_unit">Satış Birimi</Label>
                      <Select value={formData.sales_unit} onValueChange={(val) => setFormData({ ...formData, sales_unit: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="units_per_case">Koli İçi Adet</Label>
                      <Input
                        id="units_per_case"
                        type="number"
                        value={formData.units_per_case}
                        onChange={(e) => setFormData({ ...formData, units_per_case: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gross_weight">Brüt Ağırlık (kg)</Label>
                      <Input
                        id="gross_weight"
                        type="number"
                        step="0.01"
                        value={formData.gross_weight}
                        onChange={(e) => setFormData({ ...formData, gross_weight: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="net_weight">Net Ağırlık (kg)</Label>
                      <Input
                        id="net_weight"
                        type="number"
                        step="0.01"
                        value={formData.net_weight}
                        onChange={(e) => setFormData({ ...formData, net_weight: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="case_dimensions">Koli Ebatları (cm)</Label>
                      <Input
                        id="case_dimensions"
                        placeholder="30x40x50"
                        value={formData.case_dimensions}
                        onChange={(e) => setFormData({ ...formData, case_dimensions: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Açıklama</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="is_active">Ürün Durumu</Label>
                      <Select 
                        value={formData.is_active ? 'true' : 'false'} 
                        onValueChange={(val) => setFormData({ ...formData, is_active: val === 'true' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Aktif</SelectItem>
                          <SelectItem value="false">Pasif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Fiyatlandırma */}
                <TabsContent value="pricing" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="production_cost">Üretim Maliyeti (₺)</Label>
                      <Input
                        id="production_cost"
                        type="number"
                        step="0.01"
                        value={formData.production_cost}
                        onChange={(e) => setFormData({ ...formData, production_cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sales_price">Satış Fiyatı (₺)</Label>
                      <Input
                        id="sales_price"
                        type="number"
                        step="0.01"
                        value={formData.sales_price}
                        onChange={(e) => setFormData({ ...formData, sales_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="logistics_price">Lojistik Fiyatı (₺)</Label>
                      <Input
                        id="logistics_price"
                        type="number"
                        step="0.01"
                        value={formData.logistics_price}
                        onChange={(e) => setFormData({ ...formData, logistics_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dealer_price">Bayi Fiyatı (₺)</Label>
                      <Input
                        id="dealer_price"
                        type="number"
                        step="0.01"
                        value={formData.dealer_price}
                        onChange={(e) => setFormData({ ...formData, dealer_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vat_rate">KDV Oranı (%)</Label>
                    <Input
                      id="vat_rate"
                      type="number"
                      step="0.01"
                      value={formData.vat_rate}
                      onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 18 })}
                    />
                  </div>
                </TabsContent>

                {/* Stok */}
                <TabsContent value="stock" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Stok Miktarı</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock_level">Min. Stok</Label>
                      <Input
                        id="min_stock_level"
                        type="number"
                        value={formData.min_stock_level}
                        onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_stock_level">Max. Stok</Label>
                      <Input
                        id="max_stock_level"
                        type="number"
                        value={formData.max_stock_level}
                        onChange={(e) => setFormData({ ...formData, max_stock_level: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_status">Stok Durumu</Label>
                      <Select value={formData.stock_status} onValueChange={(val) => setFormData({ ...formData, stock_status: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STOCK_STATUS.map(status => (
                            <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supply_time">Temin Süresi (gün)</Label>
                      <Input
                        id="supply_time"
                        type="number"
                        value={formData.supply_time}
                        onChange={(e) => setFormData({ ...formData, supply_time: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lot_number">Lot Numarası</Label>
                      <Input
                        id="lot_number"
                        value={formData.lot_number}
                        onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry_date">Son Kullanma</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="turnover_rate">Devir Hızı</Label>
                      <Input
                        id="turnover_rate"
                        type="number"
                        step="0.01"
                        value={formData.turnover_rate}
                        onChange={(e) => setFormData({ ...formData, turnover_rate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Lokasyon */}
                <TabsContent value="location" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="barcode">Barkod</Label>
                      <Input
                        id="barcode"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warehouse_code">Depo Kodu</Label>
                      <Input
                        id="warehouse_code"
                        value={formData.warehouse_code}
                        onChange={(e) => setFormData({ ...formData, warehouse_code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shelf_code">Raf Kodu</Label>
                      <Input
                        id="shelf_code"
                        value={formData.shelf_code}
                        onChange={(e) => setFormData({ ...formData, shelf_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location_code">Konum Kodu</Label>
                      <Input
                        id="location_code"
                        value={formData.location_code}
                        onChange={(e) => setFormData({ ...formData, location_code: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">Kaydet</Button>
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
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Henüz ürün eklenmemiş</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stok Kodu</TableHead>
                  <TableHead>Ürün Adı</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Satış Fiyatı</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Badge variant="outline">{product.sku}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                      <Badge variant={product.stock_quantity > product.min_stock_level ? "default" : "destructive"}>
                        {product.stock_quantity || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.sales_price || 0} ₺</TableCell>
                    <TableCell>
                      <Badge variant={product.stock_status === 'active' ? 'success' : 'secondary'}>
                        {product.stock_status === 'active' ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        {editingProduct && editFormData && (
          <Dialog open={!!editingProduct} onOpenChange={(open) => !open && handleCancelEdit()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ürün Düzenle</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Temel</TabsTrigger>
                    <TabsTrigger value="pricing">Fiyat</TabsTrigger>
                    <TabsTrigger value="stock">Stok</TabsTrigger>
                    <TabsTrigger value="location">Lokasyon</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ürün Adı</Label>
                        <Input
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kategori</Label>
                        <Select value={editFormData.category} onValueChange={(val) => setEditFormData({ ...editFormData, category: val })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Birim</Label>
                        <Select value={editFormData.unit} onValueChange={(val) => setEditFormData({ ...editFormData, unit: val })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map(unit => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Koli İçi Adet</Label>
                        <Input
                          type="number"
                          value={editFormData.units_per_case}
                          onChange={(e) => setEditFormData({ ...editFormData, units_per_case: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Brüt Ağırlık</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editFormData.gross_weight}
                          onChange={(e) => setEditFormData({ ...editFormData, gross_weight: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="pricing" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Satış Fiyatı (₺)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editFormData.sales_price}
                          onChange={(e) => setEditFormData({ ...editFormData, sales_price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>KDV Oranı (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editFormData.vat_rate}
                          onChange={(e) => setEditFormData({ ...editFormData, vat_rate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="stock" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Stok Miktarı</Label>
                        <Input
                          type="number"
                          value={editFormData.stock_quantity}
                          onChange={(e) => setEditFormData({ ...editFormData, stock_quantity: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Min. Stok</Label>
                        <Input
                          type="number"
                          value={editFormData.min_stock_level}
                          onChange={(e) => setEditFormData({ ...editFormData, min_stock_level: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stok Durumu</Label>
                        <Select value={editFormData.stock_status} onValueChange={(val) => setEditFormData({ ...editFormData, stock_status: val })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STOCK_STATUS.map(status => (
                              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="location" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Depo Kodu</Label>
                        <Input
                          value={editFormData.warehouse_code}
                          onChange={(e) => setEditFormData({ ...editFormData, warehouse_code: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Raf Kodu</Label>
                        <Input
                          value={editFormData.shelf_code}
                          onChange={(e) => setEditFormData({ ...editFormData, shelf_code: e.target.value })}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="mr-2 h-4 w-4" />
                    İptal
                  </Button>
                  <Button onClick={() => handleUpdateProduct(editingProduct)} className="bg-green-600 hover:bg-green-700">
                    <Save className="mr-2 h-4 w-4" />
                    Kaydet
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductManagementNew;
