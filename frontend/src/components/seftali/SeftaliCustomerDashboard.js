import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { ClipboardList, Truck, TrendingUp, Package, Calendar } from 'lucide-react';
import DraftView from './DraftView';
import WorkingCopyPage from './WorkingCopyPage';
import DeliveryApproval from './DeliveryApproval';
import StockDeclarationForm from './StockDeclarationForm';
import VarianceList from './VarianceList';

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
    { id: 'draft', label: 'Siparis Taslagi', icon: ClipboardList },
    { id: 'deliveries', label: 'Teslimat Onayi', icon: Truck, badge: stats.pendingDeliveries },
    { id: 'stock', label: 'Stok Bildirimi', icon: Package },
    { id: 'variance', label: 'Sapmalar', icon: TrendingUp, badge: stats.openVariance },
  ];

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
      default:
        return renderDashboard();
    }
  };

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
      <main className="max-w-lg mx-auto px-4 py-4">
        {renderContent()}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20" data-testid="bottom-nav">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (activeTab === 'working-copy' && tab.id === 'draft');
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
