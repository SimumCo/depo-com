// Plasiyer Kampanyalar Sayfası
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Tag } from 'lucide-react';
import { sfSalesAPI } from '../../services/seftaliApi';
import { toast } from 'sonner';
import { PageHeader, Loading } from '../ui/DesignSystem';

// Örnek kampanyalar (backend boşsa)
const defaultCampaigns = [
  {
    id: 'demo-1',
    type: 'discount',
    title: '1000 ml YY Edge Süt - Toplu Alım',
    product_name: '1000 ml Y.Yağlı Edge Süt',
    product_code: '1000_ML_YY_EDGE_SUT',
    min_qty: 360,
    normal_price: 40,
    campaign_price: 30,
    valid_until: '2026-03-15',
    status: 'active',
    description: '360 adet ve üzeri alımlarda birim fiyat 40 TL yerine 30 TL'
  },
  {
    id: 'demo-2',
    type: 'discount',
    title: '200 ml Ayran - Yüklü Alım',
    product_name: '200 ml Ayran',
    product_code: '200_ML_AYRAN',
    min_qty: 500,
    normal_price: 8,
    campaign_price: 6,
    valid_until: '2026-03-10',
    status: 'active',
    description: '500 adet ve üzeri alımlarda birim fiyat 8 TL yerine 6 TL'
  },
  {
    id: 'demo-3',
    type: 'gift',
    title: '10 kg YY Yoğurt Al, Ekşi Ayran Kazan',
    product_name: '10 kg Y.Yağlı Yoğurt',
    product_code: '10_KG_YY_YOGURT',
    min_qty: 20,
    normal_price: 100,
    campaign_price: 80,
    gift_product_name: '250 ml Ekşi Ayran',
    gift_qty: 12,
    gift_value: 400,
    valid_until: '2026-03-20',
    status: 'active',
    description: '20 adet alımda 12 adet 250 ml Ekşi Ayran hediye'
  }
];

// Ürün emojisi
const getProductEmoji = (code) => {
  if (code?.includes('SUT') || code?.includes('EDGE')) return '🥛';
  if (code?.includes('AYRAN')) return '🥤';
  if (code?.includes('YOGURT')) return '🥣';
  if (code?.includes('KAKAO')) return '🍫';
  return '📦';
};

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderModal, setOrderModal] = useState({ open: false, campaign: null });
  const [orderQty, setOrderQty] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campaignResp, customerResp] = await Promise.all([
          sfSalesAPI.getCampaigns(),
          sfSalesAPI.getCustomers()
        ]);
        
        setCampaigns(campaignResp.data?.data || defaultCampaigns);
        setCustomers(customerResp.data?.data || []);
      } catch (err) {
        console.error('Veri alınamadı:', err);
        setCampaigns(defaultCampaigns);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const expiredCampaigns = campaigns.filter(c => c.status === 'expired');
  const discountCampaigns = activeCampaigns.filter(c => c.type === 'discount');
  const giftCampaigns = activeCampaigns.filter(c => c.type === 'gift');

  const handleAddToOrder = (campaign) => {
    setOrderQty(campaign.min_qty);
    setSelectedCustomer(null);
    setOrderModal({ open: true, campaign });
  };

  const handleConfirmOrder = async () => {
    if (!selectedCustomer) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }
    
    const { campaign } = orderModal;
    
    try {
      setSubmitting(true);
      const resp = await sfSalesAPI.addCampaignToOrder({
        campaign_id: campaign.id,
        customer_id: selectedCustomer,
        qty: orderQty
      });
      
      if (resp.data?.success) {
        const totalPrice = orderQty * campaign.campaign_price;
        const savings = orderQty * (campaign.normal_price - campaign.campaign_price);
        
        toast.success(
          `${campaign.product_name} - ${orderQty} adet siparişe eklendi! ` +
          `Toplam: ${totalPrice.toLocaleString('tr-TR')} TL (${savings.toLocaleString('tr-TR')} TL tasarruf)`
        );
        setOrderModal({ open: false, campaign: null });
        setSelectedCustomer(null);
      } else {
        toast.error(resp.data?.message || 'İşlem başarısız');
      }
    } catch (err) {
      console.error('Kampanya ekleme hatası:', err);
      toast.error(err.response?.data?.detail || 'Kampanya siparişe eklenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  // Kampanya Kartı
  const CampaignCard = ({ campaign, isExpired = false }) => {
    const discountPercent = Math.round((1 - campaign.campaign_price / campaign.normal_price) * 100);
    const savings = campaign.min_qty * (campaign.normal_price - campaign.campaign_price);
    
    return (
      <div className={`bg-white rounded-2xl border-2 overflow-hidden ${
        isExpired ? 'border-slate-200 opacity-60' : 
        campaign.type === 'gift' ? 'border-purple-300' : 'border-emerald-300'
      }`}>
        <div className={`px-4 py-2 flex items-center justify-between ${
          isExpired ? 'bg-slate-100' :
          campaign.type === 'gift' ? 'bg-purple-500' : 'bg-emerald-500'
        }`}>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${isExpired ? 'text-slate-600' : 'text-white'}`}>
            {campaign.type === 'gift' ? '🎁 HEDİYELİ KAMPANYA' : '💰 MİKTAR İNDİRİMİ'}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            isExpired ? 'bg-slate-300 text-slate-600' : 'bg-white/20 text-white'
          }`}>
            {isExpired ? 'Sona Erdi' : `%${discountPercent} Avantaj`}
          </span>
        </div>

        <div className="p-4">
          <div className="flex gap-4 mb-4">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">
              {getProductEmoji(campaign.product_code)}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-sm leading-tight">{campaign.product_name}</h4>
              <p className="text-xs text-slate-500 mb-1">{campaign.product_code}</p>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                Min. {campaign.min_qty} adet
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Normal Birim Fiyat</span>
              <span className="text-sm text-slate-400 line-through">{campaign.normal_price} TL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-600 font-medium">Kampanya Birim Fiyat</span>
              <span className="text-xl font-bold text-emerald-600">{campaign.campaign_price} TL</span>
            </div>
          </div>

          {campaign.type === 'gift' && campaign.gift_product_name && (
            <div className="bg-purple-50 rounded-xl p-3 mb-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🎁</span>
                <span className="text-sm font-bold text-purple-700">HEDİYE</span>
              </div>
              <p className="text-sm text-purple-800 font-medium">
                {campaign.gift_qty} adet {campaign.gift_product_name}
              </p>
              <p className="text-xs text-purple-600">({campaign.gift_value} TL değerinde)</p>
            </div>
          )}

          {campaign.type === 'discount' && (
            <div className="bg-emerald-50 rounded-xl p-3 mb-3 border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-700">{campaign.min_qty} adet alımda tasarruf</span>
                <span className="text-lg font-bold text-emerald-700">{savings.toLocaleString('tr-TR')} TL</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-slate-400">Son: {new Date(campaign.valid_until).toLocaleDateString('tr-TR')}</span>
            {!isExpired && (
              <span className={`font-medium ${
                new Date(campaign.valid_until) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'text-red-500' : 'text-slate-500'
              }`}>
                {Math.ceil((new Date(campaign.valid_until) - new Date()) / (1000 * 60 * 60 * 24))} gün kaldı
              </span>
            )}
          </div>

          {!isExpired && (
            <button
              onClick={() => handleAddToOrder(campaign)}
              className={`w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                campaign.type === 'gift' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Siparişe Ekle
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6" data-testid="campaigns-page">
      <PageHeader title="Kampanyalar" subtitle="Ana Sayfa / Kampanyalar" />
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-600 mb-1">💰 Miktar İndirimi</p>
          <p className="text-2xl font-bold text-emerald-700">{discountCampaigns.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-600 mb-1">🎁 Hediyeli</p>
          <p className="text-2xl font-bold text-purple-700">{giftCampaigns.length}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-600 mb-1">⏰ Sona Eren</p>
          <p className="text-2xl font-bold text-slate-700">{expiredCampaigns.length}</p>
        </div>
      </div>

      {discountCampaigns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <span>💰</span> Miktar İndirimi Kampanyaları
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {discountCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </div>
      )}

      {giftCampaigns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
            <span>🎁</span> Hediyeli Kampanyalar
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {giftCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </div>
      )}

      {expiredCampaigns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">Sona Eren Kampanyalar</h3>
          <div className="grid grid-cols-2 gap-4">
            {expiredCampaigns.map(c => <CampaignCard key={c.id} campaign={c} isExpired />)}
          </div>
        </div>
      )}

      {activeCampaigns.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aktif kampanya bulunmuyor</p>
        </div>
      )}

      {/* Sipariş Modal */}
      {orderModal.open && orderModal.campaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Siparişe Ekle</h3>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{getProductEmoji(orderModal.campaign.product_code)}</span>
                <div>
                  <p className="font-bold text-slate-800">{orderModal.campaign.product_name}</p>
                  <p className="text-xs text-slate-500">{orderModal.campaign.product_code}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Kampanya Fiyatı:</span>
                <span className="font-bold text-emerald-600">{orderModal.campaign.campaign_price} TL/adet</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-2">Sipariş Adedi</label>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setOrderQty(Math.max(orderModal.campaign.min_qty, orderQty - 10))}
                  className="w-12 h-12 bg-slate-100 rounded-xl text-xl font-bold hover:bg-slate-200"
                >-</button>
                <input 
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Math.max(orderModal.campaign.min_qty, parseInt(e.target.value) || 0))}
                  className="flex-1 text-center text-2xl font-bold border border-slate-200 rounded-xl py-2"
                />
                <button 
                  onClick={() => setOrderQty(orderQty + 10)}
                  className="w-12 h-12 bg-slate-100 rounded-xl text-xl font-bold hover:bg-slate-200"
                >+</button>
              </div>
              <p className="text-xs text-orange-600 mt-1">Minimum: {orderModal.campaign.min_qty} adet</p>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">Toplam Tutar:</span>
                <span className="text-xl font-bold text-slate-800">
                  {(orderQty * orderModal.campaign.campaign_price).toLocaleString('tr-TR')} TL
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">Tasarruf:</span>
                <span className="font-bold text-emerald-600">
                  {(orderQty * (orderModal.campaign.normal_price - orderModal.campaign.campaign_price)).toLocaleString('tr-TR')} TL
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-2">Müşteri Seçin</label>
              <select
                value={selectedCustomer || ''}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm"
              >
                <option value="">-- Müşteri Seçin --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setOrderModal({ open: false, campaign: null })}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium"
              >
                İptal
              </button>
              <button 
                onClick={handleConfirmOrder}
                disabled={submitting || !selectedCustomer}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  submitting || !selectedCustomer ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-white'
                }`}
              >
                {submitting ? 'Ekleniyor...' : 'Siparişe Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
