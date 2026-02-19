// Plasiyer - Müşteri Kartı Bileşeni
import React from 'react';
import { Phone, MessageSquare, AlertTriangle, ChevronRight } from 'lucide-react';

const CustomerCard = ({ customer, index, onCall, onMessage, onAlert }) => {
  const isUrgent = index % 3 === 0;
  
  return (
    <div 
      className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all" 
      data-testid={`customer-card-${index}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-900">{customer.name}</h3>
          <p className="text-xs text-slate-500">
            {customer.code || `MUS-${customer.id?.slice(0, 5)}`} · {customer.channel || 'Perakende'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-900">3.420 TL</p>
          <p className="text-xs text-slate-500">Ort. Siparis</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div>
          <p className="text-slate-500">Son Siparis: <span className="font-medium text-slate-700">3</span></p>
          <p className="text-slate-400">Now: 9 Gun / Ort: 7 Gun</p>
        </div>
        <div className="text-right">
          <p className="text-emerald-600 font-medium">2.600 TL <span className="text-slate-500">4 Koli</span></p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <ActionButton icon={Phone} onClick={onCall} title="Ara" />
          <ActionButton icon={MessageSquare} onClick={onMessage} title="Mesaj" />
          <span className="text-xs text-slate-400">12</span>
          <span className="text-xs text-slate-400 flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" /> 0
          </span>
        </div>
        {isUrgent ? (
          <button 
            onClick={onAlert} 
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition-colors"
          >
            Uyar <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors">
            Gorusme Baslat <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

// Small action button for quick actions
const ActionButton = ({ icon: Icon, onClick, title }) => (
  <button 
    onClick={onClick} 
    className="p-2 hover:bg-slate-100 rounded-lg transition-colors" 
    title={title}
  >
    <Icon className="w-4 h-4 text-slate-500" />
  </button>
);

export default CustomerCard;
export { ActionButton };
