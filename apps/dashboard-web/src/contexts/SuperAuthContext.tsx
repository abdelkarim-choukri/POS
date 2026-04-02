import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { superAuthApi } from '../api/super-admin';

interface SuperAdmin { id: string; email: string; name: string; type: 'super_admin'; }

interface SuperAuthContextType {
  admin: SuperAdmin | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>; logout: () => void;
}

const SuperAuthContext = createContext<SuperAuthContextType>(null!);
export const useSuperAuth = () => useContext(SuperAuthContext);

export function SuperAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<SuperAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run on /super routes
    if (!window.location.pathname.startsWith('/super')) {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('sa_access_token');
    if (token) {
      superAuthApi.getProfile()
        .then((res) => { if (res.data.type === 'super_admin') setAdmin(res.data); })
        .catch(() => { localStorage.removeItem('sa_access_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await superAuthApi.login(email, password);
    localStorage.setItem('sa_access_token', res.data.access_token);
    setAdmin(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('sa_access_token');
    setAdmin(null);
  };

  return <SuperAuthContext.Provider value={{ admin, loading, login, logout }}>{children}</SuperAuthContext.Provider>;
}
