import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Package } from 'lucide-react';

const InventoryView = () => {
  return (
    <Card data-testid="inventory-view">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Envanter Görünümü
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">
          Depo envanter durumu burada görüntülenecek.
        </p>
      </CardContent>
    </Card>
  );
};

export default InventoryView;
