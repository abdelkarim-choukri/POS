"use client"
import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, X, Search, LayoutList, FileText, Pencil } from "lucide-react"
import { stockTemplatesApi, productsApi, vendorsApi, warehousesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type {
  StockTemplate, CreateTemplateInput, UpdateTemplateInput, TemplateItemInput, GeneratePoInput,
} from "@/lib/merchant/types"

function num(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }

type ItemRow = { product_id: string; default_quantity: string }
type Form = { name: string; default_vendor_id: string; default_warehouse_id: string; items: ItemRow[] }
const emptyForm: Form = { name: "", default_vendor_id: "", default_warehouse_id: "", items: [] }

export default function StockTemplatesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<StockTemplate | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [poTarget, setPoTarget] = useState<StockTemplate | null>(null)
  const [poForm, setPoForm] = useState<{ vendor_id: string; warehouse_id: string; expected_delivery_date: string }>({ vendor_id: "", warehouse_id: "", expected_delivery_date: "" })
  const [poToast, setPoToast] = useState<string | null>(null)

  // ── Queries ──
  const listQuery = useQuery({ queryKey: merchantKeys.inventory.templates(), queryFn: () => stockTemplatesApi.list() })
  const templates = listQuery.data ?? []
  const productsQuery = useQuery({ queryKey: merchantKeys.inventory.products(), queryFn: () => productsApi.list() })
  const products = productsQuery.data ?? []
  const vendorsQuery = useQuery({ queryKey: merchantKeys.vendors.list(), queryFn: () => vendorsApi.list() })
  const vendors = vendorsQuery.data ?? []
  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: () => warehousesApi.list() })
  const warehouses = warehousesQuery.data ?? []
  const detailQuery = useQuery({
    queryKey: expanded ? merchantKeys.inventory.templateDetail(expanded) : ["inventory", "templates", "none"],
    queryFn: () => stockTemplatesApi.detail(expanded!),
    enabled: !!expanded,
  })

  const productName = useMemo(() => { const m = new Map(products.map(p => [p.id, p.name])); return (id: string) => m.get(id) ?? id.slice(0, 8) }, [products])
  const vendorName = useMemo(() => { const m = new Map(vendors.map(v => [v.id, v.name])); return (id: string | null) => (id ? m.get(id) ?? "—" : null) }, [vendors])
  const productOpts = useMemo(() => products.map(p => ({ id: p.id, name: p.name })), [products])

  // ── Mutations ──
  // exact:true so we don't prefix-match (and refetch) the per-template detail query.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.inventory.templates(), exact: true })
  const createMutation = useMutation({
    mutationFn: (input: CreateTemplateInput) => stockTemplatesApi.create(input),
    onSuccess: () => { invalidate(); setShowModal(false); setForm(emptyForm) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTemplateInput }) => stockTemplatesApi.update(id, input),
    onSuccess: (_d, { id }) => { invalidate(); queryClient.invalidateQueries({ queryKey: merchantKeys.inventory.templateDetail(id) }); setShowModal(false); setEditing(null); setForm(emptyForm) },
  })
  const deleteMutation = useMutation({ mutationFn: (id: string) => stockTemplatesApi.remove(id), onSuccess: (_d, id) => { if (expanded === id) setExpanded(null); queryClient.removeQueries({ queryKey: merchantKeys.inventory.templateDetail(id) }); invalidate(); setConfirmDelete(null) } })
  const generateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: GeneratePoInput }) => stockTemplatesApi.generatePo(id, input),
    onSuccess: (res) => { setPoTarget(null); setPoForm({ vendor_id: "", warehouse_id: "", expected_delivery_date: "" }); setPoToast(`Purchase order ${res.po_number} generated`); setTimeout(() => setPoToast(null), 4000) },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(t => t.name.toLowerCase().includes(q))
  }, [templates, search])

  // ── Form helpers ──
  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (t: StockTemplate) => {
    setEditing(t)
    setForm({
      name: t.name,
      default_vendor_id: t.default_vendor_id ?? "",
      default_warehouse_id: t.default_warehouse_id ?? "",
      items: (t.items ?? []).map(it => ({ product_id: it.product_id, default_quantity: String(num(it.default_quantity)) })),
    })
    setShowModal(true)
  }
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: "", default_quantity: "1" }] }))
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const setItem = (i: number, patch: Partial<ItemRow>) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }))
  const validItems: TemplateItemInput[] = form.items.filter(it => it.product_id && num(it.default_quantity) > 0).map(it => ({ product_id: it.product_id, default_quantity: num(it.default_quantity) }))
  const canSave = form.name.trim().length > 0 && validItems.length > 0

  const submit = () => {
    const base = {
      name: form.name.trim(),
      ...(form.default_vendor_id ? { default_vendor_id: form.default_vendor_id } : {}),
      ...(form.default_warehouse_id ? { default_warehouse_id: form.default_warehouse_id } : {}),
      items: validItems,
    }
    if (editing) updateMutation.mutate({ id: editing.id, input: base })
    else createMutation.mutate(base)
  }

  const submitPo = () => {
    if (!poTarget) return
    const input: GeneratePoInput = {}
    if (poForm.vendor_id) input.vendor_id = poForm.vendor_id
    if (poForm.warehouse_id) input.warehouse_id = poForm.warehouse_id
    if (poForm.expected_delivery_date) input.expected_delivery_date = poForm.expected_delivery_date
    generateMutation.mutate({ id: poTarget.id, input })
  }

  const listError = listQuery.isError ? humanizeError(listQuery.error, "Failed to load stock templates.") : null
  const formError = createMutation.isError ? humanizeError(createMutation.error, "Failed to create template.") : updateMutation.isError ? humanizeError(updateMutation.error, "Failed to update template.") : null
  const detailItems = detailQuery.data?.items ?? []

  return (
    <div className="space-y-6">
      {listError && <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{listError}</div>}
      {deleteMutation.isError && <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{humanizeError(deleteMutation.error, "Failed to delete.")}</div>}
      {poToast && <div className="px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">{poToast}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {listQuery.isLoading && <div className="py-20 text-center text-gray-400 text-sm">Loading...</div>}

      <div className="space-y-3">
        {!listQuery.isLoading && filtered.map(t => (
          <div key={t.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23]">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0"><LayoutList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                {vendorName(t.default_vendor_id) && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Default vendor: {vendorName(t.default_vendor_id)}</p>}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t.items?.length ?? 0} items</span>
              <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#1F1F23] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">{expanded === t.id ? "Hide" : "View Items"}</button>
              <button onClick={() => { setPoTarget(t); setPoForm({ vendor_id: t.default_vendor_id ?? "", warehouse_id: t.default_warehouse_id ?? "", expected_delivery_date: "" }) }} className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"><FileText className="w-3.5 h-3.5 inline mr-1" />Generate PO</button>
              <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"><Pencil className="w-4 h-4" /></button>
              {confirmDelete === t.id ? (
                <div className="flex gap-1">
                  <button onClick={() => deleteMutation.mutate(t.id)} disabled={deleteMutation.isPending} className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50">Yes</button>
                  <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>

            {expanded === t.id && (
              <div className="border-t border-gray-100 dark:border-[#1F1F23] px-4 pb-4 pt-3">
                {detailQuery.isLoading ? <p className="text-sm text-gray-400">Loading items...</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-gray-400 uppercase"><th className="pb-2">Product</th><th className="pb-2">Default Quantity</th></tr></thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-[#1F1F23]">
                      {detailItems.map((item, i) => (
                        <tr key={item.id ?? i}><td className="py-1.5 text-gray-900 dark:text-white">{productName(item.product_id)}</td><td className="py-1.5 text-gray-600 dark:text-gray-400">{num(item.default_quantity)}</td></tr>
                      ))}
                      {detailItems.length === 0 && <tr><td colSpan={2} className="py-2 text-gray-400">No items</td></tr>}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
        {!listQuery.isLoading && filtered.length === 0 && <div className="py-10 text-center text-gray-400">No templates found</div>}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Template" : "New Template"}</h3>
              <button onClick={() => { setShowModal(false); setEditing(null) }} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            {formError && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{formError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Weekly café restock" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Vendor</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white" value={form.default_vendor_id} onChange={e => setForm(p => ({ ...p, default_vendor_id: e.target.value }))}>
                  <option value="">None</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Warehouse</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white" value={form.default_warehouse_id} onChange={e => setForm(p => ({ ...p, default_warehouse_id: e.target.value }))}>
                  <option value="">None</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Items *</label>
                <button onClick={addItem} className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"><Plus className="w-4 h-4" /> Add Item</button>
              </div>
              <div className="border border-gray-200 dark:border-[#1F1F23] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#0F0F12]/50"><tr><th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Product</th><th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-36">Default Qty</th><th className="w-10"></th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {form.items.length === 0 ? (
                      <tr><td colSpan={3} className="p-6 text-center text-gray-500 dark:text-gray-400">No items. Click "Add Item".</td></tr>
                    ) : form.items.map((item, index) => (
                      <tr key={index}>
                        <td className="p-3">
                          <select value={item.product_id} onChange={e => setItem(index, { product_id: e.target.value })} className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                            <option value="">Select product…</option>
                            {productOpts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-3"><input type="number" min="0.0001" step="any" value={item.default_quantity} onChange={e => setItem(index, { default_quantity: e.target.value })} className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" /></td>
                        <td className="p-3"><button onClick={() => removeItem(index)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setShowModal(false); setEditing(null) }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={submit} disabled={!canSave || createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Template"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate PO Modal */}
      {poTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Purchase Order</h3>
              <button onClick={() => setPoTarget(null)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">From template <strong className="text-gray-900 dark:text-white">{poTarget.name}</strong></p>
            {generateMutation.isError && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{humanizeError(generateMutation.error, "Failed to generate PO.")}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor {poTarget.default_vendor_id ? "" : "*"}</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white" value={poForm.vendor_id} onChange={e => setPoForm(p => ({ ...p, vendor_id: e.target.value }))}>
                <option value="">{poTarget.default_vendor_id ? "Use template default" : "Select vendor…"}</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warehouse {poTarget.default_warehouse_id ? "" : "*"}</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white" value={poForm.warehouse_id} onChange={e => setPoForm(p => ({ ...p, warehouse_id: e.target.value }))}>
                <option value="">{poTarget.default_warehouse_id ? "Use template default" : "Select warehouse…"}</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              {!poTarget.default_warehouse_id && !poForm.warehouse_id && <p className="text-xs text-amber-600 mt-1">A warehouse is required to create the PO.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Delivery</label>
              <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white" value={poForm.expected_delivery_date} onChange={e => setPoForm(p => ({ ...p, expected_delivery_date: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setPoTarget(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={submitPo} disabled={generateMutation.isPending || (!poTarget.default_vendor_id && !poForm.vendor_id) || (!poTarget.default_warehouse_id && !poForm.warehouse_id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{generateMutation.isPending ? "Generating..." : "Generate PO"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
