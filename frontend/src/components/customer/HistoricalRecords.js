import React, { useState, useEffect } from 'react';
import { Package, FileText, Eye, Calendar, TrendingUp } from 'lucide-react';
import { ordersAPI, invoiceAPI } from '../../services/api';

const HistoricalRecords = () => {
  const [activeTab, setActiveTab] = useState('orders'); // orders, invoices
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'orders') {
        const response = await ordersAPI.getAll();
        setOrders(response.data);
      } else {
        const response = await invoiceAPI.getAll();
        setInvoices(response.data);
      }
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Onaylandı', color: 'bg-blue-100 text-blue-800' },
      preparing: { label: 'Hazırlanıyor', color: 'bg-purple-100 text-purple-800' },
      ready: { label: 'Hazır', color: 'bg-indigo-100 text-indigo-800' },
      dispatched: { label: 'Yola Çıktı', color: 'bg-orange-100 text-orange-800' },
      delivered: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'İptal', color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Geçmiş Kayıtlar</h2>
        
        {/* Tabs */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Siparişlerim</span>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'invoices'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Faturalarım</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'orders' ? (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz siparişiniz yok</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(order.created_at)}</span>
                        </span>
                        <span>{order.products?.length || 0} ürün</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">₺{order.total_amount?.toFixed(2) || '0.00'}</div>
                      <button
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                      >
                        {selectedOrder?.id === order.id ? 'Gizle' : 'Detayları Gör'}
                      </button>
                    </div>
                  </div>

                  {selectedOrder?.id === order.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Sipariş Detayları</h4>
                      <div className="space-y-2">
                        {order.products?.map((product, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{product.product_name || product.name}</span>
                            <div className="flex items-center space-x-4">
                              <span className="text-gray-500">x{product.quantity}</span>
                              <span className="font-medium text-gray-900">
                                ₺{(product.price * product.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Not:</span> {order.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz faturanız yok</p>
              </div>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.is_paid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.is_paid ? 'Ödendi' : 'Beklemede'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(invoice.created_at)}</span>
                        </span>
                        {invoice.period && <span>Dönem: {invoice.period}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">₺{invoice.total_amount?.toFixed(2) || '0.00'}</div>
                      <button
                        onClick={() => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
                        className="text-sm text-blue-600 hover:text-blue-700 mt-1 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>{selectedInvoice?.id === invoice.id ? 'Gizle' : 'Detayları Gör'}</span>
                      </button>
                    </div>
                  </div>

                  {selectedInvoice?.id === invoice.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Fatura Detayları</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Fatura Tarihi:</span>
                          <p className="font-medium text-gray-900">{formatDate(invoice.invoice_date)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Vade Tarihi:</span>
                          <p className="font-medium text-gray-900">{formatDate(invoice.due_date)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Ara Toplam:</span>
                          <p className="font-medium text-gray-900">₺{invoice.subtotal?.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">KDV:</span>
                          <p className="font-medium text-gray-900">₺{invoice.tax_amount?.toFixed(2)}</p>
                        </div>
                      </div>
                      {invoice.items && invoice.items.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-900 mb-2">Kalemler</h5>
                          <div className="space-y-2">
                            {invoice.items.map((item, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{item.description || item.product_name}</span>
                                <div className="flex items-center space-x-4">
                                  <span className="text-gray-500">x{item.quantity}</span>
                                  <span className="font-medium text-gray-900">
                                    ₺{item.total_price?.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricalRecords;
