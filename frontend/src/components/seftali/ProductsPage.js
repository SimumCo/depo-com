import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { Search, Plus, Minus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState({});
  const [filter, setFilter] = useState('all');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, draftRes] = await Promise.all([
        sfCustomerAPI.getConsumptionSummary(),
        sfCustomerAPI.getDraft(),
      ]);
      const summary = (summaryRes.data?.data || []).sort((a, b) => b.avg_daily - a.avg_daily);
      const draftItems = draftRes.data?.data?.items || [];

      // Merge draft suggestions into summary
      const draftMap = {};
      draftItems.forEach(di => { draftMap[di.product_id] = di; });

      const merged = summary.map(s => ({
        ...s,
        suggested_qty: draftMap[s.product_id]?.suggested_qty || 0,
        last_qty: draftMap[s.product_id]?.stock_effective_used || 0,
      }));

      setProducts(merged);

      // Set initial quantities to suggested
      const initQ = {};
      merged.forEach(p => { initQ[p.product_id] = p.suggested_qty; });
      setQuantities(initQ);
    } catch {
      toast.error('Urunler yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const updateQty = (pid, delta) => {
    setQuantities(prev => ({ ...prev, [pid]: Math.max(0, (prev[pid] || 0) + delta) }));
  };

  const setQty = (pid, val) => {
    const n = parseInt(val) || 0;
    setQuantities(prev => ({ ...prev, [pid]: Math.max(0, n) }));
  };

  const addToCart = (product) => {
    const qty = quantities[product.product_id] || 0;
    if (qty <= 0) { toast.error('Miktar 0 olamaz'); return; }
    toast.success(`${product.product_name} - ${qty} adet sepete eklendi`);
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.product_name?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'sik') return matchSearch && p.avg_daily > 0.5;
    if (filter === 'stokta') return matchSearch && p.last_qty > 0;
    return matchSearch;
  });

  const filters = [
    { id: 'all', label: 'Tum Urunler' },
    { id: 'sik', label: 'Sik Alinanlar', count: products.filter(p => p.avg_daily > 0.5).length },
    { id: 'stokta', label: 'Stokta Olanlar' },
  ];

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  }

  return (
    <div data-testid="products-page">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Urun ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          data-testid="product-search"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            data-testid={`filter-${f.id}`}>
            {f.label} {f.count != null && <span className="ml-1 opacity-75">{f.count}</span>}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 mb-3" data-testid="product-count">
        Toplam {filtered.length} urun gosteriliyor
      </p>

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((product, idx) => {
          const qty = quantities[product.product_id] || 0;
          return (
            <div key={product.product_id}
              className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:shadow-md transition-shadow"
              data-testid={`product-card-${idx}`}>

              {/* Product info */}
              <div className="mb-2">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">{product.product_name}</h3>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs text-slate-500">
                    Son Alis: <span className="font-medium text-slate-700">{product.last_qty} Adet</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Onerilen: <span className="font-medium text-orange-600">{product.suggested_qty} Adet</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Ort: {product.avg_daily}/gun
                  </p>
                </div>
              </div>

              {/* Quantity + Add to cart */}
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-1">
                  <button onClick={() => updateQty(product.product_id, -1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                    data-testid={`qty-minus-${idx}`}>
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input type="number" value={qty}
                    onChange={e => setQty(product.product_id, e.target.value)}
                    className="w-10 h-8 text-center text-sm font-bold text-slate-800 border-x border-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    data-testid={`qty-input-${idx}`}
                  />
                  <button onClick={() => updateQty(product.product_id, 1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                    data-testid={`qty-plus-${idx}`}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={() => addToCart(product)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-semibold px-2 py-2 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                  data-testid={`add-cart-${idx}`}>
                  <ShoppingCart className="w-3 h-3" />
                  Ekle
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">Urun bulunamadi</p>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
