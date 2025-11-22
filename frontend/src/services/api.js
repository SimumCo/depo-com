import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Products API
export const productsAPI = {
  getAll: (params = {}) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  update: (data) => api.put('/inventory/update', data),
};

// Shipments API
export const shipmentsAPI = {
  getIncoming: () => api.get('/shipments/incoming'),
  createIncoming: (data) => api.post('/shipments/incoming', data),
  processIncoming: (id) => api.put(`/shipments/incoming/${id}/process`),
};

// Orders API
export const ordersAPI = {
  getAll: (params = {}) => api.get('/orders', { params }),
  getLast: () => api.get('/orders/last'),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  reorder: (orderId) => api.post(`/orders/reorder/${orderId}`),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, null, { params: { status } }),
  // Saved Cart
  getSavedCart: () => api.get('/orders/saved-cart/current'),
  saveCart: (data) => api.post('/orders/saved-cart', data),
  deleteSavedCart: () => api.delete('/orders/saved-cart'),
};

// Favorites API
export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (productId) => api.post('/favorites', { product_id: productId }),
  remove: (productId) => api.delete(`/favorites/${productId}`),
  toggle: (productId) => api.post(`/favorites/toggle/${productId}`),
  check: (productId) => api.get(`/favorites/check/${productId}`),
};

// Notifications API (Merged)
export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  markRead: (id) => api.post(`/notifications/${id}/mark-read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  create: (data) => api.post('/notifications/create', data),
};

// Campaigns API (Merged - using campaignsAPI as primary)
export const campaignsAPI = {
  getAll: (isActive) => api.get('/campaigns', { params: isActive !== undefined ? { is_active: isActive } : {} }),
  getActive: () => api.get('/campaigns/active'),
  getOne: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  deactivate: (id) => api.put(`/campaigns/${id}/deactivate`),
  activate: (id) => api.post(`/campaigns/${id}/activate`),
  getApplicableProducts: (id) => api.get(`/campaigns/${id}/applicable-products`),
};

// Legacy alias for backward compatibility
export const campaignAPI = campaignsAPI;

// Fault Reports API
export const faultReportsAPI = {
  getAll: (params = {}) => api.get('/fault-reports', { params }),
  getOne: (id) => api.get(`/fault-reports/${id}`),
  create: (data) => api.post('/fault-reports', data),
  update: (id, data) => api.put(`/fault-reports/${id}`, data),
  delete: (id) => api.delete(`/fault-reports/${id}`),
};

// Tasks API
export const tasksAPI = {
  getAll: () => api.get('/tasks'),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Catalog API
export const catalogAPI = {
  getAll: () => api.get('/catalog'),
};

// Feedback API
export const feedbackAPI = {
  create: (data) => api.post('/feedback', data),
  getByProduct: (productId) => api.get(`/feedback/product/${productId}`),
  getMy: () => api.get('/feedback/my'),
};

// Customer Profile API
export const customerProfileAPI = {
  get: () => api.get('/customer/profile'),
  create: (data) => api.post('/customer/profile', data),
  update: (data) => api.put('/customer/profile', data),
};

// Sales Rep API
export const salesRepAPI = {
  getCustomers: () => api.get('/salesrep/customers'),
  createOrder: (data) => api.post('/salesrep/order', data),
  getStats: () => api.get('/salesrep/stats'),
};

// Invoice API
export const invoicesAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  create: (data) => api.post('/invoices', data),
  getAll: () => api.get('/invoices'),
  getAnalysis: (period = 'monthly') => api.get(`/invoices/analysis?period=${period}`),
  getRecommendations: () => api.get('/invoices/recommendations'),
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard-stats'),
  getSalesAnalytics: (period = 'daily', startDate, endDate) => {
    const params = { period };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/analytics/sales', { params });
  },
  getPerformance: () => api.get('/analytics/performance'),
  getStockAnalytics: () => api.get('/analytics/stock'),
};

// Warehouse API
export const warehouseAPI = {
  getAll: () => api.get('/warehouses'),
  getOne: (id) => api.get(`/warehouses/${id}`),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  delete: (id) => api.delete(`/warehouses/${id}`),
  getInventory: (id) => api.get(`/warehouses/${id}/inventory`),
  getStats: (id) => api.get(`/warehouses/${id}/stats`),
};

// Campaign API
export const campaignAPI = {
  getAll: (isActive) => api.get('/campaigns', { params: { is_active: isActive } }),
  getActive: () => api.get('/campaigns/active'),
  getOne: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  activate: (id) => api.post(`/campaigns/${id}/activate`),
  getApplicableProducts: (id) => api.get(`/campaigns/${id}/applicable-products`),
};

// Notifications API
export const notificationsAPI = {
  getAll: (unreadOnly = false, limit = 50) => api.get('/notifications', { params: { unread_only: unreadOnly, limit } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.post(`/notifications/${id}/mark-read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  create: (data) => api.post('/notifications/create', data),
};

// Reports API
export const reportsAPI = {
  exportSales: (format = 'xlsx', startDate, endDate) => {
    const params = { format };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/reports/sales/export', { params, responseType: 'blob' });
  },
  exportStock: (format = 'xlsx', warehouseId) => {
    const params = { format };
    if (warehouseId) params.warehouse_id = warehouseId;
    return api.get('/reports/stock/export', { params, responseType: 'blob' });
  },
  exportSalesAgents: (format = 'xlsx', startDate, endDate) => {
    const params = { format };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/reports/sales-agents/export', { params, responseType: 'blob' });
  },
  exportLogistics: (format = 'xlsx', startDate, endDate) => {
    const params = { format };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/reports/logistics/export', { params, responseType: 'blob' });
  },
};

export default api;
