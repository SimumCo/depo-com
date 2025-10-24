import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { Upload, FileText, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const InvoiceUpload = ({ onInvoiceCreated }) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    supplier_name: '',
    supplier_tax_id: '',
    subtotal: 0,
    vat_total: 0,
    total_amount: 0,
    notes: ''
  });
  const [items, setItems] = useState([{
    product_name: '',
    quantity: '',
    unit: 'Adet',
    unit_price: '',
    total_price: 0,
    vat_rate: 20,
    vat_amount: 0
  }]);

  const addItem = () => {
    setItems([...items, {
      product_name: '',
      quantity: '',
      unit: 'Adet',
      unit_price: '',
      total_price: 0,
      vat_rate: 20,
      vat_amount: 0
    }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    
    // Calculate totals
    if (field === 'quantity' || field === 'unit_price' || field === 'vat_rate') {
      const quantity = parseFloat(updated[index].quantity) || 0;
      const unitPrice = parseFloat(updated[index].unit_price) || 0;
      const vatRate = parseFloat(updated[index].vat_rate) || 0;
      
      const subtotal = quantity * unitPrice;
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;
      
      updated[index].total_price = total;
      updated[index].vat_amount = vatAmount;
    }
    
    setItems(updated);
    calculateTotals(updated);
  };

  const calculateTotals = (itemsList) => {
    const subtotal = itemsList.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);
    
    const vatTotal = itemsList.reduce((sum, item) => sum + (item.vat_amount || 0), 0);
    const total = subtotal + vatTotal;
    
    setFormData({
      ...formData,
      subtotal: subtotal,
      vat_total: vatTotal,
      total_amount: total
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        invoice_date: new Date(formData.invoice_date).toISOString(),
        items: items.map(item => ({
          product_name: item.product_name,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unit_price: parseFloat(item.unit_price),
          total_price: item.total_price,
          vat_rate: parseFloat(item.vat_rate),
          vat_amount: item.vat_amount
        }))
      };

      await axios.post(`${BACKEND_URL}/api/invoices`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Fatura başarıyla kaydedildi');
      setOpen(false);
      resetForm();
      if (onInvoiceCreated) onInvoiceCreated();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fatura kaydedilemedi');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      invoice_date: '',
      supplier_name: '',
      supplier_tax_id: '',
      subtotal: 0,
      vat_total: 0,
      total_amount: 0,
      notes: ''
    });
    setItems([{
      product_name: '',
      quantity: '',
      unit: 'Adet',
      unit_price: '',
      total_price: 0,
      vat_rate: 20,
      vat_amount: 0
    }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="add-invoice-button">
          <Plus className="mr-2 h-4 w-4" />
          Fatura Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fatura Bilgilerini Girin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Fatura No *</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                required
                data-testid="invoice-number-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Fatura Tarihi *</Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                required
                data-testid="invoice-date-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_name">Tedarikçi Adı</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_tax_id">Vergi No</Label>
              <Input
                id="supplier_tax_id"
                value={formData.supplier_tax_id}
                onChange={(e) => setFormData({ ...formData, supplier_tax_id: e.target.value })}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Ürünler</Label>
              <Button type="button" size="sm" onClick={addItem}>
                + Ürün Ekle
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Ürün {index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Ürün Adı *</Label>
                    <Input
                      value={item.product_name}
                      onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                      required
                      placeholder="Örn: Altus Su Sebili"
                    />
                  </div>
                  <div>
                    <Label>Miktar *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Birim</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Birim Fiyat *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>KDV Oranı (%)</Label>
                    <Input
                      type="number"
                      value={item.vat_rate}
                      onChange={(e) => updateItem(index, 'vat_rate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-sm">
                    <strong>Toplam:</strong> {item.total_price.toFixed(2)} TL
                    (KDV: {item.vat_amount.toFixed(2)} TL)
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Ara Toplam:</span>
              <span className="font-semibold">{formData.subtotal.toFixed(2)} TL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>KDV Toplamı:</span>
              <span className="font-semibold">{formData.vat_total.toFixed(2)} TL</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Genel Toplam:</span>
              <span className="text-blue-600">{formData.total_amount.toFixed(2)} TL</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Sipariş no, vb."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={uploading} data-testid="save-invoice-button">
              {uploading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceUpload;
