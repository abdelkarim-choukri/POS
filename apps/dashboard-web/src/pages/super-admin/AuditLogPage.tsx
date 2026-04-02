import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { superDashboardApi } from '../../api/super-admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const { data } = useQuery({ queryKey: ['sa-audit', page], queryFn: () => superDashboardApi.auditLogs({ page, limit: 20 }).then(r => r.data) });
  const logs = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const actionColor: Record<string, string> = { void: 'red', refund: 'yellow', login: 'blue', product_update: 'green' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <Card>
        {logs.length === 0 ? (
          <EmptyState icon={<FileText size={40} />} title="No audit entries" description="Actions will be logged here" />
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">User ID</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr></thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3"><Badge color={actionColor[l.action] || 'gray'}>{l.action}</Badge></td>
                  <td className="px-4 py-3">{l.entity_type} <span className="text-gray-400 text-xs font-mono">{l.entity_id?.slice(0, 8)}</span></td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{l.user_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-500">{l.ip_address || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(l.performed_at), 'MMM dd, HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-gray-500 py-1.5">Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
