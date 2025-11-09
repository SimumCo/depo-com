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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sarfiyat Analizi</h1>
          <p className="text-gray-600 mt-2">Ürün bazlı tüketim istatistikleriniz</p>
        </div>
        
        {/* Period Selector */}
        <div>
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="weekly">Haftalık</option>
            <option value="monthly">Aylık</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {consumption.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Henüz Veri Yok</h3>
          <p className="mt-2 text-sm text-gray-500">
            Faturalarınız işlendikten sonra tüketim istatistikleri burada görünecektir.
          </p>
        </div>
      ) : (
        <>
          {/* İstatistik Kartları */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Toplam Ürün */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Toplam Ürün</p>
                    <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
                  </div>
                  <Package className="h-12 w-12 text-blue-200" />
                </div>
              </div>

              {/* Haftalık Tüketim */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Haftalık Tüketim</p>
                    <p className="text-3xl font-bold mt-2">{stats.totalWeeklyConsumption}</p>
                    <p className="text-green-100 text-xs mt-1">adet/hafta</p>
                  </div>
                  <Calendar className="h-12 w-12 text-green-200" />
                </div>
              </div>

              {/* Aylık Tüketim */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Aylık Tüketim</p>
                    <p className="text-3xl font-bold mt-2">{stats.totalMonthlyConsumption}</p>
                    <p className="text-purple-100 text-xs mt-1">adet/ay</p>
                  </div>
                  <ShoppingCart className="h-12 w-12 text-purple-200" />
                </div>
              </div>

              {/* Ortalama Büyüme */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Ort. Büyüme</p>
                    <p className="text-3xl font-bold mt-2">
                      {stats.avgGrowth > 0 ? '+' : ''}{stats.avgGrowth}%
                    </p>
                    <p className="text-orange-100 text-xs mt-1">geçen aya göre</p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-orange-200" />
                </div>
              </div>
            </div>
          )}

          {/* En Çok Tüketilen Ürünler */}
          {stats && stats.topProducts.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-800">En Çok Tüketilen Ürünler</h2>
              </div>
              <div className="space-y-3">
                {stats.topProducts.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.product_name}</p>
                        <p className="text-sm text-gray-500">
                          {periodType === 'weekly' ? 'Haftalık' : 'Aylık'}: {Math.round(periodType === 'weekly' ? item.weekly_avg : item.monthly_avg)} adet
                        </p>
                      </div>
                    </div>
                    {item.growth_rate !== null && (
                      <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        item.growth_rate > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        <TrendingUp className={`h-4 w-4 mr-1 ${item.growth_rate < 0 ? 'rotate-180' : ''}`} />
                        {item.growth_rate > 0 ? '+' : ''}{Math.round(item.growth_rate)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tüm Ürünler Detaylı Liste */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tüm Ürünler Detaylı</h2>
            <div className="grid gap-4">
              {consumption.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
                  <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                    <h3 className="font-semibold text-gray-800">{item.product_name}</h3>
                  </div>
                  <div className="p-4">
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
                        <div className="text-sm font-medium text-purple-600 mb-1">Son Fatura</div>
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
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerConsumptionStats;
