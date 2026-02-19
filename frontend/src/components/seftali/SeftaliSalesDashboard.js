import React, { useState, useEffect, useCallback } from 'react';
import { sfSalesAPI } from '../../services/seftaliApi';
import api, { ordersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { 
  Truck, ShoppingBag, Plus, Check, Edit3, Package, LogOut,
  MapPin, Users, Calendar, TrendingUp, Home, Search, Filter,
  Phone, MessageSquare, AlertTriangle, Clock, ChevronRight,
  FileText, BarChart3, RotateCcw, Navigation
} from 'lucide-react';

const SeftaliSalesDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('last_order');

  // Normal plasiyer data
  const [routes, setRoutes] = useState([]);
  const [legacyOrders, setLegacyOrders] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    todayOrders: 0,
    weeklyOrders: 0,
    totalSales: 0,
    pendingOrders: 0,
    suggestedOrders: 0,
    returnRequests: 0
  });

  // Delivery form state
  const [dlvCustomerId, setDlvCustomerId] = useState('');
  const [dlvType, setDlvType] = useState('route');
  const [dlvInvoice, setDlvInvoice] = useState('');
  const [dlvItems, setDlvItems] = useState([{ product_id: '', qty: '' }]);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [custRes, dlvRes, ordRes] = await Promise.all([
        sfSalesAPI.getCustomers(),
        sfSalesAPI.getDeliveries({}),
        sfSalesAPI.getOrders({}),
      ]);
      setCustomers(custRes.data?.data || []);
      setDeliveries(dlvRes.data?.data || []);
      setOrders(ordRes.data?.data || []);

      // Calculate stats
      const pendingCount = (ordRes.data?.data || []).filter(o => o.status === 'submitted').length;
      setStats(prev => ({
        ...prev,
        pendingOrders: pendingCount,
        suggestedOrders: (custRes.data?.data || []).length,
      }));
    } catch {
      toast.error('Veri yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlasiyerData = useCallback(async () => {
    try {
      const [routesRes, ordersRes] = await Promise.all([
        api.get(`/sales-routes/agent/${user.id}`),
        ordersAPI.getAll()
      ]);
      
      setRoutes(routesRes.data || []);
      setLegacyOrders(ordersRes.data || []);
      
      const today = new Date().toDateString();
      const todayCount = ordersRes.data?.filter(o => new Date(o.created_at).toDateString() === today).length || 0;
      
      setStats(prev => ({
        ...prev,
        totalCustomers: routesRes.data?.length || 0,
        todayOrders: todayCount,
        weeklyOrders: ordersRes.data?.length || 0,
        totalSales: 135250, // Mock value - would come from real API
        returnRequests: 2 // Mock value
      }));
    } catch (error) {
      console.error('Plasiyer verileri yuklenemedi:', error);
    }
  }, [user?.id]);

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
    fetchPlasiyerData();
  }, [fetchData, fetchProducts, fetchPlasiyerData]);

  const handleCreateDelivery = async () => {
    if (!dlvCustomerId) { toast.error('Musteri secin'); return; }
    const validItems = dlvItems.filter(it => it.product_id && parseFloat(it.qty) > 0);
    if (validItems.length === 0) { toast.error('En az bir urun ekleyin'); return; }

    setSubmitting(true);
    try {
      await sfSalesAPI.createDelivery({
        customer_id: dlvCustomerId,
        delivery_type: dlvType,
        invoice_no: dlvInvoice || undefined,
        items: validItems.map(it => ({ product_id: it.product_id, qty: parseFloat(it.qty) })),
      });
      toast.success('Teslimat olusturuldu');
      setDlvCustomerId(''); setDlvInvoice(''); setDlvItems([{ product_id: '', qty: '' }]);
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

  // Get today's day name for route filtering
  const getTodayDayCode = () => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[new Date().getDay()];
  };

  const dayTranslations = {
    monday: 'Pazartesi', tuesday: 'Sali', wednesday: 'Carsamba',
    thursday: 'Persembe', friday: 'Cuma', saturday: 'Cumartesi', sunday: 'Pazar',
    MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba',
    THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar'
  };

  // Filter today's route customers
  const todayCode = getTodayDayCode();
  const todayCustomers = customers.filter(c => {
    const routeDays = c.route_plan?.days || [];
    return routeDays.includes(todayCode);
  });

  // Sidebar navigation items
  const sidebarItems = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Home },
    { id: 'customers', label: 'Musteriler', icon: Users },
    { id: 'rut', label: 'Rut', icon: Navigation },
    { id: 'orders', label: 'Siparisler', icon: ShoppingBag },
    { id: 'deliveries', label: 'Teslimatlar', icon: Truck },
    { id: 'create', label: 'Teslimat Olustur', icon: Plus },
    { id: 'analytics', label: 'Analizler', icon: BarChart3 },
    { id: 'returns', label: 'Iade Talepleri', icon: RotateCcw },
  ];

  // Filter customers based on search
  const filteredCustomers = customers.filter(c => 
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'customers': return renderCustomersPage();
      case 'rut': return renderRutPage();
      case 'orders': return renderOrdersPage();
      case 'deliveries': return renderDeliveriesPage();
      case 'create': return renderCreateDelivery();
      case 'analytics': return renderAnalytics();
      case 'returns': return renderReturns();
      default: return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6" data-testid="sales-dashboard">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plasiyer</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Plasiyer</p>
      </div>

      {/* Search Bar */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80">Toplam Satislar (L3M)</p>
          <p className="text-2xl font-bold mt-1">{stats.totalSales.toLocaleString('tr-TR')} TL</p>
          <p className="text-xs opacity-70 mt-1">+{stats.totalCustomers} firma</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 opacity-80" />
            <p className="text-xs font-medium opacity-80">Bekleyen Siparisler</p>
          </div>
          <p className="text-2xl font-bold">{stats.pendingOrders} Siparis</p>
          <p className="text-xs opacity-70 mt-1">5.540 TL Toplam</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 opacity-80" />
            <p className="text-xs font-medium opacity-80">Onerilen Siparisler</p>
          </div>
          <p className="text-2xl font-bold">{stats.suggestedOrders} Firma</p>
          <p className="text-xs opacity-70 mt-1">3.300 TL Tavsiye Edilen</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw className="w-4 h-4 opacity-80" />
            <p className="text-xs font-medium opacity-80">Iade Talepleri</p>
          </div>
          <p className="text-2xl font-bold">{stats.returnRequests} Firma</p>
          <p className="text-xs opacity-70 mt-1">2.870 TL Kontrol Edilmeli</p>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredCustomers.slice(0, 6).map((customer, idx) => (
          <CustomerCard 
            key={customer.id} 
            customer={customer} 
            index={idx}
            onCall={() => toast.info('Arama baslatiliyor...')}
            onMessage={() => toast.info('Mesaj gonderiliyor...')}
            onAlert={() => toast.warning('Uyari gonderildi')}
          />
        ))}
      </div>
    </div>
  );

  const renderCustomersPage = () => (
    <div className="space-y-6" data-testid="customers-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Musteriler</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Musteriler</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Musteri ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-2 gap-4">
        {filteredCustomers.map((customer, idx) => (
          <CustomerCard 
            key={customer.id} 
            customer={customer} 
            index={idx}
            onCall={() => toast.info('Arama baslatiliyor...')}
            onMessage={() => toast.info('Mesaj gonderiliyor...')}
            onAlert={() => toast.warning('Uyari gonderildi')}
          />
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Musteri bulunamadi</p>
        </div>
      )}
    </div>
  );

  const renderRutPage = () => (
    <div className="space-y-6" data-testid="rut-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bugunun Rutu</h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} - {todayCustomers.length} nokta
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl">
          <Navigation className="w-5 h-5 text-orange-600" />
          <span className="text-sm font-medium text-orange-700">Navigasyonu Baslat</span>
        </div>
      </div>

      {/* Today's Route Points */}
      {todayCustomers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Bugun icin planlanmis rut noktasi yok</p>
          <p className="text-sm text-slate-400 mt-1">Rut gunleriniz: Pazartesi, Cuma</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayCustomers.map((customer, idx) => (
            <div key={customer.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all" data-testid={`rut-point-${idx}`}>
              <div className="flex items-start gap-4">
                {/* Route Number */}
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                
                {/* Customer Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{customer.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{customer.code || `SFT-${customer.id?.slice(0, 5)}`}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
                      {customer.channel || 'Perakende'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mt-2 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {customer.address || 'Adres bilgisi yok'}
                  </p>

                  {/* Last Order Info */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Son Siparis: 3 gun once
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Ort: 7 Gun
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-medium hover:bg-emerald-600 transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                    Ara
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-medium hover:bg-orange-600 transition-colors">
                    <Navigation className="w-3.5 h-3.5" />
                    Yol Tarifi
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrdersPage = () => (
    <div className="space-y-6" data-testid="orders-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Siparisler</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Siparisler</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Siparis bulunamadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-2xl p-4" data-testid={`order-${o.id?.slice(0,8)}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{o.customer_name || 'Musteri'}</h3>
                  <p className="text-xs text-slate-500">{o.id?.slice(0, 8)}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  o.status === 'approved' ? 'bg-green-50 text-green-700' :
                  o.status === 'needs_edit' ? 'bg-amber-50 text-amber-700' :
                  o.status === 'submitted' ? 'bg-sky-50 text-sky-700' :
                  'bg-slate-50 text-slate-700'
                }`}>
                  {o.status === 'approved' ? 'Onaylandi' : o.status === 'needs_edit' ? 'Duzenleme' : o.status === 'submitted' ? 'Bekliyor' : o.status}
                </span>
              </div>
              
              <p className="text-sm text-slate-600 mb-3">{(o.items || []).map(it => `${it.product_name || '?'}: ${it.qty}`).join(', ')}</p>
              
              {o.status === 'submitted' && (
                <div className="flex gap-2">
                  <button onClick={() => handleApproveOrder(o.id)} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors">
                    <Check className="w-4 h-4" /> Onayla
                  </button>
                  <button onClick={() => handleRequestEdit(o.id)} className="flex-1 flex items-center justify-center gap-1.5 border border-slate-300 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                    <Edit3 className="w-4 h-4" /> Duzenleme Iste
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDeliveriesPage = () => (
    <div className="space-y-6" data-testid="deliveries-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Teslimatlar</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Teslimatlar</p>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Teslimat bulunamadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map(d => (
            <div key={d.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-bold text-slate-900">{d.customer_name || 'Musteri'}</h3>
                  <p className="text-xs text-slate-500">{d.invoice_no}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  d.acceptance_status === 'accepted' ? 'bg-green-50 text-green-700' :
                  d.acceptance_status === 'rejected' ? 'bg-red-50 text-red-700' :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {d.acceptance_status === 'accepted' ? 'Kabul Edildi' : d.acceptance_status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                </span>
              </div>
              <p className="text-sm text-slate-500">{d.items?.length || 0} urun - {d.delivery_type === 'route' ? 'Rut' : 'Rut Disi'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateDelivery = () => (
    <div className="space-y-6" data-testid="create-delivery">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Yeni Teslimat</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Teslimat Olustur</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Musteri</label>
          <select value={dlvCustomerId} onChange={e => setDlvCustomerId(e.target.value)} 
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
            <option value="">Musteri secin...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Teslimat Tipi</label>
            <select value={dlvType} onChange={e => setDlvType(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              <option value="route">Rut</option>
              <option value="off_route">Rut Disi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Fatura No</label>
            <input type="text" value={dlvInvoice} onChange={e => setDlvInvoice(e.target.value)} 
              placeholder="FTR-XXX" 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Urunler</label>
          {dlvItems.map((item, idx) => (
            <div key={idx} className="flex gap-3 mb-2">
              <select value={item.product_id} onChange={e => {
                const newItems = [...dlvItems]; newItems[idx].product_id = e.target.value; setDlvItems(newItems);
              }} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                <option value="">Urun sec...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
              <input type="number" min="1" placeholder="Adet" value={item.qty} onChange={e => {
                const newItems = [...dlvItems]; newItems[idx].qty = e.target.value; setDlvItems(newItems);
              }} className="w-28 px-4 py-3 border border-slate-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
            </div>
          ))}
          <button onClick={() => setDlvItems([...dlvItems, { product_id: '', qty: '' }])} 
            className="text-sm text-orange-600 hover:text-orange-700 font-medium mt-2">
            + Urun Ekle
          </button>
        </div>

        <button onClick={handleCreateDelivery} disabled={submitting} 
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors">
          {submitting ? 'Kaydediliyor...' : 'Teslimati Kaydet'}
        </button>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analizler</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Analizler</p>
      </div>
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Analiz modulu yakin zamanda eklenecek</p>
      </div>
    </div>
  );

  const renderReturns = () => (
    <div className="space-y-6" data-testid="returns-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Iade Talepleri</h1>
        <p className="text-sm text-slate-500">Ana Sayfa / Iade Talepleri</p>
      </div>
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Henuz iade talebi yok</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col fixed h-full z-30" data-testid="sidebar">
        {/* Logo */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍑</span>
            <span className="text-xl font-bold text-slate-900">Seftali</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-orange-500 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`nav-${item.id}`}>
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-200">
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
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Urun ara..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">3</span>
              <button className="p-2 hover:bg-slate-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                {user?.full_name?.charAt(0) || 'P'}
              </div>
              <span className="text-sm font-medium text-slate-700">{user?.full_name || 'Plasiyer'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
            </div>
          ) : renderContent()}
        </div>
      </main>
    </div>
  );
};

// Customer Card Component
const CustomerCard = ({ customer, index, onCall, onMessage, onAlert }) => {
  const isUrgent = index % 3 === 0; // Mock urgency
  
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all" data-testid={`customer-card-${index}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-900">{customer.name}</h3>
          <p className="text-xs text-slate-500">{customer.code || `SFT-${customer.id?.slice(0, 5)}`} · {customer.channel || 'Perakende'}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-900">3.420 TL</p>
          <p className="text-xs text-slate-500">Ort. Siparis</p>
        </div>
      </div>

      {/* Order Info */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div>
          <p className="text-slate-500">Son Siparis: <span className="font-medium text-slate-700">3</span></p>
          <p className="text-slate-400">Now: 9 Gun / Ort: 7 Gun</p>
        </div>
        <div className="text-right">
          <p className="text-emerald-600 font-medium">2.600 TL <span className="text-slate-500">4 Koli</span></p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button onClick={onCall} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Ara">
            <Phone className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={onMessage} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Mesaj">
            <MessageSquare className="w-4 h-4 text-slate-500" />
          </button>
          <span className="text-xs text-slate-400">12</span>
          <span className="text-xs text-slate-400 flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" /> 0
          </span>
        </div>
        {isUrgent ? (
          <button onClick={onAlert} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition-colors">
            Uyar <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors">
            Gorusme Baslat <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SeftaliSalesDashboard;
