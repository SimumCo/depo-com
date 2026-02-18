import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import MiniTimeline from './MiniTimeline';
import { AlertTriangle, Package, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const DraftView = ({ onStartEdit }) => {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [draftRes, profileRes] = await Promise.all([
        sfCustomerAPI.getDraft(),
        sfCustomerAPI.getProfile(),
      ]);
      setDraft(draftRes.data?.data || null);
      setProfile(profileRes.data?.data || null);
    } catch {
      toast.error('Taslak yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  }

  const items = draft?.items || [];
  const routeDays = profile?.route_plan?.days || [];
  const routeLabel = routeDays.join(', ') || '-';
  const hasItems = items.length > 0;

  // compute next route date for timeline
  const dayMap = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };
  const today = new Date();
  let nextRoute = null;
  if (routeDays.length) {
    let minDiff = 8;
    for (const d of routeDays) {
      const target = dayMap[d] ?? 0;
      let diff = (target - today.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      if (diff < minDiff) minDiff = diff;
    }
    nextRoute = new Date(today.getTime() + minDiff * 86400000);
  }

  return (
    <div data-testid="draft-view">
      {/* header info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-slate-600">
          Bu liste, gecmis teslimatlariniza gore hazirlanmis bir siparis onerisidir.
        </p>
        <p className="text-xs text-slate-500 mt-1">Rota gunleri: <span className="font-medium text-slate-700">{routeLabel}</span></p>
      </div>

      {!hasItems ? (
        <div className="text-center py-12" data-testid="draft-empty">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Henuz siparis taslagi yok</p>
          <p className="text-sm text-slate-400 mt-1">Bir teslimat onayladiktan sonra otomatik olusturulur.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.product_id || idx} className="bg-white border border-slate-200 rounded-lg p-4" data-testid={`draft-item-${idx}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{item.product_name || item.product_code || item.product_id?.slice(0, 8)}</span>
                      {item.flags?.skt_risk && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" title="SKT riski" />
                      )}
                    </div>
                    <MiniTimeline
                      lastDeliveryDate={null}
                      estimatedFinishDate={item.estimated_finish_at}
                      nextRouteDate={nextRoute?.toISOString()}
                    />
                  </div>
                  <div className="text-right ml-4">
                    <span className="text-xs text-slate-500">Onerilen</span>
                    <div className="text-lg font-bold text-sky-700">{item.suggested_qty}</div>
                    <span className="text-[10px] text-slate-400">{item.avg_effective_used === 'spike' ? 'spike bazli' : 'standart'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center">
            Son teslimat ve tuketim hiziniza gore hesaplandi.
          </p>

          <button
            onClick={onStartEdit}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            data-testid="start-edit-btn"
          >
            Siparis Duzenle <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

export default DraftView;
