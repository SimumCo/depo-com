import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ProductForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    logistics_price: '',
    dealer_price: '',
    units_per_case: '',
    stock_quantity: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const productData = {
        ...formData,
        logistics_price: parseFloat(formData.logistics_price),
        dealer_price: parseFloat(formData.dealer_price),
        units_per_case: parseInt(formData.units_per_case),
        stock_quantity: parseInt(formData.stock_quantity)
      };

      const response = await axios.post(
        `${BACKEND_URL}/api/products`,
        productData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Ürün başarıyla kaydedildi!');
      setFormData({
        name: '',
        sku: '',
        category: '',
        logistics_price: '',
        dealer_price: '',
        units_per_case: '',
        stock_quantity: ''
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ürün kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Yeni Ürün Ekle</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ürün Adı *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ayran 170ml"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKU / Ürün Kodu *
            </label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="AYR-170"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori *
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Süt Ürünleri"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kolide Kaç Adet *
            </label>
            <input
              type="number"
              name="units_per_case"
              value={formData.units_per_case}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logistics Fiyatı (TL) *
            </label>
            <input
              type="number"
              step="0.01"
              name="logistics_price"
              value={formData.logistics_price}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="5.50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dealer Fiyatı (TL) *
            </label>
            <input
              type="number"
              step="0.01"
              name="dealer_price"
              value={formData.dealer_price}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="6.00"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlangıç Stok Miktarı (Adet) *
            </label>
            <input
              type="number"
              name="stock_quantity"
              value={formData.stock_quantity}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Kaydediliyor...' : 'Ürünü Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
