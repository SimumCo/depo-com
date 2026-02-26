import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Users, Search, MapPin, Phone, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const CustomerManagement = ({ onUpdate }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/seftali/sales/customers');
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Müşteri listesi alınamadı:', error);
      toast.error('Müşteri listesi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDayName = (code) => {
    const days = { MON: 'Pzt', TUE: 'Sal', WED: 'Çar', THU: 'Per', FRI: 'Cum', SAT: 'Cmt', SUN: 'Paz' };
    return days[code] || code;
  };

  return (
    <Card data-testid="customer-management">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Müşteri Yönetimi
          </div>
          <Badge variant="secondary">{customers.length} Müşteri</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Arama */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Müşteri ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="customer-search"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Müşteri bulunamadı</div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                data-testid={`customer-${customer.id}`}
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.code || customer.id?.slice(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={customer.is_active ? "default" : "secondary"}>
                      {customer.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                    {expandedCustomer === customer.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {expandedCustomer === customer.id && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Rota Günleri: </span>
                      <div className="flex gap-1">
                        {customer.route_plan?.days?.map(day => (
                          <Badge key={day} variant="outline" className="text-xs">
                            {getDayName(day)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.location?.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{customer.location.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Kanal:</span>
                      <Badge variant="outline">{customer.channel || 'Belirtilmemiş'}</Badge>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerManagement;
