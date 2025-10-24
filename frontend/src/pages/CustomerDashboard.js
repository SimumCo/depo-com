import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ordersAPI, dashboardAPI } from '../services/api';
import { ShoppingCart, Package, MessageSquare, Calendar } from 'lucide-react';
import ProductCatalog from '../components/ProductCatalog';
import CustomerOrders from '../components/CustomerOrders';
import CustomerFeedback from '../components/CustomerFeedback';
import InvoiceUpload from '../components/InvoiceUpload';
import InvoiceAnalysis from '../components/InvoiceAnalysis';
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
          <TabsTrigger value="invoices" data-testid="tab-invoices">Fatura Analizi</TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">Geri Bildirimler</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <ProductCatalog onOrderCreated={loadOrders} />
        </TabsContent>

        <TabsContent value="orders">
          <CustomerOrders orders={orders} onUpdate={loadOrders} />
        </TabsContent>

        <TabsContent value="invoices">
          <div className="space-y-6">
            <div className="flex justify-end">
              <InvoiceUpload onInvoiceCreated={() => window.location.reload()} />
            </div>
            <InvoiceAnalysis />
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          <CustomerFeedback />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default CustomerDashboard;
