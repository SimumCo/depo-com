import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ShoppingCart, RotateCcw, FileText, Truck, TrendingUp,
  Package, BarChart3, Tag, AlertTriangle, Heart, LogOut,
  Home, Clock, ShoppingBag, Search, Bell, ChevronRight,
  Calendar, Box, Layers
} from 'lucide-react';
import DraftView from './DraftView';
import WorkingCopyPage from './WorkingCopyPage';
import DeliveryApproval from './DeliveryApproval';
import StockDeclarationForm from './StockDeclarationForm';
import VarianceList from './VarianceList';
import DeliveryHistory from './DeliveryHistory';
import ConsumptionAnalytics from '../customer/ConsumptionAnalytics';
import {
  SeftaliSidebar,
  SeftaliHeader,
  SeftaliPageHeader,
  SeftaliStatCard,
  SeftaliInfoCard,
  SeftaliButton,
  SeftaliEmptyState,
  SeftaliLoading,
  SeftaliBadge,
  SeftaliBottomNav,
  gradients,
} from './SeftaliDesignSystem';

const SeftaliCustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ 
    pendingDeliveries: 0, 
    hasDraft: false, 
    openVariance: 0,
    totalSuggested: 0,
    draftItems: []
  });
  const [profile, setProfile] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [dlvRes, draftRes, varRes, profRes] = await Promise.all([
        sfCustomerAPI.getPendingDeliveries(),
        sfCustomerAPI.getDraft(),
        sfCustomerAPI.getPendingVariance(),
        sfCustomerAPI.getProfile(),
      ]);
      const draftItems = draftRes.data?.data?.items || [];
      const totalSuggested = draftItems.reduce((s, i) => s + (i.suggested_qty || 0), 0);

      setStats({
        pendingDeliveries: (dlvRes.data?.data || []).length,
        hasDraft: draftItems.length > 0,
        openVariance: (varRes.data?.data || []).length,
        totalSuggested,
        draftItems,
      });
      setProfile(profRes.data?.data || null);
    } catch { /* silent */ }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, histRes] = await Promise.all([
        sfCustomerAPI.getConsumptionSummary(),
        sfCustomerAPI.getDeliveryHistory(),
      ]);
      const summary = (summaryRes.data?.data || []).sort((a, b) => b.avg_daily - a.avg_daily);
      const totalDaily = summary.reduce((s, i) => s + i.avg_daily, 0);
      const deliveries = histRes.data?.data || [];

      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      let last7 = 0;
      let last7Orders = 0;
      deliveries.forEach(d => {
        const dt = new Date(d.delivered_at);
        if (dt >= weekAgo) {
          last7 += (d.items || []).reduce((s, i) => s + i.qty, 0);
          last7Orders++;
        }
      });

      // Weekly chart data
      const weeklyChart = [];
      for (let w = 7; w >= 0; w--) {
        const wStart = new Date(now); wStart.setDate(now.getDate() - (w * 7 + 7));
        const wEnd = new Date(now); wEnd.setDate(now.getDate() - w * 7);
        let total = 0;
        deliveries.forEach(d => {
          const dt = new Date(d.delivered_at);
          if (dt >= wStart && dt < wEnd) {
            total += (d.items || []).reduce((s, i) => s + i.qty, 0);
          }
        });
        weeklyChart.push({ week: `H${8 - w}`, total });
      }

      const lastDlv = deliveries.length > 0 ? deliveries[0] : null;

      // Stock days calculation
      const draftItems = stats.draftItems || [];
      let stockDaysAvg = 0;
      let stockCount = 0;
      draftItems.forEach(di => {
        if (di.days_to_zero > 0 && di.days_to_zero < 999) {
          stockDaysAvg += di.days_to_zero;
          stockCount++;
        }
      });
      stockDaysAvg = stockCount > 0 ? stockDaysAvg / stockCount : 0;

      setDashData({
        summary, totalDaily, last7, last7Orders, weeklyChart, lastDlv, stockDaysAvg, deliveries,
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [stats.draftItems]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === 'dashboard') fetchDashboard(); }, [activeTab, fetchDashboard]);

  const routeDays = profile?.route_plan?.days || [];
  const dayLabels = { MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba', THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar' };
  const routeLabel = routeDays.map(d => dayLabels[d] || d).join(', ');

  // Sidebar navigation items
  const sidebarItems = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Home },
    { id: 'draft', label: 'Siparis', icon: ShoppingCart },
    { id: 'deliveries', label: 'Teslimat Onayi', icon: Truck, badge: stats.pendingDeliveries },
    { id: 'history', label: 'Faturalar', icon: FileText },
    { id: 'stock', label: 'Stok Bildirimi', icon: Box },
    { id: 'variance', label: 'Tuketim Sapmalari', icon: TrendingUp, badge: stats.openVariance },
    { id: 'consumption', label: 'Analizler', icon: BarChart3 },
    { id: 'campaigns', label: 'Kampanyalar', icon: Tag },
    { id: 'favorites', label: 'Favorilerim', icon: Heart },
  ];

  // Mobile bottom nav items
  const bottomNavItems = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Home },
    { id: 'draft', label: 'Siparis', icon: ShoppingCart },
    { id: 'deliveries', label: 'Teslimat', icon: Truck, badge: stats.pendingDeliveries },
    { id: 'history', label: 'Faturalar', icon: FileText },
    { id: 'consumption', label: 'Analiz', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'draft': return <DraftView onStartEdit={() => setActiveTab('working-copy')} />;
      case 'working-copy': return <WorkingCopyPage onBack={() => setActiveTab('draft')} onSubmitted={() => { setActiveTab('dashboard'); fetchStats(); }} />;
      case 'deliveries': return <DeliveryApproval />;
      case 'history': return <DeliveryHistory />;
      case 'stock': return <StockDeclarationForm />;
      case 'variance': return <VarianceList />;
      case 'consumption': return <ConsumptionAnalytics />;
      case 'campaigns': return renderCampaigns();
      case 'favorites': return renderFavorites();
      default: return renderDashboard();
    }
  };

  const renderCampaigns = () => (
    <div className="space-y-6">
      <SeftaliPageHeader title="Kampanyalar" subtitle="Ana Sayfa / Kampanyalar" />
      <SeftaliEmptyState icon={Tag} title="Aktif kampanya bulunmuyor" subtitle="Yeni kampanyalar icin takipte kalin" />
    </div>
  );

  const renderFavorites = () => (
    <div className="space-y-6">
      <SeftaliPageHeader title="Favorilerim" subtitle="Ana Sayfa / Favorilerim" />
      <SeftaliEmptyState icon={Heart} title="Favori urun eklemediniz" subtitle="Urunler sayfasindan favori ekleyebilirsiniz" />
    </div>
  );

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const renderDashboard = () => {
    const d = dashData || {};
    const topProducts = (d.summary || []).slice(0, 5);

    return (
      <div className="space-y-6" data-testid="customer-dashboard">
        {/* Page Header */}
        <SeftaliPageHeader 
          title={`Merhaba, ${profile?.name || user?.full_name || 'Market'}!`}
          subtitle={`Rut Gunleri: ${routeLabel || '—'}`}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SeftaliStatCard
            title="Son 7 Gun"
            value={d.last7 || 0}
            subtitle={`${d.last7Orders || 0} Siparis`}
            gradient={gradients.sky}
            onClick={() => setActiveTab('history')}
          />
          <SeftaliStatCard
            title="Gunluk Tuketim"
            value={Math.round(d.totalDaily || 0)}
            subtitle="Urun/gun"
            gradient={gradients.amber}
            onClick={() => setActiveTab('consumption')}
          />
          <SeftaliStatCard
            title="Onerilen Siparis"
            value={stats.totalSuggested || 0}
            subtitle="Adet"
            gradient={gradients.orange}
            onClick={() => setActiveTab('draft')}
          />
          <SeftaliStatCard
            title="Stokta Kalan"
            value={d.stockDaysAvg > 0 ? `${d.stockDaysAvg.toFixed(1)}` : '—'}
            subtitle="Gun"
            gradient={gradients.green}
            onClick={() => setActiveTab('stock')}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Weekly Chart */}
            <SeftaliInfoCard title="Haftalik Tuketim Trendi">
              {(d.weeklyChart || []).length > 0 ? (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.weeklyChart}>
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">Veri yok</p>
              )}
            </SeftaliInfoCard>

            {/* Top Products */}
            <SeftaliInfoCard title="En Cok Tuketilen Urunler">
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={p.product_id} className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center text-xs font-bold text-orange-600">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.product_name}</p>
                        <p className="text-xs text-slate-400">{p.avg_daily.toFixed(1)} urun/gun</p>
                      </div>
                      <div className="w-24 bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (p.avg_daily / (topProducts[0]?.avg_daily || 1)) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Veri yok</p>
              )}
            </SeftaliInfoCard>
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <SeftaliInfoCard title="Hizli Islemler">
              <div className="space-y-2">
                <button onClick={() => setActiveTab('draft')}
                  className="w-full flex items-center justify-between p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-slate-800">Yeni Siparis</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button onClick={() => setActiveTab('stock')}
                  className="w-full flex items-center justify-between p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Box className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-800">Stok Bildir</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button onClick={() => setActiveTab('deliveries')}
                  className="w-full flex items-center justify-between p-3 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors relative">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-sky-600" />
                    <span className="text-sm font-medium text-slate-800">Teslimat Onayla</span>
                  </div>
                  {stats.pendingDeliveries > 0 && (
                    <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {stats.pendingDeliveries}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </SeftaliInfoCard>

            {/* Last Order */}
            <SeftaliInfoCard title="Son Siparis">
              {d.lastDlv ? (
                <div>
                  <p className="text-xs text-slate-500">{formatDate(d.lastDlv.delivered_at)}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {(d.lastDlv.items || []).reduce((s, i) => s + i.qty, 0)} Adet
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{d.lastDlv.items?.length || 0} cesit urun</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Siparis gecmisi yok</p>
              )}
            </SeftaliInfoCard>

            {/* Alerts */}
            {stats.openVariance > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Tuketim Sapmasi</p>
                    <p className="text-xs text-amber-600 mt-0.5">{stats.openVariance} adet aciklama bekliyor</p>
                    <button onClick={() => setActiveTab('variance')} className="text-xs text-amber-700 font-medium mt-2 hover:underline">
                      Incele →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <SeftaliLoading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <SeftaliSidebar
          items={sidebarItems}
          activeTab={activeTab === 'working-copy' ? 'draft' : activeTab}
          setActiveTab={setActiveTab}
          onLogout={logout}
          userInitial={profile?.name?.charAt(0) || user?.full_name?.charAt(0) || 'M'}
          userName={profile?.name || user?.full_name || 'Musteri'}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-56">
        {/* Top Header - Desktop */}
        <div className="hidden lg:block">
          <SeftaliHeader
            searchPlaceholder="Urun ara..."
            userName={profile?.name || user?.full_name || 'Musteri'}
            userInitial={profile?.name?.charAt(0) || user?.full_name?.charAt(0) || 'M'}
            notificationCount={stats.pendingDeliveries}
          />
        </div>

        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍑</span>
            <span className="text-lg font-bold text-slate-900">Seftali</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" />
            Cikis
          </button>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6 pb-20 lg:pb-6">
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <SeftaliBottomNav
        items={bottomNavItems}
        activeTab={activeTab === 'working-copy' ? 'draft' : activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="h-16 lg:hidden" />
    </div>
  );
};

export default SeftaliCustomerDashboard;
