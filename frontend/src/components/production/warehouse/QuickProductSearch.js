import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import * as productionApi from '../../../services/productionApi';

const QuickProductSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setProducts([]);
      return;
    }

    setSearching(true);
    try {
      const data = await productionApi.searchWarehouseProducts(query);
      setProducts(data.products || []);
    } catch (error) {
      toast.error('Arama başarısız');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Hızlı Ürün Arama
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Ürün adı, kodu veya barkod ile arayın..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />
        </div>

        {searching && (
          <div className="text-center py-4 text-muted-foreground">Aranıyor...</div>
        )}

        {!searching && products.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Mevcut Stok</TableHead>
                <TableHead>Lokasyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-semibold">{product.name}</TableCell>
                  <TableCell className="font-mono">{product.code}</TableCell>
                  <TableCell>{product.current_stock} {product.unit}</TableCell>
                  <TableCell className="font-mono">{product.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!searching && searchQuery.length >= 2 && products.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Ürün bulunamadı
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickProductSearch;