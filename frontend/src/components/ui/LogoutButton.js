import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './button';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LogoutButton = ({ className = '' }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="text-right">
        <p className="text-sm font-medium">{user?.full_name}</p>
        <p className="text-xs text-white/80">{user?.role}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="bg-white/10 hover:bg-white/20 text-white border-white/30"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Çıkış Yap
      </Button>
    </div>
  );
};

export default LogoutButton;
