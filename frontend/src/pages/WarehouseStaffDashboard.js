import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { tasksAPI } from '../services/api';
import { ClipboardList, CheckCircle, Clock } from 'lucide-react';
import TaskManagement from '../components/TaskManagement';
import InventoryView from '../components/InventoryView';

const WarehouseStaffDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await tasksAPI.getAll();
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved').length;

  return (
    <Layout title="Depo Personeli Paneli">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card data-testid="stat-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Görevler</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingTasks}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-in-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devam Eden</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{inProgressTasks}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-completed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks" data-testid="tab-tasks">Görevlerim</TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Envanter</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <TaskManagement role="staff" onUpdate={loadTasks} />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryView />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default WarehouseStaffDashboard;
