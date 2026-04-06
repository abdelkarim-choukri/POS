import api from './client';

export const terminalApi = {
  activate: (terminal_code: string) => api.post('/terminal/activate', { terminal_code }),
  pinLogin: (pin: string, terminal_code: string) => api.post('/auth/pin-login', { pin, terminal_code }),
  heartbeat: (terminal_id: string) => api.post('/terminal/heartbeat', { terminal_id }),
  getCatalog: () => api.get('/terminal/catalog'),
  createTransaction: (data: any, terminal_id?: string, location_id?: string) =>
    api.post('/terminal/transactions', data, { params: { terminal_id, location_id } }),
  voidTransaction: (id: string, data: any) => api.post(`/terminal/transactions/${id}/void`, data),
  todayTransactions: (terminal_id: string) => api.get('/terminal/transactions/today', { params: { terminal_id } }),
  clockIn: (terminal_id: string) => api.post('/terminal/clock-in', { terminal_id }),
  clockOut: () => api.post('/terminal/clock-out'),
};
