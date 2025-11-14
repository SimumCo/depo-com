import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import ProductCatalog from '../components/ProductCatalog';
import CustomerOrders from '../components/CustomerOrders';
import { toast } from 'sonner';
import api from '../services/api';
import { 
  MapPin, Users, ShoppingCart, Package, 
  Calendar, TrendingUp, Clock 
} from 'lucide-react';

/**
 * Plasiyer (Sales Agent) Dashboard
 * Özellikleri:
 * - Rotalarını görür
 * - Müşterilerine sipariş girebilir
 * - Kendi siparişlerini takip eder
 * - Basit envanter görüntüler
 */
const PlasiyerDashboard = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    todayOrders: 0,
    weeklyOrders: 0,
    activeRoute: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Plasiyer rotalarını yükle
      const routesResponse = await api.get('/sales-routes/my-routes');
      setRoutes(routesResponse.data || []);

      // Plasiyer siparişlerini yükle
      const ordersResponse = await api.get('/orders/my-orders');
      setOrders(ordersResponse.data || []);

      // İstatistikleri hesapla
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = ordersResponse.data.filter(order => 
        order.created_at?.startsWith(today)
      ).length;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyOrders = ordersResponse.data.filter(order => 
        new Date(order.created_at) >= weekAgo
      ).length;

      // Bugünkü rotayı bul
      const dayOfWeek = new Date().toLocaleDateString('tr-TR', { weekday: 'long' });
      const activeRoute = routesResponse.data.find(route => 
        route.day_of_week?.toLowerCase() === dayOfWeek.toLowerCase()
      );

      setStats({
        totalCustomers: routesResponse.data.length,
        todayOrders,
        weeklyOrders,
        activeRoute
      });
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu');
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await api.get('/orders/my-orders');
      setOrders(response.data || []);
    } catch (error) {
      toast.error('Siparişler yüklenemedi');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plasiyer Paneli</h1>
            <p className="text-gray-600 mt-1">Hoş geldiniz, {user?.full_name}</p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            <MapPin className="mr-2 h-5 w-5" />
            Plasiyer
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rotamdaki Müşteriler</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">Toplam müşteri sayısı</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bugünkü Siparişler</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayOrders}</div>
              <p className="text-xs text-muted-foreground">Bugün alınan sipariş</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Haftalık Siparişler</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weeklyOrders}</div>
              <p className="text-xs text-muted-foreground">Son 7 gün</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bugünkü Rota</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.activeRoute ? (
                <>
                  <div className="text-2xl font-bold">Aktif</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeRoute.customer_count || 0} müşteri ziyareti
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-400">-</div>
                  <p className="text-xs text-muted-foreground">Bugün rota yok</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bugünkü Rota Bilgisi */}
        {stats.activeRoute && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Bugünkü Rotam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Gün:</span> {stats.activeRoute.day_of_week}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Müşteri Sayısı:</span> {stats.activeRoute.customer_count || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Bugün ziyaret edilecek müşterilere sipariş girebilirsiniz.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="catalog" className="space-y-4">
          <TabsList>
            <TabsTrigger value="catalog" data-testid="tab-catalog">
              <Package className="mr-2 h-4 w-4" />
              Ürün Kataloğu
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Siparişlerim
            </TabsTrigger>
            <TabsTrigger value="routes" data-testid="tab-routes">
              <MapPin className="mr-2 h-4 w-4" />
              Rotalarım
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog">
            <ProductCatalog onOrderCreated={loadOrders} />
          </TabsContent>

          <TabsContent value="orders">
            <CustomerOrders orders={orders} onUpdate={loadOrders} />
          </TabsContent>

          <TabsContent value="routes">
            <Card>
              <CardHeader>
                <CardTitle>Haftalık Rotalarım</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Hangi gün hangi müşterilere gidiyorsunuz
                </p>
              </CardHeader>
              <CardContent>
                {routes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Henüz rota atanmamış</p>
                    <p className="text-sm">Yöneticinizle iletişime geçin</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(day => {
                      const dayRoutes = routes.filter(r => 
                        r.day_of_week?.toLowerCase() === day.toLowerCase()
                      );
                      
                      return (
                        <div key={day} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg">{day}</h3>
                            <Badge variant={dayRoutes.length > 0 ? 'default' : 'secondary'}>
                              {dayRoutes.length} müşteri
                            </Badge>
                          </div>
                          {dayRoutes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {dayRoutes.map((route, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                                  <Users className="h-4 w-4 text-gray-600" />
                                  <span>{route.customer_name || route.customer_id}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Rota yok</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default PlasiyerDashboard;
