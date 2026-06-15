"use client"
import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle, Clock, Send, Package } from "lucide-react"
import { purchaseOrdersApi, vendorsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { POStatus, ReceivePOInput, ReceivePOItemInput } from "@/lib/merchant/types"

function num(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }
const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : "—")

const STATUS_STEPS = [
  { key: "draft", label: "Draft", icon: Clock },
  { key: "sent", label: "Sent", icon: Send },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "received", label: "Received", icon: Package },
]
const STATUS_IDX: Record<POStatus, number> = { draft: 0, sent: 1, confirmed: 2, partially_received: 2, received: 3, cancelled: -1 }
const statusPill = (s: POStatus) =>
  s === "received" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : s === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : s === "partially_received" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"

type ReceiveRow = { quantity_received: string; batch_code: string; expires_at: string }

export default function PurchaseOrderDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const queryClient = useQueryClient()
  const [receiveRows, setReceiveRows] = useState<Record<string, ReceiveRow>>({})
  const [receiveMode, setReceiveMode] = useState(false)

  const poQuery = useQuery({ queryKey: merchantKeys.purchaseOrders.detail(id), queryFn: () => purchaseOrdersApi.detail(id), enabled: !!id })
  const po = poQuery.data ?? null
  const vendorsQuery = useQuery({ queryKey: merchantKeys.vendors.list(), queryFn: () => vendorsApi.list() })
  const vendorName = useMemo(() => { const m = new Map((vendorsQuery.data ?? []).map(v => [v.id, v.name])); return (vid: string | null) => (vid ? m.get(vid) ?? "—" : "—") }, [vendorsQuery.data])

  const refresh = () => queryClient.invalidateQueries({ queryKey: merchantKeys.purchaseOrders.detail(id) })
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: merchantKeys.purchaseOrders.all })
  const sendMutation = useMutation({ mutationFn: () => purchaseOrdersApi.send(id), onSuccess: () => { refresh(); invalidateList() } })
  const confirmMutation = useMutation({ mutationFn: () => purchaseOrdersApi.confirm(id), onSuccess: () => { refresh(); invalidateList() } })
  const cancelMutation = useMutation({ mutationFn: () => purchaseOrdersApi.cancel(id), onSuccess: () => { refresh(); invalidateList() } })
  const receiveMutation = useMutation({
    mutationFn: (input: ReceivePOInput) => purchaseOrdersApi.receive(id, input),
    onSuccess: () => { refresh(); invalidateList(); setReceiveMode(false); setReceiveRows({}) },
  })

  const startReceive = () => {
    if (!po) return
    const init: Record<string, ReceiveRow> = {}
    for (const it of po.items ?? []) {
      const remaining = num(it.quantity_ordered) - num(it.quantity_received)
      init[it.id] = { quantity_received: String(remaining > 0 ? remaining : 0), batch_code: "", expires_at: "" }
    }
    setReceiveRows(init)
    setReceiveMode(true)
  }
  const setRow = (itemId: string, patch: Partial<ReceiveRow>) => setReceiveRows(prev => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }))

  const submitReceive = () => {
    if (!po) return
    const received_items: ReceivePOItemInput[] = (po.items ?? [])
      .map(it => {
        const r = receiveRows[it.id]
        if (!r || num(r.quantity_received) <= 0) return null
        const item: ReceivePOItemInput = { po_item_id: it.id, quantity_received: num(r.quantity_received), batch_code: r.batch_code.trim() }
        if (r.expires_at) item.expires_at = r.expires_at
        return item
      })
      .filter((x): x is ReceivePOItemInput => x !== null)
    receiveMutation.mutate({ received_items })
  }

  // All lines being received must have a batch_code (DTO requires it per line).
  const receiveValid = po ? (po.items ?? []).every(it => { const r = receiveRows[it.id]; return !r || num(r.quantity_received) <= 0 || r.batch_code.trim().length > 0 }) && (po.items ?? []).some(it => num(receiveRows[it.id]?.quantity_received) > 0) : false

  if (poQuery.isLoading) return <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 text-sm">Loading purchase order…</div>
  if (poQuery.isError || !po) return <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{poQuery.isError ? humanizeError(poQuery.error, "Failed to load purchase order.") : "Purchase order not found."}</div>

  const currentStep = STATUS_IDX[po.status]
  const balanceDue = po.balance_due ?? (num(po.total_ttc) - num(po.amount_paid))
  const actionErr = [sendMutation, confirmMutation, cancelMutation, receiveMutation].find(m => m.isError)
  const busy = sendMutation.isPending || confirmMutation.isPending || cancelMutation.isPending || receiveMutation.isPending
  const canReceive = po.status === "confirmed" || po.status === "partially_received"

  return (
    <div className="space-y-6">
      {actionErr && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{humanizeError(actionErr.error, "Action failed.")}</div>}

      <div className="flex items-start gap-4">
        {onBack && <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>}
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{po.po_number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusPill(po.status)}`}>{po.status.replace("_", " ")}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vendor: {vendorName(po.vendor_id)} · Ordered: {fmtDate(po.order_date)}{po.expected_delivery_date ? ` · Expected: ${fmtDate(po.expected_delivery_date)}` : ""}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {po.status === "draft" && <button onClick={() => sendMutation.mutate()} disabled={busy} className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors">{sendMutation.isPending ? "Sending…" : "Send to Vendor"}</button>}
          {po.status === "sent" && <button onClick={() => confirmMutation.mutate()} disabled={busy} className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">{confirmMutation.isPending ? "Confirming…" : "Confirm Order"}</button>}
          {canReceive && !receiveMode && <button onClick={startReceive} disabled={busy} className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors">Receive Items</button>}
          {po.status !== "cancelled" && po.status !== "received" && <button onClick={() => { if (window.confirm(`Cancel ${po.po_number}?`)) cancelMutation.mutate() }} disabled={busy} className="px-3 py-1.5 text-sm font-medium bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50">Cancel</button>}
        </div>
      </div>

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
                {idx < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mb-5 mx-1 ${idx < currentStep ? "bg-indigo-500" : "bg-gray-200 dark:bg-[#1F1F23]"}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#1F1F23] flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Order Items</h3>
          {receiveMode && <span className="text-xs text-amber-600 dark:text-amber-400">Enter received quantities + batch codes</span>}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "Ordered", "Received", "Unit Cost", "Line TTC", ...(receiveMode ? ["Receive Qty", "Batch Code", "Expires"] : [])].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {(po.items ?? []).map(item => {
              const r = receiveRows[item.id]
              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.product?.name ?? item.product_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{num(item.quantity_ordered)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{num(item.quantity_received)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{num(item.unit_cost_ht).toFixed(2)} MAD</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{num(item.line_total_ttc).toFixed(2)} MAD</td>
                  {receiveMode && (
                    <>
                      <td className="px-4 py-3"><input type="number" min={0} step="any" value={r?.quantity_received ?? ""} onChange={e => setRow(item.id, { quantity_received: e.target.value })} className="w-20 px-2 py-1 border border-gray-200 dark:border-[#1F1F23] rounded-md bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white text-sm" /></td>
                      <td className="px-4 py-3"><input type="text" placeholder="LOT-001" value={r?.batch_code ?? ""} onChange={e => setRow(item.id, { batch_code: e.target.value })} className="w-28 px-2 py-1 border border-gray-200 dark:border-[#1F1F23] rounded-md bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white text-sm" /></td>
                      <td className="px-4 py-3"><input type="date" value={r?.expires_at ?? ""} onChange={e => setRow(item.id, { expires_at: e.target.value })} className="px-2 py-1 border border-gray-200 dark:border-[#1F1F23] rounded-md bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white text-sm" /></td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {receiveMode && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-[#1F1F23] flex justify-end gap-3">
            <button onClick={() => { setReceiveMode(false); setReceiveRows({}) }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
            <button onClick={submitReceive} disabled={!receiveValid || receiveMutation.isPending} className="px-5 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white">{receiveMutation.isPending ? "Receiving…" : "Confirm Receipt"}</button>
          </div>
        )}

        <div className="px-5 py-4 border-t border-gray-100 dark:border-[#1F1F23] space-y-2 text-sm">
          {[["Subtotal HT", num(po.subtotal_ht)], ["TVA", num(po.total_tva)]].map(([l, v]) => (
            <div key={l as string} className="flex justify-between text-gray-500 dark:text-gray-400"><span>{l}</span><span>{(v as number).toFixed(2)} MAD</span></div>
          ))}
          <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-1 border-t border-gray-100 dark:border-[#1F1F23]"><span>Total TTC</span><span>{num(po.total_ttc).toFixed(2)} MAD</span></div>
          <div className="flex justify-between text-green-600 dark:text-green-400"><span>Paid</span><span>{num(po.amount_paid).toFixed(2)} MAD</span></div>
          <div className="flex justify-between font-semibold text-red-600 dark:text-red-400"><span>Balance Due</span><span>{num(balanceDue).toFixed(2)} MAD</span></div>
        </div>
      </div>

      {po.notes && <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5"><h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h3><p className="text-sm text-gray-600 dark:text-gray-300">{po.notes}</p></div>}
    </div>
  )
}
