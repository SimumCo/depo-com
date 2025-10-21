import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { dashboardAPI } from '../services/api';
import { Package, TruckIcon, ClipboardList, AlertCircle } from 'lucide-react';
import InventoryView from '../components/InventoryView';
import IncomingShipments from '../components/IncomingShipments';
import OrderManagement from '../components/OrderManagement';
import TaskManagement from '../components/TaskManagement';

const WarehouseManagerDashboard = () => {
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
    <Layout title="Depo Müdürü Paneli">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="stat-inventory">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Envanter</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_inventory_units || 0}</div>
            <p className="text-xs text-muted-foreground">Birim</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-shipments">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beklenen Sevkiyatlar</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.expected_shipments || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-prepare">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hazırlanacak Siparişler</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders_to_prepare || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Görevler</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.pending_tasks || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Envanter</TabsTrigger>
          <TabsTrigger value="shipments" data-testid="tab-shipments">Gelen Sevkiyatlar</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Siparişler</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">Görevler</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <InventoryView />
        </TabsContent>

        <TabsContent value="shipments">
          <IncomingShipments />
        </TabsContent>

        <TabsContent value="orders">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskManagement role="manager" onUpdate={loadStats} />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default WarehouseManagerDashboard;
