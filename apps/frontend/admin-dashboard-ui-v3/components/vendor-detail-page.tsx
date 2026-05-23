"use client"
import { useState } from "react"
import { ArrowLeft, Building2, Phone, Mail, MapPin, CreditCard, FileText, DollarSign } from "lucide-react"

interface VendorDetail {
  id: string; name: string; contact_name?: string; phone?: string; email?: string; address?: string
  payment_terms_days: number; ice?: string; rib?: string; is_active: boolean
  checks: { id: string; number: string; bank: string; amount: number; due_date: string; status: "pending" | "cleared" | "bounced" }[]
  recent_pos: { id: string; number: string; date: string; total: number; status: string }[]
  stats: { total_purchases: number; outstanding_balance: number; avg_payment_days: number }
}

const mockVendor: VendorDetail = {
  id: "vendor-1", name: "Al Watan Supplies", contact_name: "Youssef Alami", phone: "+212522334455",
  email: "youssef@alwatan.ma", address: "Zone Industrielle, Ain Sebaa, Casablanca",
  payment_terms_days: 30, ice: "001234567000012", rib: "320 006 0123456789012345 07",
  is_active: true,
  checks: [
    { id: "c-1", number: "CHK-2025-001", bank: "Attijariwafa Bank", amount: 5100, due_date: "2025-02-15", status: "pending" },
    { id: "c-2", number: "CHK-2024-089", bank: "CIH Bank", amount: 3800, due_date: "2025-01-10", status: "cleared" },
  ],
  recent_pos: [
    { id: "po-1", number: "PO-2025-0042", date: "2025-01-19", total: 5100, status: "confirmed" },
    { id: "po-2", number: "PO-2025-0028", date: "2025-01-05", total: 3200, status: "received" },
    { id: "po-3", number: "PO-2024-0183", date: "2024-12-15", total: 6700, status: "received" },
  ],
  stats: { total_purchases: 84600, outstanding_balance: 5100, avg_payment_days: 28 },
}

const TABS = ["Info", "Checks", "Purchase Orders"] as const

export default function VendorDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const vendor = mockVendor
  const [tab, setTab] = useState<typeof TABS[number]>("Info")

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
              { icon: DollarSign, label: "RIB", value: vendor.rib ?? "—" },
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
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>{["Check #", "Bank", "Amount", "Due Date", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {vendor.checks.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{c.number}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.bank}</td>
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
              {vendor.recent_pos.map(po => (
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
