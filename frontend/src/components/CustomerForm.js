import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { UserPlus } from 'lucide-react';

const CustomerForm = ({ onSuccess }) => {
  return (
    <Card data-testid="customer-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Yeni Müşteri Ekle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">
          Bu modül refactoring sonrası geçici olarak devre dışı.
          Plasiyer Dashboard'dan müşteri ekleme yapabilirsiniz.
        </p>
      </CardContent>
    </Card>
  );
};

export default CustomerForm;
