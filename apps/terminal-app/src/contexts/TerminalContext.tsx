import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { terminalApi } from '../api/terminal';
import { cacheCatalog, getCachedCatalog, addToSyncQueue } from '../services/offlineStore';
import { startAutoSync, stopAutoSync } from '../services/syncService';
import type { TerminalConfig, Employee, Category, Product } from '../types';

type Screen = 'setup' | 'login' | 'sales' | 'payment' | 'confirm' | 'success' | 'void';

interface TerminalContextType {
  config: TerminalConfig | null;
  employee: Employee | null;
  categories: Category[];
  products: Product[];
  screen: Screen;
  setScreen: (s: Screen) => void;
  activateTerminal: (code: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  logout: () => void;
  lastTransaction: any;
  setLastTransaction: (t: any) => void;
  isOffline: boolean;
}

const TerminalContext = createContext<TerminalContextType>(null!);
export const useTerminal = () => useContext(TerminalContext);

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TerminalConfig | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [screen, setScreen] = useState<Screen>('setup');
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  useEffect(() => {
    if (employee) {
      startAutoSync((result) => {
        if (result.synced > 0) console.log(`[AutoSync] ${result.synced} operations synced`);
      });
    }
    return () => stopAutoSync();
  }, [employee]);

  useEffect(() => {
    const saved = localStorage.getItem('terminal_config');
    if (saved) { setConfig(JSON.parse(saved)); setScreen('login'); }
  }, []);

  useEffect(() => {
    if (config && employee) loadCatalog();
  }, [config, employee]);

  async function loadCatalog() {
    try {
      const res = await terminalApi.getCatalog();
      const cats = res.data.categories || [];
      const prods = res.data.products || [];
      setCategories(cats); setProducts(prods);
      await cacheCatalog(cats, prods);
    } catch {
      const cached = await getCachedCatalog();
      if (cached) { setCategories(cached.categories); setProducts(cached.products); }
    }
  }

  const activateTerminal = async (code: string) => {
    const res = await terminalApi.activate(code);
    setConfig(res.data);
    localStorage.setItem('terminal_config', JSON.stringify(res.data));
    setScreen('login');
  };

  const loginWithPin = async (pin: string) => {
    const terminalCode = config?.terminal.terminal_code;
    if (!terminalCode) throw new Error('Terminal not activated');
    const res = await terminalApi.pinLogin(pin, terminalCode);
    localStorage.setItem('terminal_token', res.data.access_token);
    setEmployee(res.data.user);
    try { await terminalApi.clockIn(config.terminal.id); } catch {
      await addToSyncQueue({ operation_type: 'clock_in', payload: { terminal_id: config.terminal.id }, created_at: new Date().toISOString(), attempts: 0 });
    }
    setScreen('sales');
  };

  const logout = async () => {
    try { await terminalApi.clockOut(); } catch {
      await addToSyncQueue({ operation_type: 'clock_out', payload: {}, created_at: new Date().toISOString(), attempts: 0 });
    }
    localStorage.removeItem('terminal_token');
    setEmployee(null);
    setScreen('login');
  };

  return (
    <TerminalContext.Provider value={{
      config, employee, categories, products, screen, setScreen,
      activateTerminal, loginWithPin, logout, lastTransaction, setLastTransaction, isOffline,
    }}>
      {children}
    </TerminalContext.Provider>
  );
}
