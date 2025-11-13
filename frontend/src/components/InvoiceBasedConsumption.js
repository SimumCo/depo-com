import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import api from '../services/api';
import { 
  TrendingUp, TrendingDown, Minus, Calendar, 
  BarChart3, PieChart, Activity, Package, FileText 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Fatura Bazlı Tüketim Analizi
 * Yeni tüketim hesaplama sistemine göre tasarlandı
 */
const InvoiceBasedConsumption = () => {
  const { user } = useAuth();
  const [consumptionHistory, setConsumptionHistory] = useState([]);
  const [periodicData, setPeriodicData] = useState([]);
  const [yearlyComparison, setYearlyComparison] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriodType, setSelectedPeriodType] = useState('monthly');

  useEffect(() => {
    if (user?.id) {
      loadConsumptionData();
    }
  }, [user?.id, selectedYear, selectedPeriodType]);

  const loadConsumptionData = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Fatura bazlı tüketim geçmişi
      const historyResponse = await api.get(
        `/customer-consumption/invoice-based/customer/${user.id}`
      );
      setConsumptionHistory(historyResponse.data || []);

      // 2. Periyodik veriler
      const periodicResponse = await api.get(
        `/consumption-periods/customer/${user.id}`,
        { 
          params: { 
            period_type: selectedPeriodType,
            year: selectedYear 
          } 
        }
      );
      setPeriodicData(periodicResponse.data || []);

      // 3. İstatistikler
      const statsResponse = await api.get(
        `/customer-consumption/invoice-based/stats/customer/${user.id}`
      );
      setStats(statsResponse.data || null);

    } catch (err) {
      console.error('Tüketim verileri yüklenirken hata:', err);
      setError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('tr-TR');
    } catch {
      return dateStr;
    }
  };

  const getTrendIcon = (change) => {
    if (!change || change === 0) return <Minus className="h-4 w-4 text-gray-500" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = (change) => {
    if (!change || change === 0) return 'text-gray-600';
    if (change > 0) return 'text-green-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_products || 0}</div>
              <p className="text-xs text-muted-foreground">
                Tüketim kaydı olan ürün sayısı
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kayıt</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_consumption_records || 0}</div>
              <p className="text-xs text-muted-foreground">
                Tüketim kaydı sayısı
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Günlük</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.average_daily_consumption?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Tüm ürünler ortalaması
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-800">
            {error}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Fatura Bazlı Geçmiş</TabsTrigger>
          <TabsTrigger value="periodic">Periyodik Analiz</TabsTrigger>
          <TabsTrigger value="top-products">En Çok Tüketilenler</TabsTrigger>
        </TabsList>

        {/* Fatura Bazlı Geçmiş */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Fatura Bazlı Tüketim Geçmişi
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Her fatura için hesaplanan tüketim kayıtları
              </p>
            </CardHeader>
            <CardContent>
              {consumptionHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz tüketim kaydı bulunmuyor. İlk faturanız yüklendiğinde tüketim hesaplamaları başlayacak.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Önceki Fatura</TableHead>
                        <TableHead>Yeni Fatura</TableHead>
                        <TableHead>Gün</TableHead>
                        <TableHead>Tüketim</TableHead>
                        <TableHead>Günlük Oran</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consumptionHistory.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{record.product_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {record.product_code}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(record.source_invoice_date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.source_quantity || 0} adet
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(record.target_invoice_date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.target_quantity || 0} adet
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {record.days_between || 0} gün
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              {record.consumption_quantity?.toFixed(2) || '0.00'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-blue-600">
                              {record.daily_consumption_rate?.toFixed(2) || '0.00'} /gün
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.can_calculate ? (
                              <Badge variant="success" className="bg-green-100 text-green-800">
                                Hesaplandı
                              </Badge>
                            ) : (
                              <Badge variant="secondary">İlk Fatura</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Periyodik Analiz */}
        <TabsContent value="periodic" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Periyodik Tüketim Analizi
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Haftalık ve aylık tüketim trendleri
                  </p>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedPeriodType} onValueChange={setSelectedPeriodType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Haftalık</SelectItem>
                      <SelectItem value="monthly">Aylık</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {periodicData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bu yıl için periyodik veri bulunmuyor.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Periyot</TableHead>
                        <TableHead>Toplam Tüketim</TableHead>
                        <TableHead>Günlük Ort.</TableHead>
                        <TableHead>Yıllık Değişim</TableHead>
                        <TableHead>Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodicData.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{record.product_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {record.product_code}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {selectedPeriodType === 'weekly' 
                                ? `Hafta ${record.period_number}` 
                                : `Ay ${record.period_number}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              {record.total_consumption?.toFixed(2) || '0.00'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-blue-600">
                              {record.daily_average?.toFixed(2) || '0.00'} /gün
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.year_over_year_change !== null && record.year_over_year_change !== undefined ? (
                              <div className={`flex items-center gap-1 ${getTrendColor(record.year_over_year_change)}`}>
                                {getTrendIcon(record.year_over_year_change)}
                                <span className="font-medium">
                                  {record.year_over_year_change > 0 ? '+' : ''}
                                  {record.year_over_year_change.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.trend_direction === 'increasing' && (
                              <Badge className="bg-green-100 text-green-800">Artış</Badge>
                            )}
                            {record.trend_direction === 'decreasing' && (
                              <Badge className="bg-red-100 text-red-800">Azalış</Badge>
                            )}
                            {record.trend_direction === 'stable' && (
                              <Badge variant="secondary">Sabit</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* En Çok Tüketilenler */}
        <TabsContent value="top-products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                En Çok Tüketilen Ürünler
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Toplam tüketiminize göre sıralanmış ürünler
              </p>
            </CardHeader>
            <CardContent>
              {!stats || !stats.top_products || stats.top_products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz yeterli veri bulunmuyor.
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.top_products.map((product, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-lg border">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-600">#{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{product.product_name}</div>
                        <div className="text-sm text-muted-foreground">{product.product_code}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {product.total_consumption?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {product.avg_daily_rate?.toFixed(2) || '0.00'} /gün
                        </div>
                        {product.record_count && (
                          <div className="text-xs text-muted-foreground">
                            {product.record_count} kayıt
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceBasedConsumption;
