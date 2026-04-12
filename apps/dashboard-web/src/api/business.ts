import api from './client';

export const categoryApi = {
  list: () => api.get('/business/categories'),
  create: (data: any) => api.post('/business/categories', data),
  update: (id: string, data: any) => api.put(`/business/categories/${id}`, data),
  delete: (id: string) => api.delete(`/business/categories/${id}`),
};

export const productApi = {
  list: (categoryId?: string) => api.get('/business/products', { params: categoryId ? { category_id: categoryId } : {} }),
  create: (data: any) => api.post('/business/products', data),
  update: (id: string, data: any) => api.put(`/business/products/${id}`, data),
  toggleSoldOut: (id: string) => api.patch(`/business/products/${id}/sold-out`),
  delete: (id: string) => api.delete(`/business/products/${id}`),
  listVariants: (id: string) => api.get(`/business/products/${id}/variants`),
  createVariant: (id: string, data: any) => api.post(`/business/products/${id}/variants`, data),
  updateVariant: (id: string, data: any) => api.put(`/business/variants/${id}`, data),
};

export const modifierApi = {
  listGroups: () => api.get('/business/modifier-groups'),
  createGroup: (data: any) => api.post('/business/modifier-groups', data),
  updateGroup: (id: string, data: any) => api.put(`/business/modifier-groups/${id}`, data),
  addModifier: (groupId: string, data: any) => api.post(`/business/modifier-groups/${groupId}/modifiers`, data),
  linkToProduct: (productId: string, modifier_group_id: string) => api.post(`/business/products/${productId}/modifier-groups`, { modifier_group_id }),
};

export const employeeApi = {
  list: () => api.get('/business/employees'),
  create: (data: any) => api.post('/business/employees', data),
  update: (id: string, data: any) => api.put(`/business/employees/${id}`, data),
  updateStatus: (id: string, is_active: boolean) => api.patch(`/business/employees/${id}/status`, { is_active }),
  clockHistory: (id: string) => api.get(`/business/employees/${id}/clock-history`),
};

export const locationApi = {
  list: () => api.get('/business/locations'),
  create: (data: any) => api.post('/business/locations', data),
  update: (id: string, data: any) => api.put(`/business/locations/${id}`, data),
  terminals: (id: string) => api.get(`/business/locations/${id}/terminals`),
};

export const reportApi = {
  dailySales: (params?: any) => api.get('/business/reports/daily-sales', { params }),
  revenueByItem: (params?: any) => api.get('/business/reports/revenue-by-item', { params }),
  paymentMethods: (params?: any) => api.get('/business/reports/payment-methods', { params }),
  transactions: (params?: any) => api.get('/business/reports/transactions', { params }),
  voidsRefunds: (params?: any) => api.get('/business/reports/voids-refunds', { params }),
  clockHistory: (params?: any) => api.get('/business/reports/clock-history', { params }),
  transactionDetail: (id: string) => api.get(`/business/transactions/${id}`),
  issueRefund: (id: string, data: any) => api.post(`/business/transactions/${id}/refund`, data),
};
