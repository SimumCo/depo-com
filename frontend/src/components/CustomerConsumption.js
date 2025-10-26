import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import api from '../services/api';
import { TrendingUp, Package, DollarSign, ShoppingCart, Calendar, BarChart3, PieChart, Activity, CalendarDays } from 'lucide-react';

const CustomerConsumption = ({ customerId = null }) => {
  const [consumption, setConsumption] = useState(null);
  const [periodSummary, setPeriodSummary] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [categoryGrowth, setCategoryGrowth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30'); // days
  const [analysisType, setAnalysisType] = useState('basic'); // basic, weekly, monthly, seasonal
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');

  const periodOptions = [
    { value: 'current_week', label: 'Bu Hafta', type: 'weekly' },
    { value: 'last_week', label: 'Geçen Hafta', type: 'weekly' },
    { value: 'current_month', label: 'Bu Ay', type: 'monthly' },
    { value: 'last_month', label: 'Geçen Ay', type: 'monthly' },
    { value: 'last_3_months', label: 'Son 3 Ay', type: 'monthly' },
    { value: 'current_season', label: 'Bu Mevsim', type: 'seasonal' },
    { value: 'last_season', label: 'Geçen Mevsim', type: 'seasonal' }
  ];

  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getMonthName = (month) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[month - 1];
  };

  const getSeasonName = (season) => {
    const seasons = {
      'spring': 'İlkbahar',
      'summer': 'Yaz',
      'autumn': 'Sonbahar', 
      'winter': 'Kış'
    };
    return seasons[season] || season;
  };

  // Yardımcı fonksiyonlar
  const calculateOverallGrowth = (data) => {
    if (data.length < 2) return 0;
    const current = data[0].total_amount;
    const previous = data[1].total_amount;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getBestPerformingPeriod = (data) => {
    return data.reduce((best, current) => 
      current.total_amount > best.total_amount ? current : best, data[0]);
  };

  const generateSmartRecommendations = (data, categories, analysisType) => {
    const recommendations = [];
    
    // Büyüme önerisi
    const growth = calculateOverallGrowth(data);
    if (growth > 10) {
      recommendations.push({
        type: 'success',
        title: 'Harika Büyüme!',
        description: `${growth}% büyüme ile iyi gidiyorsunuz. Bu trendi devam ettirin.`
      });
    }
    
    // Kategori önerileri
    const topCategory = categories.sort((a, b) => b.percentage_of_total - a.percentage_of_total)[0];
    if (topCategory) {
      recommendations.push({
        type: 'info',
        title: `${topCategory.category} Önceliği`,
        description: `Harcamalarınızın ${topCategory.percentage_of_total}%'ı bu kategoride. Stok planlamasını buna göre yapın.`
      });
    }
    
    // Sipariş sıklığı önerisi
    const avgFrequency = data.reduce((sum, period) => sum + period.order_frequency_days, 0) / data.length;
    if (avgFrequency > 10) {
      recommendations.push({
        type: 'warning',
        title: 'Sipariş Sıklığını Artırın',
        description: `Ortalama ${avgFrequency.toFixed(1)} günlük sipariş aralığınız var. Daha sık sipariş vererek stok optimizasyonu yapabilirsiniz.`
      });
    }
    
    return recommendations;
  };

  useEffect(() => {
    if (customerId) {
      fetchConsumptionData();
    }
  }, [customerId, period, analysisType, selectedPeriod]);

  const fetchConsumptionData = async () => {
    try {
      setLoading(true);
      
      if (analysisType === 'basic') {
        // Mevcut basit tüketim analizi
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();
        
        const response = await api.get(`/consumption/customer/${customerId}`, {
          params: { start_date: startDate, end_date: endDate }
        });
        setConsumption(response.data);
      } else {
        // Haftalık/Aylık/Dönemsel analiz
        const summaryResponse = await api.get(`/api/analytics/customers/${customerId}/periods/detailed`, {
          params: { period_type: analysisType, period: selectedPeriod }
        });
        
        if (analysisType === 'weekly') {
          setWeeklySummary(summaryResponse.data);
        } else if (analysisType === 'monthly') {
          setMonthlySummary(summaryResponse.data);
        } else {
          setPeriodSummary(summaryResponse.data);
        }
        
        // Kategori trendleri
        const trendsResponse = await api.get(`/api/analytics/customers/${customerId}/category-trends`, {
          params: { period_type: analysisType, period: selectedPeriod }
        });
        setCategoryGrowth(trendsResponse.data);
      }
      
      setError('');
    } catch (err) {
      console.error('Analiz verileri yüklenirken hata:', err);
      
      // API hazır değilse örnek veri göster
      if (err.response?.status === 404) {
        setError('Analiz özelliği yakında eklenecek');
        setSampleData();
      } else {
        setError('Veriler yüklenirken hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  // Örnek veri (API hazır olana kadar)
  const setSampleData = () => {
    // Haftalık örnek veri
    setWeeklySummary([
      {
        period_key: '2024_42',
        year: 2024,
        week: 42,
        start_date: '2024-10-14',
        end_date: '2024-10-20',
        total_orders: 3,
        total_amount: 8450,
        total_items: 42,
        average_order_value: 2816.7,
        order_frequency_days: 2.3,
        daily_avg: 1207
      },
      {
        period_key: '2024_41',
        year: 2024,
        week: 41,
        start_date: '2024-10-07',
        end_date: '2024-10-13',
        total_orders: 2,
        total_amount: 5200,
        total_items: 28,
        average_order_value: 2600,
        order_frequency_days: 3.5,
        daily_avg: 742
      },
      {
        period_key: '2024_40',
        year: 2024,
        week: 40,
        start_date: '2024-09-30',
        end_date: '2024-10-06',
        total_orders: 4,
        total_amount: 11200,
        total_items: 65,
        average_order_value: 2800,
        order_frequency_days: 1.8,
        daily_avg: 1600
      }
    ]);

    // Aylık örnek veri
    setMonthlySummary([
      {
        period_key: '2024_10',
        year: 2024,
        month: 10,
        month_name: 'Ekim',
        total_orders: 12,
        total_amount: 32500,
        total_items: 185,
        average_order_value: 2708.3,
        order_frequency_days: 2.5,
        weekly_avg: 8125
      },
      {
        period_key: '2024_9',
        year: 2024,
        month: 9,
        month_name: 'Eylül',
        total_orders: 10,
        total_amount: 28400,
        total_items: 156,
        average_order_value: 2840,
        order_frequency_days: 3.0,
        weekly_avg: 7100
      },
      {
        period_key: '2024_8',
        year: 2024,
        month: 8,
        month_name: 'Ağustos',
        total_orders: 8,
        total_amount: 21800,
        total_items: 124,
        average_order_value: 2725,
        order_frequency_days: 3.9,
        weekly_avg: 5450
      }
    ]);

    setCategoryGrowth([
      {
        category: 'Yağlar',
        current_period: 45,
        previous_period: 38,
        growth: 18.4,
        trend: 'increasing',
        percentage_of_total: 24.3
      },
      {
        category: 'Bakliyat',
        current_period: 32,
        previous_period: 28,
        growth: 14.3,
        trend: 'increasing',
        percentage_of_total: 17.3
      },
      {
        category: 'Makarna',
        current_period: 28,
        previous_period: 25,
        growth: 12.0,
        trend: 'increasing',
        percentage_of_total: 15.1
      },
      {
        category: 'Konserveler',
        current_period: 25,
        previous_period: 30,
        growth: -16.7,
        trend: 'decreasing',
        percentage_of_total: 13.5
      }
    ]);
  };

  const getTrendIndicator = (current, previous) => {
    if (!previous || previous === 0) return { trend: 'stable', text: 'Yeni', color: 'blue' };
    const change = ((current - previous) / previous) * 100;
    
    if (change > 5) return { trend: 'up', text: `+${change.toFixed(1)}%`, color: 'green' };
    if (change < -5) return { trend: 'down', text: `${change.toFixed(1)}%`, color: 'red' };
    return { trend: 'stable', text: `${change.toFixed(1)}%`, color: 'gray' };
  };

  const renderWeeklyTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hafta</TableHead>
          <TableHead>Tarih Aralığı</TableHead>
          <TableHead className="text-right">Sipariş</TableHead>
          <TableHead className="text-right">Toplam Tutar</TableHead>
          <TableHead className="text-right">Toplam Ürün</TableHead>
          <TableHead className="text-right">Ort. Sipariş</TableHead>
          <TableHead className="text-right">Günlük Ort.</TableHead>
          <TableHead className="text-right">Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {weeklySummary.map((week, index) => {
          const prevWeek = weeklySummary[index + 1];
          const trend = getTrendIndicator(week.total_amount, prevWeek?.total_amount);
          
          return (
            <TableRow key={week.period_key}>
              <TableCell className="font-medium">
                {week.week}. Hafta
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {new Date(week.start_date).toLocaleDateString('tr-TR')} - {new Date(week.end_date).toLocaleDateString('tr-TR')}
              </TableCell>
              <TableCell className="text-right">{week.total_orders}</TableCell>
              <TableCell className="text-right font-semibold">
                {week.total_amount.toLocaleString('tr-TR')} ₺
              </TableCell>
              <TableCell className="text-right">{week.total_items}</TableCell>
              <TableCell className="text-right">
                {Math.round(week.average_order_value).toLocaleString('tr-TR')} ₺
              </TableCell>
              <TableCell className="text-right">
                {Math.round(week.daily_avg).toLocaleString('tr-TR')} ₺
              </TableCell>
              <TableCell className="text-right">
                <Badge 
                  variant={trend.color === 'green' ? 'default' : 
                          trend.color === 'red' ? 'destructive' : 'outline'}
                  className={trend.color === 'green' ? 'bg-green-100 text-green-800' : 
                            trend.color === 'red' ? 'bg-red-100 text-red-800' : ''}
                >
                  {trend.text}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const renderMonthlyTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ay</TableHead>
          <TableHead className="text-right">Sipariş</TableHead>
          <TableHead className="text-right">Toplam Tutar</TableHead>
          <TableHead className="text-right">Toplam Ürün</TableHead>
          <TableHead className="text-right">Ort. Sipariş</TableHead>
          <TableHead className="text-right">Haftalık Ort.</TableHead>
          <TableHead className="text-right">Sipariş Sıklığı</TableHead>
          <TableHead className="text-right">Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {monthlySummary.map((month, index) => {
          const prevMonth = monthlySummary[index + 1];
          const trend = getTrendIndicator(month.total_amount, prevMonth?.total_amount);
          
          return (
            <TableRow key={month.period_key}>
              <TableCell className="font-medium">
                {month.month_name} {month.year}
              </TableCell>
              <TableCell className="text-right">{month.total_orders}</TableCell>
              <TableCell className="text-right font-semibold">
                {month.total_amount.toLocaleString('tr-TR')} ₺
              </TableCell>
              <TableCell className="text-right">{month.total_items}</TableCell>
              <TableCell className="text-right">
                {Math.round(month.average_order_value).toLocaleString('tr-TR')} ₺
              </TableCell>
              <TableCell className="text-right">
                {Math.round(month.weekly_avg).toLocaleString('tr-TR')} ₺
              </TableCell>
              <TableCell className="text-right">{month.order_frequency_days.toFixed(1)} gün</TableCell>
              <TableCell className="text-right">
                <Badge 
                  variant={trend.color === 'green' ? 'default' : 
                          trend.color === 'red' ? 'destructive' : 'outline'}
                  className={trend.color === 'green' ? 'bg-green-100 text-green-800' : 
                            trend.color === 'red' ? 'bg-red-100 text-red-800' : ''}
                >
                  {trend.text}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const renderSeasonalTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dönem</TableHead>
          <TableHead className="text-right">Sipariş</TableHead>
          <TableHead className="text-right">Toplam Tutar</TableHead>
          <TableHead className="text-right">Toplam Ürün</TableHead>
          <TableHead className="text-right">Ort. Sipariş</TableHead>
          <TableHead className="text-right">Sipariş Sıklığı</TableHead>
          <TableHead className="text-right">Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {periodSummary.map((period, index) => {
          const prevPeriod = periodSummary[index + 1];
          const trend = getTrendIndicator(period.total_amount, prevPeriod?.total_amount);
          
          return (
            <TableRow key={period.period_key}>
              <TableCell className="font-medium">
                {period.year} {getSeasonName(period.season)}
              </TableCell>
              <TableCell className="text-right">{period.total_orders}</TableCell>
              <TableCell className="text-right font-semibold">
                {period.total_amount.toLocaleString('tr-TR')} ₺
              </TableCell>
              <TableCell className="text-right">{period.total_items}</TableCell>
              <TableCell className="text-right">
                {Math.round(period.average_order_value).toLocaleString('tr-TR')} ₺
              </TableCell>
              <TableCell className="text-right">{period.order_frequency_days.toFixed(1)} gün</TableCell>
              <TableCell className="text-right">
                <Badge 
                  variant={trend.color === 'green' ? 'default' : 
                          trend.color === 'red' ? 'destructive' : 'outline'}
                  className={trend.color === 'green' ? 'bg-green-100 text-green-800' : 
                            trend.color === 'red' ? 'bg-red-100 text-red-800' : ''}
                >
                  {trend.text}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !weeklySummary.length && !monthlySummary.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <div className="text-red-600 mb-2">{error}</div>
            <Button onClick={setSampleData} variant="outline">
              Örnek Verileri Göster
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentData = analysisType === 'weekly' ? weeklySummary : 
                     analysisType === 'monthly' ? monthlySummary : 
                     periodSummary;

  const currentStats = currentData[0] || {};

  return (
    <div className="space-y-6">
      {/* Analiz Tipi Seçimi */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detaylı Tüketim Analizi
            </CardTitle>
            
            <Tabs value={analysisType} onValueChange={setAnalysisType} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="basic">Günlük</TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center gap-1">
                  <Week className="h-3 w-3" />
                  Haftalık
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex items-center gap-1">
                  <Month className="h-3 w-3" />
                  Aylık
                </TabsTrigger>
                <TabsTrigger value="seasonal">Mevsimsel</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        {/* Periyot Seçimi */}
        {analysisType !== 'basic' && (
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Periyot:</span>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions
                      .filter(opt => opt.type === analysisType || analysisType === 'seasonal')
                      .map(period => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {analysisType === 'basic' ? (
        /* TEMEL GÜNLÜK ANALİZ */
        <>
          {/* Period Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Dönem Seçimi
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={period === '7' ? 'default' : 'outline'}
                    onClick={() => setPeriod('7')}
                  >
                    7 Gün
                  </Button>
                  <Button
                    size="sm"
                    variant={period === '30' ? 'default' : 'outline'}
                    onClick={() => setPeriod('30')}
                  >
                    30 Gün
                  </Button>
                  <Button
                    size="sm"
                    variant={period === '90' ? 'default' : 'outline'}
                    onClick={() => setPeriod('90')}
                  >
                    90 Gün
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Stats - Sadece consumption verisi varsa göster */}
          {consumption && consumption.summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <ShoppingCart className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Toplam Sipariş</div>
                      <div className="text-2xl font-bold">{consumption.summary.total_orders}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Son {period} gün
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Toplam Tutar</div>
                      <div className="text-2xl font-bold">{consumption.summary.total_amount.toFixed(2)} ₺</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Toplam harcama
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Ortalama Sipariş</div>
                      <div className="text-2xl font-bold">{consumption.summary.average_order_amount.toFixed(2)} ₺</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Sipariş başına
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Product Consumption Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ürün Bazlı Sarfiyat ({period} Günlük)
              </CardTitle>
              <div className="text-sm text-gray-600 mt-1">
                Son {period} gün içindeki ürün tüketim detayları
              </div>
            </CardHeader>
            <CardContent>
              {!consumption || !consumption.products || consumption.products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Sipariş bulunmuyor</p>
                  <p className="text-sm">Son {period} gün içinde henüz sipariş vermemişsiniz</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      // Ürün kataloğuna yönlendirme veya modal açma
                      console.log('Ürün kataloğuna git');
                    }}
                  >
                    Ürünleri Görüntüle
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Özet Bilgiler */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{consumption.products.length}</div>
                      <div className="text-sm text-gray-600">Farklı Ürün</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {consumption.products.reduce((sum, product) => sum + product.total_units, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Toplam Adet</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {consumption.summary.total_orders}
                      </div>
                      <div className="text-sm text-gray-600">Toplam Sipariş</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {(consumption.summary.total_amount / consumption.products.reduce((sum, product) => sum + product.total_units, 1)).toFixed(2)} ₺
                      </div>
                      <div className="text-sm text-gray-600">Ort. Birim Fiyat</div>
                    </div>
                  </div>

                  {/* Ürün Tablosu */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/3">Ürün Adı</TableHead>
                        <TableHead className="text-center">Sipariş Sayısı</TableHead>
                        <TableHead className="text-right">Toplam Adet</TableHead>
                        <TableHead className="text-right">Toplam Tutar</TableHead>
                        <TableHead className="text-right">Birim Fiyat</TableHead>
                        <TableHead className="text-right">Günlük Ort.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consumption.products
                        .sort((a, b) => b.total_amount - a.total_amount)
                        .map((product, index) => {
                          const dailyAverage = product.total_amount / parseInt(period);
                          const unitPrice = product.total_amount / product.total_units;
                          
                          return (
                            <TableRow key={product.product_id} className={index < 3 ? 'bg-green-50' : ''}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {index < 3 && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                      #{index + 1}
                                    </Badge>
                                  )}
                                  {product.product_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{product.order_count}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {product.total_units} adet
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {product.total_amount.toFixed(2)} ₺
                              </TableCell>
                              <TableCell className="text-right text-gray-600">
                                {unitPrice.toFixed(2)} ₺/adet
                              </TableCell>
                              <TableCell className="text-right text-blue-600">
                                {dailyAverage.toFixed(2)} ₺/gün
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>

                  {/* Ekstra İstatistikler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">En Çok Sipariş Edilenler</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {consumption.products
                          .sort((a, b) => b.total_units - a.total_units)
                          .slice(0, 3)
                          .map((product, index) => (
                            <div key={product.product_id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{index + 1}</Badge>
                                <span className="text-sm">{product.product_name}</span>
                              </div>
                              <Badge variant="outline">{product.total_units} adet</Badge>
                            </div>
                          ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">En Yüksek Harcama</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {consumption.products
                          .sort((a, b) => b.total_amount - a.total_amount)
                          .slice(0, 3)
                          .map((product, index) => (
                            <div key={product.product_id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{index + 1}</Badge>
                                <span className="text-sm">{product.product_name}</span>
                              </div>
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                {product.total_amount.toFixed(2)} ₺
                              </Badge>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <TrendingUp className="h-5 w-5" />
                Hızlı Öneriler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  <div className="p-2 bg-blue-100 rounded">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-blue-800">Sık Sipariş Önerisi</div>
                    <div className="text-sm text-blue-600 mt-1">
                      En çok sipariş verdiğiniz ürünler stokta azalıyor. Önceden sipariş verin.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  <div className="p-2 bg-green-100 rounded">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-green-800">Tasarruf Fırsatı</div>
                    <div className="text-sm text-green-600 mt-1">
                      Toplu alımlarda %10 indirim fırsatından yararlanın.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* DETAYLI ANALİZ (Haftalık/Aylık/Mevsimsel) */
        <>
          {/* Özet İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Sipariş</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentStats.total_orders || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analysisType === 'weekly' ? 'Bu hafta' : 
                   analysisType === 'monthly' ? 'Bu ay' : 'Bu dönem'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Tutar</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(currentStats.total_amount || 0).toLocaleString('tr-TR')} ₺
                </div>
                <p className="text-xs text-muted-foreground">
                  {analysisType === 'weekly' ? 'Haftalık' : 
                   analysisType === 'monthly' ? 'Aylık' : 'Dönemsel'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ort. Sipariş</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(currentStats.average_order_value || 0).toLocaleString('tr-TR')} ₺
                </div>
                <p className="text-xs text-muted-foreground">Ortalama değer</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {analysisType === 'weekly' ? 'Günlük Ort.' : 
                   analysisType === 'monthly' ? 'Haftalık Ort.' : 'Sipariş Sıklığı'}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysisType === 'weekly' ? (
                    <>{(currentStats.daily_avg || 0).toLocaleString('tr-TR')} ₺</>
                  ) : analysisType === 'monthly' ? (
                    <>{(currentStats.weekly_avg || 0).toLocaleString('tr-TR')} ₺</>
                  ) : (
                    <>{(currentStats.order_frequency_days || 0).toFixed(1)} gün</>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analysisType === 'weekly' ? 'Günlük ortalama' : 
                   analysisType === 'monthly' ? 'Haftalık ortalama' : 'Ortalama aralık'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trend Göstergesi */}
          {currentData.length > 1 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-blue-800">Trend Analizi</div>
                      <div className="text-sm text-blue-600">
                        {analysisType === 'weekly' ? 'Son haftalara göre' : 
                         analysisType === 'monthly' ? 'Son aylara göre' : 'Son dönemlere göre'} performans durumu
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    +{calculateOverallGrowth(currentData)}% Büyüme
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detaylı Tablo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {analysisType === 'weekly' && <Week className="h-5 w-5" />}
                {analysisType === 'monthly' && <Month className="h-5 w-5" />}
                {analysisType === 'seasonal' && <Calendar className="h-5 w-5" />}
                {analysisType === 'weekly' ? 'Haftalık Performans' :
                 analysisType === 'monthly' ? 'Aylık Performans' : 'Mevsimsel Performans'}
              </CardTitle>
              <div className="text-sm text-gray-600 mt-1">
                {analysisType === 'weekly' ? 'Hafta bazlı detaylı sipariş istatistikleri' :
                 analysisType === 'monthly' ? 'Ay bazlı detaylı performans analizi' : 
                 'Mevsimsel dönemlere göre karşılaştırmalı analiz'}
              </div>
            </CardHeader>
            <CardContent>
              {currentData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">
                    {analysisType === 'weekly' ? 'Haftalık' : 
                     analysisType === 'monthly' ? 'Aylık' : 'Dönemsel'} veri bulunmuyor
                  </p>
                  <p className="text-sm">
                    {analysisType === 'weekly' ? 'Son haftalara ait sipariş verisi yok' :
                     analysisType === 'monthly' ? 'Son aylara ait sipariş verisi yok' : 
                     'Mevsimsel dönemlere ait sipariş verisi yok'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tablo İçeriği */}
                  {analysisType === 'weekly' && renderWeeklyTable()}
                  {analysisType === 'monthly' && renderMonthlyTable()}
                  {analysisType === 'seasonal' && renderSeasonalTable()}

                  {/* Özet Bilgiler */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">En İyi Performans</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {getBestPerformingPeriod(currentData) && (
                          <div className="space-y-1">
                            <div className="font-semibold text-green-600">
                              {analysisType === 'weekly' ? `${getBestPerformingPeriod(currentData).week}. Hafta` :
                               analysisType === 'monthly' ? getBestPerformingPeriod(currentData).month_name : 
                               `${getBestPerformingPeriod(currentData).year} ${getSeasonName(getBestPerformingPeriod(currentData).season)}`}
                            </div>
                            <div className="text-2xl font-bold">
                              {getBestPerformingPeriod(currentData).total_amount.toLocaleString('tr-TR')} ₺
                            </div>
                            <div className="text-xs text-gray-500">
                              {getBestPerformingPeriod(currentData).total_orders} sipariş
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Ortalama Değerler</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <div className="font-semibold text-blue-600">Ortalama</div>
                          <div className="text-2xl font-bold">
                            {Math.round(currentData.reduce((sum, period) => sum + period.total_amount, 0) / currentData.length).toLocaleString('tr-TR')} ₺
                          </div>
                          <div className="text-xs text-gray-500">
                            {analysisType === 'weekly' ? 'Haftalık ortalama' :
                             analysisType === 'monthly' ? 'Aylık ortalama' : 'Dönemsel ortalama'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Toplam Özet</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <div className="font-semibold text-purple-600">Genel Toplam</div>
                          <div className="text-2xl font-bold">
                            {currentData.reduce((sum, period) => sum + period.total_amount, 0).toLocaleString('tr-TR')} ₺
                          </div>
                          <div className="text-xs text-gray-500">
                            {currentData.reduce((sum, period) => sum + period.total_orders, 0)} sipariş
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kategori Trendleri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Kategori Bazlı Büyüme Analizi
              </CardTitle>
              <div className="text-sm text-gray-600 mt-1">
                {analysisType === 'weekly' ? 'Haftalık kategori bazlı büyüme oranları' :
                 analysisType === 'monthly' ? 'Aylık kategori performans karşılaştırması' : 
                 'Mevsimsel kategori trend analizi'}
              </div>
            </CardHeader>
            <CardContent>
              {categoryGrowth.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Kategori verisi bulunmuyor</p>
                  <p className="text-sm">Kategori bazlı analiz için yeterli veri yok</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/4">Kategori</TableHead>
                        <TableHead className="text-right">Bu Dönem</TableHead>
                        <TableHead className="text-right">Önceki Dönem</TableHead>
                        <TableHead className="text-right">Büyüme</TableHead>
                        <TableHead className="text-right">Toplamdaki Payı</TableHead>
                        <TableHead className="text-right">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryGrowth.map((category) => (
                        <TableRow key={category.category}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {category.trend === 'increasing' && (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              )}
                              {category.trend === 'decreasing' && (
                                <TrendingUp className="h-3 w-3 text-red-500 transform rotate-180" />
                              )}
                              {category.category}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {category.current_period}
                          </TableCell>
                          <TableCell className="text-right text-gray-600">
                            {category.previous_period}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <span className={category.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {category.growth >= 0 ? '+' : ''}{category.growth}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">
                              {category.percentage_of_total}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={category.trend === 'increasing' ? 'default' : 'destructive'}
                              className={category.trend === 'increasing' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}
                            >
                              {category.trend === 'increasing' ? 'Artış' : 'Azalış'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Kategori Özeti */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">En Hızlı Büyüyen</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {categoryGrowth
                          .filter(cat => cat.trend === 'increasing')
                          .sort((a, b) => b.growth - a.growth)
                          .slice(0, 1)
                          .map(category => (
                            <div key={category.category} className="space-y-1">
                              <div className="font-semibold text-green-600">{category.category}</div>
                              <div className="text-2xl font-bold">+{category.growth}%</div>
                              <div className="text-xs text-gray-500">Büyüme oranı</div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">En Yüksek Pay</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {categoryGrowth
                          .sort((a, b) => b.percentage_of_total - a.percentage_of_total)
                          .slice(0, 1)
                          .map(category => (
                            <div key={category.category} className="space-y-1">
                              <div className="font-semibold text-blue-600">{category.category}</div>
                              <div className="text-2xl font-bold">{category.percentage_of_total}%</div>
                              <div className="text-xs text-gray-500">Toplam pay</div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Akıllı Öneriler */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <TrendingUp className="h-5 w-5" />
                Akıllı Öneriler & Tahminler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generateSmartRecommendations(currentData, categoryGrowth, analysisType).map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                    <div className={`p-2 rounded ${recommendation.type === 'success' ? 'bg-green-100' : 
                                   recommendation.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                      {recommendation.type === 'success' && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {recommendation.type === 'warning' && <Package className="h-4 w-4 text-yellow-600" />}
                      {recommendation.type === 'info' && <ShoppingCart className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        recommendation.type === 'success' ? 'text-green-800' : 
                        recommendation.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                      }`}>
                        {recommendation.title}
                      </div>
                      <div className={`text-sm mt-1 ${
                        recommendation.type === 'success' ? 'text-green-600' : 
                        recommendation.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                      }`}>
                        {recommendation.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CustomerConsumption;