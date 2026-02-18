import React, { useState } from 'react';
import Layout from '../components/Layout';
import { ShoppingCart, Package, MessageSquare, Calendar, TrendingUp, FileText, BarChart3, Heart, Tag, AlertTriangle, Truck, PackageCheck } from 'lucide-react';
import OrderManagement from '../components/customer/OrderManagement';
import FavoritesModule from '../components/customer/FavoritesModule';
import ConsumptionAnalytics from '../components/customer/ConsumptionAnalytics';
import CampaignsModule from '../components/customer/CampaignsModule';
import FaultReportModule from '../components/customer/FaultReportModule';
import HistoricalRecords from '../components/customer/HistoricalRecords';
import StockDeclaration from '../components/customer/StockDeclaration';
import PendingDeliveries from '../components/customer/PendingDeliveries';
import { useAuth } from '../context/AuthContext';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState('orders');

  const modules = [
    { id: 'orders', name: 'Sipariş Yönetimi', icon: ShoppingCart, color: 'blue' },
    { id: 'deliveries', name: 'Teslimat Onayı', icon: Truck, color: 'indigo' },
    { id: 'stock', name: 'Stok Bildirimi', icon: PackageCheck, color: 'cyan' },
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
      case 'deliveries':
        return <PendingDeliveries />;
      case 'stock':
        return <StockDeclaration />;
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule === module.id;
            
            // Static color classes for Tailwind
            const colorClasses = {
              blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', textDark: 'text-blue-900' },
              indigo: { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-600', textDark: 'text-indigo-900' },
              cyan: { border: 'border-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-600', textDark: 'text-cyan-900' },
              purple: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', textDark: 'text-purple-900' },
              green: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-600', textDark: 'text-green-900' },
              orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', textDark: 'text-orange-900' },
              red: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600', textDark: 'text-red-900' },
              pink: { border: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-600', textDark: 'text-pink-900' }
            };
            
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

export default CustomerDashboard;
