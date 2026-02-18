import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { ClipboardList, Send } from 'lucide-react';

const StockDeclarationForm = () => {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await sfCustomerAPI.getProducts();
      const prods = res.data?.data || [];
      setProducts(prods);
      setItems(prods.map(p => ({ product_id: p.id, product_name: p.name, product_code: p.code, qty: '' })));
    } catch {
      toast.error('Urunler yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleQtyChange = (productId, value) => {
    setItems(prev => prev.map(it =>
      it.product_id === productId ? { ...it, qty: value } : it
    ));
  };

  const handleSubmit = async () => {
    const validItems = items
      .filter(it => it.qty !== '' && parseFloat(it.qty) >= 0)
      .map(it => ({ product_id: it.product_id, qty: parseFloat(it.qty) }));

    if (validItems.length === 0) {
      toast.error('En az bir urun icin stok miktari girin');
      return;
    }

    setSubmitting(true);
    try {
      const res = await sfCustomerAPI.createStockDeclaration({ items: validItems });
      const spikes = res.data?.data?.spikes_detected || 0;
      toast.success(`Stok beyani kaydedildi.${spikes > 0 ? ` ${spikes} urun icin tuketim sapmasi tespit edildi.` : ''}`);
      // Reset form
      setItems(prev => prev.map(it => ({ ...it, qty: '' })));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Stok beyani gonderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  }

  return (
    <div data-testid="stock-declaration-form">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-slate-600">Mevcut stok durumunuzu bildirerek daha dogru siparis onerileri alin.</p>
        <p className="text-xs text-slate-400 mt-1">Stok beyani baz tuketim hizinizi degistirmez, sadece tahmini taris tarihini etkiler.</p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12" data-testid="stock-empty">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Tanimli urun yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.product_id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-3" data-testid={`stock-item-${idx}`}>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-800 block truncate">{item.product_name}</span>
                <span className="text-xs text-slate-400">{item.product_code}</span>
              </div>
              <input
                type="number"
                min="0"
                placeholder="Stok"
                value={item.qty}
                onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                className="w-24 px-2 py-1.5 border border-slate-300 rounded-md text-sm text-center focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                data-testid={`stock-qty-input-${idx}`}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white py-3 px-4 rounded-lg font-medium transition-colors"
        data-testid="submit-stock-btn"
      >
        <Send className="w-4 h-4" /> {submitting ? 'Gonderiliyor...' : 'Stok Beyanini Gonder'}
      </button>
    </div>
  );
};

export default StockDeclarationForm;
