import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Wrench, ClipboardList, AlertTriangle, Package, 
  Calendar, History, Bell, Settings 
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import Layout from '../components/Layout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const MaintenanceTechnicianDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Fetch stats
      const statsRes = await axios.get(`${BACKEND_URL}/api/maintenance/dashboard/stats`, config);
      setStats(statsRes.data);

      // Fetch tasks
      const tasksRes = await axios.get(`${BACKEND_URL}/api/maintenance/tasks`, config);
      setTasks(tasksRes.data.tasks || []);

      // Fetch equipment
      const equipmentRes = await axios.get(`${BACKEND_URL}/api/maintenance/equipment`, config);
      setEquipment(equipmentRes.data.equipment || []);

      // Fetch spare parts
      const sparePartsRes = await axios.get(`${BACKEND_URL}/api/maintenance/spare-parts`, config);
      setSpareParts(sparePartsRes.data.requests || []);

      // Fetch schedules
      const schedulesRes = await axios.get(`${BACKEND_URL}/api/maintenance/schedule`, config);
      setSchedules(schedulesRes.data.schedules || []);

      setLoading(false);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Veriler yüklenirken hata oluştu');
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      operational: 'bg-green-100 text-green-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      broken: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
      fulfilled: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const handleStartTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/maintenance/tasks/${taskId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Görev başlatıldı');
      fetchDashboardData();
    } catch (error) {
      toast.error('Görev başlatılamadı: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout title="Bakım Teknisyeni Paneli">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Bekleyen Görevler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.tasks?.pending || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Devam Eden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.tasks?.in_progress || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Acil Görevler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats?.tasks?.urgent || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Bekleyen Parça Talebi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.spare_parts?.pending || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="tasks">Görevlerim</TabsTrigger>
          <TabsTrigger value="equipment">Ekipmanlar</TabsTrigger>
          <TabsTrigger value="faults">Arıza Bildirimleri</TabsTrigger>
          <TabsTrigger value="schedule">Bakım Takvimi</TabsTrigger>
          <TabsTrigger value="spare-parts">Yedek Parça</TabsTrigger>
          <TabsTrigger value="history">Geçmiş</TabsTrigger>
          <TabsTrigger value="emergency">Acil</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Bakım Görevlerim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Henüz görev bulunmuyor</p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{task.title}</h3>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Ekipman: {task.equipment_name || 'N/A'}</span>
                            <span>Konum: {task.equipment_location || 'N/A'}</span>
                            {task.estimated_duration_hours && (
                              <span>Süre: {task.estimated_duration_hours}h</span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleStartTask(task.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Başlat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Ekipman Listesi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipment.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 col-span-3">Ekipman bulunmuyor</p>
                ) : (
                  equipment.map((eq) => (
                    <div key={eq.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{eq.name}</h3>
                        <Badge className={getStatusColor(eq.status)}>
                          {eq.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{eq.code}</p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>Konum: {eq.location}</div>
                        <div>Tip: {eq.type}</div>
                        {eq.total_runtime_hours && (
                          <div>Çalışma Saati: {eq.total_runtime_hours}h</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Faults Tab */}
        <TabsContent value="faults">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Arıza Bildirimleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.filter(t => t.task_type === 'emergency').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Acil arıza bildirimi bulunmuyor</p>
                ) : (
                  tasks.filter(t => t.task_type === 'emergency').map((task) => (
                    <div key={task.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h3 className="font-semibold text-red-900">{task.title}</h3>
                        <Badge className="bg-red-600 text-white">URGENT</Badge>
                      </div>
                      <p className="text-sm text-red-800 mb-2">{task.description}</p>
                      <div className="text-sm text-red-700">
                        Ekipman: {task.equipment_name} - {task.equipment_location}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Bakım Takvimi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Planlı bakım bulunmuyor</p>
                ) : (
                  schedules.map((schedule) => (
                    <div key={schedule.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{schedule.task_title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{schedule.task_description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Ekipman: {schedule.equipment_name}</span>
                            <span>Sıklık: {schedule.frequency}</span>
                            <span>Süre: {schedule.estimated_duration_hours}h</span>
                          </div>
                        </div>
                        {schedule.is_overdue && (
                          <Badge className="bg-red-100 text-red-800">Gecikmiş</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spare Parts Tab */}
        <TabsContent value="spare-parts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Yedek Parça Taleplerim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {spareParts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Talep bulunmuyor</p>
                ) : (
                  spareParts.map((part) => (
                    <div key={part.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{part.part_name}</h3>
                            <Badge className={getStatusColor(part.status)}>
                              {part.status}
                            </Badge>
                            <Badge className={getPriorityColor(part.urgency)}>
                              {part.urgency}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{part.reason}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Miktar: {part.quantity} {part.unit}</span>
                            <span>Ekipman: {part.equipment_name}</span>
                            {part.estimated_cost && (
                              <span>Maliyet: {part.estimated_cost} TL</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Bakım Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.filter(t => t.status === 'completed').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Tamamlanmış görev bulunmuyor</p>
                ) : (
                  tasks.filter(t => t.status === 'completed').map((task) => (
                    <div key={task.id} className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-green-900 mb-1">{task.title}</h3>
                          <p className="text-sm text-green-800 mb-2">{task.completion_notes || task.description}</p>
                          <div className="flex items-center gap-4 text-sm text-green-700">
                            <span>Ekipman: {task.equipment_name}</span>
                            {task.actual_duration_hours && (
                              <span>Süre: {task.actual_duration_hours}h</span>
                            )}
                            {task.cost && (
                              <span>Maliyet: {task.cost} TL</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Tab */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-600" />
                Acil Müdahaleler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.filter(t => t.priority === 'urgent').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Acil görev bulunmuyor</p>
                ) : (
                  tasks.filter(t => t.priority === 'urgent').map((task) => (
                    <div key={task.id} className="border-2 border-red-500 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <h3 className="font-bold text-red-900">{task.title}</h3>
                            <Badge className="bg-red-600 text-white">ACİL</Badge>
                          </div>
                          <p className="text-sm text-red-800 mb-2">{task.description}</p>
                          <div className="flex items-center gap-4 text-sm text-red-700">
                            <span>Ekipman: {task.equipment_name}</span>
                            <span>Konum: {task.equipment_location}</span>
                          </div>
                        </div>
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
                          >
                            Hemen Başlat
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default MaintenanceTechnicianDashboard;