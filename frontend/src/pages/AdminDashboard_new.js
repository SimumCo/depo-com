import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Package, Warehouse, TrendingUp, Users, ShoppingCart,
  BarChart3, FileText, Tag, Settings, DollarSign
} from 'lucide-react';
import { analyticsAPI } from '../services/api';
import SalesAnalytics from '../components/admin/SalesAnalytics';
import PerformancePanel from '../components/admin/PerformancePanel';
import StockControl from '../components/admin/StockControl';
import WarehouseManagement from '../components/admin/WarehouseManagement';
import CampaignManagement from '../components/admin/CampaignManagement';
import ReportsModule from '../components/admin/ReportsModule';
import ProductManagement from '../components/ProductManagementNew';
import UsersManagement from '../components/UsersManagement';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState('analytics');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await analyticsAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { id: 'analytics', name: 'Satış Analizi', icon: BarChart3, color: 'blue' },
    { id: 'performance', name: 'Performans', icon: TrendingUp, color: 'green' },
    { id: 'products', name: 'Ürün Yönetimi', icon: Package, color: 'purple' },
    { id: 'stock', name: 'Stok Kontrolü', icon: Warehouse, color: 'orange' },
    { id: 'users', name: 'Kullanıcılar', icon: Users, color: 'indigo' },
    { id: 'campaigns', name: 'Kampanyalar', icon: Tag, color: 'pink' },
    { id: 'warehouse', name: 'Depo Yönetimi', icon: Warehouse, color: 'cyan' },
    { id: 'reports', name: 'Raporlar', icon: FileText, color: 'red' }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'analytics':
        return <SalesAnalytics />;
      case 'performance':
        return <PerformancePanel />;
      case 'products':
        return <ProductManagement />;
      case 'stock':
        return <StockControl />;
      case 'users':
        return <UsersManagement />;
      case 'campaigns':
        return <CampaignManagement />;
      case 'warehouse':
        return <WarehouseManagement />;
      case 'reports':
        return <ReportsModule />;
      default:
        return <SalesAnalytics />;
    }
  };

  const colorClasses = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', textDark: 'text-blue-900' },
    green: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-600', textDark: 'text-green-900' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', textDark: 'text-purple-900' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', textDark: 'text-orange-900' },
    indigo: { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-600', textDark: 'text-indigo-900' },
    pink: { border: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-600', textDark: 'text-pink-900' },
    cyan: { border: 'border-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-600', textDark: 'text-cyan-900' },
    red: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600', textDark: 'text-red-900' }
  };

  return (
    <Layout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Hoş Geldiniz, {user?.full_name || 'Admin'}!</h1>
          <p className="text-indigo-100">Sistem yönetimi ve analiz için admin panelini kullanın</p>
        </div>

        {/* Stats Cards */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Toplam Ürün</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_products || 0}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Kullanıcılar</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_users || 0}</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Siparişler</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_orders || 0}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Kampanyalar</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_campaigns || 0}</p>
                </div>
                <Tag className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Toplam Satış</p>
                  <p className="text-2xl font-bold text-gray-900">₺{(stats.total_sales || 0).toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-indigo-500" />
              </div>
            </div>
          </div>
        )}

        {/* Module Navigation - Widget Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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

export default AdminDashboard;
