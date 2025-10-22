import React, { useState, useEffect } from 'react';
import { salesRepAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Users } from 'lucide-react';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await salesRepAPI.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelBadge = (channel) => {
    return channel === 'logistics' ? (
      <Badge variant="secondary">Lojistik</Badge>
    ) : (
      <Badge variant="secondary">Bayi</Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Müşteri Yönetimi</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Müşteri bulunamadı</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri Adı</TableHead>
                <TableHead>Müşteri No</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Kanal</TableHead>
                <TableHead>Sipariş Sayısı</TableHead>
                <TableHead>Şirket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} data-testid={`customer-row-${customer.customer_number}`}>
                  <TableCell className="font-medium">{customer.full_name}</TableCell>
                  <TableCell>{customer.customer_number}</TableCell>
                  <TableCell>{customer.email || '-'}</TableCell>
                  <TableCell>{getChannelBadge(customer.channel_type)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.order_count}</Badge>
                  </TableCell>
                  <TableCell>{customer.profile?.company_name || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerManagement;
