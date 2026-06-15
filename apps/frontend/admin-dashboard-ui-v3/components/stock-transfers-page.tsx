"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Plus, X, ArrowRight, Package, Truck, CheckCircle, Eye, Building2, MoreHorizontal, Trash2 } from "lucide-react"
import { stockTransfersApi, warehousesApi, productsApi, stockBatchesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { TransferStatus, CreateTransferInput, TransferItemInput, StockBatch } from "@/lib/merchant/types"

function num(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }
const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : "—")

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: "green" | "red" | "blue" | "yellow" | "gray"; icon: typeof Package }> = {
  draft: { label: "Draft", color: "gray", icon: Package },
  posted: { label: "Posted", color: "green", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "red", icon: X },
}

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[color]}`}>{children}</span>
}
function StatusBadge({ status }: { status: TransferStatus }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  const Icon = c.icon
  return <Badge color={c.color}><Icon className="w-3 h-3" />{c.label}</Badge>
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
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
      <div className="absolute right-0 top-0 h-full w-[550px] bg-white dark:bg-[#0F0F12] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

type ItemRow = { batch_id: string; quantity: string }

export default function StockTransfersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | TransferStatus>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  const [form, setForm] = useState<{ source_warehouse_id: string; target_warehouse_id: string; notes: string; items: ItemRow[] }>({ source_warehouse_id: "", target_warehouse_id: "", notes: "", items: [] })

  // ── Queries ──
  const listQuery = useQuery({ queryKey: merchantKeys.transfers.list(statusFilter), queryFn: () => stockTransfersApi.list(statusFilter === "all" ? {} : { status: statusFilter }) })
  const transfers = listQuery.data ?? []
  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: () => warehousesApi.list() })
  const warehouses = warehousesQuery.data ?? []
  const productsQuery = useQuery({ queryKey: merchantKeys.inventory.products(), queryFn: () => productsApi.list() })
  const products = productsQuery.data ?? []
  const batchesQuery = useQuery({
    queryKey: merchantKeys.inventory.batches(`tfsrc:${form.source_warehouse_id || "none"}`),
    queryFn: () => stockBatchesApi.list({ warehouse_id: form.source_warehouse_id }),
    enabled: showCreate && !!form.source_warehouse_id,
  })
  const batches = batchesQuery.data ?? []
  const detailQuery = useQuery({
    queryKey: detailId ? merchantKeys.transfers.detail(detailId) : ["transfers", "detail", "none"],
    queryFn: () => stockTransfersApi.detail(detailId!),
    enabled: !!detailId,
  })
  const selected = detailQuery.data ?? null

  const productName = useMemo(() => { const m = new Map(products.map(p => [p.id, p.name])); return (id: string) => m.get(id) ?? id.slice(0, 8) }, [products])
  const warehouseName = useMemo(() => { const m = new Map(warehouses.map(w => [w.id, w.name])); return (id: string) => m.get(id) ?? "—" }, [warehouses])
  const batchById = useMemo(() => new Map(batches.map(b => [b.id, b])), [batches])

  // ── Mutations ──
  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.transfers.all })
  const refreshDetail = (id: string) => queryClient.invalidateQueries({ queryKey: merchantKeys.transfers.detail(id) })
  const resetForm = () => setForm({ source_warehouse_id: "", target_warehouse_id: "", notes: "", items: [] })
  const createMutation = useMutation({
    mutationFn: (input: CreateTransferInput) => stockTransfersApi.create(input),
    onSuccess: () => { invalidate(); setShowCreate(false); resetForm() },
  })
  const createAndPostMutation = useMutation({
    mutationFn: async (input: CreateTransferInput) => { const t = await stockTransfersApi.create(input); return stockTransfersApi.post(t.id) },
    onSuccess: () => { invalidate(); setShowCreate(false); resetForm() },
  })
  const postMutation = useMutation({ mutationFn: (id: string) => stockTransfersApi.post(id), onSuccess: (_d, id) => { invalidate(); refreshDetail(id) } })
  const cancelMutation = useMutation({ mutationFn: (id: string) => stockTransfersApi.cancel(id), onSuccess: (_d, id) => { invalidate(); refreshDetail(id) } })
  const deleteMutation = useMutation({ mutationFn: (id: string) => stockTransfersApi.remove(id), onSuccess: () => { invalidate(); setShowDropdown(null) } })

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return transfers
    return transfers.filter(t => t.transfer_number.toLowerCase().includes(q) || warehouseName(t.source_warehouse_id).toLowerCase().includes(q) || warehouseName(t.target_warehouse_id).toLowerCase().includes(q))
  }, [transfers, searchQuery, warehouseName])

  // ── Create helpers ──
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { batch_id: "", quantity: "" }] }))
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const setItem = (i: number, patch: Partial<ItemRow>) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }))
  const validItems = form.items.filter(it => it.batch_id && num(it.quantity) > 0)
  const canCreate = !!form.source_warehouse_id && !!form.target_warehouse_id && form.source_warehouse_id !== form.target_warehouse_id && validItems.length > 0

  const buildInput = (): CreateTransferInput => ({
    source_warehouse_id: form.source_warehouse_id,
    target_warehouse_id: form.target_warehouse_id,
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    items: validItems.map(it => {
      const b = batchById.get(it.batch_id)
      return { batch_id: it.batch_id, product_id: b?.product_id ?? "", quantity: num(it.quantity) } as TransferItemInput
    }).filter(it => it.product_id),
  })

  const listError = listQuery.isError ? humanizeError(listQuery.error, "Failed to load transfers.") : null
  const createError = createMutation.isError ? humanizeError(createMutation.error, "Failed to create transfer.") : createAndPostMutation.isError ? humanizeError(createAndPostMutation.error, "Failed to create & post.") : null
  const actionErr = [postMutation, cancelMutation, deleteMutation].find(m => m.isError)
  const creating = createMutation.isPending || createAndPostMutation.isPending
  const counts = (s: TransferStatus) => transfers.filter(t => t.status === s).length

  return (
    <div>
      {listError && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Transfers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Transfer inventory between warehouses</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Transfer</Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", count: transfers.length, wrap: "bg-gray-100 dark:bg-[#0F0F12]", icon: Package },
          { label: "Draft", count: counts("draft"), wrap: "bg-amber-100 dark:bg-amber-900/30", icon: Package },
          { label: "Posted", count: counts("posted"), wrap: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle },
          { label: "Cancelled", count: counts("cancelled"), wrap: "bg-red-100 dark:bg-red-900/30", icon: X },
        ].map(stat => (
          <div key={stat.label} className={`${stat.wrap} rounded-xl p-5`}>
            <stat.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{listQuery.isLoading ? "…" : stat.count}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search transfers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
            <option value="all">All Status</option>
            {(Object.keys(STATUS_CONFIG) as TransferStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>{["Transfer #", "Route", "Status", "Created", ""].map(h => (
              <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {listQuery.isLoading && <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading...</td></tr>}
            {!listQuery.isLoading && filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                <td className="p-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{t.transfer_number}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Building2 className="w-3.5 h-3.5 text-gray-400" />{warehouseName(t.source_warehouse_id)}</span>
                    <ArrowRight className="w-4 h-4 text-indigo-500" />
                    <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Building2 className="w-3.5 h-3.5 text-gray-400" />{warehouseName(t.target_warehouse_id)}</span>
                  </div>
                </td>
                <td className="p-4"><StatusBadge status={t.status} /></td>
                <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{fmtDate(t.created_at)}</td>
                <td className="p-4">
                  <div className="relative">
                    <button onClick={() => setShowDropdown(showDropdown === t.id ? null : t.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><MoreHorizontal className="w-4 h-4 text-gray-500" /></button>
                    {showDropdown === t.id && (
                      <>
                        <div className="fixed inset-0" onClick={() => setShowDropdown(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg z-10 py-1 min-w-[150px]">
                          <button onClick={() => { setShowDropdown(null); setDetailId(t.id) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]"><Eye className="w-4 h-4" /> View</button>
                          {t.status === "draft" && (
                            <>
                              <button onClick={() => postMutation.mutate(t.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]"><Truck className="w-4 h-4" /> Post</button>
                              <button onClick={() => cancelMutation.mutate(t.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-gray-50 dark:hover:bg-[#2a2a32]"><X className="w-4 h-4" /> Cancel</button>
                              <button onClick={() => deleteMutation.mutate(t.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!listQuery.isLoading && filtered.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">No transfers found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Stock Transfer">
        <div className="space-y-4">
          {createError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{createError}</div>}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Warehouse *</label>
              <select value={form.source_warehouse_id} onChange={(e) => setForm(f => ({ ...f, source_warehouse_id: e.target.value, items: [] }))} className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                <option value="">Select source</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <ArrowRight className="w-6 h-6 text-indigo-500 mt-6" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Warehouse *</label>
              <select value={form.target_warehouse_id} onChange={(e) => setForm(f => ({ ...f, target_warehouse_id: e.target.value }))} className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                <option value="">Select destination</option>
                {warehouses.filter(w => w.id !== form.source_warehouse_id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Batch Items *</label>
              <Button variant="ghost" onClick={addItem} disabled={!form.source_warehouse_id}><Plus className="w-4 h-4" /> Add Item</Button>
            </div>
            {!form.source_warehouse_id ? (
              <p className="text-sm text-gray-400 p-3 border border-dashed border-gray-200 dark:border-[#1F1F23] rounded-lg">Select a source warehouse first.</p>
            ) : (
              <div className="border border-gray-200 dark:border-[#1F1F23] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
                    <tr><th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Batch</th><th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-32">Quantity</th><th className="w-10"></th></tr>
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
                            {b && <p className="text-[11px] text-gray-400 mt-1">Available: {num(b.quantity_remaining)}</p>}
                          </td>
                          <td className="p-3"><input type="number" min="0.001" step="any" value={item.quantity} onChange={(e) => setItem(index, { quantity: e.target.value })} placeholder="10" className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" /></td>
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
            <Button variant="secondary" className="flex-1" onClick={() => createMutation.mutate(buildInput())} disabled={!canCreate || creating}>{createMutation.isPending ? "Saving…" : "Save as Draft"}</Button>
            <Button variant="primary" className="flex-1" onClick={() => createAndPostMutation.mutate(buildInput())} disabled={!canCreate || creating}><Truck className="w-4 h-4" />{createAndPostMutation.isPending ? "…" : "Create & Post"}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Panel */}
      <SlidePanel isOpen={!!detailId} onClose={() => setDetailId(null)} title="Transfer Details">
        {detailQuery.isLoading && <div className="text-center text-sm text-gray-400 py-4">Loading...</div>}
        {selected && (
          <div className="space-y-6">
            <div className="p-5 border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-xl font-bold text-gray-900 dark:text-white">{selected.transfer_number}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created {fmtDate(selected.created_at)}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-800/50 dark:to-indigo-900/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center"><Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" /><p className="text-sm font-medium text-gray-900 dark:text-white">{warehouseName(selected.source_warehouse_id)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Source</p></div>
                  <div className="flex-1 flex items-center justify-center px-4"><div className="flex-1 h-0.5 bg-gradient-to-r from-gray-300 to-indigo-500"></div><Truck className="w-6 h-6 text-indigo-500 mx-2" /><div className="flex-1 h-0.5 bg-gradient-to-r from-indigo-500 to-gray-300"></div></div>
                  <div className="text-center"><Building2 className="w-8 h-8 text-indigo-500 mx-auto mb-2" /><p className="text-sm font-medium text-gray-900 dark:text-white">{warehouseName(selected.target_warehouse_id)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Destination</p></div>
                </div>
              </div>
            </div>

            <div className="px-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Items ({selected.items?.length ?? 0})</h4>
              <div className="space-y-2">
                {(selected.items ?? []).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{productName(item.product_id)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">batch {item.batch_id.slice(0, 8)}</p>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">{num(item.quantity)} units</p>
                  </div>
                ))}
              </div>
            </div>

            {selected.notes && <div className="px-5"><h4 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h4><p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">{selected.notes}</p></div>}

            {actionErr && <div className="px-5"><div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">{humanizeError(actionErr.error, "Action failed.")}</div></div>}

            {selected.status === "draft" && (
              <div className="p-5 border-t border-gray-200 dark:border-[#1F1F23] flex gap-3">
                <Button variant="danger" className="flex-1" onClick={() => cancelMutation.mutate(selected.id)} disabled={cancelMutation.isPending}><X className="w-4 h-4" /> Cancel</Button>
                <Button variant="primary" className="flex-1" onClick={() => postMutation.mutate(selected.id)} disabled={postMutation.isPending}><Truck className="w-4 h-4" /> {postMutation.isPending ? "Posting..." : "Post Transfer"}</Button>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
