import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CustomerForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    customer_number: '',
    sales_agent_id: ''  // Plasiyer ID
  });
  const [salesAgents, setSalesAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadSalesAgents();
  }, []);

  const loadSalesAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/salesagents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSalesAgents(response.data || []);
    } catch (err) {
      console.error('Plasiyerler yüklenemedi:', err);
      // Mock data
      setSalesAgents([
        { id: '1', full_name: 'Plasiyer 1' },
        { id: '2', full_name: 'Plasiyer 2' }
      ]);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

      const response = await axios.post(
        `${BACKEND_URL}/api/auth/create-user`,
        {
          ...formData,
          role: 'customer',
          channel_type: 'dealer'  // Default olarak dealer
        },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      toast.success(`Müşteri başarıyla kaydedildi! Kullanıcı adı: ${response.data.username}`);
      setFormData({
        username: '',
        password: '',
        email: '',
        full_name: '',
        customer_number: '',
        sales_agent_id: ''
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Hata detayı:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      } else {
        toast.error(err.response?.data?.detail || 'Müşteri kaydedilemedi');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Yeni Müşteri Ekle</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Adı *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="musteri123"
            />
            <p className="text-xs text-gray-500 mt-1">
              ✓ Minimum 3 karakter, boşluk içermemeli
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şifre *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="********"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ✓ Minimum 6 karakter, güvenli şifre kullanın
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ad Soyad *
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              minLength="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ahmet Yılmaz"
            />
            <p className="text-xs text-gray-500 mt-1">
              ✓ Firma veya kişi adı
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-posta
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ahmet@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              ✓ İletişim için e-posta (opsiyonel)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Müşteri Numarası / Vergi No *
            </label>
            <input
              type="text"
              name="customer_number"
              value={formData.customer_number}
              onChange={handleChange}
              required
              minLength="10"
              maxLength="11"
              pattern="[0-9]*"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1234567890"
            />
            <p className="text-xs text-gray-500 mt-1">
              ✓ 10-11 haneli vergi numarası (sadece rakam)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bağlı Plasiyer *
            </label>
            <select
              name="sales_agent_id"
              value={formData.sales_agent_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Plasiyer Seçin</option>
              {salesAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              ✓ Müşterinin bağlı olduğu plasiyer
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Kaydediliyor...' : 'Müşteriyi Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
