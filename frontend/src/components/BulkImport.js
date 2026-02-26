import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { FileSpreadsheet } from 'lucide-react';

const BulkImport = () => {
  return (
    <Card data-testid="bulk-import">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Excel Veri Girişi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">
          Excel dosyasından toplu veri aktarımı için bu modül kullanılacak.
        </p>
      </CardContent>
    </Card>
  );
};

export default BulkImport;
