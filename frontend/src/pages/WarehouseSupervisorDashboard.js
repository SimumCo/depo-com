// Warehouse Supervisor Dashboard
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Package, TruckIcon, AlertTriangle, MapPin, 
  ClipboardList, Lock, FileText, Search, BarChart3, CalendarCheck
} from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../services/productionApi';
import Layout from '../components/Layout';

// Import warehouse components
import RawMaterialOut from '../components/production/warehouse/RawMaterialOut';
import FinishedGoodIn from '../components/production/warehouse/FinishedGoodIn';
import StockLocationManager from '../components/production/warehouse/StockLocationManager';
import StockCountPanel from '../components/production/warehouse/StockCountPanel';
import StockBlockPanel from '../components/production/warehouse/StockBlockPanel';
import ExpiringStockAlert from '../components/production/warehouse/ExpiringStockAlert';

// New components
import DailyProductEntries from '../components/production/warehouse/DailyProductEntries';
import PendingSalesRepOrders from '../components/production/warehouse/PendingSalesRepOrders';
import PendingLogisticsLoading from '../components/production/warehouse/PendingLogisticsLoading';
import CriticalStockLevels from '../components/production/warehouse/CriticalStockLevels';
import QuickProductSearch from '../components/production/warehouse/QuickProductSearch';
import WarehouseStockReport from '../components/production/warehouse/WarehouseStockReport';
import StockCountVariance from '../components/production/warehouse/StockCountVariance';

const WarehouseSupervisorDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily-entries');

  useEffect(() => {
    fetchStats();
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await productionApi.getWarehouseDashboardStats();
      setStats(data);
    } catch (error) {
      toast.error('İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout title="Depo Sorumlusu Paneli">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Bugün Hareketler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.today_movements || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TruckIcon className="h-4 w-4" />
              Haftalık Çıkışlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats?.weekly_outbound || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Haftalık Girişler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.weekly_inbound || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Blokeli Stoklar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats?.blocked_stock || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              SKT Yaklaşan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {stats?.expiring_soon || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Doluluk Oranı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.occupancy_rate || '0%'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">0/0 lokasyon</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="raw-out" className="flex items-center gap-2">
            <TruckIcon className="h-4 w-4" />
            Hammadde Çıkışı
          </TabsTrigger>
          <TabsTrigger value="finished-in" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Mamul Girişi
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Lokasyonlar
          </TabsTrigger>
          <TabsTrigger value="count" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Stok Sayımı
          </TabsTrigger>
          <TabsTrigger value="blocks" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Blokajlar
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            SKT Uyarıları
          </TabsTrigger>
        </TabsList>

        <TabsContent value="raw-out">
          <RawMaterialOut onRefresh={fetchStats} />
        </TabsContent>

        <TabsContent value="finished-in">
          <FinishedGoodIn onRefresh={fetchStats} />
        </TabsContent>

        <TabsContent value="locations">
          <StockLocationManager />
        </TabsContent>

        <TabsContent value="count">
          <StockCountPanel onRefresh={fetchStats} />
        </TabsContent>

        <TabsContent value="blocks">
          <StockBlockPanel onRefresh={fetchStats} />
        </TabsContent>

        <TabsContent value="expiring">
          <ExpiringStockAlert />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default WarehouseSupervisorDashboard;