// Şeftali Tasarım Şablonu - Ortak Bileşenler ve Stiller
// Bu dosya müşteri ve plasiyer arayüzleri için tutarlı tasarım sağlar

import React from 'react';
import { Search, LogOut, Bell, ChevronRight } from 'lucide-react';

// Renk Paleti
export const colors = {
  primary: 'orange',
  primaryLight: 'orange-50',
  primaryMedium: 'orange-500',
  primaryDark: 'orange-600',
  secondary: 'slate',
  success: 'emerald',
  warning: 'amber',
  danger: 'red',
  info: 'sky',
};

// Sidebar Wrapper
export const SeftaliSidebar = ({ items, activeTab, setActiveTab, onLogout, userInitial, userName }) => (
  <aside className="w-56 bg-white border-r border-slate-200 flex flex-col fixed h-full z-30" data-testid="sidebar">
    {/* Logo */}
    <div className="p-4 border-b border-slate-200">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍑</span>
        <span className="text-xl font-bold text-slate-900">Seftali</span>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              isActive 
                ? 'bg-orange-500 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            data-testid={`nav-${item.id}`}>
            <Icon className="w-5 h-5" />
            {item.label}
            {item.badge > 0 && (
              <span className={`absolute right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                isActive ? 'bg-white text-orange-500' : 'bg-red-500 text-white'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>

    {/* User & Logout */}
    <div className="p-3 border-t border-slate-200">
      <div className="flex items-center gap-3 px-3 py-2 mb-2">
        <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
          {userInitial || 'U'}
        </div>
        <span className="text-sm font-medium text-slate-700 truncate">{userName || 'Kullanici'}</span>
      </div>
      <button onClick={onLogout} 
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
        data-testid="logout-btn">
        <LogOut className="w-5 h-5" />
        Cikis Yap
      </button>
    </div>
  </aside>
);

// Top Header
export const SeftaliHeader = ({ searchPlaceholder = 'Ara...', userName, userInitial, notificationCount = 0 }) => (
  <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input type="text" placeholder={searchPlaceholder}
        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
    <div className="flex items-center gap-4">
      {notificationCount > 0 && (
        <div className="relative">
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {notificationCount}
          </span>
          <button className="p-2 hover:bg-slate-100 rounded-full">
            <Bell className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
          {userInitial || 'U'}
        </div>
        <span className="text-sm font-medium text-slate-700">{userName || 'Kullanici'}</span>
      </div>
    </div>
  </header>
);

// Page Header
export const SeftaliPageHeader = ({ title, subtitle, rightContent }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {rightContent}
  </div>
);

// Stat Card
export const SeftaliStatCard = ({ title, value, subtitle, icon: Icon, gradient, onClick }) => (
  <button onClick={onClick}
    className={`${gradient} rounded-2xl p-4 text-white text-left w-full hover:opacity-95 transition-opacity`}>
    {Icon && (
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 opacity-80" />
        <p className="text-xs font-medium opacity-80">{title}</p>
      </div>
    )}
    {!Icon && <p className="text-xs font-medium opacity-80">{title}</p>}
    <p className="text-2xl font-bold mt-1">{value}</p>
    {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
  </button>
);

// Gradient presets
export const gradients = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  green: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  amber: 'bg-gradient-to-br from-amber-500 to-amber-600',
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  red: 'bg-gradient-to-br from-red-500 to-red-600',
  sky: 'bg-gradient-to-br from-sky-500 to-sky-600',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
};

// Info Card
export const SeftaliInfoCard = ({ title, children, className = '' }) => (
  <div className={`bg-white border border-slate-200 rounded-2xl p-4 ${className}`}>
    {title && <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>}
    {children}
  </div>
);

// Action Button
export const SeftaliButton = ({ children, variant = 'primary', size = 'md', icon: Icon, onClick, disabled, className = '' }) => {
  const variants = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-slate-200 text-slate-600 hover:bg-slate-50',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

// List Item
export const SeftaliListItem = ({ title, subtitle, rightContent, onClick, badge, className = '' }) => (
  <button onClick={onClick}
    className={`w-full bg-white border border-slate-200 rounded-2xl p-4 text-left hover:shadow-md transition-all ${className}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-900 truncate">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 ml-3">
        {badge && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
            {badge}
          </span>
        )}
        {rightContent}
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  </button>
);

// Empty State
export const SeftaliEmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
    {Icon && <Icon className="w-12 h-12 text-slate-300 mx-auto mb-3" />}
    <p className="text-slate-500 font-medium">{title}</p>
    {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

// Loading Spinner
export const SeftaliLoading = () => (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
  </div>
);

// Badge
export const SeftaliBadge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-sky-50 text-sky-700',
  };

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

// Mobile Bottom Navigation (for customer mobile view)
export const SeftaliBottomNav = ({ items, activeTab, setActiveTab }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 lg:hidden" data-testid="bottom-nav">
    <div className="max-w-lg mx-auto flex">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            className={`flex-1 flex flex-col items-center py-2 relative transition-colors ${
              isActive ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600'
            }`}
            data-testid={`nav-${item.id}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            {item.badge > 0 && (
              <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </nav>
);

export default {
  SeftaliSidebar,
  SeftaliHeader,
  SeftaliPageHeader,
  SeftaliStatCard,
  SeftaliInfoCard,
  SeftaliButton,
  SeftaliListItem,
  SeftaliEmptyState,
  SeftaliLoading,
  SeftaliBadge,
  SeftaliBottomNav,
  gradients,
  colors,
};
