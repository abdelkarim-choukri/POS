"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  X,
  Percent,
  DollarSign,
  Ticket,
  Ban,
  Users,
  User,
  Copy,
  ChevronDown,
} from "lucide-react"

// ============== TYPES ==============
type DiscountType = "percentage" | "fixed"
type CouponStatus = "active" | "used" | "expired" | "voided"

interface CouponType {
  id: string
  name: string
  discount_type: DiscountType
  value: number
  validity_days: number
  max_uses: number
  description: string
  is_active: boolean
  created_at: string
}

interface IssuedCoupon {
  id: string
  code: string
  coupon_type_id: string
  coupon_type_name: string
  customer_id: string | null
  customer_name: string | null
  discount_type: DiscountType
  value: number
  status: CouponStatus
  issued_at: string
  expires_at: string
  used_at: string | null
}

interface Customer {
  id: string
  name: string
  email: string
  phone: string
}

// ============== MOCK DATA ==============
const mockCustomers: Customer[] = [
  { id: "1", name: "Ahmed Ben Ali", email: "ahmed@email.com", phone: "+212 612 345 678" },
  { id: "2", name: "Fatima Zahra", email: "fatima@email.com", phone: "+212 623 456 789" },
  { id: "3", name: "Youssef Amrani", email: "youssef@email.com", phone: "+212 634 567 890" },
  { id: "4", name: "Sara Benkirane", email: "sara@email.com", phone: "+212 645 678 901" },
  { id: "5", name: "Omar Tazi", email: "omar@email.com", phone: "+212 656 789 012" },
]

const mockCouponTypes: CouponType[] = [
  {
    id: "1",
    name: "Welcome Discount",
    discount_type: "percentage",
    value: 15,
    validity_days: 30,
    max_uses: 1,
    description: "Welcome discount for new customers",
    is_active: true,
    created_at: "2026-01-15",
  },
  {
    id: "2",
    name: "Loyalty Reward",
    discount_type: "fixed",
    value: 50,
    validity_days: 60,
    max_uses: 1,
    description: "Reward coupon for loyal customers",
    is_active: true,
    created_at: "2026-02-01",
  },
  {
    id: "3",
    name: "Birthday Special",
    discount_type: "percentage",
    value: 25,
    validity_days: 7,
    max_uses: 1,
    description: "Special birthday discount",
    is_active: true,
    created_at: "2026-02-15",
  },
  {
    id: "4",
    name: "Flash Sale",
    discount_type: "fixed",
    value: 20,
    validity_days: 3,
    max_uses: 1,
    description: "Limited time flash sale coupon",
    is_active: false,
    created_at: "2026-03-01",
  },
  {
    id: "5",
    name: "Referral Bonus",
    discount_type: "percentage",
    value: 10,
    validity_days: 45,
    max_uses: 3,
    description: "Discount for customer referrals",
    is_active: true,
    created_at: "2026-03-10",
  },
]

const mockIssuedCoupons: IssuedCoupon[] = [
  {
    id: "1",
    code: "WELCOME-A1B2C3",
    coupon_type_id: "1",
    coupon_type_name: "Welcome Discount",
    customer_id: "1",
    customer_name: "Ahmed Ben Ali",
    discount_type: "percentage",
    value: 15,
    status: "active",
    issued_at: "2026-05-01",
    expires_at: "2026-05-31",
    used_at: null,
  },
  {
    id: "2",
    code: "LOYALTY-D4E5F6",
    coupon_type_id: "2",
    coupon_type_name: "Loyalty Reward",
    customer_id: "2",
    customer_name: "Fatima Zahra",
    discount_type: "fixed",
    value: 50,
    status: "used",
    issued_at: "2026-04-15",
    expires_at: "2026-06-14",
    used_at: "2026-05-05",
  },
  {
    id: "3",
    code: "BDAY-G7H8I9",
    coupon_type_id: "3",
    coupon_type_name: "Birthday Special",
    customer_id: "3",
    customer_name: "Youssef Amrani",
    discount_type: "percentage",
    value: 25,
    status: "expired",
    issued_at: "2026-04-01",
    expires_at: "2026-04-08",
    used_at: null,
  },
  {
    id: "4",
    code: "WELCOME-J0K1L2",
    coupon_type_id: "1",
    coupon_type_name: "Welcome Discount",
    customer_id: "4",
    customer_name: "Sara Benkirane",
    discount_type: "percentage",
    value: 15,
    status: "voided",
    issued_at: "2026-04-20",
    expires_at: "2026-05-20",
    used_at: null,
  },
  {
    id: "5",
    code: "REFER-M3N4O5",
    coupon_type_id: "5",
    coupon_type_name: "Referral Bonus",
    customer_id: "5",
    customer_name: "Omar Tazi",
    discount_type: "percentage",
    value: 10,
    status: "active",
    issued_at: "2026-05-05",
    expires_at: "2026-06-19",
    used_at: null,
  },
  {
    id: "6",
    code: "BULK-P6Q7R8",
    coupon_type_id: "2",
    coupon_type_name: "Loyalty Reward",
    customer_id: null,
    customer_name: null,
    discount_type: "fixed",
    value: 50,
    status: "active",
    issued_at: "2026-05-08",
    expires_at: "2026-07-07",
    used_at: null,
  },
  {
    id: "7",
    code: "BULK-S9T0U1",
    coupon_type_id: "2",
    coupon_type_name: "Loyalty Reward",
    customer_id: null,
    customer_name: null,
    discount_type: "fixed",
    value: 50,
    status: "active",
    issued_at: "2026-05-08",
    expires_at: "2026-07-07",
    used_at: null,
  },
]

// ============== COMPONENTS ==============

// Badge Component
function Badge({ 
  children, 
  variant = "default" 
}: { 
  children: React.ReactNode
  variant?: "default" | "success" | "warning" | "error" | "info" | "muted"
}) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    muted: "bg-gray-100 text-gray-500",
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

// Toggle Component
function Toggle({ 
  checked, 
  onChange 
}: { 
  checked: boolean
  onChange: (checked: boolean) => void 
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

// Modal Component
function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = "md"
}: { 
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg"
}) {
  if (!isOpen) return null
  
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-card rounded-xl shadow-xl w-full ${sizes[size]} mx-4 max-h-[90vh] overflow-auto`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// Dropdown Component
function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                  value === option.value ? "bg-primary/10 text-primary" : "text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============== MAIN PAGE ==============
export default function CouponsPage() {
  // State
  const [couponTypes, setCouponTypes] = useState<CouponType[]>(mockCouponTypes)
  const [issuedCoupons, setIssuedCoupons] = useState<IssuedCoupon[]>(mockIssuedCoupons)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state for issued coupons
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<CouponStatus | "all">("all")
  
  // Modal states
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false)
  const [showIssueCouponModal, setShowIssueCouponModal] = useState(false)
  const [editingType, setEditingType] = useState<CouponType | null>(null)
  
  // Form state for Create/Edit Coupon Type
  const [typeForm, setTypeForm] = useState({
    name: "",
    discount_type: "percentage" as DiscountType,
    value: "",
    validity_days: "",
    max_uses: "",
    description: "",
  })
  
  // Form state for Issue Coupon
  const [issueForm, setIssueForm] = useState({
    coupon_type_id: "",
    issue_mode: "single" as "single" | "bulk",
    customer_id: "",
    bulk_count: "",
  })
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    apiFetch<{ data: any[] }>("/api/business/coupon-types")
      .then(res => {
        const mapped: CouponType[] = res.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          discount_type: t.type === "fixed" ? "fixed" : "percentage",
          value: t.value ?? 0,
          validity_days: t.validity_days ?? 30,
          max_uses: t.max_uses ?? 1,
          description: t.description ?? "",
          is_active: t.is_active,
          created_at: t.created_at ?? "",
        }))
        setCouponTypes(mapped)
      })
      .catch(e => setError(e.message ?? "Failed to load coupon types"))
      .finally(() => setLoading(false))
  }, [])

  // Filter issued coupons
  const filteredCoupons = issuedCoupons.filter((coupon) => {
    const matchesSearch = 
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (coupon.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesStatus = statusFilter === "all" || coupon.status === statusFilter
    return matchesSearch && matchesStatus
  })
  
  // Filtered customers for search
  const filteredCustomers = mockCustomers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  )
  
  // Handlers
  const handleOpenCreateType = () => {
    setEditingType(null)
    setTypeForm({
      name: "",
      discount_type: "percentage",
      value: "",
      validity_days: "",
      max_uses: "",
      description: "",
    })
    setShowCreateTypeModal(true)
  }
  
  const handleEditType = (type: CouponType) => {
    setEditingType(type)
    setTypeForm({
      name: type.name,
      discount_type: type.discount_type,
      value: type.value.toString(),
      validity_days: type.validity_days.toString(),
      max_uses: type.max_uses.toString(),
      description: type.description,
    })
    setShowCreateTypeModal(true)
  }
  
  const handleSaveType = () => {
    if (editingType) {
      setCouponTypes(couponTypes.map(t => 
        t.id === editingType.id 
          ? {
              ...t,
              name: typeForm.name,
              discount_type: typeForm.discount_type,
              value: parseFloat(typeForm.value) || 0,
              validity_days: parseInt(typeForm.validity_days) || 30,
              max_uses: parseInt(typeForm.max_uses) || 1,
              description: typeForm.description,
            }
          : t
      ))
    } else {
      const newType: CouponType = {
        id: Date.now().toString(),
        name: typeForm.name,
        discount_type: typeForm.discount_type,
        value: parseFloat(typeForm.value) || 0,
        validity_days: parseInt(typeForm.validity_days) || 30,
        max_uses: parseInt(typeForm.max_uses) || 1,
        description: typeForm.description,
        is_active: true,
        created_at: new Date().toISOString().split("T")[0],
      }
      setCouponTypes([...couponTypes, newType])
    }
    setShowCreateTypeModal(false)
  }
  
  const handleToggleTypeStatus = (id: string) => {
    setCouponTypes(couponTypes.map(t =>
      t.id === id ? { ...t, is_active: !t.is_active } : t
    ))
  }
  
  const handleOpenIssueCoupon = () => {
    setIssueForm({
      coupon_type_id: "",
      issue_mode: "single",
      customer_id: "",
      bulk_count: "",
    })
    setCustomerSearch("")
    setShowIssueCouponModal(true)
  }
  
  const generateCouponCode = (typeName: string) => {
    const prefix = typeName.toUpperCase().replace(/\s+/g, "").slice(0, 6)
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `${prefix}-${suffix}`
  }
  
  const handleIssueCoupons = () => {
    const selectedType = couponTypes.find(t => t.id === issueForm.coupon_type_id)
    if (!selectedType) return
    
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + selectedType.validity_days)
    const expiresAtStr = expiresAt.toISOString().split("T")[0]
    const issuedAt = new Date().toISOString().split("T")[0]
    
    if (issueForm.issue_mode === "single" && issueForm.customer_id) {
      const customer = mockCustomers.find(c => c.id === issueForm.customer_id)
      const newCoupon: IssuedCoupon = {
        id: Date.now().toString(),
        code: generateCouponCode(selectedType.name),
        coupon_type_id: selectedType.id,
        coupon_type_name: selectedType.name,
        customer_id: customer?.id || null,
        customer_name: customer?.name || null,
        discount_type: selectedType.discount_type,
        value: selectedType.value,
        status: "active",
        issued_at: issuedAt,
        expires_at: expiresAtStr,
        used_at: null,
      }
      setIssuedCoupons([newCoupon, ...issuedCoupons])
    } else if (issueForm.issue_mode === "bulk") {
      const count = parseInt(issueForm.bulk_count) || 1
      const newCoupons: IssuedCoupon[] = Array.from({ length: count }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        code: generateCouponCode(selectedType.name),
        coupon_type_id: selectedType.id,
        coupon_type_name: selectedType.name,
        customer_id: null,
        customer_name: null,
        discount_type: selectedType.discount_type,
        value: selectedType.value,
        status: "active" as CouponStatus,
        issued_at: issuedAt,
        expires_at: expiresAtStr,
        used_at: null,
      }))
      setIssuedCoupons([...newCoupons, ...issuedCoupons])
    }
    
    setShowIssueCouponModal(false)
  }
  
  const handleVoidCoupon = (id: string) => {
    setIssuedCoupons(issuedCoupons.map(c =>
      c.id === id ? { ...c, status: "voided" as CouponStatus } : c
    ))
  }
  
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
  }
  
  const getStatusBadge = (status: CouponStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>
      case "used":
        return <Badge variant="info">Used</Badge>
      case "expired":
        return <Badge variant="warning">Expired</Badge>
      case "voided":
        return <Badge variant="error">Voided</Badge>
    }
  }
  
  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Coupons</h1>
        <button
          onClick={handleOpenCreateType}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Coupon Type
        </button>
      </div>
      
      {/* Coupon Types Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Coupon Types</h2>
          </div>
          <button
            onClick={handleOpenIssueCoupon}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Issue Coupons
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Discount Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Validity Days</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {couponTypes.map((type) => (
                <tr key={type.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{type.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      {type.discount_type === "percentage" ? (
                        <Percent className="w-4 h-4 text-blue-500" />
                      ) : (
                        <DollarSign className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-sm text-foreground capitalize">{type.discount_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-foreground">
                      {type.discount_type === "percentage" ? `${type.value}%` : `${type.value} MAD`}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-foreground">{type.validity_days} days</span>
                  </td>
                  <td className="px-4 py-4">
                    <Toggle 
                      checked={type.is_active} 
                      onChange={() => handleToggleTypeStatus(type.id)} 
                    />
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleEditType(type)}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Issued Coupons Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Issued Coupons</h2>
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
              {filteredCoupons.length} coupons
            </span>
          </div>
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by code or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="w-full sm:w-48">
              <Dropdown
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as CouponStatus | "all")}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "active", label: "Active" },
                  { value: "used", label: "Used" },
                  { value: "expired", label: "Expired" },
                  { value: "voided", label: "Voided" },
                ]}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Expires At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded">
                        {coupon.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(coupon.code)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {coupon.customer_name ? (
                      <span className="text-sm text-foreground">{coupon.customer_name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-foreground">{coupon.coupon_type_name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-foreground">
                      {coupon.discount_type === "percentage" ? `${coupon.value}%` : `${coupon.value} MAD`}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(coupon.status)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-foreground">{coupon.expires_at}</span>
                  </td>
                  <td className="px-4 py-4">
                    {coupon.status === "active" && (
                      <button
                        onClick={() => handleVoidCoupon(coupon.id)}
                        className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No coupons found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Create/Edit Coupon Type Modal */}
      <Modal
        isOpen={showCreateTypeModal}
        onClose={() => setShowCreateTypeModal(false)}
        title={editingType ? "Edit Coupon Type" : "Create Coupon Type"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
            <input
              type="text"
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              placeholder="e.g., Welcome Discount"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Discount Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTypeForm({ ...typeForm, discount_type: "percentage" })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  typeForm.discount_type === "percentage"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Percent className="w-4 h-4" />
                Percentage
              </button>
              <button
                type="button"
                onClick={() => setTypeForm({ ...typeForm, discount_type: "fixed" })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  typeForm.discount_type === "fixed"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Fixed Amount
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Value {typeForm.discount_type === "percentage" ? "(%)" : "(MAD)"}
              </label>
              <input
                type="number"
                value={typeForm.value}
                onChange={(e) => setTypeForm({ ...typeForm, value: e.target.value })}
                placeholder={typeForm.discount_type === "percentage" ? "e.g., 15" : "e.g., 50"}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Validity Days</label>
              <input
                type="number"
                value={typeForm.validity_days}
                onChange={(e) => setTypeForm({ ...typeForm, validity_days: e.target.value })}
                placeholder="e.g., 30"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Max Uses Per Coupon</label>
            <input
              type="number"
              value={typeForm.max_uses}
              onChange={(e) => setTypeForm({ ...typeForm, max_uses: e.target.value })}
              placeholder="e.g., 1"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              placeholder="Describe this coupon type..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowCreateTypeModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveType}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {editingType ? "Save Changes" : "Create Type"}
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Issue Coupons Modal */}
      <Modal
        isOpen={showIssueCouponModal}
        onClose={() => setShowIssueCouponModal(false)}
        title="Issue Coupons"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Select Coupon Type</label>
            <Dropdown
              value={issueForm.coupon_type_id}
              onChange={(v) => setIssueForm({ ...issueForm, coupon_type_id: v })}
              options={couponTypes
                .filter(t => t.is_active)
                .map(t => ({
                  value: t.id,
                  label: `${t.name} (${t.discount_type === "percentage" ? `${t.value}%` : `${t.value} MAD`})`,
                }))}
              placeholder="Select a coupon type..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Issue To</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIssueForm({ ...issueForm, issue_mode: "single", bulk_count: "" })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  issueForm.issue_mode === "single"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <User className="w-4 h-4" />
                Specific Customer
              </button>
              <button
                type="button"
                onClick={() => setIssueForm({ ...issueForm, issue_mode: "bulk", customer_id: "" })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  issueForm.issue_mode === "bulk"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Users className="w-4 h-4" />
                Bulk Generate
              </button>
            </div>
          </div>
          
          {issueForm.issue_mode === "single" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Customer</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customer by name or email..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {showCustomerDropdown && customerSearch && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCustomerDropdown(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              setIssueForm({ ...issueForm, customer_id: customer.id })
                              setCustomerSearch(customer.name)
                              setShowCustomerDropdown(false)
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No customers found</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {issueForm.customer_id && (
                <p className="mt-2 text-xs text-green-600">
                  Customer selected: {mockCustomers.find(c => c.id === issueForm.customer_id)?.name}
                </p>
              )}
            </div>
          )}
          
          {issueForm.issue_mode === "bulk" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Number of Coupons to Generate</label>
              <input
                type="number"
                value={issueForm.bulk_count}
                onChange={(e) => setIssueForm({ ...issueForm, bulk_count: e.target.value })}
                placeholder="e.g., 10"
                min="1"
                max="100"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                These coupons will be unassigned and can be distributed manually.
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowIssueCouponModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleIssueCoupons}
              disabled={!issueForm.coupon_type_id || (issueForm.issue_mode === "single" && !issueForm.customer_id) || (issueForm.issue_mode === "bulk" && !issueForm.bulk_count)}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Issue Coupons
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


