// Draft Engine API Service
// Yeni deterministik draft sistemi için API çağrıları

import api from './api';

export const draftEngineAPI = {
  // Setup
  setupIndexes: () => api.post('/draft-engine/setup/indexes'),
  seedData: () => api.post('/draft-engine/setup/seed'),
  runMultiplierBatch: () => api.post('/draft-engine/setup/run-multiplier-batch'),

  // Deliveries
  createDelivery: (data) => api.post('/draft-engine/deliveries', data),
  getDeliveries: (params) => api.get('/draft-engine/deliveries', { params }),

  // Customer Draft
  getCustomerDraft: (customerId, includeInactive = false) => 
    api.get(`/draft-engine/customers/${customerId}/draft`, { params: { include_inactive: includeInactive } }),
  getCustomerState: (customerId) => 
    api.get(`/draft-engine/customers/${customerId}/state`),

  // Sales Rep (Plasiyer) Draft
  getSalesRepDraft: (targetDate) => 
    api.get('/draft-engine/sales-rep/draft', { params: { target_date: targetDate } }),
  getSalesRepCustomers: () => api.get('/draft-engine/sales-rep/customers'),

  // Depot Draft
  getDepotDraft: (depotId, targetDate) => 
    api.get(`/draft-engine/depot/${depotId}/draft`, { params: { target_date: targetDate } }),

  // Working Copy
  createWorkingCopy: (customerId) => 
    api.post(`/draft-engine/customers/${customerId}/working-copy`),
  getWorkingCopy: (customerId) => 
    api.get(`/draft-engine/customers/${customerId}/working-copy`),
  updateWorkingCopy: (customerId, items) => 
    api.patch(`/draft-engine/customers/${customerId}/working-copy`, { items }),
  deleteWorkingCopy: (customerId) => 
    api.delete(`/draft-engine/customers/${customerId}/working-copy`),

  // Products
  getProducts: () => api.get('/draft-engine/products'),

  // Multipliers
  getMultipliers: (depotId, weekStart) => 
    api.get('/draft-engine/multipliers', { params: { depot_id: depotId, week_start: weekStart } }),

  // Rollups
  getSalesRepRollup: (salesRepId, targetDate) => 
    api.get(`/draft-engine/rollup/sales-rep/${salesRepId}`, { params: { target_date: targetDate } }),
  getDepotRollup: (depotId, targetDate) => 
    api.get(`/draft-engine/rollup/depot/${depotId}`, { params: { target_date: targetDate } }),
  getProductionRollup: (targetDate) => 
    api.get('/draft-engine/rollup/production', { params: { target_date: targetDate } }),
};
