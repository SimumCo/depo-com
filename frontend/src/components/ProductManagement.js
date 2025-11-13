import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Plus, Package, Edit, Trash2, Save, X } from 'lucide-react';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    weight: '',
    units_per_case: '',
    description: '',
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
      await productsAPI.create({
        ...formData,
        weight: parseFloat(formData.weight),
        units_per_case: parseInt(formData.units_per_case),
      });
      toast.success('Ürün başarıyla eklendi');
      setOpen(false);
      setFormData({
        name: '',
        sku: '',
        category: '',
        weight: '',
        units_per_case: '',
        description: '',
      });
      loadProducts();
    } catch (error) {
      toast.error('Ürün eklenemedi');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product.id);
    setEditFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      weight: product.weight,
      units_per_case: product.units_per_case,
      description: product.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditFormData(null);
  };

  const handleUpdateProduct = async (productId) => {
    try {
      await productsAPI.update(productId, {
        ...editFormData,
        weight: parseFloat(editFormData.weight),
        units_per_case: parseInt(editFormData.units_per_case),
      });
      toast.success('Ürün başarıyla güncellendi');
      setEditingProduct(null);
      setEditFormData(null);
      loadProducts();
    } catch (error) {
      toast.error('Ürün güncellenemedi');
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
        console.error('Delete error:', error);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ürün Yönetimi</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-product-button">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Ürün
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Ürün Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ürün Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="product-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                    data-testid="product-sku-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    data-testid="product-category-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Ağırlık (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    required
                    data-testid="product-weight-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="units_per_case">Koli Başına Birim *</Label>
                <Input
                  id="units_per_case"
                  type="number"
                  value={formData.units_per_case}
                  onChange={(e) => setFormData({ ...formData, units_per_case: e.target.value })}
                  required
                  data-testid="product-units-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="product-description-input"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" data-testid="save-product-button">Kaydet</Button>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Ağırlık (kg)</TableHead>
                <TableHead>Koli/Birim</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} data-testid={`product-row-${product.sku}`}>
                  {editingProduct === product.id ? (
                    // Düzenleme Modu
                    <>
                      <TableCell>
                        <Input
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editFormData.sku}
                          onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                          className="w-32"
                          disabled
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editFormData.category}
                          onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={editFormData.weight}
                          onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editFormData.units_per_case}
                          onChange={(e) => setEditFormData({ ...editFormData, units_per_case: e.target.value })}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editFormData.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateProduct(product.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    // Görüntüleme Modu
                    <>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.sku}</Badge>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.weight}</TableCell>
                      <TableCell>{product.units_per_case}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                            data-testid={`edit-product-${product.sku}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            data-testid={`delete-product-${product.sku}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductManagement;
