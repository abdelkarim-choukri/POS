"use client"
import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, FolderOpen, Search } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Category {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  product_count: number
}

const mockCategories: Category[] = [
  { id: "cat-1", name: "Beverages", description: "Hot and cold drinks", sort_order: 1, is_active: true, product_count: 24 },
  { id: "cat-2", name: "Food", description: "Main dishes and sides", sort_order: 2, is_active: true, product_count: 18 },
  { id: "cat-3", name: "Desserts", description: "Pastries and sweets", sort_order: 3, is_active: true, product_count: 12 },
  { id: "cat-4", name: "Snacks", description: "Light bites", sort_order: 4, is_active: true, product_count: 8 },
  { id: "cat-5", name: "Seasonal", description: "Limited time items", sort_order: 5, is_active: false, product_count: 5 },
  { id: "cat-6", name: "Alcohol", description: "Alcoholic beverages", sort_order: 6, is_active: false, product_count: 0 },
]

export default function CategoriesPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const [items, setItems] = useState(mockCategories)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", description: "", sort_order: 1 })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    apiFetch<{ data: any[] }>("/api/business/categories")
      .then(res => {
        const mapped: Category[] = res.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          sort_order: c.sort_order ?? 0,
          is_active: c.is_active ?? true,
          product_count: c.product_count ?? 0,
        }))
        setItems(mapped)
      })
      .catch(e => setError(e.message ?? "Failed to load categories"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => {
    setEditing(null)
    setForm({ name: "", description: "", sort_order: items.length + 1 })
    setShowModal(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, description: c.description ?? "", sort_order: c.sort_order })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setError(null)
    try {
      if (editing) {
        const updated = await apiFetch<any>(`/api/business/categories/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: form.name, description: form.description || undefined, sort_order: form.sort_order }),
        })
        setItems(prev => prev.map(c => c.id === editing.id ? { ...c, name: updated.name, description: updated.description, sort_order: updated.sort_order } : c))
      } else {
        const created = await apiFetch<any>("/api/business/categories", {
          method: "POST",
          body: JSON.stringify({ name: form.name, description: form.description || undefined, sort_order: form.sort_order }),
        })
        setItems(prev => [...prev, { id: created.id, name: created.name, description: created.description, sort_order: created.sort_order ?? form.sort_order, is_active: created.is_active ?? true, product_count: 0 }])
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to save category")
    }
    setShowModal(false)
  }

  const toggle = (id: string) =>
    setItems(prev => prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c))

  const remove = async (id: string) => {
    setError(null)
    try {
      await apiFetch(`/api/business/categories/${id}`, { method: "DELETE" })
      setItems(prev => prev.filter(c => c.id !== id))
    } catch (e: any) {
      setError(e.message ?? "Failed to delete category")
    }
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>
              {["Name", "Description", "Products", "Sort", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 dark:text-gray-600">Loading...</td></tr>
            )}
            {!loading && filtered.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{cat.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{cat.product_count}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{cat.sort_order}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(cat.id)}>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDelete === cat.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => remove(cat.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded-md">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded-md">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(cat.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 dark:text-gray-600">No categories found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Category" : "New Category"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            {[
              { label: "Name *", key: "name", placeholder: "e.g. Beverages" },
              { label: "Description", key: "description", placeholder: "Optional" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
              <input
                type="number" min={1}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                {editing ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
