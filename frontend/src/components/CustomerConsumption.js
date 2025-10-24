import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import api from '../services/api';
import { TrendingUp, Package, DollarSign, ShoppingCart, Calendar } from 'lucide-react';

const CustomerConsumption = ({ customerId = null }) => {
  const [consumption, setConsumption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30'); // days

  useEffect(() => {
    if (customerId) {
      fetchConsumption();
    }
  }, [customerId, period]);

  const fetchConsumption = async () => {
    try {
      setLoading(true);
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await api.get(`/consumption/customer/${customerId}`, {
        params: { start_date: startDate, end_date: endDate }
      });
      setConsumption(response.data);
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

  if (!consumption) {
    return null;
  }

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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Consumption */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ürün Bazlı Sarfiyat
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consumption.products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Bu dönemde sipariş bulunmuyor</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün Adı</TableHead>
                  <TableHead className="text-center">Sipariş Sayısı</TableHead>
                  <TableHead className="text-right">Toplam Adet</TableHead>
                  <TableHead className="text-right">Toplam Tutar</TableHead>
                  <TableHead className="text-right">Ortalama Fiyat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumption.products
                  .sort((a, b) => b.total_amount - a.total_amount)
                  .map((product) => (
                    <TableRow key={product.product_id}>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
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
                        {(product.total_amount / product.total_units).toFixed(2)} ₺/adet
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerConsumption;
