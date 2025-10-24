import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Minus, Package, DollarSign, ShoppingCart, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const InvoiceAnalysis = () => {
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    loadAnalysis();
    loadRecommendations();
  }, [period]);

  const loadAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/invoices/analysis?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalysis(response.data);
    } catch (error) {
      toast.error('Analiz yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/invoices/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Recommendations failed:', error);
    }
  };

  const getTrendIcon = (trend) => {
    switch(trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendBadge = (trend) => {
    const badges = {
      increasing: <Badge className="bg-green-100 text-green-700">Artıyor</Badge>,
      decreasing: <Badge className="bg-red-100 text-red-700">Azalıyor</Badge>,
      stable: <Badge variant="secondary">Stabil</Badge>
    };
    return badges[trend] || badges.stable;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 border-red-300 text-red-800',
      high: 'bg-orange-100 border-orange-300 text-orange-800',
      medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      low: 'bg-blue-100 border-blue-300 text-blue-800'
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analysis || analysis.total_invoices === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Henüz Fatura Kaydı Yok</h3>
          <p className="text-gray-600">Fatura ekleyerek alışveriş analizinizi görebilirsiniz</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const topProducts = analysis.analysis.slice(0, 5);
  const chartData = topProducts.map(item => ({
    name: item.product_name.substring(0, 20) + '...',
    quantity: item.total_quantity,
    spent: item.total_spent
  }));

  const pieData = topProducts.map((item, index) => ({
    name: item.product_name.substring(0, 20),
    value: item.total_spent
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Fatura</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.total_invoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ürün Çeşidi</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.summary.total_products}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Harcama</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.summary.total_spent.toFixed(2)} TL</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Öneriler</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{recommendations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-900">
              <AlertCircle className="h-5 w-5 mr-2" />
              Sipariş Önerileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${getPriorityColor(rec.priority)}`}
                data-testid={`recommendation-${index}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{rec.product}</h4>
                  <Badge variant={rec.priority === 'critical' ? 'destructive' : 'default'}>
                    {rec.priority === 'critical' ? 'Acil' : rec.priority === 'high' ? 'Yüksek' : 'Orta'}
                  </Badge>
                </div>
                <p className="text-sm mb-2">{rec.message}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{rec.reason}</span>
                  <span className="font-semibold">Önerilen: {rec.suggested_quantity} adet</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Ürün Analizi</TabsTrigger>
          <TabsTrigger value="trends">Trendler</TabsTrigger>
          <TabsTrigger value="spending">Harcama Dağılımı</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>En Çok Alınan Ürünler</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#3b82f6" name="Miktar" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 space-y-2">
                {analysis.analysis.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    data-testid={`product-analysis-${index}`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(item.trend)}
                        <span className="font-medium">{item.product_name}</span>
                      </div>
                      {getTrendBadge(item.trend)}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.total_quantity} adet</p>
                      <p className="text-sm text-gray-600">{item.total_spent.toFixed(2)} TL</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Harcama Trendi</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="spent" stroke="#10b981" name="Harcama (TL)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spending">
          <Card>
            <CardHeader>
              <CardTitle>Harcama Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceAnalysis;
