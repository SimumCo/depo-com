import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Truck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const PendingLogisticsLoading = ({ onRefresh }) => {
  const [loadings, setLoadings] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedLoading, setSelectedLoading] = useState(null);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverName, setDriverName] = useState('');

  const fetchLoadings = useCallback(async () => {
    try {
      const data = await productionApi.getPendingLogisticsLoading();
      setLoadings(data.pending_loadings || []);
    } catch (error) {
      toast.error('Yükleme talepleri yüklenemedi');
    }
  }, []);

  useEffect(() => {
    fetchLoadings();
  }, [fetchLoadings]);

  const handleApprove = async () => {
    if (!vehiclePlate || !driverName) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      await productionApi.approveLogisticsLoading(selectedLoading.id, vehiclePlate, driverName);
      toast.success('Yükleme onaylandı');
      setShowDialog(false);
      setVehiclePlate('');
      setDriverName('');
      fetchLoadings();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Onaylama başarısız');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Bekleyen Lojistik Yükleme Talepleri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Talep No</TableHead>
              <TableHead>Planlanan Tarih</TableHead>
              <TableHead>Varış Noktası</TableHead>
              <TableHead>Ürün Sayısı</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadings.map((loading) => (
              <TableRow key={loading.id}>
                <TableCell className="font-mono">{loading.request_number}</TableCell>
                <TableCell>{new Date(loading.scheduled_date).toLocaleDateString('tr-TR')}</TableCell>
                <TableCell>{loading.destination}</TableCell>
                <TableCell>{loading.items?.length || 0} ürün</TableCell>
                <TableCell>
                  <Badge variant="secondary">Bekliyor</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedLoading(loading);
                      setShowDialog(true);
                    }}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Onayla
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loadings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Bekleyen yükleme talebi bulunmuyor
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lojistik Yükleme Onayı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Araç Plakası *</Label>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="34 ABC 123"
              />
            </div>
            <div>
              <Label>Sürücü Adı *</Label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Sürücü adı soyadı"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button onClick={handleApprove}>
                Onayla ve Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PendingLogisticsLoading;