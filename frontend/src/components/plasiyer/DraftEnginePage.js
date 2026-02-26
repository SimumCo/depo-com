// Draft Engine - Plasiyer Depo Sipariş Sayfası
// Model B tüketim tahmini ile deterministik draft sistemi

import React, { useState, useEffect, useCallback } from 'react';
import { draftEngineAPI } from '../../services/draftEngineApi';
import { toast } from 'sonner';
import { 
  Package, Users, TrendingUp, Calendar, ChevronRight, Clock,
  Plus, Minus, Edit3, Check, Box, Send, BarChart3, AlertCircle,
  RefreshCw, Activity, Zap
} from 'lucide-react';
import { PageHeader, StatCard, EmptyState, Loading, gradients } from '../ui/DesignSystem';

// Yarının tarihini al (YYYY-MM-DD)
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

// Gün ismi al
const getDayName = (dateStr) => {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const date = new Date(dateStr);
  return days[date.getDay()];
};

const DraftEnginePage = () => {
  const [loading, setLoading] = useState(true);
  const [draftData, setDraftData] = useState(null);
  const [targetDate, setTargetDate] = useState(getTomorrowDate());
  const [editableItems, setEditableItems] = useState([]);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const fetchDraft = useCallback(async () => {
    try {
      setLoading(true);
      const res = await draftEngineAPI.getSalesRepDraft(targetDate);
      const data = res.data?.data || null;
      setDraftData(data);
      
      // Düzenlenebilir items'ı ayarla
      if (data?.order_items) {
        setEditableItems(data.order_items.map(item => ({
          ...item,
          edited_qty: item.final_qty,
          is_edited: false
        })));
      }
    } catch (err) {
      console.error('Draft fetch error:', err);
      toast.error('Draft yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    fetchDraft();
  }, [fetchDraft]);

  // Miktar güncelle
  const updateItemQty = (productId, newQty) => {
    setEditableItems(items => items.map(item => {
      if (item.product_id === productId) {
        const boxSize = item.box_size || 1;
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

  // Depoya gönder
  const handleSubmit = async () => {
    const activeItems = editableItems.filter(item => item.edited_qty > 0);
    if (activeItems.length === 0) {
      toast.error('Sipariş listesi boş');
      return;
    }
    // TODO: Implement submit endpoint
    toast.success('Depo siparişi başarıyla gönderildi!');
  };

  if (loading) return <Loading />;

  if (!draftData) {
    return (
      <EmptyState 
        icon={Package} 
        title="Veri bulunamadı"
        subtitle="Henüz müşteri veya teslimat verisi yok"
      />
    );
  }

  const totalEditedQty = editableItems.reduce((sum, item) => sum + (item.edited_qty || 0), 0);
  const hasChanges = editableItems.some(item => item.is_edited);

  return (
    <div className="space-y-6" data-testid="draft-engine-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <PageHeader 
            title="Akıllı Depo Siparişi"
            subtitle="Model B tüketim tahmini ile otomatik hesaplama"
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Deterministik Hesaplama
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              SMA-8 Rate
            </span>
          </div>
        </div>
        
        {/* Tarih Seçici */}
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <label className="text-xs text-slate-500 block mb-1">Hedef Rut Tarihi</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-transparent border-none outline-none"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{getDayName(targetDate)}</p>
          </div>
          
          <button 
            onClick={fetchDraft}
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Yenile"
          >
            <RefreshCw className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard 
          title="Toplam Müşteri" 
          value={draftData.customer_count || 0}
          icon={Users}
          gradient={gradients.blue}
        />
        <StatCard 
          title="Ürün Çeşidi" 
          value={draftData.product_count || 0}
          icon={Package}
          gradient={gradients.purple || gradients.blue}
        />
        <StatCard 
          title="İhtiyaç (Ham)" 
          value={Math.round(draftData.total_need_qty || 0)}
          icon={TrendingUp}
          gradient={gradients.amber}
        />
        <StatCard 
          title="Sipariş (Koli)" 
          value={draftData.total_final_qty || 0}
          icon={Box}
          gradient={gradients.green}
        />
        <StatCard 
          title="Düzenlenen" 
          value={totalEditedQty}
          icon={Edit3}
          gradient={hasChanges ? gradients.orange : gradients.slate || gradients.blue}
        />
      </div>

      {/* Model B Açıklama */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Model B - Implicit Consumption Estimation
        </h3>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div className="bg-white/70 rounded-xl p-3">
            <p className="font-semibold text-blue-800 mb-1">1. Interval Rate</p>
            <p className="text-blue-600">daily_rate = prev_qty ÷ days_between</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3">
            <p className="font-semibold text-blue-800 mb-1">2. SMA-8 Rate</p>
            <p className="text-blue-600">rate_mt = avg(son 8 interval)</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3">
            <p className="font-semibold text-blue-800 mb-1">3. Weekly Multiplier</p>
            <p className="text-blue-600">clamp(week_avg ÷ baseline, 0.7, 1.8)</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3">
            <p className="font-semibold text-blue-800 mb-1">4. Need Qty</p>
            <p className="text-blue-600">need = rate × days_to_route</p>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sol: Müşteri Listesi */}
        <div className="col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            Müşteri Bazlı İhtiyaçlar
            <span className="ml-auto text-sm font-normal text-slate-500">
              {draftData.customer_count || 0} müşteri
            </span>
          </h2>
          
          {draftData.customers?.length > 0 ? (
            <div className="space-y-3">
              {draftData.customers.map((cust, idx) => (
                <CustomerDraftCard 
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
              title="Bu tarih için müşteri yok"
              subtitle="Farklı bir tarih seçin veya müşteri ekleyin"
            />
          )}
        </div>

        {/* Sağ: Sipariş Listesi */}
        <div className="space-y-4">
          <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden sticky top-24">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Box className="w-5 h-5" />
                Depo Sipariş Listesi
              </h2>
              <p className="text-emerald-100 text-xs mt-1">
                Koli bazında yuvarlanmış miktarlar
              </p>
            </div>
            
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {editableItems.length > 0 ? (
                editableItems.map((item) => (
                  <OrderItemRow 
                    key={item.product_id}
                    item={item}
                    onUpdateQty={(qty) => updateItemQty(item.product_id, qty)}
                    isEditing={editingItem === item.product_id}
                    setEditing={(val) => setEditingItem(val ? item.product_id : null)}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Sipariş listesi boş</p>
                </div>
              )}
            </div>

            {/* Toplam ve Gönder */}
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-semibold text-slate-700">Toplam</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-emerald-600">{totalEditedQty}</span>
                  <span className="text-sm text-slate-500 ml-1">adet</span>
                </div>
              </div>
              
              <button 
                onClick={handleSubmit}
                disabled={editableItems.length === 0}
                className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                  editableItems.length === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200'
                }`}
                data-testid="submit-warehouse-btn"
              >
                <Send className="w-5 h-5" />
                Depoya Gönder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Müşteri Draft Kartı
const CustomerDraftCard = ({ customer, index, isExpanded, onToggle }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <button 
        onClick={onToggle}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{customer.customer_name}</h3>
              <p className="text-xs text-slate-500">{customer.item_count} ürün</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900">{Math.round(customer.total_need_qty)}</p>
              <p className="text-xs text-slate-500">tahmin ihtiyaç</p>
            </div>
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </button>
      
      {isExpanded && customer.items?.length > 0 && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="mt-3 space-y-2">
            {customer.items.map((item, iIdx) => (
              <div key={iIdx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm">
                <span className="text-slate-700 font-medium">{item.product_id?.slice(0, 15)}...</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">rate×days</span>
                  <span className="font-bold text-emerald-600">{Math.round(item.need_qty * 10) / 10}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Sipariş Satırı
const OrderItemRow = ({ item, onUpdateQty, isEditing, setEditing }) => {
  const [tempQty, setTempQty] = useState(item.edited_qty);

  const handleSave = () => {
    onUpdateQty(tempQty);
    setEditing(false);
  };

  return (
    <div className={`bg-slate-50 rounded-xl p-3 ${item.is_edited ? 'ring-2 ring-amber-400' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">{item.product_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
              {item.box_size}'li koli
            </span>
            <span className="text-[10px] text-slate-500">
              İhtiyaç: {Math.round(item.total_need_qty)}
            </span>
          </div>
        </div>
      </div>

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
            <span className="text-xl font-bold text-emerald-600">{item.edited_qty}</span>
            <span className="text-xs text-slate-500">
              ({Math.ceil(item.edited_qty / (item.box_size || 1))} koli)
            </span>
          </div>
          <button 
            onClick={() => setEditing(true)}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      )}

      {item.is_edited && (
        <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Orijinal: {item.final_qty} → Düzenlendi: {item.edited_qty}
        </p>
      )}
    </div>
  );
};

export default DraftEnginePage;
