// SUPER_ADMIN_API_FILE_MARKER_12345
// SUPER_ADMIN_API_FILE_MARKER_12345
import api from './client';

export const superAuthApi = {
  login: (email: string, password: string) => api.post('/auth/super-admin/login', { email, password }),
  getProfile: () => api.get('/auth/me'),
};

export const superBusinessApi = {
  list: (params?: any) => api.get('/super/businesses', { params }),
  create: (data: any) => api.post('/super/businesses', data),
  get: (id: string) => api.get(`/super/businesses/${id}`),
  update: (id: string, data: any) => api.put(`/super/businesses/${id}`, data),
  updateStatus: (id: string, is_active: boolean) => api.patch(`/super/businesses/${id}/status`, { is_active }),
};

export const superBusinessTypeApi = {
  list: () => api.get('/super/business-types'),
  create: (data: any) => api.post('/super/business-types', data),
  updateFeatures: (id: string, data: any) => api.put(`/super/business-types/${id}/features`, data),
};

export const superTerminalApi = {
  list: () => api.get('/super/terminals'),
  create: (data: any) => api.post('/super/terminals', data),
  assign: (id: string, location_id: string) => api.patch(`/super/terminals/${id}/assign`, { location_id }),
  health: () => api.get('/super/terminals/health'),
};

export const superSubscriptionApi = {
  list: () => api.get('/super/subscriptions'),
  create: (data: any) => api.post('/super/subscriptions', data),
  update: (id: string, data: any) => api.put(`/super/subscriptions/${id}`, data),
};

export const superDashboardApi = {
  stats: () => api.get('/super/dashboard/stats'),
  auditLogs: (params?: any) => api.get('/super/audit-logs', { params }),
};
