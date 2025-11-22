import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Upload, FileText, DollarSign, TrendingUp, Users, Calendar, BarChart3, CreditCard } from 'lucide-react';
import InvoiceUpload from '../components/InvoiceUpload';
import ManualInvoiceEntry from '../components/ManualInvoiceEntry';
import { invoicesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AccountingDashboard = () => {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState('upload');
  const [myInvoices, setMyInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalAmount: 0
  });

  useEffect(() => {
    loadMyInvoices();
  }, []);

  const loadMyInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getAll();
      const invoices = response.data || [];
      setMyInvoices(invoices);
      
      // Calculate stats
      const totalInvoices = invoices.length;
      const paidInvoices = invoices.filter(inv => inv.is_paid).length;
      const pendingInvoices = invoices.filter(inv => !inv.is_paid).length;
      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      
      setStats({ totalInvoices, paidInvoices, pendingInvoices, totalAmount });
    } catch (error) {
      console.error('Faturalar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { id: 'upload', name: 'Fatura Yükleme', icon: Upload, color: 'blue' },
    { id: 'manual', name: 'Manuel Giriş', icon: FileText, color: 'purple' },
    { id: 'list', name: 'Fatura Listesi', icon: BarChart3, color: 'green' },
    { id: 'payments', name: 'Ödeme Takibi', icon: CreditCard, color: 'orange' }
  ];

  const colorClasses = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', textDark: 'text-blue-900' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', textDark: 'text-purple-900' },
    green: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-600', textDark: 'text-green-900' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', textDark: 'text-orange-900' }
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'upload':
        return <InvoiceUpload onSuccess={loadMyInvoices} />;
      case 'manual':
        return <ManualInvoiceEntry onSuccess={loadMyInvoices} />;
      case 'list':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tüm Faturalar</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : myInvoices.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz fatura yok</p>
            ) : (
              <div className="space-y-2">
                {myInvoices.map((invoice) => (
                  <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-500">{invoice.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₺{(invoice.total_amount || 0).toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          invoice.is_paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.is_paid ? 'Ödendi' : 'Bekliyor'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'payments':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Ödeme Takibi</h3>
            <p className="text-gray-500 text-center py-8">Ödeme takip modülü yakında eklenecek</p>
          </div>
        );
      default:
        return <InvoiceUpload onSuccess={loadMyInvoices} />;
    }
  };

  return (
    <Layout title="Muhasebe Dashboard">
      <div className="space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Hoş Geldiniz, {user?.full_name || 'Muhasebe'}!</h1>
          <p className="text-green-100">Fatura yönetimi ve finansal işlemler için muhasebe panelini kullanın</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Fatura</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ödenen</p>
                <p className="text-2xl font-bold text-gray-900">{stats.paidInvoices}</p>
              </div>
              <CreditCard className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bekleyen</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingInvoices}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Tutar</p>
                <p className="text-2xl font-bold text-gray-900">₺{stats.totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Module Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule === module.id;
            const colors = colorClasses[module.color];
            
            return (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isActive
                    ? `${colors.border} ${colors.bg} shadow-md`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                }`}
              >
                <Icon className={`w-8 h-8 mx-auto mb-2 ${
                  isActive ? colors.text : 'text-gray-600'
                }`} />
                <div className={`text-sm font-medium text-center ${
                  isActive ? colors.textDark : 'text-gray-900'
                }`}>
                  {module.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Module Content */}
        <div className="animate-fadeIn">
          {renderModule()}
        </div>
      </div>
    </Layout>
  );
};

export default AccountingDashboard;
