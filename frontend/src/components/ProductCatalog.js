import React, { useState, useEffect } from 'react';
import { catalogAPI, ordersAPI, salesRepAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { ShoppingCart, Package, Plus, Minus } from 'lucide-react';

const ProductCatalog = ({ isSalesRep = false, onOrderCreated, onUpdate }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    loadProducts();
    if (isSalesRep) {
      loadCustomers();
    }
  }, [isSalesRep]);

  const loadProducts = async () => {
    try {
      const response = await catalogAPI.getAll();
      // Sadece aktif ve stokta olan ürünleri göster
      const availableProducts = response.data.filter(product => 
        product.is_active === true && (product.stock_quantity || 0) > 0
      );
      setProducts(availableProducts);
    } catch (error) {
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await salesRepAPI.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      toast.error('Müşteriler yüklenemedi');
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, units: item.units + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        units: 1,
        unit_price: product.price,
        units_per_case: product.units_per_case
      }]);
    }
    toast.success(`${product.name} sepete eklendi`);
  };

  const updateCartQuantity = (productId, change) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newUnits = Math.max(1, item.units + change);
        return { ...item, units: newUnits };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.units * item.unit_price), 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Sepetiniz boş');
      return;
    }
    if (isSalesRep && !selectedCustomer) {
      toast.error('Lütfen müşteri seçin');
      return;
    }
    setOrderDialogOpen(true);
  };

  const confirmOrder = async () => {
    try {
      const orderProducts = cart.map(item => ({
        product_id: item.product_id,
        units: item.units,
        cases: Math.floor(item.units / item.units_per_case),
        unit_price: item.unit_price,
        total_price: item.units * item.unit_price
      }));

      const orderData = {
        customer_id: isSalesRep ? selectedCustomer : user.id,
        channel_type: user.channel_type,
        products: orderProducts
      };

      if (isSalesRep) {
        await salesRepAPI.createOrder(orderData);
      } else {
        await ordersAPI.create(orderData);
      }

      toast.success('Sipariş başarıyla oluşturuldu');
      setCart([]);
      setOrderDialogOpen(false);
      setSelectedCustomer('');
      if (onOrderCreated) onOrderCreated();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Sipariş oluşturulamadı');
    }
  };

  return (
    <div className="space-y-6">
      {/* Shopping Cart Summary */}
      {cart.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">
                  Sepetinizde {cart.length} ürün var
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-lg font-bold text-blue-900">
                  {calculateTotal().toFixed(2)} TL
                </span>
                <Button onClick={handleCheckout} data-testid="checkout-button">
                  Siparişi Tamamla
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Ürün Kataloğu</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow" data-testid={`product-card-${product.sku}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.sku}</p>
                      </div>
                      {product.in_stock ? (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          Stokta
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Stokta Yok</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-600">Kategori:</span> {product.category}</p>
                      <p><span className="text-gray-600">Ağırlık:</span> {product.weight} kg</p>
                      <p><span className="text-gray-600">Koli/Birim:</span> {product.units_per_case}</p>
                      <p><span className="text-gray-600">Mevcut:</span> {product.available_cases} koli</p>
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-blue-600">
                          {product.price.toFixed(2)} TL
                        </span>
                        <span className="text-sm text-gray-500">/ adet</span>
                      </div>
                      
                      {(() => {
                        const inCart = cart.find(item => item.product_id === product.id);
                        return inCart ? (
                          <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
                            <Button
                              onClick={() => updateCartQuantity(product.id, -1)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-semibold text-blue-900 px-4">
                              {inCart.units} adet
                            </span>
                            <Button
                              onClick={() => updateCartQuantity(product.id, 1)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => addToCart(product)}
                            disabled={!product.in_stock}
                            size="sm"
                            className="w-full"
                            data-testid={`add-to-cart-${product.sku}`}
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Sepete Ekle
                          </Button>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Siparişi Onayla</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isSalesRep && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Müşteri Seçin *</label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger data-testid="customer-select">
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.full_name} ({customer.customer_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold">Sipariş Detayları</h4>
              <div className="border rounded-lg divide-y">
                {cart.map((item) => (
                  <div key={item.product_id} className="p-3 flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-gray-600">
                        {item.units} birim x {item.unit_price.toFixed(2)} TL
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.product_id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-semibold">{item.units}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.product_id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        Kaldır
                      </Button>
                    </div>
                    <p className="ml-4 font-bold w-24 text-right">
                      {(item.units * item.unit_price).toFixed(2)} TL
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Toplam:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {calculateTotal().toFixed(2)} TL
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={confirmOrder} data-testid="confirm-order-button">
                Siparişi Onayla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCatalog;
