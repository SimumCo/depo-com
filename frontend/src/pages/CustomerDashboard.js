import React, { useState } from 'react';
import Layout from '../components/Layout';
import { ShoppingCart, Package, MessageSquare, Calendar, TrendingUp, FileText, BarChart3, Heart, Tag, AlertTriangle } from 'lucide-react';
import OrderManagement from '../components/customer/OrderManagement';
import FavoritesModule from '../components/customer/FavoritesModule';
import ConsumptionAnalytics from '../components/customer/ConsumptionAnalytics';
import CampaignsModule from '../components/customer/CampaignsModule';
import FaultReportModule from '../components/customer/FaultReportModule';
import HistoricalRecords from '../components/customer/HistoricalRecords';
import { useAuth } from '../context/AuthContext';

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
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <FileText className="mr-2 h-4 w-4" />
            Faturalarım
          </TabsTrigger>
          <TabsTrigger value="consumption" data-testid="tab-consumption">
            <TrendingUp className="mr-2 h-4 w-4" />
            Fatura Bazlı Tüketim
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">Geri Bildirimler</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <ProductCatalog onOrderCreated={loadOrders} />
        </TabsContent>

        <TabsContent value="orders">
          <CustomerOrders orders={orders} onUpdate={loadOrders} />
        </TabsContent>

        <TabsContent value="invoices">
          <CustomerInvoices />
        </TabsContent>

        <TabsContent value="consumption">
          <InvoiceBasedConsumption />
        </TabsContent>

        <TabsContent value="feedback">
          <CustomerFeedback />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default CustomerDashboard;
