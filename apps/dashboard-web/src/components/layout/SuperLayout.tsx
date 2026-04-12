import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Monitor, CreditCard, Layers, FileText, LogOut } from 'lucide-react';
import { useSuperAuth } from '../../contexts/SuperAuthContext';

const links = [
  { to: '/super', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/super/businesses', icon: Building2, label: 'Businesses' },
  { to: '/super/terminals', icon: Monitor, label: 'Terminals' },
  { to: '/super/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/super/business-types', icon: Layers, label: 'Business Types' },
  { to: '/super/audit-log', icon: FileText, label: 'Audit Log' },
];

export default function SuperLayout() {
  const { admin, loading, logout } = useSuperAuth();

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  if (!admin) return <Navigate to="/super/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 h-screen w-60 bg-gray-900 flex flex-col z-50">
        <div className="px-5 py-6 border-b border-white/10">
          <h1 className="text-xl font-bold text-white tracking-tight">Super Admin</h1>
          <p className="text-xs text-gray-400 mt-1">Platform Management</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">{admin.name}</p>
            <p className="text-xs text-gray-400">{admin.email}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors">
            <LogOut size={18} />Log Out
          </button>
        </div>
      </aside>
      <main className="ml-60 p-6"><Outlet /></main>
    </div>
  );
}
