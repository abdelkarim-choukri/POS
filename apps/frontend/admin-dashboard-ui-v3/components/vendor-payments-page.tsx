"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  X,
  Eye,
  Check,
  AlertCircle,
  Clock,
  DollarSign,
  Banknote,
  Building2,
  FileText,
  Receipt,
  Link2,
  Ban,
  Phone,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { vendorPaymentsApi, vendorsApi, purchaseOrdersApi, authApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type {
  VendorPayment,
  VendorPaymentMethod,
  VendorPaymentStatus,
} from "@/lib/merchant/types"

/**
 * Vendor Payments — TanStack Query migration.
 *
 * Ground truth (apps/backend/src/modules/inventory):
 *   - CreateVendorPaymentDto: vendor_id, amount_paid (NUMERIC, NOT `amount`),
 *     payment_date, payment_method ∈ {bank_transfer, cheque, cash, other},
 *     optional purchase_order_id / reference_number / notes.
 *   - list/get return the RAW entity: no `vendor` or `purchaseOrder` joins, so
 *     vendor name + PO number are resolved client-side from the vendors / PO lists.
 *   - amount_paid serialises as a STRING → Number() before any math/format.
 *   - confirm + void are @Roles('owner') → gated to the owner role here too.
 *   - There is NO global "total outstanding" endpoint (only per-vendor), so the
 *     stat cards show only payment-derived numbers; per-vendor outstanding lives
 *     inside the Record-Payment modal.
 */

// ============== FORMAT HELPERS ==============
const num = (v: string | number | null | undefined) => Number(v ?? 0)
const money = (v: string | number | null | undefined) =>
  num(v).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (s: string | null | undefined) => (s ? String(s).slice(0, 10) : "—")
const formatDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("fr-MA") : "—"

const METHOD_OPTIONS: { value: VendorPaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
]
const METHOD_LABEL: Record<VendorPaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  cash: "Cash",
  other: "Other",
}

// ============== REUSABLE COMPONENTS ==============
type BadgeColor = "green" | "red" | "blue" | "yellow" | "gray" | "indigo" | "purple"
function Badge({ children, color }: { children: React.ReactNode; color: BadgeColor }) {
  const colors: Record<BadgeColor, string> = {
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

function PaymentRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-[#1F1F23]">
      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
      <td className="p-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
      <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="p-4"><Skeleton className="h-8 w-24 rounded-lg" /></td>
    </tr>
  )
}

// ============== STATUS / METHOD VISUALS ==============
function getPaymentMethodIcon(method: VendorPaymentMethod) {
  const icons: Record<VendorPaymentMethod, React.ReactNode> = {
    cash: <Banknote className="w-3 h-3" />,
    cheque: <FileText className="w-3 h-3" />,
    bank_transfer: <Building2 className="w-3 h-3" />,
    other: <Phone className="w-3 h-3" />,
  }
  return icons[method] ?? <DollarSign className="w-3 h-3" />
}
function getPaymentMethodColor(method: VendorPaymentMethod): BadgeColor {
  const colors: Record<VendorPaymentMethod, BadgeColor> = {
    cash: "green",
    cheque: "blue",
    bank_transfer: "indigo",
    other: "purple",
  }
  return colors[method] ?? "gray"
}
function getStatusColor(status: VendorPaymentStatus): BadgeColor {
  const colors: Record<VendorPaymentStatus, BadgeColor> = {
    confirmed: "green",
    pending: "yellow",
    voided: "red",
  }
  return colors[status] ?? "gray"
}
function getStatusIcon(status: VendorPaymentStatus) {
  const icons: Record<VendorPaymentStatus, React.ReactNode> = {
    confirmed: <CheckCircle className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    voided: <XCircle className="w-3 h-3" />,
  }
  return icons[status] ?? null
}

// ============== MAIN PAGE ==============
const EMPTY_FORM = {
  vendor_id: "",
  purchase_order_id: "",
  payment_method: "bank_transfer" as VendorPaymentMethod,
  amount_paid: "",
  payment_date: new Date().toISOString().slice(0, 10),
  reference_number: "",
  notes: "",
}

export default function VendorPaymentsPage() {
  const queryClient = useQueryClient()

  // ── Filters / UI state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | VendorPaymentStatus>("all")
  const [methodFilter, setMethodFilter] = useState<"all" | VendorPaymentMethod>("all")
  const [formError, setFormError] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidReason, setVoidReason] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  // ── Queries ───────────────────────────────────────────────────────────────
  const meQuery = useQuery({ queryKey: merchantKeys.auth.me(), queryFn: authApi.me })
  const isOwner = meQuery.data?.role === "owner"

  const paymentsQuery = useQuery({
    queryKey: merchantKeys.vendorPayments.list("all"),
    queryFn: () => vendorPaymentsApi.list(),
  })
  const payments = paymentsQuery.data ?? []

  const vendorsQuery = useQuery({
    queryKey: merchantKeys.vendors.list(),
    queryFn: vendorsApi.list,
  })
  const vendors = vendorsQuery.data ?? []

  // PO list only to resolve purchase_order_id → po_number on the table.
  const poQuery = useQuery({
    queryKey: merchantKeys.purchaseOrders.list("all"),
    queryFn: () => purchaseOrdersApi.list(),
  })
  const vendorName = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of vendors) m.set(v.id, v.name)
    return m
  }, [vendors])
  const poNumber = useMemo(() => {
    const m = new Map<string, string>()
    for (const po of poQuery.data ?? []) m.set(po.id, po.po_number)
    return m
  }, [poQuery.data])

  // Per-vendor outstanding POs + summary — only for the create modal.
  const outstandingQuery = useQuery({
    queryKey: merchantKeys.vendorPayments.outstanding(form.vendor_id),
    queryFn: () => vendorPaymentsApi.outstanding(form.vendor_id),
    enabled: showAddModal && !!form.vendor_id,
  })
  const summaryQuery = useQuery({
    queryKey: merchantKeys.vendorPayments.summary(form.vendor_id),
    queryFn: () => vendorPaymentsApi.summary(form.vendor_id),
    enabled: showAddModal && !!form.vendor_id,
  })
  const vendorPOs = (outstandingQuery.data ?? []).filter((po) => num(po.balance_due) > 0)

  const selectedPayment = useMemo(
    () => payments.find((p) => p.id === selectedId) ?? null,
    [payments, selectedId],
  )

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: merchantKeys.vendorPayments.all })

  const createMutation = useMutation({
    mutationFn: () =>
      vendorPaymentsApi.create({
        vendor_id: form.vendor_id,
        amount_paid: num(form.amount_paid),
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        ...(form.purchase_order_id ? { purchase_order_id: form.purchase_order_id } : {}),
        ...(form.reference_number.trim() ? { reference_number: form.reference_number.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      }),
    onSuccess: () => {
      invalidate()
      setShowAddModal(false)
      setForm(EMPTY_FORM)
    },
    onError: (e) => setFormError(humanizeError(e, "Failed to record payment.")),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => vendorPaymentsApi.confirm(id),
    onSuccess: () => {
      invalidate()
      setShowConfirmModal(false)
    },
    onError: (e) => setFormError(humanizeError(e, "Failed to confirm payment.")),
  })

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      vendorPaymentsApi.void(id, reason),
    onSuccess: () => {
      invalidate()
      setShowVoidModal(false)
      setShowDetailPanel(false)
      setVoidReason("")
    },
    onError: (e) => setFormError(humanizeError(e, "Failed to void payment.")),
  })

  // ── Derived ───────────────────────────────────────────────────────────────
  const now = new Date()
  const totalPaidThisMonth = payments
    .filter((p) => {
      if (p.status !== "confirmed") return false
      const d = new Date(p.payment_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, p) => s + num(p.amount_paid), 0)
  const pendingList = payments.filter((p) => p.status === "pending")
  const pendingCount = pendingList.length
  const pendingAmount = pendingList.reduce((s, p) => s + num(p.amount_paid), 0)

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.trim().toLowerCase()
    const vName = vendorName.get(p.vendor_id) ?? ""
    const poNum = p.purchase_order_id ? poNumber.get(p.purchase_order_id) ?? "" : ""
    const matchesSearch =
      !q ||
      p.payment_number.toLowerCase().includes(q) ||
      vName.toLowerCase().includes(q) ||
      poNum.toLowerCase().includes(q)
    const matchesVendor = vendorFilter === "all" || p.vendor_id === vendorFilter
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    const matchesMethod = methodFilter === "all" || p.payment_method === methodFilter
    return matchesSearch && matchesVendor && matchesStatus && matchesMethod
  })

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowAddModal(true)
  }
  const openDetail = (id: string) => {
    setSelectedId(id)
    setShowDetailPanel(true)
  }
  const openConfirm = (id: string) => {
    setSelectedId(id)
    setFormError(null)
    setShowConfirmModal(true)
  }
  const openVoid = (id: string) => {
    setSelectedId(id)
    setVoidReason("")
    setFormError(null)
    setShowVoidModal(true)
  }
  const selectPO = (poId: string) => {
    const po = vendorPOs.find((p) => p.id === poId)
    setForm((f) => ({
      ...f,
      purchase_order_id: f.purchase_order_id === poId ? "" : poId,
      amount_paid: po && f.purchase_order_id !== poId ? num(po.balance_due).toFixed(2) : f.amount_paid,
    }))
  }

  const listError = paymentsQuery.isError
    ? humanizeError(paymentsQuery.error, "Failed to load vendor payments.")
    : null

  return (
    <div className="h-full">
      {(formError || listError) && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{formError || listError}</span>
          <button onClick={() => setFormError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage payments to vendors</p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      {/* Stats — payment-derived only (no global outstanding endpoint) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{money(totalPaidThisMonth)} MAD</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Confirmed This Month</p>
        </div>
        <div className={`bg-white dark:bg-[#0F0F12] rounded-xl border ${pendingAmount > 0 ? "border-amber-300 dark:border-amber-700" : "border-gray-200 dark:border-[#1F1F23]"} p-5`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 ${pendingAmount > 0 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-gray-100 dark:bg-[#0F0F12]"} rounded-lg flex items-center justify-center`}>
              <DollarSign className={`w-5 h-5 ${pendingAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${pendingAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>{money(pendingAmount)} MAD</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Amount</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center relative">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 rounded-full animate-pulse" />}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
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
          <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
            <option value="all">All Vendors</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | VendorPaymentStatus)} className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="voided">Voided</option>
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as "all" | VendorPaymentMethod)} className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
            <option value="all">All Methods</option>
            {METHOD_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>
              {["Payment #", "Vendor", "Linked PO", "Method", "Amount", "Date", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paymentsQuery.isLoading
              ? Array.from({ length: 5 }).map((_, i) => <PaymentRowSkeleton key={i} />)
              : filteredPayments.map((payment) => {
                  const poNum = payment.purchase_order_id ? poNumber.get(payment.purchase_order_id) : null
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 cursor-pointer" onClick={() => openDetail(payment.id)}>
                      <td className="p-4"><p className="font-mono text-sm text-blue-600 dark:text-blue-400">{payment.payment_number}</p></td>
                      <td className="p-4"><p className="font-medium text-gray-900 dark:text-white">{vendorName.get(payment.vendor_id) ?? "—"}</p></td>
                      <td className="p-4">
                        {poNum ? (
                          <div className="flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-gray-400" />
                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{poNum}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Not linked</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge color={getPaymentMethodColor(payment.payment_method)}>
                          {getPaymentMethodIcon(payment.payment_method)}
                          {METHOD_LABEL[payment.payment_method] ?? payment.payment_method}
                        </Badge>
                      </td>
                      <td className="p-4"><p className="font-semibold text-gray-900 dark:text-white">{money(payment.amount_paid)} MAD</p></td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(payment.payment_date)}</td>
                      <td className="p-4">
                        <Badge color={getStatusColor(payment.status)}>
                          {getStatusIcon(payment.status)}
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {payment.status === "pending" && isOwner && (
                            <>
                              <Button variant="primary" size="sm" onClick={() => openConfirm(payment.id)}>
                                <Check className="w-3 h-3" />
                                Confirm
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => openVoid(payment.id)} title="Void">
                                <Ban className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openDetail(payment.id)} title="View">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>

        {!paymentsQuery.isLoading && filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payments recorded yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click &quot;Record Payment&quot; to log your first vendor payment</p>
            <Button variant="primary" onClick={openAdd}>
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
              value={form.vendor_id}
              onChange={(e) => setForm((f) => ({ ...f, vendor_id: e.target.value, purchase_order_id: "", amount_paid: "" }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            >
              <option value="">Select vendor...</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          {form.vendor_id && summaryQuery.data && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{money(summaryQuery.data.total_paid)}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{money(summaryQuery.data.total_outstanding)}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Payments</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{summaryQuery.data.payment_count}</p>
              </div>
            </div>
          )}

          {form.vendor_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Purchase Order (Optional)</label>
              {outstandingQuery.isLoading ? (
                <Skeleton className="h-16 w-full rounded-lg" />
              ) : vendorPOs.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 p-2">No outstanding purchase orders for this vendor.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                  {vendorPOs.map((po) => (
                    <label
                      key={po.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        form.purchase_order_id === po.id
                          ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-[#2a2a33]"
                          : "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#1a1a20]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="radio" name="po" checked={form.purchase_order_id === po.id} onChange={() => selectPO(po.id)} className="text-indigo-500" />
                        <div>
                          <p className="font-mono text-sm text-gray-900 dark:text-white">{po.po_number}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total: {money(po.total_ttc)} MAD</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600 dark:text-red-400">{money(po.balance_due)} MAD</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Balance due</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method *</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value as VendorPaymentMethod }))}
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                {METHOD_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (MAD) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount_paid}
                onChange={(e) => setForm((f) => ({ ...f, amount_paid: e.target.value }))}
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
                value={form.payment_date}
                onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Number</label>
              <input
                type="text"
                value={form.reference_number}
                onChange={(e) => setForm((f) => ({ ...f, reference_number: e.target.value }))}
                placeholder="Cheque #, Transfer ID, etc."
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={!form.vendor_id || num(form.amount_paid) < 0.01 || createMutation.isPending}
              onClick={() => { setFormError(null); createMutation.mutate() }}
            >
              <Check className="w-4 h-4" />
              {createMutation.isPending ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Payment Modal (owner-only) */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Payment" size="md">
        {selectedPayment && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Payment Number</p>
                <p className="font-mono text-sm text-gray-900 dark:text-white">{selectedPayment.payment_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Vendor</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{vendorName.get(selectedPayment.vendor_id) ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{money(selectedPayment.amount_paid)} MAD</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Method</p>
                <Badge color={getPaymentMethodColor(selectedPayment.payment_method)}>
                  {getPaymentMethodIcon(selectedPayment.payment_method)}
                  {METHOD_LABEL[selectedPayment.payment_method] ?? selectedPayment.payment_method}
                </Badge>
              </div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                This will mark the payment as confirmed.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate(selectedPayment.id)}>
                <CheckCircle className="w-4 h-4" />
                {confirmMutation.isPending ? "Confirming..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Void Payment Modal (owner-only) */}
      <Modal isOpen={showVoidModal} onClose={() => { setShowVoidModal(false); setVoidReason("") }} title="Void Payment" size="sm">
        {selectedPayment && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You are about to void payment <span className="font-mono font-semibold text-gray-900 dark:text-white">{selectedPayment.payment_number}</span>. This action cannot be undone.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Reason for voiding this payment..."
                rows={3}
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowVoidModal(false); setVoidReason("") }}>Cancel</Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={!voidReason.trim() || voidMutation.isPending}
                onClick={() => voidMutation.mutate({ id: selectedPayment.id, reason: voidReason.trim() })}
              >
                <Ban className="w-4 h-4" />
                {voidMutation.isPending ? "Voiding..." : "Void Payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Detail Panel */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title="Payment Details">
        {selectedPayment && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-lg text-blue-600 dark:text-blue-400">{selectedPayment.payment_number}</p>
              <Badge color={getStatusColor(selectedPayment.status)}>
                {getStatusIcon(selectedPayment.status)}
                {selectedPayment.status}
              </Badge>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Vendor
              </h4>
              <p className="font-medium text-gray-900 dark:text-white">{vendorName.get(selectedPayment.vendor_id) ?? "—"}</p>
              {selectedPayment.purchase_order_id && (
                <div className="flex items-center gap-2 mt-2">
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{poNumber.get(selectedPayment.purchase_order_id) ?? selectedPayment.purchase_order_id}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{money(selectedPayment.amount_paid)} MAD</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Method</p>
                  <Badge color={getPaymentMethodColor(selectedPayment.payment_method)}>
                    {getPaymentMethodIcon(selectedPayment.payment_method)}
                    {METHOD_LABEL[selectedPayment.payment_method] ?? selectedPayment.payment_method}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Date</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedPayment.payment_date)}</p>
                </div>
                {selectedPayment.reference_number && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reference</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{selectedPayment.reference_number}</p>
                  </div>
                )}
              </div>
            </div>

            {selectedPayment.status === "confirmed" && selectedPayment.confirmed_at && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Confirmed
                </h4>
                <p className="text-sm text-green-900 dark:text-green-300">{formatDateTime(selectedPayment.confirmed_at)}</p>
              </div>
            )}

            {selectedPayment.notes && (
              <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedPayment.notes}</p>
              </div>
            )}

            {selectedPayment.status === "pending" && isOwner && (
              <div className="space-y-2">
                <Button variant="primary" className="w-full" onClick={() => { setShowDetailPanel(false); openConfirm(selectedPayment.id) }}>
                  <CheckCircle className="w-4 h-4" />
                  Confirm Payment
                </Button>
                <Button variant="danger" className="w-full" onClick={() => { setShowDetailPanel(false); openVoid(selectedPayment.id) }}>
                  <Ban className="w-4 h-4" />
                  Void Payment
                </Button>
              </div>
            )}
            {selectedPayment.status === "pending" && !isOwner && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Only an owner can confirm or void payments.</p>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
