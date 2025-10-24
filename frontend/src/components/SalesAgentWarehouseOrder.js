import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import api from '../services/api';
import { Package, ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const SalesAgentWarehouseOrder = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [channelType, setChannelType] = useState('logistics');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/catalog');
      setProducts(response.data);
      setError('');
    } catch (err) {
      setError('Ürünler yüklenirken hata oluştu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, units: item.units + product.units_per_case }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        units: product.units_per_case,
        units_per_case: product.units_per_case,
        unit_price: product.price,
        total_price: product.price * product.units_per_case
      }]);
    }
  };

  const updateCartItem = (productId, units) => {
    if (units <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, units, total_price: item.unit_price * units }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setError('Sepetiniz boş');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const orderData = {
        customer_id: '',  // Backend will use current user's id
        channel_type: channelType,
        products: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          units: item.units,
          cases: Math.floor(item.units / item.units_per_case),
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        notes: 'Plasiyer depot siparişi'
      };

      await api.post('/salesagent/warehouse-order', orderData);
      
      setSuccess('Sipariş başarıyla oluşturuldu!');
      setCart([]);
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Sipariş oluşturulurken hata oluştu');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Channel Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Kanal Seçimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={channelType} onValueChange={setChannelType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kanal seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="logistics">Lojistik (Otel, Devlet)</SelectItem>
              <SelectItem value="dealer">Bayi (Market, Son Kullanıcı)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ürünler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => {
              const inCart = cart.find(item => item.product_id === product.id);
              return (
                <Card key={product.id} className={inCart ? 'border-blue-500 border-2' : ''}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{product.name}</h4>
                          <p className="text-xs text-gray-500">{product.sku}</p>
                        </div>
                        {product.in_stock ? (
                          <Badge variant="success" className="bg-green-100 text-green-800">Stokta</Badge>
                        ) : (
                          <Badge variant="destructive">Stok Yok</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div>Kategori: {product.category}</div>
                        <div>Koli: {product.units_per_case} adet</div>
                        <div>Stok: {product.available_units} adet</div>
                      </div>
                      
                      <div className="text-lg font-bold text-blue-600">
                        {product.price?.toFixed(2)} TL/adet
                      </div>
                      
                      <Button
                        onClick={() => addToCart(product)}
                        disabled={!product.in_stock}
                        className="w-full"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Sepete Ekle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cart */}
      {cart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Sepetim
              <Badge variant="secondary" className="ml-2">{cart.length} ürün</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Birim Fiyat</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Koli</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map(item => (
                  <TableRow key={item.product_id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.unit_price.toFixed(2)} TL</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartItem(item.product_id, item.units - item.units_per_case)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.units}
                          onChange={(e) => updateCartItem(item.product_id, parseInt(e.target.value) || 0)}
                          className="w-20 text-center"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartItem(item.product_id, item.units + item.units_per_case)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {Math.floor(item.units / item.units_per_case)} koli
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.total_price.toFixed(2)} TL
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex justify-between items-center">
              <div className="text-xl font-bold">
                Toplam: {getTotalAmount().toFixed(2)} TL
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCart([])}
                  disabled={submitting}
                >
                  Sepeti Temizle
                </Button>
                <Button
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? 'Gönderiliyor...' : 'Siparişi Gönder'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SalesAgentWarehouseOrder;
