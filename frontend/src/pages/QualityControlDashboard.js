// Quality Control Specialist Dashboard - Advanced Version
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  ClipboardCheck, AlertTriangle, FileText, TrendingUp, 
  Shield, CheckCircle2, XCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../services/productionApi';
import LogoutButton from '../components/ui/LogoutButton';

// Import QC components
import PendingBatchesList from '../components/production/qc/PendingBatchesList';
import QCTestForm from '../components/production/qc/QCTestForm';
import NonConformanceList from '../components/production/qc/NonConformanceList';
import HACCPPanel from '../components/production/qc/HACCPPanel';
import QCTrendAnalysis from '../components/production/qc/QCTrendAnalysis';

const QualityControlDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchStats();
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await productionApi.getQCDashboardStats();
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ClipboardCheck className="h-8 w-8" />
                Kalite Kontrol Uzmanı Paneli
              </h1>
              <p className="text-purple-100 mt-1">Kalite testlerini yönetin ve analiz edin</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Bekleyen Testler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats?.pending_tests || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Bugün Yapılan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats?.tests_today || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Haftalık Geçen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats?.qc_pass_week || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Haftalık Kalan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats?.qc_fail_week || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Başarı Oranı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {stats?.pass_rate_week || 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Açık NCR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats?.open_ncrs || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* HACCP Alert */}
        {stats?.haccp_deviations > 0 && (
          <Card className="mb-6 border-l-4 border-l-red-600">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-600">HACCP Uyarısı!</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.haccp_deviations} adet kritik kontrol noktası sapması tespit edildi.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              QC Bekleyen
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Test Girişi
            </TabsTrigger>
            <TabsTrigger value="ncr" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Uygunsuzluklar
            </TabsTrigger>
            <TabsTrigger value="haccp" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              HACCP
            </TabsTrigger>
            <TabsTrigger value="trend" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trend Analizi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <PendingBatchesList onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="test">
            <QCTestForm onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="ncr">
            <NonConformanceList onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="haccp">
            <HACCPPanel onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="trend">
            <QCTrendAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QualityControlDashboard;