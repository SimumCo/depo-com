// Admin Dashboard - Ana Bileşen (Refactored)
import React, { useState, useEffect, useCallback } from 'react';
import { sfAdminAPI } from '../services/seftaliApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  BarChart3, TrendingUp, Truck, Users, AlertTriangle, Package,
  Home, Clock, Check, ChevronRight, CheckCircle
} from 'lucide-react';

// Import Layout Components
import {
  DashboardLayout, PageHeader, StatCard, InfoCard, EmptyState, Loading,
  Badge, Button, gradients
} from '../components/ui/DesignSystem';

// Day translations
const dayTranslations = {
  MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba',
  THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar'
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [variance, setVariance] = useState([]);
  const [warehouseOrders, setWarehouseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, varRes, whRes] = await Promise.all([
        sfAdminAPI.getHealthSummary(),
        sfAdminAPI.getVariance({}),
        sfAdminAPI.getWarehouseOrders({}),
      ]);
      setSummary(sumRes.data?.data || null);
      setVariance(varRes.data?.data || []);
      setWarehouseOrders(whRes.data?.data || []);
    } catch {
      toast.error('Admin verileri yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProcessOrder = async (orderId) => {
    try {
      await sfAdminAPI.processWarehouseOrder(orderId);
      toast.success('Siparis islendi olarak isaretlendi');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Islem hatasi');
    }
  };

  // Pending counts for badges
  const pendingOrdersCount = warehouseOrders.filter(o => o.status === 'submitted').length;
  const pendingVarianceCount = variance.filter(v => v.status === 'needs_reason').length;

  // Sidebar items
  const sidebarItems = [
    { id: 'overview', label: 'Genel Bakis', icon: Home },
    { id: 'warehouse', label: 'Depo Siparisleri', icon: Package, badge: pendingOrdersCount },
    { id: 'variance', label: 'Sapmalar', icon: TrendingUp, badge: pendingVarianceCount },
    { id: 'deliveries', label: 'Teslimatlar', icon: Truck },
    { id: 'customers', label: 'Musteriler', icon: Users },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
  ];

  const renderContent = () => {
    if (loading) return <Loading />;

    switch (activeTab) {
      case 'warehouse':
        return <WarehouseOrdersPage orders={warehouseOrders} onProcess={handleProcessOrder} />;
      case 'variance':
        return <VariancePage variance={variance} />;
      case 'deliveries':
        return <PlaceholderPage icon={Truck} title="Teslimatlar" subtitle="Teslimat listesi yakin zamanda eklenecek" />;
      case 'customers':
        return <PlaceholderPage icon={Users} title="Musteriler" subtitle="Musteri listesi yakin zamanda eklenecek" />;
      case 'reports':
        return <PlaceholderPage icon={BarChart3} title="Raporlar" subtitle="Raporlama modulu yakin zamanda eklenecek" />;
      default:
        return (
          <OverviewPage 
            summary={summary} 
            warehouseOrders={warehouseOrders} 
            onProcess={handleProcessOrder}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={logout}
      user={user}
      title="Admin Panel"
      notificationCount={pendingOrdersCount}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

// ============================================
// SAYFA BİLEŞENLERİ
// ============================================

// Overview Page
const OverviewPage = ({ summary, warehouseOrders, onProcess, setActiveTab }) => {
  const pendingOrders = warehouseOrders.filter(o => o.status === 'submitted');

  return (
    <div className="space-y-6" data-testid="admin-overview">
      <PageHeader title="Genel Bakis" subtitle="Ana Sayfa / Genel Bakis" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Truck} title="Toplam Teslimat" value={summary?.total_deliveries || 0} gradient={gradients.blue} />
        <StatCard icon={Clock} title="Bekleyen Teslimat" value={summary?.pending_deliveries || 0} gradient={gradients.amber} />
        <StatCard icon={AlertTriangle} title="Aktif Spike" value={summary?.active_spikes || 0} gradient={gradients.red} />
        <StatCard icon={TrendingUp} title="Acik Sapma" value={summary?.open_variance || 0} gradient={gradients.purple} />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pending Orders */}
        <InfoCard title="Bekleyen Depo Siparisleri">
          <div className="flex justify-between items-center mb-4">
            <span></span>
            <button onClick={() => setActiveTab('warehouse')} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Tumunu Gor →
            </button>
          </div>
          {pendingOrders.slice(0, 3).map((order) => (
            <div key={order.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{dayTranslations[order.route_day] || order.route_day} Rutu</p>
                <p className="text-xs text-slate-500">{order.customer_count} musteri · {order.total_qty} adet</p>
              </div>
              <Button size="sm" variant="success" onClick={() => onProcess(order.id)}>
                Islem Yap
              </Button>
            </div>
          ))}
          {pendingOrders.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Bekleyen siparis yok</p>
          )}
        </InfoCard>

        {/* Top Spike Products */}
        <InfoCard title="En Cok Spike Olan Urunler">
          {(summary?.top_spike_products || []).length > 0 ? (
            <div className="space-y-3">
              {summary.top_spike_products.map((ts, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center text-xs font-bold text-red-600">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{ts.product_name}</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">{ts.spike_count} spike</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Aktif spike yok</p>
          )}
        </InfoCard>
      </div>
    </div>
  );
};

// Warehouse Orders Page
const WarehouseOrdersPage = ({ orders, onProcess }) => {
  const pendingOrders = orders.filter(o => o.status === 'submitted');
  const processedOrders = orders.filter(o => o.status === 'processed');

  return (
    <div className="space-y-6" data-testid="warehouse-orders-page">
      <PageHeader title="Depo Siparisleri" subtitle="Ana Sayfa / Depo Siparisleri" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-slate-500">Bekleyen</p>
          <p className="text-2xl font-bold text-slate-900">{pendingOrders.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-slate-500">Islenen</p>
          <p className="text-2xl font-bold text-slate-900">{processedOrders.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 border-l-4 border-l-blue-500">
          <p className="text-xs text-slate-500">Toplam</p>
          <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
        </div>
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Bekleyen Siparisler</h2>
          {pendingOrders.map((order) => (
            <WarehouseOrderCard key={order.id} order={order} onProcess={onProcess} />
          ))}
        </div>
      )}

      {/* Processed Orders */}
      {processedOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Islenen Siparisler</h2>
          {processedOrders.slice(0, 5).map((order) => (
            <WarehouseOrderCard key={order.id} order={order} onProcess={null} />
          ))}
        </div>
      )}

      {orders.length === 0 && (
        <EmptyState icon={Package} title="Henuz depo siparisi yok" />
      )}
    </div>
  );
};

// Warehouse Order Card Component
const WarehouseOrderCard = ({ order, onProcess }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden ${
      order.status === 'submitted' ? 'border-amber-200' : 'border-emerald-200'
    }`}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-slate-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${
              order.status === 'submitted' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}>
              {order.status === 'submitted' ? <Clock className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{dayTranslations[order.route_day] || order.route_day} Rutu</h3>
              <p className="text-xs text-slate-500">
                {formatDate(order.submitted_at)} · {order.customer_count} musteri
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900">{order.total_qty}</p>
              <p className="text-xs text-slate-500">Toplam Adet</p>
            </div>
            {onProcess && order.status === 'submitted' && (
              <Button 
                variant="success" 
                icon={Check}
                onClick={(e) => { e.stopPropagation(); onProcess(order.id); }}
              >
                Islem Yap
              </Button>
            )}
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Urun Detaylari</h4>
            <div className="grid grid-cols-2 gap-3">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.product_name || 'Urun'}</p>
                    <p className="text-xs text-slate-400">{item.product_code}</p>
                  </div>
                  <span className="text-sm font-bold text-orange-600">{item.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Variance Page
const VariancePage = ({ variance }) => (
  <div className="space-y-6" data-testid="variance-page">
    <PageHeader title="Tuketim Sapmalari" subtitle="Ana Sayfa / Sapmalar" />
    
    {variance.length > 0 ? (
      <div className="space-y-3">
        {variance.map((v, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{v.customer_name || 'Musteri'}</h3>
                <p className="text-sm text-slate-600">{v.product_name || 'Urun'}</p>
                <p className="text-xs text-slate-400 mt-1">Sapma: {v.variance_pct?.toFixed(1)}%</p>
              </div>
              <Badge variant={v.status === 'needs_reason' ? 'warning' : 'default'}>
                {v.status === 'needs_reason' ? 'Aciklama Bekliyor' : v.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState icon={TrendingUp} title="Sapma kaydi yok" />
    )}
  </div>
);

// Placeholder Page
const PlaceholderPage = ({ icon: Icon, title, subtitle }) => (
  <div className="space-y-6" data-testid={`${title.toLowerCase().replace(' ', '-')}-page`}>
    <PageHeader title={title} subtitle={`Ana Sayfa / ${title}`} />
    <EmptyState icon={Icon} title={subtitle} />
  </div>
);

export default AdminDashboard;
