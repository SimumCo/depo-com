import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { analyticsAPI } from '../services/api';
import { 
  Package, Warehouse, TrendingUp, AlertCircle, Users, ShoppingCart,
  BarChart3, FileText, Bell, Tag, Settings
} from 'lucide-react';
import SalesAnalytics from '../components/admin/SalesAnalytics';
import PerformancePanel from '../components/admin/PerformancePanel';
import StockControl from '../components/admin/StockControl';
import WarehouseManagement from '../components/admin/WarehouseManagement';
import CampaignManagement from '../components/admin/CampaignManagement';
import ReportsModule from '../components/admin/ReportsModule';
import NotificationCenter from '../components/admin/NotificationCenter';
import ProductManagement from '../components/ProductManagementNew';
import UsersManagement from '../components/UsersManagement';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await analyticsAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Admin Dashboard">
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_products || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envanter</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_inventory_units?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Birim</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Sipariş</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_orders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritik Stok</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats?.out_of_stock_count || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Plasiyer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_sales_agents || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Sipariş</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
            <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Depolar</CardTitle>
            <Warehouse className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_warehouses || 0}</div>
            <p className="text-xs text-muted-foreground">Çalışır durumda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Kampanyalar</CardTitle>
            <Tag className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_campaigns || 0}</div>
            <p className="text-xs text-muted-foreground">Devam ediyor</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          <TabsTrigger value="sales" className="text-xs md:text-sm">
            <BarChart3 className="h-4 w-4 mr-1" />
            Satış Analizi
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs md:text-sm">
            <TrendingUp className="h-4 w-4 mr-1" />
            Performans
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-xs md:text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            Stok Kontrol
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="text-xs md:text-sm">
            <Warehouse className="h-4 w-4 mr-1" />
            Depolar
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs md:text-sm">
            <Tag className="h-4 w-4 mr-1" />
            Kampanyalar
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs md:text-sm">
            <Package className="h-4 w-4 mr-1" />
            Ürünler
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs md:text-sm">
            <Users className="h-4 w-4 mr-1" />
            Kullanıcılar
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs md:text-sm">
            <FileText className="h-4 w-4 mr-1" />
            Raporlar
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs md:text-sm">
            <Bell className="h-4 w-4 mr-1" />
            Bildirimler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <SalesAnalytics />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformancePanel />
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <StockControl />
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <WarehouseManagement />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <CampaignManagement />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsModule />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationCenter />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default AdminDashboard;
