import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import {
  ShoppingCart, RotateCcw, FileText, ClipboardList, Truck, TrendingUp,
  Package, BarChart3, Tag, AlertTriangle, Heart, ArrowLeft, LogOut,
  Home, MoreHorizontal, Clock, ShoppingBag
} from 'lucide-react';
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
  const [dashData, setDashData] = useState(null);

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
      const [summaryRes, histRes] = await Promise.all([
        sfCustomerAPI.getConsumptionSummary(),
        sfCustomerAPI.getDeliveryHistory(),
      ]);
      const summary = (summaryRes.data?.data || []).sort((a, b) => b.avg_daily - a.avg_daily);
      const totalDaily = summary.reduce((s, i) => s + i.avg_daily, 0);
      const deliveries = histRes.data?.data || [];

      // Last 7 days consumption
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

      // Weekly chart data (last 8 weeks)
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

      // Last delivery
      const lastDlv = deliveries.length > 0 ? deliveries[0] : null;

      // Stock days remaining (estimated)
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
        summary, totalDaily, last7, last7Orders, weeklyChart, lastDlv, stockDaysAvg,
      });
    } catch { /* silent */ }
  }, [stats.draftItems]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === 'dashboard') fetchDashboard(); }, [activeTab, fetchDashboard]);

  const routeDays = profile?.route_plan?.days || [];
  const dayLabels = { MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba', THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar' };
  const routeLabel = routeDays.map(d => dayLabels[d] || d).join(', ');

  const tabs = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Home },
    { id: 'draft', label: 'Taslak', icon: ClipboardList },
    { id: 'deliveries', label: 'Teslimat', icon: Truck, badge: stats.pendingDeliveries },
    { id: 'history', label: 'Faturalar', icon: FileText },
    { id: 'more', label: 'Daha Fazla', icon: MoreHorizontal },
  ];

  const extraModules = [
    { id: 'stock', name: 'Stok Bildirimi', icon: Package, color: 'text-teal-600 bg-teal-50' },
    { id: 'variance', name: 'Tuketim Sapmalari', icon: TrendingUp, color: 'text-amber-600 bg-amber-50', badge: stats.openVariance },
    { id: 'consumption', name: 'Tuketim Analizi', icon: BarChart3, color: 'text-green-600 bg-green-50' },
    { id: 'campaigns', name: 'Kampanyalar', icon: Tag, color: 'text-orange-600 bg-orange-50' },
    { id: 'fault', name: 'Ariza Bildirimleri', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { id: 'favorites', name: 'Favorilerim', icon: Heart, color: 'text-pink-600 bg-pink-50' },
    { id: 'orders_legacy', name: 'Siparis Yonetimi', icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
  ];

  const isExtraTab = ['stock', 'variance', 'consumption', 'campaigns', 'fault', 'favorites', 'orders_legacy'].includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'draft': return <DraftView onStartEdit={() => setActiveTab('working-copy')} />;
      case 'working-copy': return <WorkingCopyPage onBack={() => setActiveTab('draft')} onSubmitted={() => { setActiveTab('dashboard'); fetchStats(); }} />;
      case 'deliveries': return <DeliveryApproval />;
      case 'history': return <DeliveryHistory />;
      case 'stock': return <StockDeclarationForm />;
      case 'variance': return <VarianceList />;
      case 'history_legacy': return <HistoricalRecords />;
      case 'consumption': return <ConsumptionAnalytics />;
      case 'campaigns': return <CampaignsModule />;
      case 'fault': return <FaultReportModule />;
      case 'favorites': return <FavoritesModule />;
      case 'orders_legacy': return <OrderManagement />;
      case 'more': return renderMoreMenu();
      default: return renderDashboard();
    }
  };

  const renderMoreMenu = () => (
    <div data-testid="more-menu">
      <p className="text-sm font-medium text-slate-600 mb-3">Ek Moduller</p>
      <div className="grid grid-cols-2 gap-3">
        {extraModules.map(mod => {
          const Icon = mod.icon;
          return (
            <button key={mod.id} onClick={() => setActiveTab(mod.id)}
              className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-sky-300 hover:shadow-sm transition-all relative"
              data-testid={`more-${mod.id}`}>
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

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const renderDashboard = () => {
    const d = dashData || {};
    const topProducts = (d.summary || []).slice(0, 3);
    const maxAvg = topProducts[0]?.avg_daily || 1;

    return (
      <div className="space-y-4" data-testid="seftali-home">
        {/* Greeting */}
        <div>
          <h2 className="text-xl font-bold text-slate-900">Merhaba, {profile?.name || user?.full_name || 'Market'}!</h2>
          <p className="text-xs text-slate-500 mt-0.5">Rota: {routeLabel || '—'}</p>
        </div>

        {/* 3 colored stat cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Son 7 Gun Alim - Blue */}
          <button onClick={() => setActiveTab('history')}
            className="relative overflow-hidden rounded-xl p-3 text-left transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
            data-testid="stat-last7">
            <p className="text-[10px] font-medium text-sky-200">Son 7 Gun</p>
            <p className="text-lg font-bold text-white mt-0.5">{d.last7 || 0}</p>
            <p className="text-[10px] text-sky-200">{d.last7Orders || 0} Siparis</p>
          </button>

          {/* Gunluk Tuketim - Amber */}
          <button onClick={() => setActiveTab('consumption')}
            className="relative overflow-hidden rounded-xl p-3 text-left transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            data-testid="stat-daily">
            <p className="text-[10px] font-medium text-amber-100">Gunluk Tuketim</p>
            <p className="text-lg font-bold text-white mt-0.5">{Math.round(d.totalDaily || 0)}</p>
            <p className="text-[10px] text-amber-100">Urun/gun</p>
          </button>

          {/* Onerilen Siparis - Orange */}
          <button onClick={() => setActiveTab('draft')}
            className="relative overflow-hidden rounded-xl p-3 text-left transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
            data-testid="stat-suggested">
            <p className="text-[10px] font-medium text-orange-100">Onerilen</p>
            <p className="text-lg font-bold text-white mt-0.5">{stats.totalSuggested || 0}</p>
            <p className="text-[10px] text-orange-100">Adet</p>
          </button>
        </div>

        {/* Stokta Kalan Gun + Quick Actions */}
        <div className="grid grid-cols-5 gap-3">
          {/* Green stock card */}
          <button onClick={() => setActiveTab('stock')}
            className="col-span-2 rounded-xl p-3 text-left transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
            data-testid="stat-stock-days">
            <p className="text-[10px] font-medium text-green-100">Stokta Kalan</p>
            <p className="text-lg font-bold text-white mt-0.5">{d.stockDaysAvg > 0 ? d.stockDaysAvg.toFixed(1) : '—'}</p>
            <p className="text-[10px] text-green-100">Gun</p>
          </button>

          {/* 4 action buttons */}
          <div className="col-span-3 grid grid-cols-4 gap-2">
            {[
              { id: 'draft', icon: ShoppingCart, label: 'Siparis', color: 'text-blue-600' },
              { id: 'stock', icon: RotateCcw, label: 'Stok', color: 'text-green-600' },
              { id: 'deliveries', icon: Truck, label: 'Teslimat', color: 'text-sky-600', badge: stats.pendingDeliveries },
              { id: 'history', icon: FileText, label: 'Faturalar', color: 'text-slate-600' },
            ].map(act => (
              <button key={act.id} onClick={() => setActiveTab(act.id)}
                className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center py-2.5 hover:border-sky-300 hover:shadow-sm transition-all relative"
                data-testid={`action-${act.id}`}>
                <act.icon className={`w-5 h-5 ${act.color}`} />
                <span className="text-[9px] text-slate-600 font-medium mt-1">{act.label}</span>
                {act.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{act.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom 3 cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Son Siparis */}
          <button onClick={() => setActiveTab('history')}
            className="bg-white border border-slate-200 rounded-xl p-3 text-left hover:shadow-sm transition-all"
            data-testid="card-last-order">
            <p className="text-xs font-semibold text-slate-700">Son Siparis</p>
            <p className="text-[10px] text-slate-400 mt-1">{d.lastDlv ? formatDate(d.lastDlv.delivered_at) : '—'}</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              {d.lastDlv ? (d.lastDlv.items || []).reduce((s, i) => s + i.qty, 0) : 0} Ad.
            </p>
          </button>

          {/* Haftalik Tuketim - mini chart */}
          <button onClick={() => setActiveTab('consumption')}
            className="bg-white border border-slate-200 rounded-xl p-3 text-left hover:shadow-sm transition-all"
            data-testid="card-weekly-chart">
            <p className="text-xs font-semibold text-slate-700">Haftalik</p>
            {(d.weeklyChart || []).length > 0 && (
              <div className="mt-1" style={{ height: 40 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.weeklyChart}>
                    <Line type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </button>

          {/* En Cok Tuketilenler */}
          <div className="bg-white border border-slate-200 rounded-xl p-3" data-testid="card-top-products">
            <p className="text-xs font-semibold text-slate-700 mb-1.5">En Cok</p>
            {topProducts.map((p, i) => (
              <div key={p.product_id} className="mb-1 last:mb-0">
                <p className="text-[9px] text-slate-600 truncate">{p.product_name}</p>
                <div className="w-full bg-slate-100 rounded-full h-1 mt-0.5">
                  <div className="bg-sky-500 h-1 rounded-full" style={{ width: `${Math.max(8, (p.avg_daily / maxAvg) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="peach">&#127825;</span>
          <h1 className="text-lg font-bold text-slate-900">Seftali</h1>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors" data-testid="logout-btn">
          <LogOut className="w-3.5 h-3.5" />
          Cikis
        </button>
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
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-2 relative transition-colors ${isActive ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                data-testid={`nav-${tab.id}`}>
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
      <div className="h-16" />
    </div>
  );
};

export default SeftaliCustomerDashboard;
