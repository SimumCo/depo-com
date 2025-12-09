/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const StockLocationManager = () => {
  const [locations, setLocations] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    location_code: '',
    location_name: '',
    zone: 'Hammadde',
    capacity: 0,
    unit: 'kg',
    temperature_controlled: false
  });

  const fetchData = React.useCallback(async () => { // moved
  }, []);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const data = await productionApi.getStockLocations();
      setLocations(data.locations || []);
    } catch (error) {
      toast.error('Lokasyonlar yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await productionApi.createStockLocation(formData);
      toast.success('Lokasyon oluşturuldu');
      setShowDialog(false);
      fetchLocations();
    } catch (error) {
      toast.error('Lokasyon oluşturulamadı');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Stok Lokasyonları ve Raf Yönetimi
            </CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Lokasyon
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lokasyon Kodu</TableHead>
                <TableHead>Adı</TableHead>
                <TableHead>Bölge</TableHead>
                <TableHead>Kapasite</TableHead>
                <TableHead>Mevcut Stok</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-mono font-semibold">{loc.location_code}</TableCell>
                  <TableCell>{loc.location_name}</TableCell>
                  <TableCell><Badge>{loc.zone}</Badge></TableCell>
                  <TableCell>{loc.capacity ? `${loc.capacity} ${loc.unit}` : '-'}</TableCell>
                  <TableCell>{loc.current_stock || 0}</TableCell>
                  <TableCell>
                    <Badge variant={loc.is_active ? 'default' : 'secondary'}>
                      {loc.is_active ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Lokasyon</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lokasyon Kodu *</Label>
                <Input value={formData.location_code} onChange={(e) => setFormData({...formData, location_code: e.target.value})} placeholder="A-01-05" required />
              </div>
              <div>
                <Label>Lokasyon Adı *</Label>
                <Input value={formData.location_name} onChange={(e) => setFormData({...formData, location_name: e.target.value})} required />
              </div>
              <div>
                <Label>Bölge *</Label>
                <Select value={formData.zone} onValueChange={(value) => setFormData({...formData, zone: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hammadde">Hammadde</SelectItem>
                    <SelectItem value="Yarı Mamul">Yarı Mamul</SelectItem>
                    <SelectItem value="Mamul">Mamul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kapasite</Label>
                <Input type="number" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button type="submit">Oluştur</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockLocationManager;