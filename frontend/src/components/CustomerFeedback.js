import React, { useState, useEffect } from 'react';
import { feedbackAPI, catalogAPI } from '../services/api';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { MessageSquare, Star } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const CustomerFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    rating: 5,
    comment: '',
    is_defective: false,
    defect_description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [feedbackRes, productsRes] = await Promise.all([
        feedbackAPI.getMy(),
        catalogAPI.getAll()
      ]);
      setFeedbacks(feedbackRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await feedbackAPI.create(formData);
      toast.success('Geri bildiriminiz kaydedildi');
      setOpen(false);
      setFormData({
        product_id: '',
        rating: 5,
        comment: '',
        is_defective: false,
        defect_description: ''
      });
      loadData();
    } catch (error) {
      toast.error('Geri bildirim gönderilemedi');
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Geri Bildirimlerim</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-feedback-button">
              <MessageSquare className="mr-2 h-4 w-4" />
              Yeni Geri Bildirim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ürün Değerlendirmesi</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product_id">Ürün *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger data-testid="product-select">
                    <SelectValue placeholder="Ürün seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Puan *</Label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="focus:outline-none"
                      data-testid={`star-${star}`}
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= formData.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Yorumunuz</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Ürün hakkında düşünceleriniz..."
                  rows={3}
                  data-testid="comment-input"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_defective"
                  checked={formData.is_defective}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_defective: checked })}
                  data-testid="defective-checkbox"
                />
                <Label htmlFor="is_defective" className="cursor-pointer">
                  Ürün kusurlu/hasarlı
                </Label>
              </div>

              {formData.is_defective && (
                <div className="space-y-2">
                  <Label htmlFor="defect_description">Kusur Açıklaması</Label>
                  <Textarea
                    id="defect_description"
                    value={formData.defect_description}
                    onChange={(e) => setFormData({ ...formData, defect_description: e.target.value })}
                    placeholder="Lütfen kusuru detaylı açıklayın..."
                    rows={2}
                    data-testid="defect-description-input"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" data-testid="submit-feedback-button">Gönder</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Henüz geri bildiriminiz bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="border rounded-lg p-4 space-y-2"
                data-testid={`feedback-${feedback.id}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{feedback.product_name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {renderStars(feedback.rating)}
                      <span className="text-sm text-gray-500">
                        {format(new Date(feedback.created_at), 'dd MMM yyyy', { locale: tr })}
                      </span>
                    </div>
                  </div>
                  {feedback.is_defective && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                      Kusurlu Ürün
                    </span>
                  )}
                </div>
                {feedback.comment && (
                  <p className="text-gray-700">{feedback.comment}</p>
                )}
                {feedback.is_defective && feedback.defect_description && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-sm text-red-800">
                      <strong>Kusur:</strong> {feedback.defect_description}
                    </p>
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

export default CustomerFeedback;
