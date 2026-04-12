import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Clock } from 'lucide-react';
import { employeeApi } from '../../api/business';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import type { Employee, ClockEntry } from '../../types';
import { format } from 'date-fns';

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [clockEmpId, setClockEmpId] = useState<string | null>(null);

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => employeeApi.list().then(r => r.data) });

  const statusMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => employeeApi.updateStatus(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Button onClick={() => { setEditEmp(null); setShowModal(true); }}><Plus size={16} /> Add Employee</Button>
      </div>

      <Card>
        {employees.length === 0 ? (
          <EmptyState icon={<Users size={40} />} title="No employees" description="Add your first employee" />
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Permissions</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {employees.map((e: Employee) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{e.first_name} {e.last_name}</td>
                  <td className="px-4 py-3 text-gray-500">{e.email || '—'}</td>
                  <td className="px-4 py-3"><Badge color={e.role === 'owner' ? 'blue' : e.role === 'manager' ? 'purple' : 'gray'}>{e.role}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {e.can_void && <Badge color="yellow">Void</Badge>}
                      {e.can_refund && <Badge color="yellow">Refund</Badge>}
                      {e.dashboard_access && <Badge color="blue">Dashboard</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge color={e.is_active ? 'green' : 'red'}>{e.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditEmp(e); setShowModal(true); }}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setClockEmpId(e.id)}><Clock size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => statusMut.mutate({ id: e.id, active: !e.is_active })}>
                        {e.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <EmployeeModal open={showModal} onClose={() => setShowModal(false)} employee={editEmp} />
      <ClockHistoryModal empId={clockEmpId} onClose={() => setClockEmpId(null)} />
    </div>
  );
}

function EmployeeModal({ open, onClose, employee }: { open: boolean; onClose: () => void; employee: Employee | null }) {
  const qc = useQueryClient();
  const isEdit = !!employee;
  const [form, setForm] = useState({
    first_name: employee?.first_name || '', last_name: employee?.last_name || '',
    email: employee?.email || '', phone: employee?.phone || '', password: '',
    pin: '', role: employee?.role || 'employee',
    can_void: employee?.can_void || false, can_refund: employee?.can_refund || false,
    dashboard_access: employee?.dashboard_access || false,
  });

  const saveMut = useMutation({
    mutationFn: (data: any) => isEdit ? employeeApi.update(employee!.id, data) : employeeApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); onClose(); },
  });

  const handleSubmit = () => {
    const data: any = { ...form };
    if (isEdit) { delete data.password; if (!data.pin) delete data.pin; }
    saveMut.mutate(data);
  };

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Employee' : 'Add Employee'} width="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
          <Input label="Last Name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        {!isEdit && <Input label="Password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required />}
        <div className="grid grid-cols-2 gap-4">
          <Input label="PIN (4-6 digits)" value={form.pin} onChange={(e) => set('pin', e.target.value)} maxLength={6} />
          <Select label="Role" value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Permissions</label>
          <div className="flex gap-4">
            {(['can_void', 'can_refund', 'dashboard_access'] as const).map((perm) => (
              <label key={perm} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form[perm]} onChange={(e) => set(perm, e.target.checked)} className="rounded border-gray-300" />
                {perm.replace('_', ' ').replace('can ', 'Can ')}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saveMut.isPending}>{saveMut.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ClockHistoryModal({ empId, onClose }: { empId: string | null; onClose: () => void }) {
  const { data: history = [] } = useQuery({
    queryKey: ['clockHistory', empId],
    queryFn: () => employeeApi.clockHistory(empId!).then(r => r.data),
    enabled: !!empId,
  });

  return (
    <Modal open={!!empId} onClose={onClose} title="Clock History" width="max-w-2xl">
      {history.length === 0 ? <p className="text-sm text-gray-500 py-4 text-center">No clock entries</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b">
            <th className="pb-2 font-medium">Clock In</th>
            <th className="pb-2 font-medium">Clock Out</th>
            <th className="pb-2 font-medium">Hours</th>
          </tr></thead>
          <tbody>
            {history.map((c: ClockEntry) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-2">{format(new Date(c.clock_in), 'MMM dd, HH:mm')}</td>
                <td className="py-2">{c.clock_out ? format(new Date(c.clock_out), 'MMM dd, HH:mm') : <Badge color="green">Active</Badge>}</td>
                <td className="py-2">{c.total_hours ? `${c.total_hours}h` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
