"use client"
import { useState, useEffect } from "react"
import { Plus, Trash2, X, Search, LayoutList, FileText } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface TemplateItem {
  id?: string
  product_id?: string
  product?: { id: string; name: string }
  quantity: number
  unit?: string
}

interface StockTemplate {
  id: string
  name: string
  description?: string
  item_count: number
  items: TemplateItem[]
  is_active: boolean
}

export default function StockTemplatesPage() {
  const [templates, setTemplates] = useState<StockTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [detailItems, setDetailItems] = useState<Record<string, TemplateItem[]>>({})
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [generatingPo, setGeneratingPo] = useState<string | null>(null)
  const [poToast, setPoToast] = useState<string | null>(null)

  // 1. GET /api/business/stock-templates — load on mount
  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: StockTemplate[] } | StockTemplate[]>("/api/business/stock-templates")
      setTemplates(Array.isArray(res) ? res : (res as { data: StockTemplate[] }).data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load stock templates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  // 2. GET /api/business/stock-templates/:id — load detail on row click (expand)
  const toggleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (detailItems[id]) return // already loaded
    setLoadingDetail(id)
    try {
      const res = await apiFetch<StockTemplate>(`/api/business/stock-templates/${id}`)
      setDetailItems(prev => ({ ...prev, [id]: res.items ?? [] }))
    } catch (e: any) {
      setError(e.message ?? "Failed to load template detail")
    } finally {
      setLoadingDetail(null)
    }
  }

  // 3. POST /api/business/stock-templates — create
  const createTemplate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, any> = { name: form.name }
      if (form.description.trim()) body.description = form.description.trim()
      await apiFetch("/api/business/stock-templates", { method: "POST", body: JSON.stringify(body) })
      await fetchTemplates()
      setShowModal(false)
    } catch (e: any) {
      setError(e.message ?? "Failed to create template")
    } finally {
      setSaving(false)
    }
  }

  // 5. DELETE /api/business/stock-templates/:id — delete
  const deleteTemplate = async (id: string) => {
    setConfirmDelete(null)
    setError(null)
    try {
      await apiFetch(`/api/business/stock-templates/${id}`, { method: "DELETE" })
      setDetailItems(prev => { const n = { ...prev }; delete n[id]; return n })
      await fetchTemplates()
    } catch (e: any) {
      setError(e.message ?? "Failed to delete template")
    }
  }

  // 6. POST /api/business/stock-templates/:id/create-purchase-order — generate PO
  const generatePo = async (id: string) => {
    setGeneratingPo(id)
    setError(null)
    try {
      const res = await apiFetch<{ po_number?: string; purchase_order?: { po_number: string } }>(
        `/api/business/stock-templates/${id}/create-purchase-order`,
        { method: "POST", body: JSON.stringify({}) }
      )
      const poNumber = res.po_number ?? res.purchase_order?.po_number ?? "PO created"
      setPoToast(`Purchase order ${poNumber} generated successfully`)
      setTimeout(() => setPoToast(null), 4000)
    } catch (e: any) {
      setError(e.message ?? "Failed to generate purchase order")
    } finally {
      setGeneratingPo(null)
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-400 text-sm">Loading...</div>

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {poToast && (
        <div className="px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          {poToast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => { setForm({ name: "", description: "" }); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
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
              <span className="text-sm text-gray-500 dark:text-gray-400">{t.item_count ?? 0} items</span>
              <button
                onClick={() => toggleExpand(t.id)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#1F1F23] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors"
              >
                {expanded === t.id ? "Hide" : "View Items"}
              </button>
              <button
                onClick={() => generatePo(t.id)}
                disabled={generatingPo === t.id}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                {generatingPo === t.id ? "Generating..." : "Generate PO"}
              </button>
              {confirmDelete === t.id ? (
                <div className="flex gap-1">
                  <button onClick={() => deleteTemplate(t.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                  <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(t.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {expanded === t.id && (
              <div className="border-t border-gray-100 dark:border-[#1F1F23] px-4 pb-4 pt-3">
                {loadingDetail === t.id ? (
                  <p className="text-sm text-gray-400">Loading items...</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase">
                        <th className="pb-2">Product</th>
                        <th className="pb-2">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-[#1F1F23]">
                      {(detailItems[t.id] ?? []).map((item, i) => (
                        <tr key={item.id ?? i}>
                          <td className="py-1.5 text-gray-900 dark:text-white">
                            {item.product?.name ?? item.product_id ?? "—"}
                          </td>
                          <td className="py-1.5 text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        </tr>
                      ))}
                      {(detailItems[t.id] ?? []).length === 0 && (
                        <tr><td colSpan={2} className="py-2 text-gray-400">No items</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-gray-400">No templates found</div>
        )}
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
              <input
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Template name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button
                onClick={createTemplate}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
