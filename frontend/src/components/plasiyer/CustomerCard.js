// Plasiyer - Gelişmiş Müşteri Kartı Bileşeni
import React, { useState, useEffect } from 'react';
import { 
  Phone, MessageSquare, Calendar, FileText, ShoppingBag, 
  ChevronRight, MapPin, Clock, Edit3, X, User, Mail,
  CheckCircle, AlertCircle, Package, AlertTriangle
} from 'lucide-react';
import { sfSalesAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';

// Gün çevirisi
const dayLabels = {
  MON: 'Pzt', TUE: 'Sal', WED: 'Çar', THU: 'Per', FRI: 'Cum', SAT: 'Cmt', SUN: 'Paz'
};

const CustomerCard = ({ 
  customer, 
  index, 
  onCall, 
  onMessage, 
  onViewDetail,
  deliveries = [],
  orders = []
}) => {
  // Müşteri verileri (API'den gelen özet veriler)
  const routeDays = customer.route_plan?.days || [];
  const routeLabel = routeDays.map(d => dayLabels[d] || d).join(', ');
  
  // API'den gelen özet veriler
  const pendingOrdersCount = customer.pending_orders_count || 0;
  const overdueCount = customer.overdue_deliveries_count || 0;
  const daysSinceLastOrder = customer.days_since_last_order;
  const totalDeliveries = customer.total_deliveries || 0;
  
  // Mesaj sayısı (örnek)
  const messageCount = customer.unread_messages || 0;

  return (
    <div 
      className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-lg hover:border-orange-200 transition-all" 
      data-testid={`customer-card-${index}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{customer.name}</h3>
          <p className="text-xs text-slate-500">
            {customer.code || `MUS-${customer.id?.slice(0, 5)}`}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {pendingOrdersCount > 0 && (
            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
              {pendingOrdersCount} Sipariş
            </span>
          )}
          {overdueCount > 0 && (
            <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />
              {overdueCount} Vadeli
            </span>
          )}
          {messageCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
              {messageCount} Mesaj
            </span>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Rut Günleri */}
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Calendar className="w-3 h-3" />
            <span className="text-[10px] font-medium">Rut Günleri</span>
          </div>
          <p className="text-xs font-semibold text-slate-800">
            {routeLabel || 'Belirlenmemiş'}
          </p>
        </div>
        
        {/* Son Sipariş */}
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-medium">Son Sipariş</span>
          </div>
          <p className={`text-xs font-semibold ${
            daysSinceLastOrder === null || daysSinceLastOrder === undefined ? 'text-slate-400' :
            daysSinceLastOrder > 7 ? 'text-red-600' :
            daysSinceLastOrder > 3 ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {daysSinceLastOrder === null || daysSinceLastOrder === undefined ? 'Yok' : 
             daysSinceLastOrder === 0 ? 'Bugün' : 
             `${daysSinceLastOrder} gün önce`}
          </p>
        </div>
        
        {/* Toplam Teslimat */}
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <FileText className="w-3 h-3" />
            <span className="text-[10px] font-medium">Teslimatlar</span>
          </div>
          <p className="text-xs font-semibold text-slate-800">
            {totalDeliveries} adet
          </p>
        </div>
        
        {/* Bekleyen Siparişler */}
        <div className={`rounded-lg p-2 ${pendingOrdersCount > 0 ? 'bg-emerald-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <ShoppingBag className="w-3 h-3" />
            <span className="text-[10px] font-medium">Bekleyen</span>
          </div>
          <p className={`text-xs font-semibold ${pendingOrdersCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {pendingOrdersCount > 0 ? `${pendingOrdersCount} sipariş` : 'Yok'}
          </p>
        </div>
      </div>

      {/* Adres */}
      {customer.address && (
        <div className="flex items-start gap-1.5 mb-3 text-xs text-slate-500">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{customer.address}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onCall?.(customer)}
            className="p-2 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors text-slate-500"
            title="Ara"
            data-testid={`call-btn-${index}`}
          >
            <Phone className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onMessage?.(customer)}
            className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-slate-500 relative"
            title="Mesaj"
            data-testid={`message-btn-${index}`}
          >
            <MessageSquare className="w-4 h-4" />
            {messageCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {messageCount}
              </span>
            )}
          </button>
        </div>
        
        <button 
          onClick={() => onViewDetail?.(customer)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors"
          data-testid={`detail-btn-${index}`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Detay
        </button>
      </div>
    </div>
  );
};

// Müşteri Detay Modal - Mobil Uyumlu Tab Yapısı
export const CustomerDetailModal = ({ 
  customer, 
  isOpen, 
  onClose, 
  deliveries = [],
  orders = [],
  onSave
}) => {
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // info, stats, deliveries, messages
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [consumptionData, setConsumptionData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        code: customer.code || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        channel: customer.channel || 'retail',
        route_days: customer.route_plan?.days || [],
      });
      setActiveTab('info');
      setEditMode(false);
      setConsumptionData(null); // Reset consumption data when customer changes
    }
  }, [customer]);

  // Tüketim istatistiklerini çek
  useEffect(() => {
    const fetchConsumption = async () => {
      if (activeTab === 'stats' && customer?.id && !consumptionData) {
        setLoadingStats(true);
        try {
          const API_BASE = process.env.REACT_APP_BACKEND_URL;
          const token = localStorage.getItem('token');
          // Plasiyer için yeni endpoint kullan
          const resp = await fetch(`${API_BASE}/api/seftali/sales/customers/${customer.id}/consumption`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
            const data = await resp.json();
            setConsumptionData(data?.data?.products || []);
          } else {
            setConsumptionData([]);
          }
        } catch (err) {
          console.error('Tüketim verisi alınamadı:', err);
          setConsumptionData([]);
        } finally {
          setLoadingStats(false);
        }
      }
    };
    fetchConsumption();
  }, [activeTab, customer, consumptionData]);

  if (!isOpen || !customer) return null;

  const routeDays = customer.route_plan?.days || [];
  const customerDeliveries = deliveries.filter(d => d.customer_id === customer.id);
  const customerOrders = orders.filter(o => o.customer_id === customer.id);
  const pendingOrders = customerOrders.filter(o => ['submitted', 'approved'].includes(o.status));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(customer.id, formData);
      toast.success('Müşteri bilgileri güncellendi');
      setEditMode(false);
    } catch (err) {
      toast.error('Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day) => {
    const days = formData.route_days || [];
    if (days.includes(day)) {
      setFormData({ ...formData, route_days: days.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, route_days: [...days, day] });
    }
  };

  // Tab butonları
  const tabs = [
    { id: 'info', label: 'Bilgiler', icon: User },
    { id: 'stats', label: 'Tüketim', icon: Package },
    { id: 'deliveries', label: 'Teslimatlar', icon: FileText },
    { id: 'messages', label: 'Mesajlar', icon: MessageSquare },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header - Kompakt */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{customer.name}</h2>
            <p className="text-xs text-slate-500">{customer.code || `MUS-${customer.id?.slice(0, 6)}`}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors ml-2"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tab Butonları */}
        <div className="flex border-b border-slate-200 bg-white px-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-orange-600 border-orange-500'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          
          {/* TAB: Müşteri Bilgileri */}
          {activeTab === 'info' && (
            <div className="space-y-3">
              {/* Düzenle/Kaydet Butonu */}
              <div className="flex justify-end">
                {!editMode ? (
                  <button 
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Düzenle
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditMode(false)}
                      className="px-3 py-1.5 text-slate-600 text-xs font-medium bg-slate-100 rounded-lg"
                    >
                      İptal
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                )}
              </div>

              {editMode ? (
                // Düzenleme Formu
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Müşteri Adı</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Telefon</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">E-posta</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Adres</label>
                    <textarea 
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Rut Günleri</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            formData.route_days?.includes(day)
                              ? 'bg-orange-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {dayLabels[day]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Görüntüleme Modu
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">Telefon</p>
                        <p className="font-medium text-slate-800">{customer.phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">E-posta</p>
                        <p className="font-medium text-slate-800 text-xs truncate">{customer.email || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500 text-xs">Adres</p>
                        <p className="font-medium text-slate-800 text-sm">{customer.address || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-500 text-xs mb-2">Rut Günleri</p>
                    <div className="flex flex-wrap gap-1">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                        <span
                          key={day}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            routeDays.includes(day)
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {dayLabels[day]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bekleyen Siparişler Özet */}
                  {pendingOrders.length > 0 && (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-emerald-700 text-xs font-medium mb-2">
                        {pendingOrders.length} Bekleyen Sipariş
                      </p>
                      {pendingOrders.slice(0, 2).map((order, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-1">
                          <span className="text-slate-700">
                            {order.items?.length || 0} ürün - {order.items?.reduce((s, i) => s + (i.qty || 0), 0)} adet
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            order.status === 'approved' ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                          }`}>
                            {order.status === 'approved' ? 'Onaylı' : 'Bekliyor'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: Tüketim İstatistikleri */}
          {activeTab === 'stats' && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-xl p-3">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Günlük Tüketim Ortalaması</h4>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : consumptionData && consumptionData.length > 0 ? (
                  <div className="space-y-2">
                    {consumptionData.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-2.5 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.product_name || 'Ürün'}</p>
                          <p className="text-xs text-slate-500">Günlük ortalama</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{(item.daily_avg || 0).toFixed(1)}</p>
                          <p className="text-[10px] text-slate-500">adet/gün</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-blue-700 text-center py-4">Henüz tüketim verisi yok</p>
                )}
              </div>

              {/* Son siparişlerden hesaplanan özet */}
              <div className="bg-slate-50 rounded-xl p-3">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Sipariş Özeti</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg p-2.5 text-center">
                    <p className="text-2xl font-bold text-slate-800">{customer.total_orders || 0}</p>
                    <p className="text-xs text-slate-500">Toplam Sipariş</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center">
                    <p className="text-2xl font-bold text-slate-800">{customer.total_deliveries || 0}</p>
                    <p className="text-xs text-slate-500">Toplam Teslimat</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Geçmiş Teslimatlar */}
          {activeTab === 'deliveries' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2">
                Toplam {customerDeliveries.length} teslimat
              </p>
              {customerDeliveries.length > 0 ? (
                customerDeliveries.slice(0, 15).map((delivery, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-medium text-slate-800">
                        {delivery.invoice_no || `FTR-${delivery.id?.slice(0, 6)}`}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        delivery.acceptance_status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                        delivery.acceptance_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {delivery.acceptance_status === 'accepted' ? 'Kabul' :
                         delivery.acceptance_status === 'rejected' ? 'Red' : 'Bekliyor'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(delivery.delivered_at || delivery.created_at).toLocaleDateString('tr-TR')} • {delivery.items?.length || 0} ürün
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Teslimat kaydı yok</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Mesajlar */}
          {activeTab === 'messages' && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-2">Mesaj özelliği yakında eklenecek</p>
              <p className="text-xs text-slate-400">Müşteri ile iletişim geçmişiniz burada görünecek</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;
