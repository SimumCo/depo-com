import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, Calendar, Tag, Users } from 'lucide-react';
import { campaignAPI } from '../../services/api';

const CampaignManagement = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    start_date: '',
    end_date: '',
    customer_groups: ['all'],
    is_active: true
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignAPI.getAll();
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCampaign) {
        await campaignAPI.update(editingCampaign.id, formData);
      } else {
        await campaignAPI.create(formData);
      }
      setDialogOpen(false);
      resetForm();
      loadCampaigns();
    } catch (error) {
      console.error('Failed to save campaign:', error);
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      discount_type: campaign.discount_type,
      discount_value: campaign.discount_value,
      start_date: new Date(campaign.start_date).toISOString().slice(0, 16),
      end_date: new Date(campaign.end_date).toISOString().slice(0, 16),
      customer_groups: campaign.customer_groups,
      is_active: campaign.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Kampanyayı devre dışı bırakmak istediğinizden emin misiniz?')) return;
    try {
      await campaignAPI.delete(id);
      loadCampaigns();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      if (isActive) {
        await campaignAPI.delete(id);
      } else {
        await campaignAPI.activate(id);
      }
      loadCampaigns();
    } catch (error) {
      console.error('Failed to toggle campaign:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      start_date: '',
      end_date: '',
      customer_groups: ['all'],
      is_active: true
    });
    setEditingCampaign(null);
  };

  const isActive = (campaign) => {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    return campaign.is_active && start <= now && end >= now;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kampanya Yönetimi</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kampanya
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? 'Kampanya Düzenle' : 'Yeni Kampanya Oluştur'}</DialogTitle>
              <DialogDescription>
                Kampanya bilgilerini girin ve kaydedin.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Kampanya Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="discount_type">İndirim Tipi *</Label>
                  <Select value={formData.discount_type} onValueChange={(v) => setFormData({...formData, discount_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Yüzde (%)</SelectItem>
                      <SelectItem value="fixed_amount">Sabit Tutar (TL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="discount_value">İndirim Değeri *</Label>
                  <Input
                    id="discount_value"
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Başlangıç Tarihi *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Bitiş Tarihi *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="customer_groups">Müşteri Grubu *</Label>
                  <Select value={formData.customer_groups[0]} onValueChange={(v) => setFormData({...formData, customer_groups: [v]})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Müşteriler</SelectItem>
                      <SelectItem value="vip">VIP Müşteriler</SelectItem>
                      <SelectItem value="regular">Normal Müşteriler</SelectItem>
                      <SelectItem value="new">Yeni Müşteriler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">Kaydet</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                {isActive(campaign) ? (
                  <Badge variant="success" className="bg-green-500">Aktif</Badge>
                ) : campaign.is_active ? (
                  <Badge variant="warning" className="bg-yellow-500">Planlı</Badge>
                ) : (
                  <Badge variant="secondary">Pasif</Badge>
                )}
              </div>
              <CardDescription>{campaign.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {campaign.discount_type === 'percentage' 
                      ? `${campaign.discount_value}% İndirim` 
                      : `${campaign.discount_value} TL İndirim`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(campaign.start_date).toLocaleDateString('tr-TR')} - {new Date(campaign.end_date).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm capitalize">
                    {campaign.customer_groups.map(g => 
                      g === 'all' ? 'Tüm Müşteriler' : 
                      g === 'vip' ? 'VIP' : 
                      g === 'regular' ? 'Normal' : 'Yeni'
                    ).join(', ')}
                  </span>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(campaign)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Düzenle
                  </Button>
                  <Button 
                    size="sm" 
                    variant={campaign.is_active ? "destructive" : "default"}
                    onClick={() => handleToggleActive(campaign.id, campaign.is_active)}
                  >
                    {campaign.is_active ? 'Devre Dışı' : 'Aktif Et'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CampaignManagement;
