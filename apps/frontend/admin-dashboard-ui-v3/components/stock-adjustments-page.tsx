"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Plus, X, FileText, Eye, AlertTriangle, CheckCircle } from "lucide-react"
import { stockAdjustmentsApi, warehousesApi, productsApi, stockBatchesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type {
  AdjustmentStatus, CreateAdjustmentInput, AdjustmentItemInput, StockBatch,
} from "@/lib/merchant/types"

function num(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—")

const STATUS_CONFIG: Record<AdjustmentStatus, { label: string; color: "green" | "red" | "yellow" | "blue" | "gray" }> = {
  draft: { label: "Draft", color: "gray" },
  pending_approval: { label: "Pending Approval", color: "yellow" },
  approved: { label: "Approved", color: "blue" },
  posted: { label: "Posted", color: "green" },
  rejected: { label: "Rejected", color: "red" },
}

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[color]}`}>{children}</span>
}
function Button({ children, variant = "primary", className = "", onClick, disabled }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string; onClick?: () => void; disabled?: boolean }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
  }
  return <button className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}
function Modal({ isOpen, onClose, title, children, size = "lg" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "md" | "lg" }) {
  if (!isOpen) return null
  const sizes = { md: "max-w-lg", lg: "max-w-2xl" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
function SlidePanel({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[520px] bg-white dark:bg-[#0F0F12] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

type ItemRow = { batch_id: string; proposed_delta: string }

export default function StockAdjustmentsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | AdjustmentStatus>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const [form, setForm] = useState<{ warehouse_id: string; reason: string; notes: string; items: ItemRow[] }>({ warehouse_id: "", reason: "", notes: "", items: [] })

  // ── Queries ──
  const listQuery = useQuery({ queryKey: merchantKeys.adjustments.list(statusFilter), queryFn: () => stockAdjustmentsApi.list(statusFilter === "all" ? {} : { status: statusFilter }) })
  const adjustments = listQuery.data ?? []
  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: () => warehousesApi.list() })
  const warehouses = warehousesQuery.data ?? []
  const productsQuery = useQuery({ queryKey: merchantKeys.inventory.products(), queryFn: () => productsApi.list() })
  const products = productsQuery.data ?? []
  // Batches for the selected warehouse drive the create line-item picker.
  const batchesQuery = useQuery({
    queryKey: merchantKeys.inventory.batches(`wh:${form.warehouse_id || "none"}`),
    queryFn: () => stockBatchesApi.list({ warehouse_id: form.warehouse_id }),
    enabled: showCreate && !!form.warehouse_id,
  })
  const batches = batchesQuery.data ?? []
  const detailQuery = useQuery({
    queryKey: detailId ? merchantKeys.adjustments.detail(detailId) : ["adjustments", "detail", "none"],
    queryFn: () => stockAdjustmentsApi.detail(detailId!),
    enabled: !!detailId,
  })
  const selected = detailQuery.data ?? null

  const productName = useMemo(() => { const m = new Map(products.map(p => [p.id, p.name])); return (id: string) => m.get(id) ?? id.slice(0, 8) }, [products])
  const warehouseName = useMemo(() => { const m = new Map(warehouses.map(w => [w.id, w.name])); return (id: string) => m.get(id) ?? "—" }, [warehouses])
  const batchById = useMemo(() => new Map(batches.map(b => [b.id, b])), [batches])

  // ── Mutations ──
  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.adjustments.all })
  const refreshDetail = (id: string) => queryClient.invalidateQueries({ queryKey: merchantKeys.adjustments.detail(id) })
  const createMutation = useMutation({
    mutationFn: (input: CreateAdjustmentInput) => stockAdjustmentsApi.create(input),
    onSuccess: () => { invalidate(); setShowCreate(false); setForm({ warehouse_id: "", reason: "", notes: "", items: [] }) },
  })
  const submitMutation = useMutation({ mutationFn: (id: string) => stockAdjustmentsApi.submit(id), onSuccess: (_d, id) => { invalidate(); refreshDetail(id) } })
  const approveMutation = useMutation({ mutationFn: (id: string) => stockAdjustmentsApi.approve(id), onSuccess: (_d, id) => { invalidate(); refreshDetail(id) } })
  const postMutation = useMutation({ mutationFn: (id: string) => stockAdjustmentsApi.post(id), onSuccess: (_d, id) => { invalidate(); refreshDetail(id) } })
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => stockAdjustmentsApi.reject(id, reason),
    onSuccess: (_d, { id }) => { invalidate(); refreshDetail(id); setRejectReason("") },
  })

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return adjustments
    return adjustments.filter(a => a.adjustment_number.toLowerCase().includes(q) || a.reason.toLowerCase().includes(q))
  }, [adjustments, searchQuery])

  // ── Create form helpers ──
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { batch_id: "", proposed_delta: "" }] }))
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const setItem = (i: number, patch: Partial<ItemRow>) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }))

  const validItems = form.items.filter(it => it.batch_id && num(it.proposed_delta) !== 0)
  const canCreate = !!form.warehouse_id && form.reason.trim().length >= 10 && validItems.length > 0

  const submitCreate = () => {
    const items: AdjustmentItemInput[] = validItems.map(it => {
      const b = batchById.get(it.batch_id)
      return { batch_id: it.batch_id, product_id: b?.product_id ?? "", proposed_delta: num(it.proposed_delta) }
    }).filter(it => it.product_id)
    const input: CreateAdjustmentInput = { warehouse_id: form.warehouse_id, reason: form.reason.trim(), items }
    if (form.notes.trim()) input.notes = form.notes.trim()
    createMutation.mutate(input)
  }

  const listError = listQuery.isError ? humanizeError(listQuery.error, "Failed to load adjustments.") : null
  const createError = createMutation.isError ? humanizeError(createMutation.error, "Failed to create adjustment.") : null
  const actionError = [submitMutation, approveMutation, postMutation, rejectMutation].find(m => m.isError)
  const actionPending = submitMutation.isPending || approveMutation.isPending || postMutation.isPending || rejectMutation.isPending

  const counts = (s: AdjustmentStatus) => adjustments.filter(a => a.status === s).length

  return (
    <div>
      {listError && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Adjustments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Record and approve batch-level inventory adjustments</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Adjustment</Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: FileText, wrap: "bg-blue-100 dark:bg-blue-900/30", ic: "text-blue-600 dark:text-blue-400", value: adjustments.length, label: "Total" },
          { icon: AlertTriangle, wrap: "bg-amber-100 dark:bg-amber-900/30", ic: "text-amber-600 dark:text-amber-400", value: counts("pending_approval"), label: "Pending Approval" },
          { icon: CheckCircle, wrap: "bg-green-100 dark:bg-green-900/30", ic: "text-green-600 dark:text-green-400", value: counts("posted"), label: "Posted" },
          { icon: X, wrap: "bg-red-100 dark:bg-red-900/30", ic: "text-red-600 dark:text-red-400", value: counts("rejected"), label: "Rejected" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${s.wrap}`}><s.icon className={`w-5 h-5 ${s.ic}`} /></div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{listQuery.isLoading ? "…" : s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search adjustments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
            <option value="all">All Status</option>
            {(Object.keys(STATUS_CONFIG) as AdjustmentStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>{["Adjustment #", "Warehouse", "Reason", "Status", "Created", ""].map(h => (
              <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {listQuery.isLoading && <tr><td colSpan={6} className="p-10 text-center text-gray-400">Loading...</td></tr>}
            {!listQuery.isLoading && filtered.map(adj => (
              <tr key={adj.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                <td className="p-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{adj.adjustment_number}</td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{warehouseName(adj.warehouse_id)}</td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{adj.reason}</td>
                <td className="p-4"><Badge color={STATUS_CONFIG[adj.status].color}>{STATUS_CONFIG[adj.status].label}</Badge></td>
                <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{fmtDate(adj.created_at)}</td>
                <td className="p-4">
                  <button onClick={() => { setDetailId(adj.id); setRejectReason("") }} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {!listQuery.isLoading && filtered.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-gray-400">No adjustments found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Stock Adjustment" size="lg">
        <div className="space-y-4">
          {createError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{createError}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warehouse *</label>
            <select value={form.warehouse_id} onChange={(e) => setForm(f => ({ ...f, warehouse_id: e.target.value, items: [] }))} className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
              <option value="">Select warehouse</option>
              {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason * <span className="text-xs text-gray-400">(min 10 characters)</span></label>
            <input value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Quarterly count correction after recount" className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
            {form.reason.length > 0 && form.reason.trim().length < 10 && <p className="text-xs text-amber-600 mt-1">{10 - form.reason.trim().length} more characters needed</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Batch Line Items *</label>
              <Button variant="ghost" onClick={addItem} disabled={!form.warehouse_id}><Plus className="w-4 h-4" /> Add Item</Button>
            </div>
            {!form.warehouse_id ? (
              <p className="text-sm text-gray-400 p-3 border border-dashed border-gray-200 dark:border-[#1F1F23] rounded-lg">Select a warehouse first.</p>
            ) : (
              <div className="border border-gray-200 dark:border-[#1F1F23] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Batch</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-36">Delta (±, non-zero)</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {form.items.length === 0 ? (
                      <tr><td colSpan={3} className="p-6 text-center text-gray-500 dark:text-gray-400">No items. Click "Add Item".</td></tr>
                    ) : form.items.map((item, index) => {
                      const b = batchById.get(item.batch_id)
                      return (
                        <tr key={index}>
                          <td className="p-3">
                            <select value={item.batch_id} onChange={(e) => setItem(index, { batch_id: e.target.value })} className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                              <option value="">Select batch…</option>
                              {batches.map((bt: StockBatch) => <option key={bt.id} value={bt.id}>{bt.batch_code} · {productName(bt.product_id)} (rem {num(bt.quantity_remaining)})</option>)}
                            </select>
                            {b && <p className="text-[11px] text-gray-400 mt-1">Remaining: {num(b.quantity_remaining)}</p>}
                          </td>
                          <td className="p-3">
                            <input type="number" step="any" value={item.proposed_delta} onChange={(e) => setItem(index, { proposed_delta: e.target.value })} placeholder="-3 or 10" className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
                          </td>
                          <td className="p-3"><button onClick={() => removeItem(index)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X className="w-4 h-4" /></button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-20 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="Optional notes..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={submitCreate} disabled={!canCreate || createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Draft"}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Panel */}
      <SlidePanel isOpen={!!detailId} onClose={() => setDetailId(null)} title="Adjustment Details">
        {detailQuery.isLoading && <div className="text-center text-sm text-gray-400 py-4">Loading...</div>}
        {selected && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-[#1F1F23] pb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-mono text-xl font-bold text-gray-900 dark:text-white">{selected.adjustment_number}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{warehouseName(selected.warehouse_id)}</p>
                </div>
                <Badge color={STATUS_CONFIG[selected.status].color}>{STATUS_CONFIG[selected.status].label}</Badge>
              </div>
              <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.reason}</p>
              </div>
              {selected.rejected_reason && <div className="mt-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-3"><p className="text-xs text-red-500 mb-1">Rejected reason</p><p className="text-sm text-red-700 dark:text-red-400">{selected.rejected_reason}</p></div>}
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Items ({selected.items?.length ?? 0})</h4>
              <div className="space-y-2">
                {(selected.items ?? []).map(item => {
                  const delta = num(item.proposed_delta)
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{productName(item.product_id)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">batch {item.batch_id.slice(0, 8)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-medium ${delta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{delta > 0 ? "+" : ""}{delta}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Current: {num(item.current_quantity)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {selected.notes && <div><h4 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h4><p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">{selected.notes}</p></div>}

            {actionError && <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">{humanizeError(actionError.error, "Action failed.")}</div>}

            {selected.status === "draft" && (
              <Button variant="primary" className="w-full" onClick={() => submitMutation.mutate(selected.id)} disabled={actionPending}>{submitMutation.isPending ? "Submitting..." : "Submit for Approval"}</Button>
            )}
            {selected.status === "pending_approval" && (
              <div className="space-y-3">
                <Button variant="primary" className="w-full" onClick={() => approveMutation.mutate(selected.id)} disabled={actionPending}>{approveMutation.isPending ? "..." : "Approve"}</Button>
                <input type="text" placeholder="Rejection reason (required)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
                <Button variant="danger" className="w-full" onClick={() => rejectMutation.mutate({ id: selected.id, reason: rejectReason })} disabled={actionPending || !rejectReason.trim()}>{rejectMutation.isPending ? "..." : "Reject"}</Button>
              </div>
            )}
            {selected.status === "approved" && (
              <Button variant="primary" className="w-full" onClick={() => postMutation.mutate(selected.id)} disabled={actionPending}>{postMutation.isPending ? "Posting..." : "Post Adjustment"}</Button>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
