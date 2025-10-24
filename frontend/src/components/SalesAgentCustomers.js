import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import api from '../services/api';
import { Users, Calendar, MapPin, Phone, Building } from 'lucide-react';

const SalesAgentCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dayTranslations = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
    saturday: 'Cumartesi',
    sunday: 'Pazar'
  };

  const channelTranslations = {
    logistics: 'Lojistik',
    dealer: 'Bayi'
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/salesagent/my-customers');
      setCustomers(response.data);
      setError('');
    } catch (err) {
      setError('Müşteriler yüklenirken hata oluştu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  // Group customers by delivery day
  const customersByDay = customers.reduce((acc, item) => {
    const day = item.route?.delivery_day || 'unknown';
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(item);
    return acc;
  }, {});

  // Sort days
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const sortedDays = Object.keys(customersByDay).sort((a, b) => {
    return dayOrder.indexOf(a) - dayOrder.indexOf(b);
  });

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Müşterilerim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Toplam Müşteri</div>
              <div className="text-2xl font-bold text-blue-600">{customers.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Rota Günleri</div>
              <div className="text-2xl font-bold text-green-600">{sortedDays.length}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Toplam Sipariş</div>
              <div className="text-2xl font-bold text-purple-600">
                {customers.reduce((sum, c) => sum + (c.order_count || 0), 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers by Day */}
      {sortedDays.map(day => (
        <Card key={day}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {dayTranslations[day] || day}
              <Badge variant="secondary" className="ml-2">
                {customersByDay[day].length} müşteri
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sıra</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Kanal</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead>Sipariş Sayısı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersByDay[day]
                  .sort((a, b) => (a.route?.route_order || 0) - (b.route?.route_order || 0))
                  .map((item) => (
                    <TableRow key={item.customer?.id}>
                      <TableCell>
                        <Badge variant="outline">{item.route?.route_order || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.customer?.full_name}</div>
                        <div className="text-sm text-gray-500">{item.customer?.customer_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          {item.profile?.company_name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.customer?.channel_type === 'logistics' ? 'default' : 'secondary'}
                        >
                          {channelTranslations[item.customer?.channel_type] || item.customer?.channel_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {item.profile?.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {item.profile.phone}
                            </div>
                          )}
                          {item.profile?.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {item.profile.city}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.order_count || 0}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {customers.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Henüz atanmış müşteriniz yok.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SalesAgentCustomers;
