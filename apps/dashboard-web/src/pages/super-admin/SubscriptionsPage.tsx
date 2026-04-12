import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { superSubscriptionApi } from '../../api/super-admin';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';

export default function SubscriptionsPage() {
  const { data: subs = [] } = useQuery({ queryKey: ['sa-subs'], queryFn: () => superSubscriptionApi.list().then(r => r.data) });

  const statusColor: Record<string, string> = { active: 'green', trial: 'blue', suspended: 'yellow', cancelled: 'red' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <Card>
        {subs.length === 0 ? (
          <EmptyState icon={<CreditCard size={40} />} title="No subscriptions" description="Subscriptions are created when businesses are registered" />
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Price (MAD)</th>
              <th className="px-4 py-3 font-medium">Start Date</th>
              <th className="px-4 py-3 font-medium">End Date</th>
            </tr></thead>
            <tbody>
              {subs.map((s: any) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.business?.name || '—'}</td>
                  <td className="px-4 py-3 capitalize">{s.plan_name}</td>
                  <td className="px-4 py-3"><Badge color={statusColor[s.status] || 'gray'}>{s.status}</Badge></td>
                  <td className="px-4 py-3">{parseFloat(s.price_mad).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{s.start_date ? format(new Date(s.start_date), 'MMM dd, yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.end_date ? format(new Date(s.end_date), 'MMM dd, yyyy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
