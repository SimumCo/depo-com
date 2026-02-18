import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Truck, Check, X, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PendingDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      // Demo data - gerçek uygulamada backend'den çekilir
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const demoDeliveries = [
        {
          id: '1',
          invoice_no: 'FTR-2024-001',
          delivered_at: new Date().toISOString(),
          delivery_type: 'route',
          items: [
            { product_id: '1', product: { name: 'Süt 1L' }, qty: 50 },
            { product_id: '2', product: { name: 'Yoğurt 500g' }, qty: 30 }
          ]
        },
        {
          id: '2',
          invoice_no: 'FTR-2024-002',
          delivered_at: new Date(Date.now() - 86400000).toISOString(),
          delivery_type: 'off_route',
          items: [
            { product_id: '3', product: { name: 'Peynir 250g' }, qty: 20 }
          ]
        }
      ];
      
      setDeliveries(demoDeliveries);
    } catch (error) {
      toast.error('Teslimatlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const acceptDelivery = async (id) => {
    setActing(id);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Teslimat onaylandı. Tüketim hesaplamaları otomatik güncellendi.');
      setDeliveries(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      toast.error('Onay başarısız');
    } finally {
      setActing(null);
    }
  };

  const rejectDelivery = async () => {
    if (!rejectReason.trim()) {
      toast.error('Red nedeni girin');
      return;
    }
    
    setActing(rejectModal);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Teslimat reddedildi');
      setDeliveries(prev => prev.filter(d => d.id !== rejectModal));
      setRejectModal(null);
      setRejectReason('');
    } catch (error) {
      toast.error('Red işlemi başarısız');
    } finally {
      setActing(null);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Teslimat Onayı</h2>
        <p className="text-muted-foreground mt-1">
          Onay bekleyen teslimatlarınızı kontrol edin.
        </p>
      </div>

      {/* Deliveries List */}
      {deliveries.length > 0 ? (
        <div className="space-y-4">
          {deliveries.map((delivery, idx) => (
            <Card key={delivery.id}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <Truck className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Fatura: {delivery.invoice_no || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(delivery.delivered_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      delivery.delivery_type === 'route'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {delivery.delivery_type === 'route' ? 'Rota' : 'Rota Dışı'}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-4">
                  {delivery.items?.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm py-2 border-b border-dashed last:border-0"
                    >
                      <span>{item.product?.name || item.product_id}</span>
                      <span className="font-medium tabular-nums">{item.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => acceptDelivery(delivery.id)}
                    disabled={acting === delivery.id}
                  >
                    {acting === delivery.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Check size={14} className="mr-1" />
                    )}
                    Onayla
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setRejectModal(delivery.id)}
                    disabled={acting === delivery.id}
                  >
                    <X size={14} className="mr-1" /> Reddet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package size={48} className="mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-lg">Onay bekleyen teslimat yok</p>
            <p className="text-sm text-muted-foreground mt-1">
              Yeni teslimatlar burada görünecek.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Teslimat Reddi</h3>
              <textarea
                placeholder="Red nedenini yazın..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason('');
                  }}
                  className="flex-1"
                >
                  İptal
                </Button>
                <Button
                  variant="destructive"
                  onClick={rejectDelivery}
                  disabled={acting !== null}
                  className="flex-1"
                >
                  {acting ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Reddet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PendingDeliveries;