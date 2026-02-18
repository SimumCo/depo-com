import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Package, BarChart3, Calendar } from 'lucide-react';
import { sfCustomerAPI } from '../../services/seftaliApi';

const ConsumptionAnalytics = () => {
  const [summary, setSummary] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const sumRes = await sfCustomerAPI.getConsumptionSummary();
      const items = sumRes.data?.data || [];
      // Sort by avg_daily descending (highest consumption first)
      items.sort((a, b) => b.avg_daily - a.avg_daily);
      setSummary(items);

      // Load all daily data for monthly aggregation
      const params = {};
      if (period === '3m') {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        params.date_from = d.toISOString().slice(0, 10);
      } else if (period === '6m') {
        const d = new Date(); d.setMonth(d.getMonth() - 6);
        params.date_from = d.toISOString().slice(0, 10);
      } else if (period === '1y') {
        const d = new Date(); d.setFullYear(d.getFullYear() - 1);
        params.date_from = d.toISOString().slice(0, 10);
      }

      const dailyRes = await sfCustomerAPI.getDailyConsumption(params);
      const raw = dailyRes.data?.data || [];

      // Aggregate by month for the line chart (sum all products per month)
      const byMonth = {};
      raw.forEach(r => {
        const month = r.date.slice(0, 7); // YYYY-MM
        if (!byMonth[month]) byMonth[month] = 0;
        byMonth[month] += r.consumption;
      });
      const monthArr = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([m, total]) => ({
          month: m,
          label: formatMonth(m),
          total: Math.round(total),
        }));
      setMonthlyData(monthArr);
    } catch (err) {
      console.error('Consumption data load error', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load daily detail when product selected
  useEffect(() => {
    if (!selectedProduct) { setDailyData([]); return; }
    const load = async () => {
      try {
        const params = { product_id: selectedProduct.product_id };
        if (period === '3m') {
          const d = new Date(); d.setMonth(d.getMonth() - 3);
          params.date_from = d.toISOString().slice(0, 10);
        } else if (period === '6m') {
          const d = new Date(); d.setMonth(d.getMonth() - 6);
          params.date_from = d.toISOString().slice(0, 10);
        } else if (period === '1y') {
          const d = new Date(); d.setFullYear(d.getFullYear() - 1);
          params.date_from = d.toISOString().slice(0, 10);
        }
        const res = await sfCustomerAPI.getDailyConsumption(params);
        const raw = res.data?.data || [];
        // Aggregate by week for readability
        const byWeek = {};
        raw.forEach(r => {
          const d = new Date(r.date);
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay() + 1);
          const key = weekStart.toISOString().slice(0, 10);
          if (!byWeek[key]) byWeek[key] = { total: 0, count: 0 };
          byWeek[key].total += r.consumption;
          byWeek[key].count++;
        });
        const weekArr = Object.entries(byWeek)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([w, v]) => ({
            week: w,
            label: w.slice(5),
            avg: Math.round((v.total / v.count) * 100) / 100,
            total: Math.round(v.total * 100) / 100,
          }));
        setDailyData(weekArr);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [selectedProduct, period]);

  const formatMonth = (m) => {
    const months = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara'];
    const [y, mo] = m.split('-');
    return `${months[parseInt(mo) - 1]} ${y.slice(2)}`;
  };

  const totalConsumption = summary.reduce((s, i) => s + i.total_consumption, 0);
  const totalDays = summary.length > 0 ? summary[0].count : 0;

  const periodOptions = [
    { value: 'all', label: 'Tumu' },
    { value: '1y', label: 'Son 1 Yil' },
    { value: '6m', label: 'Son 6 Ay' },
    { value: '3m', label: 'Son 3 Ay' },
  ];

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  }

  return (
    <div className="space-y-4" data-testid="consumption-analytics">
      {/* Period selector */}
      <div className="flex gap-2 flex-wrap">
        {periodOptions.map(o => (
          <button key={o.value} onClick={() => setPeriod(o.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === o.value ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            data-testid={`period-${o.value}`}
          >{o.label}</button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
          <p className="text-xs text-sky-600 font-medium">Toplam Tuketim</p>
          <p className="text-xl font-bold text-sky-900" data-testid="total-consumption">{Math.round(totalConsumption).toLocaleString('tr-TR')} adet</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-xs text-emerald-600 font-medium">Izlenen Gun</p>
          <p className="text-xl font-bold text-emerald-900" data-testid="total-days">{totalDays} gun</p>
        </div>
      </div>

      {/* Monthly trend chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            Aylik Toplam Tuketim
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip formatter={(v) => [`${v} adet`, 'Toplam']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={2}
                dot={{ fill: '#0284c7', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Product ranking - sorted highest to lowest */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          Urun Bazinda Gunluk Ortalama (En coktan en aza)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(200, summary.length * 40)}>
          <BarChart data={summary} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis type="category" dataKey="product_name" tick={{ fontSize: 10 }} stroke="#94a3b8" width={140} />
            <Tooltip formatter={(v) => [`${v} adet/gun`, 'Ort. Tuketim']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="avg_daily" fill="#0284c7" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Product list with details */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">Urun Detaylari (en coktan en aza)</p>
        {summary.map((item, idx) => {
          const isSelected = selectedProduct?.product_id === item.product_id;
          const maxAvg = summary[0]?.avg_daily || 1;
          const barWidth = Math.max(5, (item.avg_daily / maxAvg) * 100);
          return (
            <div key={item.product_id}>
              <button
                onClick={() => setSelectedProduct(isSelected ? null : item)}
                className={`w-full text-left bg-white border rounded-lg p-3 transition-all ${isSelected ? 'border-sky-400 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                data-testid={`product-row-${idx}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono w-5">{idx + 1}.</span>
                    {item.product_name}
                  </span>
                  <span className="text-sm font-bold text-sky-700">{item.avg_daily}/gun</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className="bg-sky-500 h-1.5 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {Math.round(item.total_consumption)} toplam
                  </span>
                </div>
              </button>

              {/* Weekly detail chart when selected */}
              {isSelected && dailyData.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1 ml-4">
                  <p className="text-xs font-medium text-slate-600 mb-2">
                    {item.product_name} — Haftalik Ortalama
                  </p>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 8 }} stroke="#94a3b8" interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip formatter={(v) => [`${v} adet/gun`, 'Haftalik Ort.']}
                        contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="avg" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConsumptionAnalytics;
