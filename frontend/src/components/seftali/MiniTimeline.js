import React from 'react';

const MiniTimeline = ({ lastDeliveryDate, estimatedFinishDate, nextRouteDate }) => {
  const parseDate = (d) => (d ? new Date(d) : null);
  const ld = parseDate(lastDeliveryDate);
  const ef = parseDate(estimatedFinishDate);
  const nr = parseDate(nextRouteDate);

  if (!ld) return null;

  const now = new Date();
  const start = ld.getTime();
  const end = Math.max(
    nr ? nr.getTime() : now.getTime() + 14 * 86400000,
    ef ? ef.getTime() : now.getTime(),
    now.getTime() + 86400000
  );
  const range = end - start || 1;

  const pct = (dt) => Math.min(Math.max(((dt.getTime() - start) / range) * 100, 0), 100);

  const nowPct = pct(now);
  const efPct = ef ? pct(ef) : null;
  const nrPct = nr ? pct(nr) : null;

  const isUrgent = ef && nr && ef < nr;

  return (
    <div className="mt-1.5 mb-0.5" data-testid="mini-timeline">
      <div className="relative h-2 bg-slate-200 rounded-full overflow-visible">
        {/* filled portion up to now */}
        <div className="absolute left-0 top-0 h-full bg-slate-400 rounded-full" style={{ width: `${nowPct}%` }} />
        {/* estimated finish marker */}
        {efPct !== null && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white ${isUrgent ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ left: `${efPct}%` }}
            title={`Tahmini bitis: ${ef.toLocaleDateString('tr-TR')}`}
          />
        )}
        {/* next route marker */}
        {nrPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white bg-sky-500"
            style={{ left: `${nrPct}%` }}
            title={`Sonraki rota: ${nr.toLocaleDateString('tr-TR')}`}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 leading-none">
        <span>Son teslimat</span>
        {ef && <span className={isUrgent ? 'text-red-600 font-medium' : 'text-amber-600'}>Bitis</span>}
        {nr && <span className="text-sky-600">Rota</span>}
      </div>
    </div>
  );
};

export default MiniTimeline;
