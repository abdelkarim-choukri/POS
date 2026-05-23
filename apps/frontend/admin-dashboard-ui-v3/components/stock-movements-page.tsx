"use client"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Search, ArrowUp, ArrowDown, ArrowLeftRight, Package } from "lucide-react"

interface StockMovement {
  id: string; date: string; type: "receive" | "consume" | "adjust" | "transfer" | "dispose"
  product: string; warehouse: string; qty_change: number; unit: string
  reference?: string; performed_by: string; notes?: string
}

const mockMovements: StockMovement[] = [
  { id: "m-1", date: "2025-01-21 14:32", type: "receive", product: "Arabica Coffee Beans", warehouse: "Main WH", qty_change: +50, unit: "kg", reference: "PO-2025-0042", performed_by: "Hassan M." },
  { id: "m-2", date: "2025-01-21 12:15", type: "consume", product: "Whole Milk", warehouse: "Main WH", qty_change: -3, unit: "L", reference: "TXN-2025-001234", performed_by: "System" },
  { id: "m-3", date: "2025-01-20 09:00", type: "adjust", product: "Paper Cups (M)", warehouse: "Main WH", qty_change: -50, unit: "pcs", performed_by: "Fatima Z.", notes: "Damaged during delivery" },
  { id: "m-4", date: "2025-01-19 16:45", type: "transfer", product: "Vanilla Syrup", warehouse: "Cold WH → Main WH", qty_change: +5, unit: "L", performed_by: "Ahmed K." },
  { id: "m-5", date: "2025-01-18 11:20", type: "receive", product: "Croissants (frozen)", warehouse: "Cold WH", qty_change: +200, unit: "pcs", reference: "PO-2025-0038", performed_by: "Hassan M." },
  { id: "m-6", date: "2025-01-17 15:00", type: "dispose", product: "Expired Milk", warehouse: "Main WH", qty_change: -8, unit: "L", performed_by: "Fatima Z.", notes: "Past expiry date" },
]

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  receive: { label: "Receive", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <ArrowDown className="w-3.5 h-3.5" /> },
  consume: { label: "Consume", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Package className="w-3.5 h-3.5" /> },
  adjust: { label: "Adjust", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <ArrowUp className="w-3.5 h-3.5" /> },
  transfer: { label: "Transfer", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  dispose: { label: "Dispose", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <ArrowUp className="w-3.5 h-3.5" /> },
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>(mockMovements)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    setLoading(true)
    setError(null)
    apiFetch<{ tables: { rows: any[] }[] }>("/api/business/reports/stock-movements?date_range=last_7days")
      .then(res => {
        const rows = res.tables?.[0]?.rows ?? []
        const mapped: StockMovement[] = rows.map((r: any, i: number) => ({
          id: r.id ?? String(i),
          date: r.movement_date ?? "",
          type: r.movement_type ?? "adjust",
          product: r.product_name ?? "",
          warehouse: r.warehouse_name ?? "",
          qty_change: r.qty_change ?? 0,
          unit: r.unit ?? "",
          reference: r.reference_number,
          performed_by: r.performed_by ?? "",
          notes: r.notes,
        }))
        setMovements(mapped)
      })
      .catch(e => setError(e.message ?? "Failed to load stock movements"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = movements.filter(m => {
    const matchSearch = m.product.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || m.type === typeFilter
    return matchSearch && matchType
  })

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Date", "Type", "Product", "Warehouse", "Change", "Reference", "By"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(m => {
              const tc = TYPE_CONFIG[m.type]
              return (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${tc.color}`}>
                      {tc.icon}{tc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.product}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.warehouse}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${m.qty_change > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                      {m.qty_change > 0 ? "+" : ""}{m.qty_change} {m.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.reference ? <code className="text-xs text-indigo-600 dark:text-indigo-400">{m.reference}</code> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.performed_by}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No movements found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
