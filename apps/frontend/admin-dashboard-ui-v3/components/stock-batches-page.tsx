"use client"
import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { Search, AlertTriangle, Plus, X } from "lucide-react"

interface StockBatch {
  id: string; batch_number: string; product: string; warehouse: string
  received_qty: number; current_qty: number; cost_per_unit: number
  received_at: string; expires_at?: string
  status: "available" | "depleted" | "disposed" | "expiring_soon"
}

interface Warehouse {
  id: string; name: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  depleted: { label: "Depleted", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  disposed: { label: "Disposed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expiring_soon: { label: "Expiring Soon", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
}

const INPUT_CLS = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
const LABEL_CLS = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
const BTN_PRIMARY = "px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
const BTN_GHOST = "px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors"

// ─── Modal wrapper ──────────────────────────────────────────────────────────
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
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // modal visibility
  const [showReceive, setShowReceive] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<StockBatch | null>(null)
  const [disposeTarget, setDisposeTarget] = useState<StockBatch | null>(null)
  const [transferTarget, setTransferTarget] = useState<StockBatch | null>(null)

  // receive form
  const [rcvProductId, setRcvProductId] = useState("")
  const [rcvWarehouseId, setRcvWarehouseId] = useState("")
  const [rcvQty, setRcvQty] = useState("")
  const [rcvCost, setRcvCost] = useState("")
  const [rcvExpires, setRcvExpires] = useState("")
  const [rcvPoId, setRcvPoId] = useState("")
  const [rcvNotes, setRcvNotes] = useState("")
  const [rcvLoading, setRcvLoading] = useState(false)
  const [rcvError, setRcvError] = useState<string | null>(null)

  // adjust form
  const [adjDelta, setAdjDelta] = useState("")
  const [adjReason, setAdjReason] = useState("")
  const [adjNotes, setAdjNotes] = useState("")
  const [adjLoading, setAdjLoading] = useState(false)
  const [adjError, setAdjError] = useState<string | null>(null)

  // dispose form
  const [dspQty, setDspQty] = useState("")
  const [dspReason, setDspReason] = useState("")
  const [dspMethod, setDspMethod] = useState<"waste" | "donation" | "return" | "">("")
  const [dspLoading, setDspLoading] = useState(false)
  const [dspError, setDspError] = useState<string | null>(null)

  // transfer form
  const [trfToWarehouse, setTrfToWarehouse] = useState("")
  const [trfQty, setTrfQty] = useState("")
  const [trfNotes, setTrfNotes] = useState("")
  const [trfLoading, setTrfLoading] = useState(false)
  const [trfError, setTrfError] = useState<string | null>(null)

  // ── fetch helpers ──────────────────────────────────────────────────────────
  const fetchBatches = useCallback(() => {
    setLoading(true)
    setError(null)
    apiFetch<{ data: any[] }>("/api/business/stock-batches?page=1&limit=50")
      .then(res => {
        const mapped: StockBatch[] = res.data.map((b: any) => ({
          id: b.id,
          batch_number: b.batch_number,
          product: b.product?.name ?? b.product ?? "",
          warehouse: b.warehouse?.name ?? b.warehouse ?? "",
          received_qty: b.received_qty ?? 0,
          current_qty: b.current_qty ?? 0,
          cost_per_unit: b.cost_per_unit ?? 0,
          received_at: b.received_at ?? "",
          expires_at: b.expires_at,
          status: b.status,
        }))
        setBatches(mapped)
      })
      .catch(e => setError(e.message ?? "Failed to load stock batches"))
      .finally(() => setLoading(false))
  }, [])

  const fetchWarehouses = useCallback(() => {
    apiFetch<{ data: any[] }>("/api/business/warehouses")
      .then(res => {
        const mapped: Warehouse[] = (res.data ?? []).map((w: any) => ({ id: w.id, name: w.name }))
        setWarehouses(mapped)
      })
      .catch(() => {/* non-critical — warehouses list may not exist yet */})
  }, [])

  useEffect(() => {
    fetchBatches()
    fetchWarehouses()
  }, [fetchBatches, fetchWarehouses])

  // ── action handlers ────────────────────────────────────────────────────────
  function handleReceiveSubmit(e: React.FormEvent) {
    e.preventDefault()
    setRcvLoading(true)
    setRcvError(null)
    const body: Record<string, any> = {
      product_id: rcvProductId.trim(),
      warehouse_id: rcvWarehouseId,
      quantity: Number(rcvQty),
      unit_cost_ht: Number(rcvCost),
    }
    if (rcvExpires) body.expires_at = rcvExpires
    if (rcvPoId.trim()) body.purchase_order_id = rcvPoId.trim()
    if (rcvNotes.trim()) body.notes = rcvNotes.trim()
    apiFetch("/api/business/stock-batches", { method: "POST", body: JSON.stringify(body) })
      .then(() => {
        setShowReceive(false)
        setRcvProductId(""); setRcvWarehouseId(""); setRcvQty(""); setRcvCost("")
        setRcvExpires(""); setRcvPoId(""); setRcvNotes("")
        fetchBatches()
      })
      .catch((e: any) => setRcvError(e.message ?? "Failed to receive batch"))
      .finally(() => setRcvLoading(false))
  }

  function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustTarget) return
    setAdjLoading(true)
    setAdjError(null)
    const body: Record<string, any> = { quantity_delta: Number(adjDelta), reason: adjReason.trim() }
    if (adjNotes.trim()) body.notes = adjNotes.trim()
    apiFetch(`/api/business/stock-batches/${adjustTarget.id}/adjust`, { method: "POST", body: JSON.stringify(body) })
      .then(() => {
        setAdjustTarget(null)
        setAdjDelta(""); setAdjReason(""); setAdjNotes("")
        fetchBatches()
      })
      .catch((e: any) => setAdjError(e.message ?? "Failed to adjust batch"))
      .finally(() => setAdjLoading(false))
  }

  function handleDisposeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!disposeTarget) return
    setDspLoading(true)
    setDspError(null)
    const body: Record<string, any> = { quantity: Number(dspQty), reason: dspReason.trim() }
    if (dspMethod) body.disposal_method = dspMethod
    apiFetch(`/api/business/stock-batches/${disposeTarget.id}/dispose`, { method: "POST", body: JSON.stringify(body) })
      .then(() => {
        setDisposeTarget(null)
        setDspQty(""); setDspReason(""); setDspMethod("")
        fetchBatches()
      })
      .catch((e: any) => setDspError(e.message ?? "Failed to dispose batch"))
      .finally(() => setDspLoading(false))
  }

  function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!transferTarget) return
    setTrfLoading(true)
    setTrfError(null)
    const body: Record<string, any> = { to_warehouse_id: trfToWarehouse, quantity: Number(trfQty) }
    if (trfNotes.trim()) body.notes = trfNotes.trim()
    apiFetch(`/api/business/stock-batches/${transferTarget.id}/transfer`, { method: "POST", body: JSON.stringify(body) })
      .then(() => {
        setTransferTarget(null)
        setTrfToWarehouse(""); setTrfQty(""); setTrfNotes("")
        fetchBatches()
      })
      .catch((e: any) => setTrfError(e.message ?? "Failed to transfer batch"))
      .finally(() => setTrfLoading(false))
  }

  // ── derived state ──────────────────────────────────────────────────────────
  const filtered = batches.filter(b => {
    const matchSearch = b.product.toLowerCase().includes(search.toLowerCase()) || b.batch_number.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || b.status === statusFilter
    return matchSearch && matchStatus
  })

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}

      {/* ── toolbar ── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search batches..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} batches</p>
          {/* Receive Batch button */}
          <button onClick={() => setShowReceive(true)} className={BTN_PRIMARY + " flex items-center gap-1.5"}>
            <Plus className="w-4 h-4" /> Receive Batch
          </button>
        </div>
      </div>

      {/* ── table ── */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Batch #", "Product", "Warehouse", "Received", "Current", "Cost/Unit", "Expires", "Status", "Actions"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(b => {
              const sc = STATUS_CONFIG[b.status]
              return (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{b.batch_number}</code></td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.product}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{b.warehouse}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.received_qty}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{b.current_qty}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.cost_per_unit.toFixed(2)} MAD</td>
                  <td className="px-4 py-3">
                    {b.expires_at ? (
                      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        {b.status === "expiring_soon" && <AlertTriangle className="w-3.5 h-3.5" />}{b.expires_at}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                  {/* row actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setAdjustTarget(b); setAdjDelta(""); setAdjReason(""); setAdjNotes(""); setAdjError(null) }}
                        className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                        Adjust
                      </button>
                      <button onClick={() => { setDisposeTarget(b); setDspQty(""); setDspReason(""); setDspMethod(""); setDspError(null) }}
                        className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                        Dispose
                      </button>
                      <button onClick={() => { setTransferTarget(b); setTrfToWarehouse(""); setTrfQty(""); setTrfNotes(""); setTrfError(null) }}
                        className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                        Transfer
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No batches found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ── Receive Batch modal ── */}
      {showReceive && (
        <Modal title="Receive New Batch" onClose={() => setShowReceive(false)}>
          <form onSubmit={handleReceiveSubmit} className="space-y-3">
            {rcvError && <p className="text-xs text-red-600 dark:text-red-400">{rcvError}</p>}
            <div>
              <label className={LABEL_CLS}>Product ID *</label>
              <input required className={INPUT_CLS} placeholder="UUID of the product" value={rcvProductId} onChange={e => setRcvProductId(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Warehouse *</label>
              {warehouses.length > 0 ? (
                <select required className={INPUT_CLS} value={rcvWarehouseId} onChange={e => setRcvWarehouseId(e.target.value)}>
                  <option value="">Select warehouse…</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              ) : (
                <input required className={INPUT_CLS} placeholder="Warehouse UUID" value={rcvWarehouseId} onChange={e => setRcvWarehouseId(e.target.value)} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Quantity *</label>
                <input required type="number" min="0.0001" step="any" className={INPUT_CLS} placeholder="e.g. 50" value={rcvQty} onChange={e => setRcvQty(e.target.value)} />
              </div>
              <div>
                <label className={LABEL_CLS}>Unit Cost HT (MAD) *</label>
                <input required type="number" min="0" step="any" className={INPUT_CLS} placeholder="e.g. 85.00" value={rcvCost} onChange={e => setRcvCost(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Expiry Date</label>
              <input type="date" className={INPUT_CLS} value={rcvExpires} onChange={e => setRcvExpires(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Purchase Order ID</label>
              <input className={INPUT_CLS} placeholder="Optional PO UUID" value={rcvPoId} onChange={e => setRcvPoId(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Notes</label>
              <input className={INPUT_CLS} placeholder="Optional notes" value={rcvNotes} onChange={e => setRcvNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={BTN_GHOST} onClick={() => setShowReceive(false)}>Cancel</button>
              <button type="submit" disabled={rcvLoading} className={BTN_PRIMARY}>{rcvLoading ? "Saving…" : "Receive"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Adjust modal ── */}
      {adjustTarget && (
        <Modal title={`Adjust — ${adjustTarget.batch_number}`} onClose={() => setAdjustTarget(null)}>
          <form onSubmit={handleAdjustSubmit} className="space-y-3">
            {adjError && <p className="text-xs text-red-600 dark:text-red-400">{adjError}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">Current qty: <strong className="text-gray-900 dark:text-white">{adjustTarget.current_qty}</strong></p>
            <div>
              <label className={LABEL_CLS}>Quantity Delta * (positive or negative)</label>
              <input required type="number" step="any" className={INPUT_CLS} placeholder="e.g. -3 or +10" value={adjDelta} onChange={e => setAdjDelta(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Reason *</label>
              <input required className={INPUT_CLS} placeholder="e.g. Recount correction" value={adjReason} onChange={e => setAdjReason(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Notes</label>
              <input className={INPUT_CLS} placeholder="Optional notes" value={adjNotes} onChange={e => setAdjNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={BTN_GHOST} onClick={() => setAdjustTarget(null)}>Cancel</button>
              <button type="submit" disabled={adjLoading} className={BTN_PRIMARY}>{adjLoading ? "Saving…" : "Apply Adjustment"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Dispose modal ── */}
      {disposeTarget && (
        <Modal title={`Dispose — ${disposeTarget.batch_number}`} onClose={() => setDisposeTarget(null)}>
          <form onSubmit={handleDisposeSubmit} className="space-y-3">
            {dspError && <p className="text-xs text-red-600 dark:text-red-400">{dspError}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">Current qty: <strong className="text-gray-900 dark:text-white">{disposeTarget.current_qty}</strong></p>
            <div>
              <label className={LABEL_CLS}>Quantity to Dispose *</label>
              <input required type="number" min="0.0001" step="any" className={INPUT_CLS} placeholder="e.g. 5" value={dspQty} onChange={e => setDspQty(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Reason *</label>
              <input required className={INPUT_CLS} placeholder="e.g. Expired product" value={dspReason} onChange={e => setDspReason(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Disposal Method</label>
              <select className={INPUT_CLS} value={dspMethod} onChange={e => setDspMethod(e.target.value as any)}>
                <option value="">Not specified</option>
                <option value="waste">Waste</option>
                <option value="donation">Donation</option>
                <option value="return">Return</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={BTN_GHOST} onClick={() => setDisposeTarget(null)}>Cancel</button>
              <button type="submit" disabled={dspLoading} className={BTN_PRIMARY}>{dspLoading ? "Saving…" : "Dispose"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Transfer modal ── */}
      {transferTarget && (
        <Modal title={`Transfer — ${transferTarget.batch_number}`} onClose={() => setTransferTarget(null)}>
          <form onSubmit={handleTransferSubmit} className="space-y-3">
            {trfError && <p className="text-xs text-red-600 dark:text-red-400">{trfError}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">From: <strong className="text-gray-900 dark:text-white">{transferTarget.warehouse}</strong> — Current qty: <strong className="text-gray-900 dark:text-white">{transferTarget.current_qty}</strong></p>
            <div>
              <label className={LABEL_CLS}>Destination Warehouse *</label>
              {warehouses.length > 0 ? (
                <select required className={INPUT_CLS} value={trfToWarehouse} onChange={e => setTrfToWarehouse(e.target.value)}>
                  <option value="">Select warehouse…</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              ) : (
                <input required className={INPUT_CLS} placeholder="Destination warehouse UUID" value={trfToWarehouse} onChange={e => setTrfToWarehouse(e.target.value)} />
              )}
            </div>
            <div>
              <label className={LABEL_CLS}>Quantity *</label>
              <input required type="number" min="0.0001" step="any" className={INPUT_CLS} placeholder="e.g. 10" value={trfQty} onChange={e => setTrfQty(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Notes</label>
              <input className={INPUT_CLS} placeholder="Optional notes" value={trfNotes} onChange={e => setTrfNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={BTN_GHOST} onClick={() => setTransferTarget(null)}>Cancel</button>
              <button type="submit" disabled={trfLoading} className={BTN_PRIMARY}>{trfLoading ? "Saving…" : "Transfer"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
