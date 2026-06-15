"use client"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, ArrowUp, ArrowDown, ArrowLeftRight, Package, Trash2 } from "lucide-react"
import { inventoryReportsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { StockMovementRow, ReportPeriodType } from "@/lib/merchant/types"

// Real movement_type enum from the report SQL. Direction drives the +/- sign.
type Dir = "in" | "out" | "neutral"
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; dir: Dir }> = {
  receive: { label: "Receive", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <ArrowDown className="w-3.5 h-3.5" />, dir: "in" },
  sale: { label: "Sale", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Package className="w-3.5 h-3.5" />, dir: "out" },
  adjustment: { label: "Adjustment", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <ArrowUp className="w-3.5 h-3.5" />, dir: "neutral" },
  waste: { label: "Waste", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <Trash2 className="w-3.5 h-3.5" />, dir: "out" },
  expiry_disposal: { label: "Expiry Disposal", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <Trash2 className="w-3.5 h-3.5" />, dir: "out" },
  transfer_in: { label: "Transfer In", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <ArrowLeftRight className="w-3.5 h-3.5" />, dir: "in" },
  transfer_out: { label: "Transfer Out", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <ArrowLeftRight className="w-3.5 h-3.5" />, dir: "out" },
}
const fallbackType = (t: string) => ({ label: t, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <Package className="w-3.5 h-3.5" />, dir: "neutral" as Dir })

const PERIODS: { value: ReportPeriodType; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7days", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
]

export default function StockMovementsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [period, setPeriod] = useState<ReportPeriodType>("last_7days")

  const movementsQuery = useQuery({
    queryKey: merchantKeys.inventory.movements(period),
    queryFn: () => inventoryReportsApi.stockMovements({ type: period }),
  })
  const rows = (movementsQuery.data?.tables?.[0]?.rows ?? []) as unknown as StockMovementRow[]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(m => {
      const matchSearch = !q || (m.product_name ?? "").toLowerCase().includes(q) || (m.batch_code ?? "").toLowerCase().includes(q)
      const matchType = typeFilter === "all" || m.movement_type === typeFilter
      return matchSearch && matchType
    })
  }, [rows, search, typeFilter])

  const listError = movementsQuery.isError ? humanizeError(movementsQuery.error, "Failed to load stock movements.") : null

  return (
    <div className="space-y-6">
      {listError && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search product or batch..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={period} onChange={e => setPeriod(e.target.value as ReportPeriodType)}>
          {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-auto">{movementsQuery.isLoading ? "…" : `${filtered.length} movements`}</p>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Date", "Type", "Product", "Batch", "Quantity", "Source", "Notes"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {movementsQuery.isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>}
            {!movementsQuery.isLoading && filtered.map((m, i) => {
              const tc = TYPE_CONFIG[m.movement_type] ?? fallbackType(m.movement_type)
              const sign = tc.dir === "in" ? "+" : tc.dir === "out" ? "-" : ""
              return (
                <tr key={(m.batch_code ?? "") + m.created_at + i} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.created_at ? new Date(m.created_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${tc.color}`}>{tc.icon}{tc.label}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.product_name || "—"}</td>
                  <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{m.batch_code || "—"}</code></td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${tc.dir === "in" ? "text-green-600 dark:text-green-400" : tc.dir === "out" ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {sign}{Math.abs(m.quantity).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.source_origin || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.notes || "—"}</td>
                </tr>
              )
            })}
            {!movementsQuery.isLoading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No movements in this period</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
