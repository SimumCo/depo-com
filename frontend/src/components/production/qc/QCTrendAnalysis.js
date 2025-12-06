// QC Trend Analysis - QC Panel
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const QCTrendAnalysis = () => {
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const fetchTrend = async () => {
    setLoading(true);
    try {
      const data = await productionApi.getQCTrendAnalysis(null, days);
      setTrendData(data.trend_data || []);
    } catch (error) {
      toast.error('Trend analizi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (currentRate, previousRate) => {
    if (!previousRate) return <Minus className="h-4 w-4 text-gray-400" />;
    
    if (currentRate > previousRate + 5) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (currentRate < previousRate - 5) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getPassRateColor = (rate) => {
    if (rate >= 95) return 'text-green-600 font-semibold';
    if (rate >= 90) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  // Calculate overall stats
  const totalTests = trendData.reduce((sum, day) => sum + day.total, 0);
  const totalPass = trendData.reduce((sum, day) => sum + day.pass, 0);
  const totalFail = trendData.reduce((sum, day) => sum + day.fail, 0);
  const overallPassRate = totalTests > 0 ? ((totalPass / totalTests) * 100).toFixed(2) : 0;

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Kalite Kontrol Trend Analizi
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={days.toString()}
                onValueChange={(value) => setDays(parseInt(value))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Son 7 Gün</SelectItem>
                  <SelectItem value="14">Son 14 Gün</SelectItem>
                  <SelectItem value="30">Son 30 Gün</SelectItem>
                  <SelectItem value="60">Son 60 Gün</SelectItem>
                  <SelectItem value="90">Son 90 Gün</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={fetchTrend}>
                Yenile
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Toplam Test</p>
              <p className="text-2xl font-bold">{totalTests}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Geçen</p>
              <p className="text-2xl font-bold text-green-600">{totalPass}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Kalan</p>
              <p className="text-2xl font-bold text-red-600">{totalFail}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Ortalama Başarı</p>
              <p className="text-2xl font-bold text-purple-600">{overallPassRate}%</p>
            </div>
          </div>

          {/* Trend Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-center">Toplam Test</TableHead>
                  <TableHead className="text-center">Geçen</TableHead>
                  <TableHead className="text-center">Kalan</TableHead>
                  <TableHead className="text-center">Başarı Oranı</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendData.map((day, index) => {
                  const previousDay = index > 0 ? trendData[index - 1] : null;
                  const previousRate = previousDay?.pass_rate;

                  return (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">
                        {new Date(day.date).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {day.total}
                      </TableCell>
                      <TableCell className="text-center text-green-600">
                        {day.pass}
                      </TableCell>
                      <TableCell className="text-center text-red-600">
                        {day.fail}
                      </TableCell>
                      <TableCell className={`text-center ${getPassRateColor(day.pass_rate)}`}>
                        {day.pass_rate}%
                      </TableCell>
                      <TableCell className="text-center">
                        {getTrendIcon(day.pass_rate, previousRate)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {trendData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Seçilen periyotta veri bulunmuyor
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visual Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Başarı Oranı Grafiği</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Grafik görselleştirmesi için chart kütüphanesi eklenebilir</p>
              <p className="text-sm">(recharts, chart.js, vb.)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QCTrendAnalysis;
