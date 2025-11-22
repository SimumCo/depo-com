import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Users, TrendingUp, Truck, BarChart3 } from 'lucide-react';
import { analyticsAPI } from '../../services/api';

const PerformancePanel = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getPerformance();
      setPerformanceData(response.data);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Performans ve Operasyon Özeti</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Plasiyer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData?.active_agents_count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Toplam aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Teslimat</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData?.total_deliveries_last_30_days || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Son 30 gün</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Devir Hızı</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData?.stock_turnover_rate || 0}x</div>
            <p className="text-xs text-muted-foreground mt-1">Aylık</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Teslimat</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((performanceData?.total_deliveries_last_30_days || 0) / 30)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Günlük ortalama</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Sales Agents */}
      <Card>
        <CardHeader>
          <CardTitle>En Çok Satış Yapan Plasiyerler (Top 5)</CardTitle>
          <CardDescription>Son 30 günde en başarılı plasiyerler</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceData?.top_sales_agents?.map((agent, index) => (
              <div 
                key={agent.agent_id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{agent.agent_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {agent.total_customers} müşteri • {agent.total_orders} sipariş
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    {agent.total_sales?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ort: {agent.average_order_value?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformancePanel;