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
  const [activeModule, setActiveModule] = useState('orders');

  const modules = [
    { id: 'orders', name: 'Sipariş Yönetimi', icon: ShoppingCart, color: 'blue' },
    { id: 'history', name: 'Geçmiş Kayıtlar', icon: FileText, color: 'purple' },
    { id: 'consumption', name: 'Tüketim Analizi', icon: BarChart3, color: 'green' },
    { id: 'campaigns', name: 'Kampanyalar', icon: Tag, color: 'orange' },
    { id: 'fault', name: 'Arıza Bildirimleri', icon: AlertTriangle, color: 'red' },
    { id: 'favorites', name: 'Favorilerim', icon: Heart, color: 'pink' }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'orders':
        return <OrderManagement />;
      case 'history':
        return <HistoricalRecords />;
      case 'consumption':
        return <ConsumptionAnalytics />;
      case 'campaigns':
        return <CampaignsModule />;
      case 'fault':
        return <FaultReportModule />;
      case 'favorites':
        return <FavoritesModule />;
      default:
        return <OrderManagement />;
    }
  };

  return (
    <Layout title="Müşteri Dashboard">
      <div className="space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Hoş Geldiniz, {user?.full_name || 'Müşteri'}!</h1>
          <p className="text-blue-100">Sipariş yönetimi ve tüketim analizi için dashboard'unuzu kullanın</p>
        </div>

        {/* Module Navigation - Widget Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule === module.id;
            
            return (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isActive
                    ? `border-${module.color}-500 bg-${module.color}-50 shadow-md`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                }`}
              >
                <Icon className={`w-8 h-8 mx-auto mb-2 ${
                  isActive ? `text-${module.color}-600` : 'text-gray-600'
                }`} />
                <div className={`text-sm font-medium text-center ${
                  isActive ? `text-${module.color}-900` : 'text-gray-900'
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

export default CustomerDashboard;
