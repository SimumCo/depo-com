import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { Check, X, Truck, FileText } from 'lucide-react';

const DeliveryApproval = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sfCustomerAPI.getPendingDeliveries();
      setDeliveries(res.data?.data || []);
    } catch {
      toast.error('Teslimatlar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const handleAccept = async (id) => {
    setProcessingId(id);
    try {
      await sfCustomerAPI.acceptDelivery(id);
      toast.success('Teslimat onaylandi. Tuketim hesaplamalari guncellendi.');
      await fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Onay hatasi');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await sfCustomerAPI.rejectDelivery(id, { reason: rejectReason });
      toast.success('Teslimat reddedildi.');
      setRejectId(null);
      setRejectReason('');
      await fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Red hatasi');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  }

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-12" data-testid="deliveries-empty">
        <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Bekleyen teslimat yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="delivery-approval">
      {deliveries.map((dlv) => (
        <div key={dlv.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid={`delivery-card-${dlv.id?.slice(0,8)}`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800">{dlv.invoice_no || 'Fatura No Yok'}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dlv.delivery_type === 'route' ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'}`}>
                {dlv.delivery_type === 'route' ? 'Rota' : 'Rota Disi'}
              </span>
            </div>

            <div className="space-y-1.5 mb-4">
              {(dlv.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-slate-600">{item.product_name || item.product_code || item.product_id?.slice(0, 8)}</span>
                  <span className="font-medium text-slate-800">{item.qty} adet</span>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-400 mb-3">
              Teslim: {dlv.delivered_at ? new Date(dlv.delivered_at).toLocaleDateString('tr-TR') : '-'}
            </div>

            {rejectId === dlv.id ? (
              <div className="space-y-2" data-testid="reject-form">
                <input
                  type="text"
                  placeholder="Red sebebi (opsiyonel)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-red-400"
                  data-testid="reject-reason-input"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReject(dlv.id)}
                    disabled={processingId === dlv.id}
                    className="flex-1 bg-red-600 text-white py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    data-testid="confirm-reject-btn"
                  >
                    Reddi Onayla
                  </button>
                  <button
                    onClick={() => { setRejectId(null); setRejectReason(''); }}
                    className="px-4 py-2 border border-slate-300 rounded-md text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Vazgec
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(dlv.id)}
                  disabled={processingId === dlv.id}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  data-testid="accept-delivery-btn"
                >
                  <Check className="w-4 h-4" /> Onayla
                </button>
                <button
                  onClick={() => setRejectId(dlv.id)}
                  disabled={processingId === dlv.id}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-600 py-2.5 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                  data-testid="reject-delivery-btn"
                >
                  <X className="w-4 h-4" /> Reddet
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DeliveryApproval;
