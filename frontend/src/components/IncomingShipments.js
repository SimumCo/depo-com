import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Truck, Package, Calendar, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const IncomingShipments = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedShipment, setExpandedShipment] = useState(null);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      // Simüle edilmiş sevkiyat verileri
      const mockShipments = [
        {
          id: 'SHP001',
          supplier: 'Merkez Depo',
          expected_date: '2026-02-27',
          status: 'transit',
          items: [
            { product_name: '200 ML AYRAN', qty: 480 },
            { product_name: '1000 ML AYRAN', qty: 120 },
            { product_name: '750 GR YOGURT', qty: 96 },
          ]
        },
        {
          id: 'SHP002',
          supplier: 'Üretim Tesisi',
          expected_date: '2026-02-28',
          status: 'pending',
          items: [
            { product_name: '180 ml KAKAOLU SUT 6LI', qty: 200 },
            { product_name: '180 ml ÇİLEKLİ SUT 6LI', qty: 150 },
          ]
        },
        {
          id: 'SHP003',
          supplier: 'Bölge Deposu',
          expected_date: '2026-02-26',
          status: 'arrived',
          items: [
            { product_name: 'KAŞAR PEYNİR 600GR', qty: 50 },
          ]
        },
      ];
      setShipments(mockShipments);
    } catch (error) {
      console.error('Sevkiyat verisi alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const processShipment = async (shipmentId) => {
    try {
      toast.success(`Sevkiyat ${shipmentId} işlendi`);
      setShipments(prev => prev.map(s => 
        s.id === shipmentId ? { ...s, status: 'processed' } : s
      ));
    } catch (error) {
      toast.error('Sevkiyat işlenemedi');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Beklemede</Badge>;
      case 'transit':
        return <Badge variant="default" className="bg-blue-500"><Truck className="h-3 w-3 mr-1" />Yolda</Badge>;
      case 'arrived':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ulaştı</Badge>;
      case 'processed':
        return <Badge variant="outline"><CheckCircle className="h-3 w-3 mr-1" />İşlendi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card data-testid="incoming-shipments">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Gelen Sevkiyatlar
          </div>
          <Badge variant="secondary">{shipments.length} Sevkiyat</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Bekleyen sevkiyat yok</div>
        ) : (
          <div className="space-y-3">
            {shipments.map((shipment) => (
              <div
                key={shipment.id}
                className="border rounded-lg p-4"
                data-testid={`shipment-${shipment.id}`}
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedShipment(expandedShipment === shipment.id ? null : shipment.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{shipment.id}</h3>
                      {getStatusBadge(shipment.status)}
                    </div>
                    <p className="text-sm text-gray-500">{shipment.supplier}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {shipment.expected_date}
                      </div>
                      <p className="text-xs text-gray-400">{shipment.items.length} ürün</p>
                    </div>
                    {expandedShipment === shipment.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {expandedShipment === shipment.id && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      Ürünler
                    </h4>
                    <div className="space-y-2">
                      {shipment.items.map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded"
                        >
                          <span className="text-sm">{item.product_name}</span>
                          <span className="font-medium">{item.qty} adet</span>
                        </div>
                      ))}
                    </div>
                    
                    {shipment.status === 'arrived' && (
                      <Button 
                        className="w-full mt-3"
                        onClick={() => processShipment(shipment.id)}
                        data-testid={`process-${shipment.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Sevkiyatı İşle
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IncomingShipments;
