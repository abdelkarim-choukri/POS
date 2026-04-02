import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const isSuperRoute = window.location.pathname.startsWith('/super');
  const token = isSuperRoute
    ? localStorage.getItem('sa_access_token')
    : localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const isSuperRoute = window.location.pathname.startsWith('/super');
      if (isSuperRoute) {
        localStorage.removeItem('sa_access_token');
        window.location.href = '/super/login';
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
