// QC Test Form - Detailed Test Entry
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const QCTestForm = ({ onRefresh }) => {
  const [qcRecords, setQcRecords] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    qc_record_id: '',
    batch_number: '',
    test_type: 'physical',
    test_name: '',
    test_method: '',
    measured_value: '',
    unit: '',
    specification_min: '',
    specification_max: '',
    result: 'pending',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [qcData, testsData] = await Promise.all([
        productionApi.getQualityControls(),
        productionApi.getQualityTests()
      ]);
      setQcRecords(qcData.quality_controls || []);
      setTests(testsData.tests || []);
    } catch (error) {
      console.error('Veriler yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.qc_record_id || !formData.test_name) {
      toast.error('Lütfen QC kaydı ve test adı girin');
      return;
    }

    setLoading(true);
    try {
      await productionApi.createQualityTest({
        ...formData,
        specification_min: formData.specification_min ? parseFloat(formData.specification_min) : null,
        specification_max: formData.specification_max ? parseFloat(formData.specification_max) : null
      });
      toast.success('Test kaydı oluşturuldu');
      setFormData({
        qc_record_id: '',
        batch_number: '',
        test_type: 'physical',
        test_name: '',
        test_method: '',
        measured_value: '',
        unit: '',
        specification_min: '',
        specification_max: '',
        result: 'pending',
        notes: ''
      });
      fetchData();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Test kaydı oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const testTypes = [
    { value: 'physical', label: 'Fiziksel (pH, Nem, Yoğunluk)' },
    { value: 'chemical', label: 'Kimyasal' },
    { value: 'microbiological', label: 'Mikrobiyolojik' },
    { value: 'sensory', label: 'Duyusal (Görsel, Tat, Koku)' },
    { value: 'haccp', label: 'HACCP' }
  ];

  const getResultBadge = (result) => {
    const configs = {
      pass: { variant: 'default', label: 'Geçti', className: 'bg-green-100 text-green-800' },
      fail: { variant: 'destructive', label: 'Kaldı', className: 'bg-red-100 text-red-800' },
      pending: { variant: 'secondary', label: 'Bekliyor', className: 'bg-yellow-100 text-yellow-800' }
    };
    const config = configs[result] || configs.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detaylı Test Girişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>QC Kaydı *</Label>
                <Select
                  value={formData.qc_record_id}
                  onValueChange={(value) => {
                    const record = qcRecords.find(r => r.id === value);
                    setFormData({
                      ...formData,
                      qc_record_id: value,
                      batch_number: record?.batch_number || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="QC kaydı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcRecords.map((record) => (
                      <SelectItem key={record.id} value={record.id}>
                        {record.batch_number} - {record.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Test Tipi *</Label>
                <Select
                  value={formData.test_type}
                  onValueChange={(value) => setFormData({ ...formData, test_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {testTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Test Adı *</Label>
                <Input
                  value={formData.test_name}
                  onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                  placeholder="pH Testi, Nem Analizi, vb."
                  required
                />
              </div>

              <div>
                <Label>Test Yöntemi</Label>
                <Input
                  value={formData.test_method}
                  onChange={(e) => setFormData({ ...formData, test_method: e.target.value })}
                  placeholder="TS EN ISO 1234"
                />
              </div>

              <div>
                <Label>Ölçülen Değer</Label>
                <Input
                  value={formData.measured_value}
                  onChange={(e) => setFormData({ ...formData, measured_value: e.target.value })}
                  placeholder="6.5"
                />
              </div>

              <div>
                <Label>Birim</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="pH, %, g/cm³"
                />
              </div>

              <div>
                <Label>Minimum Spesifikasyon</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.specification_min}
                  onChange={(e) => setFormData({ ...formData, specification_min: e.target.value })}
                  placeholder="6.0"
                />
              </div>

              <div>
                <Label>Maksimum Spesifikasyon</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.specification_max}
                  onChange={(e) => setFormData({ ...formData, specification_max: e.target.value })}
                  placeholder="7.0"
                />
              </div>

              <div>
                <Label>Sonuç *</Label>
                <Select
                  value={formData.result}
                  onValueChange={(value) => setFormData({ ...formData, result: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Bekliyor</SelectItem>
                    <SelectItem value="pass">Geçti</SelectItem>
                    <SelectItem value="fail">Kaldı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notlar</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Test notları..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Test Kaydı Ekle
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Test History */}
      <Card>
        <CardHeader>
          <CardTitle>Son Test Kayıtları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Değer</TableHead>
                  <TableHead>Sonuç</TableHead>
                  <TableHead>Test Eden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.slice(0, 20).map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="text-sm">
                      {new Date(test.test_date).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{test.batch_number}</TableCell>
                    <TableCell>{test.test_name}</TableCell>
                    <TableCell className="text-sm capitalize">{test.test_type}</TableCell>
                    <TableCell>
                      {test.measured_value} {test.unit}
                    </TableCell>
                    <TableCell>{getResultBadge(test.result)}</TableCell>
                    <TableCell className="text-sm">{test.tested_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Henüz test kaydı bulunmuyor
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QCTestForm;