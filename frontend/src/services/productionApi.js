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



// ========== OPERATOR PANEL ENDPOINTS ==========

export const getOperatorMyOrders = async () => {
  const response = await api.get('/api/production/operator/my-orders');
  return response.data;
};

export const startProductionOrder = async (orderId) => {
  const response = await api.post(`/api/production/operator/orders/${orderId}/start`);
  return response.data;
};

export const pauseProductionOrder = async (orderId, reason = null) => {
  const params = reason ? { reason } : {};
  const response = await api.post(`/api/production/operator/orders/${orderId}/pause`, null, { params });
  return response.data;
};

export const completeProductionOrder = async (orderId, notes = null) => {
  const params = notes ? { notes } : {};
  const response = await api.post(`/api/production/operator/orders/${orderId}/complete`, null, { params });
  return response.data;
};

// ========== MACHINE DOWNTIME ==========

export const getMachineDowntimes = async (lineId = null, downtimeType = null) => {
  const params = {};
  if (lineId) params.line_id = lineId;
  if (downtimeType) params.downtime_type = downtimeType;
  const response = await api.get('/api/production/downtime', { params });
  return response.data;
};

export const createMachineDowntime = async (downtimeData) => {
  const response = await api.post('/api/production/downtime', downtimeData);
  return response.data;
};

export const endMachineDowntime = async (downtimeId) => {
  const response = await api.patch(`/api/production/downtime/${downtimeId}/end`);
  return response.data;
};

// ========== RAW MATERIAL USAGE ==========

export const getRawMaterialUsage = async (orderId = null, batchNumber = null) => {
  const params = {};
  if (orderId) params.order_id = orderId;
  if (batchNumber) params.batch_number = batchNumber;
  const response = await api.get('/api/production/raw-material-usage', { params });
  return response.data;
};

export const createRawMaterialUsage = async (usageData) => {
  const response = await api.post('/api/production/raw-material-usage', usageData);
  return response.data;
};

// ========== BATCH RECORDS ==========

export const getBatchRecords = async (orderId = null, productId = null) => {
  const params = {};
  if (orderId) params.order_id = orderId;
  if (productId) params.product_id = productId;
  const response = await api.get('/api/production/batches', { params });
  return response.data;
};

export const createBatchRecord = async (batchData) => {
  const response = await api.post('/api/production/batches', batchData);
  return response.data;
};

// ========== OPERATOR NOTES ==========

export const getOperatorNotes = async (orderId = null, lineId = null, noteType = null) => {
  const params = {};
  if (orderId) params.order_id = orderId;
  if (lineId) params.line_id = lineId;
  if (noteType) params.note_type = noteType;
  const response = await api.get('/api/production/operator-notes', { params });
  return response.data;
};

export const createOperatorNote = async (noteData) => {
  const response = await api.post('/api/production/operator-notes', noteData);
  return response.data;
};

export const deleteOperatorNote = async (noteId) => {
  const response = await api.delete(`/api/production/operator-notes/${noteId}`);
  return response.data;
};

// ========== OPERATOR DASHBOARD ==========

export const getOperatorDashboardStats = async () => {
  const response = await api.get('/api/production/operator/dashboard/stats');
  return response.data;
};


// ========== QC SPECIALIST ENDPOINTS ==========

export const getQCPendingBatches = async () => {
  const response = await api.get('/api/production/qc/pending-batches');
  return response.data;
};

export const getQCDashboardStats = async () => {
  const response = await api.get('/api/production/qc/dashboard/stats');
  return response.data;
};

export const getNonConformanceReports = async (status = null, severity = null) => {
  const params = {};
  if (status) params.status = status;
  if (severity) params.severity = severity;
  const response = await api.get('/api/production/qc/ncr', { params });
  return response.data;
};

export const createNonConformanceReport = async (ncrData) => {
  const response = await api.post('/api/production/qc/ncr', ncrData);
  return response.data;
};

export const updateNCRStatus = async (ncrId, status, assignedTo = null) => {
  const params = { status };
  if (assignedTo) params.assigned_to = assignedTo;
  const response = await api.patch(`/api/production/qc/ncr/${ncrId}/status`, null, { params });
  return response.data;
};

export const getQualityTests = async (qcRecordId = null, batchNumber = null, testType = null) => {
  const params = {};
  if (qcRecordId) params.qc_record_id = qcRecordId;
  if (batchNumber) params.batch_number = batchNumber;
  if (testType) params.test_type = testType;
  const response = await api.get('/api/production/qc/tests', { params });
  return response.data;
};

export const createQualityTest = async (testData) => {
  const response = await api.post('/api/production/qc/tests', testData);
  return response.data;
};

export const getHACCPRecords = async (ccpNumber = null, status = null) => {
  const params = {};
  if (ccpNumber) params.ccp_number = ccpNumber;
  if (status) params.status = status;
  const response = await api.get('/api/production/qc/haccp', { params });
  return response.data;
};

export const createHACCPRecord = async (haccpData) => {
  const response = await api.post('/api/production/qc/haccp', haccpData);
  return response.data;
};

export const getQCTrendAnalysis = async (productId = null, days = 30) => {
  const params = { days };
  if (productId) params.product_id = productId;
  const response = await api.get('/api/production/qc/trend-analysis', { params });
  return response.data;
};

// ========== WAREHOUSE SUPERVISOR ENDPOINTS ==========

export const getWarehouseDashboardStats = async () => {
  const response = await api.get('/api/production/warehouse/dashboard/stats');
  return response.data;
};

export const getWarehouseTransactions = async (transactionType = null, days = 30) => {
  const params = { days };
  if (transactionType) params.transaction_type = transactionType;
  const response = await api.get('/api/production/warehouse/transactions', { params });
  return response.data;
};

export const createRawMaterialOut = async (transactionData) => {
  const response = await api.post('/api/production/warehouse/transactions/raw-material-out', transactionData);
  return response.data;
};

export const createFinishedGoodIn = async (transactionData) => {
  const response = await api.post('/api/production/warehouse/transactions/finished-good-in', transactionData);
  return response.data;
};

export const getStockLocations = async (zone = null) => {
  const params = {};
  if (zone) params.zone = zone;
  const response = await api.get('/api/production/warehouse/locations', { params });
  return response.data;
};

export const createStockLocation = async (locationData) => {
  const response = await api.post('/api/production/warehouse/locations', locationData);
  return response.data;
};

export const getStockItems = async (locationCode = null, productId = null, status = null) => {
  const params = {};
  if (locationCode) params.location_code = locationCode;
  if (productId) params.product_id = productId;
  if (status) params.status = status;
  const response = await api.get('/api/production/warehouse/stock-items', { params });
  return response.data;
};

export const getExpiringStockItems = async (days = 30) => {
  const response = await api.get('/api/production/warehouse/stock-items/expiring', { params: { days } });
  return response.data;
};

export const updateStockItem = async (itemId, updateData) => {
  const response = await api.patch(`/api/production/warehouse/stock-items/${itemId}`, updateData);
  return response.data;
};

export const getStockCounts = async (days = 30) => {
  const response = await api.get('/api/production/warehouse/stock-counts', { params: { days } });
  return response.data;
};

export const createStockCount = async (countData) => {
  const response = await api.post('/api/production/warehouse/stock-counts', countData);
  return response.data;
};

export const getStockBlocks = async (qcStatus = null) => {
  const params = {};
  if (qcStatus) params.qc_status = qcStatus;
  const response = await api.get('/api/production/warehouse/stock-blocks', { params });
  return response.data;
};

export const createStockBlock = async (blockData) => {
  const response = await api.post('/api/production/warehouse/stock-blocks', blockData);
  return response.data;
};

export const releaseStockBlock = async (blockId, qcStatus) => {
  const response = await api.patch(`/api/production/warehouse/stock-blocks/${blockId}/release`, null, {
    params: { qc_status: qcStatus }
  });
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
