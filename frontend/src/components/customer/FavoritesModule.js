import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Trash2, AlertCircle } from 'lucide-react';
import { favoritesAPI } from '../../services/api';

const FavoritesModule = ({ onAddToCart }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await favoritesAPI.getAll();
      setFavorites(response.data);
    } catch (err) {
      setError('Favoriler yüklenemedi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId) => {
    try {
      await favoritesAPI.remove(productId);
      setFavorites(favorites.filter(f => f.product_id !== productId));
    } catch (err) {
      alert('Favori kaldırılamadı: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddToCart = (product) => {
    if (onAddToCart) {
      onAddToCart({
        id: product.product_id,
        name: product.product_name,
        sku: product.product_sku,
        price: product.product_price,
        category: product.product_category
      });
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
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">Favori Ürünlerim</h2>
          </div>
          <span className="text-sm text-gray-500">{favorites.length}/10</span>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Henüz favori ürününüz yok</p>
            <p className="text-sm text-gray-400 mt-2">Ürün kataloğundan favori ekleyebilirsiniz</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{fav.product_name}</h3>
                    <p className="text-sm text-gray-500">SKU: {fav.product_sku}</p>
                    <p className="text-xs text-gray-400 mt-1">{fav.product_category}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFavorite(fav.product_id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Favorilerden çıkar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-lg font-semibold text-blue-600">
                    ₺{(fav.product_price || 0).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleAddToCart(fav)}
                    className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Sepete Ekle</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesModule;
