// Production Plan Manager Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Calendar, CheckCircle, Clock, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../services/productionApi';

const ProductionPlanManager = () => {
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlan, setNewPlan] = useState({
    plan_type: 'weekly',
    start_date: '',
    end_date: '',
    items: []
  });
  const [newItem, setNewItem] = useState({
    product_id: '',
    product_name: '',
    target_quantity: 0,
    unit: 'kg',
    priority: 'medium'
  });

  useEffect(() => {
    fetchPlans();
    fetchProducts();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await productionApi.getProductionPlans();
      setPlans(data.plans || []);
    } catch (error) {
      toast.error('Planlar yüklenemedi');
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
    if (!newItem.product_id || newItem.target_quantity <= 0) {
      toast.error('Lütfen ürün ve miktar seçin');
      return;
    }

    const product = products.find(p => p.id === newItem.product_id);
    setNewPlan({
      ...newPlan,
      items: [...newPlan.items, {
        ...newItem,
        product_name: product?.name || ''
      }]
    });

    // Reset item form
    setNewItem({
      product_id: '',
      product_name: '',
      target_quantity: 0,
      unit: 'kg',
      priority: 'medium'
    });
  };

  const handleRemoveItem = (index) => {
    setNewPlan({
      ...newPlan,
      items: newPlan.items.filter((_, i) => i !== index)
    });
  };

  const handleCreatePlan = async () => {
    if (newPlan.items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin');
      return;
    }

    if (!newPlan.start_date || !newPlan.end_date) {
      toast.error('Lütfen başlangıç ve bitiş tarihi seçin');
      return;
    }

    try {
      await productionApi.createProductionPlan({
        ...newPlan,
        plan_date: new Date().toISOString(),
        start_date: new Date(newPlan.start_date).toISOString(),
        end_date: new Date(newPlan.end_date).toISOString()
      });
      toast.success('Üretim planı oluşturuldu');
      setShowCreateDialog(false);
      setNewPlan({
        plan_type: 'weekly',
        start_date: '',
        end_date: '',
        items: []
      });
      fetchPlans();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Plan oluşturulamadı');
    }
  };

  const handleApprovePlan = async (planId) => {
    try {
      await productionApi.approveProductionPlan(planId);
      toast.success('Plan onaylandı');
      fetchPlans();
    } catch (error) {
      toast.error('Plan onaylanamadı');
    }
  };

  const handleGenerateOrders = async (planId) => {
    try {
      const result = await productionApi.generateOrdersFromPlan(planId);
      toast.success(result.message || 'Üretim emirleri oluşturuldu');
      fetchPlans();
    } catch (error) {
      toast.error('Emirler oluşturulamadı');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { variant: 'secondary', label: 'Taslak' },
      approved: { variant: 'default', label: 'Onaylandı' },
      in_progress: { variant: 'default', label: 'Devam Ediyor' },
      completed: { variant: 'default', label: 'Tamamlandı' },
      cancelled: { variant: 'destructive', label: 'İptal' }
    };
    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Üretim Planları</h2>
          <p className="text-muted-foreground">Günlük, haftalık ve aylık üretim planlarını yönetin</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Üretim Planı</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plan Tipi</Label>
                  <Select
                    value={newPlan.plan_type}
                    onValueChange={(value) => setNewPlan({ ...newPlan, plan_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Günlük</SelectItem>
                      <SelectItem value="weekly">Haftalık</SelectItem>
                      <SelectItem value="monthly">Aylık</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Başlangıç Tarihi</Label>
                  <Input
                    type="date"
                    value={newPlan.start_date}
                    onChange={(e) => setNewPlan({ ...newPlan, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Bitiş Tarihi</Label>
                  <Input
                    type="date"
                    value={newPlan.end_date}
                    onChange={(e) => setNewPlan({ ...newPlan, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Ürünler</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <Select
                    value={newItem.product_id}
                    onValueChange={(value) => setNewItem({ ...newItem, product_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ürün" />
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
                    placeholder="Miktar"
                    value={newItem.target_quantity || ''}
                    onChange={(e) => setNewItem({ ...newItem, target_quantity: parseFloat(e.target.value) || 0 })}
                  />
                  <Select
                    value={newItem.priority}
                    onValueChange={(value) => setNewItem({ ...newItem, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                      <SelectItem value="urgent">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddItem} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {newPlan.items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Miktar</TableHead>
                        <TableHead>Öncelik</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newPlan.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.target_quantity} {item.unit}</TableCell>
                          <TableCell>
                            <Badge variant={item.priority === 'high' || item.priority === 'urgent' ? 'destructive' : 'default'}>
                              {item.priority}
                            </Badge>
                          </TableCell>
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

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  İptal
                </Button>
                <Button onClick={handleCreatePlan}>
                  Planı Oluştur
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.plan_number}
                    {getStatusBadge(plan.status)}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(plan.start_date).toLocaleDateString('tr-TR')} - {new Date(plan.end_date).toLocaleDateString('tr-TR')}
                      </span>
                      <Badge variant="outline">{plan.plan_type}</Badge>
                      <span>{plan.items?.length || 0} Ürün</span>
                    </div>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {plan.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprovePlan(plan.id)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Onayla
                    </Button>
                  )}
                  {plan.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => handleGenerateOrders(plan.id)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Emirleri Oluştur
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Hedef Miktar</TableHead>
                    <TableHead>Öncelik</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(plan.items || []).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.target_quantity} {item.unit}</TableCell>
                      <TableCell>
                        <Badge variant={item.priority === 'high' || item.priority === 'urgent' ? 'destructive' : 'default'}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductionPlanManager;