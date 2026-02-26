import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp } from 'lucide-react';

const AllCustomersConsumption = () => {
  return (
    <Card data-testid="all-customers-consumption">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Sarfiyat Analizi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">
          Tüm müşterilerin sarfiyat analizi burada görüntülenecek.
        </p>
      </CardContent>
    </Card>
  );
};

export default AllCustomersConsumption;
