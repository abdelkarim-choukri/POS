"use client"
import { useState, useEffect } from "react"
import { AlertCircle, Search, CheckCircle, Clock } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface DiscrepancyAlert {
  id: string
  product_id: string
  product_name: string
  warehouse_id: string
  warehouse_name: string
  expected_quantity: number
  actual_quantity: number
  discrepancy: number
  status: "open" | "investigating" | "resolved"
  detected_at: string
  resolved_at: string | null
  // legacy fields from mock shape — kept for display compat
  product?: string
  warehouse?: string
  system_qty?: number
  actual_qty?: number
  unit?: string
  source?: "system_detected" | "offline_sync"
}

const ACTIONS = ["manual_recount", "accept_loss", "adjust_batch"] as const

export default function DiscrepancyAlertsPage() {
  const [alerts, setAlerts] = useState<DiscrepancyAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [actionModal, setActionModal] = useState<{ alertId: string; action: typeof ACTIONS[number]; notes: string } | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const fetchAlerts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/api/business/stock-discrepancy-alerts")
      const data = Array.isArray(res) ? res : (res?.data ?? [])
      setAlerts(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load discrepancy alerts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  // Normalise field names — backend uses product_name/expected_quantity but UI was built on mock names
  const displayProduct = (a: DiscrepancyAlert) => a.product_name ?? a.product ?? "—"
  const displayWarehouse = (a: DiscrepancyAlert) => a.warehouse_name ?? a.warehouse ?? "—"
  const displaySystemQty = (a: DiscrepancyAlert) => a.expected_quantity ?? a.system_qty ?? 0
  const displayActualQty = (a: DiscrepancyAlert) => a.actual_quantity ?? a.actual_qty ?? 0
  const displayDiff = (a: DiscrepancyAlert) => a.discrepancy ?? (displayActualQty(a) - displaySystemQty(a))

  const filtered = alerts.filter(a =>
    displayProduct(a).toLowerCase().includes(search.toLowerCase())
  )

  const applyAction = async () => {
    if (!actionModal) return
    setResolving(true)
    setResolveError(null)
    try {
      await apiFetch(`/api/business/stock-discrepancy-alerts/${actionModal.alertId}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          action: actionModal.action,
          ...(actionModal.notes.trim() ? { notes: actionModal.notes.trim() } : {}),
        }),
      })
      setActionModal(null)
      await fetchAlerts()
    } catch (err: unknown) {
      setResolveError(err instanceof Error ? err.message : "Failed to resolve alert")
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={fetchAlerts} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          {alerts.filter(a => a.status !== "resolved").length} open discrepancies
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "Warehouse", "System Qty", "Actual Qty", "Difference", "Detected", "Source", "Status", "Actions"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {loading && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">Loading…</td></tr>
            )}
            {!loading && filtered.map(a => {
              const diff = displayDiff(a)
              return (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{displayProduct(a)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{displayWarehouse(a)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{displaySystemQty(a)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{displayActualQty(a)}</td>
                  <td className="px-4 py-3"><span className={`font-semibold ${diff < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{diff > 0 ? "+" : ""}{diff}</span></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.detected_at ? new Date(a.detected_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    {a.source && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded capitalize">{a.source.replace("_", " ")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${a.status === "resolved" ? "text-green-600 dark:text-green-400" : a.status === "investigating" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                      {a.status === "resolved" ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status !== "resolved" && (
                      <div className="flex gap-1 flex-wrap">
                        {ACTIONS.map(action => (
                          <button key={action} onClick={() => setActionModal({ alertId: a.id, action, notes: "" })}
                            className="px-2 py-1 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors capitalize">
                            {action.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {!loading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No discrepancies found</td></tr>}
          </tbody>
        </table>
      </div>

      {actionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{actionModal.action.replace(/_/g, " ")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {actionModal.action === "manual_recount" && "Mark this alert as under investigation pending a physical recount."}
              {actionModal.action === "accept_loss" && "Accept the discrepancy as a loss. The system quantity will be updated to match actual."}
              {actionModal.action === "adjust_batch" && "Create a batch adjustment to reconcile the discrepancy."}
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notes (optional)</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Add any relevant notes…"
                value={actionModal.notes}
                onChange={e => setActionModal(prev => prev ? { ...prev, notes: e.target.value } : prev)}
              />
            </div>
            {resolveError && (
              <p className="text-xs text-red-600 dark:text-red-400">{resolveError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionModal(null); setResolveError(null) }} disabled={resolving} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-50">Cancel</button>
              <button onClick={applyAction} disabled={resolving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {resolving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
