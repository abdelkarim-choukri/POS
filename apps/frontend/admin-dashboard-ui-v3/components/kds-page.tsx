"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Clock, CheckCircle, AlertCircle, ChefHat, UtensilsCrossed, Timer, Volume2, VolumeX, Settings, X } from "lucide-react"
import { kdsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import type { KdsItem, KdsStatus } from "@/lib/merchant/types"

/**
 * Kitchen Display (KDS) — TanStack Query migration.
 *
 * Ground truth (kds-items.controller / kds.service):
 *   - GET terminal/kds/items → { items: [...] } (the old `res.data` loop threw and
 *     was swallowed by an empty catch → the board was ALWAYS empty). Reachable with a
 *     merchant token (RolesGuard, no @Roles, scoped by business_id).
 *   - Item fields: added_at (NOT created_at), modifiers_json object (NOT a string[]
 *     `modifiers`), added_by (NOT employee_name). kds_status ∈ new|preparing|ready.
 *   - POST items/:id/status enforces fixed transitions new→preparing→ready→served
 *     (no recall) — so order status is DERIVED from item statuses and the local-only
 *     Start/Complete/Recall handlers + the mock orders were removed. Clicking an item
 *     advances it one step; "Start" preps all new items, "Serve All" serves all ready.
 */

const NEXT: Record<KdsStatus | "served", string | null> = { new: "preparing", preparing: "ready", ready: "served", served: null }

type UiItem = { id: string; name: string; quantity: number; modifiers: string[]; notes: string | null; kds_status: KdsStatus }
type UiOrder = { id: string; order_number: string; table_number?: string; order_type: "dine_in" | "takeout"; customer_name?: string; created_at: Date; items: UiItem[]; status: "new" | "in_progress" | "ready" }

function modsToList(m: KdsItem["modifiers_json"]): string[] {
  if (!m) return []
  if (Array.isArray(m)) return m.map(String)
  return Object.values(m).flatMap((v) => (Array.isArray(v) ? v.map(String) : [String(v)])).filter(Boolean)
}

function buildOrders(items: KdsItem[]): UiOrder[] {
  const byOrder = new Map<string, UiOrder>()
  for (const it of items) {
    const key = it.table_session_id ?? it.id
    if (!byOrder.has(key)) {
      byOrder.set(key, {
        id: key,
        order_number: it.table_number ? `T-${it.table_number}` : `#${it.id.slice(-4)}`,
        table_number: it.table_number ? `T-${it.table_number}` : undefined,
        order_type: it.table_number ? "dine_in" : "takeout",
        customer_name: it.added_by ?? undefined,
        created_at: new Date(it.added_at ?? Date.now()),
        items: [],
        status: "new",
      })
    }
    const o = byOrder.get(key)!
    o.items.push({ id: it.id, name: it.product_name ?? "", quantity: it.quantity ?? 1, modifiers: modsToList(it.modifiers_json), notes: it.notes, kds_status: it.kds_status })
    const earliest = new Date(it.added_at ?? Date.now())
    if (earliest < o.created_at) o.created_at = earliest
  }
  for (const o of byOrder.values()) {
    o.status = o.items.every((i) => i.kds_status === "ready") ? "ready" : o.items.every((i) => i.kds_status === "new") ? "new" : "in_progress"
  }
  return Array.from(byOrder.values())
}

function OrderTimer({ startTime, isUrgent }: { startTime: Date; isUrgent?: boolean }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startTime])
  const minutes = Math.floor(elapsed / 60), seconds = elapsed % 60
  const color = minutes >= 15 ? "text-red-500" : minutes >= 10 ? "text-amber-500" : "text-green-500"
  return (
    <div className={`flex items-center gap-1 font-mono text-lg font-bold ${color} ${isUrgent ? "animate-pulse" : ""}`}>
      <Timer className="w-4 h-4" />{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  )
}

function OrderCard({ order, onAdvanceItem, onStartAll, onServeAll }: {
  order: UiOrder
  onAdvanceItem: (itemId: string, status: KdsStatus) => void
  onStartAll: () => void
  onServeAll: () => void
}) {
  const statusColors = { new: "bg-blue-500", in_progress: "bg-amber-500", ready: "bg-green-500" }
  const TypeIcon = order.order_type === "dine_in" ? UtensilsCrossed : ChefHat
  const isOverdue = Date.now() - order.created_at.getTime() > 15 * 60 * 1000
  return (
    <div className={`bg-white dark:bg-[#0F0F12] rounded-xl border-2 border-gray-300 dark:border-[#1F1F23] overflow-hidden ${isOverdue ? "animate-pulse" : ""}`}>
      <div className={`${statusColors[order.status]} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">{order.order_number}</span>
          {order.customer_name && <span className="text-white/80 text-sm">{order.customer_name}</span>}
        </div>
        <TypeIcon className="w-5 h-5 text-white" />
      </div>
      <div className="px-4 py-2 bg-gray-50 dark:bg-[#0F0F12]/50 flex items-center justify-between border-b border-gray-200 dark:border-[#1F1F23]">
        <OrderTimer startTime={order.created_at} isUrgent={isOverdue} />
        <div className="flex items-center gap-2">
          {order.status === "new" && <button onClick={onStartAll} className="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600">Start</button>}
          {order.status === "ready" && <button onClick={onServeAll} className="px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Serve All</button>}
        </div>
      </div>
      <div className="p-4 space-y-2">
        {order.items.map((item) => (
          <button key={item.id} onClick={() => onAdvanceItem(item.id, item.kds_status)}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all hover:scale-[1.02] ${
              item.kds_status === "ready" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : item.kds_status === "preparing" ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              : "bg-gray-50 dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23]"}`}
            title={`Tap to mark ${NEXT[item.kds_status] ?? "served"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2"><span className="text-lg font-bold text-gray-900 dark:text-white">{item.quantity}×</span><span className="font-semibold text-gray-900 dark:text-white">{item.name}</span></div>
              {item.modifiers.length > 0 && <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">{item.modifiers.join(" • ")}</p>}
              {item.notes && <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {item.notes}</p>}
            </div>
            <div>
              {item.kds_status === "ready" && <CheckCircle className="w-6 h-6 text-green-500" />}
              {item.kds_status === "preparing" && <Clock className="w-6 h-6 text-amber-500 animate-spin" style={{ animationDuration: "3s" }} />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function KDSPage() {
  const queryClient = useQueryClient()
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [view, setView] = useState<"all" | "new" | "in_progress" | "ready">("all")
  const [showSettings, setShowSettings] = useState(false)

  const itemsQuery = useQuery({ queryKey: merchantKeys.kds.items(), queryFn: kdsApi.listItems, refetchInterval: 10000 })
  const orders = useMemo(() => buildOrders(itemsQuery.data ?? []), [itemsQuery.data])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.kds.all })
  const bumpMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => kdsApi.bumpItem(id, status),
    onSuccess: invalidate,
  })
  const advanceItem = (itemId: string, status: KdsStatus) => {
    const next = NEXT[status]
    if (next) bumpMutation.mutate({ id: itemId, status: next })
  }
  const bulkBump = async (order: UiOrder, from: KdsStatus, to: string) => {
    await Promise.all(order.items.filter((i) => i.kds_status === from).map((i) => kdsApi.bumpItem(i.id, to)))
    invalidate()
  }

  const filtered = orders.filter((o) => (view === "all" ? true : o.status === view))
  const stats = {
    new: orders.filter((o) => o.status === "new").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    ready: orders.filter((o) => o.status === "ready").length,
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#09090f]">
      <div className="bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4"><ChefHat className="w-8 h-8 text-indigo-500" /><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kitchen Display</h1></div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-[#0F0F12] rounded-lg p-1 mr-4">
              {[{ key: "all", label: "All", count: orders.length }, { key: "new", label: "New", count: stats.new }, { key: "in_progress", label: "Cooking", count: stats.in_progress }, { key: "ready", label: "Ready", count: stats.ready }].map((tab) => (
                <button key={tab.key} onClick={() => setView(tab.key as typeof view)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${view === tab.key ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>
                  {tab.label}<span className={`px-1.5 py-0.5 rounded text-xs font-bold ${view === tab.key ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}>{tab.count}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg ${soundEnabled ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-400 dark:bg-[#0F0F12]"}`}>{soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}</button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg bg-gray-100 dark:bg-[#0F0F12] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a32]"><Settings className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {itemsQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20"><ChefHat className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" /><p className="text-xl text-gray-500 dark:text-gray-400">Loading orders…</p></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ChefHat className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-xl text-gray-500 dark:text-gray-400">No orders in this view</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Orders appear here as they come in from the terminals</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order}
                onAdvanceItem={advanceItem}
                onStartAll={() => bulkBump(order, "new", "preparing")}
                onServeAll={() => bulkBump(order, "ready", "served")} />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="KDS Settings">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div><p className="font-medium text-gray-900 dark:text-white">Sound Alerts</p><p className="text-sm text-gray-500 dark:text-gray-400">Play a sound for new orders</p></div>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? "bg-gray-900 dark:bg-white" : "bg-gray-300 dark:bg-gray-600"}`}><div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${soundEnabled ? "translate-x-6" : "translate-x-0.5"}`} /></button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">The board refreshes automatically every 10 seconds. Tap an item to advance it (new → preparing → ready → served).</p>
        </div>
      </Modal>
    </div>
  )
}
