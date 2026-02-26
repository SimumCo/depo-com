// Plasiyer Dashboard - Ana Bileşen
// Alt bileşenler modüler yapıda organize edilmiştir

import React, { useState, useEffect, useCallback } from 'react';
import { sfSalesAPI } from '../services/seftaliApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Truck, ShoppingBag, Plus, Package, LogOut, Users, 
  TrendingUp, Home, Search, Filter, AlertTriangle, 
  BarChart3, RotateCcw, Navigation, ChevronRight,
  Box, Tag, Zap
} from 'lucide-react';

// Import Layout Components
import { 
  DashboardLayout, PageHeader, StatCard, EmptyState, Loading, 
  gradients, Badge
} from '../components/ui/DesignSystem';

// Import Plasiyer Page Components
import RutPage from '../components/plasiyer/RutPage';
import WarehouseDraftPage from '../components/plasiyer/WarehouseDraftPage';
import DraftEnginePage from '../components/plasiyer/DraftEnginePage';
import CustomerCard, { CustomerDetailModal } from '../components/plasiyer/CustomerCard';
import OrdersPage from '../components/plasiyer/OrdersPage';
import CreateDeliveryForm from '../components/plasiyer/CreateDeliveryForm';
import StockPage from '../components/plasiyer/StockPage';
import CampaignsPage from '../components/plasiyer/CampaignsPage';

// Day translations
const dayTranslations = {
  MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba',
  THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar'
};

// Get today's day code
const getTodayDayCode = () => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[new Date().getDay()];
};

const PlasiyerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customers, setCustomers] = useState([]);
  const [customersSummary, setCustomersSummary] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSales: 135250,
    pendingOrders: 0,
    suggestedOrders: 0,
    returnRequests: 2
  });

  // Fetch main data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [custRes, custSummaryRes, dlvRes, ordRes] = await Promise.all([
        sfSalesAPI.getCustomers(),
        sfSalesAPI.getCustomersSummary(),
        sfSalesAPI.getDeliveries({}),
        sfSalesAPI.getOrders({}),
      ]);
      setCustomers(custRes.data?.data || []);
      setCustomersSummary(custSummaryRes.data?.data || []);
      setDeliveries(dlvRes.data?.data || []);
      setOrders(ordRes.data?.data || []);

      const pendingCount = (ordRes.data?.data || []).filter(o => o.status === 'submitted').length;
      setStats(prev => ({
        ...prev,
        pendingOrders: pendingCount,
        suggestedOrders: (custRes.data?.data || []).length,
        totalCustomers: (custRes.data?.data || []).length,
      }));
    } catch {
      toast.error('Veri yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      const API_BASE = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_BASE}/api/seftali/sales/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setProducts(data?.data || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { 
    fetchData(); 
    fetchProducts(); 
  }, [fetchData, fetchProducts]);

  // Handlers
  const handleCreateDelivery = async (deliveryData) => {
    if (!deliveryData.customer_id) { 
      toast.error('Musteri secin'); 
      return; 
    }
    if (deliveryData.items.length === 0) { 
      toast.error('En az bir urun ekleyin'); 
      return; 
    }

    setSubmitting(true);
    try {
      await sfSalesAPI.createDelivery(deliveryData);
      toast.success('Teslimat olusturuldu');
      setActiveTab('deliveries');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Teslimat olusturulamadi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveOrder = async (orderId) => {
    try {
      await sfSalesAPI.approveOrder(orderId);
      toast.success('Siparis onaylandi');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Onay hatasi');
    }
  };

  const handleRequestEdit = async (orderId) => {
    try {
      await sfSalesAPI.requestEdit(orderId, { note: 'Duzenleme gerekli' });
      toast.success('Duzenleme istegi gonderildi');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Hata');
    }
  };

  // Customer modal handlers
  const handleViewCustomerDetail = (customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleSaveCustomer = async (customerId, formData) => {
    try {
      // Backend'e güncelleme isteği gönder
      await sfSalesAPI.updateCustomer(customerId, formData);
      toast.success('Müşteri bilgileri güncellendi');
      // Veriyi yeniden çek
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Güncelleme başarısız');
      throw err; // Modal'daki hata işleme için throw et
    }
  };

  const handleCallCustomer = (customer) => {
    if (customer.phone) {
      window.open(`tel:${customer.phone}`, '_self');
    } else {
      toast.warning('Telefon numarası bulunamadı');
    }
  };

  const handleMessageCustomer = (customer) => {
    if (customer.phone) {
      window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}`, '_blank');
    } else {
      toast.warning('Telefon numarası bulunamadı');
    }
  };

  // Filter today's route customers
  const todayCode = getTodayDayCode();
  const todayCustomers = customersSummary.filter(c => {
    const routeDays = c.route_plan?.days || [];
    return routeDays.includes(todayCode);
  });

  // Filter customers by search
  const filteredCustomers = customersSummary.filter(c => 
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Sidebar navigation items
  const sidebarItems = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Home },
    { id: 'customers', label: 'Musteriler', icon: Users },
    { id: 'rut', label: 'Rut', icon: Navigation },
    { id: 'warehouse', label: 'Depo Taslagi', icon: Package },
    { id: 'draft-engine', label: 'Akıllı Sipariş', icon: Zap },
    { id: 'orders', label: 'Siparisler', icon: ShoppingBag, badge: stats.pendingOrders },
    { id: 'deliveries', label: 'Teslimatlar', icon: Truck },
    { id: 'create', label: 'Teslimat Olustur', icon: Plus },
    { id: 'stock', label: 'Stok', icon: Box },
    { id: 'campaigns', label: 'Kampanyalar', icon: Tag },
    { id: 'analytics', label: 'Analizler', icon: BarChart3 },
    { id: 'returns', label: 'Iade Talepleri', icon: RotateCcw },
  ];

  // Render content based on active tab
  const renderContent = () => {
    if (loading) return <Loading />;

    switch (activeTab) {
      case 'customers':
        return (
          <CustomersPage 
            customers={filteredCustomers} 
            search={search} 
            setSearch={setSearch}
            deliveries={deliveries}
            orders={orders}
            onViewDetail={handleViewCustomerDetail}
            onCall={handleCallCustomer}
            onMessage={handleMessageCustomer}
          />
        );
      case 'rut':
        return <RutPage todayCustomers={todayCustomers} />;
      case 'warehouse':
        return <WarehouseDraftPage />;
      case 'draft-engine':
        return <DraftEnginePage />;
      case 'orders':
        return <OrdersPage orders={orders} onApprove={handleApproveOrder} onRequestEdit={handleRequestEdit} />;
      case 'deliveries':
        return <DeliveriesPage deliveries={deliveries} />;
      case 'create':
        return <CreateDeliveryForm customers={customers} products={products} onSubmit={handleCreateDelivery} submitting={submitting} />;
      case 'stock':
        return <StockPage products={products} />;
      case 'campaigns':
        return <CampaignsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'returns':
        return <ReturnsPage />;
      default:
        return (
          <DashboardPage 
            stats={stats} 
            customers={filteredCustomers} 
            search={search} 
            setSearch={setSearch}
            deliveries={deliveries}
            orders={orders}
            onViewDetail={handleViewCustomerDetail}
            onCall={handleCallCustomer}
            onMessage={handleMessageCustomer}
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
      title="Plasiyer Panel"
      notificationCount={stats.pendingOrders}
    >
      {renderContent()}
      
      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={modalOpen}
        onClose={handleCloseModal}
        deliveries={deliveries}
        orders={orders}
        onSave={handleSaveCustomer}
      />
    </DashboardLayout>
  );
};

// ============================================
// SAYFA BİLEŞENLERİ
// ============================================

// Dashboard Page
const DashboardPage = ({ stats, customers, search, setSearch, deliveries, orders, onViewDetail, onCall, onMessage }) => (
  <div className="space-y-6" data-testid="sales-dashboard">
    <PageHeader title="Plasiyer" subtitle="Ana Sayfa / Plasiyer" />

    {/* Search & Filter */}
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Urun ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          data-testid="search-input"
        />
      </div>
      <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-slate-300">
        Son Siparis Tarihine Gore
        <ChevronRight className="w-4 h-4 rotate-90" />
      </button>
      <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-slate-300">
        <Filter className="w-4 h-4" />
        Filtre
      </button>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-4 gap-4">
      <StatCard title="Toplam Satislar (L3M)" value={`${stats.totalSales.toLocaleString('tr-TR')} TL`} subtitle={`+${stats.totalCustomers} firma`} gradient={gradients.blue} />
      <StatCard title="Bekleyen Siparisler" value={`${stats.pendingOrders} Siparis`} subtitle="5.540 TL Toplam" icon={ShoppingBag} gradient={gradients.green} />
      <StatCard title="Onerilen Siparisler" value={`${stats.suggestedOrders} Firma`} subtitle="3.300 TL Tavsiye Edilen" icon={TrendingUp} gradient={gradients.amber} />
      <StatCard title="Iade Talepleri" value={`${stats.returnRequests} Firma`} subtitle="2.870 TL Kontrol Edilmeli" icon={RotateCcw} gradient={gradients.red} />
    </div>

    {/* Customer Grid */}
    <div className="grid grid-cols-2 gap-4">
      {customers.slice(0, 6).map((customer, idx) => (
        <CustomerCard 
          key={customer.id} 
          customer={customer} 
          index={idx}
          deliveries={deliveries}
          orders={orders}
          onCall={() => onCall?.(customer)}
          onMessage={() => onMessage?.(customer)}
          onViewDetail={() => onViewDetail?.(customer)}
        />
      ))}
    </div>
  </div>
);

// Customers Page
const CustomersPage = ({ customers, search, setSearch, deliveries, orders, onViewDetail, onCall, onMessage }) => {
  // Sıralama state'i
  const [sortBy, setSortBy] = useState('name');
  
  // Sıralama fonksiyonu
  const sortedCustomers = [...customers].sort((a, b) => {
    switch (sortBy) {
      case 'pending_orders':
        return (b.pending_orders_count || 0) - (a.pending_orders_count || 0);
      case 'overdue':
        return (b.overdue_deliveries_count || 0) - (a.overdue_deliveries_count || 0);
      case 'last_order':
        return (a.days_since_last_order || 999) - (b.days_since_last_order || 999);
      default:
        return (a.name || '').localeCompare(b.name || '', 'tr');
    }
  });

  return (
    <div className="space-y-6" data-testid="customers-page">
      <PageHeader title="Musteriler" subtitle="Ana Sayfa / Musteriler" />

      {/* Arama ve Filtre */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Musteri ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            data-testid="customer-search-input"
          />
        </div>
        
        {/* Sıralama Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
          data-testid="sort-dropdown"
        >
          <option value="name">İsme Göre</option>
          <option value="pending_orders">Bekleyen Siparişler</option>
          <option value="overdue">Vadesi Geçenler</option>
          <option value="last_order">Son Sipariş Tarihi</option>
        </select>
      </div>

      {/* Özet İstatistikler */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-500">Toplam Müşteri</p>
          <p className="text-xl font-bold text-slate-800">{customers.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-xs text-emerald-600">Bekleyen Sipariş</p>
          <p className="text-xl font-bold text-emerald-700">
            {customers.reduce((sum, c) => sum + (c.pending_orders_count || 0), 0)}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-600">Vadesi Geçmiş</p>
          <p className="text-xl font-bold text-red-700">
            {customers.reduce((sum, c) => sum + (c.overdue_deliveries_count || 0), 0)}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-600">7+ Gün Sipariş Yok</p>
          <p className="text-xl font-bold text-amber-700">
            {customers.filter(c => (c.days_since_last_order || 999) > 7).length}
          </p>
        </div>
      </div>

      {/* Müşteri Kartları Grid */}
      <div className="grid grid-cols-2 gap-4">
        {sortedCustomers.map((customer, idx) => (
          <CustomerCard 
            key={customer.id} 
            customer={customer} 
            index={idx}
            deliveries={deliveries}
            orders={orders}
            onCall={() => onCall?.(customer)}
            onMessage={() => onMessage?.(customer)}
            onViewDetail={() => onViewDetail?.(customer)}
          />
        ))}
      </div>

      {customers.length === 0 && (
        <EmptyState icon={Users} title="Musteri bulunamadi" />
      )}
    </div>
  );
};

// Deliveries Page
const DeliveriesPage = ({ deliveries }) => (
  <div className="space-y-6" data-testid="deliveries-page">
    <PageHeader title="Teslimatlar" subtitle="Ana Sayfa / Teslimatlar" />

    {deliveries.length === 0 ? (
      <EmptyState icon={Truck} title="Teslimat bulunamadi" />
    ) : (
      <div className="space-y-3">
        {deliveries.map(d => (
          <div key={d.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-bold text-slate-900">{d.customer_name || 'Musteri'}</h3>
                <p className="text-xs text-slate-500">{d.invoice_no}</p>
              </div>
              <Badge variant={
                d.acceptance_status === 'accepted' ? 'success' :
                d.acceptance_status === 'rejected' ? 'danger' : 'warning'
              }>
                {d.acceptance_status === 'accepted' ? 'Kabul Edildi' : 
                 d.acceptance_status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              {d.items?.length || 0} urun - {d.delivery_type === 'route' ? 'Rut' : 'Rut Disi'}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Analytics Page (Placeholder)
const AnalyticsPage = () => (
  <div className="space-y-6" data-testid="analytics-page">
    <PageHeader title="Analizler" subtitle="Ana Sayfa / Analizler" />
    <EmptyState icon={BarChart3} title="Analiz modulu yakin zamanda eklenecek" />
  </div>
);

// Returns Page (Placeholder)
const ReturnsPage = () => (
  <div className="space-y-6" data-testid="returns-page">
    <PageHeader title="Iade Talepleri" subtitle="Ana Sayfa / Iade Talepleri" />
    <EmptyState icon={RotateCcw} title="Henuz iade talebi yok" />
  </div>
);

export default PlasiyerDashboard;
  <div className="space-y-6" data-testid="stock-page">
    <PageHeader title="Stok Durumu" subtitle="Ana Sayfa / Stok" />
    
    {/* Stok Özeti */}
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-xs text-emerald-600 mb-1">Toplam Ürün</p>
        <p className="text-2xl font-bold text-emerald-700">{products.length}</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-600 mb-1">Düşük Stok</p>
        <p className="text-2xl font-bold text-amber-700">0</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-xs text-red-600 mb-1">Stok Bitti</p>
        <p className="text-2xl font-bold text-red-700">0</p>
      </div>
    </div>

    {/* Ürün Listesi */}
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-800">Ürün Stok Listesi</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {products.length > 0 ? (
          products.map((product, idx) => (
            <div key={product.id || idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-800">{product.name}</p>
                <p className="text-xs text-slate-500">{product.code}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-600">
                  {product.stock_qty || '∞'}
                </p>
                <p className="text-xs text-slate-500">adet</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Ürün bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Campaigns Page - Kampanyalar (Backend Entegrasyonlu)
const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderModal, setOrderModal] = useState({ open: false, campaign: null });
  const [orderQty, setOrderQty] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Kampanyaları ve müşterileri backend'den çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Kampanyaları çek
        const campaignResp = await sfSalesAPI.getCampaigns();
        if (campaignResp.data?.data) {
          setCampaigns(campaignResp.data.data);
        } else {
          setCampaigns(defaultCampaigns);
        }
        
        // Müşterileri çek
        const customerResp = await sfSalesAPI.getCustomers();
        if (customerResp.data?.data) {
          setCustomers(customerResp.data.data);
        }
      } catch (err) {
        console.error('Veri alınamadı:', err);
        setCampaigns(defaultCampaigns);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Örnek kampanyalar (backend boşsa)
  const defaultCampaigns = [
    {
      id: 'demo-1',
      type: 'discount',
      title: '1000 ml YY Edge Süt - Toplu Alım',
      product_name: '1000 ml Y.Yağlı Edge Süt',
      product_code: '1000_ML_YY_EDGE_SUT',
      min_qty: 360,
      normal_price: 40,
      campaign_price: 30,
      valid_until: '2026-03-15',
      status: 'active',
      description: '360 adet ve üzeri alımlarda birim fiyat 40 TL yerine 30 TL'
    },
    {
      id: 'demo-2',
      type: 'discount',
      title: '200 ml Ayran - Yüklü Alım',
      product_name: '200 ml Ayran',
      product_code: '200_ML_AYRAN',
      min_qty: 500,
      normal_price: 8,
      campaign_price: 6,
      valid_until: '2026-03-10',
      status: 'active',
      description: '500 adet ve üzeri alımlarda birim fiyat 8 TL yerine 6 TL'
    },
    {
      id: 'demo-3',
      type: 'gift',
      title: '10 kg YY Yoğurt Al, Ekşi Ayran Kazan',
      product_name: '10 kg Y.Yağlı Yoğurt',
      product_code: '10_KG_YY_YOGURT',
      min_qty: 20,
      normal_price: 100,
      campaign_price: 80,
      gift_product_name: '250 ml Ekşi Ayran',
      gift_qty: 12,
      gift_value: 400,
      valid_until: '2026-03-20',
      status: 'active',
      description: '20 adet alımda 12 adet 250 ml Ekşi Ayran hediye'
    },
    {
      id: 'demo-4',
      type: 'gift',
      title: '500 gr Süzme Yoğurt Al, Ayran Kazan',
      product_name: '500 gr Süzme Yoğurt',
      product_code: '500_GR_SUZME_YOGURT',
      min_qty: 50,
      normal_price: 35,
      campaign_price: 28,
      gift_product_name: '200 ml Ayran',
      gift_qty: 25,
      gift_value: 200,
      valid_until: '2026-03-25',
      status: 'active',
      description: '50 adet alımda 25 adet 200 ml Ayran hediye'
    }
  ];

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const expiredCampaigns = campaigns.filter(c => c.status === 'expired');
  const discountCampaigns = activeCampaigns.filter(c => c.type === 'discount');
  const giftCampaigns = activeCampaigns.filter(c => c.type === 'gift');

  // Siparişe Ekle Modal'ını aç
  const handleAddToOrder = (campaign) => {
    setOrderQty(campaign.min_qty);
    setSelectedCustomer(null);
    setOrderModal({ open: true, campaign });
  };

  // Siparişi onayla
  const handleConfirmOrder = async () => {
    if (!selectedCustomer) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }
    
    const { campaign } = orderModal;
    
    try {
      setSubmitting(true);
      
      // API çağrısı
      const resp = await sfSalesAPI.addCampaignToOrder({
        campaign_id: campaign.id,
        customer_id: selectedCustomer,
        qty: orderQty
      });
      
      if (resp.data?.success) {
        const totalPrice = orderQty * campaign.campaign_price;
        const savings = orderQty * (campaign.normal_price - campaign.campaign_price);
        
        toast.success(
          `${campaign.product_name} - ${orderQty} adet siparişe eklendi! ` +
          `Toplam: ${totalPrice.toLocaleString('tr-TR')} TL (${savings.toLocaleString('tr-TR')} TL tasarruf)`
        );
        setOrderModal({ open: false, campaign: null });
        setSelectedCustomer(null);
      } else {
        toast.error(resp.data?.message || 'İşlem başarısız');
      }
    } catch (err) {
      console.error('Kampanya ekleme hatası:', err);
      toast.error(err.response?.data?.detail || 'Kampanya siparişe eklenemedi');
    } finally {
      setSubmitting(false);
    }
  };
  };

  // Ürün emojisi
  const getProductEmoji = (code) => {
    if (code?.includes('SUT') || code?.includes('EDGE')) return '🥛';
    if (code?.includes('AYRAN')) return '🥤';
    if (code?.includes('YOGURT')) return '🥣';
    if (code?.includes('KAKAO')) return '🍫';
    return '📦';
  };

  // Kampanya Kartı
  const CampaignCard = ({ campaign, isExpired = false }) => {
    const discountPercent = Math.round((1 - campaign.campaign_price / campaign.normal_price) * 100);
    const savings = campaign.min_qty * (campaign.normal_price - campaign.campaign_price);
    
    return (
      <div className={`bg-white rounded-2xl border-2 overflow-hidden ${
        isExpired ? 'border-slate-200 opacity-60' : 
        campaign.type === 'gift' ? 'border-purple-300' : 'border-emerald-300'
      }`}>
        {/* Üst Bant */}
        <div className={`px-4 py-2 flex items-center justify-between ${
          isExpired ? 'bg-slate-100' :
          campaign.type === 'gift' ? 'bg-purple-500' : 'bg-emerald-500'
        }`}>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${isExpired ? 'text-slate-600' : 'text-white'}`}>
            {campaign.type === 'gift' ? (
              <><span>🎁</span> HEDİYELİ KAMPANYA</>
            ) : (
              <><span>💰</span> MİKTAR İNDİRİMİ</>
            )}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            isExpired ? 'bg-slate-300 text-slate-600' : 'bg-white/20 text-white'
          }`}>
            {isExpired ? 'Sona Erdi' : `%${discountPercent} Avantaj`}
          </span>
        </div>

        <div className="p-4">
          {/* Ürün Bilgisi */}
          <div className="flex gap-4 mb-4">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">
              {getProductEmoji(campaign.product_code)}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-sm leading-tight">{campaign.product_name}</h4>
              <p className="text-xs text-slate-500 mb-1">{campaign.product_code}</p>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                Min. {campaign.min_qty} adet
              </span>
            </div>
          </div>

          {/* Fiyat Bilgisi */}
          <div className="bg-slate-50 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Normal Birim Fiyat</span>
              <span className="text-sm text-slate-400 line-through">{campaign.normal_price} TL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-600 font-medium">Kampanya Birim Fiyat</span>
              <span className="text-xl font-bold text-emerald-600">{campaign.campaign_price} TL</span>
            </div>
          </div>

          {/* Hediye Bilgisi */}
          {campaign.type === 'gift' && campaign.gift_product_name && (
            <div className="bg-purple-50 rounded-xl p-3 mb-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🎁</span>
                <span className="text-sm font-bold text-purple-700">HEDİYE</span>
              </div>
              <p className="text-sm text-purple-800 font-medium">
                {campaign.gift_qty} adet {campaign.gift_product_name}
              </p>
              <p className="text-xs text-purple-600">
                ({campaign.gift_value} TL değerinde)
              </p>
            </div>
          )}

          {/* Tasarruf */}
          {campaign.type === 'discount' && (
            <div className="bg-emerald-50 rounded-xl p-3 mb-3 border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-700">
                  {campaign.min_qty} adet alımda tasarruf
                </span>
                <span className="text-lg font-bold text-emerald-700">
                  {savings.toLocaleString('tr-TR')} TL
                </span>
              </div>
            </div>
          )}

          {/* Geçerlilik */}
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-slate-400">
              Son: {new Date(campaign.valid_until).toLocaleDateString('tr-TR')}
            </span>
            {!isExpired && (
              <span className={`font-medium ${
                new Date(campaign.valid_until) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  ? 'text-red-500' : 'text-slate-500'
              }`}>
                {Math.ceil((new Date(campaign.valid_until) - new Date()) / (1000 * 60 * 60 * 24))} gün kaldı
              </span>
            )}
          </div>

          {/* Siparişe Ekle Butonu */}
          {!isExpired && (
            <button
              onClick={() => handleAddToOrder(campaign)}
              className={`w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                campaign.type === 'gift' 
                  ? 'bg-purple-500 hover:bg-purple-600' 
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Siparişe Ekle
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6" data-testid="campaigns-page">
      <PageHeader title="Kampanyalar" subtitle="Ana Sayfa / Kampanyalar" />
      
      {/* Özet */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 mb-1">💰 Miktar İndirimi</p>
          <p className="text-2xl font-bold text-emerald-700">{discountCampaigns.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-600 mb-1">🎁 Hediyeli</p>
          <p className="text-2xl font-bold text-purple-700">{giftCampaigns.length}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-600 mb-1">⏰ Sona Eren</p>
          <p className="text-2xl font-bold text-slate-700">{expiredCampaigns.length}</p>
        </div>
      </div>

      {/* Miktar İndirimi */}
      {discountCampaigns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <span>💰</span> Miktar İndirimi Kampanyaları
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {discountCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </div>
      )}

      {/* Hediyeli */}
      {giftCampaigns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
            <span>🎁</span> Hediyeli Kampanyalar
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {giftCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </div>
      )}

      {/* Sona Eren */}
      {expiredCampaigns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">Sona Eren Kampanyalar</h3>
          <div className="grid grid-cols-2 gap-4">
            {expiredCampaigns.map(c => <CampaignCard key={c.id} campaign={c} isExpired />)}
          </div>
        </div>
      )}

      {activeCampaigns.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aktif kampanya bulunmuyor</p>
        </div>
      )}

      {/* Sipariş Modal */}
      {orderModal.open && orderModal.campaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Siparişe Ekle</h3>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{getProductEmoji(orderModal.campaign.product_code)}</span>
                <div>
                  <p className="font-bold text-slate-800">{orderModal.campaign.product_name}</p>
                  <p className="text-xs text-slate-500">{orderModal.campaign.product_code}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Kampanya Fiyatı:</span>
                <span className="font-bold text-emerald-600">{orderModal.campaign.campaign_price} TL/adet</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-2">Sipariş Adedi</label>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setOrderQty(Math.max(orderModal.campaign.min_qty, orderQty - 10))}
                  className="w-12 h-12 bg-slate-100 rounded-xl text-xl font-bold hover:bg-slate-200"
                >-</button>
                <input 
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Math.max(orderModal.campaign.min_qty, parseInt(e.target.value) || 0))}
                  className="flex-1 text-center text-2xl font-bold border border-slate-200 rounded-xl py-2"
                />
                <button 
                  onClick={() => setOrderQty(orderQty + 10)}
                  className="w-12 h-12 bg-slate-100 rounded-xl text-xl font-bold hover:bg-slate-200"
                >+</button>
              </div>
              <p className="text-xs text-orange-600 mt-1">Minimum: {orderModal.campaign.min_qty} adet</p>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">Toplam Tutar:</span>
                <span className="text-xl font-bold text-slate-800">
                  {(orderQty * orderModal.campaign.campaign_price).toLocaleString('tr-TR')} TL
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">Tasarruf:</span>
                <span className="font-bold text-emerald-600">
                  {(orderQty * (orderModal.campaign.normal_price - orderModal.campaign.campaign_price)).toLocaleString('tr-TR')} TL
                </span>
              </div>
            </div>

            {/* Müşteri Seçimi */}
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-2">Müşteri Seçin</label>
              <select
                value={selectedCustomer || ''}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm"
              >
                <option value="">-- Müşteri Seçin --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setOrderModal({ open: false, campaign: null })}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium"
              >
                İptal
              </button>
              <button 
                onClick={handleConfirmOrder}
                disabled={submitting || !selectedCustomer}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  submitting || !selectedCustomer 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {submitting ? 'Ekleniyor...' : 'Siparişe Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlasiyerDashboard;
