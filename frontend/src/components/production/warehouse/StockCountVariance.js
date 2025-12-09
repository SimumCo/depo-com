import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { ClipboardList, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const StockCountVariance = () => {
  const [variance, setVariance] = useState(null);
  const [days, setDays] = useState(30);

  const fetchVariance = useCallback(async () => {
    try {
      const data = await productionApi.getStockCountVariance(days);
      setVariance(data);
    } catch (error) {
      toast.error('Fark raporu yüklenemedi');
    }
  }, [days]);

  useEffect(() => {
    fetchVariance();
  }, [fetchVariance]);

  if (!variance) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Stok Sayımı Fark Raporu
            </CardTitle>
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Son 7 Gün</SelectItem>
                <SelectItem value="30">Son 30 Gün</SelectItem>
                <SelectItem value="90">Son 90 Gün</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Toplam Sayım</p>
              <p className="text-2xl font-bold">{variance.summary?.total_counts || 0}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Fark Olan Kayıt</p>
              <p className="text-2xl font-bold text-orange-600">{variance.summary?.items_with_variance || 0}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Toplam Fark</p>
              <p className="text-2xl font-bold text-red-600">{variance.summary?.total_variance || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Dönem</p>
              <p className="text-2xl font-bold">{variance.summary?.period_days || 0} gün</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sayım No</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Sistem</TableHead>
                <TableHead>Sayılan</TableHead>
                <TableHead>Fark</TableHead>
                <TableHead>Sayan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variance.variance_items?.map((item) => (
                <TableRow key={item.count_number} className={Math.abs(item.difference) > 10 ? 'bg-red-50' : ''}>
                  <TableCell className="font-mono">{item.count_number}</TableCell>
                  <TableCell>{new Date(item.count_date).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.system_qty}</TableCell>
                  <TableCell>{item.counted_qty}</TableCell>
                  <TableCell>
                    <Badge variant={item.difference === 0 ? 'default' : 'destructive'}>
                      {item.difference > 0 ? '+' : ''}{item.difference}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{item.counted_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {variance.variance_items?.length === 0 && (
            <div className="text-center py-8 text-green-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Seçilen dönemde fark bulunmuyor - mükemmel!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockCountVariance;