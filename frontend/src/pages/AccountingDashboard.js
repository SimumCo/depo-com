import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, FileCode, Eye } from 'lucide-react';
import InvoiceUpload from '../components/InvoiceUpload';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AccountingDashboard = () => {
  const [uploadHistory, setUploadHistory] = useState([]);
  const [myInvoices, setMyInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMyInvoices();
  }, []);

  const loadMyInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/invoices/all/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyInvoices(response.data || []);
    } catch (error) {
      console.error('Faturalar yüklenemedi:', error);
      toast.error('Faturalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Yeni pencerede HTML'i göster
      const newWindow = window.open('', '_blank');
      newWindow.document.write(response.data.html_content);
      newWindow.document.close();
    } catch (error) {
      console.error('Fatura görüntülenemedi:', error);
      toast.error('Fatura görüntülenemedi');
    }
  };

  return (
    <Layout title="Muhasebe Paneli">
      <Tabs defaultValue="invoice-upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoice-upload">
            <FileCode className="mr-2 h-4 w-4" />
            Fatura Yükleme (HTML)
          </TabsTrigger>
          <TabsTrigger value="my-invoices">
            <FileText className="mr-2 h-4 w-4" />
            Yüklediğim Faturalar
          </TabsTrigger>
          <TabsTrigger value="stats">
            <CheckCircle className="mr-2 h-4 w-4" />
            İstatistikler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoice-upload">
          <InvoiceUpload onSuccess={loadMyInvoices} />
        </TabsContent>

        <TabsContent value="my-invoices">
          <Card>
            <CardHeader>
              <CardTitle>Yüklediğim Faturalar</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : myInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>Henüz fatura yüklenmedi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-lg">{invoice.invoice_number}</h4>
                          <p className="text-sm text-gray-600">Tarih: {invoice.invoice_date}</p>
                          <p className="text-sm text-gray-600">Tutar: {invoice.grand_total}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {invoice.product_count} ürün • Yükleme: {new Date(invoice.uploaded_at).toLocaleString('tr-TR')}
                          </p>
                        </div>
                        <button
                          onClick={() => viewInvoice(invoice.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Görüntüle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          {/* Stats Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Özet İstatistikler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{myInvoices.length}</p>
                  <p className="text-sm text-gray-600">Yüklenen Fatura</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {new Set(myInvoices.map(inv => inv.customer_tax_id)).size}
                  </p>
                  <p className="text-sm text-gray-600">Farklı Müşteri</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {myInvoices.reduce((sum, inv) => sum + (inv.product_count || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600">Toplam Ürün</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload History - Son 10 Fatura */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5" />
                Son Yüklenen Faturalar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>Henüz fatura yüklenmedi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myInvoices.slice(0, 10).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-600">Tutar: {invoice.grand_total}</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(invoice.uploaded_at).toLocaleString('tr-TR')} • {invoice.product_count} ürün
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default AccountingDashboard;
