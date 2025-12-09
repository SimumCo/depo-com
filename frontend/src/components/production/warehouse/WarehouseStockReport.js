import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { BarChart3, Package } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const WarehouseStockReport = () => {
  const [report, setReport] = useState(null);

  const fetchReport = useCallback(async () => {
    try {
      const data = await productionApi.getWarehouseStockReport();
      setReport(data);
    } catch (error) {
      toast.error('Stok raporu yüklenemedi');
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (!report) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Depo Stok Raporu Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Toplam Ürün Miktarı</p>
              <p className="text-2xl font-bold text-blue-600">{report.summary?.total_items || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Toplam Değer</p>
              <p className="text-2xl font-bold text-green-600">₺{report.summary?.total_value?.toFixed(2) || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Kategori Sayısı</p>
              <p className="text-2xl font-bold text-purple-600">{report.summary?.category_count || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(report.by_category || {}).map(([category, data]) => (
        <Card key={category}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {category}
              </CardTitle>
              <Badge>{data.items.length} ürün</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Miktar</p>
                <p className="text-xl font-semibold">{data.total_quantity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Değer</p>
                <p className="text-xl font-semibold">₺{data.total_value.toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-2">
              {data.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">{item.product_name}</span>
                  <span>{item.quantity} {item.unit} (₺{item.value.toFixed(2)})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WarehouseStockReport;