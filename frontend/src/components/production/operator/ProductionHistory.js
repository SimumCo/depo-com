// Production History - Operator Panel
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Clock, Package, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const ProductionHistory = () => {
  const [tracking, setTracking] = useState([]);
  const [batches, setBatches] = useState([]);
  const [rawMaterialUsage, setRawMaterialUsage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const [trackingData, batchData, usageData] = await Promise.all([
        productionApi.getProductionTracking(),
        productionApi.getBatchRecords(),
        productionApi.getRawMaterialUsage()
      ]);
      setTracking(trackingData.tracking || []);
      setBatches(batchData.batches || []);
      setRawMaterialUsage(usageData.usage_records || []);
    } catch (error) {
      toast.error('Geçmiş yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tracking" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Üretim Takip
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Batch Kayıtları
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Hammadde Kullanımı
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Üretim Takip Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Emir No</TableHead>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Hat</TableHead>
                      <TableHead>Üretim</TableHead>
                      <TableHead>Fire</TableHead>
                      <TableHead>Süre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tracking.slice(0, 50).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm">
                          {new Date(record.created_at).toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{record.order_number}</TableCell>
                        <TableCell>{record.product_name}</TableCell>
                        <TableCell>{record.line_name}</TableCell>
                        <TableCell className="font-semibold">
                          {record.produced_quantity} {record.unit}
                        </TableCell>
                        <TableCell>
                          {record.waste_quantity > 0 ? (
                            <span className="text-red-600">
                              {record.waste_quantity} {record.unit}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.duration_minutes ? `${Math.round(record.duration_minutes)} dk` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {tracking.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz üretim takip kaydı bulunmuyor
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Batch Kayıtları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch No</TableHead>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Miktar</TableHead>
                      <TableHead>Hat</TableHead>
                      <TableHead>Üretim Tarihi</TableHead>
                      <TableHead>SKT</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.slice(0, 50).map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono font-semibold">{batch.batch_number}</TableCell>
                        <TableCell>{batch.product_name}</TableCell>
                        <TableCell>
                          {batch.quantity} {batch.unit}
                        </TableCell>
                        <TableCell>{batch.line_name}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(batch.production_date).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('tr-TR') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {batch.status === 'completed' ? 'Tamamlandı' : batch.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {batches.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz batch kaydı bulunmuyor
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Hammadde Kullanım Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Emir No</TableHead>
                      <TableHead>Hammadde</TableHead>
                      <TableHead>Miktar</TableHead>
                      <TableHead>Lot No</TableHead>
                      <TableHead>Batch No</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawMaterialUsage.slice(0, 50).map((usage) => (
                      <TableRow key={usage.id}>
                        <TableCell className="text-sm">
                          {new Date(usage.usage_time).toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{usage.order_number}</TableCell>
                        <TableCell>{usage.raw_material_name}</TableCell>
                        <TableCell className="font-semibold">
                          {usage.used_quantity} {usage.unit}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {usage.lot_number || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {usage.batch_number || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rawMaterialUsage.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz hammadde kullanım kaydı bulunmuyor
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionHistory;