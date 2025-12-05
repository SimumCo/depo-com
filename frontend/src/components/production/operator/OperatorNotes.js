// Operator Notes - Operator Panel
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { FileText, Plus, Trash2, AlertCircle, Info, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const OperatorNotes = ({ notes: initialNotes, onRefresh }) => {
  const [notes, setNotes] = useState(initialNotes || []);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    line_id: '',
    note_type: 'general',
    note_text: '',
    shift: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notesData, ordersData] = await Promise.all([
        productionApi.getOperatorNotes(),
        productionApi.getOperatorMyOrders()
      ]);
      setNotes(notesData.notes || []);
      setOrders(ordersData.orders || []);
    } catch (error) {
      console.error('Veriler yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.note_text.trim()) {
      toast.error('Lütfen not girin');
      return;
    }

    setLoading(true);
    try {
      await productionApi.createOperatorNote({
        ...formData,
        order_id: formData.order_id || null,
        line_id: formData.line_id || null,
        shift: formData.shift || null
      });
      toast.success('Not kaydedildi');
      setFormData({
        order_id: '',
        line_id: '',
        note_type: 'general',
        note_text: '',
        shift: ''
      });
      fetchData();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Not kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await productionApi.deleteOperatorNote(noteId);
      toast.success('Not silindi');
      fetchData();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Not silinemedi');
    }
  };

  const noteTypes = [
    { value: 'general', label: 'Genel', icon: FileText, color: 'bg-blue-100 text-blue-800' },
    { value: 'issue', label: 'Sorun', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
    { value: 'quality', label: 'Kalite', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'safety', label: 'Güvenlik', icon: Shield, color: 'bg-green-100 text-green-800' }
  ];

  const shifts = [
    { value: 'morning', label: 'Sabah (06:00-14:00)' },
    { value: 'afternoon', label: 'Akşam (14:00-22:00)' },
    { value: 'night', label: 'Gece (22:00-06:00)' }
  ];

  const getNoteTypeInfo = (type) => {
    return noteTypes.find(t => t.value === type) || noteTypes[0];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Yeni Not Ekle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Üretim Emri (Opsiyonel)</Label>
                <Select
                  value={formData.order_id}
                  onValueChange={(value) => setFormData({ ...formData, order_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Emir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Seçilmedi</SelectItem>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Not Tipi *</Label>
                <Select
                  value={formData.note_type}
                  onValueChange={(value) => setFormData({ ...formData, note_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {noteTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Vardiya</Label>
                <Select
                  value={formData.shift}
                  onValueChange={(value) => setFormData({ ...formData, shift: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vardiya seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Seçilmedi</SelectItem>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.value} value={shift.value}>
                        {shift.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Not *</Label>
              <Textarea
                value={formData.note_text}
                onChange={(e) => setFormData({ ...formData, note_text: e.target.value })}
                placeholder="Notunuzu buraya yazın..."
                rows={4}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Not Ekle
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle>Notlarım</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notes.map((note) => {
              const typeInfo = getNoteTypeInfo(note.note_type);
              const TypeIcon = typeInfo.icon;
              
              return (
                <div key={note.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-5 w-5" />
                      <Badge className={typeInfo.color}>
                        {typeInfo.label}
                      </Badge>
                      {note.shift && (
                        <Badge variant="outline">
                          {shifts.find(s => s.value === note.shift)?.label || note.shift}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                  
                  <p className="text-sm mb-2">{note.note_text}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{new Date(note.created_at).toLocaleString('tr-TR')}</span>
                    <span>Operatör: {note.operator_name}</span>
                    {note.order_id && <span className="font-mono">Emir ID: {note.order_id}</span>}
                  </div>
                </div>
              );
            })}
            {notes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Henüz not bulunmuyor</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperatorNotes;