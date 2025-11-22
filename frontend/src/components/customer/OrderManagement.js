import React, { useState, useEffect } from 'react';
import { ShoppingCart, RotateCcw, Save, Plus, Minus, Trash2, Star, Package } from 'lucide-react';
import { ordersAPI, productsAPI, favoritesAPI } from '../../services/api';

const OrderManagement = () => {
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [savedCart, setSavedCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog'); // catalog, favorites

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, favoritesRes] = await Promise.all([
        productsAPI.getAll(),
        favoritesAPI.getAll()
      ]);
      setProducts(productsRes.data);
      setFavorites(favoritesRes.data);

      // Load last order
      try {
        const lastOrderRes = await ordersAPI.getLast();
        setLastOrder(lastOrderRes.data);
      } catch (err) {
        // No last order
      }

      // Load saved cart
      try {
        const savedCartRes = await ordersAPI.getSavedCart();
        if (savedCartRes.data) {
          setSavedCart(savedCartRes.data);
          setCart(savedCartRes.data.products);
        }
      } catch (err) {
        // No saved cart
      }
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        price: product.price,
        quantity: quantity
      }]);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.product_id === productId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleSaveCart = async () => {
    if (cart.length === 0) {
      alert('Sepetiniz boş!');
      return;
    }

    try {
      await ordersAPI.saveCart({
        products: cart,
        total_amount: calculateTotal()
      });
      alert('Sepet kaydedildi! Daha sonra devam edebilirsiniz.');
    } catch (err) {
      alert('Sepet kaydedilemedi: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleReorder = async () => {
    if (!lastOrder) return;

    try {
      setSubmitting(true);
      await ordersAPI.reorder(lastOrder.id);
      alert('Sipariş başarıyla oluşturuldu!');
      setCart([]);
      loadData();
    } catch (err) {
      alert('Tekrar sipariş oluşturulamadı: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      alert('Sepetiniz boş!');
      return;
    }

    try {
      setSubmitting(true);
      await ordersAPI.create({
        products: cart,
        total_amount: calculateTotal(),
        channel_type: 'dealer'
      });
      alert('Sipariş başarıyla oluşturuldu!');
      setCart([]);
      setSavedCart(null);
      loadData();
    } catch (err) {
      alert('Sipariş oluşturulamadı: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Selection */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Sipariş Oluştur</h2>
            {lastOrder && (
              <button
                onClick={handleReorder}
                disabled={submitting}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Son Siparişi Tekrarla</span>
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ürün Kataloğu
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'favorites'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Star className="w-4 h-4 inline mr-1" />
              Favorilerim ({favorites.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'catalog' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      <p className="text-xs text-gray-400">{product.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-lg font-semibold text-blue-600">₺{(product.price || 0).toFixed(2)}</span>
                    <button
                      onClick={() => addToCart(product)}
                      className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Sepete Ekle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Henüz favori ürününüz yok</p>
                </div>
              ) : (
                favorites.map((fav) => (
                  <div key={fav.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{fav.product_name}</h3>
                        <p className="text-sm text-gray-500">SKU: {fav.product_sku}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-lg font-semibold text-blue-600">₺{(fav.product_price || 0).toFixed(2)}</span>
                      <button
                        onClick={() => addToCart({ id: fav.product_id, name: fav.product_name, sku: fav.product_sku, price: fav.product_price || 0 })}
                        className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Sepete Ekle</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-lg shadow h-fit sticky top-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5" />
            <span>Sepetim ({cart.length})</span>
          </h3>
        </div>

        <div className="p-6">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Sepetiniz boş</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500">₺{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <>
              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="flex items-center justify-between text-lg font-bold text-gray-900">
                  <span>Toplam:</span>
                  <span>₺{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Gönderiliyor...' : 'Siparişi Tamamla'}
                </button>
                <button
                  onClick={handleSaveCart}
                  className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Sepeti Kaydet</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;
