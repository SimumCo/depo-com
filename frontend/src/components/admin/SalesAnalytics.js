import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Package } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsAPI } from '../../services/api';

const SalesAnalytics = () => {
  const [period, setPeriod] = useState('daily');
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSalesData();
  }, [period]);

  const loadSalesData = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getSalesAnalytics(period);
      setSalesData(response.data);
    } catch (error) {
      console.error('Failed to load sales analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Yükleniyor...</div>;
  }

  const getTrendIcon = (direction) => {
    if (direction === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (direction === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Satış Analizi</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Periyot seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Günlük</SelectItem>
            <SelectItem value="weekly">Haftalık</SelectItem>
            <SelectItem value="monthly">Aylık</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Satış</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData?.total_sales?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {getTrendIcon(salesData?.trend_direction)}
              <span className="ml-1">{salesData?.trend_direction === 'up' ? 'Artış' : salesData?.trend_direction === 'down' ? 'Düşüş' : 'Stabil'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Sipariş</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData?.total_orders || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {period === 'daily' ? 'Bugün' : period === 'weekly' ? 'Son 7 gün' : 'Son 30 gün'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Sipariş Değeri</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData?.average_order_value?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ortalama</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Satış Trend Grafiği</CardTitle>
          <CardDescription>
            {period === 'daily' ? 'Günlük' : period === 'weekly' ? 'Haftalık' : 'Aylık'} satış trendi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData?.sales_trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Satış Tutarı"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>En Çok Satılan Ürünler (Top 5)</CardTitle>
            <CardDescription>Miktar bazında en çok satılan ürünler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData?.top_products?.map((product, index) => (
                <div key={product.product_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.product_name}</p>
                      <p className="text-sm text-muted-foreground">{product.product_sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{product.quantity} adet</p>
                    <p className="text-sm text-muted-foreground">
                      {product.revenue?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Declining Products */}
        <Card>
          <CardHeader>
            <CardTitle>Düşüşte Olan Ürünler</CardTitle>
            <CardDescription>Önceki döneme göre satışı düşen ürünler</CardDescription>
          </CardHeader>
          <CardContent>
            {salesData?.declining_products?.length > 0 ? (
              <div className="space-y-4">
                {salesData.declining_products.map((product) => (
                  <div key={product.product_id} className="flex items-center justify-between border-l-4 border-red-500 pl-3">
                    <div>
                      <p className="font-medium">{product.product_name}</p>
                      <p className="text-sm text-muted-foreground">{product.product_sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">-{product.decline_percentage}%</p>
                      <p className="text-sm text-muted-foreground">
                        {product.current_quantity} → {product.previous_quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Düşüşte olan ürün bulunmuyor 🎉
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesAnalytics;
