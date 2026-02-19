import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { FileText, Check, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const DeliveryHistory = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sfCustomerAPI.getDeliveryHistory();
      setDeliveries(res.data?.data || []);
    } catch {
      toast.error('Gecmis faturalar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  }

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-12" data-testid="history-empty">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Gecmis fatura bulunamadi</p>
      </div>
    );
  }

  const statusConfig = {
    accepted: { label: 'Onaylandi', icon: Check, cls: 'text-emerald-700 bg-emerald-50' },
    rejected: { label: 'Reddedildi', icon: X, cls: 'text-red-700 bg-red-50' },
    pending: { label: 'Bekliyor', icon: Clock, cls: 'text-amber-700 bg-amber-50' },
  };

  return (
    <div data-testid="delivery-history">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-slate-600">Toplam <span className="font-bold text-slate-800">{deliveries.length}</span> fatura kaydi</p>
      </div>

      <div className="space-y-2">
        {deliveries.map((dlv) => {
          const st = statusConfig[dlv.acceptance_status] || statusConfig.pending;
          const StIcon = st.icon;
          const isExpanded = expandedId === dlv.id;
          const deliveredDate = dlv.delivered_at ? new Date(dlv.delivered_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
          const totalQty = (dlv.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);

          return (
            <div key={dlv.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid={`history-row-${dlv.id?.slice(0,8)}`}>
              {/* Header - clickable */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : dlv.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${st.cls}`}>
                    <StIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{dlv.invoice_no || 'Fatura'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${dlv.delivery_type === 'route' ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'}`}>
                        {dlv.delivery_type === 'route' ? 'Rota' : 'Rota Disi'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{deliveredDate} - {(dlv.items || []).length} urun, {totalQty} adet</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 pb-4">
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="text-xs text-slate-500">
                        <th className="text-left pb-2 font-medium">Urun</th>
                        <th className="text-right pb-2 font-medium">Adet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dlv.items || []).map((item, idx) => (
                        <tr key={idx} className="border-t border-slate-50">
                          <td className="py-1.5 text-slate-700">{item.product_name || item.product_code || item.product_id?.slice(0, 8)}</td>
                          <td className="py-1.5 text-right font-medium text-slate-800">{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dlv.acceptance_status === 'accepted' && dlv.accepted_at && (
                    <p className="text-xs text-emerald-600 mt-2">Onay: {new Date(dlv.accepted_at).toLocaleDateString('tr-TR')}</p>
                  )}
                  {dlv.rejection_reason && (
                    <p className="text-xs text-red-600 mt-2">Red sebebi: {dlv.rejection_reason}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeliveryHistory;
