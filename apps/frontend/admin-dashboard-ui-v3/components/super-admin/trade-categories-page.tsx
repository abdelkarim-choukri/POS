"use client"
import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, ChevronRight, ChevronDown, Tag } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface TradeCategory {
  id: string
  name: string
  name_ar: string
  code: string
  parent_id: string | null
  children?: TradeCategory[]
  business_count: number
  is_active: boolean
}

interface TradeCategoryOption {
  id: string
  name: string
  code: string
}

export default function TradeCategoriesPage() {
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [categoryOptions, setCategoryOptions] = useState<TradeCategoryOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TradeCategory | null>(null)
  const [form, setForm] = useState({ name: "", name_ar: "", code: "", parent_id: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<TradeCategory[] | { data: TradeCategory[] }>("/api/super/trade-categories/tree")
      setCategories(Array.isArray(res) ? res : res.data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load trade categories")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryOptions = async () => {
    try {
      const res = await apiFetch<TradeCategoryOption[] | { data: TradeCategoryOption[] }>("/api/super/trade-categories/options")
      setCategoryOptions(Array.isArray(res) ? res : (res as { data: TradeCategoryOption[] }).data)
    } catch {
      // options are non-critical; fall back to tree-derived list
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchCategoryOptions()
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openAdd = (parentId?: string) => {
    setEditing(null)
    setForm({ name: "", name_ar: "", code: "", parent_id: parentId ?? "" })
    setShowModal(true)
  }

  const openEdit = (cat: TradeCategory) => {
    setEditing(cat)
    setForm({ name: cat.name, name_ar: cat.name_ar, code: cat.code, parent_id: cat.parent_id ?? "" })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) return
    setError(null)
    try {
      const body: Record<string, string | undefined> = {
        name: form.name,
        code: form.code,
        name_ar: form.name_ar || undefined,
        parent_id: form.parent_id || undefined,
      }
      if (editing) {
        await apiFetch(`/api/super/trade-categories/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
      } else {
        await apiFetch("/api/super/trade-categories", { method: "POST", body: JSON.stringify(body) })
      }
      await fetchCategories()
      await fetchCategoryOptions()
      setShowModal(false)
    } catch (e: any) {
      setError(e.message ?? "Failed to save category")
    }
  }

  const remove = async (id: string) => {
    setError(null)
    try {
      await apiFetch(`/api/super/trade-categories/${id}`, { method: "DELETE" })
      setConfirmDelete(null)
      await fetchCategories()
      await fetchCategoryOptions()
    } catch (e: any) {
      setError(e.message ?? "Failed to delete category")
    }
  }

  const renderCategory = (cat: TradeCategory, depth = 0) => {
    const isExpanded = expanded.has(cat.id)
    const hasChildren = (cat.children?.length ?? 0) > 0

    return (
      <div key={cat.id}>
        <div className={`flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors ${depth > 0 ? "pl-10 border-l-2 border-gray-100 dark:border-[#1F1F23] ml-6" : ""}`}>
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button onClick={() => toggleExpand(cat.id)} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-5" />
            )}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${depth === 0 ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
              <Tag className={`w-4 h-4 ${depth === 0 ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 dark:text-white">{cat.name}</p>
                <code className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded font-mono">{cat.code}</code>
                {!cat.is_active && <span className="text-xs text-gray-400 dark:text-gray-600">Inactive</span>}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{cat.name_ar} · {cat.business_count} businesses</p>
            </div>
          </div>
          <div className="flex gap-2">
            {depth === 0 && (
              <button onClick={() => openAdd(cat.id)}
                className="px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                + Sub
              </button>
            )}
            <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            {confirmDelete === cat.id ? (
              <div className="flex gap-1 items-center">
                <button onClick={() => remove(cat.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Confirm</button>
                <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(cat.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {cat.children!.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage trade categories used to classify businesses.</p>
        <button onClick={() => openAdd()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden divide-y divide-gray-100 dark:divide-[#1F1F23]">
        {categories.map(cat => renderCategory(cat))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Category" : "New Category"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name (FR) *</label>
                  <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Retail" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code *</label>
                  <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                    value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="RETAIL" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name (AR)</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" dir="rtl"
                  value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} placeholder="تجارة التجزئة" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parent Category</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.parent_id} onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}>
                  <option value="">None (top level)</option>
                  {(categoryOptions.length > 0 ? categoryOptions : categories).map(c => (
                    <option key={c.id} value={c.id}>{c.name}{(c as TradeCategoryOption).code ? ` (${(c as TradeCategoryOption).code})` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                {editing ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
