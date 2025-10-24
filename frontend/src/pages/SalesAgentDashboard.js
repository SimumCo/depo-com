import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Users, TrendingUp, ShoppingCart, Package, List } from 'lucide-react';
import CustomerManagement from '../components/CustomerManagement';
import SalesAgentCustomers from '../components/SalesAgentCustomers';
import SalesAgentWarehouseOrder from '../components/SalesAgentWarehouseOrder';
import SalesAgentOrders from '../components/SalesAgentOrders';
import AllCustomersConsumption from '../components/AllCustomersConsumption';
import api from '../services/api';

const SalesAgentDashboard = () => {
  const [stats, setStats] = useState({
    my_customers_count: 0,
    my_warehouse_orders: 0,
    customer_orders: 0,
    total_orders: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/salesagent/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  return (
    <Layout title="Plasiyer Paneli">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Müşterilerim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.my_customers_count}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Depot Siparişlerim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.my_warehouse_orders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Müşteri Siparişleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.customer_orders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Toplam Sipariş</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.total_orders}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Users className="mr-2 h-4 w-4" />
            Müşterilerim
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            <List className="mr-2 h-4 w-4" />
            Siparişler
          </TabsTrigger>
          <TabsTrigger value="consumption" data-testid="tab-consumption">
            <TrendingUp className="mr-2 h-4 w-4" />
            Sarfiyat Analizi
          </TabsTrigger>
          <TabsTrigger value="warehouse-order" data-testid="tab-warehouse-order">
            <Package className="mr-2 h-4 w-4" />
            Depoya Sipariş Ver
          </TabsTrigger>
          <TabsTrigger value="management" data-testid="tab-management">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Müşteri Yönetimi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <SalesAgentCustomers />
        </TabsContent>

        <TabsContent value="orders">
          <SalesAgentOrders />
        </TabsContent>

        <TabsContent value="consumption">
          <AllCustomersConsumption />
        </TabsContent>

        <TabsContent value="warehouse-order">
          <SalesAgentWarehouseOrder />
        </TabsContent>

        <TabsContent value="management">
          <CustomerManagement />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default SalesAgentDashboard;
