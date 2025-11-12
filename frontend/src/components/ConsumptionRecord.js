import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Calendar, Package, Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ConsumptionRecord = () => {
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [patterns, setPatterns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  const [formData, setFormData] = useState({
    product_id: '',
    consumption_date: new Date().toISOString().split('T')[0],
    quantity_used: '',
    consumption_type: 'manual',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Records
      const recordsRes = await axios.get(`${BACKEND_URL}/api/customer-consumption/records`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50 }
      });
      setRecords(recordsRes.data);
      
      // Products
      const productsRes = await axios.get(`${BACKEND_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(productsRes.data);
      
      // Patterns
      const patternsRes = await axios.get(`${BACKEND_URL}/api/customer-consumption/patterns/my-patterns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatterns(patternsRes.data);
      
      // Analytics
      const analyticsRes = await axios.get(`${BACKEND_URL}/api/customer-consumption/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(analyticsRes.data);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.product_id || !formData.quantity_used) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/customer-consumption/record`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            customer_id: JSON.parse(localStorage.getItem('user')).id,
            ...formData
          }
        }
      );
      
      toast.success('Tüketim kaydı eklendi!');
      setShowAddForm(false);
      setFormData({
        product_id: '',
        consumption_date: new Date().toISOString().split('T')[0],
        quantity_used: '',
        consumption_type: 'manual',
        notes: ''
      });
      fetchData();
    } catch (err) {
      console.error('Error creating record:', err);
      toast.error('Kayıt eklenirken hata oluştu');
    }
  };

  const getTrendIcon = (direction) => {
    if (direction === 1) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (direction === -1) return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-600" />;
  };

  const getTrendColor = (direction) => {
    if (direction === 1) return 'text-green-600';
    if (direction === -1) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Tüketim Kayıtları</h1>
          <p className="text-gray-600 mt-2">Ürün tüketimlerinizi kaydedin ve takip edin</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-5 w-5" />
          Tüketim Kaydet
        </button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-blue-100 text-sm font-medium">Toplam Kayıt</p>
            <p className="text-3xl font-bold mt-2">{analytics.total_records}</p>
            <p className="text-blue-100 text-xs mt-1">Son 30 gün</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-green-100 text-sm font-medium">Toplam Ürün</p>
            <p className="text-3xl font-bold mt-2">{analytics.total_products}</p>
            <p className="text-green-100 text-xs mt-1">Farklı ürün çeşidi</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-purple-100 text-sm font-medium">Toplam Miktar</p>
            <p className="text-3xl font-bold mt-2">{analytics.total_quantity.toFixed(0)}</p>
            <p className="text-purple-100 text-xs mt-1">Adet/KG/LT</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-orange-100 text-sm font-medium">Günlük Ortalama</p>
            <p className="text-3xl font-bold mt-2">{analytics.average_daily.toFixed(1)}</p>
            <p className="text-orange-100 text-xs mt-1">Adet/gün</p>
          </div>
        </div>
      )}

      {/* Consumption Patterns */}
      {patterns.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Tüketim Desenleri ve Trendler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patterns.slice(0, 6).map((pattern) => (
              <div key={pattern.pattern_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 text-sm">{pattern.product_name}</h3>
                  {getTrendIcon(pattern.trend_direction)}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Haftalık Ortalama:</span>
                    <span className="font-medium">{pattern.average_consumption.toFixed(1)} {pattern.product_unit}</span>
                  </div>
                  
                  {pattern.trend_percentage !== null && pattern.trend_percentage !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trend:</span>
                      <span className={`font-medium ${getTrendColor(pattern.trend_direction)}`}>
                        {pattern.trend_percentage > 0 ? '+' : ''}{pattern.trend_percentage.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Min: {pattern.min_consumption?.toFixed(1)}</span>
                    <span>Max: {pattern.max_consumption?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Yeni Tüketim Kaydı</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün *
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Ürün Seçin</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tüketim Tarihi *
                </label>
                <input
                  type="date"
                  value={formData.consumption_date}
                  onChange={(e) => setFormData({...formData, consumption_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Miktar *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity_used}
                  onChange={(e) => setFormData({...formData, quantity_used: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Opsiyonel notlar..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Tüketim Geçmişi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notlar</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length > 0 ? (
                records.map((record) => (
                  <tr key={record.consumption_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(record.consumption_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {record.product_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {record.quantity_used} {record.unit}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.consumption_type === 'manual' ? 'bg-blue-100 text-blue-800' :
                        record.consumption_type === 'automatic' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.consumption_type === 'manual' ? 'Manuel' :
                         record.consumption_type === 'automatic' ? 'Otomatik' : 'Tahmini'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>Henüz tüketim kaydı yok</p>
                    <p className="text-sm mt-1">Yeni kayıt eklemek için yukarıdaki butonu kullanın</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConsumptionRecord;
