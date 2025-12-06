// Non-Conformance Reports List - QC Panel
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
import { AlertTriangle, Plus, FileWarning } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const NonConformanceList = ({ onRefresh }) => {
  const [ncrs, setNcrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNCRDialog, setShowNCRDialog] = useState(false);
  const [formData, setFormData] = useState({
    product_id: 'PROD001',
    product_name: '',
    nonconformance_type: 'physical',
    severity: 'minor',
    description: '',
    quantity_affected: 0,
    unit: 'kg',
    root_cause: '',
    corrective_action: '',
    preventive_action: '',
    capa_required: false
  });

  useEffect(() => {
    fetchNCRs();
  }, []);

  const fetchNCRs = async () => {
    try {
      const data = await productionApi.getNonConformanceReports();
      setNcrs(data.ncrs || []);
    } catch (error) {
      toast.error('Uygunsuzluk raporları yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description || formData.quantity_affected <= 0) {
      toast.error('Açıklama ve etkilenen miktar girilmeli');
      return;
    }

    setLoading(true);
    try {
      await productionApi.createNonConformanceReport(formData);
      toast.success('Uygunsuzluk raporu oluşturuldu');
      setShowNCRDialog(false);
      setFormData({
        product_id: 'PROD001',
        product_name: '',
        nonconformance_type: 'physical',
        severity: 'minor',
        description: '',
        quantity_affected: 0,
        unit: 'kg',
        root_cause: '',
        corrective_action: '',
        preventive_action: '',
        capa_required: false
      });
      fetchNCRs();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Uygunsuzluk raporu oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const ncTypes = [
    { value: 'physical', label: 'Fiziksel' },
    { value: 'chemical', label: 'Kimyasal' },
    { value: 'microbiological', label: 'Mikrobiyolojik' },
    { value: 'sensory', label: 'Duyusal' },
    { value: 'packaging', label: 'Ambalaj' },
    { value: 'labeling', label: 'Etiketleme' },
    { value: 'other', label: 'Diğer' }
  ];

  const severities = [
    { value: 'minor', label: 'Minör', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'major', label: 'Majör', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Kritik', color: 'bg-red-100 text-red-800' }
  ];

  const statuses = [
    { value: 'open', label: 'Açık', color: 'bg-red-100 text-red-800' },
    { value: 'in_progress', label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800' },
    { value: 'closed', label: 'Kapandı', color: 'bg-green-100 text-green-800' }
  ];

  const getSeverityBadge = (severity) => {
    const config = severities.find(s => s.value === severity);
    return <Badge className={config?.color}>{config?.label || severity}</Badge>;
  };

  const getStatusBadge = (status) => {
    const config = statuses.find(s => s.value === status);
    return <Badge className={config?.color}>{config?.label || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Uygunsuzluk Raporları (NCR)
            </CardTitle>
            <Button onClick={() => setShowNCRDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni NCR
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NCR No</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Şiddet</TableHead>
                  <TableHead>Etkilenen Miktar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>CAPA</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ncrs.map((ncr) => (
                  <TableRow key={ncr.id}>
                    <TableCell className="font-mono font-semibold">{ncr.ncr_number}</TableCell>
                    <TableCell>{ncr.product_name}</TableCell>
                    <TableCell className="capitalize">{ncr.nonconformance_type}</TableCell>
                    <TableCell>{getSeverityBadge(ncr.severity)}</TableCell>
                    <TableCell>
                      {ncr.quantity_affected} {ncr.unit}
                    </TableCell>
                    <TableCell>{getStatusBadge(ncr.status)}</TableCell>
                    <TableCell>
                      {ncr.capa_required ? (
                        <Badge variant="destructive">Gerekli</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(ncr.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {ncrs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileWarning className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Henüz uygunsuzluk raporu bulunmuyor</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* NCR Form Dialog */}
      <Dialog open={showNCRDialog} onOpenChange={setShowNCRDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Uygunsuzluk Raporu (NCR)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ürün Adı *</Label>
                <Input
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="Ürün adı"
                  required
                />
              </div>

              <div>
                <Label>Uygunsuzluk Tipi *</Label>
                <Select
                  value={formData.nonconformance_type}
                  onValueChange={(value) => setFormData({ ...formData, nonconformance_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ncTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Şiddet *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severities.map((sev) => (
                      <SelectItem key={sev.value} value={sev.value}>
                        {sev.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Etkilenen Miktar *</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.quantity_affected}
                    onChange={(e) => setFormData({ ...formData, quantity_affected: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <Input
                    className="w-20"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Açıklama *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Uygunsuzluğu detaylı açıklayın..."
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Kök Neden Analizi</Label>
              <Textarea
                value={formData.root_cause}
                onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                placeholder="Uygunsuzluğun kök nedeni..."
                rows={2}
              />
            </div>

            <div>
              <Label>Düzeltici Faaliyet</Label>
              <Textarea
                value={formData.corrective_action}
                onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                placeholder="Yapılan düzeltici faaliyetler..."
                rows={2}
              />
            </div>

            <div>
              <Label>Önleyici Faaliyet</Label>
              <Textarea
                value={formData.preventive_action}
                onChange={(e) => setFormData({ ...formData, preventive_action: e.target.value })}
                placeholder="Tekrarını önlemek için alınacak önlemler..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="capa"
                checked={formData.capa_required}
                onChange={(e) => setFormData({ ...formData, capa_required: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="capa" className="cursor-pointer">
                CAPA (Düzeltici ve Önleyici Faaliyet) Gerekli
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNCRDialog(false)}
              >
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                NCR Oluştur
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NonConformanceList;