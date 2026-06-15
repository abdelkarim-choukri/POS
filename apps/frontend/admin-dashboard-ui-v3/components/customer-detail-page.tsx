"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Phone, Mail, Star, Gift, Calendar, ShoppingCart } from "lucide-react"
import { customersApi, attributesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"

/**
 * Customer Detail — TanStack Query migration.
 *
 * Ground truth (customer.controller + CustomerDetail):
 *   - GET /customers/:id → Customer + `stats` { visit_count, total_spend, last_visit }
 *     + `grade` relation + `label_assignments`. The old page invented `grade` as a
 *     fixed enum and fell back to MOCK customer/labels/points.
 *   - GET /customers/:id/attributes → a PLAIN array { attribute_id, value } (the old
 *     code read `.attributes`); attribute LABELS come from GET /customer-attributes.
 *   - PUT /customers/:id/attributes wants { values: Record<id,value> } — the old body
 *     sent { attributes: [...] } → 400.
 *   - Points History is real (GET /customers/:id/points-history). There is NO
 *     per-customer transactions endpoint, so that tab shows an honest empty state
 *     (was mock).
 */

const GRADE_COLORS: Record<string, string> = {
  Bronze: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Silver: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  Gold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Platinum: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
}
const TABS = ["Profile", "Transactions", "Points History", "Labels"] as const
const num = (v: unknown) => Number(v ?? 0)
const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : "—")

export default function CustomerDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<typeof TABS[number]>("Profile")
  const [editingAttrs, setEditingAttrs] = useState<Record<string, string> | null>(null)
  const [attrError, setAttrError] = useState<string | null>(null)

  const detailQuery = useQuery({ queryKey: merchantKeys.customers.detail(id), queryFn: () => customersApi.detail(id) })
  const attrDefsQuery = useQuery({ queryKey: merchantKeys.attributes.list(), queryFn: attributesApi.list })
  const attrValuesQuery = useQuery({ queryKey: ["merchant", "customers", id, "attribute-values"], queryFn: () => customersApi.getAttributeValues(id) })
  const pointsQuery = useQuery({ queryKey: merchantKeys.customers.pointsHistory(id), queryFn: () => customersApi.pointsHistory(id), enabled: tab === "Points History" })

  const c = detailQuery.data
  const valueByAttr = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of attrValuesQuery.data ?? []) m.set(v.attribute_id, v.value)
    return m
  }, [attrValuesQuery.data])

  const saveAttrsM = useMutation({
    mutationFn: (values: Record<string, string>) => customersApi.setAttributeValues(id, values),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["merchant", "customers", id, "attribute-values"] }); setEditingAttrs(null) },
    onError: (e) => setAttrError(humanizeError(e, "Failed to save attributes.")),
  })

  if (detailQuery.isLoading) return <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 text-sm">Loading customer…</div>
  if (detailQuery.isError || !c) return <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{humanizeError(detailQuery.error, "Failed to load customer.")}</div>

  const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.customer_code || "Customer"
  const gradeName = c.grade?.name ?? null
  const labels = (c.label_assignments ?? []).map((la) => la.label?.name).filter(Boolean) as string[]
  const attrDefs = attrDefsQuery.data ?? []

  const startEdit = () => {
    const draft: Record<string, string> = {}
    for (const d of attrDefs) draft[d.id] = valueByAttr.get(d.id) ?? ""
    setEditingAttrs(draft)
    setAttrError(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {onBack && <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">{name.charAt(0)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h1>
            {gradeName && <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${GRADE_COLORS[gradeName] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>{gradeName}</span>}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
            {c.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.phone}</span>}
            {c.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email}</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center flex-shrink-0">
          {[
            { label: "Points", value: num(c.points_balance).toLocaleString(), icon: Star },
            { label: "Spent", value: `${num(c.stats?.total_spend).toLocaleString()} MAD`, icon: ShoppingCart },
            { label: "Visits", value: String(num(c.stats?.visit_count)), icon: Calendar },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-3 min-w-[100px]">
              <stat.icon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-[#1F1F23]">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === "Profile" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Contact Information</h3>
              {[
                { label: "Customer Code", value: c.customer_code ?? "—" },
                { label: "Phone", value: c.phone ?? "—" },
                { label: "Email", value: c.email ?? "—" },
                { label: "Last Visit", value: fmtDate(c.stats?.last_visit) },
                { label: "Member Since", value: fmtDate(c.created_at) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{row.value}</span>
                </div>
              ))}
            </div>
            {c.notes && (
              <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{c.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Custom Attributes</h3>
              {!editingAttrs && attrDefs.length > 0 && <button onClick={startEdit} className="text-sm px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">Edit</button>}
            </div>
            {attrError && <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-400">{attrError}</div>}

            {attrDefs.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No custom attributes defined for this business.</p>
            ) : editingAttrs ? (
              <div className="space-y-3">
                {attrDefs.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 text-sm">
                    <span className="w-40 flex-shrink-0 text-gray-500 dark:text-gray-400">{d.label}{d.is_required && <span className="text-red-500"> *</span>}</span>
                    {d.data_type === "enum" && d.enum_options ? (
                      <select value={editingAttrs[d.id] ?? ""} onChange={(e) => setEditingAttrs((p) => ({ ...(p ?? {}), [d.id]: e.target.value }))} className="flex-1 rounded-lg border border-gray-300 dark:border-[#1F1F23] bg-white dark:bg-[#1a1a20] px-3 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">—</option>{d.enum_options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={d.data_type === "number" ? "number" : d.data_type === "date" ? "date" : "text"} value={editingAttrs[d.id] ?? ""} onChange={(e) => setEditingAttrs((p) => ({ ...(p ?? {}), [d.id]: e.target.value }))} className="flex-1 rounded-lg border border-gray-300 dark:border-[#1F1F23] bg-white dark:bg-[#1a1a20] px-3 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    )}
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => saveAttrsM.mutate(editingAttrs)} disabled={saveAttrsM.isPending} className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">{saveAttrsM.isPending ? "Saving…" : "Save"}</button>
                  <button onClick={() => { setEditingAttrs(null); setAttrError(null) }} disabled={saveAttrsM.isPending} className="px-4 py-1.5 rounded-lg border border-gray-300 dark:border-[#1F1F23] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a20] disabled:opacity-50 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {attrDefs.map((d) => (
                  <div key={d.id} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{d.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{valueByAttr.get(d.id) || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "Transactions" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-10 text-center">
          <ShoppingCart className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Per-customer transaction history isn&apos;t available from the API yet.</p>
        </div>
      )}

      {tab === "Points History" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          {pointsQuery.isLoading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a20]"><tr>{["Date", "Reason", "Points", "Balance"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
                {(pointsQuery.data?.records ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(p.created_at)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.reason || p.source}</td>
                    <td className="px-4 py-3"><span className={`font-semibold ${num(p.delta) > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{num(p.delta) > 0 ? "+" : ""}{num(p.delta)}</span></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{num(p.balance_after).toLocaleString()}</td>
                  </tr>
                ))}
                {(pointsQuery.data?.records ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No points activity yet</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "Labels" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Assigned Labels</h3>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium"><Gift className="w-3.5 h-3.5" />{label}</span>)}
            {labels.length === 0 && <p className="text-sm text-gray-400">No labels assigned</p>}
          </div>
        </div>
      )}
    </div>
  )
}
