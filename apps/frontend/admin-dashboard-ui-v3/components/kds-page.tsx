"use client"

import { useState, useEffect, useRef } from "react"
import { apiFetch } from "@/lib/api"
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Flame,
  ChefHat,
  UtensilsCrossed,
  Timer,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Monitor,
  RotateCcw,
  Bell,
  X,
} from "lucide-react"

// Types
interface OrderItem {
  id: string
  name: string
  quantity: number
  modifiers: string[]
  notes?: string
  status: "pending" | "preparing" | "ready"
  prepared_at?: Date
}

interface KitchenOrder {
  id: string
  order_number: string
  table_number?: string
  order_type: "dine_in" | "takeout" | "delivery"
  items: OrderItem[]
  status: "new" | "in_progress" | "ready" | "completed" | "recalled"
  priority: "normal" | "rush" | "vip"
  created_at: Date
  started_at?: Date
  completed_at?: Date
  customer_name?: string
}

// Mock Data
const generateMockOrders = (): KitchenOrder[] => {
  const now = new Date()
  return [
    {
      id: "1", order_number: "ORD-001", table_number: "T-05", order_type: "dine_in", priority: "rush",
      status: "in_progress", created_at: new Date(now.getTime() - 8 * 60000), started_at: new Date(now.getTime() - 6 * 60000),
      items: [
        { id: "1", name: "Margherita Pizza", quantity: 1, modifiers: ["Extra Cheese"], status: "preparing" },
        { id: "2", name: "Caesar Salad", quantity: 2, modifiers: ["No Croutons"], status: "ready" },
        { id: "3", name: "Grilled Salmon", quantity: 1, modifiers: ["Medium Rare", "Extra Sauce"], notes: "Allergy: Nuts", status: "pending" },
      ]
    },
    {
      id: "2", order_number: "ORD-002", order_type: "takeout", priority: "normal",
      status: "new", created_at: new Date(now.getTime() - 3 * 60000), customer_name: "Ahmed K.",
      items: [
        { id: "4", name: "Chicken Burger", quantity: 2, modifiers: ["No Onions"], status: "pending" },
        { id: "5", name: "French Fries", quantity: 2, modifiers: ["Large"], status: "pending" },
        { id: "6", name: "Coca Cola", quantity: 2, modifiers: [], status: "pending" },
      ]
    },
    {
      id: "3", order_number: "ORD-003", table_number: "T-12", order_type: "dine_in", priority: "vip",
      status: "in_progress", created_at: new Date(now.getTime() - 15 * 60000), started_at: new Date(now.getTime() - 12 * 60000),
      items: [
        { id: "7", name: "Beef Steak", quantity: 1, modifiers: ["Well Done"], status: "preparing" },
        { id: "8", name: "Lobster Risotto", quantity: 1, modifiers: [], status: "preparing" },
        { id: "9", name: "House Wine", quantity: 2, modifiers: ["Red"], status: "ready" },
      ]
    },
    {
      id: "4", order_number: "ORD-004", order_type: "delivery", priority: "normal",
      status: "ready", created_at: new Date(now.getTime() - 20 * 60000), started_at: new Date(now.getTime() - 18 * 60000),
      completed_at: new Date(now.getTime() - 2 * 60000), customer_name: "Sara M.",
      items: [
        { id: "10", name: "Pasta Carbonara", quantity: 1, modifiers: [], status: "ready" },
        { id: "11", name: "Garlic Bread", quantity: 1, modifiers: [], status: "ready" },
      ]
    },
    {
      id: "5", order_number: "ORD-005", table_number: "T-03", order_type: "dine_in", priority: "normal",
      status: "new", created_at: new Date(now.getTime() - 1 * 60000),
      items: [
        { id: "12", name: "Fish & Chips", quantity: 1, modifiers: ["Extra Tartar Sauce"], status: "pending" },
      ]
    },
  ]
}

// Components
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "indigo" | "purple" | "gray" }) {
  const colors = {
    green: "bg-green-500 text-white",
    red: "bg-red-500 text-white",
    blue: "bg-blue-500 text-white",
    yellow: "bg-amber-500 text-white",
    indigo: "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
    purple: "bg-purple-500 text-white",
    gray: "bg-gray-500 text-white",
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${colors[color]}`}>{children}</span>
}

function OrderTimer({ startTime, isUrgent }: { startTime: Date; isUrgent?: boolean }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  const getColor = () => {
    if (minutes >= 15) return "text-red-500"
    if (minutes >= 10) return "text-amber-500"
    return "text-green-500"
  }

  return (
    <div className={`flex items-center gap-1 font-mono text-lg font-bold ${getColor()} ${isUrgent ? "animate-pulse" : ""}`}>
      <Timer className="w-4 h-4" />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  )
}

function OrderCard({ order, onStart, onComplete, onRecall, onBump }: {
  order: KitchenOrder
  onStart: () => void
  onComplete: () => void
  onRecall: () => void
  onBump: (itemId: string) => void
}) {
  const priorityColors = {
    normal: "border-gray-300 dark:border-[#1F1F23]",
    rush: "border-amber-500 ring-2 ring-amber-500/30",
    vip: "border-purple-500 ring-2 ring-purple-500/30",
  }

  const statusColors = {
    new: "bg-blue-500",
    in_progress: "bg-amber-500",
    ready: "bg-green-500",
    completed: "bg-gray-500",
    recalled: "bg-red-500",
  }

  const orderTypeIcons = {
    dine_in: UtensilsCrossed,
    takeout: ChefHat,
    delivery: Clock,
  }

  const TypeIcon = orderTypeIcons[order.order_type]

  const allItemsReady = order.items.every(item => item.status === "ready")
  const isOverdue = order.created_at && (Date.now() - order.created_at.getTime()) > 15 * 60 * 1000

  return (
    <div className={`bg-white dark:bg-[#0F0F12] rounded-xl border-2 ${priorityColors[order.priority]} overflow-hidden ${isOverdue ? "animate-pulse" : ""}`}>
      {/* Header */}
      <div className={`${statusColors[order.status]} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">{order.order_number}</span>
          {order.table_number && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-white text-sm font-medium">{order.table_number}</span>
          )}
          {order.customer_name && (
            <span className="text-white/80 text-sm">{order.customer_name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TypeIcon className="w-5 h-5 text-white" />
          {order.priority === "rush" && <Flame className="w-5 h-5 text-white animate-bounce" />}
          {order.priority === "vip" && <Badge color="purple">VIP</Badge>}
        </div>
      </div>

      {/* Timer */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-[#0F0F12]/50 flex items-center justify-between border-b border-gray-200 dark:border-[#1F1F23]">
        <OrderTimer startTime={order.created_at} isUrgent={isOverdue} />
        <div className="flex items-center gap-2">
          {order.status === "new" && (
            <button onClick={onStart} className="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600">
              Start
            </button>
          )}
          {order.status === "in_progress" && allItemsReady && (
            <button onClick={onComplete} className="px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Ready
            </button>
          )}
          {order.status === "ready" && (
            <button onClick={onRecall} className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 flex items-center gap-1">
              <RotateCcw className="w-4 h-4" /> Recall
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {order.items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${
              item.status === "ready"
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : item.status === "preparing"
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                : "bg-gray-50 dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23]"
            }`}
            onClick={() => order.status === "in_progress" && onBump(item.id)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{item.quantity}×</span>
                <span className="font-semibold text-gray-900 dark:text-white">{item.name}</span>
              </div>
              {item.modifiers.length > 0 && (
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                  {item.modifiers.join(" • ")}
                </p>
              )}
              {item.notes && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {item.notes}
                </p>
              )}
            </div>
            <div>
              {item.status === "ready" && <CheckCircle className="w-6 h-6 text-green-500" />}
              {item.status === "preparing" && <Clock className="w-6 h-6 text-amber-500 animate-spin" style={{ animationDuration: "3s" }} />}
            </div>
          </div>
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
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [view, setView] = useState<"all" | "new" | "in_progress" | "ready">("all")
  const [showSettings, setShowSettings] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchKdsItems = async () => {
    try {
      const res = await apiFetch<{ data: any[] }>("/api/terminal/kds/items")
      const itemsByOrder = new Map<string, KitchenOrder>()
      for (const item of res.data) {
        const orderId = item.table_session_id ?? item.transaction_id ?? item.id
        if (!itemsByOrder.has(orderId)) {
          itemsByOrder.set(orderId, {
            id: orderId,
            order_number: item.table_number ? `T-${item.table_number}` : `ORD-${orderId.slice(-4)}`,
            table_number: item.table_number ? `T-${item.table_number}` : undefined,
            order_type: item.table_number ? "dine_in" : "takeout",
            items: [],
            status: "new",
            priority: "normal",
            created_at: new Date(item.created_at ?? Date.now()),
            customer_name: item.employee_name,
          })
        }
        const order = itemsByOrder.get(orderId)!
        const kdsStatus = item.kds_status ?? "new"
        const itemStatus: OrderItem["status"] = kdsStatus === "ready" || kdsStatus === "served" ? "ready" : kdsStatus === "preparing" ? "preparing" : "pending"
        order.items.push({
          id: item.id,
          name: item.product_name ?? "",
          quantity: item.quantity ?? 1,
          modifiers: item.modifiers ?? [],
          notes: item.notes,
          status: itemStatus,
        })
        if (kdsStatus === "preparing" && order.status === "new") order.status = "in_progress"
        if (order.items.every(i => i.status === "ready")) order.status = "ready"
      }
      setOrders(Array.from(itemsByOrder.values()))
    } catch {}
  }

  useEffect(() => {
    fetchKdsItems()
    pollRef.current = setInterval(fetchKdsItems, 10000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const handleStart = (orderId: string) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: "in_progress" as const, started_at: new Date() } : o
    ))
  }

  const handleComplete = (orderId: string) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: "ready" as const, completed_at: new Date() } : o
    ))
  }

  const handleRecall = (orderId: string) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: "recalled" as const } : o
    ))
  }

  const handleBumpItem = async (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId)
    const item = order?.items.find(i => i.id === itemId)
    if (!item) return
    const nextStatus = item.status === "pending" ? "preparing" : item.status === "preparing" ? "ready" : null
    if (!nextStatus) return
    try {
      await apiFetch(`/api/terminal/kds/items/${itemId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: nextStatus }),
      })
      await fetchKdsItems()
    } catch {
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o
        const updatedItems = o.items.map(i => {
          if (i.id !== itemId) return i
          if (i.status === "pending") return { ...i, status: "preparing" as const }
          if (i.status === "preparing") return { ...i, status: "ready" as const, prepared_at: new Date() }
          return i
        })
        return { ...o, items: updatedItems }
      }))
    }
  }

  const filteredOrders = orders.filter(o => {
    if (view === "all") return o.status !== "completed"
    return o.status === view
  })

  const stats = {
    new: orders.filter(o => o.status === "new").length,
    in_progress: orders.filter(o => o.status === "in_progress").length,
    ready: orders.filter(o => o.status === "ready").length,
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#09090f]">
      {/* Header */}
      <div className="bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ChefHat className="w-8 h-8 text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kitchen Display</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tabs */}
            <div className="flex bg-gray-100 dark:bg-[#0F0F12] rounded-lg p-1 mr-4">
              {[
                { key: "all", label: "All", count: stats.new + stats.in_progress + stats.ready },
                { key: "new", label: "New", count: stats.new },
                { key: "in_progress", label: "Cooking", count: stats.in_progress },
                { key: "ready", label: "Ready", count: stats.ready },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setView(tab.key as typeof view)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    view === tab.key
                      ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                    view === tab.key ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg ${soundEnabled ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-400 dark:bg-[#0F0F12]"}`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-[#0F0F12] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a32]"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button className="p-2 rounded-lg bg-gray-100 dark:bg-[#0F0F12] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a32]">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Grid */}
      <div className="p-6">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ChefHat className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-xl text-gray-500 dark:text-gray-400">No orders in this view</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Orders will appear here when they come in</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onStart={() => handleStart(order.id)}
                onComplete={() => handleComplete(order.id)}
                onRecall={() => handleRecall(order.id)}
                onBump={(itemId) => handleBumpItem(order.id, itemId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="KDS Settings">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Sound Alerts</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Play sound for new orders</p>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? "bg-gray-900 dark:bg-white" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${soundEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Auto Bump Timer</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Minutes before warning</p>
            </div>
            <select className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-1 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white text-sm">
              <option value="10">10 min</option>
              <option value="15">15 min</option>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Display Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Screen layout</p>
            </div>
            <select className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-1 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white text-sm">
              <option value="grid">Grid View</option>
              <option value="list">List View</option>
              <option value="kanban">Kanban</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}



