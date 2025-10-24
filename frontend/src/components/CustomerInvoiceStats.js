import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, FileText, Calendar } from 'lucide-react';
import { salesRepAPI } from '../services/api';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CustomerInvoiceStats = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadStats();
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      const response = await salesRepAPI.getCustomers();
      setCustomers(response.data);
      if (response.data.length > 0) {
        setSelectedCustomer(response.data[0].id);
      }
    } catch (error) {
      toast.error('Müşteriler yüklenemedi');
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/invoices/customer-stats/${selectedCustomer}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data);
    } catch (error) {
      toast.error('İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Müşteri Seçin</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
            <SelectTrigger className="w-full" data-testid="customer-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.full_name} ({customer.customer_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCustomerData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">{selectedCustomerData.full_name}</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Müşteri No:</strong> {selectedCustomerData.customer_number}</p>
                <p><strong>Email:</strong> {selectedCustomerData.email || '-'}</p>
                <p><strong>Kanal:</strong> {selectedCustomerData.channel_type === 'logistics' ? 'Lojistik' : 'Bayi'}</p>
                {selectedCustomerData.profile && (
                  <>
                    <p><strong>Şirket:</strong> {selectedCustomerData.profile.company_name}</p>
                    <p><strong>Telefon:</strong> {selectedCustomerData.profile.phone}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {stats && stats.total_invoices > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Fatura</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_invoices}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Tutar</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_amount.toLocaleString('tr-TR')} TL</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ortalama Fatura</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.average_invoice_amount.toLocaleString('tr-TR')} TL</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Son Fatura</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {stats.last_invoice_date ? new Date(stats.last_invoice_date).toLocaleDateString('tr-TR') : '-'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown Chart */}
          {stats.monthly_breakdown && stats.monthly_breakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aylık Fatura Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.monthly_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="invoice_count" fill="#3b82f6" name="Fatura Sayısı" />
                    <Bar yAxisId="right" dataKey="total_amount" fill="#10b981" name="Tutar (TL)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Son Faturalar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recent_invoices.map((invoice, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(invoice.invoice_date).toLocaleDateString('tr-TR')}
                      </p>
                      {invoice.supplier && (
                        <p className="text-xs text-gray-500">{invoice.supplier}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        {invoice.total_amount.toLocaleString('tr-TR')} TL
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Henüz Fatura Kaydı Yok</h3>
            <p className="text-gray-600">Bu müşteri için henüz fatura yüklenmemiş</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerInvoiceStats;
