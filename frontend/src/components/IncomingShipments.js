import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Truck } from 'lucide-react';

const IncomingShipments = () => {
  return (
    <Card data-testid="incoming-shipments">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Gelen Sevkiyatlar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">
          Gelen sevkiyatlar burada listelenecek.
        </p>
      </CardContent>
    </Card>
  );
};

export default IncomingShipments;
