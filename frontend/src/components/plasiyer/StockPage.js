// Plasiyer Stok Sayfası
import React from 'react';
import { Box } from 'lucide-react';
import { PageHeader } from '../ui/DesignSystem';

const StockPage = ({ products = [] }) => (
  <div className="space-y-6" data-testid="stock-page">
    <PageHeader title="Stok Durumu" subtitle="Ana Sayfa / Stok" />
    
    {/* Stok Özeti */}
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-xs text-emerald-600 mb-1">Toplam Ürün</p>
        <p className="text-2xl font-bold text-emerald-700">{products.length}</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-600 mb-1">Düşük Stok</p>
        <p className="text-2xl font-bold text-amber-700">0</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-xs text-red-600 mb-1">Stok Bitti</p>
        <p className="text-2xl font-bold text-red-700">0</p>
      </div>
    </div>

    {/* Ürün Listesi */}
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-800">Ürün Stok Listesi</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {products.length > 0 ? (
          products.map((product, idx) => (
            <div key={product.id || idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-800">{product.name}</p>
                <p className="text-xs text-slate-500">{product.code}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-600">
                  {product.stock_qty || '∞'}
                </p>
                <p className="text-xs text-slate-500">adet</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Ürün bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default StockPage;
