// HACCP Records Panel - QC
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Shield, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const HACCPPanel = ({ onRefresh }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    ccp_number: 'CCP-1',
    ccp_name: '',
    monitored_parameter: '',
    measured_value: '',
    unit: '',
    critical_limit_min: '',
    critical_limit_max: '',
    status: 'in_control',
    corrective_action: ''
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const data = await productionApi.getHACCPRecords();
      setRecords(data.haccp_records || []);
    } catch (error) {
      toast.error('HACCP kayıtları yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.ccp_name || !formData.monitored_parameter || !formData.measured_value) {
      toast.error('Lütfen gerekli alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      await productionApi.createHACCPRecord({
        ...formData,
        critical_limit_min: formData.critical_limit_min ? parseFloat(formData.critical_limit_min) : null,
        critical_limit_max: formData.critical_limit_max ? parseFloat(formData.critical_limit_max) : null
      });
      toast.success('HACCP kaydı oluşturuldu');
      setShowDialog(false);
      setFormData({
        ccp_number: 'CCP-1',
        ccp_name: '',
        monitored_parameter: '',
        measured_value: '',
        unit: '',
        critical_limit_min: '',
        critical_limit_max: '',
        status: 'in_control',
        corrective_action: ''
      });
      fetchRecords();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('HACCP kaydı oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const ccpOptions = [
    { value: 'CCP-1', label: 'CCP-1: Pastörizasyon Sıcaklığı' },
    { value: 'CCP-2', label: 'CCP-2: Soğutma Sıcaklığı' },
    { value: 'CCP-3', label: 'CCP-3: Depolama Sıcaklığı' },
    { value: 'CCP-4', label: 'CCP-4: Metal Dedektör' },
    { value: 'CCP-5', label: 'CCP-5: pH Kontrolü' }
  ];

  const getStatusBadge = (status) => {
    if (status === 'in_control') {
      return <Badge className="bg-green-100 text-green-800">Kontrol Altında</Badge>;
    } else if (status === 'deviation') {
      return <Badge className="bg-red-100 text-red-800">Sapma</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const deviations = records.filter(r => r.status === 'deviation');

  return (
    <div className="space-y-6">
      {/* Deviations Alert */}
      {deviations.length > 0 && (
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-600">HACCP Sapma Uyarısı!</p>
                <p className="text-sm text-muted-foreground">
                  {deviations.length} adet kritik kontrol noktasında sapma tespit edildi.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              HACCP Kritik Kontrol Noktaları
            </CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Kayıt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CCP No</TableHead>
                  <TableHead>CCP Adı</TableHead>
                  <TableHead>Parametre</TableHead>
                  <TableHead>Ölçülen</TableHead>
                  <TableHead>Kritik Limit</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Kontrol Eden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.slice(0, 50).map((record) => (
                  <TableRow key={record.id} className={record.status === 'deviation' ? 'bg-red-50' : ''}>
                    <TableCell className="font-semibold">{record.ccp_number}</TableCell>
                    <TableCell>{record.ccp_name}</TableCell>
                    <TableCell>{record.monitored_parameter}</TableCell>
                    <TableCell className="font-mono">
                      {record.measured_value} {record.unit}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.critical_limit_min && record.critical_limit_max
                        ? `${record.critical_limit_min} - ${record.critical_limit_max}`
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(record.monitoring_time).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="text-sm">{record.monitored_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {records.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Henüz HACCP kaydı bulunmuyor</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* HACCP Form Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni HACCP CCP Kaydı</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kritik Kontrol Noktası *</Label>
                <Select
                  value={formData.ccp_number}
                  onValueChange={(value) => {
                    const option = ccpOptions.find(o => o.value === value);
                    setFormData({
                      ...formData,
                      ccp_number: value,
                      ccp_name: option?.label.split(': ')[1] || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ccpOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>İzlenen Parametre *</Label>
                <Input
                  value={formData.monitored_parameter}
                  onChange={(e) => setFormData({ ...formData, monitored_parameter: e.target.value })}
                  placeholder="Sıcaklık, pH, vb."
                  required
                />
              </div>

              <div>
                <Label>Ölçülen Değer *</Label>
                <Input
                  value={formData.measured_value}
                  onChange={(e) => setFormData({ ...formData, measured_value: e.target.value })}
                  placeholder="72.5"
                  required
                />
              </div>

              <div>
                <Label>Birim *</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="°C, pH"
                  required
                />
              </div>

              <div>
                <Label>Minimum Kritik Limit</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.critical_limit_min}
                  onChange={(e) => setFormData({ ...formData, critical_limit_min: e.target.value })}
                  placeholder="72"
                />
              </div>

              <div>
                <Label>Maksimum Kritik Limit</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.critical_limit_max}
                  onChange={(e) => setFormData({ ...formData, critical_limit_max: e.target.value })}
                  placeholder="75"
                />
              </div>

              <div>
                <Label>Durum *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_control">Kontrol Altında</SelectItem>
                    <SelectItem value="deviation">Sapma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.status === 'deviation' && (
              <div>
                <Label>Düzeltici Faaliyet *</Label>
                <Textarea
                  value={formData.corrective_action}
                  onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                  placeholder="Alınan düzeltici önlemler..."
                  rows={3}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                <Shield className="mr-2 h-4 w-4" />
                Kayıt Oluştur
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HACCPPanel;