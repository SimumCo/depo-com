// Production Manager Dashboard
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Factory, ClipboardList, FileText, Package, AlertCircle, TrendingUp } from 'lucide-react';
import * as productionApi from '../services/productionApi';
import ProductionPlanManager from '../components/production/ProductionPlanManager';
import ProductionOrderList from '../components/production/ProductionOrderList';
import BOMManager from '../components/production/BOMManager';
import RawMaterialAnalysis from '../components/production/RawMaterialAnalysis';
import Layout from '../components/Layout';
import { toast } from 'sonner';

const ProductionManagerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await productionApi.getDashboardStats();
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
    <Layout title="Üretim Yönetimi Dashboard">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktif Planlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.plans?.active || 0}
                <span className="text-sm text-muted-foreground ml-1">/ {stats?.plans?.total || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bekleyen Emirler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.orders?.pending || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Üretimde
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.orders?.in_progress || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tamamlanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.orders?.completed || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktif Hatlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.lines?.active || 0}
                <span className="text-sm text-muted-foreground ml-1">/ {stats?.lines?.total || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kalite Başarı Oranı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.quality_control?.pass_rate || 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Üretim Planları
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Üretim Emirleri
            </TabsTrigger>
            <TabsTrigger value="bom" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reçeteler (BOM)
            </TabsTrigger>
            <TabsTrigger value="raw-materials" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Hammadde Analizi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            <ProductionPlanManager />
          </TabsContent>

          <TabsContent value="orders">
            <ProductionOrderList role="production_manager" />
          </TabsContent>

          <TabsContent value="bom">
            <BOMManager />
          </TabsContent>

          <TabsContent value="raw-materials">
            <RawMaterialAnalysis />
          </TabsContent>
        </Tabs>
    </Layout>
  );
};

export default ProductionManagerDashboard;