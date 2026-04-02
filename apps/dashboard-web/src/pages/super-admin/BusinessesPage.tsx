import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Eye } from 'lucide-react';
import { superBusinessApi, superBusinessTypeApi } from '../../api/super-admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

export default function BusinessesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewBiz, setViewBiz] = useState<any>(null);

  const { data: bizData } = useQuery({ queryKey: ['sa-businesses'], queryFn: () => superBusinessApi.list({ page: 1, limit: 50 }).then(r => r.data) });
  const businesses = bizData?.data || [];

  const statusMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => superBusinessApi.updateStatus(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-businesses'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Businesses</h1>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Create Business</Button>
      </div>

      <Card>
        {businesses.length === 0 ? (
          <EmptyState icon={<Building2 size={40} />} title="No businesses" description="Create your first business" />
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {businesses.map((b: any) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3">{b.business_type?.label || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{b.email}</td>
                  <td className="px-4 py-3">
                    <Badge color={b.subscription?.status === 'active' ? 'green' : b.subscription?.status === 'trial' ? 'blue' : 'yellow'}>
                      {b.subscription?.plan_name || '—'} ({b.subscription?.status || '—'})
                    </Badge>
                  </td>
                  <td className="px-4 py-3"><Badge color={b.is_active ? 'green' : 'red'}>{b.is_active ? 'Active' : 'Suspended'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setViewBiz(b)}><Eye size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => statusMut.mutate({ id: b.id, active: !b.is_active })}>
                        {b.is_active ? 'Suspend' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <CreateBusinessModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ViewBusinessModal business={viewBiz} onClose={() => setViewBiz(null)} />
    </div>
  );
}

function CreateBusinessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    business_type_id: '', name: '', legal_name: '', email: '', phone: '',
    owner_email: '', owner_password: '', owner_first_name: '', owner_last_name: '', plan_name: 'trial',
  });

  const { data: types = [] } = useQuery({ queryKey: ['sa-types'], queryFn: () => superBusinessTypeApi.list().then(r => r.data) });

  const createMut = useMutation({
    mutationFn: () => superBusinessApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-businesses'] }); setStep(1); setForm({ business_type_id: '', name: '', legal_name: '', email: '', phone: '', owner_email: '', owner_password: '', owner_first_name: '', owner_last_name: '', plan_name: 'trial' }); onClose(); },
  });

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <Modal open={open} onClose={onClose} title={`Create Business — Step ${step} of 4`} width="max-w-xl">
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Select business type</p>
          <Select label="Business Type" value={form.business_type_id} onChange={(e) => set('business_type_id', e.target.value)}>
            <option value="">Select type...</option>
            {types.map((t: any) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
          <div className="flex justify-end"><Button onClick={() => setStep(2)} disabled={!form.business_type_id}>Next</Button></div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Business information</p>
          <Input label="Business Name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          <Input label="Legal Name" value={form.legal_name} onChange={(e) => set('legal_name', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="flex justify-between"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><Button onClick={() => setStep(3)} disabled={!form.name || !form.email}>Next</Button></div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Owner account (Admin-B)</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.owner_first_name} onChange={(e) => set('owner_first_name', e.target.value)} required />
            <Input label="Last Name" value={form.owner_last_name} onChange={(e) => set('owner_last_name', e.target.value)} required />
          </div>
          <Input label="Owner Email" type="email" value={form.owner_email} onChange={(e) => set('owner_email', e.target.value)} required />
          <Input label="Owner Password" type="password" value={form.owner_password} onChange={(e) => set('owner_password', e.target.value)} required />
          <div className="flex justify-between"><Button variant="secondary" onClick={() => setStep(2)}>Back</Button><Button onClick={() => setStep(4)} disabled={!form.owner_email || !form.owner_password}>Next</Button></div>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Subscription plan</p>
          <Select label="Plan" value={form.plan_name} onChange={(e) => set('plan_name', e.target.value)}>
            <option value="trial">Trial</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </Select>
          <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-1">
            <p><span className="text-gray-500">Business:</span> {form.name} ({types.find((t: any) => t.id === form.business_type_id)?.label})</p>
            <p><span className="text-gray-500">Owner:</span> {form.owner_first_name} {form.owner_last_name} ({form.owner_email})</p>
            <p><span className="text-gray-500">Plan:</span> {form.plan_name}</p>
          </div>
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>{createMut.isPending ? 'Creating...' : 'Create Business'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ViewBusinessModal({ business, onClose }: { business: any; onClose: () => void }) {
  if (!business) return null;
  return (
    <Modal open={!!business} onClose={onClose} title={business.name} width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Type:</span> {business.business_type?.label}</div>
          <div><span className="text-gray-500">Email:</span> {business.email}</div>
          <div><span className="text-gray-500">Phone:</span> {business.phone || '—'}</div>
          <div><span className="text-gray-500">Currency:</span> {business.currency}</div>
          <div><span className="text-gray-500">Status:</span> <Badge color={business.is_active ? 'green' : 'red'}>{business.is_active ? 'Active' : 'Suspended'}</Badge></div>
          <div><span className="text-gray-500">Subscription:</span> <Badge color="blue">{business.subscription?.plan_name} ({business.subscription?.status})</Badge></div>
        </div>
        {business.locations?.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-2">Locations ({business.locations.length})</h3>
            {business.locations.map((l: any) => <div key={l.id} className="text-sm py-1 text-gray-600">{l.name} — {l.city || 'No city'}</div>)}
          </div>
        )}
        {business.users?.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-2">Users ({business.users.length})</h3>
            {business.users.map((u: any) => (
              <div key={u.id} className="flex items-center gap-2 text-sm py-1">
                <span>{u.first_name} {u.last_name}</span>
                <Badge color="gray">{u.role}</Badge>
                <span className="text-gray-400">{u.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
