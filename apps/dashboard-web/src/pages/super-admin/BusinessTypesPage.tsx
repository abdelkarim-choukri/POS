import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Layers, Settings } from 'lucide-react';
import { superBusinessTypeApi } from '../../api/super-admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Toggle from '../../components/ui/Toggle';

const ALL_FEATURES = ['modifiers', 'variants', 'sold_out', 'clock_in', 'combos', 'batch_tracking', 'room_charges'];

export default function BusinessTypesPage() {
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: types = [] } = useQuery({ queryKey: ['sa-types'], queryFn: () => superBusinessTypeApi.list().then(r => r.data) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Business Types</h1>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Add Type</Button>
      </div>

      <div className="flex gap-6">
        <div className="w-64 shrink-0">
          <Card className="p-3 space-y-1">
            {types.map((t: any) => (
              <button key={t.id} onClick={() => setSelectedType(t)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedType?.id === t.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span>{t.label}</span>
                  <Badge color={t.is_active ? 'green' : 'gray'}>{t.features?.length || 0}</Badge>
                </div>
              </button>
            ))}
          </Card>
        </div>

        <div className="flex-1">
          {selectedType ? (
            <FeatureConfig type={selectedType} />
          ) : (
            <Card className="p-8 text-center text-gray-400">
              <Layers size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a business type to configure features</p>
            </Card>
          )}
        </div>
      </div>

      <CreateTypeModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function FeatureConfig({ type }: { type: any }) {
  const qc = useQueryClient();
  const enabledFeatures = (type.features || []).reduce((acc: Record<string, boolean>, f: any) => {
    acc[f.feature_key] = f.is_enabled;
    return acc;
  }, {} as Record<string, boolean>);

  const saveMut = useMutation({
    mutationFn: (features: any[]) => superBusinessTypeApi.updateFeatures(type.id, { features }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-types'] }),
  });

  const toggleFeature = (key: string) => {
    const current = enabledFeatures[key] || false;
    saveMut.mutate([{ feature_key: key, is_enabled: !current }]);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">{type.label}</h2>
          <p className="text-sm text-gray-500">{type.description || `Configure features for ${type.name} businesses`}</p>
        </div>
        <Badge color={type.is_active ? 'green' : 'gray'}>{type.is_active ? 'Active' : 'Inactive'}</Badge>
      </div>

      <div className="space-y-3">
        {ALL_FEATURES.map((key) => (
          <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
            <div>
              <p className="text-sm font-medium capitalize">{key.replace('_', ' ')}</p>
              <p className="text-xs text-gray-400">Enable {key.replace('_', ' ')} for this business type</p>
            </div>
            <Toggle checked={enabledFeatures[key] || false} onChange={() => toggleFeature(key)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function CreateTypeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', label: '', description: '' });

  const createMut = useMutation({
    mutationFn: () => superBusinessTypeApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-types'] }); setForm({ name: '', label: '', description: '' }); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} title="Add Business Type">
      <div className="space-y-4">
        <Input label="Name (key)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. bakery" required />
        <Input label="Label (display)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Bakery / Pâtisserie" required />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMut.mutate()} disabled={!form.name || !form.label || createMut.isPending}>{createMut.isPending ? 'Creating...' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  );
}
