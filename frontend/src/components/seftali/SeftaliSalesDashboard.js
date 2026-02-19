import React, { useState, useEffect, useCallback } from 'react';
import { sfSalesAPI } from '../../services/seftaliApi';
import api, { ordersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { 
  Truck, ShoppingBag, Plus, Check, Edit3, Package, LogOut,
  MapPin, Users, Calendar, TrendingUp, Home, MoreHorizontal, ArrowLeft
} from 'lucide-react';
import ProductCatalog from '../ProductCatalog';
import CustomerOrders from '../CustomerOrders';

const SeftaliSalesDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Normal plasiyer data
  const [routes, setRoutes] = useState([]);
  const [legacyOrders, setLegacyOrders] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    todayOrders: 0,
    weeklyOrders: 0
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
    } catch {
      toast.error('Veri yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  // Normal plasiyer verilerini çek
  const fetchPlasiyerData = useCallback(async () => {
    try {
      const [routesRes, ordersRes] = await Promise.all([
        api.get(`/sales-routes/agent/${user.id}`),
        ordersAPI.getAll()
      ]);
      
      setRoutes(routesRes.data || []);
      setLegacyOrders(ordersRes.data || []);
      
      setStats({
        totalCustomers: routesRes.data?.length || 0,
        todayOrders: ordersRes.data?.filter(o => {
          const today = new Date().toDateString();
          return new Date(o.created_at).toDateString() === today;
        }).length || 0,
        weeklyOrders: ordersRes.data?.length || 0
      });
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
      toast.success('Teslimat olusturuldu (pending)');
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

  // Bottom navigation tabs (mobile-first)
  const mainTabs = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Home },
    { id: 'create', label: 'Teslimat', icon: Plus },
    { id: 'deliveries', label: 'Teslimatlar', icon: Truck },
    { id: 'orders', label: 'Siparisler', icon: ShoppingBag },
    { id: 'more', label: 'Daha Fazla', icon: MoreHorizontal },
  ];

  // Extra modules from normal Plasiyer
  const extraModules = [
    { id: 'routes', name: 'Rotalarim', icon: MapPin, color: 'text-blue-600 bg-blue-50' },
    { id: 'customers', name: 'Musterilerim', icon: Users, color: 'text-green-600 bg-green-50' },
    { id: 'legacy_orders', name: 'Eski Siparisler', icon: ShoppingBag, color: 'text-purple-600 bg-purple-50' },
    { id: 'products', name: 'Urun Katalogu', icon: Package, color: 'text-orange-600 bg-orange-50' },
  ];

  const isExtraTab = ['routes', 'customers', 'legacy_orders', 'products'].includes(activeTab);

  const dayTranslations = {
    monday: 'Pazartesi', tuesday: 'Sali', wednesday: 'Carsamba',
    thursday: 'Persembe', friday: 'Cuma', saturday: 'Cumartesi', sunday: 'Pazar',
    MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba',
    THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar'
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'create': return renderCreateDelivery();
      case 'deliveries': return renderDeliveries();
      case 'orders': return renderOrders();
      case 'more': return renderMoreMenu();
      case 'routes': return renderRoutes();
      case 'customers': return renderCustomers();
      case 'legacy_orders': return renderLegacyOrders();
      case 'products': return renderProductCatalog();
      default: return renderDashboardHome();
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
              className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-sky-300 hover:shadow-sm transition-all"
              data-testid={`more-${mod.id}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${mod.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{mod.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderRoutes = () => (
    <div className="space-y-3" data-testid="routes-list">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Teslimat Rotalarim</h3>
      {routes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Henuz rota atanmamis</p>
        </div>
      ) : (
        routes.map((route) => (
          <div key={route.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">{route.customer_name}</h4>
                <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {route.location || 'Konum bilgisi yok'}
                </p>
                <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Teslimat Gunu: <span className="font-medium">{dayTranslations[route.delivery_day] || route.delivery_day}</span>
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                route.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
              }`}>
                {route.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCustomers = () => (
    <div data-testid="customers-list">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Musteri Listesi</h3>
      <div className="grid grid-cols-1 gap-3">
        {/* Seftali Müşterileri */}
        {customers.length > 0 && (
          <>
            <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Seftali Musterileri</p>
            {customers.map((customer) => (
              <div key={customer.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <h4 className="font-medium text-slate-900">{customer.name}</h4>
                <p className="text-sm text-slate-600 mt-1">{customer.address || 'Adres yok'}</p>
                {customer.route_plan?.days && (
                  <p className="text-xs text-slate-500 mt-2">
                    Rota: {customer.route_plan.days.map(d => dayTranslations[d] || d).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </>
        )}
        
        {/* Normal Rota Müşterileri */}
        {routes.length > 0 && (
          <>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mt-4">Rota Musterileri</p>
            {routes.map((route) => (
              <div key={route.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <h4 className="font-medium text-slate-900">{route.customer_name}</h4>
                <p className="text-sm text-slate-600 mt-1">{route.location || 'Konum yok'}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Teslimat: {dayTranslations[route.delivery_day] || route.delivery_day}
                </p>
              </div>
            ))}
          </>
        )}

        {customers.length === 0 && routes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Musteri bulunamadi</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderLegacyOrders = () => (
    <div data-testid="legacy-orders">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Eski Siparisler</h3>
      <CustomerOrders orders={legacyOrders} onUpdate={fetchPlasiyerData} />
    </div>
  );

  const renderProductCatalog = () => (
    <div data-testid="product-catalog">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Urun Katalogu</h3>
      <ProductCatalog onOrderCreated={fetchPlasiyerData} />
    </div>
  );

  const renderDashboardHome = () => (
    <div className="space-y-4" data-testid="sales-home">
      {/* Stats Cards - Seftali */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <Truck className="w-6 h-6 text-sky-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">{deliveries.filter(d => d.acceptance_status === 'pending').length}</p>
          <p className="text-xs text-slate-500">Bekleyen Teslimat</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <ShoppingBag className="w-6 h-6 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">{orders.filter(o => o.status === 'submitted').length}</p>
          <p className="text-xs text-slate-500">Onay Bekleyen Siparis</p>
        </div>
      </div>

      {/* Stats Cards - Normal Plasiyer */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 border-l-4 border-l-blue-500">
          <p className="text-xs text-slate-500">Toplam Musteri</p>
          <p className="text-xl font-bold text-slate-800">{stats.totalCustomers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 border-l-4 border-l-green-500">
          <p className="text-xs text-slate-500">Bugunun Siparisi</p>
          <p className="text-xl font-bold text-slate-800">{stats.todayOrders}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 border-l-4 border-l-purple-500">
          <p className="text-xs text-slate-500">Haftalik</p>
          <p className="text-xl font-bold text-slate-800">{stats.weeklyOrders}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <button onClick={() => setActiveTab('create')} 
        className="w-full bg-sky-600 text-white py-3 rounded-xl font-medium hover:bg-sky-700 flex items-center justify-center gap-2 transition-colors" 
        data-testid="create-delivery-shortcut">
        <Plus className="w-5 h-5" /> Yeni Teslimat Olustur
      </button>

      {/* Quick access to extra modules */}
      <div className="grid grid-cols-4 gap-2">
        {extraModules.map(mod => {
          const Icon = mod.icon;
          return (
            <button key={mod.id} onClick={() => setActiveTab(mod.id)}
              className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center hover:border-sky-300 transition-all"
              data-testid={`quick-${mod.id}`}>
              <Icon className={`w-5 h-5 mb-1 ${mod.color.split(' ')[0]}`} />
              <span className="text-[10px] text-slate-600 font-medium text-center">{mod.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderCreateDelivery = () => (
    <div className="space-y-4" data-testid="create-delivery-form">
      <h3 className="text-lg font-semibold text-slate-900">Yeni Teslimat Olustur</h3>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Musteri</label>
        <select value={dlvCustomerId} onChange={e => setDlvCustomerId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent" data-testid="customer-select">
          <option value="">Musteri secin...</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teslimat Tipi</label>
          <select value={dlvType} onChange={e => setDlvType(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent" data-testid="delivery-type-select">
            <option value="route">Rota</option>
            <option value="off_route">Rota Disi</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fatura No</label>
          <input type="text" value={dlvInvoice} onChange={e => setDlvInvoice(e.target.value)} placeholder="FTR-XXX" className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent" data-testid="invoice-input" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Urunler</label>
        {dlvItems.map((item, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <select value={item.product_id} onChange={e => {
              const newItems = [...dlvItems]; newItems[idx].product_id = e.target.value; setDlvItems(newItems);
            }} className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent" data-testid={`product-select-${idx}`}>
              <option value="">Urun sec...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
            <input type="number" min="1" placeholder="Adet" value={item.qty} onChange={e => {
              const newItems = [...dlvItems]; newItems[idx].qty = e.target.value; setDlvItems(newItems);
            }} className="w-24 px-2 py-2.5 border border-slate-300 rounded-xl text-sm text-center focus:ring-2 focus:ring-sky-500 focus:border-transparent" data-testid={`qty-input-${idx}`} />
          </div>
        ))}
        <button onClick={() => setDlvItems([...dlvItems, { product_id: '', qty: '' }])} className="text-sm text-sky-600 hover:text-sky-700 font-medium" data-testid="add-item-btn">
          + Urun Ekle
        </button>
      </div>
      <button onClick={handleCreateDelivery} disabled={submitting} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors" data-testid="save-delivery-btn">
        {submitting ? 'Kaydediliyor...' : 'Teslimati Kaydet'}
      </button>
    </div>
  );

  const renderDeliveries = () => (
    <div className="space-y-3" data-testid="deliveries-list">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Teslimatlar</h3>
      {deliveries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Teslimat yok</p>
        </div>
      ) : deliveries.map(d => (
        <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`dlv-row-${d.id?.slice(0,8)}`}>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium text-slate-800">{d.customer_name || d.customer_id?.slice(0, 8)}</span>
              <span className="text-xs text-slate-400 ml-2">{d.invoice_no}</span>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              d.acceptance_status === 'accepted' ? 'bg-green-50 text-green-700' :
              d.acceptance_status === 'rejected' ? 'bg-red-50 text-red-700' :
              'bg-amber-50 text-amber-700'
            }`}>{d.acceptance_status === 'accepted' ? 'Kabul' : d.acceptance_status === 'rejected' ? 'Red' : 'Bekliyor'}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">{d.items?.length || 0} urun - {d.delivery_type === 'route' ? 'Rota' : 'Rota Disi'}</p>
        </div>
      ))}
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-3" data-testid="orders-list">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Siparisler</h3>
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Siparis yok</p>
        </div>
      ) : orders.map(o => (
        <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`order-row-${o.id?.slice(0,8)}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-800">{o.customer_name || o.customer_id?.slice(0, 8)}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              o.status === 'approved' ? 'bg-green-50 text-green-700' :
              o.status === 'needs_edit' ? 'bg-amber-50 text-amber-700' :
              o.status === 'submitted' ? 'bg-sky-50 text-sky-700' :
              'bg-slate-50 text-slate-700'
            }`}>{o.status === 'approved' ? 'Onaylandi' : o.status === 'needs_edit' ? 'Duzenleme' : o.status === 'submitted' ? 'Bekliyor' : o.status}</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">{(o.items || []).map(it => `${it.product_name || '?'}: ${it.qty}`).join(', ')}</p>
          {o.status === 'submitted' && (
            <div className="flex gap-2">
              <button onClick={() => handleApproveOrder(o.id)} className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors" data-testid="approve-btn">
                <Check className="w-3.5 h-3.5" /> Onayla
              </button>
              <button onClick={() => handleRequestEdit(o.id)} className="flex-1 flex items-center justify-center gap-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors" data-testid="edit-request-btn">
                <Edit3 className="w-3.5 h-3.5" /> Duzenleme Iste
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="peach">🍑</span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Seftali - Plasiyer</h1>
            <p className="text-xs text-slate-500">{user?.full_name}</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors" data-testid="logout-btn">
          <LogOut className="w-3.5 h-3.5" />
          Cikis
        </button>
      </header>

      {/* Content */}
      <main className={`mx-auto px-4 py-4 ${isExtraTab ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {isExtraTab && (
          <button onClick={() => setActiveTab('more')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4" data-testid="back-to-more">
            <ArrowLeft className="w-4 h-4" /> Geri
          </button>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
          </div>
        ) : renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20" data-testid="bottom-nav">
        <div className="max-w-2xl mx-auto flex">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (isExtraTab && tab.id === 'more');
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-2 relative transition-colors ${isActive ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                data-testid={`nav-${tab.id}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="h-16" />
    </div>
  );
};

export default SeftaliSalesDashboard;
