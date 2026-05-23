"use client"

import { useState } from "react"
import {
  Bell,
  Search,
  Filter,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  AlertTriangle,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Clock,
  Calendar,
  MoreHorizontal,
  Settings,
  X,
  Eye,
  BellOff,
  Megaphone,
} from "lucide-react"

// Types
interface Notification {
  id: string
  type: "order" | "inventory" | "employee" | "payment" | "system" | "alert"
  priority: "low" | "normal" | "high" | "urgent"
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
  metadata?: Record<string, unknown>
}

// Mock Data
const mockNotifications: Notification[] = [
  { id: "1", type: "order", priority: "high", title: "New Order Received", message: "Order #ORD-2024-089 for Table 5 - Total: 450 MAD", is_read: false, created_at: "2 min ago", link: "/orders/ORD-2024-089" },
  { id: "2", type: "inventory", priority: "urgent", title: "Low Stock Alert", message: "Tomatoes (VEG-001) stock is below minimum threshold. Current: 5kg, Min: 20kg", is_read: false, created_at: "15 min ago" },
  { id: "3", type: "payment", priority: "normal", title: "Payment Received", message: "Payment of 1,250 MAD received for Invoice #INV-2024-045", is_read: false, created_at: "32 min ago" },
  { id: "4", type: "employee", priority: "normal", title: "Shift Started", message: "Ahmed Benali has clocked in for the evening shift", is_read: true, created_at: "1 hour ago" },
  { id: "5", type: "system", priority: "low", title: "Backup Completed", message: "Daily database backup completed successfully", is_read: true, created_at: "2 hours ago" },
  { id: "6", type: "alert", priority: "high", title: "Terminal Offline", message: "POS Terminal #3 at Downtown Branch has gone offline", is_read: false, created_at: "3 hours ago" },
  { id: "7", type: "inventory", priority: "normal", title: "Purchase Order Received", message: "PO-2024-012 from Fresh Farms Produce has been marked as received", is_read: true, created_at: "5 hours ago" },
  { id: "8", type: "order", priority: "normal", title: "Order Cancelled", message: "Order #ORD-2024-087 has been cancelled by customer", is_read: true, created_at: "Yesterday" },
]

// Components
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" | "indigo" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", className = "", onClick, disabled }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string; onClick?: () => void; disabled?: boolean }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
  }
  return <button className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function NotificationIcon({ type, priority }: { type: Notification["type"]; priority: Notification["priority"] }) {
  const icons = {
    order: ShoppingCart,
    inventory: Package,
    employee: Users,
    payment: DollarSign,
    system: Info,
    alert: AlertTriangle,
  }
  const Icon = icons[type]
  
  const priorityColors = {
    low: "bg-gray-100 text-gray-500 dark:bg-[#0F0F12] dark:text-gray-400",
    normal: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    urgent: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  }

  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${priorityColors[priority]}`}>
      <Icon className="w-5 h-5" />
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showSettings, setShowSettings] = useState(false)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])

  const unreadCount = notifications.filter(n => !n.is_read).length
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || n.type === typeFilter
    return matchesSearch && matchesType
  })

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const deleteSelected = () => {
    setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)))
    setSelectedNotifications([])
  }

  const toggleSelect = (id: string) => {
    setSelectedNotifications(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Feed</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{unreadCount} new</span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Stay updated with system alerts and activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </Button>
          <Button variant="secondary" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: "All", count: notifications.length, filter: "all" },
          { label: "Orders", count: notifications.filter(n => n.type === "order").length, filter: "order" },
          { label: "Inventory", count: notifications.filter(n => n.type === "inventory").length, filter: "inventory" },
          { label: "Alerts", count: notifications.filter(n => n.type === "alert").length, filter: "alert" },
          { label: "System", count: notifications.filter(n => n.type === "system").length, filter: "system" },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => setTypeFilter(stat.filter)}
            className={`rounded-xl p-4 text-center transition-colors ${
              typeFilter === stat.filter
                ? "bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500"
                : "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] hover:border-indigo-300"
            }`}
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
          </div>
          {selectedNotifications.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{selectedNotifications.length} selected</span>
              <Button variant="danger" onClick={deleteSelected}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        {/* Select All */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/50">
          <input
            type="checkbox"
            checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
            onChange={selectAll}
            className="w-4 h-4 rounded border-gray-300 dark:border-[#2a2a33] text-indigo-500 focus:ring-gray-900 dark:focus:ring-gray-300"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Select All</span>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No notifications found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 ${
                  !notification.is_read ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedNotifications.includes(notification.id)}
                  onChange={() => toggleSelect(notification.id)}
                  className="w-4 h-4 mt-3 rounded border-gray-300 dark:border-[#2a2a33] text-indigo-500 focus:ring-gray-900 dark:focus:ring-gray-300"
                />
                <NotificationIcon type={notification.type} priority={notification.priority} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${!notification.is_read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                        )}
                        {notification.priority === "urgent" && <Badge color="red">Urgent</Badge>}
                        {notification.priority === "high" && <Badge color="yellow">High</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {notification.created_at}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {notification.link && (
                        <button
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Notification Settings">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Order Notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">New orders, cancellations</p>
              </div>
            </div>
            <button className="w-12 h-6 bg-indigo-600 rounded-full">
              <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-6" />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Inventory Alerts</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Low stock, received orders</p>
              </div>
            </div>
            <button className="w-12 h-6 bg-indigo-600 rounded-full">
              <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-6" />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">System Alerts</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Critical system notifications</p>
              </div>
            </div>
            <button className="w-12 h-6 bg-indigo-600 rounded-full">
              <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-6" />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Sound Notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Play sound for new notifications</p>
              </div>
            </div>
            <button className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full">
              <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-0.5" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}



