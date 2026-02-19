// Plasiyer - Siparişler Sayfası
import React from 'react';
import { ShoppingBag, Check, Edit3 } from 'lucide-react';
import { PageHeader, EmptyState, Badge } from '../ui/DesignSystem';

const OrdersPage = ({ orders, onApprove, onRequestEdit }) => {
  return (
    <div className="space-y-6" data-testid="orders-page">
      <PageHeader 
        title="Siparisler"
        subtitle="Ana Sayfa / Siparisler"
      />

      {orders.length === 0 ? (
        <EmptyState 
          icon={ShoppingBag} 
          title="Siparis bulunamadi"
        />
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <OrderCard 
              key={order.id}
              order={order}
              onApprove={onApprove}
              onRequestEdit={onRequestEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, onApprove, onRequestEdit }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge variant="success">Onaylandi</Badge>;
      case 'needs_edit': return <Badge variant="warning">Duzenleme</Badge>;
      case 'submitted': return <Badge variant="info">Bekliyor</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div 
      className="bg-white border border-slate-200 rounded-2xl p-4" 
      data-testid={`order-${order.id?.slice(0,8)}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-slate-900">{order.customer_name || 'Musteri'}</h3>
          <p className="text-xs text-slate-500">{order.id?.slice(0, 8)}</p>
        </div>
        {getStatusBadge(order.status)}
      </div>
      
      {/* Items */}
      <p className="text-sm text-slate-600 mb-3">
        {(order.items || []).map(it => `${it.product_name || '?'}: ${it.qty}`).join(', ')}
      </p>
      
      {/* Actions */}
      {order.status === 'submitted' && (
        <div className="flex gap-2">
          <button 
            onClick={() => onApprove(order.id)} 
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" /> Onayla
          </button>
          <button 
            onClick={() => onRequestEdit(order.id)} 
            className="flex-1 flex items-center justify-center gap-1.5 border border-slate-300 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Edit3 className="w-4 h-4" /> Duzenleme Iste
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
export { OrderCard };
