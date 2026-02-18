import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { X, Plus, Send, ArrowLeft, AlertTriangle } from 'lucide-react';

const WorkingCopyPage = ({ onBack, onSubmitted }) => {
  const [wc, setWc] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [deliveryBanner, setDeliveryBanner] = useState(false);

  const fetchWC = useCallback(async () => {
    try {
      setLoading(true);
      const [wcRes, prodRes] = await Promise.all([
        sfCustomerAPI.startWorkingCopy(),
        sfCustomerAPI.getProducts(),
      ]);
      const wcData = wcRes.data?.data;
      if (wcData?.status === 'deleted_by_delivery') {
        setDeliveryBanner(true);
      }
      setWc(wcData);
      setProducts(prodRes.data?.data || []);
    } catch (err) {
      toast.error('Calisma kopyasi yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWC(); }, [fetchWC]);

  const handleQtyChange = async (productId, value) => {
    if (!wc) return;
    const numVal = value === '' ? null : parseFloat(value);
    if (numVal !== null && numVal === 0) {
      toast.error('Gecerli bir adet girin veya urunu listeden cikarin.');
      return;
    }
    try {
      const updatedItems = wc.items.map(it =>
        it.product_id === productId ? { ...it, user_qty: numVal } : it
      );
      setWc({ ...wc, items: updatedItems });
      await sfCustomerAPI.updateWorkingCopy(wc.id, updatedItems.map(it => ({
        product_id: it.product_id, user_qty: it.user_qty, removed: it.removed || false,
      })));
    } catch {
      toast.error('Guncelleme hatasi');
    }
  };

  const handleRemoveToggle = async (productId) => {
    if (!wc) return;
    const updatedItems = wc.items.map(it =>
      it.product_id === productId ? { ...it, removed: !it.removed } : it
    );
    setWc({ ...wc, items: updatedItems });
    try {
      await sfCustomerAPI.updateWorkingCopy(wc.id, updatedItems.map(it => ({
        product_id: it.product_id, user_qty: it.user_qty, removed: it.removed || false,
      })));
    } catch {
      toast.error('Guncelleme hatasi');
    }
  };

  const handleAddProduct = async (productId) => {
    if (!wc) return;
    try {
      const res = await sfCustomerAPI.addWorkingCopyItem(wc.id, { product_id: productId, user_qty: 1 });
      setWc(res.data?.data);
      setShowAddProduct(false);
      toast.success('Urun eklendi');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Urun eklenemedi');
    }
  };

  const handleSubmit = async () => {
    if (!wc) return;
    const validItems = wc.items.filter(it => !it.removed && it.user_qty && it.user_qty > 0);
    if (validItems.length === 0) {
      toast.error('En az 1 urun secin ve adet girin');
      return;
    }
    setSubmitting(true);
    try {
      await sfCustomerAPI.submitWorkingCopy(wc.id);
      toast.success('Siparis gonderildi');
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gonderme hatasi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  }

  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });
  const existingIds = new Set((wc?.items || []).map(it => it.product_id));
  const availableProducts = products.filter(p => !existingIds.has(p.id));

  return (
    <div data-testid="working-copy-page">
      {deliveryBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2" data-testid="delivery-deleted-banner">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Yeni bir teslimat yapildigi icin onceki siparis taslagi kapatildi.</p>
        </div>
      )}

      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4" /> Taslaga Don
      </button>

      <div className="space-y-3">
        {(wc?.items || []).map((item, idx) => {
          const prod = productMap[item.product_id];
          return (
            <div
              key={item.product_id}
              className={`bg-white border rounded-lg p-4 transition-opacity ${item.removed ? 'opacity-40 border-slate-100' : 'border-slate-200'}`}
              data-testid={`wc-item-${idx}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800 truncate block">
                    {prod?.name || item.product_id?.slice(0, 8)}
                  </span>
                  <span className="text-xs text-slate-400">{item.source === 'manual_add' ? 'Manuel eklendi' : 'Taslaktan'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Adet"
                    value={item.user_qty ?? ''}
                    onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                    disabled={item.removed}
                    className="w-20 px-2 py-1.5 border border-slate-300 rounded-md text-sm text-center focus:ring-1 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50"
                    data-testid={`wc-qty-input-${idx}`}
                  />
                  <button
                    onClick={() => handleRemoveToggle(item.product_id)}
                    className={`p-1.5 rounded-md transition-colors ${item.removed ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                    data-testid={`wc-remove-btn-${idx}`}
                    title={item.removed ? 'Geri Ekle' : 'Cikar'}
                  >
                    {item.removed ? <Plus className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add product */}
      <div className="mt-4">
        {!showAddProduct ? (
          <button
            onClick={() => setShowAddProduct(true)}
            className="w-full border-2 border-dashed border-slate-300 rounded-lg py-3 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-600 transition-colors flex items-center justify-center gap-1"
            data-testid="add-product-btn"
          >
            <Plus className="w-4 h-4" /> Urun Ekle
          </button>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-3" data-testid="add-product-panel">
            <p className="text-xs font-medium text-slate-600 mb-2">Urun Sec</p>
            {availableProducts.length === 0 ? (
              <p className="text-xs text-slate-400">Eklenecek urun kalmadi</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {availableProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAddProduct(p.id)}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-sky-50 hover:text-sky-700 transition-colors"
                  >
                    {p.name} <span className="text-xs text-slate-400">({p.code})</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowAddProduct(false)} className="mt-2 text-xs text-slate-400 hover:text-slate-600">Kapat</button>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 px-4 rounded-lg font-medium transition-colors"
        data-testid="submit-order-btn"
      >
        <Send className="w-4 h-4" /> {submitting ? 'Gonderiliyor...' : 'Siparisi Gonder'}
      </button>
    </div>
  );
};

export default WorkingCopyPage;
