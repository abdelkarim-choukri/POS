"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Package,
  Warehouse,
  AlertTriangle,
  Clock,
  ArrowRight,
  Check,
  Minus,
  RefreshCw,
  Calendar,
  Filter,
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react"

// ============== TYPES ==============
interface StockBatch {
  id: string
  product_id: string
  product_name: string
  batch_number: string
  quantity_on_hand: number
  unit_cost: number
  received_at: string
  expires_at: string | null
  status: "active" | "low" | "expired"
}

interface WarehouseType {
  id: string
  name: string
  location_id: string | null
  location_name: string | null
  is_default: boolean
  notes: string
  total_skus: number
  total_stock_value: number
  stock_batches: StockBatch[]
}

interface ExpirationAlert {
  id: string
  product_name: string
  batch_number: string
  warehouse_name: string
  quantity: number
  expires_at: string
  days_remaining: number
  alert_type: "expires_soon" | "expired"
  status: "unresolved" | "resolved"
  created_at: string
}

interface DiscrepancyAlert {
  id: string
  product_name: string
  warehouse_name: string
  expected_qty: number
  actual_qty: number
  discrepancy: number
  source: "system_detected" | "offline_sync"
  status: "unresolved" | "resolved"
  created_at: string
}

// ============== MOCK DATA REMOVED — all data comes from API ==============

// ============== REUSABLE COMPONENTS ==============
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" | "indigo" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md"
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  }
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" }
  return <button className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props} />
    </div>
  )
}

function Select({ label, options, ...props }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <select className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'} cursor-pointer`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  if (!isOpen) return null
  const sizeClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function SlidePanel({ isOpen, onClose, title, children, width = "xl" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: "md" | "lg" | "xl" }) {
  if (!isOpen) return null
  const widthClasses = { md: "w-[480px]", lg: "w-[560px]", xl: "w-[700px]" }
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full ${widthClasses[width]} bg-white dark:bg-[#0F0F12] shadow-2xl border-l border-gray-200 dark:border-[#1F1F23] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-hide">{children}</div>
      </div>
    </div>
  )
}

// ============== MAIN PAGE COMPONENT ==============
export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [warehousesLoading, setWarehousesLoading] = useState(false)
  const [warehousesError, setWarehousesError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null)
  const [showWarehouseDetail, setShowWarehouseDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<"stock" | "alerts">("stock")
  const [activePageTab, setActivePageTab] = useState<"warehouses" | "discrepancies">("warehouses")
  
  // Modals
  const [showAddWarehouse, setShowAddWarehouse] = useState(false)
  const [showEditWarehouse, setShowEditWarehouse] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null)
  const [editForm, setEditForm] = useState({ name: "", location_id: "", is_active: true, notes: "" })
  const [showAdjustBatch, setShowAdjustBatch] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null)
  const [showResolveDiscrepancy, setShowResolveDiscrepancy] = useState(false)
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<DiscrepancyAlert | null>(null)

  // Discrepancy filters
  const [discrepancyFilter, setDiscrepancyFilter] = useState<"all" | "unresolved" | "resolved">("all")
  const [discrepancyWarehouseFilter, setDiscrepancyWarehouseFilter] = useState<string>("all")

  // Form state
  const [warehouseForm, setWarehouseForm] = useState({ name: "", location_id: "", is_default: false, notes: "" })
  const [adjustForm, setAdjustForm] = useState({ quantity: "", reason: "manual_recount" })
  const [resolveForm, setResolveForm] = useState({ resolution: "adjust_stock", notes: "" })

  // Filtered warehouses
  const filteredWarehouses = warehouses.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const fetchWarehouses = () => {
    setWarehousesLoading(true)
    apiFetch<{ data: any[] }>("/api/business/warehouses")
      .then(res => {
        const mapped: WarehouseType[] = res.data.map((w: any) => ({
          id: w.id,
          name: w.name,
          location_id: w.location_id ?? null,
          location_name: w.location_name ?? null,
          is_default: w.is_default ?? false,
          notes: w.notes ?? "",
          total_skus: w.total_skus ?? 0,
          total_stock_value: w.total_stock_value ?? 0,
          stock_batches: [],
        }))
        setWarehouses(mapped)
      })
      .catch(e => setWarehousesError(e.message ?? "Failed to load warehouses"))
      .finally(() => setWarehousesLoading(false))
  }

  // Fetch warehouses from API on mount
  useEffect(() => { fetchWarehouses() }, [])

  const handleSaveWarehouse = async () => {
    setWarehousesError(null)
    try {
      await apiFetch<any>("/api/business/warehouses", {
        method: "POST",
        body: JSON.stringify({
          name: warehouseForm.name,
          location_id: warehouseForm.location_id || undefined,
          is_default: warehouseForm.is_default,
          notes: warehouseForm.notes || undefined,
        }),
      })
      setShowAddWarehouse(false)
      fetchWarehouses()
    } catch (e: any) {
      setWarehousesError(e.message ?? "Failed to create warehouse")
    }
  }

  const handleOpenEditWarehouse = (warehouse: WarehouseType) => {
    setEditingWarehouse(warehouse)
    setEditForm({
      name: warehouse.name,
      location_id: warehouse.location_id ?? "",
      is_active: true,
      notes: warehouse.notes ?? "",
    })
    setShowEditWarehouse(true)
  }

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouse) return
    setWarehousesError(null)
    try {
      await apiFetch<any>(`/api/business/warehouses/${editingWarehouse.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name || undefined,
          location_id: editForm.location_id || undefined,
          is_active: editForm.is_active,
          notes: editForm.notes || undefined,
        }),
      })
      setShowEditWarehouse(false)
      setEditingWarehouse(null)
      fetchWarehouses()
    } catch (e: any) {
      setWarehousesError(e.message ?? "Failed to update warehouse")
    }
  }

  const handleDeleteWarehouse = async (id: string) => {
    setWarehousesError(null)
    try {
      await apiFetch<any>(`/api/business/warehouses/${id}`, { method: "DELETE" })
      fetchWarehouses()
    } catch (e: any) {
      setWarehousesError(e.message ?? "Failed to delete warehouse")
    }
  }

  // Discrepancy alerts come from the dedicated alerts module — empty until wired separately
  const discrepancyAlerts: DiscrepancyAlert[] = []
  const expirationAlerts: ExpirationAlert[] = []

  // Filtered discrepancy alerts
  const filteredDiscrepancies = discrepancyAlerts.filter(d => {
    const matchesStatus = discrepancyFilter === "all" || d.status === discrepancyFilter
    const matchesWarehouse = discrepancyWarehouseFilter === "all" || d.warehouse_name === discrepancyWarehouseFilter
    return matchesStatus && matchesWarehouse
  })

  const handleViewWarehouse = (warehouse: WarehouseType) => {
    setSelectedWarehouse(warehouse)
    setDetailTab("stock")
    setShowWarehouseDetail(true)
  }

  const handleAddWarehouse = () => {
    setWarehouseForm({ name: "", location_id: "", is_default: false, notes: "" })
    setShowAddWarehouse(true)
  }

  const handleAdjustBatch = (batch: StockBatch) => {
    setSelectedBatch(batch)
    setAdjustForm({ quantity: batch.quantity_on_hand.toString(), reason: "manual_recount" })
    setShowAdjustBatch(true)
  }

  const handleResolveDiscrepancy = (discrepancy: DiscrepancyAlert) => {
    setSelectedDiscrepancy(discrepancy)
    setResolveForm({ resolution: "adjust_stock", notes: "" })
    setShowResolveDiscrepancy(true)
  }

  const getExpiryColor = (expiresAt: string | null) => {
    if (!expiresAt) return "gray"
    const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return "red"
    if (days < 30) return "yellow"
    return "green"
  }

  const unresolvedExpirations = expirationAlerts.filter(a => a.status === "unresolved").length
  const unresolvedDiscrepancies = discrepancyAlerts.filter(a => a.status === "unresolved").length

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warehouses & Stock</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage inventory storage locations and stock levels</p>
        </div>
        <Button variant="primary" onClick={handleAddWarehouse}>
          <Plus className="w-4 h-4" />
          Add Warehouse
        </Button>
      </div>

      {/* Page-Level Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-[#1F1F23]">
        <button
          onClick={() => setActivePageTab("warehouses")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activePageTab === "warehouses"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Warehouse className="w-4 h-4" />
          Warehouses
        </button>
        <button
          onClick={() => setActivePageTab("discrepancies")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activePageTab === "discrepancies"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Discrepancy Alerts
          {unresolvedDiscrepancies > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
              {unresolvedDiscrepancies}
            </span>
          )}
        </button>
      </div>

      {/* Warehouses Tab Content */}
      {activePageTab === "warehouses" && (
        <>
          {/* Alert Summary */}
          {(unresolvedExpirations > 0 || unresolvedDiscrepancies > 0) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Inventory Alerts</p>
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    {unresolvedExpirations > 0 && `${unresolvedExpirations} expiration alerts`}
                    {unresolvedExpirations > 0 && unresolvedDiscrepancies > 0 && " | "}
                    {unresolvedDiscrepancies > 0 && `${unresolvedDiscrepancies} discrepancy alerts`}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setActivePageTab("discrepancies")}>View Alerts</Button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {warehousesError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              {warehousesError}
            </div>
          )}

          {/* Search */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search warehouses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Warehouses Grid */}
          {warehousesLoading && <div className="py-10 text-center text-gray-400">Loading...</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!warehousesLoading && filteredWarehouses.map(warehouse => (
              <div
                key={warehouse.id}
                className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewWarehouse(warehouse)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                    <Warehouse className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    {warehouse.is_default && <Badge color="blue">Default</Badge>}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenEditWarehouse(warehouse) }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteWarehouse(warehouse.id) }}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{warehouse.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {warehouse.location_name || "No location assigned"}
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-[#1F1F23]">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{warehouse.total_skus}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total SKUs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(warehouse.total_stock_value / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Stock Value (MAD)</p>
                  </div>
                </div>
              </div>
            ))}

            {!warehousesLoading && filteredWarehouses.length === 0 && (
              <div className="col-span-full bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
                <Warehouse className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No warehouses found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add your first warehouse to get started</p>
                <Button variant="primary" onClick={handleAddWarehouse}>
                  <Plus className="w-4 h-4" />
                  Add Warehouse
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Discrepancy Alerts Tab Content */}
      {activePageTab === "discrepancies" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{discrepancyAlerts.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Alerts</p>
            </div>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-red-200 dark:border-red-800 p-4">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{unresolvedDiscrepancies}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unresolved</p>
            </div>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {discrepancyAlerts.filter(d => d.discrepancy < 0).reduce((sum, d) => sum + Math.abs(d.discrepancy), 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Missing Units</p>
            </div>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {discrepancyAlerts.filter(d => d.discrepancy > 0).reduce((sum, d) => sum + d.discrepancy, 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Surplus Units</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discrepancies..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                />
              </div>
              <select 
                className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                value={discrepancyFilter}
                onChange={(e) => setDiscrepancyFilter(e.target.value as typeof discrepancyFilter)}
              >
                <option value="all">All Status</option>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
              <select 
                className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                value={discrepancyWarehouseFilter}
                onChange={(e) => setDiscrepancyWarehouseFilter(e.target.value)}
              >
                <option value="all">All Warehouses</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
              <Button variant="secondary">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Discrepancy Alerts Table */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Warehouse</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expected</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actual</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Discrepancy</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredDiscrepancies.map((alert) => (
                  <tr key={alert.id} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 ${alert.status === "resolved" ? "opacity-60" : ""}`}>
                    <td className="p-4">
                      <p className="font-medium text-gray-900 dark:text-white">{alert.product_name}</p>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{alert.warehouse_name}</td>
                    <td className="p-4 font-mono text-sm text-gray-900 dark:text-white">{alert.expected_qty}</td>
                    <td className="p-4 font-mono text-sm text-gray-900 dark:text-white">{alert.actual_qty}</td>
                    <td className="p-4">
                      <span className={`font-mono font-semibold ${alert.discrepancy < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        {alert.discrepancy > 0 ? "+" : ""}{alert.discrepancy}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge color={alert.source === "system_detected" ? "blue" : "gray"}>
                        {alert.source === "system_detected" ? "System" : "Sync"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge color={alert.status === "resolved" ? "green" : "red"}>
                        {alert.status === "resolved" ? (
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Resolved</span>
                        ) : (
                          <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Unresolved</span>
                        )}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{alert.created_at}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <Eye className="w-4 h-4" />
                        </button>
                        {alert.status === "unresolved" && (
                          <Button variant="secondary" size="sm" onClick={() => handleResolveDiscrepancy(alert)}>
                            Resolve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDiscrepancies.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-300 dark:text-green-700 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white">No discrepancies found</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">All inventory is in sync</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warehouse Detail Panel */}
      <SlidePanel
        isOpen={showWarehouseDetail}
        onClose={() => setShowWarehouseDetail(false)}
        title={selectedWarehouse?.name || "Warehouse Details"}
        width="xl"
      >
        {selectedWarehouse && (
          <div>
            {/* Warehouse Info */}
            <div className="p-5 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <Warehouse className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedWarehouse.name}</h3>
                    {selectedWarehouse.is_default && <Badge color="blue">Default</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedWarehouse.location_name || "No location"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedWarehouse.total_stock_value.toLocaleString()} MAD</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Stock Value</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex">
                <button
                  onClick={() => setDetailTab("stock")}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === "stock"
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Stock ({selectedWarehouse.stock_batches.length})
                </button>
                <button
                  onClick={() => setDetailTab("alerts")}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === "alerts"
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Alerts
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {detailTab === "stock" && (
                <div>
                  {selectedWarehouse.stock_batches.length > 0 ? (
                    <div className="space-y-3">
                      {selectedWarehouse.stock_batches.map(batch => (
                        <div
                          key={batch.id}
                          className={`p-4 border rounded-lg ${
                            batch.status === "expired"
                              ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
                              : batch.status === "low"
                                ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10"
                                : "border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12]"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-gray-900 dark:text-white">{batch.product_name}</p>
                                <Badge color={batch.status === "expired" ? "red" : batch.status === "low" ? "yellow" : "green"}>
                                  {batch.status === "expired" ? "Expired" : batch.status === "low" ? "Low Stock" : "Active"}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Batch: {batch.batch_number} | Received: {batch.received_at}
                              </p>
                              <div className="flex items-center gap-6 text-sm">
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Qty:</span>
                                  <span className="font-mono font-medium text-gray-900 dark:text-white ml-1">{batch.quantity_on_hand}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Unit Cost:</span>
                                  <span className="font-mono font-medium text-gray-900 dark:text-white ml-1">{batch.unit_cost.toFixed(2)} MAD</span>
                                </div>
                                {batch.expires_at && (
                                  <div className="flex items-center gap-1">
                                    <Clock className={`w-3.5 h-3.5 ${getExpiryColor(batch.expires_at) === "red" ? "text-red-500" : getExpiryColor(batch.expires_at) === "yellow" ? "text-amber-500" : "text-green-500"}`} />
                                    <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                                    <span className={`font-medium ${getExpiryColor(batch.expires_at) === "red" ? "text-red-600 dark:text-red-400" : getExpiryColor(batch.expires_at) === "yellow" ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
                                      {batch.expires_at}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleAdjustBatch(batch)}>
                                Adjust
                              </Button>
                              <Button variant="ghost" size="sm">
                                <ArrowRight className="w-4 h-4" />
                                Transfer
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No stock in this warehouse</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "alerts" && (
                <div className="space-y-6">
                  {/* Expiration Alerts */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Expiration Alerts
                    </h4>
                    <div className="space-y-2">
                      {expirationAlerts.filter(a => a.warehouse_name === selectedWarehouse.name).map(alert => (
                        <div key={alert.id} className={`p-3 rounded-lg border ${alert.status === "resolved" ? "border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/50 opacity-60" : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10"}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{alert.product_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {alert.batch_number} | {alert.quantity} units | {alert.days_remaining >= 0 ? `${alert.days_remaining} days left` : `Expired ${Math.abs(alert.days_remaining)} days ago`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge color={alert.alert_type === "expired" ? "red" : "yellow"}>
                                {alert.alert_type === "expired" ? "Expired" : "Expires Soon"}
                              </Badge>
                              {alert.status === "unresolved" && (
                                <Button variant="secondary" size="sm">Resolve</Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Discrepancy Alerts */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Discrepancy Alerts
                    </h4>
                    <div className="space-y-2">
                      {discrepancyAlerts.filter(a => a.warehouse_name === selectedWarehouse.name).map(alert => (
                        <div key={alert.id} className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{alert.product_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Expected: {alert.expected_qty} | Actual: {alert.actual_qty} |{" "}
                                <span className={alert.discrepancy < 0 ? "text-red-600" : "text-green-600"}>
                                  {alert.discrepancy > 0 ? "+" : ""}{alert.discrepancy}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge color={alert.source === "system_detected" ? "blue" : "gray"}>
                                {alert.source === "system_detected" ? "System" : "Sync"}
                              </Badge>
                              <Button variant="secondary" size="sm">Resolve</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Add Warehouse Modal */}
      <Modal isOpen={showAddWarehouse} onClose={() => setShowAddWarehouse(false)} title="Add Warehouse" size="md">
        <div className="space-y-4">
          <Input label="Warehouse Name" placeholder="e.g. Main Storage" value={warehouseForm.name} onChange={(e) => setWarehouseForm(f => ({ ...f, name: e.target.value }))} />
          <Select
            label="Location"
            options={[
              { value: "", label: "Select location..." },
              { value: "loc-1", label: "Downtown Branch" },
              { value: "loc-2", label: "Marina Mall" },
              { value: "loc-3", label: "Airport Kiosk" },
            ]}
            value={warehouseForm.location_id}
            onChange={(e) => setWarehouseForm(f => ({ ...f, location_id: e.target.value }))}
          />
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Default Warehouse</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Set as primary warehouse for inventory</p>
            </div>
            <Toggle checked={warehouseForm.is_default} onChange={(checked) => setWarehouseForm(f => ({ ...f, is_default: checked }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full h-20 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
              placeholder="Optional notes..."
              value={warehouseForm.notes}
              onChange={(e) => setWarehouseForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddWarehouse(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveWarehouse}>Add Warehouse</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Warehouse Modal */}
      <Modal isOpen={showEditWarehouse} onClose={() => setShowEditWarehouse(false)} title="Edit Warehouse" size="md">
        <div className="space-y-4">
          <Input label="Warehouse Name" placeholder="e.g. Main Storage" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
          <Select
            label="Location"
            options={[
              { value: "", label: "Select location..." },
              { value: "loc-1", label: "Downtown Branch" },
              { value: "loc-2", label: "Marina Mall" },
              { value: "loc-3", label: "Airport Kiosk" },
            ]}
            value={editForm.location_id}
            onChange={(e) => setEditForm(f => ({ ...f, location_id: e.target.value }))}
          />
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Active</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Warehouse is available for stock operations</p>
            </div>
            <Toggle checked={editForm.is_active} onChange={(checked) => setEditForm(f => ({ ...f, is_active: checked }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full h-20 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
              placeholder="Optional notes..."
              value={editForm.notes}
              onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditWarehouse(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleUpdateWarehouse}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Adjust Batch Modal */}
      <Modal isOpen={showAdjustBatch} onClose={() => setShowAdjustBatch(false)} title="Adjust Stock" size="sm">
        <div className="space-y-4">
          {selectedBatch && (
            <div className="p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
              <p className="font-medium text-gray-900 dark:text-white">{selectedBatch.product_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Batch: {selectedBatch.batch_number}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Current Qty: <span className="font-mono font-bold">{selectedBatch.quantity_on_hand}</span></p>
            </div>
          )}
          <Input label="New Quantity" type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} />
          <Select
            label="Reason"
            options={[
              { value: "manual_recount", label: "Manual Recount" },
              { value: "damaged", label: "Damaged" },
              { value: "theft", label: "Theft/Loss" },
              { value: "other", label: "Other" },
            ]}
            value={adjustForm.reason}
            onChange={(e) => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdjustBatch(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAdjustBatch(false)}>
              <Check className="w-4 h-4" />
              Adjust
            </Button>
          </div>
        </div>
      </Modal>

      {/* Resolve Discrepancy Modal */}
      <Modal isOpen={showResolveDiscrepancy} onClose={() => setShowResolveDiscrepancy(false)} title="Resolve Discrepancy" size="md">
        <div className="space-y-4">
          {selectedDiscrepancy && (
            <>
              {/* Discrepancy Summary */}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedDiscrepancy.product_name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedDiscrepancy.warehouse_name}</p>
                  </div>
                  <Badge color={selectedDiscrepancy.source === "system_detected" ? "blue" : "gray"}>
                    {selectedDiscrepancy.source === "system_detected" ? "System Detected" : "Offline Sync"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Expected</p>
                    <p className="text-xl font-bold font-mono text-gray-900 dark:text-white">{selectedDiscrepancy.expected_qty}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Actual</p>
                    <p className="text-xl font-bold font-mono text-gray-900 dark:text-white">{selectedDiscrepancy.actual_qty}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Discrepancy</p>
                    <p className={`text-xl font-bold font-mono ${selectedDiscrepancy.discrepancy < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {selectedDiscrepancy.discrepancy > 0 ? "+" : ""}{selectedDiscrepancy.discrepancy}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resolution Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resolution Action</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-[#1F1F23] rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                    <input
                      type="radio"
                      name="resolution"
                      value="adjust_stock"
                      checked={resolveForm.resolution === "adjust_stock"}
                      onChange={(e) => setResolveForm(f => ({ ...f, resolution: e.target.value }))}
                      className="mt-1 text-indigo-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Adjust Stock to Actual</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Update system stock to match actual count ({selectedDiscrepancy.actual_qty} units)</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-[#1F1F23] rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                    <input
                      type="radio"
                      name="resolution"
                      value="investigate"
                      checked={resolveForm.resolution === "investigate"}
                      onChange={(e) => setResolveForm(f => ({ ...f, resolution: e.target.value }))}
                      className="mt-1 text-indigo-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Mark as Investigated</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Keep current stock but mark alert as resolved</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-[#1F1F23] rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                    <input
                      type="radio"
                      name="resolution"
                      value="write_off"
                      checked={resolveForm.resolution === "write_off"}
                      onChange={(e) => setResolveForm(f => ({ ...f, resolution: e.target.value }))}
                      className="mt-1 text-indigo-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Write Off Loss</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Record as inventory loss for accounting</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution Notes</label>
                <textarea
                  className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full h-20 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
                  placeholder="Describe the resolution or investigation findings..."
                  value={resolveForm.notes}
                  onChange={(e) => setResolveForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {/* Warning */}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> This action will be logged in the audit trail and cannot be undone.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowResolveDiscrepancy(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" onClick={() => setShowResolveDiscrepancy(false)}>
                  <Check className="w-4 h-4" />
                  Resolve Alert
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}



