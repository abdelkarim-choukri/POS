"use client"
import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, AlertTriangle, Plus, X } from "lucide-react"
import { stockBatchesApi, warehousesApi, productsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type {
  StockBatch, CreateBatchInput, AdjustBatchInput, DisposeBatchInput, TransferBatchInput,
} from "@/lib/merchant/types"

function num(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—")

// Derived display status (the entity has no `status` column).
type DerivedStatus = "available" | "depleted" | "expired" | "expiring_soon" | "inactive"
function statusOf(b: StockBatch): DerivedStatus {
  if (!b.is_active) return "inactive"
  if (num(b.quantity_remaining) <= 0) return "depleted"
  if (b.expires_at) {
    const days = Math.ceil((new Date(b.expires_at).getTime() - Date.now()) / 86400000)
    if (days < 0) return "expired"
    if (days <= 30) return "expiring_soon"
  }
  return "available"
}
const STATUS_CONFIG: Record<DerivedStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  depleted: { label: "Depleted", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  expired: { label: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expiring_soon: { label: "Expiring Soon", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  inactive: { label: "Inactive", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
}

const INPUT_CLS = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
const LABEL_CLS = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
const BTN_PRIMARY = "px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
const BTN_GHOST = "px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors"

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#1a1a20] text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
      </div>
    </div>
  )
}

export default function StockBatchesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | DerivedStatus>("all")

  const [showReceive, setShowReceive] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<StockBatch | null>(null)
  const [disposeTarget, setDisposeTarget] = useState<StockBatch | null>(null)
  const [transferTarget, setTransferTarget] = useState<StockBatch | null>(null)

  const [rcv, setRcv] = useState({ product_id: "", warehouse_id: "", batch_code: "", quantity_initial: "", unit_cost: "", unit_of_measure: "", expires_at: "" })
  const [adj, setAdj] = useState({ delta: "", reason: "" })
  const [dsp, setDsp] = useState<{ quantity: string; reason: "expired" | "damaged" | "other"; notes: string }>({ quantity: "", reason: "expired", notes: "" })
  const [trf, setTrf] = useState({ target_warehouse_id: "", quantity: "", notes: "" })

  // ── Queries ──
  const batchesQuery = useQuery({ queryKey: merchantKeys.inventory.batches("all"), queryFn: () => stockBatchesApi.list() })
  const batches = batchesQuery.data ?? []
  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: () => warehousesApi.list() })
  const warehouses = warehousesQuery.data ?? []
  const productsQuery = useQuery({ queryKey: merchantKeys.inventory.products(), queryFn: () => productsApi.list() })
  const products = productsQuery.data ?? []

  const productName = useMemo(() => { const m = new Map(products.map(p => [p.id, p.name])); return (id: string) => m.get(id) ?? "—" }, [products])
  const warehouseName = useMemo(() => { const m = new Map(warehouses.map(w => [w.id, w.name])); return (id: string) => m.get(id) ?? "—" }, [warehouses])

  // ── Mutations ──
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["merchant", "inventory", "batches"] })
  const receiveMutation = useMutation({
    mutationFn: (input: CreateBatchInput) => stockBatchesApi.receive(input),
    onSuccess: () => { invalidate(); setShowReceive(false); setRcv({ product_id: "", warehouse_id: "", batch_code: "", quantity_initial: "", unit_cost: "", unit_of_measure: "", expires_at: "" }) },
  })
  const adjustMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustBatchInput }) => stockBatchesApi.adjust(id, input),
    onSuccess: () => { invalidate(); setAdjustTarget(null); setAdj({ delta: "", reason: "" }) },
  })
  const disposeMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DisposeBatchInput }) => stockBatchesApi.dispose(id, input),
    onSuccess: () => { invalidate(); setDisposeTarget(null); setDsp({ quantity: "", reason: "expired", notes: "" }) },
  })
  const transferMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransferBatchInput }) => stockBatchesApi.transfer(id, input),
    onSuccess: () => { invalidate(); setTransferTarget(null); setTrf({ target_warehouse_id: "", quantity: "", notes: "" }) },
  })

  // ── Submit handlers ──
  const submitReceive = (e: React.FormEvent) => {
    e.preventDefault()
    const input: CreateBatchInput = {
      warehouse_id: rcv.warehouse_id,
      product_id: rcv.product_id,
      batch_code: rcv.batch_code.trim(),
      quantity_initial: num(rcv.quantity_initial),
      unit_cost: num(rcv.unit_cost),
    }
    if (rcv.unit_of_measure.trim()) input.unit_of_measure = rcv.unit_of_measure.trim()
    if (rcv.expires_at) input.expires_at = rcv.expires_at
    receiveMutation.mutate(input)
  }
  const submitAdjust = (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustTarget) return
    adjustMutation.mutate({ id: adjustTarget.id, input: { delta: num(adj.delta), reason: adj.reason.trim() } })
  }
  const submitDispose = (e: React.FormEvent) => {
    e.preventDefault()
    if (!disposeTarget) return
    const input: DisposeBatchInput = { quantity: num(dsp.quantity), reason: dsp.reason }
    if (dsp.notes.trim()) input.notes = dsp.notes.trim()
    disposeMutation.mutate({ id: disposeTarget.id, input })
  }
  const submitTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferTarget) return
    const input: TransferBatchInput = { target_warehouse_id: trf.target_warehouse_id, quantity: num(trf.quantity) }
    if (trf.notes.trim()) input.notes = trf.notes.trim()
    transferMutation.mutate({ id: transferTarget.id, input })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return batches.filter(b => {
      const matchSearch = !q || b.batch_code.toLowerCase().includes(q) || productName(b.product_id).toLowerCase().includes(q)
      const matchStatus = statusFilter === "all" || statusOf(b) === statusFilter
      return matchSearch && matchStatus
    })
  }, [batches, search, statusFilter, productName])

  const listError = batchesQuery.isError ? humanizeError(batchesQuery.error, "Failed to load stock batches.") : null
  const productOpts = useMemo(() => products.map(p => ({ id: p.id, name: p.name })), [products])

  return (
    <div className="space-y-6">
      {listError && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search batches or product..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} batches</p>
          <button onClick={() => setShowReceive(true)} className={BTN_PRIMARY + " flex items-center gap-1.5"}><Plus className="w-4 h-4" /> Receive Batch</button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Batch", "Product", "Warehouse", "Initial", "Remaining", "Unit Cost", "Expires", "Status", "Actions"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {batchesQuery.isLoading && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>}
            {!batchesQuery.isLoading && filtered.map(b => {
              const st = statusOf(b); const sc = STATUS_CONFIG[st]
              return (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{b.batch_code}</code></td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{productName(b.product_id)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{warehouseName(b.warehouse_id)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{num(b.quantity_initial).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{num(b.quantity_remaining).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{num(b.unit_cost).toFixed(2)} MAD</td>
                  <td className="px-4 py-3">
                    {b.expires_at ? (
                      <span className={`flex items-center gap-1 ${st === "expiring_soon" || st === "expired" ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-gray-400"}`}>
                        {(st === "expiring_soon" || st === "expired") && <AlertTriangle className="w-3.5 h-3.5" />}{fmtDate(b.expires_at)}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setAdjustTarget(b); setAdj({ delta: "", reason: "" }) }} className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">Adjust</button>
                      <button onClick={() => { setDisposeTarget(b); setDsp({ quantity: "", reason: "expired", notes: "" }) }} className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">Dispose</button>
                      <button onClick={() => { setTransferTarget(b); setTrf({ target_warehouse_id: "", quantity: "", notes: "" }) }} className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">Transfer</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!batchesQuery.isLoading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No batches found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ── Receive Batch ── */}
      {showReceive && (
        <Modal title="Receive New Batch" onClose={() => setShowReceive(false)}>
          <form onSubmit={submitReceive} className="space-y-3">
            {receiveMutation.isError && <p className="text-xs text-red-600 dark:text-red-400">{humanizeError(receiveMutation.error, "Failed to receive batch.")}</p>}
            <div>
              <label className={LABEL_CLS}>Product *</label>
              <select required className={INPUT_CLS} value={rcv.product_id} onChange={e => setRcv(p => ({ ...p, product_id: e.target.value }))}>
                <option value="">Select product…</option>
                {productOpts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Warehouse *</label>
              <select required className={INPUT_CLS} value={rcv.warehouse_id} onChange={e => setRcv(p => ({ ...p, warehouse_id: e.target.value }))}>
                <option value="">Select warehouse…</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Batch Code *</label>
              <input required className={INPUT_CLS} placeholder="e.g. LOT-2026-001" value={rcv.batch_code} onChange={e => setRcv(p => ({ ...p, batch_code: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Quantity *</label>
                <input required type="number" min="0.0001" step="any" className={INPUT_CLS} placeholder="50" value={rcv.quantity_initial} onChange={e => setRcv(p => ({ ...p, quantity_initial: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL_CLS}>Unit Cost (MAD) *</label>
                <input required type="number" min="0" step="any" className={INPUT_CLS} placeholder="85.00" value={rcv.unit_cost} onChange={e => setRcv(p => ({ ...p, unit_cost: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Unit of Measure</label>
                <input className={INPUT_CLS} placeholder="unit / kg / L" value={rcv.unit_of_measure} onChange={e => setRcv(p => ({ ...p, unit_of_measure: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL_CLS}>Expiry Date</label>
                <input type="date" className={INPUT_CLS} value={rcv.expires_at} onChange={e => setRcv(p => ({ ...p, expires_at: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={BTN_GHOST} onClick={() => setShowReceive(false)}>Cancel</button>
              <button type="submit" disabled={receiveMutation.isPending} className={BTN_PRIMARY}>{receiveMutation.isPending ? "Saving…" : "Receive"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Adjust ── */}
      {adjustTarget && (
        <Modal title={`Adjust — ${adjustTarget.batch_code}`} onClose={() => setAdjustTarget(null)}>
          <form onSubmit={submitAdjust} className="space-y-3">
            {adjustMutation.isError && <p className="text-xs text-red-600 dark:text-red-400">{humanizeError(adjustMutation.error, "Failed to adjust batch.")}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">Remaining: <strong className="text-gray-900 dark:text-white">{num(adjustTarget.quantity_remaining)}</strong></p>
            <div>
              <label className={LABEL_CLS}>Quantity Delta * (positive or negative)</label>
              <input required type="number" step="any" className={INPUT_CLS} placeholder="-3 or 10" value={adj.delta} onChange={e => setAdj(p => ({ ...p, delta: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL_CLS}>Reason *</label>
              <input required className={INPUT_CLS} placeholder="e.g. Recount correction" value={adj.reason} onChange={e => setAdj(p => ({ ...p, reason: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={BTN_GHOST} onClick={() => setAdjustTarget(null)}>Cancel</button>
              <button type="submit" disabled={adjustMutation.isPending} className={BTN_PRIMARY}>{adjustMutation.isPending ? "Saving…" : "Apply Adjustment"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Dispose ── */}
      {disposeTarget && (
        <Modal title={`Dispose — ${disposeTarget.batch_code}`} onClose={() => setDisposeTarget(null)}>
          <form onSubmit={submitDispose} className="space-y-3">
            {disposeMutation.isError && <p className="text-xs text-red-600 dark:text-red-400">{humanizeError(disposeMutation.error, "Failed to dispose batch.")}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">Remaining: <strong className="text-gray-900 dark:text-white">{num(disposeTarget.quantity_remaining)}</strong></p>
            <div>
              <label className={LABEL_CLS}>Quantity to Dispose *</label>
              <input required type="number" min="0.0001" step="any" className={INPUT_CLS} placeholder="5" value={dsp.quantity} onChange={e => setDsp(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL_CLS}>Reason *</label>
              <select required className={INPUT_CLS} value={dsp.reason} onChange={e => setDsp(p => ({ ...p, reason: e.target.value as DisposeBatchInput["reason"] }))}>
                <option value="expired">Expired</option>
                <option value="damaged">Damaged</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Notes</label>
              <input className={INPUT_CLS} placeholder="Optional notes" value={dsp.notes} onChange={e => setDsp(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={BTN_GHOST} onClick={() => setDisposeTarget(null)}>Cancel</button>
              <button type="submit" disabled={disposeMutation.isPending} className={BTN_PRIMARY}>{disposeMutation.isPending ? "Saving…" : "Dispose"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Transfer ── */}
      {transferTarget && (
        <Modal title={`Transfer — ${transferTarget.batch_code}`} onClose={() => setTransferTarget(null)}>
          <form onSubmit={submitTransfer} className="space-y-3">
            {transferMutation.isError && <p className="text-xs text-red-600 dark:text-red-400">{humanizeError(transferMutation.error, "Failed to transfer batch.")}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">From: <strong className="text-gray-900 dark:text-white">{warehouseName(transferTarget.warehouse_id)}</strong> — Remaining: <strong className="text-gray-900 dark:text-white">{num(transferTarget.quantity_remaining)}</strong></p>
            <div>
              <label className={LABEL_CLS}>Destination Warehouse *</label>
              <select required className={INPUT_CLS} value={trf.target_warehouse_id} onChange={e => setTrf(p => ({ ...p, target_warehouse_id: e.target.value }))}>
                <option value="">Select warehouse…</option>
                {warehouses.filter(w => w.id !== transferTarget.warehouse_id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Quantity *</label>
              <input required type="number" min="0.0001" step="any" className={INPUT_CLS} placeholder="10" value={trf.quantity} onChange={e => setTrf(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL_CLS}>Notes</label>
              <input className={INPUT_CLS} placeholder="Optional notes" value={trf.notes} onChange={e => setTrf(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={BTN_GHOST} onClick={() => setTransferTarget(null)}>Cancel</button>
              <button type="submit" disabled={transferMutation.isPending} className={BTN_PRIMARY}>{transferMutation.isPending ? "Saving…" : "Transfer"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
