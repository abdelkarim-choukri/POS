"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle, Clock, Search, X } from "lucide-react"
import { inventoryAlertsApi, productsApi, warehousesApi, stockBatchesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { ExpirationAlert, ResolveExpirationInput } from "@/lib/merchant/types"

/**
 * Expiration Alerts — TanStack Query migration.
 *
 * Ground truth (apps/backend/src/modules/inventory/alert.{controller,service}.ts):
 *   - GET business/expiration-alerts → { records, total, page, limit } (NOT `data`).
 *     The list query loads BARE entities (no product/warehouse/batch joins), so the
 *     product name, warehouse name, batch code, quantity and expiry are resolved
 *     client-side from the products / warehouses / stock-batches lists.
 *   - Filter is `is_resolved` (boolean); resolved ⇔ `resolved_at != null`. There is
 *     no `status` and no `alert_type` column — severity ∈ {expired, expires_soon}.
 *   - POST .../:id/resolve REQUIRES `action` ∈ {disposed, sold, extended, other}
 *     (+ optional notes). The old UI sent `{}` → 400. Resolve is owner/manager.
 */

const ACTION_OPTIONS: { value: ResolveExpirationInput["action"]; label: string }[] = [
  { value: "disposed", label: "Disposed" },
  { value: "sold", label: "Sold" },
  { value: "extended", label: "Extended" },
  { value: "other", label: "Other" },
]

const severityLabel = (s: ExpirationAlert["severity"]) => (s === "expired" ? "Expired" : "Expires soon")
const severityColor = (s: ExpirationAlert["severity"], resolved: boolean) => {
  if (resolved) return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
  return s === "expired"
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
}
const fmtDate = (s: string | null | undefined) => (s ? String(s).slice(0, 10) : "—")

export default function ExpirationAlertsPage() {
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<"unresolved" | "resolved">("unresolved")
  const [search, setSearch] = useState("")
  const [resolving, setResolving] = useState<ExpirationAlert | null>(null)
  const [resolveAction, setResolveAction] = useState<ResolveExpirationInput["action"]>("disposed")
  const [resolveNotes, setResolveNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const isResolved = statusFilter === "resolved"

  // ── Queries ───────────────────────────────────────────────────────────────
  const alertsQuery = useQuery({
    queryKey: merchantKeys.inventory.expirationAlerts(statusFilter),
    queryFn: () => inventoryAlertsApi.listExpiration({ is_resolved: isResolved }),
  })
  const alerts = alertsQuery.data?.records ?? []

  const productsQuery = useQuery({ queryKey: merchantKeys.products.list(null), queryFn: () => productsApi.list() })
  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: warehousesApi.list })
  const batchesQuery = useQuery({ queryKey: merchantKeys.inventory.batches("all"), queryFn: () => stockBatchesApi.list() })

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
  const batchById = useMemo(() => {
    const m = new Map<string, { batch_code: string; quantity_remaining: string; expires_at: string | null }>()
    for (const b of batchesQuery.data ?? []) m.set(b.id, { batch_code: b.batch_code, quantity_remaining: b.quantity_remaining, expires_at: b.expires_at })
    return m
  }, [batchesQuery.data])

  // ── Mutation ──────────────────────────────────────────────────────────────
  const resolveMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveExpirationInput }) =>
      inventoryAlertsApi.resolveExpiration(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.inventory.all })
      setResolving(null)
      setResolveNotes("")
    },
    onError: (e) => setFormError(humanizeError(e, "Failed to resolve alert.")),
  })

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return alerts
    return alerts.filter((a) => {
      const name = productName.get(a.product_id) ?? ""
      const code = a.batch_id ? batchById.get(a.batch_id)?.batch_code ?? "" : ""
      return name.toLowerCase().includes(q) || code.toLowerCase().includes(q)
    })
  }, [alerts, search, productName, batchById])

  const openResolve = (a: ExpirationAlert) => {
    setResolving(a)
    setResolveAction("disposed")
    setResolveNotes("")
    setFormError(null)
  }

  const listError = alertsQuery.isError ? humanizeError(alertsQuery.error, "Failed to load expiration alerts.") : null

  return (
    <div className="space-y-6">
      {(formError || listError) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          <span className="flex-1">{formError || listError}</span>
          {formError && <button onClick={() => setFormError(null)}><X className="w-4 h-4" /></button>}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search product or batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "unresolved" | "resolved")}
          >
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
          <AlertTriangle className="w-4 h-4" />
          {filtered.length} {statusFilter} {filtered.length === 1 ? "alert" : "alerts"}
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "Batch", "Warehouse", "Qty Left", "Expires", "Severity", "Status", "Action"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {alertsQuery.isLoading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No alerts found</td></tr>
            ) : filtered.map((a) => {
              const resolved = a.resolved_at != null
              const batch = a.batch_id ? batchById.get(a.batch_id) : undefined
              return (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{productName.get(a.product_id) ?? "—"}</td>
                  <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{batch?.batch_code ?? a.batch_id?.slice(0, 8) ?? "—"}</code></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{warehouseName.get(a.warehouse_id) ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{batch ? Number(batch.quantity_remaining) : "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtDate(batch?.expires_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColor(a.severity, resolved)}`}>{severityLabel(a.severity)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${resolved ? "text-gray-400" : "text-orange-600 dark:text-orange-400"}`}>
                      {resolved ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {resolved ? "resolved" : "unresolved"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!resolved && (
                      <button onClick={() => openResolve(a)} className="px-2.5 py-1 text-xs font-medium bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg transition-colors">
                        Resolve
                      </button>
                    )}
                    {resolved && a.action && (
                      <span className="text-xs text-gray-400 capitalize">{a.action}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Resolve modal */}
      {resolving && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resolve Alert</h2>
              <button onClick={() => setResolving(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {productName.get(resolving.product_id) ?? "Product"} — {resolving.batch_id ? batchById.get(resolving.batch_id)?.batch_code ?? "" : ""}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution Action *</label>
              <select
                value={resolveAction}
                onChange={(e) => setResolveAction(e.target.value as ResolveExpirationInput["action"])}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={2}
                placeholder="Optional..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setResolving(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button
                onClick={() => resolveMutation.mutate({ id: resolving.id, input: { action: resolveAction, ...(resolveNotes.trim() ? { notes: resolveNotes.trim() } : {}) } })}
                disabled={resolveMutation.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                {resolveMutation.isPending ? "Resolving..." : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
