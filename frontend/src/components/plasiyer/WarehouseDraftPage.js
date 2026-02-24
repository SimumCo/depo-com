// Plasiyer - Depo Sipariş Oluştur Sayfası (Gelişmiş)
import React, { useState, useEffect, useCallback } from 'react';
import { sfSalesAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { 
  Package, ShoppingBag, FileText, Users, ChevronRight, Clock, 
  Plus, Minus, Trash2, Edit3, Check, AlertTriangle, Box, Send
} from 'lucide-react';
import { 
  PageHeader, StatCard, EmptyState, Loading, gradients 
} from '../ui/DesignSystem';

// Gün seçenekleri
const DAYS = [
  { code: 'MON', label: 'Pazartesi' },
  { code: 'TUE', label: 'Salı' },
  { code: 'WED', label: 'Çarşamba' },
  { code: 'THU', label: 'Perşembe' },
  { code: 'FRI', label: 'Cuma' },
  { code: 'SAT', label: 'Cumartesi' },
  { code: 'SUN', label: 'Pazar' },
];

// Yarının gün kodunu al
const getTomorrowDayCode = () => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return days[tomorrow.getDay()];
};

const WarehouseDraftPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getTomorrowDayCode());
  const [orderItems, setOrderItems] = useState([]); // Düzenlenebilir sipariş listesi
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const fetchDraft = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sfSalesAPI.getWarehouseDraft();
      const draftData = res.data?.data || null;
      setData(draftData);
      
      // Sipariş öğelerini düzenlenebilir state'e kopyala
      if (draftData?.order_items) {
        setOrderItems(draftData.order_items.map(item => ({
          ...item,
          edited_qty: item.final_qty,
          is_edited: false
        })));
      }
    } catch (err) {
      toast.error('Depo taslağı yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDraft(); }, [fetchDraft]);

  // Ürün miktarını güncelle
  const updateItemQty = (productId, newQty) => {
    setOrderItems(items => items.map(item => {
      if (item.product_id === productId) {
        const boxSize = item.box_size || 1;
        // Koli bazında yuvarla
        const roundedQty = boxSize > 1 
          ? Math.ceil(newQty / boxSize) * boxSize 
          : Math.max(0, newQty);
        return {
          ...item,
          edited_qty: roundedQty,
          is_edited: roundedQty !== item.final_qty
        };
      }
      return item;
    }));
  };

  // Ürün sil
  const removeItem = (productId) => {
    setOrderItems(items => items.filter(item => item.product_id !== productId));
    toast.info('Ürün listeden çıkarıldı');
  };

  // Depoya gönder
  const handleSubmit = async () => {
    const activeItems = orderItems.filter(item => item.edited_qty > 0);
    
    if (activeItems.length === 0) {
      toast.error('Sipariş listesi boş');
      return;
    }

    try {
      setSubmitting(true);
      await sfSalesAPI.submitWarehouseDraft({ 
        items: activeItems.map(item => ({
          product_id: item.product_id,
          qty: item.edited_qty
        })),
        route_day: selectedDay,
        note: '' 
      });
      toast.success('Depo siparişi başarıyla gönderildi!');
      fetchDraft();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gönderim hatası');
    } finally {
      setSubmitting(false);
    }
  };

  // Saat bilgisi
  const getTimeInfo = () => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(16, 30, 0, 0);
    
    const isAfterCutoff = now > cutoff;
    const diff = cutoff - now;
    const hours = Math.floor(Math.abs(diff) / 3600000);
    const mins = Math.floor((Math.abs(diff) % 3600000) / 60000);
    
    return { isAfterCutoff, hours, mins };
  };

  const timeInfo = getTimeInfo();

  if (loading) return <Loading />;

  if (!data) {
    return (
      <EmptyState 
        icon={Package} 
        title="Veri yüklenemedi"
        subtitle="Lütfen sayfayı yenileyin"
      />
    );
  }

  // Toplam hesapla
  const totalEditedQty = orderItems.reduce((sum, item) => sum + (item.edited_qty || 0), 0);
  const hasChanges = orderItems.some(item => item.is_edited);

  return (
    <div className="space-y-6" data-testid="warehouse-draft-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <PageHeader 
            title="Depo Sipariş Oluştur"
            subtitle={`${DAYS.find(d => d.code === data.route_day)?.label || data.route_day} rutu için sipariş taslağı`}
          />
        </div>
        
        {/* Saat Bilgisi */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-right">
          <div className={`text-sm font-medium flex items-center gap-2 justify-end ${
            timeInfo.isAfterCutoff ? 'text-amber-600' : 'text-slate-600'
          }`}>
            <Clock className="w-4 h-4" />
            {timeInfo.isAfterCutoff ? (
              <span>Sipariş kesim saati geçti</span>
            ) : (
              <span>Kesim: {timeInfo.hours}s {timeInfo.mins}dk kaldı</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            16:30'dan sonra taslaklar dahil edilir
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard 
          title="Rut Müşterisi" 
          value={data.customer_count} 
          icon={Users}
          gradient={gradients.blue}
        />
        <StatCard 
          title="Sipariş Veren" 
          value={data.order_customer_count} 
          icon={ShoppingBag}
          gradient={gradients.green}
        />
        <StatCard 
          title="Taslaktan" 
          value={data.draft_customer_count} 
          icon={FileText}
          gradient={gradients.amber}
        />
        <StatCard 
          title="Ürün Çeşidi" 
          value={data.total_products} 
          icon={Package}
          gradient={gradients.purple || gradients.blue}
        />
        <StatCard 
          title="Toplam Sipariş" 
          value={totalEditedQty} 
          gradient={gradients.orange}
        />
      </div>

      {/* Hesaplama Açıklaması */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Sipariş Hesaplama Mantığı
        </h3>
        <div className="grid grid-cols-4 gap-4 text-xs text-blue-700">
          <div className="bg-white rounded-lg p-2">
            <p className="font-medium">1. Müşteri Siparişleri</p>
            <p className="text-blue-600">Gönderilen siparişler toplanır</p>
          </div>
          <div className="bg-white rounded-lg p-2">
            <p className="font-medium">2. Müşteri Taslakları</p>
            <p className="text-blue-600">16:30'dan sonra dahil edilir</p>
          </div>
          <div className="bg-white rounded-lg p-2">
            <p className="font-medium">3. Plasiyer Stoğu</p>
            <p className="text-blue-600">Eldeki stok çıkarılır</p>
          </div>
          <div className="bg-white rounded-lg p-2">
            <p className="font-medium">4. Koli Yuvarlaması</p>
            <p className="text-blue-600">Koli adedine yuvarlanır</p>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sol: Müşteri Detayları */}
        <div className="col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            Müşteri Siparişleri & Taslaklar
          </h2>
          
          {data.customers?.length > 0 ? (
            <div className="space-y-3">
              {data.customers.map((cust, idx) => (
                <CustomerDetailCard 
                  key={cust.customer_id}
                  customer={cust}
                  index={idx}
                  isExpanded={expandedCustomer === cust.customer_id}
                  onToggle={() => setExpandedCustomer(
                    expandedCustomer === cust.customer_id ? null : cust.customer_id
                  )}
                />
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={Users} 
              title="Bu rut için müşteri yok"
            />
          )}
        </div>

        {/* Sağ: Sipariş Listesi */}
        <div className="space-y-4">
          <div className="bg-white border border-orange-200 rounded-2xl overflow-hidden sticky top-24">
            <div className="bg-orange-500 text-white p-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Box className="w-5 h-5" />
                Depo Sipariş Listesi
              </h2>
              <p className="text-orange-100 text-xs mt-1">
                {hasChanges && <span className="text-yellow-200">• Değişiklikler var</span>}
              </p>
            </div>
            
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {orderItems.length > 0 ? (
                orderItems.map((item) => (
                  <OrderItemRow 
                    key={item.product_id}
                    item={item}
                    onUpdateQty={(qty) => updateItemQty(item.product_id, qty)}
                    onRemove={() => removeItem(item.product_id)}
                    isEditing={editingItem === item.product_id}
                    setEditing={(val) => setEditingItem(val ? item.product_id : null)}
                  />
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">Sipariş listesi boş</p>
              )}
            </div>

            {/* Toplam ve Gönder */}
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-semibold text-slate-700">Toplam Sipariş</span>
                <span className="text-2xl font-bold text-orange-600">{totalEditedQty} Adet</span>
              </div>
              
              <button 
                onClick={handleSubmit}
                disabled={submitting || orderItems.length === 0}
                className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-colors ${
                  submitting || orderItems.length === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
                data-testid="submit-warehouse-btn"
              >
                <Send className="w-5 h-5" />
                {submitting ? 'Gönderiliyor...' : 'Depoya Gönder'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Müşteri Detay Kartı
const CustomerDetailCard = ({ customer, index, isExpanded, onToggle }) => {
  const sourceColors = {
    order: { bg: 'bg-emerald-500', border: 'border-emerald-200', text: 'text-emerald-600', label: '✓ Sipariş' },
    draft: { bg: 'bg-amber-500', border: 'border-amber-200', text: 'text-amber-600', label: '○ Taslak' },
    none: { bg: 'bg-slate-400', border: 'border-slate-200', text: 'text-slate-500', label: '- Yok' }
  };
  
  const colors = sourceColors[customer.source] || sourceColors.none;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${colors.border}`}>
      <button 
        onClick={onToggle}
        className="w-full p-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${colors.bg}`}>
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{customer.customer_name}</h3>
              <p className={`text-xs ${colors.text}`}>{colors.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">{customer.total_qty}</p>
              <p className="text-xs text-slate-500">adet</p>
            </div>
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </button>
      
      {isExpanded && customer.items?.length > 0 && (
        <div className="px-3 pb-3 border-t border-slate-100">
          <div className="mt-2 space-y-1">
            {customer.items.map((item, iIdx) => (
              <div key={iIdx} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-slate-700">{item.product_id?.slice(0, 8)}...</span>
                <span className="font-medium text-slate-800">{item.qty} adet</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Sipariş Satırı (Düzenlenebilir)
const OrderItemRow = ({ item, onUpdateQty, onRemove, isEditing, setEditing }) => {
  const [tempQty, setTempQty] = useState(item.edited_qty);

  const handleSave = () => {
    onUpdateQty(tempQty);
    setEditing(false);
  };

  const handleCancel = () => {
    setTempQty(item.edited_qty);
    setEditing(false);
  };

  return (
    <div className={`bg-slate-50 rounded-xl p-3 ${item.is_edited ? 'ring-2 ring-orange-300' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">{item.product_name}</p>
          <p className="text-xs text-slate-500">{item.product_code}</p>
        </div>
        <button 
          onClick={onRemove}
          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Hesaplama Detayı */}
      <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-500 mb-2">
        <div>
          <span className="block text-slate-400">Sipariş</span>
          <span className="font-medium text-emerald-600">{item.order_qty}</span>
        </div>
        <div>
          <span className="block text-slate-400">Taslak</span>
          <span className="font-medium text-amber-600">{item.draft_qty}</span>
        </div>
        <div>
          <span className="block text-slate-400">İhtiyaç</span>
          <span className="font-medium">{item.net_need}</span>
        </div>
        <div>
          <span className="block text-slate-400">Koli</span>
          <span className="font-medium">{item.box_size}'li</span>
        </div>
      </div>

      {/* Miktar Düzenleme */}
      {isEditing ? (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTempQty(Math.max(0, tempQty - item.box_size))}
            className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input 
            type="number"
            value={tempQty}
            onChange={(e) => setTempQty(parseInt(e.target.value) || 0)}
            className="flex-1 text-center text-lg font-bold border border-slate-200 rounded-lg py-1"
          />
          <button 
            onClick={() => setTempQty(tempQty + item.box_size)}
            className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={handleSave}
            className="p-2 bg-emerald-500 text-white rounded-lg"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-orange-600">{item.edited_qty}</span>
            <span className="text-xs text-slate-500">adet ({item.boxes || Math.ceil(item.edited_qty / (item.box_size || 1))} koli)</span>
          </div>
          <button 
            onClick={() => setEditing(true)}
            className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      )}

      {item.is_edited && (
        <p className="text-[10px] text-orange-600 mt-1">
          Orijinal: {item.final_qty} → Düzenlendi: {item.edited_qty}
        </p>
      )}
    </div>
  );
};

export default WarehouseDraftPage;
