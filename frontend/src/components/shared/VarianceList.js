import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { TrendingUp, Check, XCircle } from 'lucide-react';

const REASON_OPTIONS = [
  { code: 'YILBASI', label: 'Yilbasi' },
  { code: 'KAMPANYA', label: 'Kampanya' },
  { code: 'DONEM_SONU', label: 'Ay Sonu / Donem Sonu' },
  { code: 'OZEL_ETKINLIK', label: 'Ozel Etkinlik' },
  { code: 'MEVSIMSEL', label: 'Mevsimsel Artis' },
  { code: 'BILINMIYOR', label: 'Bilinmiyor' },
];

const VarianceList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [reasonCode, setReasonCode] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sfCustomerAPI.getPendingVariance();
      setEvents(res.data?.data || []);
    } catch {
      toast.error('Sapma verileri yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map(e => e.id)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0 || !reasonCode) {
      toast.error('Olay ve sebep secin');
      return;
    }
    setProcessing(true);
    try {
      await sfCustomerAPI.applyReasonBulk({
        event_ids: Array.from(selectedIds),
        reason_code: reasonCode,
        reason_note: reasonNote,
      });
      toast.success('Sebep kaydedildi');
      setSelectedIds(new Set());
      setReasonCode('');
      setReasonNote('');
      await fetchEvents();
    } catch {
      toast.error('Sebep kaydedilemedi');
    } finally {
      setProcessing(false);
    }
  };

  const handleDismiss = async () => {
    if (selectedIds.size === 0) {
      toast.error('Olay secin');
      return;
    }
    setProcessing(true);
    try {
      await sfCustomerAPI.dismissBulk({
        event_ids: Array.from(selectedIds),
        reason_code: 'BILINMIYOR',
      });
      toast.success('Sapma(lar) yok sayildi');
      setSelectedIds(new Set());
      await fetchEvents();
    } catch {
      toast.error('Islem basarisiz');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12" data-testid="variance-empty">
        <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Acik tuketim sapmasi yok</p>
      </div>
    );
  }

  return (
    <div data-testid="variance-list">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-slate-600">Asagidaki urunlerde normalden yuksek tuketim tespit edildi. Sebep belirterek kaydedin veya yok sayin.</p>
      </div>

      {/* Select all */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={selectAll} className="text-xs text-sky-600 hover:text-sky-700 font-medium" data-testid="select-all-btn">
          {selectedIds.size === events.length ? 'Secimi Kaldir' : 'Tumunu Sec'}
        </button>
        <span className="text-xs text-slate-400">{selectedIds.size} secili</span>
      </div>

      <div className="space-y-2 mb-4">
        {events.map((ev) => (
          <div
            key={ev.id}
            onClick={() => toggleSelect(ev.id)}
            className={`bg-white border rounded-lg p-3 cursor-pointer transition-colors ${selectedIds.has(ev.id) ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}
            data-testid={`variance-event-${ev.id?.slice(0,8)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedIds.has(ev.id) ? 'bg-sky-600 border-sky-600' : 'border-slate-300'}`}>
                  {selectedIds.has(ev.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-medium text-slate-800">{ev.product_name || ev.product_id?.slice(0, 8)}</span>
              </div>
              <span className="text-sm font-bold text-red-600">+{Math.round((ev.change_ratio || 0) * 100)}%</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-6">
              {ev.direction === 'increase' ? 'Artis' : 'Azalis'} - {ev.severity}
            </p>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3" data-testid="bulk-actions">
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-sky-500"
            data-testid="reason-select"
          >
            <option value="">Sebep secin...</option>
            {REASON_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Ek not (opsiyonel)"
            value={reasonNote}
            onChange={(e) => setReasonNote(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-sky-500"
            data-testid="reason-note-input"
          />
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              disabled={processing || !reasonCode}
              className="flex-1 flex items-center justify-center gap-1.5 bg-sky-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
              data-testid="apply-reason-btn"
            >
              <Check className="w-4 h-4" /> Sebep Kaydet
            </button>
            <button
              onClick={handleDismiss}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-1.5 border border-slate-300 text-slate-600 py-2.5 rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
              data-testid="dismiss-btn"
            >
              <XCircle className="w-4 h-4" /> Yok Say
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VarianceList;
