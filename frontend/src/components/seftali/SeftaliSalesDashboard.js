import React, { useState, useEffect, useCallback } from 'react';
import { sfSalesAPI } from '../../services/seftaliApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Truck, ShoppingBag, Plus, Check, Edit3, Package } from 'lucide-react';

const SeftaliSalesDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => { fetchData(); fetchProducts(); }, [fetchData, fetchProducts]);

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

  const tabs = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Package },
    { id: 'create', label: 'Teslimat Olustur', icon: Plus },
    { id: 'deliveries', label: 'Teslimatlar', icon: Truck },
    { id: 'orders', label: 'Siparisler', icon: ShoppingBag },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'create': return renderCreateDelivery();
      case 'deliveries': return renderDeliveries();
      case 'orders': return renderOrders();
      default: return renderDashboardHome();
    }
  };

  const renderDashboardHome = () => (
    <div className="space-y-4" data-testid="sales-home">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <Truck className="w-6 h-6 text-sky-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">{deliveries.filter(d => d.acceptance_status === 'pending').length}</p>
          <p className="text-xs text-slate-500">Bekleyen Teslimat</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <ShoppingBag className="w-6 h-6 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">{orders.filter(o => o.status === 'submitted').length}</p>
          <p className="text-xs text-slate-500">Onay Bekleyen Siparis</p>
        </div>
      </div>
      <button onClick={() => setActiveTab('create')} className="w-full bg-sky-600 text-white py-3 rounded-lg font-medium hover:bg-sky-700 flex items-center justify-center gap-2" data-testid="create-delivery-shortcut">
        <Plus className="w-4 h-4" /> Yeni Teslimat Olustur
      </button>
    </div>
  );

  const renderCreateDelivery = () => (
    <div className="space-y-4" data-testid="create-delivery-form">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Musteri</label>
        <select value={dlvCustomerId} onChange={e => setDlvCustomerId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" data-testid="customer-select">
          <option value="">Musteri secin...</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teslimat Tipi</label>
          <select value={dlvType} onChange={e => setDlvType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" data-testid="delivery-type-select">
            <option value="route">Rota</option>
            <option value="off_route">Rota Disi</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fatura No</label>
          <input type="text" value={dlvInvoice} onChange={e => setDlvInvoice(e.target.value)} placeholder="FTR-XXX" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" data-testid="invoice-input" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Urunler</label>
        {dlvItems.map((item, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <select value={item.product_id} onChange={e => {
              const newItems = [...dlvItems]; newItems[idx].product_id = e.target.value; setDlvItems(newItems);
            }} className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm" data-testid={`product-select-${idx}`}>
              <option value="">Urun sec...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
            <input type="number" min="1" placeholder="Adet" value={item.qty} onChange={e => {
              const newItems = [...dlvItems]; newItems[idx].qty = e.target.value; setDlvItems(newItems);
            }} className="w-24 px-2 py-2 border border-slate-300 rounded-md text-sm text-center" data-testid={`qty-input-${idx}`} />
          </div>
        ))}
        <button onClick={() => setDlvItems([...dlvItems, { product_id: '', qty: '' }])} className="text-sm text-sky-600 hover:text-sky-700 font-medium" data-testid="add-item-btn">
          + Urun Ekle
        </button>
      </div>
      <button onClick={handleCreateDelivery} disabled={submitting} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50" data-testid="save-delivery-btn">
        {submitting ? 'Kaydediliyor...' : 'Teslimati Kaydet'}
      </button>
    </div>
  );

  const renderDeliveries = () => (
    <div className="space-y-3" data-testid="deliveries-list">
      {deliveries.length === 0 ? (
        <div className="text-center py-12"><Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 text-sm">Teslimat yok</p></div>
      ) : deliveries.map(d => (
        <div key={d.id} className="bg-white border border-slate-200 rounded-lg p-3" data-testid={`dlv-row-${d.id?.slice(0,8)}`}>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium text-slate-800">{d.customer_name || d.customer_id?.slice(0, 8)}</span>
              <span className="text-xs text-slate-400 ml-2">{d.invoice_no}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              d.acceptance_status === 'accepted' ? 'bg-green-50 text-green-700' :
              d.acceptance_status === 'rejected' ? 'bg-red-50 text-red-700' :
              'bg-amber-50 text-amber-700'
            }`}>{d.acceptance_status}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{d.items?.length || 0} urun - {d.delivery_type === 'route' ? 'Rota' : 'Rota Disi'}</p>
        </div>
      ))}
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-3" data-testid="orders-list">
      {orders.length === 0 ? (
        <div className="text-center py-12"><ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 text-sm">Siparis yok</p></div>
      ) : orders.map(o => (
        <div key={o.id} className="bg-white border border-slate-200 rounded-lg p-3" data-testid={`order-row-${o.id?.slice(0,8)}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-800">{o.customer_name || o.customer_id?.slice(0, 8)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              o.status === 'approved' ? 'bg-green-50 text-green-700' :
              o.status === 'needs_edit' ? 'bg-amber-50 text-amber-700' :
              o.status === 'submitted' ? 'bg-sky-50 text-sky-700' :
              'bg-slate-50 text-slate-700'
            }`}>{o.status}</span>
          </div>
          <p className="text-xs text-slate-500 mb-2">{(o.items || []).map(it => `${it.product_name || '?'}: ${it.qty}`).join(', ')}</p>
          {o.status === 'submitted' && (
            <div className="flex gap-2">
              <button onClick={() => handleApproveOrder(o.id)} className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 text-white py-1.5 rounded-md text-xs font-medium hover:bg-emerald-700" data-testid="approve-btn">
                <Check className="w-3 h-3" /> Onayla
              </button>
              <button onClick={() => handleRequestEdit(o.id)} className="flex-1 flex items-center justify-center gap-1 border border-slate-300 text-slate-600 py-1.5 rounded-md text-xs font-medium hover:bg-slate-50" data-testid="edit-request-btn">
                <Edit3 className="w-3 h-3" /> Duzenleme Iste
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Seftali - Satis</h1>
          <p className="text-xs text-slate-500">{user?.full_name}</p>
        </div>
        <button onClick={logout} className="text-xs text-slate-500 hover:text-red-600" data-testid="logout-btn">Cikis</button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 mb-4" data-testid="sales-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>
        ) : renderContent()}
      </main>
    </div>
  );
};

export default SeftaliSalesDashboard;
