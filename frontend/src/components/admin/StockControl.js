import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, AlertTriangle, CheckCircle, Warehouse } from 'lucide-react';
import { Badge } from '../ui/badge';
import { analyticsAPI } from '../../services/api';

const StockControl = () => {
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockData();
  }, []);

  const loadStockData = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getStockAnalytics();
      setStockData(response.data);
    } catch (error) {
      console.error('Failed to load stock analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Yükleniyor...</div>;
  }

  const getStatusBadge = (status) => {
    if (status === 'critical') return <Badge variant="destructive">Kritik</Badge>;
    if (status === 'warning') return <Badge variant="warning" className="bg-yellow-500">Uyarı</Badge>;
    return <Badge variant="success" className="bg-green-500">Sağlıklı</Badge>;
  };

  const getStatusIcon = (status) => {
    if (status === 'critical') return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (status === 'warning') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stok Kontrol</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="destructive">{stockData?.total_critical_alerts || 0} Kritik</Badge>
          <Badge variant="warning" className="bg-yellow-500">{stockData?.total_low_stock || 0} Düşük</Badge>
        </div>
      </div>

      {/* Warehouse Stock Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stockData?.warehouse_summaries?.map((warehouse) => (
          <Card key={warehouse.warehouse_id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Warehouse className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{warehouse.warehouse_name}</CardTitle>
                </div>
                {getStatusBadge(warehouse.status)}
              </div>
              <CardDescription>{warehouse.location}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stok:</span>
                  <span className="font-medium">{warehouse.total_stock?.toLocaleString()} / {warehouse.capacity?.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      warehouse.status === 'critical' ? 'bg-red-500' : 
                      warehouse.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${warehouse.capacity_usage_percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Kapasite: {warehouse.capacity_usage_percentage}%</span>
                  <span>{warehouse.critical_stock_count} kritik</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>Kritik Stok Uyarıları ({stockData?.critical_stock_alerts?.length || 0})</span>
          </CardTitle>
          <CardDescription>Acil müdahale gerektiren stok durumları (< 5 birim)</CardDescription>
        </CardHeader>
        <CardContent>
          {stockData?.critical_stock_alerts?.length > 0 ? (
            <div className="space-y-3">
              {stockData.critical_stock_alerts.map((alert, index) => (
                <div 
                  key={`${alert.product_id}-${alert.warehouse_id}-${index}`} 
                  className="flex items-center justify-between p-3 border-l-4 border-red-500 bg-red-50 rounded"
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium">{alert.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.product_sku} • {alert.warehouse_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{alert.current_stock} birim</p>
                    <Badge variant="destructive" className="text-xs">KRİTİK</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Kritik stok uyarısı bulunmuyor ✅
            </p>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Düşük Stok Ürünleri ({stockData?.low_stock_products?.length || 0})</span>
          </CardTitle>
          <CardDescription>Yakında tükenebilecek ürünler (< 20 birim)</CardDescription>
        </CardHeader>
        <CardContent>
          {stockData?.low_stock_products?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stockData.low_stock_products.map((product, index) => (
                <div 
                  key={`${product.product_id}-${product.warehouse_id}-${index}`} 
                  className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded"
                >
                  <div>
                    <p className="font-medium text-sm">{product.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.product_sku} • {product.warehouse_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-700">{product.current_stock}</p>
                    <p className="text-xs text-muted-foreground">birim</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Düşük stok ürünü bulunmuyor ✅
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockControl;