// Plasiyer - Akıllı Sipariş Sayfası (Yeni Tasarım)
import React, { useState, useEffect, useCallback } from 'react';
import { sfSalesAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { 
  Package, Users, Clock, Plus, ChevronDown, Send, 
  AlertCircle, CupSoda
} from 'lucide-react';

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
  const [selectedDay] = useState(getTomorrowDayCode());
  const [orderItems, setOrderItems] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const fetchDraft = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sfSalesAPI.getWarehouseDraft();
      const draftData = res.data?.data || null;
      setData(draftData);
      
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
    return { isAfterCutoff };
  };

  const timeInfo = getTimeInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Package className="w-12 h-12 mb-4 opacity-50" />
        <p>Veri yüklenemedi</p>
      </div>
    );
  }

  const routeDayLabel = DAYS.find(d => d.code === data.route_day)?.label || data.route_day;

  return (
    <div className="space-y-6" data-testid="akilli-siparis-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Depo Sipariş Oluştur</h1>
          <p className="text-slate-500 text-sm mt-1">{routeDayLabel} rutu için sipariş taslağı</p>
        </div>
        
        {/* Saat Uyarısı */}
        {timeInfo.isAfterCutoff && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <div>
              <span className="text-amber-700 font-medium text-sm">Sipariş kesim saati geçti!</span>
              <span className="text-amber-600 text-xs ml-2">16:30'dan sonra taslaklar dahil edilir</span>
            </div>
          </div>
        )}
      </div>

      {/* İstatistik Kutuları */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-500 rounded-xl p-5 text-white">
          <p className="text-blue-100 text-sm font-medium">Rut Müşterisi</p>
          <p className="text-4xl font-bold mt-2">{data.customer_count || 0}</p>
        </div>
        <div className="bg-green-500 rounded-xl p-5 text-white">
          <p className="text-green-100 text-sm font-medium">Sipariş Veren</p>
          <p className="text-4xl font-bold mt-2">{data.order_customer_count || 0}</p>
        </div>
        <div className="bg-orange-500 rounded-xl p-5 text-white">
          <p className="text-orange-100 text-sm font-medium">Taslaktan</p>
          <p className="text-4xl font-bold mt-2">{data.draft_customer_count || 0}</p>
        </div>
      </div>

      {/* Müşteri Siparişleri & Taslaklar Başlık */}
      <div className="flex items-center gap-2 text-slate-700">
        <Users className="w-5 h-5" />
        <h2 className="font-semibold">Müşteri Siparişleri & Taslaklar</h2>
      </div>

      {/* Ürün Listesi */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {orderItems.length > 0 ? (
          orderItems.map((item) => (
            <ProductRow 
              key={item.product_id}
              item={item}
              onUpdateQty={(qty) => updateItemQty(item.product_id, qty)}
            />
          ))
        ) : (
          <div className="p-8 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Henüz ürün yok</p>
          </div>
        )}

        {/* Ürün Ekle Butonu */}
        <button 
          onClick={() => setShowAddProduct(!showAddProduct)}
          className="w-full p-4 flex items-center gap-3 text-slate-600 hover:bg-slate-50 transition-colors"
          data-testid="add-product-btn"
        >
          <Plus className="w-6 h-6" />
          <span className="text-lg font-medium">Ürün ekle</span>
        </button>
      </div>

      {/* Gönder Butonu */}
      {orderItems.length > 0 && (
        <button 
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-colors ${
            submitting 
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
          data-testid="submit-warehouse-btn"
        >
          <Send className="w-5 h-5" />
          {submitting ? 'Gönderiliyor...' : 'Depoya Sipariş Gönder'}
        </button>
      )}

      {/* Bilgi Kutusu */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Nasıl Çalışır?</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600">
            <li>Müşteriler saat 16:30'a kadar sipariş atabilir</li>
            <li>Sipariş atmayan müşteriler için sistem taslağı kullanılır</li>
            <li>Toplam ihtiyaçtan araç stoğunuz düşülür</li>
            <li>Kalan miktar depo siparişi olarak hesaplanır</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Ürün Satırı Bileşeni
const ProductRow = ({ item, onUpdateQty }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Tahmini ihtiyaç seçenekleri oluştur
  const generateOptions = () => {
    const baseQty = item.edited_qty || 0;
    const step = item.box_size || 1;
    const options = [];
    
    // 0'dan başlayarak makul seçenekler üret
    for (let i = 0; i <= Math.max(baseQty * 2, step * 20); i += step) {
      options.push(i);
    }
    
    return options;
  };

  const options = generateOptions();
  const casesNeeded = Math.ceil((item.edited_qty || 0) / (item.box_size || 1));
  
  // Tahmini SKT formatla
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-start gap-4">
        {/* Ürün İkonu */}
        <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
          <CupSoda className="w-6 h-6 text-slate-400" />
        </div>

        {/* Ürün Bilgileri */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900">{item.product_name}</h3>
          <div className="flex flex-col gap-1 mt-1 text-sm text-slate-500">
            <p>Depo stoğu : {(item.warehouse_stock || item.net_need || 0).toLocaleString('tr-TR')} ad</p>
            <p>Tahmini SKT : {formatDate(item.estimated_expiry || item.expiry_date)}</p>
          </div>
        </div>

        {/* Stok Bilgisi */}
        <div className="text-right text-sm">
          <p className="text-slate-500">stok : <span className="font-medium text-slate-700">{item.plasiyer_stock || 0} ad</span></p>
        </div>

        {/* Toplam Bilgisi */}
        <div className="text-right text-sm">
          <p className="text-slate-500">
            taslak ve sipariş toplam : <span className="font-medium text-slate-700">{Math.round((item.order_qty || 0) + (item.draft_qty || 0))} ad</span>
            <span className="ml-2 text-slate-400">{casesNeeded} koli</span>
          </p>
        </div>

        {/* Tahmini İhtiyaç Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">tahmini ihtiyaç</span>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:border-slate-400 transition-colors"
              data-testid={`qty-dropdown-${item.product_id}`}
            >
              <span>{item.edited_qty || 0}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
              <div className="absolute right-0 mt-1 w-24 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {options.map((qty) => (
                  <button
                    key={qty}
                    onClick={() => {
                      onUpdateQty(qty);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      qty === item.edited_qty ? 'bg-orange-50 text-orange-600 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseDraftPage;
