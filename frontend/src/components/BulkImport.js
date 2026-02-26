import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { FileSpreadsheet, Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BulkImport = () => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResults(null);
      } else {
        toast.error('Lütfen Excel (.xlsx, .xls) veya CSV dosyası seçin');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Lütfen bir dosya seçin');
      return;
    }

    setImporting(true);
    // Simüle edilmiş import işlemi
    setTimeout(() => {
      setResults({
        total: 50,
        success: 47,
        failed: 3,
        errors: [
          { row: 12, message: 'Geçersiz ürün kodu' },
          { row: 28, message: 'Eksik müşteri bilgisi' },
          { row: 45, message: 'Format hatası' },
        ]
      });
      setImporting(false);
      toast.success('Import işlemi tamamlandı');
    }, 2000);
  };

  const downloadTemplate = () => {
    toast.info('Şablon indirme özelliği yakında aktif olacak');
  };

  return (
    <Card data-testid="bulk-import">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Excel Veri Girişi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Şablon İndirme */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Şablon Dosyası</h4>
              <p className="text-sm text-blue-700">
                Veri girişi için örnek Excel şablonunu indirin
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate} data-testid="download-template">
              <Download className="h-4 w-4 mr-2" />
              Şablon İndir
            </Button>
          </div>
        </div>

        {/* Dosya Yükleme */}
        <div className="space-y-3">
          <Label>Excel/CSV Dosyası Seç</Label>
          <div className="flex gap-3">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="flex-1"
              data-testid="file-input"
            />
            <Button 
              onClick={handleImport} 
              disabled={!file || importing}
              data-testid="import-btn"
            >
              {importing ? (
                <>Yükleniyor...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Yükle
                </>
              )}
            </Button>
          </div>
          {file && (
            <p className="text-sm text-gray-600">
              Seçilen dosya: <span className="font-medium">{file.name}</span>
            </p>
          )}
        </div>

        {/* Sonuçlar */}
        {results && (
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Import Sonuçları</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded p-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{results.total}</p>
                <p className="text-sm text-gray-500">Toplam Satır</p>
              </div>
              <div className="bg-green-50 rounded p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{results.success}</p>
                <p className="text-sm text-green-700">Başarılı</p>
              </div>
              <div className="bg-red-50 rounded p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                <p className="text-sm text-red-700">Hatalı</p>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-red-700 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Hatalar
                </h5>
                {results.errors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-red-50 p-2 rounded">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Satır {error.row}: {error.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Desteklenen Formatlar */}
        <div className="text-sm text-gray-500">
          <p className="font-medium mb-1">Desteklenen Formatlar:</p>
          <div className="flex gap-2">
            <Badge variant="outline">.xlsx</Badge>
            <Badge variant="outline">.xls</Badge>
            <Badge variant="outline">.csv</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkImport;
