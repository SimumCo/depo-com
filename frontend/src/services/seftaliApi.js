import api from './api';

// ŞEFTALİ Customer API
export const sfCustomerAPI = {
  getProfile: () => api.get('/seftali/customer/profile'),
  getProducts: () => api.get('/seftali/customer/products'),
  getDraft: () => api.get('/seftali/customer/draft'),
  startWorkingCopy: () => api.post('/seftali/customer/working-copy/start'),
  updateWorkingCopy: (id, items) => api.patch(`/seftali/customer/working-copy/${id}`, items),
  addWorkingCopyItem: (id, data) => api.post(`/seftali/customer/working-copy/${id}/items`, data),
  submitWorkingCopy: (id) => api.post(`/seftali/customer/working-copy/${id}/submit`),
  getPendingDeliveries: () => api.get('/seftali/customer/deliveries/pending'),
  acceptDelivery: (id) => api.post(`/seftali/customer/deliveries/${id}/accept`),
  rejectDelivery: (id, data) => api.post(`/seftali/customer/deliveries/${id}/reject`, data),
  createStockDeclaration: (data) => api.post('/seftali/customer/stock-declarations', data),
  getPendingVariance: () => api.get('/seftali/customer/variance/pending'),
  applyReasonBulk: (data) => api.post('/seftali/customer/variance/apply-reason-bulk', data),
  dismissBulk: (data) => api.post('/seftali/customer/variance/dismiss-bulk', data),
  getDeliveryHistory: () => api.get('/seftali/customer/deliveries/history'),
  getDailyConsumption: (params) => api.get('/seftali/customer/daily-consumption', { params }),
  getConsumptionSummary: () => api.get('/seftali/customer/daily-consumption/summary'),
};

// ŞEFTALİ Sales API
export const sfSalesAPI = {
  getCustomers: () => api.get('/seftali/sales/customers'),
  getCustomersSummary: () => api.get('/seftali/sales/customers/summary'),
  updateCustomer: (id, data) => api.patch(`/seftali/sales/customers/${id}`, data),
  createDelivery: (data) => api.post('/seftali/sales/deliveries', data),
  getDeliveries: (params) => api.get('/seftali/sales/deliveries', { params }),
  getOrders: (params) => api.get('/seftali/sales/orders', { params }),
  approveOrder: (id) => api.post(`/seftali/sales/orders/${id}/approve`),
  requestEdit: (id, data) => api.post(`/seftali/sales/orders/${id}/request-edit`, data),
  getWarehouseDraft: () => api.get('/seftali/sales/warehouse-draft'),
  submitWarehouseDraft: (data) => api.post('/seftali/sales/warehouse-draft/submit', data),
  getCampaigns: () => api.get('/seftali/sales/campaigns'),
  addCampaignToOrder: (data) => api.post('/seftali/sales/campaigns/add-to-order', data),
  getCustomerConsumption: (customerId) => api.get(`/seftali/sales/customers/${customerId}/consumption`),
  // Plasiyer Sipariş Hesaplama
  getRouteOrderCalculation: (routeDay) => api.get(`/seftali/sales/plasiyer/order-calculation`, { params: { route_day: routeDay } }),
  getRouteCustomers: (routeDay) => api.get(`/seftali/sales/plasiyer/route-customers/${routeDay}`),
  getPlasiyerStock: () => api.get('/seftali/sales/plasiyer/stock'),
  updatePlasiyerStock: (data) => api.patch('/seftali/sales/plasiyer/stock', data),
};

// ŞEFTALİ Admin API
export const sfAdminAPI = {
  getHealthSummary: () => api.get('/seftali/admin/health/summary'),
  getVariance: (params) => api.get('/seftali/admin/variance', { params }),
  getDeliveries: (params) => api.get('/seftali/admin/deliveries', { params }),
  getWarehouseOrders: (params) => api.get('/seftali/admin/warehouse-orders', { params }),
  processWarehouseOrder: (id) => api.post(`/seftali/admin/warehouse-orders/${id}/process`),
  // Kampanya yönetimi
  getCampaigns: (params) => api.get('/seftali/admin/campaigns', { params }),
  createCampaign: (data) => api.post('/seftali/admin/campaigns', data),
  updateCampaign: (id, data) => api.patch(`/seftali/admin/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/seftali/admin/campaigns/${id}`),
};
