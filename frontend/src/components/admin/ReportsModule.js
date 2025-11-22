import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileText, Download, FileSpreadsheet, FileType } from 'lucide-react';
import { reportsAPI } from '../../services/api';

const ReportsModule = () => {
  const [reportType, setReportType] = useState('sales');
  const [format, setFormat] = useState('xlsx');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      let response;
      const timestamp = new Date().toISOString().split('T')[0];
      
      switch (reportType) {
        case 'sales':
          response = await reportsAPI.exportSales(format, startDate, endDate);
          downloadFile(response.data, `sales_report_${timestamp}.${format}`);
          break;
        case 'stock':
          response = await reportsAPI.exportStock(format);
          downloadFile(response.data, `stock_report_${timestamp}.${format}`);
          break;
        case 'sales_agents':
          response = await reportsAPI.exportSalesAgents(format, startDate, endDate);
          downloadFile(response.data, `sales_agents_report_${timestamp}.${format}`);
          break;
        case 'logistics':
          response = await reportsAPI.exportLogistics(format, startDate, endDate);
          downloadFile(response.data, `logistics_report_${timestamp}.${format}`);
          break;
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('İndirme sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const reportOptions = [
    { value: 'sales', label: 'Satış Raporu', icon: FileText, description: 'Sipariş ve satış detayları' },
    { value: 'stock', label: 'Stok Raporu', icon: FileSpreadsheet, description: 'Depo stok durumu' },
    { value: 'sales_agents', label: 'Plasiyer Performans Raporu', icon: FileType, description: 'Plasiyer satış performansı' },
    { value: 'logistics', label: 'Lojistik Raporu', icon: FileText, description: 'Teslimat ve lojistik' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Raporlama Modülü</h2>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card 
              key={option.value}
              className={`cursor-pointer hover:shadow-lg transition-all ${
                reportType === option.value ? 'border-blue-500 border-2' : ''
              }`}
              onClick={() => setReportType(option.value)}
            >
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Icon className="h-6 w-6 text-blue-500" />
                  <div>
                    <CardTitle className="text-base">{option.label}</CardTitle>
                    <CardDescription className="text-sm">{option.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Rapor Ayarları</CardTitle>
          <CardDescription>Format ve tarih aralığı seçin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="format">Rapor Formatı</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Excel (.xlsx)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>PDF (.pdf)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(reportType === 'sales' || reportType === 'sales_agents' || reportType === 'logistics') && (
              <>
                <div>
                  <Label htmlFor="start_date">Başlangıç Tarihi</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Bitiş Tarihi</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-6">
            <Button 
              onClick={handleExport} 
              disabled={loading}
              className="w-full md:w-auto"
            >
              {loading ? (
                <span>Hazırlanıyor...</span>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Raporu İndir ({format.toUpperCase()})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Rapor Hakkında</p>
              <p className="text-sm text-blue-700 mt-1">
                Raporlar Excel veya PDF formatında indirilebilir. Tarih filtresi olmayan raporlar için geçerli tüm veriler dahil edilir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsModule;