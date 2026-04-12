import api from './client';

export const kdsApi = {
  getActiveOrders: (locationId: string) => api.get(`/kds/orders/${locationId}`),
  getServedOrders: (locationId: string, limit?: number) => api.get(`/kds/orders/${locationId}/served`, { params: { limit } }),
  updateOrderStatus: (orderId: string, order_status: string) => api.patch(`/kds/orders/${orderId}/status`, { order_status }),
};
