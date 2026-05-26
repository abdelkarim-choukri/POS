"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  DollarSign,
  Package,
  Eye,
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Receipt,
} from "lucide-react"

// Types
interface VendorCheckDetail {
  id: string
  checked_at: string
  checked_by: string
  status: string
  notes?: string
}

interface VendorPayment {
  id: string
  payment_number: string
  po_number: string
  payment_method: "cash" | "check" | "bank_transfer" | "mobile"
  amount: number
  status: "pending" | "confirmed" | "voided"
  payment_date: string
  confirmed_by?: string
  reference_number?: string
  notes?: string
}

interface OutstandingPO {
  id: string
  po_number: string
  total_ttc: number
  amount_paid: number
  balance_due: number
  expected_delivery_date: string
}

interface Vendor {
  id: string
  name: string
  contact_name: string
  email: string
  phone: string
  address: string
  payment_terms: string
  status: "active" | "inactive"
  total_orders: number
  total_spent: number
  created_at: string
}

// Reusable Components
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
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

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!isOpen) return null
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
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
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

const emptyAddForm = { name: "", contact_name: "", email: "", phone: "", address: "", payment_terms_days: "", notes: "" }
const emptyCheckDetailForm = { checked_at: new Date().toISOString().slice(0, 16), checked_by: "", status: "ok", notes: "" }

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Add vendor modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addFormData, setAddFormData] = useState(emptyAddForm)
  const [addLoading, setAddLoading] = useState(false)

  // Edit vendor modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState(emptyAddForm)
  const [editVendorId, setEditVendorId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Detail panel
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [vendorTab, setVendorTab] = useState<"info" | "checks" | "payments" | "outstanding">("info")

  // Check details
  const [vendorCheckDetails, setVendorCheckDetails] = useState<VendorCheckDetail[]>([])
  const [checkDetailsLoading, setCheckDetailsLoading] = useState(false)
  const [showAddCheckModal, setShowAddCheckModal] = useState(false)
  const [checkDetailFormData, setCheckDetailFormData] = useState(emptyCheckDetailForm)
  const [addCheckLoading, setAddCheckLoading] = useState(false)

  // Payments / outstanding — not in scope for this wiring pass; kept as empty lists
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({ po_number: "", amount: "", payment_method: "cash" as const, payment_date: new Date().toISOString().split("T")[0], reference_number: "", notes: "" })

  // ── Helpers ──────────────────────────────────────────────────────────────
  const mapVendor = (v: any): Vendor => ({
    id: v.id,
    name: v.name,
    contact_name: v.contact_name ?? "",
    email: v.email ?? "",
    phone: v.phone ?? "",
    address: v.address ?? "",
    payment_terms: v.payment_terms_days ? `Net ${v.payment_terms_days}` : "COD",
    status: v.is_active === false ? "inactive" : "active",
    total_orders: 0,
    total_spent: 0,
    created_at: v.created_at ?? "",
  })

  const fetchVendors = async (search = searchQuery) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await apiFetch<{ data: any[] }>(`/api/business/vendors?${params}`)
      setVendors(res.data.map(mapVendor))
    } catch (e: any) {
      setError(e.message ?? "Failed to load vendors")
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch vendors from API with debounced search ──────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => fetchVendors(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = searchQuery === "" || v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || v.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // ── View vendor detail → GET /api/business/vendors/:id ───────────────────
  const handleViewVendor = async (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setVendorTab("info")
    setShowDetailPanel(true)
    setShowDropdown(null)
    setDetailLoading(true)
    try {
      const v = await apiFetch<any>(`/api/business/vendors/${vendor.id}`)
      setSelectedVendor(mapVendor(v))
    } catch (e: any) {
      setError(e.message ?? "Failed to load vendor details")
    } finally {
      setDetailLoading(false)
    }
  }

  // ── Load check details → GET /api/business/vendors/:id/check-details ─────
  const fetchCheckDetails = async (vendorId: string) => {
    setCheckDetailsLoading(true)
    try {
      const data = await apiFetch<VendorCheckDetail[]>(`/api/business/vendors/${vendorId}/check-details`)
      setVendorCheckDetails(data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load check details")
    } finally {
      setCheckDetailsLoading(false)
    }
  }

  // Trigger check-details fetch when that tab is selected
  useEffect(() => {
    if (vendorTab === "checks" && selectedVendor) {
      fetchCheckDetails(selectedVendor.id)
    }
  }, [vendorTab, selectedVendor?.id])

  // ── Create vendor → POST /api/business/vendors ───────────────────────────
  const handleCreateVendor = async () => {
    setAddLoading(true)
    setError(null)
    try {
      const body: Record<string, any> = { name: addFormData.name }
      if (addFormData.contact_name) body.contact_name = addFormData.contact_name
      if (addFormData.email) body.email = addFormData.email
      if (addFormData.phone) body.phone = addFormData.phone
      if (addFormData.address) body.address = addFormData.address
      if (addFormData.payment_terms_days) body.payment_terms_days = Number(addFormData.payment_terms_days)
      if (addFormData.notes) body.notes = addFormData.notes
      await apiFetch(`/api/business/vendors`, { method: "POST", body: JSON.stringify(body) })
      setShowAddModal(false)
      setAddFormData(emptyAddForm)
      await fetchVendors()
    } catch (e: any) {
      setError(e.message ?? "Failed to create vendor")
    } finally {
      setAddLoading(false)
    }
  }

  // ── Open edit modal ───────────────────────────────────────────────────────
  const handleOpenEdit = (vendor: Vendor) => {
    setEditVendorId(vendor.id)
    const terms = vendor.payment_terms.startsWith("Net ") ? vendor.payment_terms.replace("Net ", "") : ""
    setEditFormData({
      name: vendor.name,
      contact_name: vendor.contact_name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      payment_terms_days: terms,
      notes: "",
    })
    setShowEditModal(true)
    setShowDropdown(null)
  }

  // ── Edit vendor → PATCH /api/business/vendors/:id ────────────────────────
  const handleEditVendor = async () => {
    if (!editVendorId) return
    setEditLoading(true)
    setError(null)
    try {
      const body: Record<string, any> = {}
      if (editFormData.name) body.name = editFormData.name
      if (editFormData.contact_name !== undefined) body.contact_name = editFormData.contact_name
      if (editFormData.email !== undefined) body.email = editFormData.email
      if (editFormData.phone !== undefined) body.phone = editFormData.phone
      if (editFormData.address !== undefined) body.address = editFormData.address
      if (editFormData.payment_terms_days) body.payment_terms_days = Number(editFormData.payment_terms_days)
      if (editFormData.notes) body.notes = editFormData.notes
      await apiFetch(`/api/business/vendors/${editVendorId}`, { method: "PATCH", body: JSON.stringify(body) })
      setShowEditModal(false)
      setEditVendorId(null)
      await fetchVendors()
      // Refresh detail panel if this vendor is open
      if (selectedVendor?.id === editVendorId) {
        const v = await apiFetch<any>(`/api/business/vendors/${editVendorId}`)
        setSelectedVendor(mapVendor(v))
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to update vendor")
    } finally {
      setEditLoading(false)
    }
  }

  // ── Delete vendor → DELETE /api/business/vendors/:id ─────────────────────
  const handleOpenDelete = (vendorId: string) => {
    setDeleteVendorId(vendorId)
    setShowDeleteConfirm(true)
    setShowDropdown(null)
  }

  const handleDeleteVendor = async () => {
    if (!deleteVendorId) return
    setDeleteLoading(true)
    setError(null)
    try {
      await apiFetch(`/api/business/vendors/${deleteVendorId}`, { method: "DELETE" })
      setShowDeleteConfirm(false)
      setDeleteVendorId(null)
      if (selectedVendor?.id === deleteVendorId) {
        setShowDetailPanel(false)
        setSelectedVendor(null)
      }
      await fetchVendors()
    } catch (e: any) {
      setError(e.message ?? "Failed to delete vendor")
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Add check detail → POST /api/business/vendors/:id/check-details ──────
  const handleAddCheckDetail = async () => {
    if (!selectedVendor) return
    setAddCheckLoading(true)
    setError(null)
    try {
      await apiFetch(`/api/business/vendors/${selectedVendor.id}/check-details`, {
        method: "POST",
        body: JSON.stringify({
          checked_at: checkDetailFormData.checked_at,
          checked_by: checkDetailFormData.checked_by,
          status: checkDetailFormData.status,
          ...(checkDetailFormData.notes ? { notes: checkDetailFormData.notes } : {}),
        }),
      })
      setShowAddCheckModal(false)
      setCheckDetailFormData(emptyCheckDetailForm)
      await fetchCheckDetails(selectedVendor.id)
    } catch (e: any) {
      setError(e.message ?? "Failed to add check detail")
    } finally {
      setAddCheckLoading(false)
    }
  }

  const getDaysOverdue = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  const getPaymentMethodBadgeColor = (method: string): "green" | "blue" | "yellow" | "gray" => {
    const colors: Record<string, "green" | "blue" | "yellow" | "gray"> = { cash: "green", check: "blue", bank_transfer: "yellow", mobile: "gray" }
    return colors[method] || "gray"
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendors</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your suppliers and vendors</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add Vendor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{vendors.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Vendors</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{vendors.reduce((acc, v) => acc + v.total_orders, 0)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(vendors.reduce((acc, v) => acc + v.total_spent, 0) / 1000).toFixed(0)}K MAD</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{vendors.filter(v => v.status === "active").length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Vendors</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Vendors Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        {loading && <div className="py-10 text-center text-gray-400">Loading...</div>}
        {!loading && <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contact</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment Terms</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Orders</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Spent</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredVendors.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold">
                      {vendor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{vendor.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{vendor.contact_name}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {vendor.email}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {vendor.phone}
                    </p>
                  </div>
                </td>
                <td className="p-4">
                  <Badge color="blue">{vendor.payment_terms}</Badge>
                </td>
                <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{vendor.total_orders}</td>
                <td className="p-4 text-sm font-mono text-gray-900 dark:text-white">{vendor.total_spent.toLocaleString()} MAD</td>
                <td className="p-4">
                  <Badge color={vendor.status === "active" ? "green" : "gray"}>{vendor.status}</Badge>
                </td>
                <td className="p-4">
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(showDropdown === vendor.id ? null : vendor.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>
                    {showDropdown === vendor.id && (
                      <>
                        <div className="fixed inset-0" onClick={() => setShowDropdown(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                          <button onClick={() => handleViewVendor(vendor)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]">
                            <Eye className="w-4 h-4" /> View Details
                          </button>
                          <button onClick={() => handleOpenEdit(vendor)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]">
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button onClick={() => handleOpenDelete(vendor.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>

      {/* Add Vendor Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Vendor" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vendor Name" placeholder="Enter company name" value={addFormData.name} onChange={(e) => setAddFormData(prev => ({ ...prev, name: e.target.value }))} />
            <Input label="Contact Name" placeholder="Enter contact person" value={addFormData.contact_name} onChange={(e) => setAddFormData(prev => ({ ...prev, contact_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="vendor@example.com" value={addFormData.email} onChange={(e) => setAddFormData(prev => ({ ...prev, email: e.target.value }))} />
            <Input label="Phone" placeholder="+212 6 XX XX XX XX" value={addFormData.phone} onChange={(e) => setAddFormData(prev => ({ ...prev, phone: e.target.value }))} />
          </div>
          <Input label="Address" placeholder="Enter full address" value={addFormData.address} onChange={(e) => setAddFormData(prev => ({ ...prev, address: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Payment Terms (days)" type="number" placeholder="e.g. 30" value={addFormData.payment_terms_days} onChange={(e) => setAddFormData(prev => ({ ...prev, payment_terms_days: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-24 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="Additional notes about vendor..." value={addFormData.notes} onChange={(e) => setAddFormData(prev => ({ ...prev, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleCreateVendor} disabled={addLoading || !addFormData.name}>
              {addLoading ? "Adding..." : "Add Vendor"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Vendor Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Vendor" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vendor Name" placeholder="Enter company name" value={editFormData.name} onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))} />
            <Input label="Contact Name" placeholder="Enter contact person" value={editFormData.contact_name} onChange={(e) => setEditFormData(prev => ({ ...prev, contact_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="vendor@example.com" value={editFormData.email} onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))} />
            <Input label="Phone" placeholder="+212 6 XX XX XX XX" value={editFormData.phone} onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))} />
          </div>
          <Input label="Address" placeholder="Enter full address" value={editFormData.address} onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Payment Terms (days)" type="number" placeholder="e.g. 30" value={editFormData.payment_terms_days} onChange={(e) => setEditFormData(prev => ({ ...prev, payment_terms_days: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-24 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="Additional notes about vendor..." value={editFormData.notes} onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleEditVendor} disabled={editLoading || !editFormData.name}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Vendor" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">Are you sure you want to delete this vendor? This action cannot be undone.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteVendor} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete Vendor"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Vendor Detail Panel */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title="Vendor Details">
        {selectedVendor && (
          <div className="space-y-6">
            {detailLoading && <div className="text-center text-sm text-gray-400 py-2">Loading details...</div>}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                {selectedVendor.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedVendor.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedVendor.contact_name}</p>
                <Badge color={selectedVendor.status === "active" ? "green" : "gray"}>{selectedVendor.status}</Badge>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex">
                {(["info", "checks", "payments", "outstanding"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setVendorTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                      vendorTab === tab
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {tab === "info" ? "Info" : tab === "checks" ? "Checks" : tab === "payments" ? "Payments" : "Outstanding"}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Tab */}
            {vendorTab === "info" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Orders</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedVendor.total_orders}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Spent</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedVendor.total_spent.toLocaleString()} MAD</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Contact Information</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" /> {selectedVendor.email}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" /> {selectedVendor.phone}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" /> {selectedVendor.address}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Payment Terms</h4>
                  <Badge color="blue">{selectedVendor.payment_terms}</Badge>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => handleOpenEdit(selectedVendor)}>Edit Vendor</Button>
                  <Button variant="primary" className="flex-1">Create Order</Button>
                </div>
              </div>
            )}

            {/* Checks Tab */}
            {vendorTab === "checks" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="primary" onClick={() => setShowAddCheckModal(true)}>
                    <Plus className="w-4 h-4" /> Add Check
                  </Button>
                </div>
                {checkDetailsLoading && <div className="text-center text-sm text-gray-400 py-4">Loading...</div>}
                {!checkDetailsLoading && vendorCheckDetails.length > 0 ? (
                  <div className="space-y-2">
                    {vendorCheckDetails.map((check) => (
                      <div key={check.id} className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{check.checked_by}</span>
                          </div>
                          <Badge color={check.status === "ok" ? "green" : check.status === "pending" ? "yellow" : "red"}>{check.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Checked At</p>
                            <p className="text-gray-900 dark:text-white">{new Date(check.checked_at).toLocaleString()}</p>
                          </div>
                          {check.notes && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Notes</p>
                              <p className="text-gray-900 dark:text-white">{check.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !checkDetailsLoading && (
                    <div className="text-center py-8">
                      <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No check details recorded for this vendor</p>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Payments Tab */}
            {vendorTab === "payments" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="primary" onClick={() => setShowAddPaymentModal(true)}>
                    <Plus className="w-4 h-4" /> Record Payment
                  </Button>
                </div>
                <div className="text-center py-8">
                  <Banknote className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No payments recorded for this vendor</p>
                </div>
              </div>
            )}

            {/* Outstanding Tab */}
            {vendorTab === "outstanding" && (
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-300">Total Outstanding</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">0 MAD</p>
                </div>
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-600 dark:text-green-400 font-medium">All invoices paid</p>
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Add Check Detail Modal */}
      <Modal isOpen={showAddCheckModal} onClose={() => setShowAddCheckModal(false)} title="Add Check Detail" size="md">
        <div className="space-y-4">
          <Input
            label="Checked At"
            type="datetime-local"
            value={checkDetailFormData.checked_at}
            onChange={(e) => setCheckDetailFormData(prev => ({ ...prev, checked_at: e.target.value }))}
          />
          <Input
            label="Checked By"
            placeholder="Inspector name"
            value={checkDetailFormData.checked_by}
            onChange={(e) => setCheckDetailFormData(prev => ({ ...prev, checked_by: e.target.value }))}
          />
          <Select
            label="Status"
            value={checkDetailFormData.status}
            onChange={(e) => setCheckDetailFormData(prev => ({ ...prev, status: e.target.value }))}
            options={[
              { value: "ok", label: "OK" },
              { value: "pending", label: "Pending" },
              { value: "issue", label: "Issue" },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <textarea
              className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-20 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              placeholder="Additional notes..."
              value={checkDetailFormData.notes}
              onChange={(e) => setCheckDetailFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddCheckModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleAddCheckDetail} disabled={addCheckLoading || !checkDetailFormData.checked_by}>
              {addCheckLoading ? "Adding..." : "Add Check Detail"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Payment Modal (placeholder — payment endpoints not in scope) */}
      <Modal isOpen={showAddPaymentModal} onClose={() => setShowAddPaymentModal(false)} title="Record Payment" size="md">
        <div className="space-y-4">
          <Input label="Amount (MAD)" type="number" value={paymentFormData.amount} onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" />
          <Select
            label="Payment Method"
            value={paymentFormData.payment_method}
            onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_method: e.target.value as "cash" | "check" | "bank_transfer" | "mobile" }))}
            options={[
              { value: "cash", label: "Cash" },
              { value: "check", label: "Check" },
              { value: "bank_transfer", label: "Bank Transfer" },
              { value: "mobile", label: "Mobile Payment" },
            ]}
          />
          <Input label="Payment Date" type="date" value={paymentFormData.payment_date} onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))} />
          <Input label="Reference Number (optional)" value={paymentFormData.reference_number} onChange={(e) => setPaymentFormData(prev => ({ ...prev, reference_number: e.target.value }))} placeholder="e.g. Check number" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <textarea
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-20 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddPaymentModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1">Record Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
