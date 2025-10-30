import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newTask, setNewTask] = useState({
    assignee: '',
    title: '',
    description: '',
    deadline: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadTasks();
  }, []);

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      // Tüm kullanıcıları getir (plasiyer, depo personeli vs)
      const response = await axios.get(`${BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data || []);
    } catch (err) {
      // Mock data
      setEmployees([
        { id: '1', full_name: 'Plasiyer 1', role: 'sales_agent' },
        { id: '2', full_name: 'Depo Personeli', role: 'warehouse_staff' }
      ]);
    }
  };

  const loadTasks = async () => {
    // Mock görevler
    setTasks([
      {
        id: '1',
        assignee_name: 'Plasiyer 1',
        title: 'Müşteri ziyareti',
        status: 'pending',
        deadline: '2025-11-01',
        priority: 'high'
      }
    ]);
  };

  const createTask = async () => {
    if (!newTask.assignee || !newTask.title) {
      toast.error('Görevli ve görev başlığı zorunludur');
      return;
    }

    const task = {
      id: Date.now().toString(),
      assignee_name: employees.find(e => e.id === newTask.assignee)?.full_name || 'Bilinmeyen',
      ...newTask,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setTasks([...tasks, task]);
    setNewTask({ assignee: '', title: '', description: '', deadline: '', priority: 'normal' });
    toast.success('Görev başarıyla oluşturuldu');
  };

  const updateTaskStatus = (id, status) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
    toast.success('Görev durumu güncellendi');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <UserCheck className="mr-2" />
          Görev Yönetimi
        </h2>

        {/* Yeni Görev Oluşturma */}
        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-3">Personele Görev Ver</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={newTask.assignee}
              onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Görevli Seç</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.role})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Görev başlığı"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
            />

            <textarea
              placeholder="Görev açıklaması"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="col-span-2 px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
              rows="3"
            />

            <input
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
            />

            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
            >
              <option value="low">Düşük Öncelik</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek Öncelik</option>
            </select>
          </div>

          <button
            onClick={createTask}
            className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Görev Oluştur
          </button>
        </div>

        {/* Görev Listesi */}
        <div className="space-y-3">
          <h3 className="font-semibold">Verilen Görevler</h3>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserCheck className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Henüz görev verilmemiş</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-gray-600">Görevli: {task.assignee_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    task.status === 'completed' ? 'bg-green-100 text-green-700' :
                    task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {task.status === 'completed' ? 'Tamamlandı' :
                     task.status === 'in_progress' ? 'Devam Ediyor' :
                     'Bekliyor'}
                  </span>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {task.deadline && <span>📅 Son Tarih: {task.deadline}</span>}
                  </div>
                  <div className="space-x-2">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                      >
                        <Clock className="h-4 w-4 inline mr-1" />
                        Başlat
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Tamamla
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;
