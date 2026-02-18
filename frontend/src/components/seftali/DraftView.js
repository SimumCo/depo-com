import React, { useState, useEffect, useCallback } from 'react';
import { sfCustomerAPI } from '../../services/seftaliApi';
import MiniTimeline from './MiniTimeline';
import { AlertTriangle, Package, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';

const DAY_TR = { MON: 'Pazartesi', TUE: 'Sali', WED: 'Carsamba', THU: 'Persembe', FRI: 'Cuma', SAT: 'Cumartesi', SUN: 'Pazar' };
const DAY_NUM = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };

function getNextRouteInfo(routeDays) {
  if (!routeDays?.length) return { label: null, routeDate: null, deadline: null, diff: null };
  const now = new Date();
  let minDiff = 8;
  for (const d of routeDays) {
    const target = DAY_NUM[d] ?? 0;
    let diff = (target - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    if (diff < minDiff) minDiff = diff;
  }
  const routeDate = new Date(now.getTime() + minDiff * 86400000);
  routeDate.setHours(0, 0, 0, 0);

  // Siparis son teslim: rota gunundan 1 gun once, saat 16:00
  const deadline = new Date(routeDate.getTime() - 86400000);
  deadline.setHours(16, 0, 0, 0);

  // Eger deadline gecmisse ama rota gunu henuz gelmemisse, son saat 16:30 (tolerans)
  const deadlineLate = new Date(deadline.getTime() + 30 * 60000); // 16:30

  return {
    label: routeDays.map(d => DAY_TR[d] || d).join(', '),
    routeDate,
    deadline: now > deadlineLate ? null : deadline,
    deadlineLate,
    diff: minDiff,
  };
}

function useCountdown(deadline) {
  const [remaining, setRemaining] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) {
        // Check if within 30 min tolerance (16:00-16:30)
        const toleranceMs = 30 * 60000;
        if (diff > -toleranceMs) {
          setRemaining('Son 30 dakika!');
          setIsUrgent(true);
          setIsExpired(false);
        } else {
          setRemaining('Sure doldu');
          setIsExpired(true);
          setIsUrgent(false);
        }
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setIsUrgent(diff < 4 * 3600000); // 4 saatten az kaldiysa acil
      setIsExpired(false);
      if (d > 0) setRemaining(`${d} gun ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      else setRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
      if (d > 0) setRemaining(`${d} gun ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      else setRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [targetDate]);
  return remaining;
}

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

  const routeDays = profile?.route_plan?.days || [];
  const { label: routeLabel, date: nextRoute, diff: daysDiff } = getNextRouteInfo(routeDays);
  const countdown = useCountdown(nextRoute);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  }

  const items = draft?.items || [];
  const hasItems = items.length > 0;

  return (
    <div data-testid="draft-view">
      {/* Header info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-2">
        <p className="text-sm text-slate-600">
          Gecmis teslimatlariniza gore hazirlanmis siparis onerisi.
        </p>
        <p className="text-xs text-slate-500">
          Rota gunleri: <span className="font-semibold text-slate-700">{routeLabel || '—'}</span>
        </p>
        {/* Countdown */}
        {countdown && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mt-1" data-testid="order-countdown">
            <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-orange-700">
                Sonraki siparis icin: <span className="font-bold text-orange-900">{countdown}</span>
              </p>
              {daysDiff && daysDiff <= 2 && (
                <p className="text-[10px] text-orange-500 mt-0.5">Siparisinizi simdi hazirlayin!</p>
              )}
            </div>
          </div>
        )}
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
              <div key={item.product_id || idx} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`draft-item-${idx}`}>
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

          <button onClick={onStartEdit}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white py-3 px-4 rounded-xl font-medium transition-colors"
            data-testid="start-edit-btn">
            Siparis Duzenle <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

export default DraftView;
