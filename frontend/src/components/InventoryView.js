import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Package, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../services/api';

const InventoryView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      if (response.data) {
        // Simüle edilmiş stok verileri ekle
        const productsWithStock = (Array.isArray(response.data) ? response.data : response.data.data || []).map(p => ({
          ...p,
          stock_qty: Math.floor(Math.random() * 500) + 50,
          min_stock: 100,
          location: ['A1', 'A2', 'B1', 'B2', 'C1'][Math.floor(Math.random() * 5)]
        }));
        setProducts(productsWithStock);
      }
    } catch (error) {
      console.error('Envanter verisi alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.product_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (product) => {
    if (product.stock_qty <= product.min_stock * 0.5) return 'critical';
    if (product.stock_qty <= product.min_stock) return 'low';
    return 'ok';
  };

  return (
    <Card data-testid="inventory-view">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Envanter Durumu
          </div>
          <Badge variant="secondary">{products.length} Ürün</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Arama */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="inventory-search"
          />
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-green-600">
              {products.filter(p => getStockStatus(p) === 'ok').length}
            </p>
            <p className="text-xs text-green-700">Yeterli Stok</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">
              {products.filter(p => getStockStatus(p) === 'low').length}
            </p>
            <p className="text-xs text-yellow-700">Düşük Stok</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-red-600">
              {products.filter(p => getStockStatus(p) === 'critical').length}
            </p>
            <p className="text-xs text-red-700">Kritik Stok</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Ürün bulunamadı</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredProducts.map((product, index) => {
              const status = getStockStatus(product);
              return (
                <div
                  key={product.product_id || index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    status === 'critical' ? 'bg-red-50 border-red-200' :
                    status === 'low' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-white border-gray-200'
                  }`}
                  data-testid={`inventory-${product.product_id}`}
                >
                  <div className="flex items-center gap-3">
                    {status === 'critical' ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : status === 'low' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.product_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      status === 'critical' ? 'text-red-600' :
                      status === 'low' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {product.stock_qty} adet
                    </p>
                    <p className="text-xs text-gray-500">
                      Konum: {product.location}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryView;
