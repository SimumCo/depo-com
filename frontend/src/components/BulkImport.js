import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import api from '../services/api';
import { Upload, Download, Users, Package, ShoppingCart, CheckCircle, AlertCircle, XCircle, FileSpreadsheet } from 'lucide-react';

const BulkImport = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const downloadTemplate = (type) => {
    // Template verileri
    const templates = {
      customers: {
        headers: ['işletme_id', 'işletme_adi', 'adres', 'sehir', 'telefon', 'vergi_no', 'kanal_tipi'],
        example: ['ISLT001', 'Örnek Market A.Ş.', 'Atatürk Cad. No:123', 'İstanbul', '05551234567', '1234567890', 'dealer'],
        example2: ['ISLT002', 'Otel Grand', 'Cumhuriyet Mah. 456 Sk.', 'Ankara', '05559876543', '0987654321', 'logistics']
      },
      products: {
        headers: ['urun_id', 'urun_adi', 'urun_turu', 'stok', 'kasa_ici_adet', 'lojistik_fiyat', 'bayi_fiyat', 'skt_omru'],
        example: ['URN001', 'Ayran 170ml', 'Süt Ürünleri', '1000', '24', '5.50', '6.00', '21_gun'],
        example2: ['URN002', 'Süt 1L', 'Süt Ürünleri', '500', '12', '15.00', '17.50', '28_gun']
      },
      orders: {
        headers: ['siparis_id', 'musteri_id', 'urun_id_1', 'adet_1', 'urun_id_2', 'adet_2', 'siparis_tarihi', 'siparis_durumu'],
        example: ['SIP001', 'ISLT001', 'URN001', '50', 'URN002', '30', '2025-10-30', 'pending'],
        example2: ['SIP002', 'ISLT002', 'URN001', '100', '', '', '2025-10-30', 'approved']
      }
    };

    const template = templates[type];
    if (!template) {
      alert('Template bulunamadı');
      return;
    }

    // CSV içeriği oluştur
    const csvContent = [
      template.headers.join(','),
      template.example.join(','),
      template.example2.join(',')
    ].join('\n');

    // BOM ekle (Excel'de Türkçe karakterler için)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template_örnek.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Başarı mesajı
    setError('');
    alert(`✅ ${type} template başarıyla indirildi!\n\nDosya: ${type}_template_örnek.csv\n\n2 örnek satır içerir, kendi verilerinizi ekleyerek kullanabilirsiniz.`);
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/bulk-import/${type}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Dosya yüklenirken hata oluştu');
      console.error(err);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const renderResults = () => {
    if (!result) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>İşlem Sonucu</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <div className="text-sm text-blue-700">Toplam</div>
                <div className="text-2xl font-bold text-blue-900">{result.summary.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4">
                <div className="text-sm text-green-700">Başarılı</div>
                <div className="text-2xl font-bold text-green-900">{result.summary.success}</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50">
              <CardContent className="p-4">
                <div className="text-sm text-yellow-700">Atlandı</div>
                <div className="text-2xl font-bold text-yellow-900">{result.summary.skipped}</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="p-4">
                <div className="text-sm text-red-700">Hata</div>
                <div className="text-2xl font-bold text-red-900">{result.summary.errors}</div>
              </CardContent>
            </Card>
          </div>

          {/* Success Details */}
          {result.details.success.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                Başarılı Kayıtlar ({result.details.success.length})
              </h4>
              <div className="max-h-60 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Satır</TableHead>
                      <TableHead>Detaylar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.details.success.slice(0, 20).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.row}</TableCell>
                        <TableCell className="text-sm">
                          {JSON.stringify(item, null, 2).substring(0, 100)}...
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Skipped Details */}
          {result.details.skipped.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-700">
                <AlertCircle className="h-5 w-5" />
                Atlanan Kayıtlar ({result.details.skipped.length})
              </h4>
              <div className="max-h-60 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Satır</TableHead>
                      <TableHead>Sebep</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.details.skipped.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.row}</TableCell>
                        <TableCell className="text-sm text-yellow-800">{item.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Error Details */}
          {result.details.errors.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                Hatalar ({result.details.errors.length})
              </h4>
              <div className="max-h-60 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Satır</TableHead>
                      <TableHead>Hata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.details.errors.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.row}</TableCell>
                        <TableCell className="text-sm text-red-800">{item.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel ile Toplu Veri Girişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customers">
                <Users className="mr-2 h-4 w-4" />
                Müşteriler
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="mr-2 h-4 w-4" />
                Ürünler
              </TabsTrigger>
              <TabsTrigger value="orders">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Siparişler
              </TabsTrigger>
            </TabsList>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Gerekli Alanlar:</strong> işletme_id (eşsiz), işletme_adi, adres
                  <br />
                  <strong>Opsiyonel:</strong> sehir, telefon, vergi_no, kanal_tipi (logistics/dealer)
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button
                  onClick={() => downloadTemplate('customers')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Template İndir
                </Button>

                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 'customers')}
                    className="hidden"
                    id="customer-upload"
                    disabled={uploading}
                  />
                  <Button
                    onClick={() => document.getElementById('customer-upload').click()}
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Yükleniyor...' : 'Excel Yükle'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Gerekli Alanlar:</strong> urun_id (eşsiz), urun_adi, urun_turu, stok, kasa_ici_adet
                  <br />
                  <strong>Opsiyonel:</strong> son_kullanim_tarihi, agirlik_kg, lojistik_fiyat, bayi_fiyat
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button
                  onClick={() => downloadTemplate('products')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Template İndir
                </Button>

                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 'products')}
                    className="hidden"
                    id="product-upload"
                    disabled={uploading}
                  />
                  <Button
                    onClick={() => document.getElementById('product-upload').click()}
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Yükleniyor...' : 'Excel Yükle'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Gerekli Alanlar:</strong> siparis_id (eşsiz), musteri_id, urun_id_1, adet_1
                  <br />
                  <strong>Opsiyonel:</strong> urun_id_2 ile urun_id_10 arası (birden çok ürün), siparis_tarihi, siparis_durumu
                  <br />
                  <strong>Durumlar:</strong> pending, approved, preparing, ready, dispatched, delivered
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button
                  onClick={() => downloadTemplate('orders')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Template İndir
                </Button>

                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 'orders')}
                    className="hidden"
                    id="order-upload"
                    disabled={uploading}
                  />
                  <Button
                    onClick={() => document.getElementById('order-upload').click()}
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Yükleniyor...' : 'Excel Yükle'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {renderResults()}
    </div>
  );
};

export default BulkImport;
