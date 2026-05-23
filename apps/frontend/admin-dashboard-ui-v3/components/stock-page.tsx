"use client"
import { useState } from "react"
import { Search, AlertTriangle, Package, TrendingDown, DollarSign } from "lucide-react"

interface StockPosition {
  id: string; product: string; category: string; sku: string
  warehouse: string; qty: number; unit: string; reorder_point: number
  cost_per_unit: number; total_value: number; batch_count: number
  status: "ok" | "low" | "out"
}

const mockStock: StockPosition[] = [
  { id: "s-1", product: "Arabica Coffee Beans", category: "Beverages", sku: "BEV-COF-001", warehouse: "Main WH", qty: 48, unit: "kg", reorder_point: 20, cost_per_unit: 85, total_value: 4080, batch_count: 2, status: "ok" },
  { id: "s-2", product: "Whole Milk", category: "Dairy", sku: "DAI-MLK-001", warehouse: "Main WH", qty: 12, unit: "L", reorder_point: 30, cost_per_unit: 8.5, total_value: 102, batch_count: 1, status: "low" },
  { id: "s-3", product: "Paper Cups (M)", category: "Packaging", sku: "PKG-CUP-M", warehouse: "Main WH", qty: 850, unit: "pcs", reorder_point: 500, cost_per_unit: 0.6, total_value: 510, batch_count: 1, status: "ok" },
  { id: "s-4", product: "Sugar Sachets", category: "Condiments", sku: "CON-SUG-001", warehouse: "Main WH", qty: 0, unit: "pcs", reorder_point: 200, cost_per_unit: 0.5, total_value: 0, batch_count: 0, status: "out" },
  { id: "s-5", product: "Vanilla Syrup", category: "Syrups", sku: "SYR-VAN-001", warehouse: "Main WH", qty: 4, unit: "L", reorder_point: 10, cost_per_unit: 45, total_value: 180, batch_count: 1, status: "low" },
  { id: "s-6", product: "Croissants (frozen)", category: "Bakery", sku: "BAK-CRO-001", warehouse: "Cold WH", qty: 120, unit: "pcs", reorder_point: 50, cost_per_unit: 6, total_value: 720, batch_count: 1, status: "ok" },
]

const STATUS_CONFIG = {
  ok: { label: "OK", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  low: { label: "Low Stock", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  out: { label: "Out of Stock", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

export default function StockPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const [search, setSearch] = useState("")
  const [lowOnly, setLowOnly] = useState(false)
  const [warehouse, setWarehouse] = useState("all")

  const warehouses = ["all", ...Array.from(new Set(mockStock.map(s => s.warehouse)))]
  const filtered = mockStock.filter(s => {
    const matchSearch = s.product.toLowerCase().includes(search.toLowerCase()) || s.sku.toLowerCase().includes(search.toLowerCase())
    const matchWH = warehouse === "all" || s.warehouse === warehouse
    const matchLow = !lowOnly || s.status !== "ok"
    return matchSearch && matchWH && matchLow
  })

  const totalValue = mockStock.reduce((sum, s) => sum + s.total_value, 0)
  const lowCount = mockStock.filter(s => s.status === "low").length
  const outCount = mockStock.filter(s => s.status === "out").length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: mockStock.length.toString(), icon: Package, color: "text-indigo-500" },
          { label: "Low Stock", value: lowCount.toString(), icon: TrendingDown, color: "text-yellow-500" },
          { label: "Out of Stock", value: outCount.toString(), icon: AlertTriangle, color: "text-red-500" },
          { label: "Total Value", value: `${totalValue.toLocaleString()} MAD`, icon: DollarSign, color: "text-green-500" },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-[#1a1a20] flex items-center justify-center flex-shrink-0">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search products or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={warehouse} onChange={e => setWarehouse(e.target.value)}>
          {warehouses.map(w => <option key={w} value={w}>{w === "all" ? "All Warehouses" : w}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" className="accent-indigo-600" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "SKU", "Warehouse", "Qty", "Reorder At", "Value", "Status"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(s => {
              const sc = STATUS_CONFIG[s.status]
              return (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{s.product}</p>
                    <p className="text-xs text-gray-400">{s.category}</p>
                  </td>
                  <td className="px-4 py-3"><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">{s.sku}</code></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.warehouse}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{s.qty} {s.unit}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.reorder_point} {s.unit}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.total_value.toLocaleString()} MAD</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No items match your filters</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
