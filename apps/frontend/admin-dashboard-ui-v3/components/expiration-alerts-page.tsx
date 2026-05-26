"use client"
import { useState, useEffect } from "react"
import { AlertTriangle, CheckCircle, Clock, Search } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface ExpirationAlert {
  id: string
  product_id: string
  product_name: string
  batch_id: string
  warehouse_id: string
  warehouse_name: string
  quantity: number
  expires_at: string
  alert_type: "expires_soon" | "expired"
  status: "unresolved" | "resolved"
  detected_at: string
}

export default function ExpirationAlertsPage() {
  const [alerts, setAlerts] = useState<ExpirationAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("unresolved")
  const [search, setSearch] = useState("")

  const fetchAlerts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/api/business/expiration-alerts")
      const data = Array.isArray(res) ? res : res.data ?? []
      setAlerts(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load expiration alerts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  const filtered = alerts.filter(a => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter
    const matchSearch = a.product_name.toLowerCase().includes(search.toLowerCase()) || a.batch_id.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const resolve = async (id: string) => {
    try {
      await apiFetch(`/api/business/expiration-alerts/${id}/resolve`, { method: "POST", body: JSON.stringify({}) })
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "resolved" as const } : a))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resolve alert")
    }
  }

  const urgencyColor = (alert: ExpirationAlert) => {
    if (alert.status === "resolved") return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
    if (alert.alert_type === "expired") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    const daysLeft = Math.floor((new Date(alert.expires_at).getTime() - Date.now()) / 86400000)
    if (daysLeft <= 7) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    if (daysLeft <= 30) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
  }

  const urgencyLabel = (alert: ExpirationAlert) => {
    if (alert.alert_type === "expired") return "Expired"
    const daysLeft = Math.floor((new Date(alert.expires_at).getTime() - Date.now()) / 86400000)
    if (daysLeft <= 7) return "Critical"
    if (daysLeft <= 30) return "Warning"
    return "Watch"
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

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
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
          <AlertTriangle className="w-4 h-4" />
          {alerts.filter(a => a.status === "unresolved").length} active alerts
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
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No alerts found</td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.product_name}</td>
                <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{a.batch_id}</code></td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.warehouse_name}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.quantity}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.expires_at}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyColor(a)}`}>
                    {urgencyLabel(a)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 text-xs font-medium ${a.status === "unresolved" ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`}>
                    {a.status === "unresolved" ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.status === "unresolved" && (
                    <button onClick={() => resolve(a.id)} className="px-2.5 py-1 text-xs font-medium bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg transition-colors">
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
