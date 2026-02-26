// Müşteri Dashboard - Ana Bileşen (Refactored)
import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../services/seftaliApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ShoppingCart, FileText, Truck, TrendingUp, Package, BarChart3, Tag, 
  AlertTriangle, Heart, LogOut, Home, Box, ChevronRight
} from 'lucide-react';

// Import Layout Components
import {
  Sidebar, Header, MobileHeader, BottomNav,
  PageHeader, StatCard, InfoCard, EmptyState, Loading, QuickAction,
  gradients
} from '../components/ui/DesignSystem';

// Import Shared Components
import DraftView from '../components/shared/DraftView';
import WorkingCopyPage from '../components/shared/WorkingCopyPage';
import DeliveryApproval from '../components/shared/DeliveryApproval';
import StockDeclarationForm from '../components/shared/StockDeclarationForm';
import VarianceList from '../components/shared/VarianceList';
import DeliveryHistory from '../components/shared/DeliveryHistory';
import ConsumptionAnalytics from '../components/customer/ConsumptionAnalytics';

// Day label translations
const dayLabels = { 
  MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba', 
  THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar' 
};

// Format date helper
const formatDate = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

const CustomerDashboard = () => {
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

  // Fetch stats
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

  // Fetch dashboard data
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
      let last7 = 0, last7Orders = 0;
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
      const draftItems = stats.draftItems || [];
      let stockDaysAvg = 0, stockCount = 0;
      draftItems.forEach(di => {
        if (di.days_to_zero > 0 && di.days_to_zero < 999) {
          stockDaysAvg += di.days_to_zero;
          stockCount++;
        }
      });
      stockDaysAvg = stockCount > 0 ? stockDaysAvg / stockCount : 0;

      setDashData({ summary, totalDaily, last7, last7Orders, weeklyChart, lastDlv, stockDaysAvg, deliveries });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [stats.draftItems]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === 'dashboard') fetchDashboard(); }, [activeTab, fetchDashboard]);

  // Route days
  const routeDays = profile?.route_plan?.days || [];
  const routeLabel = routeDays.map(d => dayLabels[d] || d).join(', ');

  // Navigation items
  const sidebarItems = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Home },
    { id: 'draft', label: 'Siparis', icon: ShoppingCart },
    { id: 'deliveries', label: 'Teslimat Onayi', icon: Truck, badge: stats.pendingDeliveries },
    { id: 'history', label: 'Faturalar', icon: FileText },
    { id: 'consumption', label: 'Analizler', icon: BarChart3 },
    { id: 'campaigns', label: 'Kampanyalar', icon: Tag },
    { id: 'favorites', label: 'Favorilerim', icon: Heart },
  ];

  const bottomNavItems = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Home },
    { id: 'draft', label: 'Siparis', icon: ShoppingCart },
    { id: 'deliveries', label: 'Teslimat', icon: Truck, badge: stats.pendingDeliveries },
    { id: 'history', label: 'Faturalar', icon: FileText },
    { id: 'consumption', label: 'Analiz', icon: BarChart3 },
  ];

  // Render content
  const renderContent = () => {
    switch (activeTab) {
      case 'draft': return <DraftView onStartEdit={() => setActiveTab('working-copy')} />;
      case 'working-copy': return <WorkingCopyPage onBack={() => setActiveTab('draft')} onSubmitted={() => { setActiveTab('dashboard'); fetchStats(); }} />;
      case 'deliveries': return <DeliveryApproval />;
      case 'history': return <DeliveryHistory />;
      case 'consumption': return <ConsumptionAnalytics />;
      case 'campaigns': return <PlaceholderPage icon={Tag} title="Kampanyalar" subtitle="Aktif kampanya bulunmuyor" />;
      case 'favorites': return <PlaceholderPage icon={Heart} title="Favorilerim" subtitle="Favori urun eklemediniz" />;
      default: return <DashboardContent dashData={dashData} stats={stats} profile={profile} user={user} routeLabel={routeLabel} setActiveTab={setActiveTab} />;
    }
  };

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loading size="md" />
      </div>
    );
  }

  const userInitial = profile?.name?.charAt(0) || user?.full_name?.charAt(0) || 'M';
  const userName = profile?.name || user?.full_name || 'Musteri';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar
          items={sidebarItems}
          activeTab={activeTab === 'working-copy' ? 'draft' : activeTab}
          setActiveTab={setActiveTab}
          onLogout={logout}
          userInitial={userInitial}
          userName={userName}
          title="Musteri Panel"
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-56">
        {/* Header - Desktop */}
        <div className="hidden lg:block">
          <Header
            searchPlaceholder="Urun ara..."
            userName={userName}
            userInitial={userInitial}
            notificationCount={stats.pendingDeliveries}
          />
        </div>

        {/* Header - Mobile */}
        <MobileHeader onLogout={logout} />

        {/* Page Content */}
        <div className="p-4 lg:p-6 pb-20 lg:pb-6">
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <BottomNav
        items={bottomNavItems}
        activeTab={activeTab === 'working-copy' ? 'draft' : activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="h-16 lg:hidden" />
    </div>
  );
};

// Dashboard Content Component
const DashboardContent = ({ dashData, stats, profile, user, routeLabel, setActiveTab }) => {
  const d = dashData || {};
  const topProducts = (d.summary || []).slice(0, 5);

  return (
    <div className="space-y-6" data-testid="customer-dashboard">
      <PageHeader 
        title={`Merhaba, ${profile?.name || user?.full_name || 'Market'}!`}
        subtitle={`Rut Gunleri: ${routeLabel || '—'}`}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Son 7 Gun" value={d.last7 || 0} subtitle={`${d.last7Orders || 0} Siparis`} gradient={gradients.sky} onClick={() => setActiveTab('history')} />
        <StatCard title="Gunluk Tuketim" value={Math.round(d.totalDaily || 0)} subtitle="Urun/gun" gradient={gradients.amber} onClick={() => setActiveTab('consumption')} />
        <StatCard title="Onerilen Siparis" value={stats.totalSuggested || 0} subtitle="Adet" gradient={gradients.orange} onClick={() => setActiveTab('draft')} />
        <StatCard title="Stokta Kalan" value={d.stockDaysAvg > 0 ? `${d.stockDaysAvg.toFixed(1)}` : '—'} subtitle="Gun" gradient={gradients.green} onClick={() => setActiveTab('stock')} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <WeeklyChart data={d.weeklyChart} />
          <TopProducts products={topProducts} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <QuickActionsCard setActiveTab={setActiveTab} stats={stats} />
          <LastOrderCard lastDlv={d.lastDlv} />
          {stats.openVariance > 0 && <VarianceAlert count={stats.openVariance} onClick={() => setActiveTab('variance')} />}
        </div>
      </div>
    </div>
  );
};

// Weekly Chart Component
const WeeklyChart = ({ data }) => (
  <InfoCard title="Haftalik Tuketim Trendi">
    {(data || []).length > 0 ? (
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
  </InfoCard>
);

// Top Products Component
const TopProducts = ({ products }) => (
  <InfoCard title="En Cok Tuketilen Urunler">
    {products.length > 0 ? (
      <div className="space-y-3">
        {products.map((p, i) => (
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
                style={{ width: `${Math.min(100, (p.avg_daily / (products[0]?.avg_daily || 1)) * 100)}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-slate-400 text-center py-4">Veri yok</p>
    )}
  </InfoCard>
);

// Quick Actions Card
const QuickActionsCard = ({ setActiveTab, stats }) => (
  <InfoCard title="Hizli Islemler">
    <div className="space-y-2">
      <QuickAction icon={ShoppingCart} label="Yeni Siparis" onClick={() => setActiveTab('draft')} color="orange" />
      <QuickAction icon={Box} label="Stok Bildir" onClick={() => setActiveTab('stock')} color="emerald" />
      <QuickAction icon={Truck} label="Teslimat Onayla" onClick={() => setActiveTab('deliveries')} color="sky" badge={stats.pendingDeliveries} />
    </div>
  </InfoCard>
);

// Last Order Card
const LastOrderCard = ({ lastDlv }) => (
  <InfoCard title="Son Siparis">
    {lastDlv ? (
      <div>
        <p className="text-xs text-slate-500">{formatDate(lastDlv.delivered_at)}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">
          {(lastDlv.items || []).reduce((s, i) => s + i.qty, 0)} Adet
        </p>
        <p className="text-xs text-slate-400 mt-1">{lastDlv.items?.length || 0} cesit urun</p>
      </div>
    ) : (
      <p className="text-sm text-slate-400">Siparis gecmisi yok</p>
    )}
  </InfoCard>
);

// Variance Alert
const VarianceAlert = ({ count, onClick }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-800">Tuketim Sapmasi</p>
        <p className="text-xs text-amber-600 mt-0.5">{count} adet aciklama bekliyor</p>
        <button onClick={onClick} className="text-xs text-amber-700 font-medium mt-2 hover:underline">
          Incele →
        </button>
      </div>
    </div>
  </div>
);

// Placeholder Page
const PlaceholderPage = ({ icon: Icon, title, subtitle }) => (
  <div className="space-y-6">
    <PageHeader title={title} subtitle={`Ana Sayfa / ${title}`} />
    <EmptyState icon={Icon} title={subtitle} />
  </div>
);

export default CustomerDashboard;
