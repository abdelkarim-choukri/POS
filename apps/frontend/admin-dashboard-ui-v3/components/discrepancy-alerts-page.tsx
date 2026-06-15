"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Search, CheckCircle, Clock, X } from "lucide-react"
import { inventoryAlertsApi, productsApi, warehousesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { DiscrepancyAlert, ResolveDiscrepancyInput } from "@/lib/merchant/types"

/**
 * Stock Discrepancy Alerts — TanStack Query migration.
 *
 * Ground truth (apps/backend/src/modules/inventory/alert.{controller,service}.ts,
 * stock_discrepancy_alerts entity):
 *   - GET business/stock-discrepancy-alerts → { records, total, page, limit } (NOT `data`),
 *     BARE entities (no joins) → product/warehouse names resolved client-side.
 *   - Real columns: expected_remaining / actual_remaining / discrepancy_quantity
 *     (NUMERIC(12,4) → STRINGS, Number() before math). There is NO `status`,
 *     `expected_quantity`, `actual_quantity`, `discrepancy`, or `detected_at`.
 *     Resolved ⇔ resolved_at != null; "detected" time = created_at.
 *   - Filter is `is_resolved` (boolean). source ∈ {offline_sync, manual_count, system_detected}.
 *   - POST .../:id/resolve (owner/manager): action ∈ {manual_recount, accept_loss,
 *     adjust_batch} REQUIRED; adjust_batch also takes adjustment_quantity. EVERY action
 *     sets resolved_at — there is no "investigating" interim state.
 */

const ACTIONS: { value: ResolveDiscrepancyInput["action"]; label: string; help: string }[] = [
  { value: "manual_recount", label: "Manual Recount", help: "Close the alert after a physical recount. No stock change is made." },
  { value: "accept_loss", label: "Accept Loss", help: "Record the missing quantity as waste and close the alert." },
  { value: "adjust_batch", label: "Adjust Batch", help: "Set the batch quantity to the value below and close the alert." },
]

const num = (v: string | number | null | undefined) => Number(v ?? 0)
const sourceLabel = (s: DiscrepancyAlert["source"]) =>
  ({ offline_sync: "Offline sync", manual_count: "Manual count", system_detected: "System detected" }[s] ?? s)

export default function DiscrepancyAlertsPage() {
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<"unresolved" | "resolved">("unresolved")
  const [search, setSearch] = useState("")
  const [actionModal, setActionModal] = useState<{ alert: DiscrepancyAlert; action: ResolveDiscrepancyInput["action"]; notes: string; adjustment_quantity: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const isResolved = statusFilter === "resolved"

  // ── Queries ───────────────────────────────────────────────────────────────
  const alertsQuery = useQuery({
    queryKey: merchantKeys.inventory.discrepancyAlerts(statusFilter),
    queryFn: () => inventoryAlertsApi.listDiscrepancy({ is_resolved: isResolved }),
  })
  const alerts = alertsQuery.data?.records ?? []

  const productsQuery = useQuery({ queryKey: merchantKeys.products.list(null), queryFn: () => productsApi.list() })
  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: warehousesApi.list })

  const productName = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of productsQuery.data ?? []) m.set(p.id, p.name)
    return m
  }, [productsQuery.data])
  const warehouseName = useMemo(() => {
    const m = new Map<string, string>()
    for (const w of warehousesQuery.data ?? []) m.set(w.id, w.name)
    return m
  }, [warehousesQuery.data])

  const prodOf = (a: DiscrepancyAlert) => (a.product_id ? productName.get(a.product_id) ?? "—" : "—")
  const whOf = (a: DiscrepancyAlert) => (a.warehouse_id ? warehouseName.get(a.warehouse_id) ?? "—" : "—")

  // ── Mutation ──────────────────────────────────────────────────────────────
  const resolveMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveDiscrepancyInput }) =>
      inventoryAlertsApi.resolveDiscrepancy(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.inventory.all })
      setActionModal(null)
    },
    onError: (e) => setFormError(humanizeError(e, "Failed to resolve alert.")),
  })

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return alerts
    return alerts.filter((a) => prodOf(a).toLowerCase().includes(q))
  }, [alerts, search, productName])

  const submitResolve = () => {
    if (!actionModal) return
    setFormError(null)
    const input: ResolveDiscrepancyInput = {
      action: actionModal.action,
      ...(actionModal.action === "adjust_batch" && actionModal.adjustment_quantity.trim()
        ? { adjustment_quantity: num(actionModal.adjustment_quantity) }
        : {}),
      ...(actionModal.notes.trim() ? { notes: actionModal.notes.trim() } : {}),
    }
    resolveMutation.mutate({ id: actionModal.alert.id, input })
  }

  const listError = alertsQuery.isError ? humanizeError(alertsQuery.error, "Failed to load discrepancy alerts.") : null

  return (
    <div className="space-y-6">
      {listError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {listError}
          <button onClick={() => alertsQuery.refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "unresolved" | "resolved")}
          >
            <option value="unresolved">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          {filtered.length} {statusFilter === "resolved" ? "resolved" : "open"} {filtered.length === 1 ? "discrepancy" : "discrepancies"}
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "Warehouse", "Expected", "Actual", "Difference", "Detected", "Source", "Status", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {alertsQuery.isLoading ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No discrepancies found</td></tr>
            ) : filtered.map((a) => {
              const resolved = a.resolved_at != null
              const diff = num(a.discrepancy_quantity)
              return (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{prodOf(a)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{whOf(a)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{num(a.expected_remaining)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{num(a.actual_remaining)}</td>
                  <td className="px-4 py-3"><span className={`font-semibold ${diff < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{diff > 0 ? "+" : ""}{diff}</span></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded">{sourceLabel(a.source)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${resolved ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {resolved ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {resolved ? "resolved" : "open"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!resolved && (
                      <div className="flex gap-1 flex-wrap">
                        {ACTIONS.map((act) => (
                          <button
                            key={act.value}
                            onClick={() => { setFormError(null); setActionModal({ alert: a, action: act.value, notes: "", adjustment_quantity: a.actual_remaining }) }}
                            className="px-2 py-1 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {actionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{ACTIONS.find((x) => x.value === actionModal.action)?.label}</h3>
              <button onClick={() => setActionModal(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {prodOf(actionModal.alert)} — {ACTIONS.find((x) => x.value === actionModal.action)?.help}
            </p>
            {actionModal.action === "adjust_batch" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">New batch quantity</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={actionModal.adjustment_quantity}
                  onChange={(e) => setActionModal((p) => (p ? { ...p, adjustment_quantity: e.target.value } : p))}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notes (optional)</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Add any relevant notes…"
                value={actionModal.notes}
                onChange={(e) => setActionModal((p) => (p ? { ...p, notes: e.target.value } : p))}
              />
            </div>
            {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} disabled={resolveMutation.isPending} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-50">Cancel</button>
              <button onClick={submitResolve} disabled={resolveMutation.isPending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {resolveMutation.isPending ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
