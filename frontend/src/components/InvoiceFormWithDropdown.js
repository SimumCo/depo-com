import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const InvoiceFormWithDropdown = ({ onSuccess }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_number: '',
    invoice_date: '',
    selected_products: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load customers
      const customersResponse = await axios.get(
        `${BACKEND_URL}/api/salesrep/customers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCustomers(customersResponse.data);

      // Load products
      const productsResponse = await axios.get(
        `${BACKEND_URL}/api/products`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts(productsResponse.data);
    } catch (err) {
      console.error('Error loading dropdown data:', err);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoadingData(false);
    }
  };

  const addProduct = () => {
    setFormData({
      ...formData,
      selected_products: [
        ...formData.selected_products,
        { product_id: '', quantity: '', unit_price: '' }
      ]
    });
  };

  const updateProduct = (index, field, value) => {
    const updated = [...formData.selected_products];
    updated[index][field] = value;
    
    // Auto-fill price when product selected
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        // Get customer channel type to determine price
        const customer = customers.find(c => c.id === formData.customer_id);
        const price = customer?.channel_type === 'logistics' 
          ? product.logistics_price 
          : product.dealer_price;
        updated[index]['unit_price'] = price.toString();
      }
    }
    
    setFormData({ ...formData, selected_products: updated });
  };

  const removeProduct = (index) => {
    const updated = [...formData.selected_products];
    updated.splice(index, 1);
    setFormData({ ...formData, selected_products: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      const customer = customers.find(c => c.id === formData.customer_id);
      
      if (!customer) {
        toast.error('Müşteri bulunamadı');
        return;
      }

      // Calculate totals
      let subtotal = 0;
      const invoiceProducts = formData.selected_products.map(p => {
        const product = products.find(pr => pr.id === p.product_id);
        const quantity = parseFloat(p.quantity);
        const unitPrice = parseFloat(p.unit_price);
        const total = (quantity * unitPrice).toFixed(2);
        subtotal += parseFloat(total);
        
        return {
          product_code: product.sku,
          product_name: product.name,
          quantity: quantity,
          unit_price: `${unitPrice.toFixed(2)} TL`,
          total: `${total} TL`
        };
      });

      const tax = (subtotal * 0.20).toFixed(2);
      const grandTotal = (subtotal + parseFloat(tax)).toFixed(2);

      // Create simple HTML invoice
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>E-Fatura</title>
        </head>
        <body>
          <h1>E-FATURA</h1>
          <p>Fatura No: ${formData.invoice_number}</p>
          <p>Tarih: ${formData.invoice_date}</p>
          <p>Müşteri: ${customer.full_name}</p>
          <p>Vergi No: ${customer.customer_number}</p>
          <table border="1">
            <tr>
              <th>Ürün</th>
              <th>Miktar</th>
              <th>Birim Fiyat</th>
              <th>Toplam</th>
            </tr>
            ${invoiceProducts.map(p => `
              <tr>
                <td>${p.product_name}</td>
                <td>${p.quantity}</td>
                <td>${p.unit_price}</td>
                <td>${p.total}</td>
              </tr>
            `).join('')}
          </table>
          <p>Ara Toplam: ${subtotal.toFixed(2)} TL</p>
          <p>KDV (%20): ${tax} TL</p>
          <p><strong>Genel Toplam: ${grandTotal} TL</strong></p>
        </body>
        </html>
      `;

      const response = await axios.post(
        `${BACKEND_URL}/api/invoices/upload`,
        { html_content: htmlContent },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      toast.success('Fatura başarıyla kaydedildi!');
      setFormData({
        customer_id: '',
        invoice_number: '',
        invoice_date: '',
        selected_products: []
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Hata detayı:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      } else {
        toast.error(err.response?.data?.detail || 'Fatura kaydedilemedi');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Yeni Fatura Oluştur</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Müşteri Seç *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Müşteri seçin...</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name} ({customer.customer_number})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              ✓ Fatura kesilecek müşteri
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fatura No *
            </label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              required
              minLength="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="EE12025000001234"
            />
            <p className="text-xs text-gray-500 mt-1">
              ✓ E-fatura numarası (ör: EE12025000001234)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fatura Tarihi *
            </label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ✓ Fatura kesim tarihi
            </p>
          </div>
        </div>

        {/* Products */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Ürünler</h3>
            <button
              type="button"
              onClick={addProduct}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            >
              + Ürün Ekle
            </button>
          </div>

          <div className="space-y-3">
            {formData.selected_products.map((product, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-end border p-3 rounded-lg">
                <div className="col-span-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ürün</label>
                  <select
                    value={product.product_id}
                    onChange={(e) => updateProduct(index, 'product_id', e.target.value)}
                    required
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Ürün seçin...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
                  <input
                    type="number"
                    value={product.quantity}
                    onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                    required
                    min="1"
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="10"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birim Fiyat</label>
                  <input
                    type="number"
                    step="0.01"
                    value={product.unit_price}
                    onChange={(e) => updateProduct(index, 'unit_price', e.target.value)}
                    required
                    min="0"
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="5.50"
                  />
                </div>

                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="w-full px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>

          {formData.selected_products.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
              Henüz ürün eklenmedi. "Ürün Ekle" butonuna tıklayarak ürün ekleyin.
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading || formData.selected_products.length === 0}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Kaydediliyor...' : 'Faturayı Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceFormWithDropdown;
