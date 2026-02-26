import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users } from 'lucide-react';

const CustomerManagement = ({ onUpdate }) => {
  return (
    <Card data-testid="customer-management">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Müşteri Yönetimi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">
          Bu modül refactoring sonrası geçici olarak devre dışı. 
          Plasiyer Dashboard'dan müşteri yönetimine erişebilirsiniz.
        </p>
      </CardContent>
    </Card>
  );
};

export default CustomerManagement;
