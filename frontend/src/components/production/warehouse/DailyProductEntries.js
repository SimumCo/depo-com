import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Package, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const DailyProductEntries = () => {
  const [entries, setEntries] = useState([]);
  const [days, setDays] = useState(1);

  const fetchEntries = useCallback(async () => {
    try {
      const data = await productionApi.getDailyProductEntries(days);
      setEntries(data.entries || []);
    } catch (error) {
      toast.error('Giriş kayıtları yüklenemedi');
    }
  }, [days]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Günlük Ürün Giriş Listesi (Fabrika)
          </CardTitle>
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Bugün</SelectItem>
              <SelectItem value="3">Son 3 Gün</SelectItem>
              <SelectItem value="7">Son 7 Gün</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>İrsaliye No</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Ürün</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Lot/Batch</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono">{entry.transaction_number}</TableCell>
                <TableCell>{new Date(entry.transaction_date).toLocaleDateString('tr-TR')}</TableCell>
                <TableCell>{entry.product_name}</TableCell>
                <TableCell className="font-semibold">{entry.quantity} {entry.unit}</TableCell>
                <TableCell>{entry.lot_number || entry.batch_number || '-'}</TableCell>
                <TableCell>
                  <Badge>Tamamlandı</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {entries.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Seçilen dönemde giriş kaydı bulunmuyor
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyProductEntries;