"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  X,
  ArrowRight,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Eye,
  Pencil,
  Building2,
  MoreHorizontal,
} from "lucide-react"

// Types
interface TransferItem {
  id: string
  product_name: string
  sku: string
  quantity: number
  received_quantity?: number
}

interface StockTransfer {
  id: string
  transfer_number: string
  from_warehouse_id: string
  from_warehouse_name: string
  to_warehouse_id: string
  to_warehouse_name: string
  status: "draft" | "in_transit" | "partial" | "completed" | "cancelled"
  items: TransferItem[]
  notes: string
  created_at: string
  created_by: string
  shipped_at?: string
  completed_at?: string
}

// Mock Data
const mockTransfers: StockTransfer[] = [
  {
    id: "1", transfer_number: "TRF-2024001", from_warehouse_id: "1", from_warehouse_name: "Main Warehouse",
    to_warehouse_id: "2", to_warehouse_name: "Kitchen Storage", status: "completed",
    items: [
      { id: "1", product_name: "Tomatoes (kg)", sku: "VEG-001", quantity: 20, received_quantity: 20 },
      { id: "2", product_name: "Onions (kg)", sku: "VEG-003", quantity: 15, received_quantity: 15 },
    ],
    notes: "Weekly kitchen restock", created_at: "2024-01-15", created_by: "Ahmed Benali", shipped_at: "2024-01-15", completed_at: "2024-01-15"
  },
  {
    id: "2", transfer_number: "TRF-2024002", from_warehouse_id: "1", from_warehouse_name: "Main Warehouse",
    to_warehouse_id: "3", to_warehouse_name: "Branch Storage", status: "in_transit",
    items: [
      { id: "3", product_name: "Flour (25kg bag)", sku: "BAK-001", quantity: 5 },
      { id: "4", product_name: "Sugar (10kg bag)", sku: "BAK-002", quantity: 3 },
    ],
    notes: "Branch restocking", created_at: "2024-01-18", created_by: "Sara Idrissi", shipped_at: "2024-01-19"
  },
  {
    id: "3", transfer_number: "TRF-2024003", from_warehouse_id: "2", from_warehouse_name: "Kitchen Storage",
    to_warehouse_id: "1", to_warehouse_name: "Main Warehouse", status: "draft",
    items: [
      { id: "5", product_name: "Olive Oil (5L)", sku: "OIL-001", quantity: 10 },
    ],
    notes: "Excess stock return", created_at: "2024-01-20", created_by: "Karim Tazi"
  },
]

const mockWarehouses = [
  { id: "1", name: "Main Warehouse" },
  { id: "2", name: "Kitchen Storage" },
  { id: "3", name: "Branch Storage" },
]

// Components
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[color]}`}>{children}</span>
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

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  if (!isOpen) return null
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function SlidePanel({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[550px] bg-white dark:bg-[#0F0F12] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: StockTransfer["status"] }) {
  const config = {
    draft: { color: "gray" as const, icon: Package, label: "Draft" },
    in_transit: { color: "blue" as const, icon: Truck, label: "In Transit" },
    partial: { color: "yellow" as const, icon: Clock, label: "Partial" },
    completed: { color: "green" as const, icon: CheckCircle, label: "Completed" },
    cancelled: { color: "red" as const, icon: X, label: "Cancelled" },
  }
  const { color, icon: Icon, label } = config[status]
  return <Badge color={color}><Icon className="w-3 h-3" />{label}</Badge>
}

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>(mockTransfers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  // Create form state
  const [newTransfer, setNewTransfer] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
    notes: "",
    items: [] as { product_id: string; quantity: number }[],
  })

  useEffect(() => {
    setLoading(true)
    setError(null)
    apiFetch<{ data: any[] }>("/api/business/stock-transfers?page=1&limit=20")
      .then(res => {
        const mapped: StockTransfer[] = res.data.map((t: any) => ({
          id: t.id,
          transfer_number: t.transfer_number,
          from_warehouse_id: t.from_warehouse?.id ?? "",
          from_warehouse_name: t.from_warehouse?.name ?? "",
          to_warehouse_id: t.to_warehouse?.id ?? "",
          to_warehouse_name: t.to_warehouse?.name ?? "",
          status: t.status,
          items: t.items ?? [],
          notes: t.notes ?? "",
          created_at: t.created_at ?? "",
          created_by: t.created_by ?? "",
          shipped_at: t.shipped_at,
          completed_at: t.completed_at,
        }))
        setTransfers(mapped)
      })
      .catch(e => setError(e.message ?? "Failed to load transfers"))
      .finally(() => setLoading(false))
  }, [])

  const filteredTransfers = transfers.filter(t => {
    const matchesSearch = t.transfer_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.from_warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.to_warehouse_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleView = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer)
    setShowDetailPanel(true)
    setShowDropdown(null)
  }

  const addItem = () => {
    setNewTransfer(prev => ({
      ...prev,
      items: [...prev.items, { product_id: "", quantity: 1 }]
    }))
  }

  const removeItem = (index: number) => {
    setNewTransfer(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div>
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Transfers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Transfer inventory between warehouses</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Transfer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Transfers", count: transfers.length, color: "bg-gray-100 dark:bg-[#0F0F12]", icon: Package },
          { label: "In Transit", count: transfers.filter(t => t.status === "in_transit").length, color: "bg-blue-100 dark:bg-blue-900/30", icon: Truck },
          { label: "Completed", count: transfers.filter(t => t.status === "completed").length, color: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle },
          { label: "Draft", count: transfers.filter(t => t.status === "draft").length, color: "bg-amber-100 dark:bg-amber-900/30", icon: Clock },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-5`}>
            <stat.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transfers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_transit">In Transit</option>
            <option value="partial">Partial</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Transfer #</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Route</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Created</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredTransfers.map((transfer) => (
              <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                <td className="p-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{transfer.transfer_number}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{transfer.from_warehouse_name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-indigo-500" />
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{transfer.to_warehouse_name}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-900 dark:text-white">{transfer.items.length} items</td>
                <td className="p-4"><StatusBadge status={transfer.status} /></td>
                <td className="p-4">
                  <div className="text-sm">
                    <p className="text-gray-900 dark:text-white">{transfer.created_at}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{transfer.created_by}</p>
                  </div>
                </td>
                <td className="p-4">
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(showDropdown === transfer.id ? null : transfer.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>
                    {showDropdown === transfer.id && (
                      <>
                        <div className="fixed inset-0" onClick={() => setShowDropdown(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                          <button onClick={() => handleView(transfer)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]">
                            <Eye className="w-4 h-4" /> View
                          </button>
                          {transfer.status === "draft" && (
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]">
                              <Pencil className="w-4 h-4" /> Edit
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Stock Transfer" size="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Warehouse</label>
              <select
                value={newTransfer.from_warehouse_id}
                onChange={(e) => setNewTransfer(prev => ({ ...prev, from_warehouse_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="">Select source</option>
                {mockWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <ArrowRight className="w-6 h-6 text-indigo-500 mt-6" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Warehouse</label>
              <select
                value={newTransfer.to_warehouse_id}
                onChange={(e) => setNewTransfer(prev => ({ ...prev, to_warehouse_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="">Select destination</option>
                {mockWarehouses.filter(w => w.id !== newTransfer.from_warehouse_id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Items to Transfer</label>
              <Button variant="ghost" onClick={addItem}><Plus className="w-4 h-4" /> Add Item</Button>
            </div>
            <div className="border border-gray-200 dark:border-[#1F1F23] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Product</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">Available</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-32">Quantity</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {newTransfer.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No items added. Click "Add Item" to start.
                      </td>
                    </tr>
                  ) : (
                    newTransfer.items.map((item, index) => (
                      <tr key={index}>
                        <td className="p-3">
                          <select className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                            <option value="">Select product</option>
                            <option value="1">Tomatoes (kg)</option>
                            <option value="2">Onions (kg)</option>
                            <option value="3">Flour (25kg bag)</option>
                          </select>
                        </td>
                        <td className="p-3 text-gray-500 dark:text-gray-400">50</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="p-3">
                          <button onClick={() => removeItem(index)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={newTransfer.notes}
              onChange={(e) => setNewTransfer(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-20 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="secondary" className="flex-1">Save as Draft</Button>
            <Button variant="primary" className="flex-1"><Truck className="w-4 h-4" /> Create & Ship</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Panel */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title="Transfer Details">
        {selectedTransfer && (
          <div className="space-y-6">
            <div className="p-5 border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-xl font-bold text-gray-900 dark:text-white">{selectedTransfer.transfer_number}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created {selectedTransfer.created_at} by {selectedTransfer.created_by}</p>
                </div>
                <StatusBadge status={selectedTransfer.status} />
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-800/50 dark:to-indigo-900/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedTransfer.from_warehouse_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Source</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-4">
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-gray-300 to-indigo-500"></div>
                    <Truck className="w-6 h-6 text-indigo-500 mx-2" />
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-indigo-500 to-gray-300"></div>
                  </div>
                  <div className="text-center">
                    <Building2 className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedTransfer.to_warehouse_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Destination</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Transfer Items ({selectedTransfer.items.length})</h4>
              <div className="space-y-2">
                {selectedTransfer.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">{item.quantity} units</p>
                      {item.received_quantity !== undefined && (
                        <p className="text-xs text-green-600 dark:text-green-400">Received: {item.received_quantity}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTransfer.notes && (
              <div className="px-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">{selectedTransfer.notes}</p>
              </div>
            )}

            <div className="px-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Timeline</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Created</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedTransfer.created_at} by {selectedTransfer.created_by}</p>
                  </div>
                </div>
                {selectedTransfer.shipped_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Shipped</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{selectedTransfer.shipped_at}</p>
                    </div>
                  </div>
                )}
                {selectedTransfer.completed_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Completed</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{selectedTransfer.completed_at}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-[#1F1F23]">
              {selectedTransfer.status === "draft" && (
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1"><Pencil className="w-4 h-4" /> Edit</Button>
                  <Button variant="primary" className="flex-1"><Truck className="w-4 h-4" /> Ship Transfer</Button>
                </div>
              )}
              {selectedTransfer.status === "in_transit" && (
                <Button variant="primary" className="w-full"><CheckCircle className="w-4 h-4" /> Mark as Received</Button>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  )
}


