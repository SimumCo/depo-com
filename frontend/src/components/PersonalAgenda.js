import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PersonalAgenda = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', date: '', priority: 'normal' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/tasks/my-tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (err) {
      // Backend'de endpoint yoksa boş array kullan
      setTasks([]);
    }
  };

  const addTask = async () => {
    if (!newTask.title) {
      toast.error('Görev başlığı gerekli');
      return;
    }

    const task = {
      id: Date.now(),
      ...newTask,
      completed: false,
      created_at: new Date().toISOString()
    };

    setTasks([...tasks, task]);
    setNewTask({ title: '', date: '', priority: 'normal' });
    toast.success('Görev eklendi');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    toast.success('Görev silindi');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Calendar className="mr-2" />
          Kişisel Ajanda ve Yapılacaklar
        </h2>

        {/* Yeni Görev Ekleme */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-3">Yeni Görev Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Görev başlığı"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="col-span-2 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={newTask.date}
              onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Düşük Öncelik</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek Öncelik</option>
            </select>
          </div>
          <button
            onClick={addTask}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Görev Ekle
          </button>
        </div>

        {/* Görev Listesi */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Henüz görev eklenmemiş</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 border rounded-lg flex items-center justify-between ${
                  task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}
                  >
                    {task.completed && <CheckCircle className="h-4 w-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      task.completed ? 'line-through text-gray-500' : ''
                    }`}>
                      {task.title}
                    </h4>
                    <div className="text-sm text-gray-500 flex space-x-4 mt-1">
                      {task.date && <span>📅 {task.date}</span>}
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'normal' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.priority === 'high' ? 'Yüksek' : task.priority === 'normal' ? 'Normal' : 'Düşük'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalAgenda;
