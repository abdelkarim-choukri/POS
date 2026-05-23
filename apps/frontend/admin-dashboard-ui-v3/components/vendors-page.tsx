"use client"

import { useState } from "react"
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
interface VendorCheck {
  id: string
  check_number: string
  bank_name: string
  amount: number
  issue_date: string
  due_date: string
  status: "pending" | "cleared" | "bounced"
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

// Mock Data
const mockVendors: Vendor[] = [
  { id: "1", name: "Fresh Farms Produce", contact_name: "Ahmed Benali", email: "ahmed@freshfarms.ma", phone: "+212 6 12 34 56 78", address: "123 Agriculture Zone, Casablanca", payment_terms: "Net 30", status: "active", total_orders: 45, total_spent: 125000, created_at: "2024-01-15" },
  { id: "2", name: "Ocean Seafood Co.", contact_name: "Fatima Alami", email: "fatima@oceanseafood.ma", phone: "+212 6 22 33 44 55", address: "Port District, Agadir", payment_terms: "Net 15", status: "active", total_orders: 28, total_spent: 89000, created_at: "2024-02-20" },
  { id: "3", name: "Bakery Supplies Ltd", contact_name: "Karim Idrissi", email: "karim@bakerysupplies.ma", phone: "+212 6 33 44 55 66", address: "Industrial Zone, Rabat", payment_terms: "COD", status: "active", total_orders: 62, total_spent: 45000, created_at: "2024-01-05" },
  { id: "4", name: "Beverage Distributors", contact_name: "Sara Tazi", email: "sara@bevdist.ma", phone: "+212 6 44 55 66 77", address: "Commercial District, Marrakech", payment_terms: "Net 45", status: "inactive", total_orders: 15, total_spent: 32000, created_at: "2024-03-10" },
]

const mockVendorChecks: Record<string, VendorCheck[]> = {
  "1": [
    { id: "1", check_number: "CHK-001234", bank_name: "Attijariwafa Bank", amount: 15000, issue_date: "2024-01-10", due_date: "2024-02-10", status: "cleared" },
    { id: "2", check_number: "CHK-001235", bank_name: "BMCE Bank", amount: 22500, issue_date: "2024-01-20", due_date: "2024-02-20", status: "pending" },
    { id: "3", check_number: "CHK-001236", bank_name: "Attijariwafa Bank", amount: 8000, issue_date: "2024-01-25", due_date: "2024-02-25", status: "bounced" },
  ],
  "2": [
    { id: "1", check_number: "CHK-002001", bank_name: "CIH Bank", amount: 18000, issue_date: "2024-02-01", due_date: "2024-03-01", status: "pending" },
  ],
}

const mockVendorPayments: Record<string, VendorPayment[]> = {
  "1": [
    { id: "1", payment_number: "VP-2024-00001", po_number: "PO-2024001", payment_method: "bank_transfer", amount: 15000, status: "confirmed", payment_date: "2024-01-15", confirmed_by: "Admin" },
    { id: "2", payment_number: "VP-2024-00002", po_number: "PO-2024003", payment_method: "check", amount: 22500, status: "pending", payment_date: "2024-01-20", reference_number: "CHK-001235" },
    { id: "3", payment_number: "VP-2024-00003", po_number: "PO-2024005", payment_method: "cash", amount: 5000, status: "voided", payment_date: "2024-01-22", notes: "Voided due to incorrect amount" },
  ],
  "2": [
    { id: "1", payment_number: "VP-2024-00010", po_number: "PO-2024010", payment_method: "mobile", amount: 12000, status: "confirmed", payment_date: "2024-02-05", confirmed_by: "Manager" },
  ],
}

const mockOutstandingPOs: Record<string, OutstandingPO[]> = {
  "1": [
    { id: "1", po_number: "PO-2024008", total_ttc: 35000, amount_paid: 15000, balance_due: 20000, expected_delivery_date: "2024-01-10" },
    { id: "2", po_number: "PO-2024012", total_ttc: 18500, amount_paid: 0, balance_due: 18500, expected_delivery_date: "2024-02-01" },
  ],
  "2": [
    { id: "1", po_number: "PO-2024015", total_ttc: 25000, amount_paid: 12000, balance_due: 13000, expected_delivery_date: "2024-02-15" },
  ],
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

export default function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [vendorTab, setVendorTab] = useState<"info" | "checks" | "payments" | "outstanding">("info")
  const [showAddCheckModal, setShowAddCheckModal] = useState(false)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [checkFormData, setCheckFormData] = useState({ check_number: "", bank_name: "", amount: "", issue_date: "", due_date: "" })
  const [paymentFormData, setPaymentFormData] = useState({ po_number: "", amount: "", payment_method: "cash" as const, payment_date: new Date().toISOString().split("T")[0], reference_number: "", notes: "" })

  const filteredVendors = mockVendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || v.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setVendorTab("info")
    setShowDetailPanel(true)
    setShowDropdown(null)
  }

  const getVendorChecks = (vendorId: string) => mockVendorChecks[vendorId] || []
  const getVendorPayments = (vendorId: string) => mockVendorPayments[vendorId] || []
  const getOutstandingPOs = (vendorId: string) => mockOutstandingPOs[vendorId] || []
  
  const getTotalOutstanding = (vendorId: string) => {
    return getOutstandingPOs(vendorId).reduce((sum, po) => sum + po.balance_due, 0)
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

  const getCheckStatusColor = (status: string): "green" | "yellow" | "red" => {
    const colors: Record<string, "green" | "yellow" | "red"> = { cleared: "green", pending: "yellow", bounced: "red" }
    return colors[status] || "gray" as "green"
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
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockVendors.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Vendors</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockVendors.reduce((acc, v) => acc + v.total_orders, 0)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(mockVendors.reduce((acc, v) => acc + v.total_spent, 0) / 1000).toFixed(0)}K MAD</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockVendors.filter(v => v.status === "active").length}</p>
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

      {/* Vendors Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full">
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
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]">
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
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
        </table>
      </div>

      {/* Add Vendor Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Vendor" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vendor Name" placeholder="Enter company name" />
            <Input label="Contact Name" placeholder="Enter contact person" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="vendor@example.com" />
            <Input label="Phone" placeholder="+212 6 XX XX XX XX" />
          </div>
          <Input label="Address" placeholder="Enter full address" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Terms" options={[
              { value: "cod", label: "Cash on Delivery" },
              { value: "net15", label: "Net 15" },
              { value: "net30", label: "Net 30" },
              { value: "net45", label: "Net 45" },
            ]} />
            <Select label="Status" options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-24 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="Additional notes about vendor..." />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1">Add Vendor</Button>
          </div>
        </div>
      </Modal>

      {/* Vendor Detail Panel */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title="Vendor Details">
        {selectedVendor && (
          <div className="space-y-6">
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
                  <Button variant="secondary" className="flex-1">Edit Vendor</Button>
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
                {getVendorChecks(selectedVendor.id).length > 0 ? (
                  <div className="space-y-2">
                    {getVendorChecks(selectedVendor.id).map((check) => (
                      <div key={check.id} className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{check.check_number}</span>
                          </div>
                          <Badge color={getCheckStatusColor(check.status)}>{check.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Bank</p>
                            <p className="text-gray-900 dark:text-white">{check.bank_name}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Amount</p>
                            <p className="text-gray-900 dark:text-white font-mono">{check.amount.toLocaleString()} MAD</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Issue Date</p>
                            <p className="text-gray-900 dark:text-white">{check.issue_date}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Due Date</p>
                            <p className="text-gray-900 dark:text-white">{check.due_date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No checks recorded for this vendor</p>
                  </div>
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
                {getVendorPayments(selectedVendor.id).length > 0 ? (
                  <div className="space-y-2">
                    {getVendorPayments(selectedVendor.id).map((payment) => (
                      <div key={payment.id} className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{payment.payment_number}</span>
                            <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">({payment.po_number})</span>
                          </div>
                          <Badge color={payment.status === "confirmed" ? "green" : payment.status === "pending" ? "yellow" : "red"}>
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge color={getPaymentMethodBadgeColor(payment.payment_method)}>{payment.payment_method.replace("_", " ")}</Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{payment.payment_date}</span>
                          </div>
                          <span className="font-mono font-medium text-gray-900 dark:text-white">{payment.amount.toLocaleString()} MAD</span>
                        </div>
                        {payment.confirmed_by && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Confirmed by: {payment.confirmed_by}</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          {payment.status === "pending" && (
                            <Button variant="primary" className="text-xs px-2 py-1">
                              <CheckCircle className="w-3 h-3" /> Confirm
                            </Button>
                          )}
                          {payment.status !== "voided" && (
                            <Button variant="danger" className="text-xs px-2 py-1">
                              <X className="w-3 h-3" /> Void
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Banknote className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No payments recorded for this vendor</p>
                  </div>
                )}
              </div>
            )}

            {/* Outstanding Tab */}
            {vendorTab === "outstanding" && (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-300">Total Outstanding</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{getTotalOutstanding(selectedVendor.id).toLocaleString()} MAD</p>
                </div>

                {getOutstandingPOs(selectedVendor.id).length > 0 ? (
                  <div className="space-y-2">
                    {getOutstandingPOs(selectedVendor.id).map((po) => {
                      const daysOverdue = getDaysOverdue(po.expected_delivery_date)
                      return (
                        <div key={po.id} className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">{po.po_number}</span>
                            {daysOverdue > 0 && (
                              <Badge color="red">{daysOverdue} days overdue</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Total TTC</p>
                              <p className="text-gray-900 dark:text-white font-mono">{po.total_ttc.toLocaleString()} MAD</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Amount Paid</p>
                              <p className="text-green-600 dark:text-green-400 font-mono">{po.amount_paid.toLocaleString()} MAD</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Balance Due</p>
                              <p className="text-red-600 dark:text-red-400 font-mono font-medium">{po.balance_due.toLocaleString()} MAD</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Expected: {po.expected_delivery_date}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-600 dark:text-green-400 font-medium">All invoices paid</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Add Check Modal */}
      <Modal isOpen={showAddCheckModal} onClose={() => setShowAddCheckModal(false)} title="Add Check" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Check Number" value={checkFormData.check_number} onChange={(e) => setCheckFormData(prev => ({ ...prev, check_number: e.target.value }))} placeholder="CHK-XXXXXX" />
            <Input label="Bank Name" value={checkFormData.bank_name} onChange={(e) => setCheckFormData(prev => ({ ...prev, bank_name: e.target.value }))} placeholder="Bank name" />
          </div>
          <Input label="Amount (MAD)" type="number" value={checkFormData.amount} onChange={(e) => setCheckFormData(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Issue Date" type="date" value={checkFormData.issue_date} onChange={(e) => setCheckFormData(prev => ({ ...prev, issue_date: e.target.value }))} />
            <Input label="Due Date" type="date" value={checkFormData.due_date} onChange={(e) => setCheckFormData(prev => ({ ...prev, due_date: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddCheckModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1">Add Check</Button>
          </div>
        </div>
      </Modal>

      {/* Add Payment Modal */}
      <Modal isOpen={showAddPaymentModal} onClose={() => setShowAddPaymentModal(false)} title="Record Payment" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Order</label>
            <select
              value={paymentFormData.po_number}
              onChange={(e) => setPaymentFormData(prev => ({ ...prev, po_number: e.target.value }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            >
              <option value="">Select PO...</option>
              {selectedVendor && getOutstandingPOs(selectedVendor.id).map(po => (
                <option key={po.id} value={po.po_number}>{po.po_number} - Balance: {po.balance_due.toLocaleString()} MAD</option>
              ))}
            </select>
          </div>
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


