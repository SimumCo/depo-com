import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const ExpiringStockAlert = () => {
  const [items, setItems] = useState([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchExpiring();
  }, [days]);

  const fetchExpiring = async () => {
    try {
      const data = await productionApi.getExpiringStockItems(days);
      setItems(data.expiring_items || []);
    } catch (error) {
      toast.error('FIFO/FEFO uyarıları yüklenemedi');
    }
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyBadge = (days) => {
    if (days <= 7) return <Badge className="bg-red-100 text-red-800">Acil</Badge>;
    if (days <= 15) return <Badge className="bg-orange-100 text-orange-800">Yakın</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">İzleniyor</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              FIFO / FEFO Uyarıları (Yaklaşan SKT)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Gün İçinde</SelectItem>
                  <SelectItem value="15">15 Gün İçinde</SelectItem>
                  <SelectItem value="30">30 Gün İçinde</SelectItem>
                  <SelectItem value="60">60 Gün İçinde</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Lokasyon</TableHead>
                  <TableHead>Lot/Batch</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>SKT</TableHead>
                  <TableHead>Kalan Gün</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const daysLeft = getDaysUntilExpiry(item.expiry_date);
                  return (
                    <TableRow key={item.id} className={daysLeft <= 7 ? 'bg-red-50' : daysLeft <= 15 ? 'bg-orange-50' : ''}>
                      <TableCell className="font-semibold">{item.product_name}</TableCell>
                      <TableCell className="font-mono">{item.location_code}</TableCell>
                      <TableCell>{item.lot_number || item.batch_number || '-'}</TableCell>
                      <TableCell>{item.quantity} {item.unit}</TableCell>
                      <TableCell>{new Date(item.expiry_date).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell>
                        <span className={daysLeft <= 7 ? 'font-bold text-red-600' : daysLeft <= 15 ? 'font-bold text-orange-600' : ''}>
                          {daysLeft} gün
                        </span>
                      </TableCell>
                      <TableCell>{getUrgencyBadge(daysLeft)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Seçilen periyotta yaklaşan SKT bulunamadı</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpiringStockAlert;