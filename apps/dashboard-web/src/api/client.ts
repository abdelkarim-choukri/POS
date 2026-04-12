import axios from 'axios';

const api = axios.create({ baseURL: 'http://127.0.0.1:3000/api' });

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
  (error) => Promise.reject(error),
);

export default api;
