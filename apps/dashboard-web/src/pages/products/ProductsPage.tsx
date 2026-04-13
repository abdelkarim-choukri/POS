// apps/dashboard-web/src/pages/products/ProductsPage.tsx
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ImagePlus, X } from 'lucide-react';
import { productApi, categoryApi } from '../../api/business';
import {
  Card, Button, Input, Select, Modal, Toggle, Badge, EmptyState, LoadingSpinner,
} from '../../components/ui';
import type { Product, Category } from '../../types';

const API_BASE = 'http://127.0.0.1:3000';

// ─── Image uploader helper ───────────────────────────────────────────────────
async function uploadProductImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_BASE}/api/business/upload/product-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error('Image upload failed');
  const data = await res.json();
  // data.url = "/uploads/products/xxx.jpg"  → prefix with backend origin
  return `${API_BASE}${data.url}`;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.list().then(r => r.data),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then(r => r.data),
  });

  const qc = useQueryClient();
  const toggleMut = useMutation({
    mutationFn: productApi.toggleSoldOut,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
  const deleteMut = useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const filtered = (products as Product[]).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCatModal(true)}>+ Category</Button>
          <Button onClick={() => { setEditProduct(null); setShowModal(true); }}>+ Add Product</Button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid gap-6">
        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon={<Package size={40} />} title="No products" description="Add your first product to get started" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  {/* ← NEW image column */}
                  <th className="px-4 py-3 font-medium w-14">Image</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Sold Out</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: Product) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    {/* ← thumbnail cell */}
                    <td className="px-4 py-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package size={16} className="text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium">{p.name}</span>
                        {!p.is_active && <Badge color="gray">Archived</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{parseFloat(String(p.price)).toFixed(2)} MAD</td>
                    <td className="px-4 py-3 text-gray-500">{p.sku || '—'}</td>
                    <td className="px-4 py-3">{p.category?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Toggle checked={p.is_sold_out} onChange={() => toggleMut.mutate(p.id)} />
                    </td>
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

      <ProductModal open={showModal} onClose={() => setShowModal(false)} product={editProduct} categories={categories} />
      <CategoryModal open={showCatModal} onClose={() => setShowCatModal(false)} />
    </div>
  );
}

// ─── Product Modal ────────────────────────────────────────────────────────────
function ProductModal({
  open, onClose, product, categories,
}: {
  open: boolean; onClose: () => void; product: Product | null; categories: Category[];
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', price: '', cost_price: '', sku: '', category_id: '', description: '',
    image_url: '',       // ← NEW
  });
  const [imagePreview, setImagePreview] = useState<string>('');   // ← NEW
  const [uploading, setUploading] = useState(false);              // ← NEW

  const isEdit = !!product;

  useState(() => {
    if (product) {
      setForm({
        name: product.name,
        price: String(product.price),
        cost_price: String(product.cost_price || ''),
        sku: product.sku || '',
        category_id: product.category_id,
        description: product.description || '',
        image_url: product.image_url || '',                        // ← NEW
      });
      setImagePreview(product.image_url || '');                   // ← NEW
    } else {
      setForm({ name: '', price: '', cost_price: '', sku: '', category_id: categories[0]?.id || '', description: '', image_url: '' });
      setImagePreview('');
    }
  });

  // ── Image pick & upload ────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Local preview immediately
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch {
      alert('Image upload failed. Please try again.');
      setImagePreview(form.image_url);  // revert preview
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImagePreview('');
    setForm((f) => ({ ...f, image_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: (data: any) =>
      isEdit ? productApi.update(product!.id, data) : productApi.create(data),
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
      image_url: form.image_url || undefined,                     // ← NEW
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Product' : 'Add Product'}>
      <div className="space-y-4">

        {/* ── Image Upload Zone ─────────────────────────────────────────── */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Product Image</label>
          <div
            className="relative w-full h-40 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 transition cursor-pointer overflow-hidden bg-gray-50 flex items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                {/* uploading overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Uploading…</span>
                  </div>
                )}
                {/* remove button */}
                {!uploading && (
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                    onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  >
                    <X size={14} />
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImagePlus size={28} />
                <span className="text-sm">Click to upload image</span>
                <span className="text-xs">JPG, PNG or WEBP · max 2 MB</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {/* ── End Image Upload Zone ──────────────────────────────────────── */}

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
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saveMut.isPending || uploading}>
            {saveMut.isPending ? 'Saving…' : uploading ? 'Uploading…' : isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Category Modal (unchanged) ───────────────────────────────────────────────
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
          <Button onClick={() => saveMut.mutate()} disabled={!name || saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
