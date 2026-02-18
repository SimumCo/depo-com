import React, { useState, useEffect, useCallback } from 'react';
import { sfAdminAPI } from '../../services/seftaliApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { BarChart3, TrendingUp, Truck, Users, AlertTriangle } from 'lucide-react';

const SeftaliAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [variance, setVariance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, varRes] = await Promise.all([
        sfAdminAPI.getHealthSummary(),
        sfAdminAPI.getVariance({}),
      ]);
      setSummary(sumRes.data?.data || null);
      setVariance(varRes.data?.data || []);
    } catch {
      toast.error('Admin verileri yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Seftali - Admin</h1>
          <p className="text-xs text-slate-500">{user?.full_name} (salt okunur)</p>
        </div>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-red-600" data-testid="logout-btn">Cikis</button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6" data-testid="admin-tabs">
          {[
            { id: 'overview', label: 'Genel Bakis', icon: BarChart3 },
            { id: 'variance', label: 'Sapmalar', icon: TrendingUp },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                data-testid={`admin-tab-${tab.id}`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-6" data-testid="admin-overview">
            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon={Truck} label="Toplam Teslimat" value={summary?.total_deliveries || 0} color="sky" />
              <MetricCard icon={Truck} label="Bekleyen Teslimat" value={summary?.pending_deliveries || 0} color="amber" />
              <MetricCard icon={AlertTriangle} label="Aktif Spike" value={summary?.active_spikes || 0} color="red" />
              <MetricCard icon={TrendingUp} label="Acik Sapma" value={summary?.open_variance || 0} color="purple" />
            </div>

            {/* Top spike products */}
            {(summary?.top_spike_products || []).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">En Cok Spike Olan Urunler</h3>
                <div className="space-y-2">
                  {summary.top_spike_products.map((ts, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700">{ts.product_name || ts.product_id?.slice(0, 8)}</span>
                      <span className="font-semibold text-red-600">{ts.spike_count} spike</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                <span className="text-sm font-medium text-slate-700">Aktif Musteri: {summary?.total_customers || 0}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3" data-testid="admin-variance-table">
            {variance.length === 0 ? (
              <div className="text-center py-12"><TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 text-sm">Sapma kaydi yok</p></div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Musteri</th>
                      <th className="px-4 py-2 text-left font-medium">Urun</th>
                      <th className="px-4 py-2 text-left font-medium">Oran</th>
                      <th className="px-4 py-2 text-left font-medium">Yon</th>
                      <th className="px-4 py-2 text-left font-medium">Durum</th>
                      <th className="px-4 py-2 text-left font-medium">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variance.map((v) => (
                      <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`admin-var-row-${v.id?.slice(0,8)}`}>
                        <td className="px-4 py-2 text-slate-800">{v.customer_name || '-'}</td>
                        <td className="px-4 py-2 text-slate-800">{v.product_name || '-'}</td>
                        <td className="px-4 py-2 font-medium text-red-600">+{Math.round((v.change_ratio || 0) * 100)}%</td>
                        <td className="px-4 py-2">{v.direction === 'increase' ? 'Artis' : 'Azalis'}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            v.status === 'needs_reason' ? 'bg-amber-50 text-amber-700' :
                            v.status === 'recorded' ? 'bg-green-50 text-green-700' :
                            'bg-slate-50 text-slate-700'
                          }`}>{v.status}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-500">{v.detected_at ? new Date(v.detected_at).toLocaleDateString('tr-TR') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, color }) => {
  const colorMap = {
    sky: 'text-sky-600 bg-sky-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
  };
  const cls = colorMap[color] || colorMap.sky;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4" data-testid={`metric-${label.toLowerCase().replace(/ /g, '-')}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${cls}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
};

export default SeftaliAdminDashboard;
