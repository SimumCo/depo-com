// Plasiyer Stok Sayfası
import React, { useState, useEffect } from 'react';
import { Box, RefreshCw, Minus, Plus, Check, Edit3 } from 'lucide-react';
import { PageHeader } from '../ui/DesignSystem';
import { sfSalesAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';

const StockPage = ({ products = [] }) => {
  const [plasiyerStock, setPlasiyerStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [stockUpdates, setStockUpdates] = useState({});

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await sfSalesAPI.getPlasiyerStock();
      if (res.data?.success) {
        setPlasiyerStock(res.data.data?.items || []);
      }
    } catch (err) {
      console.error('Stok yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const handleStockChange = (productId, delta) => {
    const currentStock = plasiyerStock.find(s => s.product_id === productId)?.qty || 0;
    const currentUpdate = stockUpdates[productId] ?? currentStock;
    const newValue = Math.max(0, currentUpdate + delta);
    setStockUpdates(prev => ({ ...prev, [productId]: newValue }));
  };

  const saveStockUpdates = async () => {
    const items = Object.entries(stockUpdates).map(([product_id, qty]) => ({
      product_id,
      qty
    }));

    if (items.length === 0) {
      toast.warning('Değişiklik yapılmadı');
      return;
    }

    try {
      await sfSalesAPI.updatePlasiyerStock({ items, operation: 'set' });
      toast.success('Stok güncellendi');
      setEditMode(false);
      setStockUpdates({});
      fetchStock();
    } catch (err) {
      toast.error('Stok güncellenirken hata oluştu');
    }
  };

  // Tüm ürünleri birleştir (plasiyer stoğu + ürün listesi)
  const allProducts = products.map(prod => {
    const stockItem = plasiyerStock.find(s => s.product_id === prod.product_id);
    return {
      ...prod,
      stock_qty: stockItem?.qty || 0
    };
  });

  // Eğer products boş ise, sadece plasiyer stoğundaki ürünleri göster
  const displayProducts = products.length > 0 ? allProducts : plasiyerStock.map(s => ({
    product_id: s.product_id,
    name: s.product_name,
    stock_qty: s.qty
  }));

  const lowStock = displayProducts.filter(p => p.stock_qty > 0 && p.stock_qty < 5).length;
  const outOfStock = displayProducts.filter(p => p.stock_qty === 0).length;

  return (
    <div className="space-y-6" data-testid="stock-page">
      <div className="flex items-center justify-between">
        <PageHeader title="Stok Durumu" subtitle="Ana Sayfa / Stok" />
        <div className="flex gap-2">
          <button
            onClick={fetchStock}
            disabled={loading}
            className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              if (editMode) {
                saveStockUpdates();
              } else {
                setEditMode(true);
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              editMode 
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {editMode ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" /> Kaydet
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> Düzenle
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Stok Özeti */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 mb-1">Toplam Ürün</p>
          <p className="text-2xl font-bold text-emerald-700">{displayProducts.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600 mb-1">Düşük Stok (&lt;5)</p>
          <p className="text-2xl font-bold text-amber-700">{lowStock}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 mb-1">Stok Bitti</p>
          <p className="text-2xl font-bold text-red-700">{outOfStock}</p>
        </div>
      </div>

      {/* Ürün Listesi */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Ürün Stok Listesi</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-orange-500 mx-auto mb-3 animate-spin" />
            <p className="text-slate-500">Yükleniyor...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayProducts.length > 0 ? (
              displayProducts.map((product, idx) => {
                const productId = product.product_id;
                const currentQty = stockUpdates[productId] ?? product.stock_qty;
                
                return (
                  <div key={productId || idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-800">{product.name || product.product_name}</p>
                      <p className="text-xs text-slate-500">{product.code || productId}</p>
                    </div>
                    
                    {editMode ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStockChange(productId, -1)}
                          className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-16 text-center text-lg font-bold text-orange-600">{currentQty}</span>
                        <button
                          onClick={() => handleStockChange(productId, 1)}
                          className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          product.stock_qty === 0 ? 'text-red-500' :
                          product.stock_qty < 5 ? 'text-amber-500' : 'text-emerald-600'
                        }`}>
                          {product.stock_qty}
                        </p>
                        <p className="text-xs text-slate-500">adet</p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Stok verisi bulunamadı</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPage;
