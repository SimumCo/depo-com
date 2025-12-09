import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const CriticalStockLevels = () => {
  const [criticalItems, setCriticalItems] = useState([]);

  const fetchCriticalItems = useCallback(async () => {
    try {
      const data = await productionApi.getCriticalStockLevels(4);
      setCriticalItems(data.critical_items || []);
    } catch (error) {
      toast.error('Kritik stok verileri yüklenemedi');
    }
  }, []);

  useEffect(() => {
    fetchCriticalItems();
  }, [fetchCriticalItems]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Kritik Seviye Altı Ürünler (4 Günden Az)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün</TableHead>
              <TableHead>Mevcut Stok</TableHead>
              <TableHead>Günlük Ortalama</TableHead>
              <TableHead>Kalan Gün</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {criticalItems.map((item) => (
              <TableRow key={item.product_id} className={item.status === 'critical' ? 'bg-red-50' : 'bg-yellow-50'}>
                <TableCell className="font-semibold">{item.product_name}</TableCell>
                <TableCell>{item.current_stock}</TableCell>
                <TableCell>{item.daily_average}/gün</TableCell>
                <TableCell className="font-bold">{item.days_remaining} gün</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'critical' ? 'destructive' : 'default'}>
                    {item.status === 'critical' ? 'KRİTİK' : 'UYARI'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {criticalItems.length === 0 && (
          <div className="text-center py-8 text-green-600">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tüm ürünler yeterli stok seviyesinde</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CriticalStockLevels;