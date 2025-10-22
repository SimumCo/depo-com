import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { salesRepAPI } from '../services/api';
import { Users, ShoppingCart, CheckCircle, TrendingUp } from 'lucide-react';
import CustomerManagement from '../components/CustomerManagement';
import ProductCatalog from '../components/ProductCatalog';
import SalesRepOrders from '../components/SalesRepOrders';

const SalesRepDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await salesRepAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Satış Temsilcisi Paneli">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card data-testid="stat-customers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Müşteri</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_customers || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-my-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oluşturduğum Siparişler</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.my_orders || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.pending_orders || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-delivered">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teslim Edildi</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.delivered_orders || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers" data-testid="tab-customers">Müşteriler</TabsTrigger>
          <TabsTrigger value="catalog" data-testid="tab-catalog">Ürün Kataloğu</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Siparişlerim</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <CustomerManagement onUpdate={loadStats} />
        </TabsContent>

        <TabsContent value="catalog">
          <ProductCatalog isSalesRep={true} onUpdate={loadStats} />
        </TabsContent>

        <TabsContent value="orders">
          <SalesRepOrders onUpdate={loadStats} />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default SalesRepDashboard;
