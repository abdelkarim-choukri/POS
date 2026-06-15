"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Building2, Phone, Mail, MapPin, CreditCard, FileText, Hash, Plus, Star } from "lucide-react"
import { vendorsApi, authApi, purchaseOrdersApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { VendorCheckDetail, CreateCheckDetailInput } from "@/lib/merchant/types"

function num(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }
const termsLabel = (days: number) => (days > 0 ? `Net ${days}` : "COD")
const scoreColor = (s: number | null) =>
  s == null ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    : s >= 8 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : s >= 5 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
const poStatusColor = (s: string) =>
  s === "received" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : s === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"

const TABS = ["Info", "Quality Checks", "Purchase Orders"] as const

export default function VendorDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<typeof TABS[number]>("Info")
  const [showAddCheck, setShowAddCheck] = useState(false)
  const [checkForm, setCheckForm] = useState({ check_date: new Date().toISOString().slice(0, 10), quality_score: "", delivery_score: "", price_score: "", notes: "" })

  const vendorQuery = useQuery({ queryKey: merchantKeys.vendors.detail(id), queryFn: () => vendorsApi.detail(id), enabled: !!id })
  const vendor = vendorQuery.data ?? null
  const checksQuery = useQuery({ queryKey: merchantKeys.vendors.checks(id), queryFn: () => vendorsApi.listChecks(id), enabled: !!id })
  const checks = checksQuery.data ?? []
  const posQuery = useQuery({ queryKey: merchantKeys.vendors.purchaseOrders(id), queryFn: () => purchaseOrdersApi.listByVendor(id), enabled: !!id })
  const pos = posQuery.data ?? []
  const meQuery = useQuery({ queryKey: ["merchant", "me"], queryFn: () => authApi.me() })

  const createCheckMutation = useMutation({
    mutationFn: (input: CreateCheckDetailInput) => vendorsApi.createCheck(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantKeys.vendors.checks(id) })
      setShowAddCheck(false)
      setCheckForm({ check_date: new Date().toISOString().slice(0, 10), quality_score: "", delivery_score: "", price_score: "", notes: "" })
    },
  })

  const submitCheck = (e: React.FormEvent) => {
    e.preventDefault()
    if (!meQuery.data) return
    const input: CreateCheckDetailInput = { check_date: checkForm.check_date, checked_by_user_id: meQuery.data.id }
    const q = parseInt(checkForm.quality_score, 10); if (Number.isFinite(q)) input.quality_score = q
    const d = parseInt(checkForm.delivery_score, 10); if (Number.isFinite(d)) input.delivery_score = d
    const p = parseInt(checkForm.price_score, 10); if (Number.isFinite(p)) input.price_score = p
    if (checkForm.notes.trim()) input.notes = checkForm.notes.trim()
    createCheckMutation.mutate(input)
  }

  if (vendorQuery.isLoading) return <div className="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500 text-sm">Loading vendor…</div>
  if (vendorQuery.isError || !vendor) {
    return <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{vendorQuery.isError ? humanizeError(vendorQuery.error, "Failed to load vendor.") : "Vendor not found."}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>}
        <div className="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0"><Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{vendor.name}</h1>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{vendor.code}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${vendor.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>{vendor.is_active ? "Active" : "Inactive"}</span>
          </div>
          {vendor.contact_name && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Contact: {vendor.contact_name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 text-center flex-shrink-0">
          {[
            { label: "Purchase Orders", value: posQuery.isLoading ? "…" : String(pos.length) },
            { label: "Quality Checks", value: checksQuery.isLoading ? "…" : String(checks.length) },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-3 min-w-[110px]">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-[#1F1F23]">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === "Info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Contact</h3>
            {[
              { icon: Phone, label: "Phone", value: vendor.contact_phone ?? "—" },
              { icon: Mail, label: "Email", value: vendor.contact_email ?? "—" },
              { icon: MapPin, label: "Address", value: vendor.address ?? "—" },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3 text-sm">
                <row.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-gray-400">{row.label}</p><p className="text-gray-900 dark:text-white">{row.value}</p></div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Financial &amp; Legal</h3>
            {[
              { icon: CreditCard, label: "Payment Terms", value: termsLabel(vendor.payment_terms_days) },
              { icon: Hash, label: "ICE", value: vendor.ice_number ?? "—" },
              { icon: FileText, label: "IF", value: vendor.if_number ?? "—" },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3 text-sm">
                <row.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-gray-400">{row.label}</p><p className="font-mono text-xs text-gray-900 dark:text-white">{row.value}</p></div>
              </div>
            ))}
            {vendor.notes && <div className="pt-2"><p className="text-xs text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-700 dark:text-gray-300">{vendor.notes}</p></div>}
          </div>
        </div>
      )}

      {tab === "Quality Checks" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddCheck(v => !v)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"><Plus className="w-4 h-4" /> Add Check</button>
          </div>

          {showAddCheck && (
            <form onSubmit={submitCheck} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">New Quality Check</h4>
              {createCheckMutation.isError && <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-400">{humanizeError(createCheckMutation.error, "Failed to save check.")}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Check Date</label>
                  <input required type="date" value={checkForm.check_date} onChange={e => setCheckForm(f => ({ ...f, check_date: e.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1a1a20] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {(["quality_score", "delivery_score", "price_score"] as const).map(field => (
                  <div key={field}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize">{field.replace("_score", "")} (1–10)</label>
                    <input type="number" min="1" max="10" value={checkForm[field]} onChange={e => setCheckForm(f => ({ ...f, [field]: e.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1a1a20] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                  <input value={checkForm.notes} onChange={e => setCheckForm(f => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1a1a20] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Recorded as: {meQuery.data ? `${meQuery.data.first_name} ${meQuery.data.last_name}` : "current user"}</p>
              <div className="flex items-center gap-2 justify-end">
                <button type="button" onClick={() => setShowAddCheck(false)} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={createCheckMutation.isPending || !meQuery.data} className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">{createCheckMutation.isPending ? "Saving…" : "Save"}</button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a20]">
                <tr>{["Date", "Quality", "Delivery", "Price", "Notes"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
                {checksQuery.isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
                {!checksQuery.isLoading && checks.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No quality checks yet.</td></tr>
                ) : checks.map((c: VendorCheckDetail) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{new Date(c.check_date).toLocaleDateString()}</td>
                    {(["quality_score", "delivery_score", "price_score"] as const).map(k => (
                      <td key={k} className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${scoreColor(c[k])}`}><Star className="w-3 h-3" />{c[k] ?? "—"}</span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Purchase Orders" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          {posQuery.isError && <div className="px-4 py-3 text-sm text-red-700 dark:text-red-400">{humanizeError(posQuery.error, "Failed to load purchase orders.")}</div>}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>{["PO Number", "Order Date", "Expected", "Status", "Total TTC"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {posQuery.isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!posQuery.isLoading && pos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No purchase orders for this vendor.</td></tr>
              ) : pos.map(po => (
                <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{po.po_number}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{po.order_date ? new Date(po.order_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs capitalize ${poStatusColor(po.status)}`}>{po.status}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{num(po.total_ttc).toLocaleString()} MAD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
