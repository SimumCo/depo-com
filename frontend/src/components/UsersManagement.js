import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Key, UserCheck, UserX, Users as UsersIcon } from 'lucide-react';
import api from '../services/api';

const ROLES = [
  { value: 'admin', label: 'Yönetici' },
  { value: 'warehouse_manager', label: 'Depo Müdürü' },
  { value: 'warehouse_staff', label: 'Depo Personeli' },
  { value: 'sales_rep', label: 'Satış Temsilcisi' },
  { value: 'sales_agent', label: 'Plasiyer' },
  { value: 'customer', label: 'Müşteri' },
  { value: 'accounting', label: 'Muhasebe' }
];

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPasswordData, setNewPasswordData] = useState({ new_password: '', confirm_password: '' });
  const [editFormData, setEditFormData] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'customer',
    is_active: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditFormData({
      id: user.id,
      username: user.username,
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active,
      address: user.address || '',
      customer_number: user.customer_number || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const { id, ...updateData } = editFormData;
      await api.put(`/users/${id}`, updateData);
      toast.success('Kullanıcı güncellendi');
      setEditDialogOpen(false);
      setEditFormData(null);
      loadUsers();
    } catch (error) {
      toast.error('Kullanıcı güncellenemedi: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteUserFromDialog = async () => {
    if (!editFormData) return;
    
    if (window.confirm(`⚠️ DİKKAT: "${editFormData.username}" kullanıcısını KALICI OLARAK silmek istediğinizden emin misiniz?\n\nBu işlem GERİ DÖNDÜRÜLEMEZ!`)) {
      if (window.confirm(`Son onay: "${editFormData.username}" kullanıcısı veritabanından tamamen silinecek. Devam etmek istiyor musunuz?`)) {
        try {
          await api.delete(`/users/${editFormData.id}/permanent`);
          toast.success('Kullanıcı kalıcı olarak silindi');
          setEditDialogOpen(false);
          setEditFormData(null);
          loadUsers();
        } catch (error) {
          toast.error('Kullanıcı silinemedi: ' + (error.response?.data?.detail || error.message));
        }
      }
    }
  };

  const handleChangePassword = (user) => {
    setPasswordUser(user);
    setNewPasswordData({ new_password: '', confirm_password: '' });
  };

  const handlePasswordSubmit = async () => {
    if (newPasswordData.new_password !== newPasswordData.confirm_password) {
      toast.error('Şifreler eşleşmiyor!');
      return;
    }

    if (newPasswordData.new_password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }

    try {
      await api.put(`/users/${passwordUser.id}/password`, {
        new_password: newPasswordData.new_password
      });
      toast.success('Şifre değiştirildi');
      setPasswordUser(null);
      setNewPasswordData({ new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error('Şifre değiştirilemedi: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Fonksiyonlar kaldırıldı - artık popup içinden yapılıyor


  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (newUserData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }

    try {
      await api.post('/users/create', newUserData);
      toast.success('Kullanıcı oluşturuldu');
      setCreateDialogOpen(false);
      setNewUserData({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
        role: 'customer',
        is_active: true
      });
      loadUsers();
    } catch (error) {
      toast.error('Kullanıcı oluşturulamadı: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getRoleLabel = (role) => {
    const roleObj = ROLES.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5" />
          Kullanıcı Yönetimi
        </CardTitle>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Kullanıcı
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_username">Kullanıcı Adı *</Label>
                  <Input
                    id="new_username"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">Şifre *</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_full_name">Ad Soyad</Label>
                  <Input
                    id="new_full_name"
                    value={newUserData.full_name}
                    onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_role">Rol *</Label>
                  <Select value={newUserData.role} onValueChange={(val) => setNewUserData({ ...newUserData, role: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_email">E-posta</Label>
                  <Input
                    id="new_email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_phone">Telefon</Label>
                  <Input
                    id="new_phone"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">Oluştur</Button>
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
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı Adı</TableHead>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    {editingUser === user.id && editFormData ? (
                      <>
                        <TableCell>
                          <Input
                            value={editFormData.username}
                            onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editFormData.full_name}
                            onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                            className="w-48"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            className="w-48"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={editFormData.role} onValueChange={(val) => setEditFormData({ ...editFormData, role: val })}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(role => (
                                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={editFormData.is_active ? 'true' : 'false'} 
                            onValueChange={(val) => setEditFormData({ ...editFormData, is_active: val === 'true' })}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Aktif</SelectItem>
                              <SelectItem value="false">Pasif</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleUpdateUser(user.id)} className="bg-green-600 hover:bg-green-700">
                              Kaydet
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              İptal
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <Badge variant="outline">{user.username}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>
                          <Badge>{getRoleLabel(user.role)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'secondary'}>
                            {user.is_active ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(user)}
                              title="Düzenle"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChangePassword(user)}
                              title="Şifre Değiştir"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            {user.is_active ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                  title="Devre Dışı Bırak"
                                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handlePermanentDeleteUser(user.id, user.username)}
                                  title="Kalıcı Sil"
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleActivateUser(user.id, user.username)}
                                  title="Aktif Et"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handlePermanentDeleteUser(user.id, user.username)}
                                  title="Kalıcı Sil"
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Password Change Dialog */}
        {passwordUser && (
          <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Şifre Değiştir: {passwordUser.username}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_pass">Yeni Şifre</Label>
                  <Input
                    id="new_pass"
                    type="password"
                    value={newPasswordData.new_password}
                    onChange={(e) => setNewPasswordData({ ...newPasswordData, new_password: e.target.value })}
                    placeholder="En az 6 karakter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_pass">Şifre Tekrar</Label>
                  <Input
                    id="confirm_pass"
                    type="password"
                    value={newPasswordData.confirm_password}
                    onChange={(e) => setNewPasswordData({ ...newPasswordData, confirm_password: e.target.value })}
                    placeholder="Şifreyi tekrar girin"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPasswordUser(null)}>
                    İptal
                  </Button>
                  <Button onClick={handlePasswordSubmit} className="bg-blue-600 hover:bg-blue-700">
                    Şifreyi Değiştir
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default UsersManagement;
