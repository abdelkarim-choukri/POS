"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Plus, MoreHorizontal, Eye, Truck, X, Package, Send, CheckCircle, Building2 } from "lucide-react"
import { purchaseOrdersApi, vendorsApi, warehousesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { POStatus } from "@/lib/merchant/types"

function num(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }
const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : "—")

const STATUS_CONFIG: Record<POStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400" },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  confirmed: { label: "Confirmed", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  partially_received: { label: "Partial", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  received: { label: "Received", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

export default function PurchaseOrdersPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | POStatus>("all")
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  const listQuery = useQuery({ queryKey: merchantKeys.purchaseOrders.list(statusFilter), queryFn: () => purchaseOrdersApi.list(statusFilter === "all" ? {} : { status: statusFilter }) })
  const orders = listQuery.data ?? []
  const vendorsQuery = useQuery({ queryKey: merchantKeys.vendors.list(), queryFn: () => vendorsApi.list() })
  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: () => warehousesApi.list() })
  const vendorName = useMemo(() => { const m = new Map((vendorsQuery.data ?? []).map(v => [v.id, v.name])); return (id: string | null) => (id ? m.get(id) ?? "—" : "—") }, [vendorsQuery.data])
  const warehouseName = useMemo(() => { const m = new Map((warehousesQuery.data ?? []).map(w => [w.id, w.name])); return (id: string) => m.get(id) ?? "—" }, [warehousesQuery.data])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.purchaseOrders.all })
  const sendMutation = useMutation({ mutationFn: (id: string) => purchaseOrdersApi.send(id), onSuccess: () => { invalidate(); setShowDropdown(null) } })
  const cancelMutation = useMutation({ mutationFn: (id: string) => purchaseOrdersApi.cancel(id), onSuccess: () => { invalidate(); setShowDropdown(null) } })

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return orders
    return orders.filter(po => po.po_number.toLowerCase().includes(q) || vendorName(po.vendor_id).toLowerCase().includes(q))
  }, [orders, searchQuery, vendorName])

  const counts = (s: POStatus) => orders.filter(o => o.status === s).length
  const listError = listQuery.isError ? humanizeError(listQuery.error, "Failed to load purchase orders.") : null
  const actionErr = sendMutation.isError ? humanizeError(sendMutation.error, "Failed to send.") : cancelMutation.isError ? humanizeError(cancelMutation.error, "Failed to cancel.") : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Order management</p>
        </div>
        <button onClick={() => onNavigate?.("purchase-order-create")} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"><Plus className="w-4 h-4" />New PO</button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {([
          { label: "Total", value: orders.length, wrap: "bg-gray-100 dark:bg-[#0F0F12]", icon: Package },
          { label: "Draft", value: counts("draft"), wrap: "bg-gray-100 dark:bg-[#0F0F12]", icon: Package },
          { label: "Sent", value: counts("sent"), wrap: "bg-blue-100 dark:bg-blue-900/30", icon: Send },
          { label: "Confirmed", value: counts("confirmed"), wrap: "bg-indigo-100 dark:bg-indigo-900/30", icon: CheckCircle },
          { label: "Received", value: counts("received"), wrap: "bg-green-100 dark:bg-green-900/30", icon: Truck },
        ]).map(s => (
          <div key={s.label} className={`${s.wrap} rounded-xl p-5`}>
            <s.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{listQuery.isLoading ? "…" : s.value}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {listError && <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{listError}</div>}
      {actionErr && <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{actionErr}</div>}

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search PO # or vendor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
            <option value="all">All Status</option>
            {(Object.keys(STATUS_CONFIG) as POStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>{["PO #", "Vendor", "Warehouse", "Status", "Total TTC", "Ordered", ""].map(h => (
              <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {listQuery.isLoading && <tr><td colSpan={7} className="p-10 text-center text-gray-400">Loading...</td></tr>}
            {!listQuery.isLoading && filtered.map(po => (
              <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 cursor-pointer" onClick={() => onNavigate?.("purchase-order-detail", po.id)}>
                <td className="p-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{po.po_number}</td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{vendorName(po.vendor_id)}</td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-300"><span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-gray-400" />{warehouseName(po.warehouse_id)}</span></td>
                <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[po.status].color}`}>{STATUS_CONFIG[po.status].label}</span></td>
                <td className="p-4 text-sm font-mono text-gray-900 dark:text-white">{num(po.total_ttc).toLocaleString(undefined, { minimumFractionDigits: 2 })} MAD</td>
                <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{fmtDate(po.order_date)}</td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button onClick={() => setShowDropdown(showDropdown === po.id ? null : po.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><MoreHorizontal className="w-4 h-4 text-gray-500" /></button>
                    {showDropdown === po.id && (
                      <>
                        <div className="fixed inset-0" onClick={() => setShowDropdown(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg z-10 py-1 min-w-[150px]">
                          <button onClick={() => { setShowDropdown(null); onNavigate?.("purchase-order-detail", po.id) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]"><Eye className="w-4 h-4" /> View / Manage</button>
                          {po.status === "draft" && <button onClick={() => sendMutation.mutate(po.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]"><Truck className="w-4 h-4" /> Send to Vendor</button>}
                          {po.status !== "cancelled" && po.status !== "received" && <button onClick={() => cancelMutation.mutate(po.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><X className="w-4 h-4" /> Cancel</button>}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!listQuery.isLoading && filtered.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-gray-400">No purchase orders found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
