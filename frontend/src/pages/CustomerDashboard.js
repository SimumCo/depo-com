import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ordersAPI, dashboardAPI } from '../services/api';
import { ShoppingCart, Package, MessageSquare, Calendar, TrendingUp, FileText, BarChart3 } from 'lucide-react';
import ProductCatalog from '../components/ProductCatalog';
import CustomerOrders from '../components/CustomerOrders';
import CustomerFeedback from '../components/CustomerFeedback';
import CustomerConsumption from '../components/CustomerConsumption';
import CustomerInvoices from '../components/CustomerInvoices';
import CustomerConsumptionStats from '../components/CustomerConsumptionStats';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  const dayTranslations = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
    saturday: 'Cumartesi',
    sunday: 'Pazar'
  };

  useEffect(() => {
    loadOrders();
    loadDeliveryInfo();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await ordersAPI.getAll();
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryInfo = async () => {
    try {
      const response = await api.get(`/sales-routes/customer/${user.id}`);
      setDeliveryInfo(response.data);
    } catch (error) {
      console.error('Failed to load delivery info:', error);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'approved').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

  return (
    <Layout title="Müşteri Paneli">
      {/* Delivery Day Info */}
      {deliveryInfo && deliveryInfo.delivery_day && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-blue-600" />
              <div>
                <div className="text-sm text-blue-600 font-medium">Teslimat Günü</div>
                <div className="text-lg font-bold text-blue-800">
                  {dayTranslations[deliveryInfo.delivery_day]}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Her gün sipariş verebilirsiniz. Siparişleriniz {dayTranslations[deliveryInfo.delivery_day]} günü teslim edilir.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card data-testid="stat-total-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Siparişler</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Siparişler</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingOrders}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-delivered">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teslim Edilenler</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{deliveredOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog" data-testid="tab-catalog">Ürün Kataloğu</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-my-orders">Siparişlerim</TabsTrigger>
          <TabsTrigger value="consumption" data-testid="tab-consumption">
            <TrendingUp className="mr-2 h-4 w-4" />
            Sarfiyat Analizi
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">Geri Bildirimler</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <ProductCatalog onOrderCreated={loadOrders} />
        </TabsContent>

        <TabsContent value="orders">
          <CustomerOrders orders={orders} onUpdate={loadOrders} />
        </TabsContent>

        <TabsContent value="consumption">
          <CustomerConsumption customerId={user.id} />
        </TabsContent>

        <TabsContent value="feedback">
          <CustomerFeedback />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default CustomerDashboard;
