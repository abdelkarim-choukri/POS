"use client"

import React, { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  X,
  FileText,
  ChevronDown,
  ChevronRight,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Pencil,
  Printer,
  MoreHorizontal,
  Calendar,
  Building2,
} from "lucide-react"

// Types
interface PurchaseOrderItem {
  id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  total: number
}

interface PurchaseOrder {
  id: string
  po_number: string
  vendor_id: string
  vendor_name: string
  warehouse_id: string
  warehouse_name: string
  status: "draft" | "sent" | "partial" | "received" | "cancelled"
  items: PurchaseOrderItem[]
  subtotal: number
  tax: number
  total: number
  expected_date: string
  notes: string
  created_at: string
  created_by: string
}

// Mock Data
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "1", po_number: "PO-2024001", vendor_id: "1", vendor_name: "Fresh Farms Produce", warehouse_id: "1", warehouse_name: "Main Warehouse",
    status: "received", items: [
      { id: "1", product_name: "Tomatoes (kg)", sku: "VEG-001", quantity: 50, unit_price: 12, total: 600 },
      { id: "2", product_name: "Lettuce (head)", sku: "VEG-002", quantity: 30, unit_price: 8, total: 240 },
    ],
    subtotal: 840, tax: 168, total: 1008, expected_date: "2024-01-20", notes: "Fresh produce delivery", created_at: "2024-01-15", created_by: "Admin"
  },
  {
    id: "2", po_number: "PO-2024002", vendor_id: "2", vendor_name: "Ocean Seafood Co.", warehouse_id: "1", warehouse_name: "Main Warehouse",
    status: "sent", items: [
      { id: "3", product_name: "Salmon Fillet (kg)", sku: "SEA-001", quantity: 20, unit_price: 120, total: 2400 },
      { id: "4", product_name: "Shrimp (kg)", sku: "SEA-002", quantity: 15, unit_price: 95, total: 1425 },
    ],
    subtotal: 3825, tax: 765, total: 4590, expected_date: "2024-01-22", notes: "Weekly seafood order", created_at: "2024-01-18", created_by: "Admin"
  },
  {
    id: "3", po_number: "PO-2024003", vendor_id: "3", vendor_name: "Bakery Supplies Ltd", warehouse_id: "2", warehouse_name: "Kitchen Storage",
    status: "partial", items: [
      { id: "5", product_name: "Flour (25kg bag)", sku: "BAK-001", quantity: 10, unit_price: 150, total: 1500 },
      { id: "6", product_name: "Sugar (10kg bag)", sku: "BAK-002", quantity: 8, unit_price: 80, total: 640 },
    ],
    subtotal: 2140, tax: 428, total: 2568, expected_date: "2024-01-19", notes: "Bakery supplies restock", created_at: "2024-01-16", created_by: "Manager"
  },
  {
    id: "4", po_number: "PO-2024004", vendor_id: "1", vendor_name: "Fresh Farms Produce", warehouse_id: "1", warehouse_name: "Main Warehouse",
    status: "draft", items: [
      { id: "7", product_name: "Onions (kg)", sku: "VEG-003", quantity: 40, unit_price: 10, total: 400 },
    ],
    subtotal: 400, tax: 80, total: 480, expected_date: "2024-01-25", notes: "", created_at: "2024-01-20", created_by: "Admin"
  },
]

const mockVendors = [
  { id: "1", name: "Fresh Farms Produce" },
  { id: "2", name: "Ocean Seafood Co." },
  { id: "3", name: "Bakery Supplies Ltd" },
]

const mockWarehouses = [
  { id: "1", name: "Main Warehouse" },
  { id: "2", name: "Kitchen Storage" },
]

const mockProducts = [
  { id: "1", name: "Tomatoes (kg)", sku: "VEG-001", price: 12 },
  { id: "2", name: "Lettuce (head)", sku: "VEG-002", price: 8 },
  { id: "3", name: "Onions (kg)", sku: "VEG-003", price: 10 },
  { id: "4", name: "Salmon Fillet (kg)", sku: "SEA-001", price: 120 },
  { id: "5", name: "Shrimp (kg)", sku: "SEA-002", price: 95 },
  { id: "6", name: "Flour (25kg bag)", sku: "BAK-001", price: 150 },
  { id: "7", name: "Sugar (10kg bag)", sku: "BAK-002", price: 80 },
]

// Components
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" | "purple" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
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
      <div className="absolute right-0 top-0 h-full w-[600px] bg-white dark:bg-[#0F0F12] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: PurchaseOrder["status"] }) {
  const config = {
    draft: { color: "gray" as const, icon: FileText, label: "Draft" },
    sent: { color: "blue" as const, icon: Truck, label: "Sent" },
    partial: { color: "yellow" as const, icon: Clock, label: "Partial" },
    received: { color: "green" as const, icon: CheckCircle, label: "Received" },
    cancelled: { color: "red" as const, icon: AlertCircle, label: "Cancelled" },
  }
  const { color, icon: Icon, label } = config[status]
  return <Badge color={color}><Icon className="w-3 h-3" />{label}</Badge>
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  // Create PO form state
  const [newPO, setNewPO] = useState({
    vendor_id: "",
    warehouse_id: "",
    expected_date: "",
    notes: "",
    items: [] as { product_id: string; quantity: number; unit_price: number }[],
  })

  // Fetch purchase orders from API
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: "1", limit: "50" })
        if (statusFilter !== "all") params.set("status", statusFilter)
        if (vendorFilter !== "all") params.set("vendor_id", vendorFilter)
        const res = await apiFetch<{ data: any[]; total: number }>(
          `/api/business/inventory/purchase-orders?${params}`
        )
        const mapped: PurchaseOrder[] = res.data.map((po: any) => ({
          id: po.id,
          po_number: po.po_number,
          vendor_id: po.vendor_id,
          vendor_name: po.vendor?.name ?? "",
          warehouse_id: po.warehouse_id ?? "",
          warehouse_name: po.warehouse?.name ?? "",
          status: po.status,
          items: (po.items ?? []).map((item: any) => ({
            id: item.id,
            product_name: item.product?.name ?? "",
            sku: item.product?.sku ?? "",
            quantity: item.quantity,
            unit_price: Number(item.unit_price_ht ?? 0),
            total: Number(item.quantity ?? 0) * Number(item.unit_price_ht ?? 0),
          })),
          subtotal: Number(po.total_ht ?? 0),
          tax: Number(po.total_tva ?? 0),
          total: Number(po.total_ttc ?? 0),
          expected_date: po.expected_delivery_date ? po.expected_delivery_date.split("T")[0] : "",
          notes: po.notes ?? "",
          created_at: po.created_at ? po.created_at.split("T")[0] : "",
          created_by: "",
        }))
        setOrders(mapped)
      } catch (e: any) {
        setError(e.message ?? "Failed to load purchase orders")
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [statusFilter, vendorFilter])

  const filteredOrders = orders.filter(po => {
    const matchesSearch = searchQuery === "" || po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) || po.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const toggleRow = (id: string) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setShowDetailPanel(true)
    setShowDropdown(null)
  }

  const addItem = () => {
    setNewPO(prev => ({
      ...prev,
      items: [...prev.items, { product_id: "", quantity: 1, unit_price: 0 }]
    }))
  }

  const removeItem = (index: number) => {
    setNewPO(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    setNewPO(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item
        if (field === "product_id") {
          const product = mockProducts.find(p => p.id === value)
          return { ...item, product_id: value as string, unit_price: product?.price || 0 }
        }
        return { ...item, [field]: value }
      })
    }))
  }

  const calculateTotal = () => {
    const subtotal = newPO.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0)
    const tax = subtotal * 0.2
    return { subtotal, tax, total: subtotal + tax }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage purchase orders from vendors</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create PO
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: "All Orders", count: orders.length, color: "bg-gray-100 dark:bg-[#0F0F12]" },
          { label: "Draft", count: orders.filter(p => p.status === "draft").length, color: "bg-gray-100 dark:bg-[#0F0F12]" },
          { label: "Sent", count: orders.filter(p => p.status === "sent").length, color: "bg-blue-100 dark:bg-blue-900/30" },
          { label: "Partial", count: orders.filter(p => p.status === "partial").length, color: "bg-amber-100 dark:bg-amber-900/30" },
          { label: "Received", count: orders.filter(p => p.status === "received").length, color: "bg-green-100 dark:bg-green-900/30" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4 text-center`}>
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
              placeholder="Search by PO number or vendor..."
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
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Vendors</option>
            {mockVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        {loading && <div className="py-10 text-center text-gray-400">Loading...</div>}
        {!loading && <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>
              <th className="w-10 p-4"></th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">PO Number</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Warehouse</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Expected</th>
              <th className="text-right p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredOrders.map((po) => (
              <React.Fragment key={po.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                  <td className="p-4">
                    <button onClick={() => toggleRow(po.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-[#2a2a32] rounded">
                      {expandedRows.includes(po.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="p-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{po.po_number}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{po.vendor_name}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{po.warehouse_name}</td>
                  <td className="p-4"><StatusBadge status={po.status} /></td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{po.expected_date}</td>
                  <td className="p-4 text-right font-mono text-sm font-medium text-gray-900 dark:text-white">{po.total.toLocaleString()} MAD</td>
                  <td className="p-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(showDropdown === po.id ? null : po.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </button>
                      {showDropdown === po.id && (
                        <>
                          <div className="fixed inset-0" onClick={() => setShowDropdown(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                            <button onClick={() => handleViewPO(po)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]">
                              <Eye className="w-4 h-4" /> View
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]">
                              <Pencil className="w-4 h-4" /> Edit
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]">
                              <Printer className="w-4 h-4" /> Print
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedRows.includes(po.id) && (
                  <tr key={`${po.id}-expanded`} className="bg-gray-50 dark:bg-[#0F0F12]/30">
                    <td colSpan={8} className="p-4">
                      <div className="ml-8">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Items</p>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                              <th className="pb-2">Product</th>
                              <th className="pb-2">SKU</th>
                              <th className="pb-2 text-right">Qty</th>
                              <th className="pb-2 text-right">Unit Price</th>
                              <th className="pb-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {po.items.map(item => (
                              <tr key={item.id} className="border-t border-gray-200 dark:border-[#1F1F23]">
                                <td className="py-2 text-gray-900 dark:text-white">{item.product_name}</td>
                                <td className="py-2 font-mono text-gray-500 dark:text-gray-400">{item.sku}</td>
                                <td className="py-2 text-right text-gray-900 dark:text-white">{item.quantity}</td>
                                <td className="py-2 text-right font-mono text-gray-600 dark:text-gray-300">{item.unit_price.toFixed(2)} MAD</td>
                                <td className="py-2 text-right font-mono text-gray-900 dark:text-white">{item.total.toFixed(2)} MAD</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>}
      </div>

      {/* Create PO Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Purchase Order" size="xl">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor</label>
              <select
                value={newPO.vendor_id}
                onChange={(e) => setNewPO(prev => ({ ...prev, vendor_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="">Select vendor</option>
                {mockVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination Warehouse</label>
              <select
                value={newPO.warehouse_id}
                onChange={(e) => setNewPO(prev => ({ ...prev, warehouse_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="">Select warehouse</option>
                {mockWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Delivery Date</label>
            <input
              type="date"
              value={newPO.expected_date}
              onChange={(e) => setNewPO(prev => ({ ...prev, expected_date: e.target.value }))}
              className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
              <Button variant="ghost" onClick={addItem}><Plus className="w-4 h-4" /> Add Item</Button>
            </div>
            <div className="border border-gray-200 dark:border-[#1F1F23] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Product</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">Qty</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-32">Unit Price</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-32">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {newPO.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No items added. Click "Add Item" to start.
                      </td>
                    </tr>
                  ) : (
                    newPO.items.map((item, index) => (
                      <tr key={index}>
                        <td className="p-3">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, "product_id", e.target.value)}
                            className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                          >
                            <option value="">Select product</option>
                            {mockProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                            className="w-full border border-gray-300 dark:border-[#1F1F23] rounded px-2 py-1 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="p-3 font-mono text-gray-600 dark:text-gray-300">{item.unit_price.toFixed(2)} MAD</td>
                        <td className="p-3 text-right font-mono text-gray-900 dark:text-white">{(item.quantity * item.unit_price).toFixed(2)} MAD</td>
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

          {newPO.items.length > 0 && (
            <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-mono text-gray-900 dark:text-white">{calculateTotal().subtotal.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">TVA (20%)</span>
                <span className="font-mono text-gray-900 dark:text-white">{calculateTotal().tax.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200 dark:border-[#1F1F23]">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="font-mono text-gray-900 dark:text-white">{calculateTotal().total.toFixed(2)} MAD</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={newPO.notes}
              onChange={(e) => setNewPO(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-20 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="secondary" className="flex-1">Save as Draft</Button>
            <Button variant="primary" className="flex-1">Create & Send</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Panel */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title="Purchase Order Details">
        {selectedPO && (
          <div className="space-y-6">
            <div className="p-5 border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-xl font-bold text-gray-900 dark:text-white">{selectedPO.po_number}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created on {selectedPO.created_at} by {selectedPO.created_by}</p>
                </div>
                <StatusBadge status={selectedPO.status} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Vendor</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPO.vendor_name}</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Warehouse</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPO.warehouse_name}</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Expected Delivery</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPO.expected_date}</p>
                </div>
              </div>
            </div>

            <div className="px-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Items ({selectedPO.items.length})</h4>
              <div className="space-y-2">
                {selectedPO.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku} • {item.quantity} × {item.unit_price.toFixed(2)} MAD</p>
                    </div>
                    <p className="font-mono font-medium text-gray-900 dark:text-white">{item.total.toFixed(2)} MAD</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-mono">{selectedPO.subtotal.toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">TVA (20%)</span>
                  <span className="font-mono">{selectedPO.tax.toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-indigo-200 dark:border-[#1F1F23]">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedPO.total.toFixed(2)} MAD</span>
                </div>
              </div>
            </div>

            {selectedPO.notes && (
              <div className="px-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">{selectedPO.notes}</p>
              </div>
            )}

            <div className="p-5 border-t border-gray-200 dark:border-[#1F1F23]">
              <div className="flex gap-3">
                {selectedPO.status === "draft" && (
                  <>
                    <Button variant="secondary" className="flex-1"><Pencil className="w-4 h-4" /> Edit</Button>
                    <Button variant="primary" className="flex-1"><Truck className="w-4 h-4" /> Send to Vendor</Button>
                  </>
                )}
                {selectedPO.status === "sent" && (
                  <Button variant="primary" className="flex-1"><CheckCircle className="w-4 h-4" /> Mark as Received</Button>
                )}
                {selectedPO.status === "partial" && (
                  <Button variant="primary" className="flex-1"><Package className="w-4 h-4" /> Record Delivery</Button>
                )}
                <Button variant="secondary"><Printer className="w-4 h-4" /> Print</Button>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  )
}


