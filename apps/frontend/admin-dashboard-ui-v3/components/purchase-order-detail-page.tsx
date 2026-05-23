"use client"
import { useState } from "react"
import { ArrowLeft, CheckCircle, Clock, Truck, Send, Package } from "lucide-react"

interface PODetail {
  id: string; number: string; vendor: string; status: "draft" | "sent" | "confirmed" | "received" | "cancelled"
  created_at: string; expected_delivery?: string; notes?: string
  subtotal_ht: number; tva_amount: number; total_ttc: number; amount_paid: number
  items: { id: string; product: string; qty: number; unit_cost: number; line_total: number; received?: number }[]
}

const mockPO: PODetail = {
  id: "po-1", number: "PO-2025-0042", vendor: "Al Watan Supplies", status: "confirmed",
  created_at: "2025-01-19", expected_delivery: "2025-01-25", notes: "Urgent order for weekend event",
  subtotal_ht: 4250, tva_amount: 850, total_ttc: 5100, amount_paid: 2000,
  items: [
    { id: "pi-1", product: "Arabica Coffee Beans", qty: 50, unit_cost: 85, line_total: 4250 },
  ],
}

const STATUS_STEPS = [
  { key: "draft", label: "Draft", icon: Clock },
  { key: "sent", label: "Sent", icon: Send },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "received", label: "Received", icon: Package },
]
const STATUS_IDX: Record<string, number> = { draft: 0, sent: 1, confirmed: 2, received: 3, cancelled: -1 }

export default function PurchaseOrderDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const po = mockPO
  const currentStep = STATUS_IDX[po.status]

  return (
    <div className="space-y-6">
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
        <div className="flex gap-2">
          {po.status === "draft" && <button className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Send to Vendor</button>}
          {po.status === "confirmed" && <button className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Mark Received</button>}
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
            <tr>{["Product", "Qty", "Unit Cost", "Line Total"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {po.items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.product}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.qty}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.unit_cost.toFixed(2)} MAD</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{item.line_total.toFixed(2)} MAD</td>
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
          <div className="flex justify-between font-semibold text-red-600 dark:text-red-400"><span>Balance Due</span><span>{(po.total_ttc - po.amount_paid).toFixed(2)} MAD</span></div>
        </div>
      </div>
    </div>
  )
}
