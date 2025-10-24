import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import api from '../services/api';
import { Users, TrendingUp, Calendar, Building } from 'lucide-react';

const AllCustomersConsumption = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30'); // days

  useEffect(() => {
    fetchConsumption();
  }, [period]);

  const fetchConsumption = async () => {
    try {
      setLoading(true);
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await api.get('/consumption/all-customers', {
        params: { start_date: startDate, end_date: endDate }
      });
      setData(response.data);
      setError('');
    } catch (err) {
      setError('Sarfiyat verileri yüklenirken hata oluştu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const totalOrders = data.customers.reduce((sum, c) => sum + c.consumption.order_count, 0);
  const totalAmount = data.customers.reduce((sum, c) => sum + c.consumption.total_amount, 0);
  const activeCustomers = data.customers.filter(c => c.consumption.order_count > 0).length;

  return (
    <div className="space-y-6">
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Aktif Müşteri</div>
                <div className="text-2xl font-bold">{activeCustomers}</div>
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
                <div className="text-sm text-gray-600">Toplam Sipariş</div>
                <div className="text-2xl font-bold">{totalOrders}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Toplam Ciro</div>
                <div className="text-2xl font-bold">{totalAmount.toFixed(0)} ₺</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Ort. Sipariş</div>
                <div className="text-2xl font-bold">
                  {totalOrders > 0 ? (totalAmount / totalOrders).toFixed(0) : 0} ₺
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Müşteri Sarfiyat Listesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Kanal</TableHead>
                <TableHead className="text-center">Sipariş</TableHead>
                <TableHead className="text-right">Toplam Adet</TableHead>
                <TableHead className="text-right">Toplam Tutar</TableHead>
                <TableHead className="text-right">Ort. Sipariş</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.customers.map((item) => (
                <TableRow key={item.customer.id}>
                  <TableCell>
                    <div className="font-medium">{item.customer.full_name}</div>
                    <div className="text-sm text-gray-500">{item.customer.customer_number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      {item.profile?.company_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.customer.channel_type === 'logistics' ? 'default' : 'secondary'}>
                      {item.customer.channel_type === 'logistics' ? 'Lojistik' : 'Bayi'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{item.consumption.order_count}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {item.consumption.total_units} adet
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {item.consumption.total_amount.toFixed(2)} ₺
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    {item.consumption.average_order_amount.toFixed(2)} ₺
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllCustomersConsumption;
