"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, AlertTriangle, Package, TrendingDown, DollarSign, Layers } from "lucide-react"
import { inventoryReportsApi, warehousesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { StockPositionRow } from "@/lib/merchant/types"

function n(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }

type Status = "ok" | "low" | "out"
const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  ok: { label: "OK", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  low: { label: "Low Stock", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  out: { label: "Out of Stock", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}
const statusOf = (r: StockPositionRow): Status => n(r.total_quantity) <= 0 ? "out" : r.low_stock ? "low" : "ok"

export default function StockPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const [search, setSearch] = useState("")
  const [warehouse, setWarehouse] = useState("all")
  const [lowOnly, setLowOnly] = useState(false)

  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: () => warehousesApi.list() })
  const warehouses = warehousesQuery.data ?? []

  const stockQuery = useQuery({
    queryKey: merchantKeys.inventory.stockPosition(`${warehouse}|${lowOnly}`),
    queryFn: () => inventoryReportsApi.stockPosition({
      warehouse_id: warehouse !== "all" ? warehouse : undefined,
      low_stock_only: lowOnly || undefined,
    }),
  })
  const rows = (stockQuery.data?.tables?.[0]?.rows ?? []) as unknown as StockPositionRow[]
  const summary = stockQuery.data?.summary ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.product_name.toLowerCase().includes(q) || (r.category_name ?? "").toLowerCase().includes(q))
  }, [rows, search])

  // Summary cards: Total Products + Total Value from report summary; low/out derived from rows.
  const totalProducts = n(summary[0]?.value ?? rows.length)
  const totalValue = n(summary[1]?.value ?? rows.reduce((s, r) => s + n(r.total_value), 0))
  const lowCount = rows.filter(r => statusOf(r) === "low").length
  const outCount = rows.filter(r => statusOf(r) === "out").length

  const listError = stockQuery.isError ? humanizeError(stockQuery.error, "Failed to load stock.") : null

  return (
    <div className="space-y-6">
      {listError && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Tracked Products", value: stockQuery.isLoading ? "…" : totalProducts.toLocaleString(), icon: Package, color: "text-indigo-500" },
          { label: "Low Stock", value: stockQuery.isLoading ? "…" : lowCount.toString(), icon: TrendingDown, color: "text-yellow-500" },
          { label: "Out of Stock", value: stockQuery.isLoading ? "…" : outCount.toString(), icon: AlertTriangle, color: "text-red-500" },
          { label: "Total Value", value: stockQuery.isLoading ? "…" : `${totalValue.toLocaleString()} MAD`, icon: DollarSign, color: "text-green-500" },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-[#1a1a20] flex items-center justify-center flex-shrink-0"><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
            <div><p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p><p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search products or category..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={warehouse} onChange={e => setWarehouse(e.target.value)}>
          <option value="all">All Warehouses</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" className="accent-indigo-600" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
        {onNavigate && <button onClick={() => onNavigate("stock-batches")} className="ml-auto text-sm text-indigo-600 dark:text-indigo-400 hover:underline">View batches →</button>}
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "Quantity", "Reorder At", "Value", "Batches", "Oldest Expiry", "Status"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {stockQuery.isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>}
            {!stockQuery.isLoading && filtered.map((r, i) => {
              const st = statusOf(r); const sc = STATUS_CONFIG[st]
              return (
                <tr key={r.product_name + i} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-white">{r.product_name}</p><p className="text-xs text-gray-400">{r.category_name || "—"}</p></td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{n(r.total_quantity).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{n(r.reorder_point).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{n(r.total_value).toLocaleString()} MAD</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400"><span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{n(r.batch_count)}</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.oldest_expiry ? new Date(r.oldest_expiry).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                </tr>
              )
            })}
            {!stockQuery.isLoading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No tracked products match your filters</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
