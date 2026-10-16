import axios from 'axios';

// Only the backend base URL is imported as per production specifications
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
});

// ==========================================
// 1. PUBLIC KENDRA CONFIGURATION
// ==========================================

export const fetchKendraConfig = async () => {
  const response = await api.get('/api/kendra-config');
  return response.data;
};

// ==========================================
// 2. VERIFIED ATTENDANCE SUBMISSION
// ==========================================

export const submitAttendanceProof = async (formData) => {
  const response = await api.post('/api/attendance/submit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// ==========================================
// 3. ADMIN AUTHENTICATION & SETUP API
// ==========================================

export const loginAdmin = async (pin) => {
  const response = await api.post('/api/admin/login', { pin });
  return response.data;
};

export const fetchAdminKendraConfig = async (token) => {
  const authToken = token || sessionStorage.getItem('avaps_admin_token') || '';
  const response = await api.get('/api/admin/kendra-config', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  return response.data;
};

export const saveAdminKendraConfig = async (token, configData) => {
  const authToken = token || sessionStorage.getItem('avaps_admin_token') || '';
  const response = await api.post('/api/admin/kendra-config', configData, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  return response.data;
};

export const fetchAdminAttendanceRecords = async (token, params = {}) => {
  const authToken = token || sessionStorage.getItem('avaps_admin_token') || '';
  const response = await api.get('/api/admin/attendance-records', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    params,
  });
  return response.data;
};

export default api;
