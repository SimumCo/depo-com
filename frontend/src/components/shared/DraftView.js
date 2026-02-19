import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { Search, Plus, Minus, ShoppingCart, Clock, Package, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';

const DAY_TR = { MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba', THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar' };
const DAY_NUM = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };

function getNextRouteInfo(routeDays) {
  if (!routeDays?.length) return { label: null, routeDate: null, deadline: null, diff: null };
  const now = new Date();
  let minDiff = 8;
  for (const d of routeDays) {
    const target = DAY_NUM[d] ?? 0;
    let diff = (target - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    if (diff < minDiff) minDiff = diff;
  }
  const routeDate = new Date(now.getTime() + minDiff * 86400000);
  routeDate.setHours(0, 0, 0, 0);

  const deadline = new Date(routeDate.getTime() - 86400000);
  deadline.setHours(16, 0, 0, 0);

  const deadlineLate = new Date(deadline.getTime() + 30 * 60000);

  return {
    label: routeDays.map(d => DAY_TR[d] || d).join(', '),
    routeDate,
    deadline: now > deadlineLate ? null : deadline,
    deadlineLate,
    diff: minDiff,
  };
}

function useCountdown(deadline) {
  const [remaining, setRemaining] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) {
        const toleranceMs = 30 * 60000;
        if (diff > -toleranceMs) {
          setRemaining('Son 30 dakika!');
          setIsUrgent(true);
          setIsExpired(false);
        } else {
          setRemaining('Sure doldu');
          setIsExpired(true);
          setIsUrgent(false);
        }
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setIsUrgent(diff < 4 * 3600000);
      setIsExpired(false);
      if (d > 0) setRemaining(`${d} gun ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      else setRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [deadline]);
  return { remaining, isUrgent, isExpired };
}

// Product images mapping (placeholder colors based on product type)
const getProductImage = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('ayran')) return { bg: 'bg-blue-100', emoji: '🥛' };
  if (n.includes('yogurt') || n.includes('yoğurt')) return { bg: 'bg-amber-50', emoji: '🥣' };
  if (n.includes('peynir')) return { bg: 'bg-yellow-100', emoji: '🧀' };
  if (n.includes('sut') || n.includes('süt')) return { bg: 'bg-slate-100', emoji: '🥛' };
  if (n.includes('tereyag') || n.includes('tereyağ')) return { bg: 'bg-yellow-50', emoji: '🧈' };
  return { bg: 'bg-slate-100', emoji: '📦' };
};

const DraftView = ({ onStartEdit }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, draftRes, profileRes] = await Promise.all([
        sfCustomerAPI.getConsumptionSummary(),
        sfCustomerAPI.getDraft(),
        sfCustomerAPI.getProfile(),
      ]);
      
      const summary = (summaryRes.data?.data || []).sort((a, b) => b.avg_daily - a.avg_daily);
      const draftItems = draftRes.data?.data?.items || [];
      setProfile(profileRes.data?.data || null);

      // Merge draft suggestions into summary
      const draftMap = {};
      draftItems.forEach(di => { draftMap[di.product_id] = di; });

      const merged = summary.map(s => ({
        ...s,
        suggested_qty: draftMap[s.product_id]?.suggested_qty || 0,
        last_qty: draftMap[s.product_id]?.stock_effective_used || 0,
        price: 0, // Price will be added when available from backend
      }));

      setProducts(merged);

      // Initialize cart with suggested quantities
      const initCart = {};
      merged.forEach(p => {
        if (p.suggested_qty > 0) {
          initCart[p.product_id] = {
            product_id: p.product_id,
            product_name: p.product_name,
            quantity: p.suggested_qty,
            price: p.price || 0,
          };
        }
      });
      setCart(initCart);
    } catch {
      toast.error('Veriler yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const routeDays = profile?.route_plan?.days || [];
  const { label: routeLabel, deadline } = getNextRouteInfo(routeDays);
  const { remaining: countdown, isUrgent, isExpired } = useCountdown(deadline);

  const updateCartQty = (product, delta) => {
    setCart(prev => {
      const existing = prev[product.product_id];
      const newQty = Math.max(0, (existing?.quantity || 0) + delta);
      if (newQty === 0) {
        const { [product.product_id]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [product.product_id]: {
          product_id: product.product_id,
          product_name: product.product_name,
          quantity: newQty,
          price: product.price || 0,
        }
      };
    });
  };

  const setCartQty = (product, val) => {
    const qty = parseInt(val) || 0;
    setCart(prev => {
      if (qty <= 0) {
        const { [product.product_id]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [product.product_id]: {
          product_id: product.product_id,
          product_name: product.product_name,
          quantity: qty,
          price: product.price || 0,
        }
      };
    });
  };

  const addToCart = (product) => {
    const inputQty = document.getElementById(`qty-${product.product_id}`)?.value;
    const qty = parseInt(inputQty) || product.suggested_qty || 1;
    if (qty <= 0) {
      toast.error('Miktar 0 olamaz');
      return;
    }
    setCart(prev => ({
      ...prev,
      [product.product_id]: {
        product_id: product.product_id,
        product_name: product.product_name,
        quantity: qty,
        price: product.price || 0,
      }
    }));
    toast.success(`${product.product_name} sepete eklendi`);
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  };

  const cartItems = Object.values(cart);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cartItems.reduce((s, i) => s + (i.quantity * (i.price || 0)), 0);

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Sepetiniz bos!');
      return;
    }
    try {
      setSubmitting(true);
      // Start working copy and submit
      const wcRes = await sfCustomerAPI.startWorkingCopy();
      const wcId = wcRes.data?.data?.id;
      if (wcId) {
        await sfCustomerAPI.updateWorkingCopy(wcId, cartItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })));
        await sfCustomerAPI.submitWorkingCopy(wcId);
        toast.success('Siparisiniz basariyla gonderildi!');
        setCart({});
        fetchData();
      }
    } catch (err) {
      toast.error('Siparis gonderilemedi: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.product_name?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'onerilen') return matchSearch && p.suggested_qty > 0;
    if (filter === 'sik') return matchSearch && p.avg_daily > 0.5;
    return matchSearch;
  });

  const filters = [
    { id: 'all', label: 'Tum Urunler', count: products.length },
    { id: 'onerilen', label: 'Onerilen', count: products.filter(p => p.suggested_qty > 0).length },
    { id: 'sik', label: 'Sik Alinan', count: products.filter(p => p.avg_daily > 0.5).length },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div data-testid="draft-view" className="pb-20">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Yeni Siparis Olustur</h1>
        <p className="text-xs text-slate-500 mt-0.5">Ana Sayfa &gt; Yeni Siparis</p>
      </div>

      {/* Countdown Timer */}
      {countdown && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-4 ${
          isExpired ? 'bg-red-50 border border-red-200' :
          isUrgent ? 'bg-red-50 border border-red-300' :
          'bg-orange-50 border border-orange-200'
        }`} data-testid="order-countdown">
          <Clock className={`w-5 h-5 flex-shrink-0 ${isExpired ? 'text-red-500' : isUrgent ? 'text-red-500' : 'text-orange-500'}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${isExpired ? 'text-red-700' : isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
              {isExpired ? 'Siparis suresi doldu!' : `Siparis suresi: ${countdown}`}
            </p>
            <p className="text-xs text-slate-500">Rota: {routeLabel || '—'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product List - Left Side */}
        <div className="lg:col-span-2">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            {filters.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.id 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                data-testid={`filter-${f.id}`}>
                {f.label} <span className="ml-1 opacity-70">{f.count}</span>
              </button>
            ))}
            {/* Search */}
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                data-testid="product-search"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product, idx) => {
              const { bg, emoji } = getProductImage(product.product_name);
              const cartQty = cart[product.product_id]?.quantity || 0;
              const inputQty = cartQty || product.suggested_qty || 1;
              
              return (
                <div key={product.product_id}
                  className="bg-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition-all"
                  data-testid={`product-card-${idx}`}>
                  
                  {/* Header: Name + Price */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-800 leading-tight flex-1">{product.product_name}</h3>
                    {product.price > 0 && (
                      <span className="text-sm font-semibold text-slate-700">{product.price} TL</span>
                    )}
                  </div>

                  {/* Product Visual + Info */}
                  <div className="flex gap-3 mb-3">
                    <div className={`w-16 h-16 ${bg} rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}>
                      {emoji}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-lg font-bold text-orange-600">{product.suggested_qty || 0} <span className="text-xs font-normal text-slate-500">Koli</span></p>
                      <p className="text-xs text-slate-500">Son Alis: <span className="font-medium text-slate-700">{product.last_qty || 0} Koli</span></p>
                      <p className="text-xs text-slate-500">Onerilen: <span className="font-medium text-orange-600">{product.suggested_qty || 0} Koli</span></p>
                    </div>
                  </div>

                  {/* Quantity Controls + Add Button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-1">
                      <button onClick={() => {
                        const input = document.getElementById(`qty-${product.product_id}`);
                        const current = parseInt(input?.value) || 1;
                        if (input) input.value = Math.max(1, current - 1);
                      }}
                        className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors border-r border-slate-200"
                        data-testid={`qty-minus-${idx}`}>
                        <Minus className="w-4 h-4" />
                      </button>
                      <input 
                        id={`qty-${product.product_id}`}
                        type="number" 
                        defaultValue={inputQty}
                        className="w-12 h-9 text-center text-sm font-bold text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        data-testid={`qty-input-${idx}`}
                      />
                      <button onClick={() => {
                        const input = document.getElementById(`qty-${product.product_id}`);
                        const current = parseInt(input?.value) || 0;
                        if (input) input.value = current + 1;
                      }}
                        className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors border-l border-slate-200"
                        data-testid={`qty-plus-${idx}`}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={() => addToCart(product)}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      data-testid={`add-cart-${idx}`}>
                      Sepete Ekle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Urun bulunamadi</p>
            </div>
          )}
        </div>

        {/* Order Summary - Right Side */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sticky top-20" data-testid="order-summary">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Siparis Ozeti</h2>
            
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Sepetiniz bos</p>
                <p className="text-xs text-slate-400 mt-1">Urun ekleyerek baslayin</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {cartItems.map((item, idx) => {
                    const { emoji } = getProductImage(item.product_name);
                    return (
                      <div key={item.product_id} className="flex items-center gap-3 pb-3 border-b border-slate-100 last:border-0" data-testid={`cart-item-${idx}`}>
                        <span className="text-lg">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.product_name}</p>
                          <p className="text-xs text-slate-500">{item.quantity} Koli</p>
                        </div>
                        {item.price > 0 && (
                          <span className="text-sm font-semibold text-slate-700">{item.quantity * item.price} TL</span>
                        )}
                        <button onClick={() => removeFromCart(item.product_id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          data-testid={`remove-cart-${idx}`}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Stats */}
                <div className="bg-slate-50 rounded-lg p-3 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Toplam Urun:</span>
                    <span className="font-semibold text-slate-800">{cartItems.length} Cesit</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Toplam Adet:</span>
                    <span className="font-semibold text-slate-800">{totalItems} Koli</span>
                  </div>
                  {totalPrice > 0 && (
                    <div className="flex justify-between text-base pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-700">Toplam:</span>
                      <span className="font-bold text-orange-600">{totalPrice.toLocaleString('tr-TR')} TL</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Submit Button */}
            <button onClick={handleSubmitOrder}
              disabled={cartItems.length === 0 || submitting || isExpired}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
                cartItems.length === 0 || isExpired
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
              data-testid="submit-order-btn">
              {submitting ? 'Gonderiliyor...' : isExpired ? 'Sure Doldu' : 'Siparisi Tamamla'}
            </button>

            {isExpired && (
              <p className="text-xs text-red-500 text-center mt-2">
                Siparis suresi doldu. Bir sonraki rota gununu bekleyiniz.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Floating Cart Button (Mobile) */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-20 right-4 lg:hidden z-10" data-testid="floating-cart">
          <div className="bg-orange-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-white text-orange-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftView;
