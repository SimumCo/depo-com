import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Package, Send, Loader2, Search, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const StockDeclaration = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchDraftItems();
  }, []);

  useEffect(() => {
    if (search.trim()) {
      const timer = setTimeout(() => {
        searchProducts();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [search]);

  const fetchDraftItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // İlk 5 ürünü varsayılan olarak ekle
      const defaultItems = response.data.products.slice(0, 5).map(product => ({
        product_id: product.id,
        product: {
          code: product.code,
          name: product.name
        },
        qty: ''
      }));
      
      setItems(defaultItems);
    } catch (error) {
      console.error('Ürünler yüklenemedi:', error);
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/products?search=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Mevcut ürünleri filtrele
      const existingIds = items.map(i => i.product_id);
      const filtered = response.data.products.filter(p => !existingIds.includes(p.id));
      setSearchResults(filtered);
    } catch (error) {
      console.error('Arama hatası:', error);
    }
  };

  const handleSubmit = async () => {
    const validItems = items.filter(i => i.qty !== '' && parseInt(i.qty, 10) >= 0);
    
    if (validItems.length === 0) {
      toast.error('En az bir ürün için stok miktarı girin');
      return;
    }

    setSubmitting(true);
    try {
      // Bu örnekte basit bir başarı mesajı gösteriyoruz
      // Gerçek uygulamada backend'e POST isteği atılır
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`${validItems.length} ürün için stok bildirimi kaydedildi`);
      
      // Stok miktarlarını sıfırla
      setItems(prev => prev.map(i => ({ ...i, qty: '' })));
    } catch (error) {
      toast.error('Stok bildirimi gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const addProduct = (product) => {
    setItems(prev => [
      ...prev,
      {
        product_id: product.id,
        product: {
          code: product.code,
          name: product.name
        },
        qty: ''
      }
    ]);
    setShowAdd(false);
    setSearch('');
    setSearchResults([]);
  };

  const removeProduct = (productId) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stok Bildirimi</h2>
        <p className="text-muted-foreground mt-1">
          Mevcut stok durumunuzu bildirin. Bu bilgi tüketim hesaplamalarında kullanılacaktır.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-center gap-3 py-4">
          <Package className="text-blue-600" size={20} />
          <p className="text-sm text-blue-900">
            Stok bildirimi, sipariş önerilerinizin daha doğru hesaplanmasına yardımcı olur.
          </p>
        </CardContent>
      </Card>

      {/* Stock Items */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <Card key={item.product_id}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product?.name}</p>
                <p className="text-xs text-muted-foreground">{item.product?.code}</p>
              </div>
              <Input
                type="number"
                min="0"
                value={item.qty}
                onChange={(e) =>
                  setItems(prev =>
                    prev.map(i =>
                      i.product_id === item.product_id
                        ? { ...i, qty: e.target.value }
                        : i
                    )
                  )
                }
                placeholder="Mevcut stok"
                className="w-32 text-right"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeProduct(item.product_id)}
                className="text-muted-foreground hover:text-red-500"
              >
                <Trash2 size={16} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Product Section */}
      {showAdd ? (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                placeholder="Ürün adı veya kodu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchResults.map(product => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-secondary cursor-pointer"
                    onClick={() => addProduct(product)}
                  >
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.code}</p>
                    </div>
                    <Plus size={16} className="text-primary" />
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setShowAdd(false);
                setSearch('');
                setSearchResults([]);
              }}
            >
              İptal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAdd(true)}
          className="w-full border-dashed"
        >
          <Plus size={16} className="mr-2" /> Ürün Ekle
        </Button>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Gönderiliyor...
          </>
        ) : (
          <>
            <Send size={16} className="mr-2" />
            Stok Bildir
          </>
        )}
      </Button>
    </div>
  );
};

export default StockDeclaration;