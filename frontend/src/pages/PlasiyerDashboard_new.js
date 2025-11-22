import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import ProductCatalog from '../components/ProductCatalog';
import CustomerOrders from '../components/CustomerOrders';
import api, { ordersAPI } from '../services/api';
import { 
  MapPin, Users, ShoppingCart, Package, 
  Calendar, TrendingUp, Map, ListChecks
} from 'lucide-react';

const PlasiyerDashboard = () => {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState('routes');
  const [routes, setRoutes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    todayOrders: 0,
    weeklyOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [routesRes, ordersRes] = await Promise.all([
        api.get(`/sales-routes/agent/${user.id}`),
        ordersAPI.getAll()
      ]);
      
      setRoutes(routesRes.data || []);
      setOrders(ordersRes.data || []);
      
      setStats({
        totalCustomers: routesRes.data?.length || 0,
        todayOrders: ordersRes.data?.filter(o => {
          const today = new Date().toDateString();
          return new Date(o.created_at).toDateString() === today;
        }).length || 0,
        weeklyOrders: ordersRes.data?.length || 0
      });
    } catch (error) {
      console.error('Dashboard verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { id: 'routes', name: 'Rotalarım', icon: MapPin, color: 'blue' },
    { id: 'customers', name: 'Müşterilerim', icon: Users, color: 'green' },
    { id: 'orders', name: 'Siparişler', icon: ShoppingCart, color: 'purple' },
    { id: 'products', name: 'Ürün Kataloğu', icon: Package, color: 'orange' }
  ];

  const colorClasses = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', textDark: 'text-blue-900' },
    green: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-600', textDark: 'text-green-900' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', textDark: 'text-purple-900' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', textDark: 'text-orange-900' }
  };

  const dayTranslations = {
    monday: 'Pazartesi', tuesday: 'Salı', wednesday: 'Çarşamba',
    thursday: 'Perşembe', friday: 'Cuma', saturday: 'Cumartesi', sunday: 'Pazar'
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'routes':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Teslimat Rotalarım</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : routes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz rota atanmamış</p>
            ) : (
              <div className="space-y-4">
                {routes.map((route) => (
                  <div key={route.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{route.customer_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          {route.location || 'Konum bilgisi yok'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Teslimat Günü: <span className="font-medium">{dayTranslations[route.delivery_day]}</span>
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        route.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {route.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'customers':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Müşteri Listesi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.map((route) => (
                <div key={route.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">{route.customer_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{route.location}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Teslimat: {dayTranslations[route.delivery_day]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'orders':
        return <CustomerOrders orders={orders} onUpdate={loadDashboardData} />;
      case 'products':
        return <ProductCatalog onOrderCreated={loadDashboardData} />;
      default:
        return null;
    }
  };

  return (
    <Layout title="Plasiyer Dashboard">
      <div className="space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Hoş Geldiniz, {user?.full_name || 'Plasiyer'}!</h1>
          <p className="text-blue-100">Rota ve sipariş yönetimi için plasiyer panelini kullanın</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Müşteri</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bugünkü Sipariş</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Haftalık Sipariş</p>
                <p className="text-2xl font-bold text-gray-900">{stats.weeklyOrders}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Module Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule === module.id;
            const colors = colorClasses[module.color];
            
            return (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isActive
                    ? `${colors.border} ${colors.bg} shadow-md`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                }`}
              >
                <Icon className={`w-8 h-8 mx-auto mb-2 ${
                  isActive ? colors.text : 'text-gray-600'
                }`} />
                <div className={`text-sm font-medium text-center ${
                  isActive ? colors.textDark : 'text-gray-900'
                }`}>
                  {module.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Module Content */}
        <div className="animate-fadeIn">
          {renderModule()}
        </div>
      </div>
    </Layout>
  );
};

export default PlasiyerDashboard;
