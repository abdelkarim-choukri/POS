"use client"
import { useState } from "react"
import { AlertTriangle, CheckCircle, Clock, Search } from "lucide-react"

interface ExpirationAlert {
  id: string; product: string; batch_number: string; warehouse: string
  qty: number; unit: string; expires_at: string; days_until_expiry: number
  status: "active" | "resolved"
}

const mockAlerts: ExpirationAlert[] = [
  { id: "ea-1", product: "Vanilla Syrup", batch_number: "BATCH-2025-003", warehouse: "Main WH", qty: 4, unit: "L", expires_at: "2025-02-15", days_until_expiry: 26, status: "active" },
  { id: "ea-2", product: "Whole Milk", batch_number: "BATCH-2025-002", warehouse: "Main WH", qty: 12, unit: "L", expires_at: "2025-02-01", days_until_expiry: 12, status: "active" },
  { id: "ea-3", product: "Fresh Cream", batch_number: "BATCH-2025-001", warehouse: "Cold WH", qty: 2, unit: "L", expires_at: "2025-01-25", days_until_expiry: 5, status: "active" },
  { id: "ea-4", product: "Yogurt Cups", batch_number: "BATCH-2024-099", warehouse: "Cold WH", qty: 18, unit: "pcs", expires_at: "2025-01-10", days_until_expiry: -10, status: "resolved" },
]

export default function ExpirationAlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [statusFilter, setStatusFilter] = useState("active")
  const [search, setSearch] = useState("")

  const filtered = alerts.filter(a => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter
    const matchSearch = a.product.toLowerCase().includes(search.toLowerCase()) || a.batch_number.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const resolve = (id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "resolved" as const } : a))

  const urgencyColor = (days: number) => {
    if (days < 0) return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
    if (days <= 7) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    if (days <= 30) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Alerts</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
          <AlertTriangle className="w-4 h-4" />
          {alerts.filter(a => a.status === "active").length} active alerts
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "Batch", "Warehouse", "Qty", "Expires", "Urgency", "Status", "Action"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.product}</td>
                <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{a.batch_number}</code></td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.warehouse}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.qty} {a.unit}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.expires_at}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyColor(a.days_until_expiry)}`}>
                    {a.days_until_expiry < 0 ? "Expired" : a.days_until_expiry <= 7 ? "Critical" : a.days_until_expiry <= 30 ? "Warning" : "Watch"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 text-xs font-medium ${a.status === "active" ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`}>
                    {a.status === "active" ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.status === "active" && (
                    <button onClick={() => resolve(a.id)} className="px-2.5 py-1 text-xs font-medium bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg transition-colors">
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No alerts found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
