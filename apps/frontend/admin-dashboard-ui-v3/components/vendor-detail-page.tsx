"use client"
import { useState, useEffect } from "react"
import { ArrowLeft, Building2, Phone, Mail, MapPin, CreditCard, FileText, DollarSign, Plus } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface VendorDetail {
  id: string; name: string; contact_name?: string; phone?: string; email?: string; address?: string
  payment_terms_days: number; ice?: string; rib?: string; is_active: boolean
  recent_pos: { id: string; number: string; date: string; total: number; status: string }[]
  stats: { total_purchases: number; outstanding_balance: number; avg_payment_days: number }
}

interface CheckDetail {
  id: string; check_number: string; bank_name: string; amount: number
  due_date: string; status: "pending" | "cleared" | "bounced"; notes?: string
}

const TABS = ["Info", "Checks", "Purchase Orders"] as const

const emptyCheckForm = { check_number: "", bank_name: "", amount: "", due_date: "", notes: "" }

export default function VendorDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const [vendor, setVendor] = useState<VendorDetail | null>(null)
  const [checks, setChecks] = useState<CheckDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<typeof TABS[number]>("Info")

  // Add-check form state
  const [showAddCheck, setShowAddCheck] = useState(false)
  const [checkForm, setCheckForm] = useState(emptyCheckForm)
  const [checkSaving, setCheckSaving] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  const fetchVendor = async () => {
    const data = await apiFetch(`/api/business/vendors/${id}`)
    setVendor(data)
  }

  const fetchCheckDetails = async () => {
    const data = await apiFetch(`/api/business/vendors/${id}/check-details`)
    setChecks(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([fetchVendor(), fetchCheckDetails()])
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load vendor"))
      .finally(() => setLoading(false))
  }, [id])

  const handleAddCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckSaving(true)
    setCheckError(null)
    try {
      await apiFetch(`/api/business/vendors/${id}/check-details`, {
        method: "POST",
        body: JSON.stringify({
          check_number: checkForm.check_number,
          bank_name: checkForm.bank_name,
          amount: parseFloat(checkForm.amount),
          due_date: checkForm.due_date,
          ...(checkForm.notes ? { notes: checkForm.notes } : {}),
        }),
      })
      setCheckForm(emptyCheckForm)
      setShowAddCheck(false)
      await fetchCheckDetails()
    } catch (err: unknown) {
      setCheckError(err instanceof Error ? err.message : "Failed to save check detail")
    } finally {
      setCheckSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500 text-sm">
        Loading vendor…
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
        {error ?? "Vendor not found."}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>}
        <div className="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{vendor.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${vendor.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
              {vendor.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          {vendor.contact_name && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Contact: {vendor.contact_name}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center flex-shrink-0">
          {[
            { label: "Total Purchases", value: `${(vendor.stats.total_purchases / 1000).toFixed(0)}K MAD` },
            { label: "Outstanding", value: `${vendor.stats.outstanding_balance.toLocaleString()} MAD` },
            { label: "Avg Pay Days", value: `${vendor.stats.avg_payment_days}d` },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-3 min-w-[100px]">
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
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === "Info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Contact</h3>
            {[
              { icon: Phone, label: "Phone", value: vendor.phone ?? "—" },
              { icon: Mail, label: "Email", value: vendor.email ?? "—" },
              { icon: MapPin, label: "Address", value: vendor.address ?? "—" },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3 text-sm">
                <row.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-gray-400">{row.label}</p><p className="text-gray-900 dark:text-white">{row.value}</p></div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Financial</h3>
            {[
              { icon: CreditCard, label: "Payment Terms", value: `${vendor.payment_terms_days} days` },
              { icon: FileText, label: "ICE", value: vendor.ice ?? "—" },
              { icon: DollarSign, label: "RIB", value: (vendor as VendorDetail & { rib?: string }).rib ?? "—" },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3 text-sm">
                <row.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-gray-400">{row.label}</p><p className="font-mono text-xs text-gray-900 dark:text-white">{row.value}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Checks" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowAddCheck(v => !v); setCheckError(null) }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Check
            </button>
          </div>

          {showAddCheck && (
            <form onSubmit={handleAddCheck} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">New Check Detail</h4>
              {checkError && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                  {checkError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["check_number", "bank_name"] as const).map(field => (
                  <div key={field}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize">{field.replace("_", " ")}</label>
                    <input
                      required
                      value={checkForm[field]}
                      onChange={e => setCheckForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1a1a20] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount (MAD)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={checkForm.amount}
                    onChange={e => setCheckForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1a1a20] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
                  <input
                    required
                    type="date"
                    value={checkForm.due_date}
                    onChange={e => setCheckForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1a1a20] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                  <input
                    value={checkForm.notes}
                    onChange={e => setCheckForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1a1a20] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button type="button" onClick={() => { setShowAddCheck(false); setCheckForm(emptyCheckForm); setCheckError(null) }}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={checkSaving}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {checkSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a20]">
                <tr>{["Check #", "Bank", "Amount", "Due Date", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
                {checks.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No check details yet.</td></tr>
                ) : checks.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{c.check_number}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.bank_name}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{c.amount.toLocaleString()} MAD</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.due_date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${c.status === "cleared" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : c.status === "bounced" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Purchase Orders" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>{["PO Number", "Date", "Status", "Total"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {(vendor.recent_pos ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No purchase orders yet.</td></tr>
              ) : (vendor.recent_pos ?? []).map(po => (
                <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{po.number}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{po.date}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-xs capitalize">{po.status}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{po.total.toLocaleString()} MAD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
