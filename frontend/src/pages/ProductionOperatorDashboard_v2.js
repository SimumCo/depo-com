// Production Operator Dashboard - Advanced Version
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Package, ClipboardList, AlertTriangle, FileText, 
  Activity, Clock, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../services/productionApi';

// Import components (akan oluşturulacak)
import ActiveOrdersList from '../components/production/operator/ActiveOrdersList';
import RawMaterialInput from '../components/production/operator/RawMaterialInput';
import BatchRecordForm from '../components/production/operator/BatchRecordForm';
import DowntimeReport from '../components/production/operator/DowntimeReport';
import OperatorNotes from '../components/production/operator/OperatorNotes';
import ProductionHistory from '../components/production/operator/ProductionHistory';

const ProductionOperatorDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    fetchStats();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await productionApi.getOperatorDashboardStats();
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
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8" />
            Üretim Operatörü Paneli
          </h1>
          <p className="text-green-100 mt-1">Atanmış üretim emirlerini yönetin ve takip edin</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Atanmış Emirler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats?.my_orders || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Üretimde
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats?.in_progress || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Bugün Tamamlanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats?.completed_today || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Aktif Duruşlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats?.active_downtimes || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notlarım
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {stats?.recent_notes?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Emirlerim
            </TabsTrigger>
            <TabsTrigger value="raw-materials" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Hammadde
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Batch Kaydı
            </TabsTrigger>
            <TabsTrigger value="downtime" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Duruş Bildirimi
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notlarım
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Geçmiş
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <ActiveOrdersList onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="raw-materials">
            <RawMaterialInput />
          </TabsContent>

          <TabsContent value="batch">
            <BatchRecordForm />
          </TabsContent>

          <TabsContent value="downtime">
            <DowntimeReport onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="notes">
            <OperatorNotes notes={stats?.recent_notes || []} onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="history">
            <ProductionHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProductionOperatorDashboard;
