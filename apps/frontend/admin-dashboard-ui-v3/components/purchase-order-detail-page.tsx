"use client"
import { useState, useEffect } from "react"
import { ArrowLeft, CheckCircle, Clock, Truck, Send, Package } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface POItem {
  id: string
  product: string
  qty: number
  unit_cost: number
  line_total: number
  received?: number
}

interface PODetail {
  id: string; number: string; vendor: string; status: "draft" | "sent" | "confirmed" | "received" | "cancelled"
  created_at: string; expected_delivery?: string; notes?: string
  subtotal_ht: number; tva_amount: number; total_ttc: number; amount_paid: number; balance_due?: number
  items: POItem[]
}

const STATUS_STEPS = [
  { key: "draft", label: "Draft", icon: Clock },
  { key: "sent", label: "Sent", icon: Send },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "received", label: "Received", icon: Package },
]
const STATUS_IDX: Record<string, number> = { draft: 0, sent: 1, confirmed: 2, received: 3, cancelled: -1 }

export default function PurchaseOrderDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  // TODO: if no id is passed from a parent, swap the fallback below for a real id source (URL param, etc.)
  const poId = id ?? "DEMO-PO-ID"

  const [po, setPo] = useState<PODetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Per-item receive quantities keyed by PO item id
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<PODetail>(`/api/business/purchase-orders/${poId}`)
      setPo(data)
      // Initialise receive qty inputs from ordered qty
      const initial: Record<string, number> = {}
      for (const item of data.items) {
        initial[item.id] = item.qty
      }
      setReceiveQtys(initial)
    } catch (e: any) {
      setError(e.message ?? "Failed to load purchase order")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [poId])

  async function handleSend() {
    if (!po) return
    setActionLoading(true)
    setError(null)
    try {
      await apiFetch(`/api/business/purchase-orders/${po.id}/send`, { method: "POST" })
      await load()
    } catch (e: any) {
      setError(e.message ?? "Failed to send purchase order")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleConfirm() {
    if (!po) return
    setActionLoading(true)
    setError(null)
    try {
      await apiFetch(`/api/business/purchase-orders/${po.id}/confirm`, { method: "POST" })
      await load()
    } catch (e: any) {
      setError(e.message ?? "Failed to confirm purchase order")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReceive() {
    if (!po) return
    setActionLoading(true)
    setError(null)
    try {
      const items = po.items.map(item => ({
        id: item.id,
        quantity_received: receiveQtys[item.id] ?? 0,
      }))
      await apiFetch(`/api/business/purchase-orders/${po.id}/receive`, {
        method: "POST",
        body: JSON.stringify({ items }),
        headers: { "Content-Type": "application/json" },
      })
      await load()
    } catch (e: any) {
      setError(e.message ?? "Failed to receive purchase order")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!po) return
    if (!window.confirm(`Cancel purchase order ${po.number}? This cannot be undone.`)) return
    setActionLoading(true)
    setError(null)
    try {
      await apiFetch(`/api/business/purchase-orders/${po.id}/cancel`, { method: "POST" })
      await load()
    } catch (e: any) {
      setError(e.message ?? "Failed to cancel purchase order")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 text-sm">
        Loading purchase order…
      </div>
    )
  }

  if (!po) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
        {error ?? "Purchase order not found."}
      </div>
    )
  }

  const currentStep = STATUS_IDX[po.status]
  const balanceDue = po.balance_due ?? (po.total_ttc - po.amount_paid)

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>}
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{po.number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${po.status === "received" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : po.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"}`}>
              {po.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vendor: {po.vendor} · Created: {po.created_at}{po.expected_delivery ? ` · Expected: ${po.expected_delivery}` : ""}</p>
        </div>

        {/* Action toolbar — shows the appropriate next-step button for the current status */}
        <div className="flex gap-2 flex-wrap">
          {po.status === "draft" && (
            <button
              onClick={handleSend}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {actionLoading ? "Sending…" : "Send to Vendor"}
            </button>
          )}
          {po.status === "sent" && (
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {actionLoading ? "Confirming…" : "Confirm Order"}
            </button>
          )}
          {po.status === "confirmed" && (
            <button
              onClick={handleReceive}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {actionLoading ? "Receiving…" : "Mark Received"}
            </button>
          )}
          {po.status !== "cancelled" && po.status !== "received" && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm font-medium bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      {po.status !== "cancelled" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, idx) => (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${idx <= currentStep ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12]"}`}>
                    <step.icon className={`w-4 h-4 ${idx <= currentStep ? "text-indigo-600 dark:text-indigo-400" : "text-gray-300 dark:text-gray-600"}`} />
                  </div>
                  <span className={`text-xs font-medium ${idx <= currentStep ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-600"}`}>{step.label}</span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-5 mx-1 ${idx < currentStep ? "bg-indigo-500" : "bg-gray-200 dark:bg-[#1F1F23]"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#1F1F23]">
          <h3 className="font-semibold text-gray-900 dark:text-white">Order Items</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>
              {["Product", "Qty", "Unit Cost", "Line Total", ...(po.status === "confirmed" ? ["Qty to Receive"] : [])].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {po.items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.product}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.qty}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.unit_cost.toFixed(2)} MAD</td>
                <td className={`px-4 py-3 font-semibold text-gray-900 dark:text-white ${po.status !== "confirmed" ? "text-right" : ""}`}>{item.line_total.toFixed(2)} MAD</td>
                {po.status === "confirmed" && (
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      max={item.qty}
                      value={receiveQtys[item.id] ?? item.qty}
                      onChange={e => setReceiveQtys(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      className="w-20 px-2 py-1 text-right border border-gray-200 dark:border-[#1F1F23] rounded-md bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-4 border-t border-gray-100 dark:border-[#1F1F23] space-y-2 text-sm">
          {[["Subtotal HT", po.subtotal_ht], ["TVA", po.tva_amount]].map(([l, v]) => (
            <div key={l as string} className="flex justify-between text-gray-500 dark:text-gray-400"><span>{l}</span><span>{(v as number).toFixed(2)} MAD</span></div>
          ))}
          <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
            <span>Total TTC</span><span>{po.total_ttc.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-between text-green-600 dark:text-green-400"><span>Paid</span><span>{po.amount_paid.toFixed(2)} MAD</span></div>
          <div className="flex justify-between font-semibold text-red-600 dark:text-red-400"><span>Balance Due</span><span>{balanceDue.toFixed(2)} MAD</span></div>
        </div>
      </div>
    </div>
  )
}
