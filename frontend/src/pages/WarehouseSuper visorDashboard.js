// Warehouse Supervisor Dashboard
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Package, TruckIcon, AlertTriangle, MapPin, 
  ClipboardList, Lock 
} from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../services/productionApi';

// Import warehouse components
import RawMaterialOut from '../components/production/warehouse/RawMaterialOut';
import FinishedGoodIn from '../components/production/warehouse/FinishedGoodIn';
import StockLocationManager from '../components/production/warehouse/StockLocationManager';
import StockCountPanel from '../components/production/warehouse/StockCountPanel';
import StockBlockPanel from '../components/production/warehouse/StockBlockPanel';
import ExpiringStockAlert from '../components/production/warehouse/ExpiringStockAlert';

const WarehouseSupervisorDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('raw-out');

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8" />
            Depo Sorumlusu Paneli
          </h1>
          <p className="text-blue-100 mt-1">Stok hareketlerini yönetin ve takip edin</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Bugün Hareketler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats?.transactions_today || 0}
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
                {stats?.raw_material_outs || 0}
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
                {stats?.finished_good_ins || 0}
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
                {stats?.blocked_items || 0}
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
              <div className="text-3xl font-bold text-yellow-600">
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
                {stats?.occupancy_rate || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.occupied_locations}/{stats?.total_locations} lokasyon
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expiring Stock Alert */}
        {stats?.expiring_soon > 0 && (
          <Card className="mb-6 border-l-4 border-l-yellow-600">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-600">FIFO/FEFO Uyarısı!</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.expiring_soon} adet ürünün son kullanma tarihi 30 gün içinde doluyor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
            <TabsTrigger value="block" className="flex items-center gap-2">
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

          <TabsContent value="block">
            <StockBlockPanel onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="expiring">
            <ExpiringStockAlert />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WarehouseSupervisorDashboard;