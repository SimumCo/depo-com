import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { dashboardAPI, productsAPI, inventoryAPI } from '../services/api';
import { Package, Warehouse, TrendingUp, AlertCircle } from 'lucide-react';
import ProductManagement from '../components/ProductManagement';
import InventoryView from '../components/InventoryView';
import UserManagement from '../components/UserManagement';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Yönetici Paneli">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="stat-products">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_products || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-inventory">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Envanter</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_inventory_units || 0}</div>
            <p className="text-xs text-muted-foreground">Birim</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Siparişler</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_orders || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-out-of-stock">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stokta Yok</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats?.out_of_stock_count || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" data-testid="tab-products">Ürün Yönetimi</TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Envanter</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Kullanıcılar</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryView />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default AdminDashboard;
