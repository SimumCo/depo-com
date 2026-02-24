// Plasiyer - Gelişmiş Müşteri Kartı Bileşeni
import React, { useState, useEffect } from 'react';
import { 
  Phone, MessageSquare, Calendar, FileText, ShoppingBag, 
  ChevronRight, MapPin, Clock, Edit3, X, User, Mail,
  CheckCircle, AlertCircle, Package
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
  // Müşteri verileri
  const routeDays = customer.route_plan?.days || [];
  const routeLabel = routeDays.map(d => dayLabels[d] || d).join(', ');
  
  // Son teslimatlar (bu müşteriye ait)
  const customerDeliveries = deliveries.filter(d => d.customer_id === customer.id).slice(0, 3);
  const lastDelivery = customerDeliveries[0];
  
  // Bekleyen siparişler
  const pendingOrders = orders.filter(o => 
    o.customer_id === customer.id && 
    ['submitted', 'approved'].includes(o.status)
  );
  
  // Mesaj sayısı (örnek)
  const messageCount = customer.unread_messages || 0;
  
  // Son sipariş tarihi hesapla
  const getLastOrderDays = () => {
    if (!lastDelivery?.delivered_at) return null;
    const lastDate = new Date(lastDelivery.delivered_at);
    const today = new Date();
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const lastOrderDays = getLastOrderDays();

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
        <div className="flex items-center gap-1">
          {pendingOrders.length > 0 && (
            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
              {pendingOrders.length} Sipariş
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
            lastOrderDays === null ? 'text-slate-400' :
            lastOrderDays > 7 ? 'text-red-600' :
            lastOrderDays > 3 ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {lastOrderDays === null ? 'Yok' : 
             lastOrderDays === 0 ? 'Bugün' : 
             `${lastOrderDays} gün önce`}
          </p>
        </div>
        
        {/* Geçmiş Faturalar */}
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <FileText className="w-3 h-3" />
            <span className="text-[10px] font-medium">Faturalar</span>
          </div>
          <p className="text-xs font-semibold text-slate-800">
            {customerDeliveries.length} adet
          </p>
        </div>
        
        {/* Bekleyen Siparişler */}
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <ShoppingBag className="w-3 h-3" />
            <span className="text-[10px] font-medium">Bekleyen</span>
          </div>
          <p className={`text-xs font-semibold ${pendingOrders.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {pendingOrders.length > 0 ? `${pendingOrders.length} sipariş` : 'Yok'}
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
          >
            <Phone className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onMessage?.(customer)}
            className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-slate-500 relative"
            title="Mesaj"
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
        >
          <Edit3 className="w-3.5 h-3.5" />
          Detay
        </button>
      </div>
    </div>
  );
};

// Müşteri Detay Modal
export const CustomerDetailModal = ({ 
  customer, 
  isOpen, 
  onClose, 
  deliveries = [],
  orders = [],
  onSave
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

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
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const routeDays = customer.route_plan?.days || [];
  const customerDeliveries = deliveries.filter(d => d.customer_id === customer.id);
  const customerOrders = orders.filter(o => o.customer_id === customer.id);
  const pendingOrders = customerOrders.filter(o => ['submitted', 'approved'].includes(o.status));

  const handleSave = async () => {
    setSaving(true);
    try {
      // API call to update customer
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
            <p className="text-sm text-slate-500">{customer.code || `MUS-${customer.id?.slice(0, 8)}`}</p>
          </div>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <button 
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Düzenle
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Müşteri Bilgileri */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Müşteri Bilgileri
            </h3>
            
            {editMode ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Müşteri Adı</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Müşteri Kodu</label>
                  <input 
                    type="text" 
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Telefon</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">E-posta</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Adres</label>
                  <textarea 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-2">Rut Günleri</label>
                  <div className="flex gap-2">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          formData.route_days?.includes(day)
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {dayLabels[day]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Telefon</p>
                  <p className="font-medium text-slate-800">{customer.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">E-posta</p>
                  <p className="font-medium text-slate-800">{customer.email || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs">Adres</p>
                  <p className="font-medium text-slate-800">{customer.address || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs mb-1">Rut Günleri</p>
                  <div className="flex gap-1">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                      <span
                        key={day}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          routeDays.includes(day)
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {dayLabels[day]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bekleyen Siparişler */}
          <div className="bg-emerald-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Bekleyen Siparişler ({pendingOrders.length})
            </h3>
            {pendingOrders.length > 0 ? (
              <div className="space-y-2">
                {pendingOrders.map((order, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {order.items?.length || 0} ürün - {order.items?.reduce((s, i) => s + (i.qty || 0), 0)} adet
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      order.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status === 'approved' ? 'Onaylandı' : 'Bekliyor'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-700">Bekleyen sipariş yok</p>
            )}
          </div>

          {/* Geçmiş Faturalar */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Geçmiş Faturalar ({customerDeliveries.length})
            </h3>
            {customerDeliveries.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {customerDeliveries.slice(0, 10).map((delivery, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {delivery.invoice_no || `FTR-${delivery.id?.slice(0, 6)}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(delivery.delivered_at || delivery.created_at).toLocaleDateString('tr-TR')} - {delivery.items?.length || 0} ürün
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      delivery.acceptance_status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      delivery.acceptance_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {delivery.acceptance_status === 'accepted' ? 'Kabul' :
                       delivery.acceptance_status === 'rejected' ? 'Red' : 'Bekliyor'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-blue-700">Fatura kaydı yok</p>
            )}
          </div>

          {/* Mesajlar (Placeholder) */}
          <div className="bg-amber-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Mesajlar
            </h3>
            <p className="text-sm text-amber-700">Mesaj özelliği yakında eklenecek</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;
