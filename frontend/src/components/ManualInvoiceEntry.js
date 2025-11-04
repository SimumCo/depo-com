import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PRODUCT_CATEGORIES = [
  'Süt Ürünleri',
  'Yoğurt',
  'Ayran',
  'Peynir',
  'Kaşar',
  'Tereyağı',
  'Krema',
  'Süt',
  'Kefir',
  'Labne',
  'Lor',
  'Diğer'
];

const ManualInvoiceEntry = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  // Müşteri bilgileri
  const [customer, setCustomer] = useState({
    customer_name: '',
    customer_tax_id: '',
    address: '',
    email: '',
    phone: ''
  });
  
  // Fatura bilgileri
  const [invoice, setInvoice] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    subtotal: '0',
    total_discount: '0',
    total_tax: '0',
    grand_total: '0'
  });
  
  // Ürün listesi
  const [products, setProducts] = useState([{
    product_code: '',
    product_name: '',
    category: 'Süt Ürünleri',
    quantity: '',
    unit: 'ADET',
    unit_price: '',
    total: '0'
  }]);
  
  const [createdInfo, setCreatedInfo] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Vergi numarası ile müşteri bilgisi çekme
  const lookupCustomerByTaxId = async (taxId) => {
    if (!taxId || taxId.length < 10) return;
    
    try {
      setLookupLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${BACKEND_URL}/api/customers/lookup/${taxId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.found) {
        // Müşteri bilgilerini form'a doldur
        setCustomer({
          customer_name: response.data.customer_name,
          customer_tax_id: response.data.customer_tax_id,
          address: response.data.address,
          email: response.data.email,
          phone: response.data.phone
        });
        
        toast.success('Müşteri bilgileri bulundu ve dolduruldu');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast.info('Bu vergi numarası ile kayıtlı müşteri bulunamadı. Yeni müşteri oluşturulacak.');
      } else {
        console.error('Müşteri arama hatası:', err);
      }
    } finally {
      setLookupLoading(false);
    }
  };

  // Vergi numarası değiştiğinde otomatik ara (debounce ile)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (customer.customer_tax_id && customer.customer_tax_id.length >= 10) {
        lookupCustomerByTaxId(customer.customer_tax_id);
      }
    }, 800);
    
    return () => clearTimeout(timer);
  }, [customer.customer_tax_id]);

  // Ürün ekleme
  const addProduct = () => {
    setProducts([...products, {
      product_code: '',
      product_name: '',
      category: 'Süt Ürünleri',
      quantity: '',
      unit: 'ADET',
      unit_price: '',
      total: '0'
    }]);
  };

  // Ürün silme
  const removeProduct = (index) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    calculateTotals(newProducts);
  };

  // Ürün güncelleme
  const updateProduct = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;
    
    // Toplam hesapla
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(newProducts[index].quantity) || 0;
      const unitPrice = parseFloat(newProducts[index].unit_price) || 0;
      newProducts[index].total = (quantity * unitPrice).toFixed(2);
    }
    
    setProducts(newProducts);
    calculateTotals(newProducts);
  };

  // Toplam hesaplama
  const calculateTotals = (productList) => {
    const subtotal = productList.reduce((sum, p) => {
      return sum + (parseFloat(p.total) || 0);
    }, 0);
    
    const totalDiscount = parseFloat(invoice.total_discount) || 0;
    const taxRate = 0.01; // %1 KDV
    const totalTax = (subtotal - totalDiscount) * taxRate;
    const grandTotal = subtotal - totalDiscount + totalTax;
    
    setInvoice({
      ...invoice,
      subtotal: subtotal.toFixed(2),
      total_tax: totalTax.toFixed(2),
      grand_total: grandTotal.toFixed(2)
    });
  };

  // Form gönderme
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasyon
    if (!customer.customer_name || !customer.customer_tax_id) {
      toast.error('Müşteri adı ve vergi numarası zorunludur');
      return;
    }
    
    if (!invoice.invoice_number || !invoice.invoice_date) {
      toast.error('Fatura numarası ve tarihi zorunludur');
      return;
    }
    
    if (products.length === 0 || !products[0].product_name) {
      toast.error('En az bir ürün eklemelisiniz');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${BACKEND_URL}/api/invoices/manual-entry`,
        {
          customer,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          products: products.map(p => ({
            ...p,
            quantity: parseFloat(p.quantity) || 0
          })),
          subtotal: invoice.subtotal,
          total_discount: invoice.total_discount,
          total_tax: invoice.total_tax,
          grand_total: invoice.grand_total
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = response.data;
      
      // Oluşturulan bilgileri göster
      setCreatedInfo({
        customer_created: result.customer_created,
        customer_username: result.customer_username,
        customer_password: result.customer_password,
        products_created: result.products_created || []
      });
      
      toast.success('Manuel fatura başarıyla oluşturuldu!');
      
      if (onSuccess) onSuccess();
      
    } catch (err) {
      console.error('Error creating manual invoice:', err);
      
      if (err.response?.status === 401) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      } else if (err.response?.status === 403) {
        toast.error('Bu işlem için yetkiniz yok.');
      } else {
        toast.error(err.response?.data?.detail || 'Fatura oluşturulurken hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Manuel Fatura Girişi</h1>
        <p className="text-gray-600 mt-2">Fatura bilgilerini manuel olarak girin. Yeni müşteri ve ürünler otomatik oluşturulur.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Müşteri Bilgileri */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Müşteri Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Müşteri Adı *
              </label>
              <input
                type="text"
                value={customer.customer_name}
                onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="YÖRÜKOĞLU SÜT VE ÜRÜNLERİ..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vergi Numarası *
                {lookupLoading && <span className="ml-2 text-blue-500 text-xs">Müşteri aranıyor...</span>}
              </label>
              <input
                type="text"
                value={customer.customer_tax_id}
                onChange={(e) => setCustomer({ ...customer, customer_tax_id: e.target.value })}
                required
                maxLength="11"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="9830366087"
              />
              <p className="text-xs text-gray-500 mt-1">Vergi numarası girildiğinde müşteri bilgileri otomatik getirilir</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="info@musteri.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <input
                type="tel"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0312 123 45 67"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adres
              </label>
              <textarea
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Müşteri adresi"
              />
            </div>
          </div>
        </div>

        {/* Fatura Bilgileri */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Fatura Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fatura No *
              </label>
              <input
                type="text"
                value={invoice.invoice_number}
                onChange={(e) => setInvoice({ ...invoice, invoice_number: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SED2025000000078"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fatura Tarihi *
              </label>
              <input
                type="date"
                value={invoice.invoice_date}
                onChange={(e) => setInvoice({ ...invoice, invoice_date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İskonto Tutarı
              </label>
              <input
                type="number"
                step="0.01"
                value={invoice.total_discount}
                onChange={(e) => {
                  setInvoice({ ...invoice, total_discount: e.target.value });
                  calculateTotals(products);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Ürün Listesi */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Ürünler</h2>
            <button
              type="button"
              onClick={addProduct}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              + Yeni Ürün Ekle
            </button>
          </div>
          
          <div className="space-y-4">
            {products.map((product, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Kodu *</label>
                    <input
                      type="text"
                      value={product.product_code}
                      onChange={(e) => updateProduct(index, 'product_code', e.target.value)}
                      required
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="151"
                    />
                  </div>
                  
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı *</label>
                    <input
                      type="text"
                      value={product.product_name}
                      onChange={(e) => updateProduct(index, 'product_name', e.target.value)}
                      required
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="SÜZME YOĞURT 10 KG."
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                    <select
                      value={product.category}
                      onChange={(e) => updateProduct(index, 'category', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      {PRODUCT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Miktar *</label>
                    <input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                      required
                      min="0"
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="9"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
                    <select
                      value={product.unit}
                      onChange={(e) => updateProduct(index, 'unit', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="ADET">ADET</option>
                      <option value="KG">KG</option>
                      <option value="LT">LT</option>
                      <option value="GR">GR</option>
                      <option value="ML">ML</option>
                    </select>
                  </div>
                  
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birim Fiyat *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={product.unit_price}
                      onChange={(e) => updateProduct(index, 'unit_price', e.target.value)}
                      required
                      min="0"
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="1047.12"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Toplam</label>
                    <input
                      type="text"
                      value={product.total}
                      readOnly
                      className="w-full px-2 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                    />
                  </div>
                  
                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      disabled={products.length === 1}
                      className="w-full px-2 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Toplam Bilgiler */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ara Toplam:</span>
                  <span className="font-semibold">{invoice.subtotal} TL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">İskonto:</span>
                  <span className="font-semibold">{invoice.total_discount} TL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">KDV (%1):</span>
                  <span className="font-semibold">{invoice.total_tax} TL</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2">
                  <span className="text-gray-800 font-bold">Genel Toplam:</span>
                  <span className="font-bold text-blue-600">{invoice.grand_total} TL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-lg font-semibold"
          >
            {loading ? 'Kaydediliyor...' : 'Faturayı Kaydet'}
          </button>
        </div>
      </form>

      {/* Oluşturulan Bilgiler */}
      {createdInfo && (
        <div className="mt-6 bg-green-50 border-2 border-green-500 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-700">
            ✅ Fatura Başarıyla Oluşturuldu!
          </h3>
          
          {createdInfo.customer_created && (
            <div className="mb-4 bg-white rounded p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Yeni Müşteri Bilgileri:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Kullanıcı Adı:</span> {createdInfo.customer_username}</p>
                <p><span className="font-medium">Şifre:</span> {createdInfo.customer_password}</p>
                <p className="text-red-600 text-xs mt-2">⚠️ Bu bilgileri müşteriye iletin!</p>
              </div>
            </div>
          )}
          
          {createdInfo.products_created && createdInfo.products_created.length > 0 && (
            <div className="bg-white rounded p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Yeni Oluşturulan Ürünler:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {createdInfo.products_created.map((product, idx) => (
                  <li key={idx}>{product}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManualInvoiceEntry;
