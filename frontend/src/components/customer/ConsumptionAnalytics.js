import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Package, AlertCircle } from 'lucide-react';
import { consumptionAPI } from '../../services/api';

const ConsumptionAnalytics = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [period, setPeriod] = useState('last_month'); // last_month, last_6_months, last_year
  const [stats, setStats] = useState({ total: 0, change: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConsumptionData();
  }, [period]);

  const loadConsumptionData = async () => {
    try {
      setLoading(true);
      // Mock data - gerçek API'ye bağlanacak
      const mockMonthlyData = generateMockMonthlyData(period);
      const mockProductData = generateMockProductData();
      
      setMonthlyData(mockMonthlyData);
      setProductData(mockProductData);
      
      // İstatistikleri hesapla
      const total = mockMonthlyData.reduce((sum, item) => sum + item.amount, 0);
      const change = calculateChange(mockMonthlyData);
      setStats({ total, change });
      
    } catch (err) {
      setError('Tüketim verileri yüklenemedi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateMockMonthlyData = (period) => {
    const months = period === 'last_month' ? 4 : 
                   period === 'last_6_months' ? 6 : 12;
    
    const data = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
      data.push({
        month: monthName,
        amount: Math.floor(Math.random() * 5000) + 2000,
        orders: Math.floor(Math.random() * 20) + 5
      });
    }
    return data;
  };

  const generateMockProductData = () => {
    const products = ['Ürün A', 'Ürün B', 'Ürün C', 'Ürün D', 'Ürün E'];
    return products.map(name => ({
      name,
      quantity: Math.floor(Math.random() * 500) + 100
    }));
  };

  const calculateChange = (data) => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1].amount;
    const previous = data[data.length - 2].amount;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const periodOptions = [
    { value: 'last_month', label: 'Son Ay' },
    { value: 'last_6_months', label: 'Son 6 Ay' },
    { value: 'last_year', label: 'Geçen Yıl' }
  ];

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
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Tüketim Analizi</span>
          </h2>
          
          <div className="flex items-center space-x-2">
            {periodOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium mb-1">Toplam Tüketim</div>
            <div className="text-2xl font-bold text-blue-900">₺{stats.total.toLocaleString()}</div>
          </div>
          
          <div className={`bg-gradient-to-br ${
            stats.change >= 0 ? 'from-green-50 to-green-100' : 'from-red-50 to-red-100'
          } rounded-lg p-4`}>
            <div className={`text-sm font-medium mb-1 ${
              stats.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Değişim Oranı
            </div>
            <div className={`text-2xl font-bold flex items-center space-x-2 ${
              stats.change >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {stats.change >= 0 ? (
                <TrendingUp className="w-6 h-6" />
              ) : (
                <TrendingDown className="w-6 h-6" />
              )}
              <span>{Math.abs(stats.change)}%</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium mb-1">Toplam Sipariş</div>
            <div className="text-2xl font-bold text-purple-900">
              {monthlyData.reduce((sum, item) => sum + item.orders, 0)}
            </div>
          </div>
        </div>

        {/* Monthly Consumption Chart */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Aylık Tüketim Grafiği</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Tutar (₺)"
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Sipariş Sayısı"
                dot={{ fill: '#8b5cf6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Product-based Chart */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ürün Bazlı Tüketim</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="quantity" fill="#3b82f6" name="Miktar" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ConsumptionAnalytics;
