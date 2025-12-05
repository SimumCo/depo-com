// Raw Material Analysis Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, CheckCircle, RefreshCw, Package } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../services/productionApi';

const RawMaterialAnalysis = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      fetchAnalysis();
    }
  }, [selectedPlan]);

  const fetchPlans = async () => {
    try {
      const data = await productionApi.getProductionPlans();
      const approvedPlans = (data.plans || []).filter(
        p => p.status === 'approved' || p.status === 'in_progress'
      );
      setPlans(approvedPlans);
      if (approvedPlans.length > 0) {
        setSelectedPlan(approvedPlans[0].id);
      }
    } catch (error) {
      toast.error('Planlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    if (!selectedPlan) return;

    setAnalyzing(true);
    try {
      const data = await productionApi.getRawMaterialAnalysis(selectedPlan);
      setRequirements(data.requirements || []);
      setSummary(data.summary || null);
    } catch (error) {
      toast.error('Analiz yüklenemedi');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRecalculate = async () => {
    if (!selectedPlan) return;

    try {
      await productionApi.calculateRawMaterials(selectedPlan);
      toast.success('Analiz yeniden hesaplandı');
      fetchAnalysis();
    } catch (error) {
      toast.error('Yeniden hesaplama başarısız');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-2">Aktif plan bulunamadı</p>
          <p className="text-sm text-muted-foreground">
            Hammadde analizi için onaylanmış bir üretim planı gereklidir
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Hammadde İhtiyaç Analizi</h2>
          <p className="text-muted-foreground">Üretim için gerekli hammaddeleri kontrol edin</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedPlan || ''} onValueChange={setSelectedPlan}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Plan seçin" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.plan_number} - {plan.plan_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRecalculate} variant="outline" disabled={analyzing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
            Yeniden Hesapla
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Toplam Hammadde
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_items}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Yeterli Stok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{summary.sufficient_items}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Yetersiz Stok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{summary.insufficient_items}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Toplam Eksik
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.total_deficit_value.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hammadde Gereksinimleri</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hammadde</TableHead>
                <TableHead>Gerekli Miktar</TableHead>
                <TableHead>Mevcut Miktar</TableHead>
                <TableHead>Eksik Miktar</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((req) => (
                <TableRow key={req.id} className={!req.is_sufficient ? 'bg-red-50' : ''}>
                  <TableCell className="font-medium">{req.raw_material_name}</TableCell>
                  <TableCell>
                    {req.required_quantity.toFixed(2)} {req.unit}
                  </TableCell>
                  <TableCell>
                    {req.available_quantity.toFixed(2)} {req.unit}
                  </TableCell>
                  <TableCell>
                    {req.deficit_quantity > 0 ? (
                      <span className="text-red-600 font-semibold">
                        {req.deficit_quantity.toFixed(2)} {req.unit}
                      </span>
                    ) : (
                      <span className="text-green-600">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {req.is_sufficient ? (
                      <Badge variant="default" className="flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" />
                        Yeterli
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <AlertCircle className="h-3 w-3" />
                        Yetersiz
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RawMaterialAnalysis;