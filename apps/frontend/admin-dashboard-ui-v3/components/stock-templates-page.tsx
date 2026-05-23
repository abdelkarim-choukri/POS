"use client"
import { useState } from "react"
import { Plus, Trash2, X, Search, LayoutList, FileText } from "lucide-react"

interface TemplateItem { product: string; qty: number; unit: string }
interface StockTemplate { id: string; name: string; description?: string; item_count: number; items: TemplateItem[]; is_active: boolean }

const mockTemplates: StockTemplate[] = [
  { id: "t-1", name: "Weekly Coffee Supplies", description: "Standard weekly coffee station restock", item_count: 5, is_active: true,
    items: [{ product: "Arabica Coffee Beans", qty: 20, unit: "kg" }, { product: "Whole Milk", qty: 60, unit: "L" }, { product: "Paper Cups (M)", qty: 500, unit: "pcs" }, { product: "Vanilla Syrup", qty: 3, unit: "L" }, { product: "Sugar Sachets", qty: 300, unit: "pcs" }] },
  { id: "t-2", name: "Monthly Bakery Order", description: "Frozen items for cold storage", item_count: 3, is_active: true,
    items: [{ product: "Croissants (frozen)", qty: 400, unit: "pcs" }, { product: "Pain au Chocolat", qty: 200, unit: "pcs" }, { product: "Muffins (frozen)", qty: 150, unit: "pcs" }] },
  { id: "t-3", name: "Emergency Top-Up", description: "Fast replenishment for critical items", item_count: 2, is_active: true,
    items: [{ product: "Paper Cups (M)", qty: 200, unit: "pcs" }, { product: "Whole Milk", qty: 20, unit: "L" }] },
]

export default function StockTemplatesPage() {
  const [templates, setTemplates] = useState(mockTemplates)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setForm({ name: "", description: "" }); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(t => (
          <div key={t.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23]">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <LayoutList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                {t.description && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t.description}</p>}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t.item_count} items</span>
              <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#1F1F23] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                {expanded === t.id ? "Hide" : "View Items"}
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <FileText className="w-3.5 h-3.5 inline mr-1" />Generate PO
              </button>
              {confirmDelete === t.id ? (
                <div className="flex gap-1">
                  <button onClick={() => { setTemplates(prev => prev.filter(x => x.id !== t.id)); setConfirmDelete(null) }} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                  <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {expanded === t.id && (
              <div className="border-t border-gray-100 dark:border-[#1F1F23] px-4 pb-4 pt-3">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="pb-2">Product</th><th className="pb-2">Qty</th><th className="pb-2">Unit</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[#1F1F23]">
                    {t.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5 text-gray-900 dark:text-white">{item.product}</td>
                        <td className="py-1.5 text-gray-600 dark:text-gray-400">{item.qty}</td>
                        <td className="py-1.5 text-gray-600 dark:text-gray-400">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Template</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Template name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={() => {
                if (!form.name.trim()) return
                setTemplates(prev => [...prev, { id: `t-${Date.now()}`, name: form.name, description: form.description, item_count: 0, items: [], is_active: true }])
                setShowModal(false)
              }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Create Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
