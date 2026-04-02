import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Users, MapPin, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/locations', icon: MapPin, label: 'Locations' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-sidebar-bg flex flex-col z-50">
      <div className="px-5 py-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-white tracking-tight">POS Dashboard</h1>
        <p className="text-xs text-sidebar-text mt-1 truncate">{user?.business_name || 'Business'}</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-active text-sidebar-textActive'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-textActive'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-sidebar-text capitalize">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-red-400 transition-colors"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </aside>
  );
}
