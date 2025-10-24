import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { salesRepAPI } from '../services/api';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AccountingDashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await salesRepAPI.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      toast.error('Müşteriler yüklenemedi');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Sadece PDF veya resim dosyaları yükleyebilirsiniz');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!selectedCustomer) {
      toast.error('Lütfen müşteri seçin');
      return;
    }
    if (!file) {
      toast.error('Lütfen fatura dosyası seçin');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        `${BACKEND_URL}/api/invoices/upload?customer_id=${selectedCustomer}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success('Fatura başarıyla yüklendi');
      
      // Add to history
      const customer = customers.find(c => c.id === selectedCustomer);
      setUploadHistory([
        {
          id: response.data.invoice_id,
          customer_name: customer?.full_name,
          filename: file.name,
          date: new Date().toLocaleString('tr-TR'),
          size: response.data.size
        },
        ...uploadHistory
      ]);

      // Reset
      setFile(null);
      setSelectedCustomer('');
      document.getElementById('file-input').value = '';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fatura yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout title="Muhasebe Paneli">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Fatura Yükleme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Müşteri Seçin *</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger data-testid="customer-select">
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.full_name} ({customer.customer_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-input">Fatura Dosyası (PDF/Resim) *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Input
                  id="file-input"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-blue-600">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Fatura yüklemek için tıklayın</p>
                      <p className="text-xs text-gray-500">PDF, JPG veya PNG</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">ℹ️ Bilgilendirme:</p>
              <p>Faturada "SAYIN" yazan kısmın altındaki müşteri bilgileri otomatik olarak sisteme kaydedilecektir.</p>
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedCustomer || !file}
              className="w-full"
              data-testid="upload-button"
            >
              {uploading ? 'Yükleniyor...' : 'Faturayı Yükle'}
            </Button>
          </CardContent>
        </Card>

        {/* Upload History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5" />
              Yükleme Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Henüz fatura yüklenmedi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadHistory.map((item, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{item.customer_name}</p>
                        <p className="text-sm text-gray-600">{item.filename}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.date} • {(item.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Özet İstatistikler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{uploadHistory.length}</p>
              <p className="text-sm text-gray-600">Yüklenen Fatura</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{customers.length}</p>
              <p className="text-sm text-gray-600">Toplam Müşteri</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {new Set(uploadHistory.map(h => h.customer_name)).size}
              </p>
              <p className="text-sm text-gray-600">Aktif Müşteri</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default AccountingDashboard;
