import api from './client';

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/me'),
  changePassword: (current_password: string, new_password: string) => api.put('/auth/change-password', { current_password, new_password }),
};
