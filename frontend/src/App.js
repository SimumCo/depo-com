import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import WarehouseManagerDashboard from './pages/WarehouseManagerDashboard';
import WarehouseStaffDashboard from './pages/WarehouseStaffDashboard';
import SalesRepDashboard from './pages/SalesRepDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import AccountingDashboard from './pages/AccountingDashboard';
import SalesAgentDashboard from './pages/SalesAgentDashboard';
import PlasiyerDashboard from './pages/PlasiyerDashboard';
import './App.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'warehouse_manager':
      return <WarehouseManagerDashboard />;
    case 'warehouse_staff':
      return <WarehouseStaffDashboard />;
    case 'sales_rep':
      return <SalesRepDashboard />;
    case 'customer':
      return <CustomerDashboard />;
    case 'accounting':
      return <AccountingDashboard />;
    case 'sales_agent':
      return <PlasiyerDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse-manager/*"
            element={
              <ProtectedRoute allowedRoles={['warehouse_manager']}>
                <WarehouseManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse-staff/*"
            element={
              <ProtectedRoute allowedRoles={['warehouse_staff']}>
                <WarehouseStaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-rep/*"
            element={
              <ProtectedRoute allowedRoles={['sales_rep']}>
                <SalesRepDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plasiyer/*"
            element={
              <ProtectedRoute allowedRoles={['sales_agent']}>
                <PlasiyerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/*"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
