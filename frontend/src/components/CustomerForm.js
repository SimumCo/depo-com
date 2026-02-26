import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserPlus, MapPin, Phone, Mail, Building } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const DAYS = [
  { code: 'MON', name: 'Pazartesi' },
  { code: 'TUE', name: 'Salı' },
  { code: 'WED', name: 'Çarşamba' },
  { code: 'THU', name: 'Perşembe' },
  { code: 'FRI', name: 'Cuma' },
  { code: 'SAT', name: 'Cumartesi' },
  { code: 'SUN', name: 'Pazar' },
];

const CustomerForm = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    channel: 'retail',
    route_days: [],
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleRouteDay = (dayCode) => {
    setFormData(prev => ({
      ...prev,
      route_days: prev.route_days.includes(dayCode)
        ? prev.route_days.filter(d => d !== dayCode)
        : [...prev.route_days, dayCode]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Müşteri adı zorunludur');
      return;
    }
    
    if (formData.route_days.length === 0) {
      toast.error('En az bir rota günü seçmelisiniz');
      return;
    }

    setLoading(true);
    try {
      // API'ye müşteri ekleme isteği
      const response = await api.post('/seftali/sales/customers', {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        channel: formData.channel,
        route_plan: {
          days: formData.route_days
        }
      });

      if (response.data.success) {
        toast.success('Müşteri başarıyla eklendi');
        setFormData({
          name: '',
          phone: '',
          email: '',
          address: '',
          channel: 'retail',
          route_days: [],
        });
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Müşteri eklenemedi:', error);
      toast.error(error.response?.data?.detail || 'Müşteri eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card data-testid="customer-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Yeni Müşteri Ekle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Müşteri Adı */}
          <div className="space-y-2">
            <Label htmlFor="name">Müşteri Adı *</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Örn: ABC Market"
                className="pl-10"
                required
                data-testid="customer-name-input"
              />
            </div>
          </div>

          {/* Telefon */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="0532 xxx xx xx"
                className="pl-10"
                data-testid="customer-phone-input"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="ornek@email.com"
                className="pl-10"
                data-testid="customer-email-input"
              />
            </div>
          </div>

          {/* Adres */}
          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Tam adres"
                className="pl-10"
                data-testid="customer-address-input"
              />
            </div>
          </div>

          {/* Kanal */}
          <div className="space-y-2">
            <Label>Kanal Tipi</Label>
            <Select value={formData.channel} onValueChange={(v) => handleChange('channel', v)}>
              <SelectTrigger data-testid="customer-channel-select">
                <SelectValue placeholder="Kanal seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Perakende</SelectItem>
                <SelectItem value="horeca">HoReCa (Otel/Restoran)</SelectItem>
                <SelectItem value="wholesale">Toptan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rota Günleri */}
          <div className="space-y-2">
            <Label>Rota Günleri *</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <Button
                  key={day.code}
                  type="button"
                  variant={formData.route_days.includes(day.code) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleRouteDay(day.code)}
                  data-testid={`route-day-${day.code}`}
                >
                  {day.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
            data-testid="submit-customer-btn"
          >
            {loading ? 'Ekleniyor...' : 'Müşteri Ekle'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerForm;
