import { useQuery } from '@tanstack/react-query';
import { Building2, Monitor, Wifi, DollarSign } from 'lucide-react';
import { superDashboardApi, superBusinessApi, superTerminalApi } from '../../api/super-admin';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function SuperDashboardPage() {
  const { data: stats } = useQuery({ queryKey: ['sa-stats'], queryFn: () => superDashboardApi.stats().then(r => r.data) });
  const { data: bizData } = useQuery({ queryKey: ['sa-businesses'], queryFn: () => superBusinessApi.list({ page: 1, limit: 5 }).then(r => r.data) });
  const { data: health } = useQuery({ queryKey: ['sa-health'], queryFn: () => superTerminalApi.health().then(r => r.data) });

  const businesses = bizData?.data || [];
  const terminals = health?.terminals || [];

  const cards = [
    { label: 'Total Businesses', value: stats?.totalBusinesses || 0, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Terminals', value: stats?.totalTerminals || 0, icon: Monitor, color: 'text-purple-600 bg-purple-50' },
    { label: 'Online Terminals', value: stats?.onlineTerminals || 0, icon: Wifi, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${c.color}`}><c.icon size={22} /></div>
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-base font-semibold mb-4">Recent Businesses</h2>
          {businesses.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No businesses yet</p> : (
            <div className="space-y-3">
              {businesses.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-gray-500">{b.business_type?.label || b.email}</p>
                  </div>
                  <Badge color={b.is_active ? 'green' : 'red'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold mb-4">Terminal Health</h2>
          <div className="flex gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{health?.online || 0}</p>
              <p className="text-xs text-gray-500">Online</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{health?.offline || 0}</p>
              <p className="text-xs text-gray-500">Offline</p>
            </div>
          </div>
          {terminals.length === 0 ? <p className="text-sm text-gray-400 text-center py-2">No terminals</p> : (
            <div className="space-y-2">
              {terminals.slice(0, 8).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${t.is_online ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium">{t.terminal_code}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{t.business_name || '—'} / {t.location_name || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
