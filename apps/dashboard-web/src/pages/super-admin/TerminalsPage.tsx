import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Monitor } from 'lucide-react';
import { superTerminalApi, superBusinessApi } from '../../api/super-admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';

export default function TerminalsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [assignTerminal, setAssignTerminal] = useState<any>(null);
  const [filter, setFilter] = useState('');

  const { data: terminals = [] } = useQuery({ queryKey: ['sa-terminals'], queryFn: () => superTerminalApi.list().then(r => r.data) });

  const filtered = filter
    ? terminals.filter((t: any) => t.location?.business?.name?.toLowerCase().includes(filter.toLowerCase()))
    : terminals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Terminals</h1>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Register Terminal</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Filter by business..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<Monitor size={40} />} title="No terminals" description="Register your first terminal" />
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last Seen</th>
              <th className="px-4 py-3 font-medium">App Version</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((t: any) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium font-mono">{t.terminal_code}</td>
                  <td className="px-4 py-3">{t.location?.business?.name || <span className="text-gray-400 italic">Unassigned</span>}</td>
                  <td className="px-4 py-3">{t.location?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${t.is_online ? 'bg-green-500' : t.last_seen_at ? 'bg-red-500' : 'bg-gray-300'}`} />
                      <span>{t.is_online ? 'Online' : t.last_seen_at ? 'Offline' : 'Never connected'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.last_seen_at ? format(new Date(t.last_seen_at), 'MMM dd, HH:mm') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.app_version || '—'}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => setAssignTerminal(t)}>Assign</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <CreateTerminalModal open={showCreate} onClose={() => setShowCreate(false)} />
      <AssignTerminalModal terminal={assignTerminal} onClose={() => setAssignTerminal(null)} />
    </div>
  );
}

function CreateTerminalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const createMut = useMutation({
    mutationFn: () => superTerminalApi.create({ terminal_code: code, device_name: name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-terminals'] }); setCode(''); setName(''); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} title="Register Terminal">
      <div className="space-y-4">
        <Input label="Terminal Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. T-002" required />
        <Input label="Device Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Front Counter" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMut.mutate()} disabled={!code || createMut.isPending}>{createMut.isPending ? 'Creating...' : 'Register'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function AssignTerminalModal({ terminal, onClose }: { terminal: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [locationId, setLocationId] = useState('');

  const { data: bizData } = useQuery({ queryKey: ['sa-businesses-all'], queryFn: () => superBusinessApi.list({ page: 1, limit: 100 }).then(r => r.data), enabled: !!terminal });
  const businesses = bizData?.data || [];

  const locations = businesses.flatMap((b: any) => (b.locations || []).map((l: any) => ({ ...l, business_name: b.name })));

  const assignMut = useMutation({
    mutationFn: () => superTerminalApi.assign(terminal.id, locationId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-terminals'] }); onClose(); },
  });

  if (!terminal) return null;

  return (
    <Modal open={!!terminal} onClose={onClose} title={`Assign ${terminal.terminal_code}`}>
      <div className="space-y-4">
        <Select label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Select location...</option>
          {locations.map((l: any) => <option key={l.id} value={l.id}>{l.business_name} — {l.name}</option>)}
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => assignMut.mutate()} disabled={!locationId || assignMut.isPending}>{assignMut.isPending ? 'Assigning...' : 'Assign'}</Button>
        </div>
      </div>
    </Modal>
  );
}
