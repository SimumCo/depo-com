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
            <p className="font-semibold mb-3 text-base">🎭 Demo Hesapları</p>
            <div className="space-y-1 text-xs bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200 max-h-80 overflow-y-auto">
              <div className="grid grid-cols-1 gap-1">
                {/* Yönetim */}
                <div className="bg-white rounded p-2 border-l-4 border-purple-500">
                  <p className="font-bold text-purple-700 mb-1">👑 Yönetim</p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Admin:</span>
                    <span className="font-mono text-blue-600">admin / admin123</span>
                  </p>
                </div>

                {/* Üretim */}
                <div className="bg-white rounded p-2 border-l-4 border-blue-500">
                  <p className="font-bold text-blue-700 mb-1">🏭 Üretim</p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Üretim Müdürü:</span>
                    <span className="font-mono text-blue-600">uretim_muduru / uretim123</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Operatör:</span>
                    <span className="font-mono text-blue-600">operator1 / operator123</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Kalite Kontrol:</span>
                    <span className="font-mono text-blue-600">kalite_kontrol / kalite123</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">AR-GE:</span>
                    <span className="font-mono text-blue-600">arge_muhendis / arge123</span>
                  </p>
                </div>

                {/* Bakım */}
                <div className="bg-white rounded p-2 border-l-4 border-orange-500">
                  <p className="font-bold text-orange-700 mb-1">🔧 Bakım</p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Teknisyen:</span>
                    <span className="font-mono text-blue-600">bakim_teknisyeni / bakim123</span>
                  </p>
                </div>

                {/* Depo */}
                <div className="bg-white rounded p-2 border-l-4 border-green-500">
                  <p className="font-bold text-green-700 mb-1">📦 Depo</p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Depo Müdürü:</span>
                    <span className="font-mono text-blue-600">depo_muduru / depo123</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Depo Sorumlusu:</span>
                    <span className="font-mono text-blue-600">depo_sorumlu / depo123</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Depo Personeli:</span>
                    <span className="font-mono text-blue-600">depo_personel / depo123</span>
                  </p>
                </div>

                {/* Satış */}
                <div className="bg-white rounded p-2 border-l-4 border-yellow-500">
                  <p className="font-bold text-yellow-700 mb-1">💼 Satış</p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Satış Temsilcisi:</span>
                    <span className="font-mono text-blue-600">satis_temsilci / satis123</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Plasiyer:</span>
                    <span className="font-mono text-blue-600">plasiyer1 / plasiyer123</span>
                  </p>
                </div>

                {/* Muhasebe */}
                <div className="bg-white rounded p-2 border-l-4 border-red-500">
                  <p className="font-bold text-red-700 mb-1">💰 Muhasebe</p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Muhasebe:</span>
                    <span className="font-mono text-blue-600">muhasebe / muhasebe123</span>
                  </p>
                </div>

                {/* Müşteri */}
                <div className="bg-white rounded p-2 border-l-4 border-pink-500">
                  <p className="font-bold text-pink-700 mb-1">👥 Müşteri</p>
                  <p className="flex items-center justify-between">
                    <span className="text-gray-600">Müşteri:</span>
                    <span className="font-mono text-blue-600">musteri1 / musteri123</span>
                  </p>
                </div>
              </div>
              <p className="text-blue-600 font-medium pt-2 border-t border-gray-300 mt-2">
                💡 13 farklı rol ve panel • Her rol farklı yetkiler
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
