import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { toast } from 'sonner';
import { Package, Warehouse } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      toast.success('Giriş başarılı!');
      navigate('/');
    } else {
      toast.error(result.error || 'Giriş başarısız');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl" data-testid="login-card">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-blue-600 p-3 rounded-full">
              <Warehouse className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Dağıtım Yönetim Sistemi</CardTitle>
          <CardDescription className="text-base">
            Hesabınıza giriş yapın
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                type="text"
                placeholder="Kullanıcı adınızı girin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid="username-input"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="Şifrenizi girin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="h-11"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={loading}
              data-testid="login-button"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </CardFooter>
        </form>
        <div className="px-6 pb-6">
          <div className="text-center text-sm text-gray-600">
            <p className="font-medium mb-2">Demo Hesaplar:</p>
            <div className="space-y-1 text-xs bg-gray-50 p-3 rounded-md">
              <p><strong>Admin:</strong> admin / admin123</p>
              <p><strong>Depo Müdürü:</strong> manager / manager123</p>
              <p><strong>Depo Personeli:</strong> staff / staff123</p>
              <p><strong>Satış Temsilcisi:</strong> salesrep / salesrep123</p>
              <p><strong>Müşteri (Hotel):</strong> customer1 / customer123</p>
              <p><strong>Müşteri (Market):</strong> customer2 / customer123</p>
              <p><strong>Muhasebe:</strong> muhasebe / muhasebe123</p>
              <p><strong>Plasiyer:</strong> plasiyer / plasiyer123</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
