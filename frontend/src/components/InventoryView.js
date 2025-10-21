import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Package, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const InventoryView = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const response = await inventoryAPI.getAll();
      setInventory(response.data);
    } catch (error) {
      toast.error('Envanter yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: tr });
    } catch {
      return '-';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Envanter Durumu</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Envanter bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Toplam Birim</TableHead>
                  <TableHead>Koli + Birim</TableHead>
                  <TableHead>Ağırlık (kg)</TableHead>
                  <TableHead>Son Tedarik</TableHead>
                  <TableHead>SKT</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.id} data-testid={`inventory-row-${item.product?.sku}`}>
                    <TableCell className="font-medium">{item.product?.name}</TableCell>
                    <TableCell>{item.product?.sku}</TableCell>
                    <TableCell className="font-semibold">{item.total_units}</TableCell>
                    <TableCell>
                      {item.full_cases > 0 && (
                        <span className="text-blue-600">{item.full_cases} koli</span>
                      )}
                      {item.full_cases > 0 && item.remaining_units > 0 && ' + '}
                      {item.remaining_units > 0 && (
                        <span className="text-gray-600">{item.remaining_units} birim</span>
                      )}
                      {item.total_units === 0 && <span className="text-red-600">Stokta yok</span>}
                    </TableCell>
                    <TableCell>{item.product?.weight * item.total_units}</TableCell>
                    <TableCell>{formatDate(item.last_supply_date)}</TableCell>
                    <TableCell>{formatDate(item.expiry_date)}</TableCell>
                    <TableCell>
                      {item.is_out_of_stock ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertCircle className="h-3 w-3" />
                          Stokta Yok
                        </Badge>
                      ) : item.total_units < 50 ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                          Düşük Stok
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          Stokta
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryView;
