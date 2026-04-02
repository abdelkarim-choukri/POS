import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import SuperLayout from './components/layout/SuperLayout';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import EmployeesPage from './pages/employees/EmployeesPage';
import LocationsPage from './pages/locations/LocationsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import SuperLoginPage from './pages/super-admin/SuperLoginPage';
import SuperDashboardPage from './pages/super-admin/SuperDashboardPage';
import BusinessesPage from './pages/super-admin/BusinessesPage';
import TerminalsPage from './pages/super-admin/TerminalsPage';
import BusinessTypesPage from './pages/super-admin/BusinessTypesPage';
import SubscriptionsPage from './pages/super-admin/SubscriptionsPage';
import AuditLogPage from './pages/super-admin/AuditLogPage';

export default function App() {
  return (
    <Routes>
      {/* Super Admin — completely separate route tree */}
      <Route path="/super/login" element={<SuperLoginPage />} />
      <Route path="/super" element={<SuperLayout />}>
        <Route index element={<SuperDashboardPage />} />
        <Route path="businesses" element={<BusinessesPage />} />
        <Route path="terminals" element={<TerminalsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="business-types" element={<BusinessTypesPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
      </Route>

      {/* Business Admin */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
