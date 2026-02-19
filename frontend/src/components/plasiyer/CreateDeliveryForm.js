// Plasiyer - Teslimat Oluşturma Formu
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader, Button } from '../ui/DesignSystem';

const CreateDeliveryForm = ({ 
  customers, 
  products, 
  onSubmit, 
  submitting 
}) => {
  const [customerId, setCustomerId] = useState('');
  const [deliveryType, setDeliveryType] = useState('route');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [items, setItems] = useState([{ product_id: '', qty: '' }]);

  const handleSubmit = () => {
    const validItems = items.filter(it => it.product_id && parseFloat(it.qty) > 0);
    onSubmit({
      customer_id: customerId,
      delivery_type: deliveryType,
      invoice_no: invoiceNo,
      items: validItems.map(it => ({ product_id: it.product_id, qty: parseFloat(it.qty) })),
    });
  };

  const addItem = () => {
    setItems([...items, { product_id: '', qty: '' }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  return (
    <div className="space-y-6" data-testid="create-delivery">
      <PageHeader 
        title="Yeni Teslimat"
        subtitle="Ana Sayfa / Teslimat Olustur"
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        {/* Customer Select */}
        <FormField label="Musteri">
          <select 
            value={customerId} 
            onChange={e => setCustomerId(e.target.value)} 
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Musteri secin...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FormField>

        {/* Type & Invoice */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Teslimat Tipi">
            <select 
              value={deliveryType} 
              onChange={e => setDeliveryType(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="route">Rut</option>
              <option value="off_route">Rut Disi</option>
            </select>
          </FormField>
          <FormField label="Fatura No">
            <input 
              type="text" 
              value={invoiceNo} 
              onChange={e => setInvoiceNo(e.target.value)} 
              placeholder="FTR-XXX" 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
            />
          </FormField>
        </div>

        {/* Products */}
        <FormField label="Urunler">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-3 mb-2">
              <select 
                value={item.product_id} 
                onChange={e => updateItem(idx, 'product_id', e.target.value)} 
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Urun sec...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
              <input 
                type="number" 
                min="1" 
                placeholder="Adet" 
                value={item.qty} 
                onChange={e => updateItem(idx, 'qty', e.target.value)} 
                className="w-28 px-4 py-3 border border-slate-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
              />
            </div>
          ))}
          <button 
            onClick={addItem} 
            className="text-sm text-orange-600 hover:text-orange-700 font-medium mt-2 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Urun Ekle
          </button>
        </FormField>

        {/* Submit */}
        <Button 
          onClick={handleSubmit} 
          disabled={submitting || !customerId} 
          variant="primary"
          className="w-full"
        >
          {submitting ? 'Kaydediliyor...' : 'Teslimati Kaydet'}
        </Button>
      </div>
    </div>
  );
};

// Form Field Component
const FormField = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
    {children}
  </div>
);

export default CreateDeliveryForm;
export { FormField };
