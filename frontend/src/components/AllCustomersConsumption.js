import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, Users, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../services/api';

const AllCustomersConsumption = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomersConsumption();
  }, []);

  const fetchCustomersConsumption = async () => {
    try {
      setLoading(true);
      const response = await api.get('/seftali/sales/customers/summary');
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Sarfiyat verisi alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRate = (rate) => {
    if (!rate || rate === 0) return '-';
    if (rate >= 1) return `${rate.toFixed(1)}/gün`;
    return `1/${Math.round(1/rate)} gün`;
  };

  return (
    <Card data-testid="all-customers-consumption">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tüm Müşteriler - Sarfiyat Analizi
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Sarfiyat verisi bulunamadı</div>
        ) : (
          <div className="space-y-4">
            {customers.map((customer, index) => (
              <div
                key={customer.customer_id || index}
                className="border rounded-lg p-4"
                data-testid={`consumption-${customer.customer_id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <h3 className="font-semibold">{customer.name || 'Müşteri'}</h3>
                  </div>
                  <Badge variant={customer.trend === 'up' ? 'default' : 'secondary'}>
                    {customer.trend === 'up' ? (
                      <><ArrowUpRight className="h-3 w-3 mr-1" /> Artış</>
                    ) : (
                      <><ArrowDownRight className="h-3 w-3 mr-1" /> Düşüş</>
                    )}
                  </Badge>
                </div>

                {customer.top_products && customer.top_products.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {customer.top_products.slice(0, 6).map((product, pIndex) => (
                      <div 
                        key={pIndex}
                        className="flex items-center gap-2 bg-gray-50 rounded p-2 text-sm"
                      >
                        <Package className="h-3 w-3 text-gray-400" />
                        <span className="truncate flex-1">{product.name}</span>
                        <span className="text-gray-600 font-medium">
                          {formatRate(product.daily_rate)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Henüz sarfiyat verisi yok</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AllCustomersConsumption;
