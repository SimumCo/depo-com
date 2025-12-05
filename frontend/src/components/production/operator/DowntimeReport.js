// Downtime Report - Operator Panel
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { AlertTriangle, Plus, StopCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const DowntimeReport = ({ onRefresh }) => {
  const [lines, setLines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [downtimes, setDowntimes] = useState([]);
  const [activeDowntimes, setActiveDowntimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    line_id: '',
    downtime_type: 'breakdown',
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [linesData, ordersData, downtimeData] = await Promise.all([
        productionApi.getProductionLines(),
        productionApi.getOperatorMyOrders(),
        productionApi.getMachineDowntimes()
      ]);
      setLines(linesData.lines || []);
      setOrders(ordersData.orders || []);
      setDowntimes(downtimeData.downtimes || []);
      setActiveDowntimes(downtimeData.downtimes.filter(d => !d.end_time) || []);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.line_id || !formData.downtime_type) {
      toast.error('Lütfen hat ve duruş tipi seçin');
      return;
    }

    setLoading(true);
    try {
      await productionApi.createMachineDowntime(formData);
      toast.success('Duruş kaydı oluşturuldu');
      setFormData({
        order_id: '',
        line_id: '',
        downtime_type: 'breakdown',
        reason: ''
      });
      fetchData();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Duruş kaydı oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleEndDowntime = async (downtimeId) => {
    try {
      await productionApi.endMachineDowntime(downtimeId);
      toast.success('Duruş sonlandırıldı');
      fetchData();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Duruş sonlandırılamadı');
    }
  };

  const downtimeTypes = [
    { value: 'breakdown', label: 'Arıza', color: 'bg-red-100 text-red-800' },
    { value: 'maintenance', label: 'Bakım', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'setup', label: 'Ayar/Kurulum', color: 'bg-blue-100 text-blue-800' },
    { value: 'no_material', label: 'Hammadde Yok', color: 'bg-orange-100 text-orange-800' },
    { value: 'no_operator', label: 'Operatör Yok', color: 'bg-purple-100 text-purple-800' },
    { value: 'planned_stop', label: 'Planlı Duruş', color: 'bg-green-100 text-green-800' },
    { value: 'other', label: 'Diğer', color: 'bg-gray-100 text-gray-800' }
  ];

  const getDowntimeTypeLabel = (type) => {
    return downtimeTypes.find(t => t.value === type)?.label || type;
  };

  const getDowntimeTypeColor = (type) => {
    return downtimeTypes.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Active Downtimes Alert */}
      {activeDowntimes.length > 0 && (
        <Card className="border-l-4 border-l-red-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Aktif Duruşlar ({activeDowntimes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeDowntimes.map((downtime) => (
                <div key={downtime.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{downtime.line_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getDowntimeTypeLabel(downtime.downtime_type)} - 
                      {new Date(downtime.start_time).toLocaleString('tr-TR')}
                    </p>
                    {downtime.reason && (
                      <p className="text-sm mt-1">{downtime.reason}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleEndDowntime(downtime.id)}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Sonlandır
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Yeni Duruş Bildirimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Üretim Hattı *</Label>
                <Select
                  value={formData.line_id}
                  onValueChange={(value) => setFormData({ ...formData, line_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Hat seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {lines.map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.name} ({line.line_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Üretim Emri (Opsiyonel)</Label>
                <Select
                  value={formData.order_id}
                  onValueChange={(value) => setFormData({ ...formData, order_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Emir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Seçilmedi</SelectItem>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duruş Tipi *</Label>
                <Select
                  value={formData.downtime_type}
                  onValueChange={(value) => setFormData({ ...formData, downtime_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {downtimeTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Açıklama</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Duruş sebebini detaylı açıklayın..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              <StopCircle className="mr-2 h-4 w-4" />
              Duruş Başlat
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Downtime History */}
      <Card>
        <CardHeader>
          <CardTitle>Duruş Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hat</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead>Süre</TableHead>
                  <TableHead>Sebep</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {downtimes.slice(0, 20).map((downtime) => (
                  <TableRow key={downtime.id}>
                    <TableCell className="font-semibold">{downtime.line_name}</TableCell>
                    <TableCell>
                      <Badge className={getDowntimeTypeColor(downtime.downtime_type)}>
                        {getDowntimeTypeLabel(downtime.downtime_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(downtime.start_time).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {downtime.end_time ? (
                        new Date(downtime.end_time).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        <Badge variant="destructive">Devam ediyor</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {downtime.duration_minutes ? (
                        <span className="font-semibold">
                          {Math.floor(downtime.duration_minutes / 60)}s {Math.round(downtime.duration_minutes % 60)}dk
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {downtime.reason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {downtimes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Henüz duruş kaydı bulunmuyor
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DowntimeReport;