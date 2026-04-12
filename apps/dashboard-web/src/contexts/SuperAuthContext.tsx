import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

interface SuperAdmin { id: string; email: string; name: string; type: 'super_admin'; }

interface SuperAuthContextType {
  admin: SuperAdmin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const SuperAuthContext = createContext<SuperAuthContextType>(null!);
export const useSuperAuth = () => useContext(SuperAuthContext);

export function SuperAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<SuperAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.location.pathname.startsWith('/super')) {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('sa_access_token');
    if (token) {
      api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => { if (res.data.type === 'super_admin') setAdmin(res.data); })
        .catch(() => { localStorage.removeItem('sa_access_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/super-admin/login', { email, password });
    localStorage.setItem('sa_access_token', res.data.access_token);
    setAdmin(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('sa_access_token');
    setAdmin(null);
    window.location.href = '/super/login';
  };

  return (
    <SuperAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </SuperAuthContext.Provider>
  );
}
