"use client"
import { useState } from "react"
import { AlertCircle, Search, CheckCircle, Clock } from "lucide-react"

interface DiscrepancyAlert {
  id: string; product: string; warehouse: string; system_qty: number
  actual_qty: number; unit: string; detected_at: string
  status: "open" | "investigating" | "resolved"; source: "system_detected" | "offline_sync"
}

const mockAlerts: DiscrepancyAlert[] = [
  { id: "da-1", product: "Paper Cups (M)", warehouse: "Main WH", system_qty: 900, actual_qty: 780, unit: "pcs", detected_at: "2025-01-21", status: "open", source: "system_detected" },
  { id: "da-2", product: "Sugar Sachets", warehouse: "Main WH", system_qty: 300, actual_qty: 0, unit: "pcs", detected_at: "2025-01-20", status: "investigating", source: "offline_sync" },
  { id: "da-3", product: "Vanilla Syrup", warehouse: "Main WH", system_qty: 5, actual_qty: 4, unit: "L", detected_at: "2025-01-18", status: "resolved", source: "system_detected" },
]

const ACTIONS = ["manual_recount", "accept_loss", "adjust_batch"] as const

export default function DiscrepancyAlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [search, setSearch] = useState("")
  const [actionModal, setActionModal] = useState<{ alertId: string; action: typeof ACTIONS[number] } | null>(null)

  const filtered = alerts.filter(a => a.product.toLowerCase().includes(search.toLowerCase()))

  const applyAction = () => {
    if (!actionModal) return
    setAlerts(prev => prev.map(a => a.id === actionModal.alertId ? { ...a, status: "resolved" as const } : a))
    setActionModal(null)
  }

  return (
    <div className="space-y-6">
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
            {filtered.map(a => {
              const diff = a.actual_qty - a.system_qty
              return (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.product}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.warehouse}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.system_qty} {a.unit}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.actual_qty} {a.unit}</td>
                  <td className="px-4 py-3"><span className={`font-semibold ${diff < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{diff > 0 ? "+" : ""}{diff} {a.unit}</span></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.detected_at}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded capitalize">{a.source.replace("_", " ")}</span>
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
                          <button key={action} onClick={() => setActionModal({ alertId: a.id, action })}
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
            {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No discrepancies found</td></tr>}
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
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={applyAction} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
