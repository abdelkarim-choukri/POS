"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, X, FolderOpen, Search } from "lucide-react"
import { categoriesApi, productsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { Category } from "@/lib/merchant/types"

/**
 * Categories (merchant) — TanStack Query.
 *
 * Backend: GET/POST/PUT/DELETE /api/business/categories.
 *   - list returns a plain ARRAY (no `product_count`, no `description` column)
 *   - CreateCategoryDto = { name, sort_order? }; UpdateCategoryDto adds is_active
 *   - update verb is PUT (not PATCH); DELETE is a soft-delete (is_active=false)
 * Per-category product counts are derived client-side from GET /business/products.
 */
export default function CategoriesPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<{ name: string; sort_order: number }>({ name: "", sort_order: 1 })
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: merchantKeys.categories.list(),
    queryFn: () => categoriesApi.list(),
  })
  const productsQuery = useQuery({
    queryKey: merchantKeys.products.list(null),
    queryFn: () => productsApi.list(),
  })
  const categories = categoriesQuery.data ?? []
  const products = productsQuery.data ?? []

  const countFor = (catId: string) => products.filter(p => p.category_id === catId).length

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.categories.all })

  const createMutation = useMutation({
    mutationFn: (input: { name: string; sort_order?: number }) => categoriesApi.create(input),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to add category.")),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; sort_order?: number; is_active?: boolean } }) => categoriesApi.update(id, input),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to update category.")),
  })
  // inline status toggle (no form surface)
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => categoriesApi.update(id, { is_active }),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: merchantKeys.products.all }); setConfirmDelete(null) },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q ? categories.filter(c => c.name.toLowerCase().includes(q)) : categories
    return [...list].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  }, [categories, search])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: "", sort_order: (categories.reduce((m, c) => Math.max(m, c.sort_order), 0) || 0) + 1 })
    setFormError(null)
    setShowModal(true)
  }
  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, sort_order: c.sort_order })
    setFormError(null)
    setShowModal(true)
  }
  const save = () => {
    setFormError(null)
    if (!form.name.trim()) { setFormError("Name is required."); return }
    if (editing) updateMutation.mutate({ id: editing.id, input: { name: form.name.trim(), sort_order: form.sort_order } })
    else createMutation.mutate({ name: form.name.trim(), sort_order: form.sort_order })
  }

  const listError =
    (categoriesQuery.isError && humanizeError(categoriesQuery.error, "Failed to load categories.")) || null
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {listError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          {listError}
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
              {["Name", "Products", "Sort", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {categoriesQuery.isLoading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 dark:text-gray-600">Loading...</td></tr>
            )}
            {!categoriesQuery.isLoading && filtered.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className={`font-medium ${cat.is_active ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>{cat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onNavigate?.("products")}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                    title="View products"
                  >
                    {productsQuery.isLoading ? "…" : countFor(cat.id)}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{cat.sort_order}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleMutation.mutate({ id: cat.id, is_active: !cat.is_active })} disabled={toggleMutation.isPending}>
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
                        <button onClick={() => deleteMutation.mutate(cat.id)} disabled={deleteMutation.isPending} className="px-2 py-1 bg-red-500 text-white text-xs rounded-md disabled:opacity-50">{deleteMutation.isPending ? "…" : "Yes"}</button>
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
            {!categoriesQuery.isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 dark:text-gray-600">No categories found</td></tr>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Beverages"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
              <input
                type="number" min={1}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 1 }))}
              />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
