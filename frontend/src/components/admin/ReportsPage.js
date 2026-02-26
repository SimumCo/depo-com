// Admin Raporlama Sayfası
// Draft Engine ve ŞEFTALİ verilerinden raporlar

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Package, Calendar, Download,
  ArrowUpRight, ArrowDownRight, Activity, PieChart, Filter
} from 'lucide-react';
import { sfAdminAPI } from '../../services/seftaliApi';
import { draftEngineAPI } from '../../services/draftEngineApi';
import { toast } from 'sonner';
import { PageHeader, StatCard, Loading, gradients } from '../ui/DesignSystem';

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d
  const [activeReport, setActiveReport] = useState('overview');

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Paralel veri çekimi
      const [healthRes, deliveriesRes, productsRes] = await Promise.all([
        sfAdminAPI.getHealthSummary(),
        sfAdminAPI.getDeliveries({}),
        draftEngineAPI.getProducts().catch(() => ({ data: { data: [] } }))
      ]);

      const health = healthRes.data?.data || {};
      const deliveries = deliveriesRes.data?.data || [];
      const products = productsRes.data?.data || [];

      // Teslimat analizleri
      const now = new Date();
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      const recentDeliveries = deliveries.filter(d => {
        const date = new Date(d.delivered_at || d.created_at);
        return date >= cutoffDate;
      });

      // Durum dağılımı
      const statusCounts = {
        pending: recentDeliveries.filter(d => d.acceptance_status === 'pending').length,
        accepted: recentDeliveries.filter(d => d.acceptance_status === 'accepted').length,
        rejected: recentDeliveries.filter(d => d.acceptance_status === 'rejected').length
      };

      // Günlük teslimat ortalaması
      const dailyAvg = recentDeliveries.length / daysAgo;

      // Ürün bazında analiz
      const productStats = {};
      recentDeliveries.forEach(d => {
        (d.items || []).forEach(item => {
          const pid = item.product_id;
          if (!productStats[pid]) {
            productStats[pid] = { product_id: pid, total_qty: 0, delivery_count: 0 };
          }
          productStats[pid].total_qty += item.qty || 0;
          productStats[pid].delivery_count += 1;
        });
      });

      // En çok satılan ürünler
      const topProducts = Object.values(productStats)
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, 10)
        .map(p => {
          const productInfo = products.find(pr => pr.product_id === p.product_id);
          return {
            ...p,
            product_name: productInfo?.name || p.product_id
          };
        });

      // Haftalık trend (son 4 hafta)
      const weeklyTrends = [];
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        
        const weekDeliveries = deliveries.filter(d => {
          const date = new Date(d.delivered_at || d.created_at);
          return date >= weekStart && date < weekEnd;
        });
        
        weeklyTrends.unshift({
          week: `Hafta ${4 - i}`,
          count: weekDeliveries.length,
          accepted: weekDeliveries.filter(d => d.acceptance_status === 'accepted').length
        });
      }

      setReportData({
        summary: health,
        deliveries: recentDeliveries,
        statusCounts,
        dailyAvg: Math.round(dailyAvg * 10) / 10,
        topProducts,
        weeklyTrends,
        totalDeliveries: recentDeliveries.length,
        totalCustomers: health.total_customers || 0,
        productCount: products.length
      });

    } catch (err) {
      console.error('Rapor verisi alınamadı:', err);
      toast.error('Raporlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const reportTabs = [
    { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
    { id: 'deliveries', label: 'Teslimat Analizi', icon: Package },
    { id: 'products', label: 'Ürün Performansı', icon: PieChart },
    { id: 'trends', label: 'Trendler', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6" data-testid="admin-reports-page">
      <div className="flex items-start justify-between">
        <PageHeader 
          title="Raporlar & Analizler" 
          subtitle="Sistem performans metrikleri ve iş zekası"
        />
        
        {/* Tarih Filtresi */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="7d">Son 7 Gün</option>
            <option value="30d">Son 30 Gün</option>
            <option value="90d">Son 90 Gün</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeReport === tab.id
                ? 'bg-orange-100 text-orange-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      {activeReport === 'overview' && (
        <OverviewReport data={reportData} dateRange={dateRange} />
      )}
      {activeReport === 'deliveries' && (
        <DeliveryReport data={reportData} />
      )}
      {activeReport === 'products' && (
        <ProductReport data={reportData} />
      )}
      {activeReport === 'trends' && (
        <TrendsReport data={reportData} />
      )}
    </div>
  );
};

// Genel Bakış Raporu
const OverviewReport = ({ data, dateRange }) => {
  const periodLabel = dateRange === '7d' ? '7 günde' : dateRange === '30d' ? '30 günde' : '90 günde';
  
  return (
    <div className="space-y-6">
      {/* Ana Metrikler */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          title="Toplam Teslimat" 
          value={data.totalDeliveries}
          subtitle={`Son ${periodLabel}`}
          icon={Package}
          gradient={gradients.blue}
        />
        <StatCard 
          title="Günlük Ortalama" 
          value={data.dailyAvg}
          subtitle="teslimat/gün"
          icon={Activity}
          gradient={gradients.green}
        />
        <StatCard 
          title="Aktif Müşteri" 
          value={data.totalCustomers}
          icon={Users}
          gradient={gradients.purple}
        />
        <StatCard 
          title="Ürün Çeşidi" 
          value={data.productCount}
          icon={PieChart}
          gradient={gradients.amber}
        />
      </div>

      {/* Durum Dağılımı */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Teslimat Durumları</h3>
          <div className="space-y-3">
            <StatusBar label="Kabul Edildi" count={data.statusCounts.accepted} total={data.totalDeliveries} color="emerald" />
            <StatusBar label="Beklemede" count={data.statusCounts.pending} total={data.totalDeliveries} color="amber" />
            <StatusBar label="Reddedildi" count={data.statusCounts.rejected} total={data.totalDeliveries} color="red" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4">En Çok Satılan Ürünler</h3>
          <div className="space-y-2">
            {data.topProducts.slice(0, 5).map((p, idx) => (
              <div key={p.product_id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' :
                    idx === 1 ? 'bg-slate-200 text-slate-700' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-sm text-slate-700 truncate max-w-[200px]">{p.product_name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">{Math.round(p.total_qty)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Teslimat Raporu
const DeliveryReport = ({ data }) => {
  const acceptanceRate = data.totalDeliveries > 0 
    ? Math.round((data.statusCounts.accepted / data.totalDeliveries) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard 
          title="Kabul Oranı" 
          value={`${acceptanceRate}%`}
          trend={acceptanceRate >= 90 ? 'up' : 'down'}
          trendValue={acceptanceRate >= 90 ? 'İyi' : 'Dikkat'}
        />
        <MetricCard 
          title="Bekleyen" 
          value={data.statusCounts.pending}
          subtitle="teslimat"
        />
        <MetricCard 
          title="Reddedilen" 
          value={data.statusCounts.rejected}
          subtitle="teslimat"
          trend={data.statusCounts.rejected > 5 ? 'down' : 'up'}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Haftalık Teslimat Trendi</h3>
        <div className="flex items-end gap-4 h-40">
          {data.weeklyTrends.map((week, idx) => {
            const maxCount = Math.max(...data.weeklyTrends.map(w => w.count)) || 1;
            const height = (week.count / maxCount) * 100;
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-lg transition-all"
                  style={{ height: `${Math.max(height, 5)}%` }}
                />
                <span className="text-xs text-slate-500 mt-2">{week.week}</span>
                <span className="text-sm font-semibold text-slate-700">{week.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Ürün Performans Raporu
const ProductReport = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Ürün Satış Performansı</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {data.topProducts.map((product, idx) => {
            const maxQty = data.topProducts[0]?.total_qty || 1;
            const percentage = Math.round((product.total_qty / maxQty) * 100);
            
            return (
              <div key={product.product_id} className="px-5 py-3 flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  idx < 3 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{product.product_name}</p>
                  <div className="mt-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-800">{Math.round(product.total_qty)}</p>
                  <p className="text-xs text-slate-500">{product.delivery_count} teslimat</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Trend Raporu
const TrendsReport = ({ data }) => {
  // Haftalık değişim hesapla
  const currentWeek = data.weeklyTrends[data.weeklyTrends.length - 1]?.count || 0;
  const previousWeek = data.weeklyTrends[data.weeklyTrends.length - 2]?.count || 0;
  const weeklyChange = previousWeek > 0 ? Math.round(((currentWeek - previousWeek) / previousWeek) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          title="Bu Hafta" 
          value={currentWeek}
          subtitle="teslimat"
          trend={weeklyChange >= 0 ? 'up' : 'down'}
          trendValue={`${weeklyChange >= 0 ? '+' : ''}${weeklyChange}%`}
        />
        <MetricCard 
          title="Geçen Hafta" 
          value={previousWeek}
          subtitle="teslimat"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-800 mb-4">4 Haftalık Trend</h3>
        <div className="space-y-4">
          {data.weeklyTrends.map((week, idx) => {
            const prev = data.weeklyTrends[idx - 1]?.count || week.count;
            const change = prev > 0 ? Math.round(((week.count - prev) / prev) * 100) : 0;
            
            return (
              <div key={idx} className="flex items-center gap-4">
                <span className="w-20 text-sm text-slate-600">{week.week}</span>
                <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-end pr-2"
                    style={{ width: `${Math.min((week.count / (data.weeklyTrends[0]?.count || 1)) * 100, 100)}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{week.count}</span>
                  </div>
                </div>
                {idx > 0 && (
                  <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {change >= 0 ? '+' : ''}{change}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Yardımcı Bileşenler
const StatusBar = ({ label, count, total, color }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const colorClasses = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500'
  };
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">{count} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, trend, trendValue }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-sm text-slate-500 mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-800">{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${
            trend === 'up' ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="font-medium">{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
