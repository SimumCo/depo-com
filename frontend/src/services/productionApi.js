// Production Management API Service
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Create axios instance with auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== PRODUCTION LINES ==========

export const getProductionLines = async (status = null) => {
  const params = status ? { status } : {};
  const response = await api.get('/api/production/lines', { params });
  return response.data;
};

export const getProductionLine = async (lineId) => {
  const response = await api.get(`/api/production/lines/${lineId}`);
  return response.data;
};

export const createProductionLine = async (lineData) => {
  const response = await api.post('/api/production/lines', lineData);
  return response.data;
};

export const updateProductionLine = async (lineId, lineData) => {
  const response = await api.put(`/api/production/lines/${lineId}`, lineData);
  return response.data;
};

export const updateLineStatus = async (lineId, status) => {
  const response = await api.patch(`/api/production/lines/${lineId}/status?status=${status}`);
  return response.data;
};

// ========== BILL OF MATERIALS (BOM) ==========

export const getBOMs = async (productId = null) => {
  const params = productId ? { product_id: productId } : {};
  const response = await api.get('/api/production/bom', { params });
  return response.data;
};

export const getBOM = async (bomId) => {
  const response = await api.get(`/api/production/bom/${bomId}`);
  return response.data;
};

export const createBOM = async (bomData) => {
  const response = await api.post('/api/production/bom', bomData);
  return response.data;
};

export const updateBOM = async (bomId, bomData) => {
  const response = await api.put(`/api/production/bom/${bomId}`, bomData);
  return response.data;
};

export const deleteBOM = async (bomId) => {
  const response = await api.delete(`/api/production/bom/${bomId}`);
  return response.data;
};

// ========== PRODUCTION PLANS ==========

export const getProductionPlans = async (status = null, planType = null) => {
  const params = {};
  if (status) params.status = status;
  if (planType) params.plan_type = planType;
  const response = await api.get('/api/production/plans', { params });
  return response.data;
};

export const getProductionPlan = async (planId) => {
  const response = await api.get(`/api/production/plans/${planId}`);
  return response.data;
};

export const createProductionPlan = async (planData) => {
  const response = await api.post('/api/production/plans', planData);
  return response.data;
};

export const updateProductionPlan = async (planId, planData) => {
  const response = await api.put(`/api/production/plans/${planId}`, planData);
  return response.data;
};

export const approveProductionPlan = async (planId) => {
  const response = await api.post(`/api/production/plans/${planId}/approve`);
  return response.data;
};

export const generateOrdersFromPlan = async (planId) => {
  const response = await api.post(`/api/production/plans/${planId}/generate-orders`);
  return response.data;
};

export const deleteProductionPlan = async (planId) => {
  const response = await api.delete(`/api/production/plans/${planId}`);
  return response.data;
};

// ========== PRODUCTION ORDERS ==========

export const getProductionOrders = async (status = null, lineId = null) => {
  const params = {};
  if (status) params.status = status;
  if (lineId) params.line_id = lineId;
  const response = await api.get('/api/production/orders', { params });
  return response.data;
};

export const getProductionOrder = async (orderId) => {
  const response = await api.get(`/api/production/orders/${orderId}`);
  return response.data;
};

export const createProductionOrder = async (orderData) => {
  const response = await api.post('/api/production/orders', orderData);
  return response.data;
};

export const updateOrderStatus = async (orderId, status, notes = null) => {
  const params = { status };
  if (notes) params.notes = notes;
  const response = await api.patch(`/api/production/orders/${orderId}/status`, null, { params });
  return response.data;
};

export const assignOrderToLine = async (orderId, lineId, operatorId = null) => {
  const params = { line_id: lineId };
  if (operatorId) params.operator_id = operatorId;
  const response = await api.post(`/api/production/orders/${orderId}/assign`, null, { params });
  return response.data;
};

// ========== RAW MATERIAL REQUIREMENTS ==========

export const getRawMaterialAnalysis = async (planId) => {
  const response = await api.get(`/api/production/raw-materials/analysis/${planId}`);
  return response.data;
};

export const calculateRawMaterials = async (planId) => {
  const response = await api.post(`/api/production/raw-materials/calculate/${planId}`);
  return response.data;
};

// ========== QUALITY CONTROL ==========

export const getQualityControls = async (orderId = null, result = null) => {
  const params = {};
  if (orderId) params.order_id = orderId;
  if (result) params.result = result;
  const response = await api.get('/api/production/quality-control', { params });
  return response.data;
};

export const createQualityControl = async (qcData) => {
  const response = await api.post('/api/production/quality-control', qcData);
  return response.data;
};

// ========== PRODUCTION TRACKING ==========

export const getProductionTracking = async (lineId = null, orderId = null) => {
  const params = {};
  if (lineId) params.line_id = lineId;
  if (orderId) params.order_id = orderId;
  const response = await api.get('/api/production/tracking', { params });
  return response.data;
};

export const createTrackingRecord = async (orderId, producedQuantity, wasteQuantity = 0, notes = null) => {
  const params = {
    order_id: orderId,
    produced_quantity: producedQuantity,
    waste_quantity: wasteQuantity,
  };
  if (notes) params.notes = notes;
  const response = await api.post('/api/production/tracking', null, { params });
  return response.data;
};

// ========== DASHBOARD STATS ==========

export const getDashboardStats = async () => {
  const response = await api.get('/api/production/dashboard/stats');
  return response.data;
};

// ========== PRODUCTS (for BOM) ==========

export const getProducts = async () => {
  const response = await api.get('/api/products');
  return response.data;
};

// ========== USERS (for operators) ==========

export const getUsers = async () => {
  const response = await api.get('/api/users');
  return response.data;
};

export default {
  getProductionLines,
  getProductionLine,
  createProductionLine,
  updateProductionLine,
  updateLineStatus,
  getBOMs,
  getBOM,
  createBOM,
  updateBOM,
  deleteBOM,
  getProductionPlans,
  getProductionPlan,
  createProductionPlan,
  updateProductionPlan,
  approveProductionPlan,
  generateOrdersFromPlan,
  deleteProductionPlan,
  getProductionOrders,
  getProductionOrder,
  createProductionOrder,
  updateOrderStatus,
  assignOrderToLine,
  getRawMaterialAnalysis,
  calculateRawMaterials,
  getQualityControls,
  createQualityControl,
  getProductionTracking,
  createTrackingRecord,
  getDashboardStats,
  getProducts,
  getUsers,
};
