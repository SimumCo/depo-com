import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Package, ShoppingCart, Calendar, BarChart3, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CustomerConsumptionStats = () => {
  const [consumption, setConsumption] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState('monthly');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConsumption();
  }, [periodType]);

  const fetchConsumption = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/consumption/my-consumption?period_type=${periodType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConsumption(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching consumption:', err);
      setError('Tüketim verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  // İstatistik hesaplamaları
  const calculateStats = () => {
    if (!consumption || consumption.length === 0) return null;

    const totalProducts = consumption.length;
    const totalWeeklyConsumption = consumption.reduce((sum, item) => sum + (item.weekly_avg || 0), 0);
    const totalMonthlyConsumption = consumption.reduce((sum, item) => sum + (item.monthly_avg || 0), 0);
    const avgGrowth = consumption.filter(item => item.growth_rate !== null).reduce((sum, item, _, arr) => sum + item.growth_rate / arr.length, 0);
    
    const topProducts = [...consumption]
      .sort((a, b) => (b.monthly_avg || 0) - (a.monthly_avg || 0))
      .slice(0, 5);

    return {
      totalProducts,
      totalWeeklyConsumption: Math.round(totalWeeklyConsumption),
      totalMonthlyConsumption: Math.round(totalMonthlyConsumption),
      avgGrowth: Math.round(avgGrowth),
      topProducts
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Ürün Tüketim İstatistikleri</h1>
        <p className="text-gray-600 mt-2">Ürün bazlı sarfiyat ve tüketim analizi</p>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Dönem Seçin</label>
        <select
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value)}
          className="mt-1 block w-full md:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="weekly">Haftalık</option>
          <option value="monthly">Aylık</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
        </div>
      )}

      {consumption.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz veri yok</h3>
          <p className="mt-1 text-sm text-gray-500">
            Tüketim verisi henüz hesaplanmamış. Siparişleriniz sonrası veriler oluşacaktır.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {consumption.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
                <h3 className="text-lg font-semibold text-white">{item.product_name}</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Haftalık Tüketim */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-600 mb-1">Haftalık Ortalama</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {item.weekly_avg.toFixed(2)} adet
                    </div>
                  </div>

                  {/* Aylık Tüketim */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-green-600 mb-1">Aylık Ortalama</div>
                    <div className="text-2xl font-bold text-green-900">
                      {item.monthly_avg.toFixed(2)} adet
                    </div>
                  </div>

                  {/* Son Sipariş */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-purple-600 mb-1">Son Sipariş</div>
                    <div className="text-lg font-bold text-purple-900">
                      {formatDate(item.last_order_date)}
                    </div>
                  </div>
                </div>

                {/* Growth Rate & Prediction */}
                {(item.growth_rate !== null || item.prediction !== null) && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {item.growth_rate !== null && (
                      <div className="border-l-4 border-yellow-500 pl-4">
                        <div className="text-sm text-gray-600">Değişim Oranı</div>
                        <div className={`text-xl font-semibold ${
                          item.growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.growth_rate > 0 ? '+' : ''}{item.growth_rate.toFixed(2)}%
                        </div>
                      </div>
                    )}
                    
                    {item.prediction !== null && (
                      <div className="border-l-4 border-indigo-500 pl-4">
                        <div className="text-sm text-gray-600">Gelecek Dönem Tahmini</div>
                        <div className="text-xl font-semibold text-indigo-600">
                          {item.prediction.toFixed(2)} adet
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerConsumptionStats;
