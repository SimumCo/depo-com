import React, { useState, useEffect, useCallback } from 'react';
import { sfSalesAPI } from '../../services/seftaliApi';
import api, { ordersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Truck, ShoppingBag, Plus, Check, Edit3, Package, LogOut,
  MapPin, Users, Calendar, TrendingUp, Home, Search, Filter,
  Phone, MessageSquare, AlertTriangle, Clock, ChevronRight,
  FileText, BarChart3, RotateCcw, Navigation, Map, List
} from 'lucide-react';

// Fix for default marker icons in Leaflet with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom numbered marker icon
const createNumberedIcon = (number) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: #f97316; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white;">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const SeftaliSalesDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('last_order');
  const [rutViewMode, setRutViewMode] = useState('map'); // 'map' or 'list'

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
    { id: 'warehouse', label: 'Depo Taslagi', icon: Package },
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
      case 'warehouse': return <WarehouseDraftPage />;
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

  const renderRutPage = () => {
    // Use real coordinates from customer data, fallback to Istanbul center
    const customerLocations = todayCustomers.map((customer, idx) => ({
      ...customer,
      lat: customer.location?.lat || 41.0082 + (idx * 0.01),
      lng: customer.location?.lng || 28.9784 + (idx * 0.01),
      district: customer.location?.district || '',
    }));

    // Calculate center from customer locations
    const defaultCenter = customerLocations.length > 0
      ? [
          customerLocations.reduce((sum, c) => sum + c.lat, 0) / customerLocations.length,
          customerLocations.reduce((sum, c) => sum + c.lng, 0) / customerLocations.length
        ]
      : [41.0082, 28.9784]; // Istanbul default

    // Create route line coordinates
    const routeCoords = customerLocations.map(c => [c.lat, c.lng]);

    // Open Google Maps navigation
    const openNavigation = (lat, lng) => {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    // Start full route navigation
    const startFullNavigation = () => {
      if (customerLocations.length === 0) return;
      const waypoints = customerLocations.map(c => `${c.lat},${c.lng}`).join('|');
      const destination = customerLocations[customerLocations.length - 1];
      const origin = customerLocations[0];
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&waypoints=${waypoints}`,
        '_blank'
      );
    };

    return (
      <div className="space-y-4" data-testid="rut-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bugunun Rutu</h1>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} - {todayCustomers.length} nokta
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button 
                onClick={() => setRutViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  rutViewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}>
                <Map className="w-4 h-4" />
                Harita
              </button>
              <button 
                onClick={() => setRutViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  rutViewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}>
                <List className="w-4 h-4" />
                Liste
              </button>
            </div>
            <button onClick={startFullNavigation} 
              disabled={customerLocations.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
              <Navigation className="w-4 h-4" />
              Navigasyonu Baslat
            </button>
          </div>
        </div>

        {todayCustomers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Bugun icin planlanmis rut noktasi yok</p>
            <p className="text-sm text-slate-400 mt-1">Rut gunleriniz: Pazartesi, Cuma</p>
          </div>
        ) : rutViewMode === 'map' ? (
          /* Map View */
          <div className="grid grid-cols-3 gap-4">
            {/* Map */}
            <div className="col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ height: 500 }}>
              <MapContainer 
                center={defaultCenter} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Route Line */}
                {routeCoords.length > 1 && (
                  <Polyline 
                    positions={routeCoords} 
                    color="#f97316" 
                    weight={3} 
                    opacity={0.7}
                    dashArray="10, 10"
                  />
                )}
                {/* Markers */}
                {customerLocations.map((customer, idx) => (
                  <Marker 
                    key={customer.id} 
                    position={[customer.lat, customer.lng]}
                    icon={createNumberedIcon(idx + 1)}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.address || 'Adres yok'}</p>
                        <div className="flex gap-2 mt-2">
                          <button className="px-2 py-1 bg-emerald-500 text-white text-xs rounded hover:bg-emerald-600">
                            Ara
                          </button>
                          <button className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600">
                            Yol Tarifi
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Sidebar List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {customerLocations.map((customer, idx) => (
                <div key={customer.id} 
                  className="bg-white border border-slate-200 rounded-xl p-3 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer"
                  data-testid={`rut-point-${idx}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm truncate">{customer.name}</h3>
                      <p className="text-xs text-slate-500 truncate">{customer.address || 'Adres yok'}</p>
                    </div>
                    <button className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {todayCustomers.map((customer, idx) => (
              <div key={customer.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all" data-testid={`rut-point-${idx}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
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
  };

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

// Warehouse Draft Page Component
const WarehouseDraftPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  const fetchDraft = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sfSalesAPI.getWarehouseDraft();
      setData(res.data?.data || null);
    } catch (err) {
      toast.error('Depo taslagi yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDraft(); }, [fetchDraft]);

  const handleSubmit = async () => {
    const now = new Date();
    const hour = now.getHours();
    
    // Saat 17:00 kontrolü (16:00-18:00 arası izin ver)
    if (hour < 16 || hour > 18) {
      toast.error('Depo siparisi sadece 16:00-18:00 arasinda gonderilebilir');
      return;
    }

    try {
      setSubmitting(true);
      await sfSalesAPI.submitWarehouseDraft({ note: '' });
      toast.success('Depo siparisi basariyla gonderildi!');
      fetchDraft();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gonderim hatasi');
    } finally {
      setSubmitting(false);
    }
  };

  // Countdown to 17:00
  const getTimeUntil17 = () => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(17, 0, 0, 0);
    
    if (now > target) {
      // Eğer 17:00 geçtiyse, yarın 17:00
      target.setDate(target.getDate() + 1);
    }
    
    const diff = target - now;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    
    return { hours, mins, isPast: now.getHours() >= 17 && now.getHours() < 18 };
  };

  const timeInfo = getTimeUntil17();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Veri yuklenemedi</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="warehouse-draft-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Depo Siparis Taslagi</h1>
          <p className="text-sm text-slate-500">
            Yarin ({data.route_day_label}) rutu icin hazirlanmis siparis
          </p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${timeInfo.isPast ? 'text-emerald-600' : 'text-slate-600'}`}>
            {timeInfo.isPast ? (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Gonderim saati aktif!
              </span>
            ) : (
              <span>Gonderim: {timeInfo.hours}s {timeInfo.mins}dk sonra</span>
            )}
          </div>
          <p className="text-xs text-slate-400">Her gun saat 17:00</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80">Toplam Musteri</p>
          <p className="text-2xl font-bold mt-1">{data.customer_count}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 opacity-80" />
            <p className="text-xs font-medium opacity-80">Siparis Veren</p>
          </div>
          <p className="text-2xl font-bold">{data.order_count}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 opacity-80" />
            <p className="text-xs font-medium opacity-80">Taslaktan</p>
          </div>
          <p className="text-2xl font-bold">{data.draft_count}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80">Toplam Adet</p>
          <p className="text-2xl font-bold mt-1">{data.grand_total_qty}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Musteriler</h2>
          {data.customers?.map((cust, idx) => (
            <div key={cust.customer_id} 
              className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                cust.source === 'order' ? 'border-emerald-200' : 'border-amber-200'
              }`}
              data-testid={`warehouse-customer-${idx}`}>
              <button 
                onClick={() => setExpandedCustomer(expandedCustomer === cust.customer_id ? null : cust.customer_id)}
                className="w-full p-4 text-left hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                      cust.source === 'order' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{cust.customer_name}</h3>
                      <p className="text-xs text-slate-500">
                        {cust.source === 'order' ? (
                          <span className="text-emerald-600">✓ Siparis gonderdi</span>
                        ) : (
                          <span className="text-amber-600">○ Sistem taslagi</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{cust.total_qty}</p>
                      <p className="text-xs text-slate-500">{cust.item_count} cesit</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${
                      expandedCustomer === cust.customer_id ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>
              </button>
              
              {/* Expanded Items */}
              {expandedCustomer === cust.customer_id && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="mt-3 space-y-2">
                    {cust.items?.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.product_name}</p>
                          <p className="text-xs text-slate-400">{item.product_code}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-700">{item.qty} Adet</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {data.customers?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Yarin icin rut musterisi yok</p>
            </div>
          )}
        </div>

        {/* Product Summary */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sticky top-24">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Urun Toplami</h2>
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.product_totals?.map((pt, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{pt.product_name}</p>
                    <p className="text-xs text-slate-400">{pt.product_code}</p>
                  </div>
                  <span className="text-sm font-bold text-orange-600">{pt.total_qty}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-semibold text-slate-700">Toplam</span>
                <span className="text-xl font-bold text-orange-600">{data.grand_total_qty} Adet</span>
              </div>
              
              <button onClick={handleSubmit}
                disabled={submitting || data.customer_count === 0}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
                  submitting || data.customer_count === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
                data-testid="submit-warehouse-btn">
                {submitting ? 'Gonderiliyor...' : 'Depoya Gonder'}
              </button>
              
              <p className="text-xs text-slate-400 text-center mt-2">
                Gonderim saati: 17:00
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeftaliSalesDashboard;
