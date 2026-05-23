"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Plus,
  X,
  Eye,
  Check,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  Building2,
  FileText,
  Receipt,
  ChevronRight,
  ChevronLeft,
  Filter,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Link2,
  Ban,
  MoreHorizontal,
  Phone,
  RefreshCw,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CURRENCY,
  DATE_FORMAT,
  PAGINATION,
  getStatusColor as getStatusColorFromConstants,
  VENDOR_PAYMENTS_LABELS as LABELS,
  COMMON_LABELS,
  PERMISSION_LABELS,
} from "@/lib/constants"

// ============== TYPES ==============
type PaymentMethod = "cash" | "check" | "bank_transfer" | "mobile"
type PaymentStatus = "pending" | "confirmed" | "voided"

interface Vendor {
  id: string
  name: string
  contact_name: string
  phone: string
}

interface OutstandingPO {
  id: string
  po_number: string
  vendor_id: string
  vendor_name: string
  total_ttc: number
  amount_paid: number
  balance_due: number
  expected_delivery_date: string
  status: "partial" | "unpaid" | "paid"
}

interface VendorPayment {
  id: string
  payment_number: string
  vendor_id: string
  vendor_name: string
  po_number: string | null
  po_id: string | null
  payment_method: PaymentMethod
  amount: number
  status: PaymentStatus
  payment_date: string
  confirmed_by: string | null
  confirmed_at: string | null
  reference_number: string | null
  notes: string | null
  created_by: string
}

// ============== MOCK DATA ==============
const mockVendors: Vendor[] = [
  { id: "v1", name: "Fresh Farms Produce", contact_name: "Ahmed Benali", phone: "+212 6 12 34 56 78" },
  { id: "v2", name: "Ocean Seafood Co.", contact_name: "Fatima Alami", phone: "+212 6 22 33 44 55" },
  { id: "v3", name: "Bakery Supplies Ltd", contact_name: "Karim Idrissi", phone: "+212 6 33 44 55 66" },
  { id: "v4", name: "Beverage Distributors", contact_name: "Sara Tazi", phone: "+212 6 44 55 66 77" },
]

const mockOutstandingPOs: OutstandingPO[] = [
  { id: "po1", po_number: "PO-2024-001", vendor_id: "v1", vendor_name: "Fresh Farms Produce", total_ttc: 35000, amount_paid: 15000, balance_due: 20000, expected_delivery_date: "2024-03-10", status: "partial" },
  { id: "po2", po_number: "PO-2024-003", vendor_id: "v1", vendor_name: "Fresh Farms Produce", total_ttc: 18500, amount_paid: 0, balance_due: 18500, expected_delivery_date: "2024-03-15", status: "unpaid" },
  { id: "po3", po_number: "PO-2024-005", vendor_id: "v2", vendor_name: "Ocean Seafood Co.", total_ttc: 25000, amount_paid: 12000, balance_due: 13000, expected_delivery_date: "2024-03-12", status: "partial" },
  { id: "po4", po_number: "PO-2024-008", vendor_id: "v3", vendor_name: "Bakery Supplies Ltd", total_ttc: 8500, amount_paid: 0, balance_due: 8500, expected_delivery_date: "2024-03-18", status: "unpaid" },
  { id: "po5", po_number: "PO-2024-010", vendor_id: "v2", vendor_name: "Ocean Seafood Co.", total_ttc: 15000, amount_paid: 15000, balance_due: 0, expected_delivery_date: "2024-03-05", status: "paid" },
]

const mockPayments: VendorPayment[] = [
  { id: "vp1", payment_number: "VP-2024-00001", vendor_id: "v1", vendor_name: "Fresh Farms Produce", po_number: "PO-2024-001", po_id: "po1", payment_method: "bank_transfer", amount: 15000, status: "confirmed", payment_date: "2024-03-01", confirmed_by: "Admin", confirmed_at: "2024-03-01 14:30", reference_number: "TRF-12345", notes: null, created_by: "Staff" },
  { id: "vp2", payment_number: "VP-2024-00002", vendor_id: "v2", vendor_name: "Ocean Seafood Co.", po_number: "PO-2024-005", po_id: "po3", payment_method: "check", amount: 12000, status: "pending", payment_date: "2024-03-05", confirmed_by: null, confirmed_at: null, reference_number: "CHK-001235", notes: "Check due: March 15", created_by: "Staff" },
  { id: "vp3", payment_number: "VP-2024-00003", vendor_id: "v2", vendor_name: "Ocean Seafood Co.", po_number: "PO-2024-010", po_id: "po5", payment_method: "cash", amount: 15000, status: "confirmed", payment_date: "2024-03-03", confirmed_by: "Manager", confirmed_at: "2024-03-03 10:15", reference_number: null, notes: null, created_by: "Manager" },
  { id: "vp4", payment_number: "VP-2024-00004", vendor_id: "v1", vendor_name: "Fresh Farms Produce", po_number: null, po_id: null, payment_method: "mobile", amount: 5000, status: "voided", payment_date: "2024-03-02", confirmed_by: null, confirmed_at: null, reference_number: "MOB-9876", notes: "Voided - incorrect amount", created_by: "Staff" },
  { id: "vp5", payment_number: "VP-2024-00005", vendor_id: "v3", vendor_name: "Bakery Supplies Ltd", po_number: null, po_id: null, payment_method: "bank_transfer", amount: 3500, status: "pending", payment_date: "2024-03-08", confirmed_by: null, confirmed_at: null, reference_number: "TRF-54321", notes: "Advance payment for next order", created_by: "Admin" },
]

// ============== REUSABLE COMPONENTS ==============
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" | "indigo" | "purple" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", size = "md", className = "", disabled = false, title, ...props }: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md"
  className?: string
  disabled?: boolean
  title?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  }
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" }
  return <button className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled} title={title} {...props}>{children}</button>
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

// User permissions simulation
interface UserPermissions {
  role: "cashier" | "manager" | "owner"
  can_confirm_payment: boolean
  can_void_payment: boolean
}

const mockUserPermissions: UserPermissions = {
  role: "manager",
  can_confirm_payment: true,
  can_void_payment: true,
}

// Helper functions for formatting
function formatPrice(amount: number): string {
  return CURRENCY.format(amount)
}

function formatDate(dateStr: string): string {
  return DATE_FORMAT.formatDate(dateStr)
}

function formatDateTime(dateStr: string): string {
  return DATE_FORMAT.formatDateTime(dateStr)
}

// Skeleton Loaders
function PaymentRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-[#1F1F23]">
      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
      <td className="p-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
      <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="p-4"><Skeleton className="h-8 w-24 rounded-lg" /></td>
    </tr>
  )
}

function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
      <Skeleton className="w-10 h-10 rounded-lg mb-2" />
      <Skeleton className="h-7 w-28 mb-1" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

// ============== HELPER FUNCTIONS ==============
function getPaymentMethodIcon(method: PaymentMethod) {
  const icons: Record<PaymentMethod, React.ReactNode> = {
    cash: <Banknote className="w-3 h-3" />,
    check: <FileText className="w-3 h-3" />,
    bank_transfer: <Building2 className="w-3 h-3" />,
    mobile: <Phone className="w-3 h-3" />,
  }
  return icons[method]
}

function getPaymentMethodColor(method: PaymentMethod): "green" | "blue" | "indigo" | "purple" {
  const colors: Record<PaymentMethod, "green" | "blue" | "indigo" | "purple"> = {
    cash: "green",
    check: "blue",
    bank_transfer: "indigo",
    mobile: "purple",
  }
  return colors[method]
}

function getStatusColor(status: PaymentStatus): "green" | "yellow" | "red" {
  const colors: Record<PaymentStatus, "green" | "yellow" | "red"> = {
    confirmed: "green",
    pending: "yellow",
    voided: "red",
  }
  return colors[status]
}

function getStatusIcon(status: PaymentStatus) {
  const icons: Record<PaymentStatus, React.ReactNode> = {
    confirmed: <CheckCircle className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    voided: <XCircle className="w-3 h-3" />,
  }
  return icons[status]
}

// ============== MAIN PAGE COMPONENT ==============
export default function VendorPaymentsPage() {
  const [payments, setPayments] = useState<VendorPayment[]>(mockPayments)
  const [searchQuery, setSearchQuery] = useState("")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all")
  const [methodFilter, setMethodFilter] = useState<"all" | PaymentMethod>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [permissions] = useState<UserPermissions>(mockUserPermissions)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGINATION.defaultPageSize)
  
  // Modals & Panels
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<VendorPayment | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    vendor_id: "",
    po_id: "",
    payment_method: "cash" as PaymentMethod,
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    reference_number: "",
    notes: "",
  })

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Permission checks
  const canConfirmPayment = permissions.role === "manager" || permissions.role === "owner"
  const canVoidPayment = permissions.role === "manager" || permissions.role === "owner"

  // Stats
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const totalPaidThisMonth = payments
    .filter(p => p.status === "confirmed" && new Date(p.payment_date).getMonth() === currentMonth && new Date(p.payment_date).getFullYear() === currentYear)
    .reduce((sum, p) => sum + p.amount, 0)
  const totalOutstanding = mockOutstandingPOs.reduce((sum, po) => sum + po.balance_due, 0)
  const pendingPayments = payments.filter(p => p.status === "pending").length
  const pendingAmount = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0)

  // Filtered payments
  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.payment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.po_number && p.po_number.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesVendor = vendorFilter === "all" || p.vendor_id === vendorFilter
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    const matchesMethod = methodFilter === "all" || p.payment_method === methodFilter
    return matchesSearch && matchesVendor && matchesStatus && matchesMethod
  })

  // Get outstanding POs for selected vendor
  const vendorPOs = formData.vendor_id
    ? mockOutstandingPOs.filter(po => po.vendor_id === formData.vendor_id && po.balance_due > 0)
    : []

  const handleAddPayment = () => {
    setFormData({
      vendor_id: "",
      po_id: "",
      payment_method: "cash",
      amount: "",
      payment_date: new Date().toISOString().split("T")[0],
      reference_number: "",
      notes: "",
    })
    setShowAddModal(true)
  }

  const handleViewPayment = (payment: VendorPayment) => {
    setSelectedPayment(payment)
    setShowDetailPanel(true)
  }

  const handleConfirmPayment = (payment: VendorPayment) => {
    setSelectedPayment(payment)
    setShowConfirmModal(true)
  }

  const confirmPayment = () => {
    if (selectedPayment) {
      setPayments(prev => prev.map(p => 
        p.id === selectedPayment.id 
          ? { ...p, status: "confirmed" as PaymentStatus, confirmed_by: "Admin", confirmed_at: new Date().toISOString() }
          : p
      ))
    }
    setShowConfirmModal(false)
    setSelectedPayment(null)
  }

  const voidPayment = (paymentId: string) => {
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, status: "voided" as PaymentStatus } : p
    ))
  }

  const handlePOSelect = (poId: string) => {
    setFormData(f => ({ ...f, po_id: poId }))
    const po = mockOutstandingPOs.find(p => p.id === poId)
    if (po) {
      setFormData(f => ({ ...f, amount: po.balance_due.toString() }))
    }
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage payments to vendors</p>
        </div>
        <Button variant="primary" onClick={handleAddPayment}>
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPaidThisMonth.toLocaleString()} MAD</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid This Month</p>
        </div>
        <div className={`bg-white dark:bg-[#0F0F12] rounded-xl border ${totalOutstanding > 0 ? "border-amber-300 dark:border-amber-700" : "border-gray-200 dark:border-[#1F1F23]"} p-5`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 ${totalOutstanding > 0 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-gray-100 dark:bg-[#0F0F12]"} rounded-lg flex items-center justify-center`}>
              <DollarSign className={`w-5 h-5 ${totalOutstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>{totalOutstanding.toLocaleString()} MAD</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Outstanding</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center relative">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {pendingPayments > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 rounded-full animate-pulse" />
              )}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingPayments}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Confirmation</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments, vendors, PO numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Vendors</option>
            {mockVendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | PaymentStatus)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="voided">Voided</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as "all" | PaymentMethod)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile">Mobile</option>
          </select>
          <Button variant="secondary">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment #</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Linked PO</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Method</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredPayments.map(payment => (
              <tr 
                key={payment.id} 
                className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 cursor-pointer"
                onClick={() => handleViewPayment(payment)}
              >
                <td className="p-4">
                  <p className="font-mono text-sm text-blue-600 dark:text-blue-400">{payment.payment_number}</p>
                </td>
                <td className="p-4">
                  <p className="font-medium text-gray-900 dark:text-white">{payment.vendor_name}</p>
                </td>
                <td className="p-4">
                  {payment.po_number ? (
                    <div className="flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-gray-400" />
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{payment.po_number}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Not linked</span>
                  )}
                </td>
                <td className="p-4">
                  <Badge color={getPaymentMethodColor(payment.payment_method)}>
                    {getPaymentMethodIcon(payment.payment_method)}
                    {payment.payment_method.replace("_", " ")}
                  </Badge>
                </td>
                <td className="p-4">
                  <p className="font-semibold text-gray-900 dark:text-white">{payment.amount.toLocaleString()} MAD</p>
                </td>
                <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{payment.payment_date}</td>
                <td className="p-4">
                  <Badge color={getStatusColor(payment.status)}>
                    {getStatusIcon(payment.status)}
                    {payment.status}
                  </Badge>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {payment.status === "pending" && (
                      <>
                        <Button variant="primary" size="sm" onClick={() => handleConfirmPayment(payment)}>
                          <Check className="w-3 h-3" />
                          Confirm
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => voidPayment(payment.id)}>
                          <Ban className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {payment.status === "confirmed" && (
                      <Button variant="secondary" size="sm">
                        <Printer className="w-3 h-3" />
                        Receipt
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payments recorded yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click &quot;Record Payment&quot; to log your first vendor payment</p>
            <Button variant="primary" onClick={handleAddPayment}>
              <Plus className="w-4 h-4" />
              Record Payment
            </Button>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record Payment" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor *</label>
            <select
              value={formData.vendor_id}
              onChange={(e) => setFormData(f => ({ ...f, vendor_id: e.target.value, po_id: "", amount: "" }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            >
              <option value="">Select vendor...</option>
              {mockVendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          
          {formData.vendor_id && vendorPOs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Purchase Order (Optional)</label>
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                {vendorPOs.map(po => (
                  <label
                    key={po.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      formData.po_id === po.id 
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-[#2a2a33]" 
                        : "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#1a1a20]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="po"
                        checked={formData.po_id === po.id}
                        onChange={() => handlePOSelect(po.id)}
                        className="text-indigo-500"
                      />
                      <div>
                        <p className="font-mono text-sm text-gray-900 dark:text-white">{po.po_number}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total: {po.total_ttc.toLocaleString()} MAD</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600 dark:text-red-400">{po.balance_due.toLocaleString()} MAD</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Balance due</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method *</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(f => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile">Mobile Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (MAD) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date *</label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData(f => ({ ...f, payment_date: e.target.value }))}
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Number</label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData(f => ({ ...f, reference_number: e.target.value }))}
                placeholder="Check #, Transfer ID, etc."
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={!formData.vendor_id || !formData.amount}>
              <Check className="w-4 h-4" />
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Payment Modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Payment" size="md">
        {selectedPayment && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Payment Number</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">{selectedPayment.payment_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Vendor</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedPayment.vendor_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{selectedPayment.amount.toLocaleString()} MAD</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Method</p>
                  <Badge color={getPaymentMethodColor(selectedPayment.payment_method)}>
                    {getPaymentMethodIcon(selectedPayment.payment_method)}
                    {selectedPayment.payment_method.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                This action will confirm the payment and cannot be undone. The payment will be marked as confirmed.
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={confirmPayment}>
                <CheckCircle className="w-4 h-4" />
                Confirm Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Detail Panel */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title="Payment Details">
        {selectedPayment && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-lg text-blue-600 dark:text-blue-400">{selectedPayment.payment_number}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Created by {selectedPayment.created_by}</p>
              </div>
              <Badge color={getStatusColor(selectedPayment.status)}>
                {getStatusIcon(selectedPayment.status)}
                {selectedPayment.status}
              </Badge>
            </div>
            
            {/* Vendor Info */}
            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Vendor
              </h4>
              <p className="font-medium text-gray-900 dark:text-white">{selectedPayment.vendor_name}</p>
              {selectedPayment.po_number && (
                <div className="flex items-center gap-2 mt-2">
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{selectedPayment.po_number}</span>
                </div>
              )}
            </div>
            
            {/* Payment Info */}
            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedPayment.amount.toLocaleString()} MAD</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Method</p>
                  <Badge color={getPaymentMethodColor(selectedPayment.payment_method)}>
                    {getPaymentMethodIcon(selectedPayment.payment_method)}
                    {selectedPayment.payment_method.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Date</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedPayment.payment_date}</p>
                </div>
                {selectedPayment.reference_number && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reference</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{selectedPayment.reference_number}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Confirmation Info */}
            {selectedPayment.status === "confirmed" && selectedPayment.confirmed_by && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Confirmation
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-400">Confirmed by</p>
                    <p className="text-sm text-green-900 dark:text-green-300">{selectedPayment.confirmed_by}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-400">Confirmed at</p>
                    <p className="text-sm text-green-900 dark:text-green-300">{selectedPayment.confirmed_at}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Notes */}
            {selectedPayment.notes && (
              <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedPayment.notes}</p>
              </div>
            )}
            
            {/* Actions */}
            <div className="space-y-2">
              {selectedPayment.status === "pending" && (
                <>
                  <Button variant="primary" className="w-full" onClick={() => { setShowDetailPanel(false); handleConfirmPayment(selectedPayment); }}>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Payment
                  </Button>
                  <Button variant="danger" className="w-full" onClick={() => { voidPayment(selectedPayment.id); setShowDetailPanel(false); }}>
                    <Ban className="w-4 h-4" />
                    Void Payment
                  </Button>
                </>
              )}
              {selectedPayment.status === "confirmed" && (
                <Button variant="secondary" className="w-full">
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </Button>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  )
}



