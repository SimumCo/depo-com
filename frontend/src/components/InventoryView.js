import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
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
      // Products API'den aktif ve stoklu ürünleri al
      const response = await productsAPI.getAll({ active_only: true, in_stock_only: true });
      setInventory(response.data);
    } catch (error) {
      toast.error('Envanter yüklenemedi');
      console.error('Inventory load error:', error);
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
                  <TableHead>Ürün Adı</TableHead>
                  <TableHead>Stok Kodu</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Stok Miktarı</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead>Koli İçi Adet</TableHead>
                  <TableHead>Satış Fiyatı</TableHead>
                  <TableHead>SKT</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => {
                  const fullCases = Math.floor(item.stock_quantity / (item.units_per_case || 1));
                  const remainingUnits = item.stock_quantity % (item.units_per_case || 1);
                  const isLowStock = item.stock_quantity < (item.min_stock_level || 10);
                  
                  return (
                    <TableRow key={item.id} data-testid={`inventory-row-${item.sku}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.sku}</Badge>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="font-semibold text-blue-600">
                        {item.stock_quantity || 0} {item.unit || 'ADET'}
                      </TableCell>
                      <TableCell>{item.unit || 'ADET'}</TableCell>
                      <TableCell>
                        {fullCases > 0 && (
                          <span className="text-blue-600">{fullCases} koli</span>
                        )}
                        {fullCases > 0 && remainingUnits > 0 && ' + '}
                        {remainingUnits > 0 && (
                          <span className="text-gray-600">{remainingUnits} birim</span>
                        )}
                        {item.stock_quantity === 0 && <span className="text-red-600">-</span>}
                      </TableCell>
                      <TableCell>{item.sales_price || 0} ₺</TableCell>
                      <TableCell>{formatDate(item.expiry_date)}</TableCell>
                      <TableCell>
                        {item.stock_quantity === 0 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertCircle className="h-3 w-3" />
                            Stokta Yok
                          </Badge>
                        ) : isLowStock ? (
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryView;
