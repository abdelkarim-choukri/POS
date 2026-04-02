import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package } from 'lucide-react';
import { categoryApi, productApi } from '../../api/business';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import type { Category, Product } from '../../types';

export default function ProductsPage() {
  const qc = useQueryClient();
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoryApi.list().then(r => r.data) });
  const { data: products = [] } = useQuery({ queryKey: ['products', selectedCat], queryFn: () => productApi.list(selectedCat || undefined).then(r => r.data) });

  const toggleMut = useMutation({
    mutationFn: (id: string) => productApi.toggleSoldOut(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const filtered = products.filter((p: Product) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCatModal(true)}><Plus size={16} /> Category</Button>
          <Button onClick={() => { setEditProduct(null); setShowModal(true); }}><Plus size={16} /> Product</Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Category sidebar */}
        <div className="w-48 shrink-0">
          <Card className="p-3 space-y-1">
            <button onClick={() => setSelectedCat('')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!selectedCat ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              All Products
            </button>
            {categories.map((c: Category) => (
              <button key={c.id} onClick={() => setSelectedCat(c.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedCat === c.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                {c.name}
              </button>
            ))}
          </Card>
        </div>

        {/* Product list */}
        <div className="flex-1">
          <Card>
            <div className="p-4 border-b">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={<Package size={40} />} title="No products" description="Add your first product to get started" />
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Sold Out</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((p: Product) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{p.name}</span>
                          {!p.is_active && <Badge color="gray" >Archived</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">{parseFloat(String(p.price)).toFixed(2)} MAD</td>
                      <td className="px-4 py-3 text-gray-500">{p.sku || '—'}</td>
                      <td className="px-4 py-3">{p.category?.name || '—'}</td>
                      <td className="px-4 py-3"><Toggle checked={p.is_sold_out} onChange={() => toggleMut.mutate(p.id)} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditProduct(p); setShowModal(true); }}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm('Archive this product?')) deleteMut.mutate(p.id); }}>Archive</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal open={showModal} onClose={() => setShowModal(false)} product={editProduct} categories={categories} />

      {/* Category Modal */}
      <CategoryModal open={showCatModal} onClose={() => setShowCatModal(false)} />
    </div>
  );
}

function ProductModal({ open, onClose, product, categories }: { open: boolean; onClose: () => void; product: Product | null; categories: Category[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', price: '', cost_price: '', sku: '', category_id: '', description: '' });

  const isEdit = !!product;

  useState(() => {
    if (product) {
      setForm({ name: product.name, price: String(product.price), cost_price: String(product.cost_price || ''), sku: product.sku || '', category_id: product.category_id, description: product.description || '' });
    } else {
      setForm({ name: '', price: '', cost_price: '', sku: '', category_id: categories[0]?.id || '', description: '' });
    }
  });

  const saveMut = useMutation({
    mutationFn: (data: any) => isEdit ? productApi.update(product!.id, data) : productApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onClose(); },
  });

  const handleSubmit = () => {
    saveMut.mutate({
      name: form.name,
      price: parseFloat(form.price),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : undefined,
      sku: form.sku || undefined,
      category_id: form.category_id,
      description: form.description || undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Product' : 'Add Product'}>
      <div className="space-y-4">
        <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Select label="Category" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Price (MAD)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <Input label="Cost Price (MAD)" type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
        </div>
        <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saveMut.isPending}>{saveMut.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function CategoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const saveMut = useMutation({
    mutationFn: () => categoryApi.create({ name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setName(''); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} title="Add Category">
      <div className="space-y-4">
        <Input label="Category Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electronics" required />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={!name || saveMut.isPending}>{saveMut.isPending ? 'Saving...' : 'Create'}</Button>
        </div>
      </div>
    </Modal>
  );
}
