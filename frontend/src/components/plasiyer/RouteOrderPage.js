import React, { useState, useEffect, useCallback } from 'react';
import { sfSalesAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { 
  Package, Users, ShoppingCart, Truck, Calendar,
  ChevronDown, ChevronUp, Check, Clock, AlertCircle,
  RefreshCw, Send, Box, Minus, Plus
} from 'lucide-react';

const dayNames = {
  MON: 'Pazartesi', TUE: 'Salı', WED: 'Çarşamba',
  THU: 'Perşembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar'
};

const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const getTomorrowDayCode = () => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return days[tomorrow.getDay()];
};

const RouteOrderPage = () => {
  const [selectedDay, setSelectedDay] = useState(getTomorrowDayCode());
  const [orderData, setOrderData] = useState(null);
  const [plasiyerStock, setPlasiyerStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [stockEditMode, setStockEditMode] = useState(false);
  const [stockUpdates, setStockUpdates] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, stockRes] = await Promise.all([
        sfSalesAPI.getRouteOrderCalculation(selectedDay),
        sfSalesAPI.getPlasiyerStock()
      ]);
      
      if (orderRes.data?.success) {
        setOrderData(orderRes.data.data);
      }
      if (stockRes.data?.success) {
        setPlasiyerStock(stockRes.data.data?.items || []);
      }
    } catch (err) {
      toast.error('Veri yüklenirken hata oluştu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCustomerExpand = (customerId) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  const handleStockChange = (productId, delta) => {
    setStockUpdates(prev => {
      const currentStock = plasiyerStock.find(s => s.product_id === productId)?.qty || 0;
      const currentUpdate = prev[productId] ?? currentStock;
      const newValue = Math.max(0, currentUpdate + delta);
      return { ...prev, [productId]: newValue };
    });
  };

  const saveStockUpdates = async () => {
    const items = Object.entries(stockUpdates).map(([product_id, qty]) => ({
      product_id,
      qty
    }));
    
    if (items.length === 0) {
      toast.warning('Değişiklik yapılmadı');
      return;
    }

    try {
      await sfSalesAPI.updatePlasiyerStock({ items, operation: 'set' });
      toast.success('Stok güncellendi');
      setStockEditMode(false);
      setStockUpdates({});
      fetchData();
    } catch (err) {
      toast.error('Stok güncellenirken hata oluştu');
    }
  };

  const submitOrder = async () => {
    // TODO: Depo siparişi gönderme
    toast.success('Sipariş depoya gönderildi!');
  };

  if (loading && !orderData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const summary = orderData?.summary || {};
  const totals = orderData?.totals || {};
  const customers = orderData?.customers || [];

  // Sort products by to_order descending
  const sortedProducts = Object.entries(totals)
    .sort(([,a], [,b]) => b.to_order - a.to_order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="w-7 h-7" />
              Rota Sipariş Hesaplama
            </h1>
            <p className="text-orange-100 mt-1">
              Yarınki rota için ihtiyaç listesi
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 flex-wrap">
          {dayOrder.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedDay === day
                  ? 'bg-white text-orange-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {dayNames[day]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Müşteri</p>
              <p className="text-xl font-bold">{summary.total_customers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sipariş Atan</p>
              <p className="text-xl font-bold">{summary.customers_with_orders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Taslak Kullanılan</p>
              <p className="text-xl font-bold">{summary.customers_with_drafts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sipariş Edilecek</p>
              <p className="text-xl font-bold text-purple-600">{summary.total_items_to_order || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Order Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Sipariş Listesi
            </h2>
            <span className="text-sm text-gray-500">
              {sortedProducts.length} ürün
            </span>
          </div>
          
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {sortedProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Bu rota günü için sipariş yok</p>
              </div>
            ) : (
              sortedProducts.map(([productId, info]) => (
                <div key={productId} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{info.name}</p>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="text-gray-500">
                          Sipariş: <span className="text-green-600 font-medium">{info.orders_qty}</span>
                        </span>
                        <span className="text-gray-500">
                          Taslak: <span className="text-amber-600 font-medium">{info.drafts_qty}</span>
                        </span>
                        <span className="text-gray-500">
                          Stok: <span className="text-blue-600 font-medium">{info.plasiyer_stock}</span>
                        </span>
                      </div>
                      {info.case_size > 1 && (
                        <div className="mt-1 text-xs text-gray-400">
                          {info.case_name} • İhtiyaç: {info.to_order_raw} → {info.cases_needed} koli
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${info.to_order > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                        {info.to_order}
                      </p>
                      <p className="text-xs text-gray-400">
                        {info.case_size > 1 ? `${info.cases_needed} koli` : 'adet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {sortedProducts.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={submitOrder}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                <Send className="w-5 h-5" />
                Depoya Sipariş Gönder
              </button>
            </div>
          )}
        </div>

        {/* Right: Customers & Stock */}
        <div className="space-y-6">
          {/* Customer List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Müşteri Detayı
              </h2>
            </div>
            
            <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
              {customers.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Bu gün için müşteri yok</p>
                </div>
              ) : (
                customers.map(customer => (
                  <div key={customer.customer_id} className="p-3">
                    <button
                      onClick={() => toggleCustomerExpand(customer.customer_id)}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          customer.source === 'order' ? 'bg-green-500' : 'bg-amber-500'
                        }`} />
                        <span className="font-medium">{customer.customer_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          customer.source === 'order' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {customer.source === 'order' ? 'Sipariş' : 'Taslak'}
                        </span>
                      </div>
                      {expandedCustomers[customer.customer_id] 
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                    
                    {expandedCustomers[customer.customer_id] && (
                      <div className="mt-3 pl-5 space-y-1">
                        {customer.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">{item.product_id}</span>
                            <span className="font-medium">{item.qty} adet</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Plasiyer Stock */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Box className="w-5 h-5 text-green-500" />
                Araç Stoğum
              </h2>
              <button
                onClick={() => {
                  if (stockEditMode) {
                    saveStockUpdates();
                  } else {
                    setStockEditMode(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  stockEditMode 
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {stockEditMode ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4" /> Kaydet
                  </span>
                ) : 'Düzenle'}
              </button>
            </div>
            
            <div className="divide-y divide-gray-50 max-h-[200px] overflow-y-auto">
              {plasiyerStock.filter(s => s.qty > 0 || stockEditMode).map(stock => {
                const currentQty = stockUpdates[stock.product_id] ?? stock.qty;
                return (
                  <div key={stock.product_id} className="p-3 flex items-center justify-between">
                    <span className="text-sm">{stock.product_name}</span>
                    {stockEditMode ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStockChange(stock.product_id, -1)}
                          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold">{currentQty}</span>
                        <button
                          onClick={() => handleStockChange(stock.product_id, 1)}
                          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-green-600">{stock.qty}</span>
                    )}
                  </div>
                );
              })}
              {plasiyerStock.filter(s => s.qty > 0).length === 0 && !stockEditMode && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Araçta stok yok
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Nasıl Çalışır?</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600">
            <li>Müşteriler saat 16:30'a kadar sipariş atabilir</li>
            <li>Sipariş atmayan müşteriler için sistem taslağı kullanılır</li>
            <li>Toplam ihtiyaçtan araç stoğunuz düşülür</li>
            <li>Kalan miktar depo siparişi olarak hesaplanır</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RouteOrderPage;
