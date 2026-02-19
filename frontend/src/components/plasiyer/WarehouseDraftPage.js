// Plasiyer - Depo Sipariş Taslağı Sayfası
import React, { useState, useEffect, useCallback } from 'react';
import { sfSalesAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { 
  Package, ShoppingBag, FileText, Users, ChevronRight, Clock 
} from 'lucide-react';
import { 
  PageHeader, StatCard, EmptyState, Loading, gradients 
} from '../ui/DesignSystem';

// Day name translations
const dayTranslations = {
  MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba',
  THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar'
};

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

  // Calculate time until 17:00
  const getTimeUntil17 = () => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(17, 0, 0, 0);
    
    if (now > target) {
      target.setDate(target.getDate() + 1);
    }
    
    const diff = target - now;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    
    return { hours, mins, isPast: now.getHours() >= 17 && now.getHours() < 18 };
  };

  const timeInfo = getTimeUntil17();

  if (loading) return <Loading />;

  if (!data) {
    return (
      <EmptyState 
        icon={Package} 
        title="Veri yuklenemedi"
        subtitle="Lutfen sayfayi yenileyin"
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="warehouse-draft-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <PageHeader 
          title="Depo Siparis Taslagi"
          subtitle={`Yarin (${dayTranslations[data.route_day] || data.route_day}) rutu icin hazirlanmis siparis`}
        />
        <TimeInfo timeInfo={timeInfo} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          title="Toplam Musteri" 
          value={data.customer_count} 
          gradient={gradients.blue}
        />
        <StatCard 
          title="Siparis Veren" 
          value={data.order_count} 
          icon={ShoppingBag}
          gradient={gradients.green}
        />
        <StatCard 
          title="Taslaktan" 
          value={data.draft_count} 
          icon={FileText}
          gradient={gradients.amber}
        />
        <StatCard 
          title="Toplam Adet" 
          value={data.grand_total_qty} 
          gradient={gradients.orange}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Musteriler</h2>
          <CustomerList 
            customers={data.customers}
            expandedCustomer={expandedCustomer}
            setExpandedCustomer={setExpandedCustomer}
          />
        </div>

        {/* Product Summary */}
        <ProductSummary 
          productTotals={data.product_totals}
          grandTotal={data.grand_total_qty}
          customerCount={data.customer_count}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

// Time Info Component
const TimeInfo = ({ timeInfo }) => (
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
);

// Customer List Component
const CustomerList = ({ customers, expandedCustomer, setExpandedCustomer }) => {
  if (!customers || customers.length === 0) {
    return (
      <EmptyState 
        icon={Users} 
        title="Yarin icin rut musterisi yok"
      />
    );
  }

  return (
    <div className="space-y-3">
      {customers.map((cust, idx) => (
        <CustomerCard 
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
  );
};

// Customer Card Component
const CustomerCard = ({ customer, index, isExpanded, onToggle }) => (
  <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${
    customer.source === 'order' ? 'border-emerald-200' : 'border-amber-200'
  }`}>
    <button 
      onClick={onToggle}
      className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
            customer.source === 'order' ? 'bg-emerald-500' : 'bg-amber-500'
          }`}>
            {index + 1}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{customer.customer_name}</h3>
            <p className="text-xs text-slate-500">
              {customer.source === 'order' ? (
                <span className="text-emerald-600">✓ Siparis gonderdi</span>
              ) : (
                <span className="text-amber-600">○ Sistem taslagi</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-lg font-bold text-slate-900">{customer.total_qty}</p>
            <p className="text-xs text-slate-500">{customer.item_count} cesit</p>
          </div>
          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>
    </button>
    
    {isExpanded && (
      <div className="px-4 pb-4 border-t border-slate-100">
        <div className="mt-3 space-y-2">
          {customer.items?.map((item, iIdx) => (
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
);

// Product Summary Component
const ProductSummary = ({ productTotals, grandTotal, customerCount, submitting, onSubmit }) => (
  <div className="space-y-4">
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sticky top-24">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Urun Toplami</h2>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {productTotals?.map((pt, idx) => (
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
          <span className="text-xl font-bold text-orange-600">{grandTotal} Adet</span>
        </div>
        
        <button 
          onClick={onSubmit}
          disabled={submitting || customerCount === 0}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
            submitting || customerCount === 0
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
          data-testid="submit-warehouse-btn"
        >
          {submitting ? 'Gonderiliyor...' : 'Depoya Gonder'}
        </button>
        
        <p className="text-xs text-slate-400 text-center mt-2">
          Gonderim saati: 17:00
        </p>
      </div>
    </div>
  </div>
);

export default WarehouseDraftPage;
