// Admin Dashboard - Ana Bileşen (Refactored)
import React, { useState, useEffect, useCallback } from 'react';
import { sfAdminAPI } from '../services/seftaliApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  BarChart3, TrendingUp, Truck, Users, AlertTriangle, Package,
  Home, Clock, Check, ChevronRight, CheckCircle, Tag, Plus, Edit3, Trash2, X
} from 'lucide-react';

// Import Layout Components
import {
  DashboardLayout, PageHeader, StatCard, InfoCard, EmptyState, Loading,
  Badge, Button, gradients
} from '../components/ui/DesignSystem';

// Import Page Components
import ReportsPage from '../components/admin/ReportsPage';

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
    { id: 'products', label: 'Ürünler', icon: Package },
    { id: 'warehouse', label: 'Depo Siparisleri', icon: Package, badge: pendingOrdersCount },
    { id: 'campaigns', label: 'Kampanyalar', icon: Tag },
    { id: 'variance', label: 'Sapmalar', icon: TrendingUp, badge: pendingVarianceCount },
    { id: 'deliveries', label: 'Teslimatlar', icon: Truck },
    { id: 'customers', label: 'Musteriler', icon: Users },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
  ];

  const renderContent = () => {
    if (loading) return <Loading />;

    switch (activeTab) {
      case 'products':
        return <ProductsManagementPage />;
      case 'warehouse':
        return <WarehouseOrdersPage orders={warehouseOrders} onProcess={handleProcessOrder} />;
      case 'campaigns':
        return <CampaignsManagementPage />;
      case 'variance':
        return <VariancePage variance={variance} />;
      case 'deliveries':
        return <PlaceholderPage icon={Truck} title="Teslimatlar" subtitle="Teslimat listesi yakin zamanda eklenecek" />;
      case 'customers':
        return <PlaceholderPage icon={Users} title="Musteriler" subtitle="Musteri listesi yakin zamanda eklenecek" />;
      case 'reports':
        return <ReportsPage />;
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


// Campaigns Management Page
const CampaignsManagementPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    type: 'discount',
    title: '',
    product_id: '',
    product_name: '',
    product_code: '',
    min_qty: 100,
    normal_price: 0,
    campaign_price: 0,
    valid_until: '',
    description: '',
    gift_product_id: '',
    gift_product_name: '',
    gift_qty: 0,
    gift_value: 0,
  });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const resp = await sfAdminAPI.getCampaigns({});
      setCampaigns(resp.data?.data || []);
    } catch (err) {
      toast.error('Kampanyalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleOpenModal = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        type: campaign.type || 'discount',
        title: campaign.title || '',
        product_id: campaign.product_id || '',
        product_name: campaign.product_name || '',
        product_code: campaign.product_code || '',
        min_qty: campaign.min_qty || 100,
        normal_price: campaign.normal_price || 0,
        campaign_price: campaign.campaign_price || 0,
        valid_until: campaign.valid_until || '',
        description: campaign.description || '',
        gift_product_id: campaign.gift_product_id || '',
        gift_product_name: campaign.gift_product_name || '',
        gift_qty: campaign.gift_qty || 0,
        gift_value: campaign.gift_value || 0,
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        type: 'discount',
        title: '',
        product_id: '',
        product_name: '',
        product_code: '',
        min_qty: 100,
        normal_price: 0,
        campaign_price: 0,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: '',
        gift_product_id: '',
        gift_product_name: '',
        gift_qty: 0,
        gift_value: 0,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingCampaign) {
        await sfAdminAPI.updateCampaign(editingCampaign.id, formData);
        toast.success('Kampanya güncellendi');
      } else {
        await sfAdminAPI.createCampaign(formData);
        toast.success('Kampanya oluşturuldu');
      }
      setShowModal(false);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
    try {
      await sfAdminAPI.deleteCampaign(id);
      toast.success('Kampanya silindi');
      fetchCampaigns();
    } catch (err) {
      toast.error('Silme işlemi başarısız');
    }
  };

  const handleToggleStatus = async (campaign) => {
    const newStatus = campaign.status === 'active' ? 'expired' : 'active';
    try {
      await sfAdminAPI.updateCampaign(campaign.id, { status: newStatus });
      toast.success(`Kampanya ${newStatus === 'active' ? 'aktif edildi' : 'durduruldu'}`);
      fetchCampaigns();
    } catch (err) {
      toast.error('Durum değiştirme başarısız');
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const expiredCampaigns = campaigns.filter(c => c.status !== 'active');

  if (loading) return <Loading />;

  return (
    <div className="space-y-6" data-testid="campaigns-management-page">
      <div className="flex items-center justify-between">
        <PageHeader title="Kampanya Yönetimi" subtitle="Ana Sayfa / Kampanyalar" />
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
        >
          <Plus className="w-4 h-4" />
          Yeni Kampanya
        </button>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 mb-1">Aktif Kampanya</p>
          <p className="text-2xl font-bold text-emerald-700">{activeCampaigns.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-600 mb-1">Hediyeli</p>
          <p className="text-2xl font-bold text-purple-700">
            {activeCampaigns.filter(c => c.type === 'gift').length}
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-600 mb-1">Durdurulmuş</p>
          <p className="text-2xl font-bold text-slate-700">{expiredCampaigns.length}</p>
        </div>
      </div>

      {/* Kampanya Listesi */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Kampanya</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Tür</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Min. Adet</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Fiyat</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Son Tarih</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Durum</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map(campaign => (
              <tr key={campaign.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 text-sm">{campaign.title}</p>
                  <p className="text-xs text-slate-500">{campaign.product_name}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    campaign.type === 'gift' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {campaign.type === 'gift' ? '🎁 Hediyeli' : '💰 İndirim'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{campaign.min_qty} adet</td>
                <td className="px-4 py-3">
                  <span className="text-slate-400 line-through text-xs">{campaign.normal_price} TL</span>
                  <span className="ml-2 text-emerald-600 font-bold text-sm">{campaign.campaign_price} TL</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {new Date(campaign.valid_until).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleStatus(campaign)}
                    className={`text-xs font-medium px-2 py-1 rounded cursor-pointer ${
                      campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {campaign.status === 'active' ? 'Aktif' : 'Durduruldu'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleOpenModal(campaign)}
                    className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="p-8 text-center">
            <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Henüz kampanya eklenmemiş</p>
          </div>
        )}
      </div>

      {/* Kampanya Ekleme/Düzenleme Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {editingCampaign ? 'Kampanya Düzenle' : 'Yeni Kampanya'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Kampanya Türü */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Kampanya Türü</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, type: 'discount' })}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium ${
                      formData.type === 'discount' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    💰 Miktar İndirimi
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, type: 'gift' })}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium ${
                      formData.type === 'gift' 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    🎁 Hediyeli
                  </button>
                </div>
              </div>

              {/* Kampanya Başlığı */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kampanya Başlığı</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                  placeholder="Örn: 1000 ml Süt - Toplu Alım Kampanyası"
                />
              </div>

              {/* Ürün Bilgileri */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ürün Adı</label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                    placeholder="1000 ml Y.Yağlı Süt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ürün Kodu</label>
                  <input
                    type="text"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                    placeholder="1000_ML_YY_SUT"
                  />
                </div>
              </div>

              {/* Fiyat ve Miktar */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min. Adet</label>
                  <input
                    type="number"
                    value={formData.min_qty}
                    onChange={(e) => setFormData({ ...formData, min_qty: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Normal Fiyat (TL)</label>
                  <input
                    type="number"
                    value={formData.normal_price}
                    onChange={(e) => setFormData({ ...formData, normal_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kampanya Fiyat (TL)</label>
                  <input
                    type="number"
                    value={formData.campaign_price}
                    onChange={(e) => setFormData({ ...formData, campaign_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Hediyeli Kampanya Alanları */}
              {formData.type === 'gift' && (
                <div className="bg-purple-50 rounded-xl p-4 space-y-4">
                  <h4 className="font-medium text-purple-800">🎁 Hediye Ürün Bilgileri</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-1">Hediye Ürün Adı</label>
                      <input
                        type="text"
                        value={formData.gift_product_name}
                        onChange={(e) => setFormData({ ...formData, gift_product_name: e.target.value })}
                        className="w-full px-4 py-2 border border-purple-200 rounded-xl"
                        placeholder="250 ml Ekşi Ayran"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-1">Hediye Adet</label>
                      <input
                        type="number"
                        value={formData.gift_qty}
                        onChange={(e) => setFormData({ ...formData, gift_qty: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-purple-200 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">Hediye Değeri (TL)</label>
                    <input
                      type="number"
                      value={formData.gift_value}
                      onChange={(e) => setFormData({ ...formData, gift_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-purple-200 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Geçerlilik ve Açıklama */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Son Geçerlilik Tarihi</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                    placeholder="Kampanya açıklaması..."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold"
              >
                {editingCampaign ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// ÜRÜN YÖNETİMİ SAYFASI (Stok ile birlikte)
// ============================================
const ProductsManagementPage = () => {
  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [depolar, setDepolar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepo, setFilterDepo] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, depoRes, stockRes] = await Promise.all([
        sfAdminAPI.getProducts(),
        sfAdminAPI.getDepolar(),
        sfAdminAPI.getWarehouseStock({})
      ]);
      setProducts(prodRes.data?.data || []);
      setDepolar(depoRes.data?.data || []);
      
      // Stok verilerini product_id bazlı map'e çevir
      const stockData = stockRes.data?.data || [];
      const map = {};
      stockData.forEach(s => {
        if (!map[s.product_id]) map[s.product_id] = {};
        map[s.product_id][s.depo_no] = s;
      });
      setStockMap(map);
    } catch (err) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProduct = async (productData) => {
    try {
      // Ürün bilgilerini güncelle
      await sfAdminAPI.updateProduct(editingProduct.product_id, productData.productInfo);
      
      // Stok bilgisi varsa güncelle
      if (productData.stockInfo && productData.stockInfo.depo_no) {
        await sfAdminAPI.addWarehouseStock({
          product_id: editingProduct.product_id,
          ...productData.stockInfo
        });
      }
      
      toast.success('Ürün güncellendi');
      setEditingProduct(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Güncelleme hatası');
    }
  };

  // Filtrele
  const filteredProducts = products.filter(p => {
    const matchSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDepo = !filterDepo || p.depo_no === filterDepo;
    return matchSearch && matchDepo;
  });

  // SKT'ye göre uyarı rengi
  const getSktColor = (skt) => {
    if (!skt) return 'text-slate-500';
    const date = new Date(skt);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return 'text-red-600 font-bold';
    if (diffDays < 60) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR');
    } catch {
      return dateStr;
    }
  };

  // Ürünün toplam stokunu hesapla
  const getProductStock = (productId) => {
    const productStocks = stockMap[productId];
    if (!productStocks) return 0;
    return Object.values(productStocks).reduce((sum, s) => sum + (s.quantity || 0), 0);
  };

  // Stok rengi
  const getStockColor = (qty) => {
    if (qty === 0) return 'text-slate-400';
    if (qty < 10) return 'text-red-600 font-bold';
    if (qty < 50) return 'text-amber-600';
    return 'text-emerald-600';
  };

  // Toplam stok
  const totalStock = Object.values(stockMap).reduce((sum, prodStock) => {
    return sum + Object.values(prodStock).reduce((s, item) => s + (item.quantity || 0), 0);
  }, 0);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6" data-testid="products-management-page">
      <PageHeader title="Ürün Yönetimi" subtitle="Admin / Ürünler" />

      {/* Filtreler */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <select
          value={filterDepo}
          onChange={(e) => setFilterDepo(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Tüm Depolar</option>
          {depolar.map(d => (
            <option key={d.depo_no} value={d.depo_no}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 mb-1">Toplam Ürün</p>
          <p className="text-2xl font-bold text-emerald-700">{products.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 mb-1">Toplam Stok</p>
          <p className="text-2xl font-bold text-blue-700">{totalStock.toLocaleString('tr-TR')}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600 mb-1">Düşük Stoklu</p>
          <p className="text-2xl font-bold text-amber-700">
            {products.filter(p => {
              const qty = getProductStock(p.product_id);
              return qty > 0 && qty < 50;
            }).length}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 mb-1">Stoksuz</p>
          <p className="text-2xl font-bold text-red-700">
            {products.filter(p => getProductStock(p.product_id) === 0).length}
          </p>
        </div>
      </div>

      {/* Ürün Tablosu */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Ürün Adı</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Kategori</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Stok</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Raf Ömrü</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">SKT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Depo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Durum</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const stockQty = getProductStock(product.product_id);
                return (
                  <tr key={product.product_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.product_id}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{product.category_id}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-lg font-bold ${getStockColor(stockQty)}`}>
                        {stockQty.toLocaleString('tr-TR')}
                      </span>
                      <p className="text-xs text-slate-400">adet</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">{product.shelf_life_days || '-'}</p>
                      <p className="text-xs text-slate-400">{product.shelf_life_days ? 'gün' : ''}</p>
                    </td>
                    <td className={`px-4 py-3 text-sm ${getSktColor(product.skt)}`}>
                      {formatDate(product.skt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">{product.depo_no || '-'}</p>
                      <p className="text-xs text-slate-400">{product.depo_name || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.is_active 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {product.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setEditingProduct({...product, currentStock: stockMap[product.product_id]})}
                        className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        data-testid={`edit-product-${product.product_id}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Düzenleme Modalı */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          depolar={depolar}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
};

// Ürün Düzenleme Modalı (Stok ile)
const ProductEditModal = ({ product, depolar, onClose, onSave }) => {
  // Mevcut stok bilgisi (ilk depodan)
  const currentStockData = product.currentStock ? Object.values(product.currentStock)[0] : null;
  
  const [formData, setFormData] = useState({
    name: product.name || '',
    category_id: product.category_id || '',
    case_name: product.case_name || '',
    case_size: product.case_size || '',
    shelf_life_days: product.shelf_life_days || '',
    skt: product.skt || '',
    depo_no: product.depo_no || 'D001',
    is_active: product.is_active ?? true,
  });
  
  const [stockData, setStockData] = useState({
    quantity: currentStockData?.quantity || 0,
    lot_no: currentStockData?.lot_no || '',
    stock_skt: currentStockData?.skt || '',
  });
  
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const productInfo = {
      name: formData.name,
      category_id: formData.category_id,
      case_name: formData.case_name,
      case_size: parseInt(formData.case_size) || null,
      shelf_life_days: parseInt(formData.shelf_life_days) || null,
      skt: formData.skt || null,
      depo_no: formData.depo_no,
      depo_name: depolar.find(d => d.depo_no === formData.depo_no)?.name || '',
      is_active: formData.is_active,
    };
    
    const stockInfo = {
      depo_no: formData.depo_no,
      quantity: parseInt(stockData.quantity) || 0,
      lot_no: stockData.lot_no,
      skt: stockData.stock_skt,
    };
    
    await onSave({ productInfo, stockInfo });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-slate-800">Ürün Düzenle</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ürün ID</label>
            <input
              type="text"
              value={product.product_id}
              disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ürün Adı</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
              <input
                type="text"
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Koli Boyutu</label>
              <input
                type="number"
                value={formData.case_size}
                onChange={(e) => setFormData({...formData, case_size: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Raf Ömrü (Gün)</label>
              <input
                type="number"
                value={formData.shelf_life_days}
                onChange={(e) => setFormData({...formData, shelf_life_days: e.target.value})}
                placeholder="Örn: 30"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Depo</label>
              <select
                value={formData.depo_no}
                onChange={(e) => setFormData({...formData, depo_no: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Depo Seçin</option>
                {depolar.map(d => (
                  <option key={d.depo_no} value={d.depo_no}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Stok Bilgileri */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Stok Bilgileri
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Miktar (Adet)</label>
                <input
                  type="number"
                  value={stockData.quantity}
                  onChange={(e) => setStockData({...stockData, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  data-testid="product-stock-quantity"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Lot No</label>
                <input
                  type="text"
                  value={stockData.lot_no}
                  onChange={(e) => setStockData({...stockData, lot_no: e.target.value})}
                  placeholder="Opsiyonel"
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Stok SKT</label>
                <input
                  type="date"
                  value={stockData.stock_skt}
                  onChange={(e) => setStockData({...stockData, stock_skt: e.target.value})}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700">Aktif</label>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:bg-slate-300"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700">Aktif</label>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:bg-slate-300"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
