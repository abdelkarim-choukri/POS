"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, ChevronRight, ChevronDown, Tag } from "lucide-react"

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

const mockCategories: TradeCategory[] = [
  {
    id: "tc-1", name: "Retail", name_ar: "تجارة التجزئة", code: "RETAIL", parent_id: null, business_count: 42, is_active: true,
    children: [
      { id: "tc-1-1", name: "Grocery", name_ar: "بقالة", code: "GROCERY", parent_id: "tc-1", business_count: 18, is_active: true },
      { id: "tc-1-2", name: "Electronics", name_ar: "إلكترونيات", code: "ELECTRONICS", parent_id: "tc-1", business_count: 12, is_active: true },
      { id: "tc-1-3", name: "Clothing", name_ar: "ملابس", code: "CLOTHING", parent_id: "tc-1", business_count: 12, is_active: false },
    ]
  },
  {
    id: "tc-2", name: "Restaurant", name_ar: "مطعم", code: "RESTAURANT", parent_id: null, business_count: 31, is_active: true,
    children: [
      { id: "tc-2-1", name: "Café", name_ar: "مقهى", code: "CAFE", parent_id: "tc-2", business_count: 15, is_active: true },
      { id: "tc-2-2", name: "Fast Food", name_ar: "وجبات سريعة", code: "FASTFOOD", parent_id: "tc-2", business_count: 16, is_active: true },
    ]
  },
  { id: "tc-3", name: "Pharmacy", name_ar: "صيدلية", code: "PHARMACY", parent_id: null, business_count: 14, is_active: true, children: [] },
  { id: "tc-4", name: "Salon & Spa", name_ar: "صالون وسبا", code: "SALON", parent_id: null, business_count: 9, is_active: true, children: [] },
  { id: "tc-5", name: "Hotel", name_ar: "فندق", code: "HOTEL", parent_id: null, business_count: 5, is_active: true, children: [] },
]

export default function TradeCategoriesPage() {
  const [categories, setCategories] = useState(mockCategories)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["tc-1", "tc-2"]))
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TradeCategory | null>(null)
  const [form, setForm] = useState({ name: "", name_ar: "", code: "", parent_id: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

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

  const save = () => {
    if (!form.name.trim() || !form.code.trim()) return
    if (editing) {
      setCategories(prev => prev.map(c => {
        if (c.id === editing.id) return { ...c, ...form, parent_id: form.parent_id || null }
        return {
          ...c,
          children: c.children?.map(ch => ch.id === editing.id ? { ...ch, ...form, parent_id: form.parent_id || null } : ch)
        }
      }))
    } else {
      const newCat: TradeCategory = { id: `tc-${Date.now()}`, ...form, parent_id: form.parent_id || null, business_count: 0, is_active: true }
      if (form.parent_id) {
        setCategories(prev => prev.map(c =>
          c.id === form.parent_id ? { ...c, children: [...(c.children ?? []), newCat] } : c
        ))
      } else {
        setCategories(prev => [...prev, { ...newCat, children: [] }])
      }
    }
    setShowModal(false)
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

  return (
    <div className="space-y-6">
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
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
