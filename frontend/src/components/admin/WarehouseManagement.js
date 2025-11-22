import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Warehouse, Edit, Trash2, Eye, Plus } from 'lucide-react';
import { Badge } from '../ui/badge';
import { warehouseAPI } from '../../services/api';

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    manager_name: '',
    capacity: 0
  });

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const response = await warehouseAPI.getAll();
      setWarehouses(response.data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await warehouseAPI.update(editingWarehouse.id, formData);
      } else {
        await warehouseAPI.create(formData);
      }
      setDialogOpen(false);
      resetForm();
      loadWarehouses();
    } catch (error) {
      console.error('Failed to save warehouse:', error);
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location,
      address: warehouse.address || '',
      manager_name: warehouse.manager_name || '',
      capacity: warehouse.capacity
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('İşlemi onaylıyor musunuz? Depo devre dışı bırakılacak.')) return;
    try {
      await warehouseAPI.delete(id);
      loadWarehouses();
    } catch (error) {
      console.error('Failed to delete warehouse:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', address: '', manager_name: '', capacity: 0 });
    setEditingWarehouse(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Depo Yönetimi</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Depo Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWarehouse ? 'Depo Düzenle' : 'Yeni Depo Ekle'}</DialogTitle>
              <DialogDescription>
                Depo bilgilerini girin ve kaydedin.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Depo Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Şehir *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Adres</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="manager_name">Depo Müdürü</Label>
                  <Input
                    id="manager_name"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({...formData, manager_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">Kapasite (birim) *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">Kaydet</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((warehouse) => (
          <Card key={warehouse.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Warehouse className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                </div>
                {warehouse.is_active ? (
                  <Badge variant="success" className="bg-green-500">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Pasif</Badge>
                )}
              </div>
              <CardDescription>{warehouse.location}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Adres</p>
                  <p className="text-sm">{warehouse.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Müdür</p>
                  <p className="text-sm font-medium">{warehouse.manager_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kapasite</p>
                  <p className="text-sm font-medium">
                    {warehouse.current_stock?.toLocaleString() || 0} / {warehouse.capacity?.toLocaleString() || 0} birim
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${((warehouse.current_stock || 0) / (warehouse.capacity || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(warehouse)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Düzenle
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(warehouse.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WarehouseManagement;