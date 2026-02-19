import React, { useState, useEffect, useCallback } from 'react';
import { sfAdminAPI } from '../../services/seftaliApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { 
  BarChart3, TrendingUp, Truck, Users, AlertTriangle, Package,
  Home, LogOut, Search, Bell, ChevronRight, Clock, Check,
  FileText, ShoppingBag, Calendar, CheckCircle
} from 'lucide-react';

const SeftaliAdminDashboard = () => {
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

  const dayTranslations = {
    MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba',
    THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar'
  };

  // Sidebar items
  const sidebarItems = [
    { id: 'overview', label: 'Genel Bakis', icon: Home },
    { id: 'warehouse', label: 'Depo Siparisleri', icon: Package, badge: warehouseOrders.filter(o => o.status === 'submitted').length },
    { id: 'variance', label: 'Sapmalar', icon: TrendingUp, badge: variance.filter(v => v.status === 'needs_reason').length },
    { id: 'deliveries', label: 'Teslimatlar', icon: Truck },
    { id: 'customers', label: 'Musteriler', icon: Users },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'warehouse': return renderWarehouseOrders();
      case 'variance': return renderVariance();
      case 'deliveries': return renderDeliveries();
      case 'customers': return renderCustomers();
      case 'reports': return renderReports();
      default: return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6" data-testid="admin-overview">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Genel Bakis</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Genel Bakis</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <Truck className="w-5 h-5 opacity-80 mb-2" />
          <p className="text-xs font-medium opacity-80">Toplam Teslimat</p>
          <p className="text-2xl font-bold mt-1">{summary?.total_deliveries || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
          <Clock className="w-5 h-5 opacity-80 mb-2" />
          <p className="text-xs font-medium opacity-80">Bekleyen Teslimat</p>
          <p className="text-2xl font-bold mt-1">{summary?.pending_deliveries || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white">
          <AlertTriangle className="w-5 h-5 opacity-80 mb-2" />
          <p className="text-xs font-medium opacity-80">Aktif Spike</p>
          <p className="text-2xl font-bold mt-1">{summary?.active_spikes || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
          <TrendingUp className="w-5 h-5 opacity-80 mb-2" />
          <p className="text-xs font-medium opacity-80">Acik Sapma</p>
          <p className="text-2xl font-bold mt-1">{summary?.open_variance || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pending Warehouse Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Bekleyen Depo Siparisleri</h3>
            <button onClick={() => setActiveTab('warehouse')} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Tumunu Gor →
            </button>
          </div>
          {warehouseOrders.filter(o => o.status === 'submitted').slice(0, 3).map((order, idx) => (
            <div key={order.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{dayTranslations[order.route_day] || order.route_day} Rutu</p>
                <p className="text-xs text-slate-500">{order.customer_count} musteri · {order.total_qty} adet</p>
              </div>
              <button onClick={() => handleProcessOrder(order.id)}
                className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600">
                Islem Yap
              </button>
            </div>
          ))}
          {warehouseOrders.filter(o => o.status === 'submitted').length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Bekleyen siparis yok</p>
          )}
        </div>

        {/* Top Spike Products */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">En Cok Spike Olan Urunler</h3>
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
        </div>
      </div>
    </div>
  );

  const renderWarehouseOrders = () => {
    const pendingOrders = warehouseOrders.filter(o => o.status === 'submitted');
    const processedOrders = warehouseOrders.filter(o => o.status === 'processed');

    return (
      <div className="space-y-6" data-testid="warehouse-orders-page">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Depo Siparisleri</h1>
          <p className="text-sm text-slate-500">Ana Sayfa / Depo Siparisleri</p>
        </div>

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
            <p className="text-2xl font-bold text-slate-900">{warehouseOrders.length}</p>
          </div>
        </div>

        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Bekleyen Siparisler</h2>
            {pendingOrders.map((order) => (
              <WarehouseOrderCard key={order.id} order={order} onProcess={handleProcessOrder} dayTranslations={dayTranslations} />
            ))}
          </div>
        )}

        {/* Processed Orders */}
        {processedOrders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Islenen Siparisler</h2>
            {processedOrders.slice(0, 5).map((order) => (
              <WarehouseOrderCard key={order.id} order={order} onProcess={null} dayTranslations={dayTranslations} />
            ))}
          </div>
        )}

        {warehouseOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Henuz depo siparisi yok</p>
          </div>
        )}
      </div>
    );
  };

  const renderVariance = () => (
    <div className="space-y-6" data-testid="variance-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tuketim Sapmalari</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Sapmalar</p>
      </div>
      
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
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  v.status === 'needs_reason' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {v.status === 'needs_reason' ? 'Aciklama Bekliyor' : v.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Sapma kaydi yok</p>
        </div>
      )}
    </div>
  );

  const renderDeliveries = () => (
    <div className="space-y-6" data-testid="deliveries-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Teslimatlar</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Teslimatlar</p>
      </div>
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Teslimat listesi yakin zamanda eklenecek</p>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6" data-testid="customers-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Musteriler</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Musteriler</p>
      </div>
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Musteri listesi yakin zamanda eklenecek</p>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Raporlar</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Raporlar</p>
      </div>
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Raporlama modulu yakin zamanda eklenecek</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col fixed h-full z-30" data-testid="sidebar">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍑</span>
            <div>
              <span className="text-xl font-bold text-slate-900">Seftali</span>
              <p className="text-[10px] text-slate-500">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  isActive ? 'bg-orange-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`nav-${item.id}`}>
                <Icon className="w-5 h-5" />
                {item.label}
                {item.badge > 0 && (
                  <span className={`absolute right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                    isActive ? 'bg-white text-orange-500' : 'bg-red-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <span className="text-sm font-medium text-slate-700 truncate">{user?.full_name || 'Admin'}</span>
          </div>
          <button onClick={logout} 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
            data-testid="logout-btn">
            <LogOut className="w-5 h-5" />
            Cikis Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-56">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Ara..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                {warehouseOrders.filter(o => o.status === 'submitted').length}
              </span>
              <button className="p-2 hover:bg-slate-100 rounded-full">
                <Bell className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

// Warehouse Order Card Component
const WarehouseOrderCard = ({ order, onProcess, dayTranslations }) => {
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
              <button onClick={(e) => { e.stopPropagation(); onProcess(order.id); }}
                className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Islem Yap
              </button>
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

export default SeftaliAdminDashboard;
