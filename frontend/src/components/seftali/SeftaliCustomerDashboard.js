import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { ClipboardList, Truck, TrendingUp, Package, Calendar, MoreHorizontal, FileText, BarChart3, Tag, AlertTriangle, Heart, ArrowLeft } from 'lucide-react';
import DraftView from './DraftView';
import WorkingCopyPage from './WorkingCopyPage';
import DeliveryApproval from './DeliveryApproval';
import StockDeclarationForm from './StockDeclarationForm';
import VarianceList from './VarianceList';
import DeliveryHistory from './DeliveryHistory';
import OrderManagement from '../customer/OrderManagement';
import FavoritesModule from '../customer/FavoritesModule';
import ConsumptionAnalytics from '../customer/ConsumptionAnalytics';
import CampaignsModule from '../customer/CampaignsModule';
import FaultReportModule from '../customer/FaultReportModule';
import HistoricalRecords from '../customer/HistoricalRecords';

const SeftaliCustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ pendingDeliveries: 0, hasDraft: false, openVariance: 0 });
  const [profile, setProfile] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const [dlvRes, draftRes, varRes, profRes] = await Promise.all([
        sfCustomerAPI.getPendingDeliveries(),
        sfCustomerAPI.getDraft(),
        sfCustomerAPI.getPendingVariance(),
        sfCustomerAPI.getProfile(),
      ]);
      setStats({
        pendingDeliveries: (dlvRes.data?.data || []).length,
        hasDraft: (draftRes.data?.data?.items || []).length > 0,
        openVariance: (varRes.data?.data || []).length,
      });
      setProfile(profRes.data?.data || null);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const routeDays = profile?.route_plan?.days || [];
  const dayLabels = { MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba', THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar' };
  const routeLabel = routeDays.map(d => dayLabels[d] || d).join(', ');

  const tabs = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Package },
    { id: 'draft', label: 'Taslak', icon: ClipboardList },
    { id: 'deliveries', label: 'Teslimat', icon: Truck, badge: stats.pendingDeliveries },
    { id: 'history', label: 'Faturalar', icon: FileText },
    { id: 'more', label: 'Daha Fazla', icon: MoreHorizontal },
  ];

  const extraModules = [
    { id: 'variance', name: 'Tuketim Sapmalari', icon: TrendingUp, color: 'text-amber-600 bg-amber-50', badge: stats.openVariance },
    { id: 'history', name: 'Gecmis Kayitlar', icon: FileText, color: 'text-purple-600 bg-purple-50' },
    { id: 'consumption', name: 'Tuketim Analizi', icon: BarChart3, color: 'text-green-600 bg-green-50' },
    { id: 'campaigns', name: 'Kampanyalar', icon: Tag, color: 'text-orange-600 bg-orange-50' },
    { id: 'fault', name: 'Ariza Bildirimleri', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { id: 'favorites', name: 'Favorilerim', icon: Heart, color: 'text-pink-600 bg-pink-50' },
    { id: 'orders_legacy', name: 'Siparis Yonetimi', icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
  ];

  const isExtraTab = ['variance', 'history', 'consumption', 'campaigns', 'fault', 'favorites', 'orders_legacy'].includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'draft':
        return <DraftView onStartEdit={() => setActiveTab('working-copy')} />;
      case 'working-copy':
        return <WorkingCopyPage onBack={() => setActiveTab('draft')} onSubmitted={() => { setActiveTab('dashboard'); fetchStats(); }} />;
      case 'deliveries':
        return <DeliveryApproval />;
      case 'stock':
        return <StockDeclarationForm />;
      case 'variance':
        return <VarianceList />;
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
      case 'orders_legacy':
        return <OrderManagement />;
      case 'more':
        return renderMoreMenu();
      default:
        return renderDashboard();
    }
  };

  const renderMoreMenu = () => (
    <div data-testid="more-menu">
      <p className="text-sm font-medium text-slate-600 mb-3">Ek Moduller</p>
      <div className="grid grid-cols-2 gap-3">
        {extraModules.map(mod => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveTab(mod.id)}
              className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:border-sky-300 hover:shadow-sm transition-all relative"
              data-testid={`more-${mod.id}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${mod.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{mod.name}</p>
              {mod.badge > 0 && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{mod.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-4" data-testid="seftali-home">
      {/* Next route day */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 flex items-center gap-3">
        <Calendar className="w-8 h-8 text-sky-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-sky-900">Sonraki Rota Gunu</p>
          <p className="text-xs text-sky-700">{routeLabel || 'Rota bilgisi yok'}</p>
        </div>
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveTab('draft')}
          className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:border-sky-300 hover:shadow-sm transition-all"
          data-testid="card-draft"
        >
          <ClipboardList className="w-6 h-6 text-sky-600 mb-2" />
          <p className="text-sm font-semibold text-slate-800">Siparis Taslagi</p>
          <p className="text-xs text-slate-500 mt-1">{stats.hasDraft ? 'Taslak mevcut' : 'Henuz taslak yok'}</p>
        </button>

        <button
          onClick={() => setActiveTab('deliveries')}
          className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:border-sky-300 hover:shadow-sm transition-all relative"
          data-testid="card-deliveries"
        >
          <Truck className="w-6 h-6 text-emerald-600 mb-2" />
          <p className="text-sm font-semibold text-slate-800">Teslimat Onayi</p>
          <p className="text-xs text-slate-500 mt-1">{stats.pendingDeliveries} bekleyen</p>
          {stats.pendingDeliveries > 0 && (
            <span className="absolute top-3 right-3 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{stats.pendingDeliveries}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('variance')}
          className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:border-sky-300 hover:shadow-sm transition-all relative"
          data-testid="card-variance"
        >
          <TrendingUp className="w-6 h-6 text-amber-600 mb-2" />
          <p className="text-sm font-semibold text-slate-800">Tuketim Sapmalari</p>
          <p className="text-xs text-slate-500 mt-1">{stats.openVariance} acik</p>
          {stats.openVariance > 0 && (
            <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{stats.openVariance}</span>
          )}
        </button>
      </div>

      {/* Stock declaration shortcut */}
      <button
        onClick={() => setActiveTab('stock')}
        className="w-full bg-white border border-slate-200 rounded-lg p-4 text-left hover:border-sky-300 hover:shadow-sm transition-all flex items-center gap-3"
        data-testid="card-stock"
      >
        <Package className="w-6 h-6 text-teal-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-800">Stok Bildirimi</p>
          <p className="text-xs text-slate-500">Mevcut stok durumunuzu bildirin</p>
        </div>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Seftali</h1>
          <p className="text-xs text-slate-500">{user?.full_name || 'Musteri'}</p>
        </div>
        <button onClick={logout} className="text-xs text-slate-500 hover:text-red-600 transition-colors" data-testid="logout-btn">Cikis</button>
      </header>

      {/* Content */}
      <main className={`mx-auto px-4 py-4 ${isExtraTab ? 'max-w-4xl' : 'max-w-lg'}`}>
        {isExtraTab && (
          <button onClick={() => setActiveTab('more')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4" data-testid="back-to-more">
            <ArrowLeft className="w-4 h-4" /> Daha Fazla
          </button>
        )}
        {renderContent()}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20" data-testid="bottom-nav">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (activeTab === 'working-copy' && tab.id === 'draft') || (isExtraTab && tab.id === 'more');
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-2 relative transition-colors ${isActive ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                data-testid={`nav-${tab.id}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding for nav */}
      <div className="h-16" />
    </div>
  );
};

export default SeftaliCustomerDashboard;
