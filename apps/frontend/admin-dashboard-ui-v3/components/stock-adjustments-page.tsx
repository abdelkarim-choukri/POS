"use client"

import { useState } from "react"
import {
  Search,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Package,
  FileText,
  Eye,
  Calendar,
  Filter,
  AlertTriangle,
} from "lucide-react"

// Types
interface StockAdjustment {
  id: string
  adjustment_number: string
  warehouse_id: string
  warehouse_name: string
  type: "increase" | "decrease"
  reason: string
  status: "pending" | "approved" | "rejected"
  items: { id: string; product_name: string; sku: string; quantity: number; current_stock: number }[]
  notes: string
  created_at: string
  created_by: string
  approved_by?: string
  approved_at?: string
}

// Mock Data
const mockAdjustments: StockAdjustment[] = [
  {
    id: "1", adjustment_number: "ADJ-2024001", warehouse_id: "1", warehouse_name: "Main Warehouse",
    type: "decrease", reason: "Damaged goods", status: "approved",
    items: [
      { id: "1", product_name: "Tomatoes (kg)", sku: "VEG-001", quantity: 5, current_stock: 45 },
      { id: "2", product_name: "Lettuce (head)", sku: "VEG-002", quantity: 3, current_stock: 27 },
    ],
    notes: "Items damaged during storage", created_at: "2024-01-18", created_by: "Ahmed Benali", approved_by: "Manager", approved_at: "2024-01-18"
  },
  {
    id: "2", adjustment_number: "ADJ-2024002", warehouse_id: "2", warehouse_name: "Kitchen Storage",
    type: "increase", reason: "Inventory count correction", status: "pending",
    items: [
      { id: "3", product_name: "Flour (25kg bag)", sku: "BAK-001", quantity: 2, current_stock: 10 },
    ],
    notes: "Found extra stock during audit", created_at: "2024-01-20", created_by: "Sara Idrissi"
  },
  {
    id: "3", adjustment_number: "ADJ-2024003", warehouse_id: "1", warehouse_name: "Main Warehouse",
    type: "decrease", reason: "Expired products", status: "approved",
    items: [
      { id: "4", product_name: "Milk (1L)", sku: "DAI-001", quantity: 12, current_stock: 38 },
    ],
    notes: "Expired milk removed from inventory", created_at: "2024-01-19", created_by: "Karim Tazi", approved_by: "Manager", approved_at: "2024-01-19"
  },
]

const adjustmentReasons = [
  { value: "damaged", label: "Damaged Goods" },
  { value: "expired", label: "Expired Products" },
  { value: "theft", label: "Theft/Loss" },
  { value: "correction", label: "Inventory Count Correction" },
  { value: "return", label: "Customer Return" },
  { value: "other", label: "Other" },
]

// Components
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
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
      <div className="absolute right-0 top-0 h-full w-[500px] bg-white dark:bg-[#0F0F12] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export default function StockAdjustmentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null)

  // Create form state
  const [newAdjustment, setNewAdjustment] = useState({
    warehouse_id: "",
    type: "decrease" as "increase" | "decrease",
    reason: "",
    notes: "",
    items: [] as { product_id: string; quantity: number }[],
  })

  const filteredAdjustments = mockAdjustments.filter(adj => {
    const matchesSearch = adj.adjustment_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || adj.status === statusFilter
    const matchesType = typeFilter === "all" || adj.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const handleView = (adjustment: StockAdjustment) => {
    setSelectedAdjustment(adjustment)
    setShowDetailPanel(true)
  }

  const addItem = () => {
    setNewAdjustment(prev => ({
      ...prev,
      items: [...prev.items, { product_id: "", quantity: 1 }]
    }))
  }

  const removeItem = (index: number) => {
    setNewAdjustment(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Adjustments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Record and track inventory adjustments</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Adjustment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockAdjustments.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Adjustments</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockAdjustments.filter(a => a.status === "pending").length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <ArrowDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockAdjustments.filter(a => a.type === "decrease").length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Stock Decreases</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <ArrowUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockAdjustments.filter(a => a.type === "increase").length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Stock Increases</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search adjustments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Adjustment #</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Warehouse</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reason</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Created</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredAdjustments.map((adj) => (
              <tr key={adj.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                <td className="p-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{adj.adjustment_number}</td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{adj.warehouse_name}</td>
                <td className="p-4">
                  <Badge color={adj.type === "increase" ? "green" : "red"}>
                    {adj.type === "increase" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {adj.type}
                  </Badge>
                </td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{adj.reason}</td>
                <td className="p-4 text-sm text-gray-900 dark:text-white">{adj.items.length} items</td>
                <td className="p-4">
                  <Badge color={adj.status === "approved" ? "green" : adj.status === "pending" ? "yellow" : "red"}>
                    {adj.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <p className="text-gray-900 dark:text-white">{adj.created_at}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{adj.created_by}</p>
                  </div>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleView(adj)}
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Stock Adjustment" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warehouse</label>
              <select
                value={newAdjustment.warehouse_id}
                onChange={(e) => setNewAdjustment(prev => ({ ...prev, warehouse_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="">Select warehouse</option>
                <option value="1">Main Warehouse</option>
                <option value="2">Kitchen Storage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adjustment Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewAdjustment(prev => ({ ...prev, type: "decrease" }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    newAdjustment.type === "decrease"
                      ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400"
                      : "bg-white dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <ArrowDown className="w-4 h-4" /> Decrease
                </button>
                <button
                  onClick={() => setNewAdjustment(prev => ({ ...prev, type: "increase" }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    newAdjustment.type === "increase"
                      ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400"
                      : "bg-white dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <ArrowUp className="w-4 h-4" /> Increase
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <select
              value={newAdjustment.reason}
              onChange={(e) => setNewAdjustment(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            >
              <option value="">Select reason</option>
              {adjustmentReasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Items to Adjust</label>
              <Button variant="ghost" onClick={addItem}><Plus className="w-4 h-4" /> Add Item</Button>
            </div>
            <div className="border border-gray-200 dark:border-[#1F1F23] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Product</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-32">Quantity</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {newAdjustment.items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No items added. Click "Add Item" to start.
                      </td>
                    </tr>
                  ) : (
                    newAdjustment.items.map((item, index) => (
                      <tr key={index}>
                        <td className="p-3">
                          <select className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                            <option value="">Select product</option>
                            <option value="1">Tomatoes (kg)</option>
                            <option value="2">Lettuce (head)</option>
                            <option value="3">Flour (25kg bag)</option>
                          </select>
                        </td>
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
              value={newAdjustment.notes}
              onChange={(e) => setNewAdjustment(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-20 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              placeholder="Additional notes about this adjustment..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1">Submit for Approval</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Panel */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title="Adjustment Details">
        {selectedAdjustment && (
          <div className="space-y-6">
            <div className="p-5 border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-xl font-bold text-gray-900 dark:text-white">{selectedAdjustment.adjustment_number}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedAdjustment.warehouse_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={selectedAdjustment.type === "increase" ? "green" : "red"}>
                    {selectedAdjustment.type === "increase" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {selectedAdjustment.type}
                  </Badge>
                  <Badge color={selectedAdjustment.status === "approved" ? "green" : selectedAdjustment.status === "pending" ? "yellow" : "red"}>
                    {selectedAdjustment.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedAdjustment.reason}</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created By</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedAdjustment.created_by}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedAdjustment.created_at}</p>
                </div>
              </div>
            </div>

            <div className="px-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Adjusted Items</h4>
              <div className="space-y-2">
                {selectedAdjustment.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-medium ${selectedAdjustment.type === "increase" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {selectedAdjustment.type === "increase" ? "+" : "-"}{item.quantity}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current: {item.current_stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedAdjustment.notes && (
              <div className="px-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">{selectedAdjustment.notes}</p>
              </div>
            )}

            {selectedAdjustment.status === "pending" && (
              <div className="p-5 border-t border-gray-200 dark:border-[#1F1F23]">
                <div className="flex gap-3">
                  <Button variant="danger" className="flex-1">Reject</Button>
                  <Button variant="primary" className="flex-1">Approve</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  )
}


