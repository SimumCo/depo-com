import React, { useState, useEffect } from 'react';
import { tasksAPI, authAPI } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Plus, ClipboardList, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const TaskManagement = ({ role, onUpdate }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await tasksAPI.getAll();
      setTasks(response.data);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Görevler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.create({
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      });
      toast.success('Görev başarıyla oluşturuldu');
      setOpen(false);
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        due_date: '',
      });
      loadTasks();
    } catch (error) {
      toast.error('Görev oluşturulamadı');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      toast.success('Görev durumu güncellendi');
      loadTasks();
    } catch (error) {
      toast.error('Durum güncellenemedi');
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await tasksAPI.update(selectedTask.id, { feedback, status: 'completed' });
      toast.success('Geri bildirim gönderildi');
      setFeedbackOpen(false);
      setFeedback('');
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      toast.error('Geri bildirim gönderilemedi');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Bekliyor</Badge>,
      in_progress: <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Devam Ediyor</Badge>,
      completed: <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Tamamlandı</Badge>,
      approved: <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Onaylandı</Badge>,
    };
    return badges[status] || status;
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-red-100 text-red-600',
    };
    return <Badge className={colors[priority]}>{priority === 'low' ? 'Düşük' : priority === 'medium' ? 'Orta' : 'Yüksek'}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{role === 'manager' ? 'Görev Yönetimi' : 'Görevlerim'}</CardTitle>
        {role === 'manager' && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-task-button">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Görev
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni Görev Ata</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Başlık *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="task-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    data-testid="task-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Atanan Personel ID *</Label>
                  <Input
                    id="assigned_to"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    required
                    placeholder="Personel kullanıcı ID'si"
                    data-testid="task-assigned-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Öncelik</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger data-testid="task-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Bitiş Tarihi</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      data-testid="task-due-date-input"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" data-testid="save-task-button">Oluştur</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClipboardList className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Görev bulunamadı</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başlık</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Öncelik</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Bitiş Tarihi</TableHead>
                <TableHead>!şlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} data-testid={`task-row-${task.id}`}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{task.description}</TableCell>
                  <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>
                    {task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy', { locale: tr }) : '-'}
                  </TableCell>
                  <TableCell>
                    {role === 'staff' && task.status !== 'approved' && task.status !== 'completed' && (
                      <div className="flex gap-2">
                        {task.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(task.id, 'in_progress')}
                            data-testid={`start-task-${task.id}`}
                          >
                            Başla
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-50 hover:bg-green-100"
                            onClick={() => {
                              setSelectedTask(task);
                              setFeedbackOpen(true);
                            }}
                            data-testid={`complete-task-${task.id}`}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Tamamla
                          </Button>
                        )}
                      </div>
                    )}
                    {role === 'manager' && task.status === 'completed' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(task.id, 'approved')}
                        data-testid={`approve-task-${task.id}`}
                      >
                        Onayla
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Feedback Dialog */}
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Görev Tamamlama Geri Bildirimi</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">Geri Bildirim</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Görevle ilgili notlarınızı girin..."
                  rows={4}
                  data-testid="feedback-input"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFeedbackOpen(false);
                    setFeedback('');
                    setSelectedTask(null);
                  }}
                >
                  İptal
                </Button>
                <Button onClick={handleSubmitFeedback} data-testid="submit-feedback-button">
                  Gönder
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TaskManagement;
