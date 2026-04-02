import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Wifi, WifiOff } from 'lucide-react';
import { locationApi } from '../../api/business';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import type { Location } from '../../types';

export default function LocationsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editLoc, setEditLoc] = useState<Location | null>(null);

  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: () => locationApi.list().then(r => r.data) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locations</h1>
        <Button onClick={() => { setEditLoc(null); setShowModal(true); }}><Plus size={16} /> Add Location</Button>
      </div>

      {locations.length === 0 ? (
        <Card><EmptyState icon={<MapPin size={40} />} title="No locations" description="Add your first location" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc: Location) => (
            <Card key={loc.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{loc.name}</h3>
                  {loc.city && <p className="text-sm text-gray-500">{loc.city}</p>}
                </div>
                <Badge color={loc.is_active ? 'green' : 'red'}>{loc.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              {loc.address && <p className="text-sm text-gray-600 mb-3">{loc.address}</p>}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  {loc.terminals?.some(t => t.is_online)
                    ? <><Wifi size={14} className="text-green-500" /> {loc.terminals?.filter(t => t.is_online).length} online</>
                    : <><WifiOff size={14} className="text-gray-400" /> 0 online</>
                  }
                </span>
                <span>{loc.terminals?.length || 0} terminal(s)</span>
              </div>
              {loc.terminals && loc.terminals.length > 0 && (
                <div className="space-y-1 mb-3">
                  {loc.terminals.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${t.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>{t.terminal_code}</span>
                      <span className="text-gray-400">{t.device_name}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="secondary" size="sm" className="w-full" onClick={() => { setEditLoc(loc); setShowModal(true); }}>Edit</Button>
            </Card>
          ))}
        </div>
      )}

      <LocationModal open={showModal} onClose={() => setShowModal(false)} location={editLoc} />
    </div>
  );
}

function LocationModal({ open, onClose, location }: { open: boolean; onClose: () => void; location: Location | null }) {
  const qc = useQueryClient();
  const isEdit = !!location;
  const [form, setForm] = useState({ name: location?.name || '', address: location?.address || '', city: location?.city || '', phone: location?.phone || '' });

  const saveMut = useMutation({
    mutationFn: (data: any) => isEdit ? locationApi.update(location!.id, data) : locationApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Location' : 'Add Location'}>
      <div className="space-y-4">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Downtown Branch" required />
        <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate(form)} disabled={!form.name || saveMut.isPending}>{saveMut.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  );
}
