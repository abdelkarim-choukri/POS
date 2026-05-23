"use client"
import { useState } from "react"
import { Search, AlertTriangle } from "lucide-react"

interface StockBatch {
  id: string; batch_number: string; product: string; warehouse: string
  received_qty: number; current_qty: number; cost_per_unit: number
  received_at: string; expires_at?: string
  status: "available" | "depleted" | "disposed" | "expiring_soon"
}

const mockBatches: StockBatch[] = [
  { id: "b-1", batch_number: "BATCH-2025-001", product: "Arabica Coffee Beans", warehouse: "Main WH", received_qty: 50, current_qty: 48, cost_per_unit: 85, received_at: "2025-01-05", status: "available" },
  { id: "b-2", batch_number: "BATCH-2025-002", product: "Whole Milk", warehouse: "Main WH", received_qty: 40, current_qty: 12, cost_per_unit: 8.5, received_at: "2025-01-18", expires_at: "2025-02-01", status: "available" },
  { id: "b-3", batch_number: "BATCH-2025-003", product: "Vanilla Syrup", warehouse: "Main WH", received_qty: 10, current_qty: 4, cost_per_unit: 45, received_at: "2025-01-10", expires_at: "2025-02-15", status: "expiring_soon" },
  { id: "b-4", batch_number: "BATCH-2024-089", product: "Caramel Syrup", warehouse: "Main WH", received_qty: 12, current_qty: 0, cost_per_unit: 42, received_at: "2024-11-01", status: "depleted" },
  { id: "b-5", batch_number: "BATCH-2025-004", product: "Paper Cups (M)", warehouse: "Main WH", received_qty: 1000, current_qty: 850, cost_per_unit: 0.6, received_at: "2025-01-12", status: "available" },
  { id: "b-6", batch_number: "BATCH-2025-005", product: "Croissants (frozen)", warehouse: "Cold WH", received_qty: 200, current_qty: 120, cost_per_unit: 6, received_at: "2025-01-20", expires_at: "2025-03-01", status: "available" },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  depleted: { label: "Depleted", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  disposed: { label: "Disposed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expiring_soon: { label: "Expiring Soon", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
}

export default function StockBatchesPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = mockBatches.filter(b => {
    const matchSearch = b.product.toLowerCase().includes(search.toLowerCase()) || b.batch_number.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || b.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search batches..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} batches</p>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Batch #", "Product", "Warehouse", "Received", "Current", "Cost/Unit", "Expires", "Status"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(b => {
              const sc = STATUS_CONFIG[b.status]
              return (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{b.batch_number}</code></td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.product}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{b.warehouse}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.received_qty}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{b.current_qty}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.cost_per_unit.toFixed(2)} MAD</td>
                  <td className="px-4 py-3">
                    {b.expires_at ? (
                      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        {b.status === "expiring_soon" && <AlertTriangle className="w-3.5 h-3.5" />}{b.expires_at}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No batches found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
