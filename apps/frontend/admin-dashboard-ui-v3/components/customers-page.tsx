"use client"

import { useState, useEffect, useRef } from "react"
import { apiFetch, getToken } from "@/lib/api"
import {
  Search,
  Plus,
  Users,
  TrendingUp,
  Star,
  Award,
  X,
  ChevronDown,
  Eye,
  Pencil,
  MoreHorizontal,
  Tag,
  History,
  Receipt,
  Check,
  Lock,
  Gift,
  Settings2,
  Calendar,
  ToggleLeft,
  Type,
  Hash,
  Trash2,
  Upload,
  Layers,
} from "lucide-react"

// ============== TYPES ==============
interface CustomerAttribute {
  id: string
  attribute_name: string
  data_type: "text" | "number" | "boolean" | "date"
  is_required: boolean
}

interface CustomerAttributeValue {
  attribute_id: string
  value: string | number | boolean | null
}

interface ExchangeRule {
  id: string
  name: string
  point_value: number
  reward_type: "discount" | "free_product"
  reward_value: string
  description?: string
}

interface CustomerLabel {
  id: string
  name: string
  color: string
}

interface CustomerGrade {
  id: string
  name: string
  color?: string
  min_points: number
  points_multiplier: number
}

interface PointsHistory {
  id: string
  date: string
  type: "earned" | "spent"
  amount: number
  reason: string
}

interface CustomerTransaction {
  id: string
  transaction_number: string
  date: string
  total: number
  items: string[]
}

interface Customer {
  id: string
  customer_code?: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  grade: "Bronze" | "Silver" | "Gold" | "Platinum"
  grade_id?: string
  grade_obj?: { name: string; color: string }
  points_balance: number
  total_spent: number
  visit_count?: number
  labels: CustomerLabel[]
  last_visit: string
  is_active?: boolean
  created_at?: string
  notes?: string
  points_history: PointsHistory[]
  transactions: CustomerTransaction[]
  attribute_values?: CustomerAttributeValue[]
}

interface DashboardStats {
  total_customers: number
  new_this_month: number
  total_points_issued: number
  total_spent: number
}

const mockExchangeRules: ExchangeRule[] = [
  { id: "1", name: "Free Coffee", point_value: 500, reward_type: "free_product", reward_value: "Cappuccino", description: "Redeem for a free Cappuccino" },
  { id: "2", name: "10% Discount", point_value: 1000, reward_type: "discount", reward_value: "10%", description: "10% off your next order" },
  { id: "3", name: "Free Pastry", point_value: 300, reward_type: "free_product", reward_value: "Croissant", description: "Redeem for a free Croissant" },
  { id: "4", name: "25% Discount", point_value: 2500, reward_type: "discount", reward_value: "25%", description: "25% off your next order" },
  { id: "5", name: "Free Breakfast Set", point_value: 5000, reward_type: "free_product", reward_value: "Breakfast Set", description: "Full breakfast combo" },
]

// ============== REUSABLE COMPONENTS ==============
function Badge({ color, children }: { color: "green" | "red" | "blue" | "yellow" | "gray" | "purple" | "amber" | "pink"; children: React.ReactNode }) {
  const colorClasses = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  }
  return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center ${colorClasses[color]}`}>{children}</span>
}

function Button({ variant = "primary", children, className = "", ...props }: { variant?: "primary" | "secondary" | "ghost" | "danger"; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-300 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#2a2a32] text-gray-700 dark:text-gray-200",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a20] text-gray-600 dark:text-gray-400",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  }
  return <button className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${variants[variant]} ${className}`} {...props}>{children}</button>
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 focus:border-transparent w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props} />
    </div>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  if (!isOpen) return null
  const sizeClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function SlidePanel({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[560px] bg-white dark:bg-[#0F0F12] shadow-2xl border-l border-gray-200 dark:border-[#1F1F23] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function GradeBadge({ grade }: { grade: Customer["grade"] }) {
  const gradeColors = {
    Bronze: "amber",
    Silver: "gray",
    Gold: "yellow",
    Platinum: "purple",
  } as const
  return <Badge color={gradeColors[grade]}>{grade}</Badge>
}

function LabelPill({ label }: { label: CustomerLabel }) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colorMap[label.color] || "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400"}`}>
      {label.name}
    </span>
  )
}

// ============== STAT CARD ==============
function StatCard({ title, value, icon: Icon, iconBg, change }: { title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; iconBg: string; change?: string }) {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {change && (
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />{change}
        </p>
      )}
    </div>
  )
}

// ============== MULTI SELECT DROPDOWN ==============
function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange
}: {
  label: string
  options: CustomerLabel[]
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20] min-w-[140px] bg-white dark:bg-[#0F0F12]"
      >
        <Tag className="w-4 h-4" />
        {label}
        {selected.length > 0 && (
          <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs px-1.5 rounded-full">{selected.length}</span>
        )}
        <ChevronDown className="w-4 h-4 ml-auto" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg z-10 min-w-[200px]">
            {options.map(option => (
              <button
                key={option.id}
                onClick={() => toggleOption(option.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#1a1a20]"
              >
                <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(option.id) ? 'bg-indigo-600 border-indigo-500' : 'border-gray-300 dark:border-[#2a2a33]'}`}>
                  {selected.includes(option.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <LabelPill label={option} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============== CUSTOMERS PAGE ==============
export default function CustomersPage() {
  // Page-level tab: customers list, grades management, labels management, attributes management
  const [pageTab, setPageTab] = useState<"customers" | "grades" | "labels" | "attributes">("customers")

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [gradeFilter, setGradeFilter] = useState<string>("all")
  const [labelFilter, setLabelFilter] = useState<string[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [detailTab, setDetailTab] = useState<"points" | "transactions" | "labels" | "attributes">("points")

  // Dashboard summary stats from API
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Grades & Labels from API
  const [grades, setGrades] = useState<CustomerGrade[]>([])
  const [gradesLoading, setGradesLoading] = useState(false)
  const [labels, setLabels] = useState<CustomerLabel[]>([])
  const [labelsLoading, setLabelsLoading] = useState(false)
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([])
  const [pointsHistoryLoading, setPointsHistoryLoading] = useState(false)

  // Grade management modals
  const [showAddGradeModal, setShowAddGradeModal] = useState(false)
  const [showEditGradeModal, setShowEditGradeModal] = useState(false)
  const [editingGrade, setEditingGrade] = useState<CustomerGrade | null>(null)
  const [gradeFormData, setGradeFormData] = useState({ name: "", min_points: 0, color: "gray", points_multiplier: 1 })

  // Label management modals
  const [showAddLabelModal, setShowAddLabelModal] = useState(false)
  const [showEditLabelModal, setShowEditLabelModal] = useState(false)
  const [editingLabel, setEditingLabel] = useState<CustomerLabel | null>(null)
  const [labelFormData, setLabelFormData] = useState({ name: "", color: "gray" })

  // Points adjustment state
  const [showPointsAdjModal, setShowPointsAdjModal] = useState(false)
  const [pointsAdjDelta, setPointsAdjDelta] = useState("")
  const [pointsAdjReason, setPointsAdjReason] = useState("")

  // Attributes state — loaded from API
  const [attributes, setAttributes] = useState<CustomerAttribute[]>([])
  const [attributesLoading, setAttributesLoading] = useState(false)
  const [showAddAttributeModal, setShowAddAttributeModal] = useState(false)
  const [showEditAttributeModal, setShowEditAttributeModal] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState<CustomerAttribute | null>(null)
  const [attributeFormData, setAttributeFormData] = useState({ attribute_name: "", data_type: "text" as "text" | "number" | "boolean" | "date", is_required: false })
  const [customerAttributeValues, setCustomerAttributeValues] = useState<Record<string, CustomerAttributeValue[]>>({})
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [selectedReward, setSelectedReward] = useState<ExchangeRule | null>(null)

  // Form state for add/edit customer
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notes: "",
    labels: [] as string[],
  })

  // ── Fetch dashboard summary stats on mount ──────────────────────────────────
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true)
      try {
        const res = await apiFetch<DashboardStats>("/api/business/customers/dashboard-summary")
        setDashboardStats(res)
      } catch {
        // Non-blocking: fall through to computed fallback
      } finally {
        setStatsLoading(false)
      }
    }
    loadStats()
  }, [])

  // ── Fetch grades and labels on mount ────────────────────────────────────────
  useEffect(() => {
    const loadGradesAndLabels = async () => {
      setGradesLoading(true)
      setLabelsLoading(true)
      try {
        const [gradesRes, labelsRes] = await Promise.all([
          apiFetch<any[]>("/api/business/customer-grades"),
          apiFetch<any[]>("/api/business/customer-labels"),
        ])
        setGrades(
          (gradesRes ?? []).map((g: any) => ({
            id: g.id,
            name: g.name,
            color: g.color ?? "gray",
            min_points: g.min_points ?? 0,
            points_multiplier: g.points_multiplier ?? 1,
          }))
        )
        setLabels(
          (labelsRes ?? []).map((l: any) => ({ id: l.id, name: l.name, color: l.color ?? "gray" }))
        )
      } catch (e: any) {
        setError(e.message ?? "Failed to load grades/labels")
      } finally {
        setGradesLoading(false)
        setLabelsLoading(false)
      }
    }
    loadGradesAndLabels()
  }, [])

  // ── Fetch attributes on mount ────────────────────────────────────────────────
  useEffect(() => {
    const loadAttributes = async () => {
      setAttributesLoading(true)
      try {
        const res = await apiFetch<any[]>("/api/business/customer-attributes")
        setAttributes(
          (res ?? []).map((a: any) => ({
            id: a.id,
            attribute_name: a.attribute_name,
            data_type: a.data_type ?? "text",
            is_required: a.is_required ?? false,
          }))
        )
      } catch (e: any) {
        setError(e.message ?? "Failed to load attributes")
      } finally {
        setAttributesLoading(false)
      }
    }
    loadAttributes()
  }, [])

  // ── Fetch customers from API with debounced search ───────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: "1", limit: "50" })
        if (searchQuery) params.set("search", searchQuery)
        const res = await apiFetch<{ data: any[]; total: number; page: number; limit: number }>(
          `/api/business/customers?${params}`
        )
        const mapped: Customer[] = res.data.map((c: any) => ({
          id: c.id,
          customer_code: c.customer_code,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          phone: c.phone,
          grade: (c.grade?.name ?? "Bronze") as Customer["grade"],
          grade_id: c.grade_id,
          grade_obj: c.grade,
          points_balance: c.points_balance ?? 0,
          total_spent: c.total_spent ?? 0,
          visit_count: c.visit_count ?? 0,
          labels: [],
          last_visit: c.created_at ? c.created_at.split("T")[0] : "",
          is_active: c.is_active,
          created_at: c.created_at,
          notes: undefined,
          points_history: [],
          transactions: [],
        }))
        setCustomers(mapped)
      } catch (e: any) {
        setError(e.message ?? "Failed to load customers")
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // ── Computed stats (fallback when summary API is unavailable) ─────────────
  const computedStats = {
    totalCustomers: customers.length,
    activeThisMonth: customers.filter(c => {
      const lastVisit = new Date(c.last_visit)
      const now = new Date()
      return lastVisit.getMonth() === now.getMonth() && lastVisit.getFullYear() === now.getFullYear()
    }).length,
    totalPoints: customers.reduce((sum, c) => sum + c.points_balance, 0),
    avgGrade: (() => {
      const gradeValues = { Bronze: 1, Silver: 2, Gold: 3, Platinum: 4 }
      const avg = customers.reduce((sum, c) => sum + (gradeValues[c.grade] ?? 1), 0) / (customers.length || 1)
      if (avg >= 3.5) return "Platinum"
      if (avg >= 2.5) return "Gold"
      if (avg >= 1.5) return "Silver"
      return "Bronze"
    })(),
  }

  const displayStats = {
    totalCustomers: dashboardStats?.total_customers ?? computedStats.totalCustomers,
    newThisMonth: dashboardStats?.new_this_month ?? computedStats.activeThisMonth,
    totalPointsIssued: dashboardStats?.total_points_issued ?? computedStats.totalPoints,
    totalSpent: dashboardStats?.total_spent ?? customers.reduce((sum, c) => sum + c.total_spent, 0),
  }

  // ── Filter customers ────────────────────────────────────────────────────────
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === "" ||
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery)

    const matchesGrade = gradeFilter === "all" || customer.grade === gradeFilter

    const matchesLabels = labelFilter.length === 0 ||
      customer.labels.some(label => labelFilter.includes(label.id))

    return matchesSearch && matchesGrade && matchesLabels
  })

  // ── Customer handlers ───────────────────────────────────────────────────────
  const handleView = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setDetailTab("points")
    setShowDetailPanel(true)
    setPointsHistory([])
    setPointsHistoryLoading(true)
    try {
      const res = await apiFetch<{ data: any[]; total: number }>(
        `/api/business/customers/${customer.id}/points-history?page=1&limit=50`
      )
      const mapped: PointsHistory[] = (res.data ?? []).map((h: any) => ({
        id: h.id,
        date: h.created_at ? h.created_at.split("T")[0] : "",
        type: h.delta > 0 ? "earned" : "spent",
        amount: Math.abs(h.delta),
        reason: h.reason ?? "",
      }))
      setPointsHistory(mapped)
    } catch {
      // Non-blocking: history section shows empty state
    } finally {
      setPointsHistoryLoading(false)
    }
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete ${customer.first_name} ${customer.last_name}? This cannot be undone.`)) return
    try {
      await apiFetch(`/api/business/customers/${customer.id}`, { method: "DELETE" })
      setCustomers(prev => prev.filter(c => c.id !== customer.id))
    } catch (e: any) {
      setError(e.message ?? "Failed to delete customer")
    }
  }

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
      labels: customer.labels.map(l => l.id),
    })
    setShowEditModal(true)
  }

  const handleAddCustomer = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      notes: "",
      labels: [],
    })
    setShowAddModal(true)
  }

  const handleSaveCustomer = async () => {
    if (showEditModal && selectedCustomer) {
      try {
        const updated = await apiFetch<any>(`/api/business/customers/${selectedCustomer.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            notes: formData.notes || undefined,
          }),
        })
        setCustomers(prev => prev.map(c =>
          c.id === selectedCustomer.id
            ? { ...c, first_name: updated.first_name, last_name: updated.last_name, email: updated.email, phone: updated.phone }
            : c
        ))
      } catch (e: any) {
        setError(e.message ?? "Failed to update customer")
      }
      setShowEditModal(false)
    } else if (showAddModal) {
      try {
        const created = await apiFetch<any>("/api/business/customers", {
          method: "POST",
          body: JSON.stringify({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            notes: formData.notes || undefined,
          }),
        })
        // Assign selected labels to the new customer if any were picked
        let assignedLabels: CustomerLabel[] = []
        if (formData.labels.length > 0) {
          try {
            await apiFetch(`/api/business/customers/${created.id}/labels`, {
              method: "PUT",
              body: JSON.stringify({ label_ids: formData.labels }),
            })
            assignedLabels = labels.filter(l => formData.labels.includes(l.id))
          } catch {
            // Non-blocking: customer was created; label assignment failed silently
          }
        }
        const newCustomer: Customer = {
          id: created.id,
          customer_code: created.customer_code,
          first_name: created.first_name,
          last_name: created.last_name,
          email: created.email,
          phone: created.phone,
          grade: "Bronze",
          points_balance: 0,
          total_spent: 0,
          labels: assignedLabels,
          last_visit: new Date().toISOString().split("T")[0],
          notes: formData.notes || undefined,
          points_history: [],
          transactions: [],
        }
        setCustomers(prev => [...prev, newCustomer])
      } catch (e: any) {
        setError(e.message ?? "Failed to create customer")
      }
      setShowAddModal(false)
    }
  }

  const handleToggleLabel = async (labelId: string) => {
    if (!selectedCustomer) return
    const hasLabel = selectedCustomer.labels.some(l => l.id === labelId)
    const updatedLabelObjs = hasLabel
      ? selectedCustomer.labels.filter(l => l.id !== labelId)
      : [...selectedCustomer.labels, labels.find(l => l.id === labelId)!].filter(Boolean)
    const updatedLabelIds = updatedLabelObjs.map(l => l.id)
    try {
      await apiFetch(`/api/business/customers/${selectedCustomer.id}/labels`, {
        method: "PUT",
        body: JSON.stringify({ label_ids: updatedLabelIds }),
      })
      setCustomers(prev => prev.map(c =>
        c.id === selectedCustomer.id ? { ...c, labels: updatedLabelObjs } : c
      ))
      setSelectedCustomer(prev => prev ? { ...prev, labels: updatedLabelObjs } : null)
    } catch (e: any) {
      setError(e.message ?? "Failed to update labels")
    }
  }

  const handlePointsAdjustment = async () => {
    if (!selectedCustomer) return
    const delta = parseInt(pointsAdjDelta, 10)
    if (isNaN(delta) || delta === 0) { setError("Enter a non-zero integer for the points delta."); return }
    if (!pointsAdjReason.trim()) { setError("Reason is required."); return }
    try {
      const res = await apiFetch<{ points_balance: number }>(`/api/business/customers/${selectedCustomer.id}/points-adjustment`, {
        method: "POST",
        body: JSON.stringify({ delta, reason: pointsAdjReason.trim() }),
      })
      const newBalance = res.points_balance ?? (selectedCustomer.points_balance + delta)
      setCustomers(prev => prev.map(c =>
        c.id === selectedCustomer.id ? { ...c, points_balance: newBalance } : c
      ))
      setSelectedCustomer(prev => prev ? { ...prev, points_balance: newBalance } : null)
      // Refresh points history
      const histRes = await apiFetch<{ data: any[] }>(`/api/business/customers/${selectedCustomer.id}/points-history?page=1&limit=50`)
      setPointsHistory((histRes.data ?? []).map((h: any) => ({
        id: h.id,
        date: h.created_at ? h.created_at.split("T")[0] : "",
        type: h.delta > 0 ? "earned" : "spent",
        amount: Math.abs(h.delta),
        reason: h.reason ?? "",
      })))
      setShowPointsAdjModal(false)
      setPointsAdjDelta("")
      setPointsAdjReason("")
    } catch (e: any) {
      setError(e.message ?? "Failed to adjust points")
    }
  }

  // ── Grade handlers ───────────────────────────────────────────────────────────
  const handleAddGrade = async () => {
    try {
      const created = await apiFetch<any>("/api/business/customer-grades", {
        method: "POST",
        body: JSON.stringify({
          name: gradeFormData.name,
          min_points: gradeFormData.min_points,
          color: gradeFormData.color,
          points_multiplier: gradeFormData.points_multiplier,
        }),
      })
      setGrades(prev => [...prev, {
        id: created.id,
        name: created.name,
        color: created.color ?? "gray",
        min_points: created.min_points ?? 0,
        points_multiplier: created.points_multiplier ?? 1,
      }])
      setShowAddGradeModal(false)
      setGradeFormData({ name: "", min_points: 0, color: "gray", points_multiplier: 1 })
    } catch (e: any) {
      setError(e.message ?? "Failed to create grade")
    }
  }

  const handleEditGrade = async () => {
    if (!editingGrade) return
    try {
      const updated = await apiFetch<any>(`/api/business/customer-grades/${editingGrade.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: gradeFormData.name,
          min_points: gradeFormData.min_points,
          color: gradeFormData.color,
          points_multiplier: gradeFormData.points_multiplier,
        }),
      })
      setGrades(prev => prev.map(g =>
        g.id === editingGrade.id
          ? { ...g, name: updated.name, color: updated.color ?? g.color, min_points: updated.min_points ?? g.min_points, points_multiplier: updated.points_multiplier ?? g.points_multiplier }
          : g
      ))
      setShowEditGradeModal(false)
      setEditingGrade(null)
    } catch (e: any) {
      setError(e.message ?? "Failed to update grade")
    }
  }

  const handleDeleteGrade = async (gradeId: string) => {
    if (!confirm("Delete this grade? Customers assigned to it will be demoted.")) return
    try {
      await apiFetch(`/api/business/customer-grades/${gradeId}`, { method: "DELETE" })
      setGrades(prev => prev.filter(g => g.id !== gradeId))
    } catch (e: any) {
      setError(e.message ?? "Failed to delete grade")
    }
  }

  // ── Label handlers ───────────────────────────────────────────────────────────
  const handleAddLabel = async () => {
    try {
      const created = await apiFetch<any>("/api/business/customer-labels", {
        method: "POST",
        body: JSON.stringify({ name: labelFormData.name, color: labelFormData.color }),
      })
      setLabels(prev => [...prev, { id: created.id, name: created.name, color: created.color ?? "gray" }])
      setShowAddLabelModal(false)
      setLabelFormData({ name: "", color: "gray" })
    } catch (e: any) {
      setError(e.message ?? "Failed to create label")
    }
  }

  const handleEditLabel = async () => {
    if (!editingLabel) return
    try {
      const updated = await apiFetch<any>(`/api/business/customer-labels/${editingLabel.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: labelFormData.name, color: labelFormData.color }),
      })
      setLabels(prev => prev.map(l =>
        l.id === editingLabel.id ? { ...l, name: updated.name, color: updated.color ?? l.color } : l
      ))
      setShowEditLabelModal(false)
      setEditingLabel(null)
    } catch (e: any) {
      setError(e.message ?? "Failed to update label")
    }
  }

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm("Delete this label?")) return
    try {
      await apiFetch(`/api/business/customer-labels/${labelId}`, { method: "DELETE" })
      setLabels(prev => prev.filter(l => l.id !== labelId))
    } catch (e: any) {
      setError(e.message ?? "Failed to delete label")
    }
  }

  // ── Attribute handlers ───────────────────────────────────────────────────────
  const handleAddAttribute = async () => {
    try {
      const created = await apiFetch<any>("/api/business/customer-attributes", {
        method: "POST",
        body: JSON.stringify({
          attribute_name: attributeFormData.attribute_name,
          data_type: attributeFormData.data_type,
          is_required: attributeFormData.is_required,
        }),
      })
      setAttributes(prev => [...prev, {
        id: created.id,
        attribute_name: created.attribute_name,
        data_type: created.data_type ?? "text",
        is_required: created.is_required ?? false,
      }])
      setShowAddAttributeModal(false)
      setAttributeFormData({ attribute_name: "", data_type: "text", is_required: false })
    } catch (e: any) {
      setError(e.message ?? "Failed to create attribute")
    }
  }

  const handleEditAttribute = async () => {
    if (!editingAttribute) return
    try {
      const updated = await apiFetch<any>(`/api/business/customer-attributes/${editingAttribute.id}`, {
        method: "PATCH",
        body: JSON.stringify({ attribute_name: attributeFormData.attribute_name }),
      })
      setAttributes(prev => prev.map(a =>
        a.id === editingAttribute.id
          ? { ...a, attribute_name: updated.attribute_name ?? attributeFormData.attribute_name }
          : a
      ))
      setShowEditAttributeModal(false)
      setEditingAttribute(null)
    } catch (e: any) {
      setError(e.message ?? "Failed to update attribute")
    }
  }

  const handleDeleteAttribute = async (attrId: string) => {
    if (!confirm("Delete this attribute? All customer values for it will be removed.")) return
    try {
      await apiFetch(`/api/business/customer-attributes/${attrId}`, { method: "DELETE" })
      setAttributes(prev => prev.filter(a => a.id !== attrId))
    } catch (e: any) {
      setError(e.message ?? "Failed to delete attribute")
    }
  }

  const handleSaveCustomerAttributes = () => {
    if (!selectedCustomer) return
    // Customer attribute values endpoint is not part of the wired scope
    console.log("Saving customer attributes for", selectedCustomer.id)
  }

  const getAffordableRewards = (pointsBalance: number) => {
    return mockExchangeRules.filter(rule => rule.point_value <= pointsBalance)
  }

  const handleRedeemReward = () => {
    if (!selectedCustomer || !selectedReward) return
    const newBalance = selectedCustomer.points_balance - selectedReward.point_value
    setCustomers(prev => prev.map(c =>
      c.id === selectedCustomer.id ? { ...c, points_balance: newBalance } : c
    ))
    setSelectedCustomer(prev => prev ? { ...prev, points_balance: newBalance } : null)
    setShowRedeemModal(false)
    setSelectedReward(null)
  }

  const importGradesRef = useRef<HTMLInputElement>(null)

  const handleImportGrades = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append("file", file)
    e.target.value = ""
    const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
    const tok = getToken()
    const headers: Record<string, string> = {}
    if (tok) headers["Authorization"] = `Bearer ${tok}`
    try {
      const res = await fetch(`${BASE}/api/business/customers/import-grades`, { method: "POST", headers, body: fd })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message ?? res.statusText)
      }
      alert("Grade import submitted.")
    } catch (err: unknown) {
      alert((err as Error).message ?? "Import failed")
    }
  }

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case "text": return <Type className="w-3 h-3" />
      case "number": return <Hash className="w-3 h-3" />
      case "boolean": return <ToggleLeft className="w-3 h-3" />
      case "date": return <Calendar className="w-3 h-3" />
      default: return <Type className="w-3 h-3" />
    }
  }

  const colorOptions = ["gray", "blue", "green", "purple", "pink", "amber", "red"]

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <div className="flex gap-2">
          <input
            ref={importGradesRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportGrades}
          />
          <Button variant="secondary" onClick={() => importGradesRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2 inline" />
            Import Grades
          </Button>
          <Button variant="primary" onClick={handleAddCustomer}>
            <Plus className="w-4 h-4 mr-2 inline" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Customers"
          value={statsLoading ? "..." : displayStats.totalCustomers}
          icon={Users}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="New This Month"
          value={statsLoading ? "..." : displayStats.newThisMonth}
          icon={TrendingUp}
          iconBg="bg-green-100"
        />
        <StatCard
          title="Points in Circulation"
          value={statsLoading ? "..." : displayStats.totalPointsIssued.toLocaleString()}
          icon={Star}
          iconBg="bg-amber-100"
        />
        <StatCard
          title="Total Spent (MAD)"
          value={statsLoading ? "..." : displayStats.totalSpent.toLocaleString()}
          icon={Award}
          iconBg="bg-purple-100"
        />
      </div>

      {/* Page-level Tabs */}
      <div className="border-b border-gray-200 dark:border-[#1F1F23] mb-6">
        <div className="flex gap-1">
          {(["customers", "grades", "labels", "attributes"] as const).map(tab => {
            const labels_map = { customers: "Customers", grades: "Grades", labels: "Labels", attributes: "Attributes" }
            return (
              <button
                key={tab}
                onClick={() => setPageTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  pageTab === tab
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {labels_map[tab]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── CUSTOMERS TAB ─────────────────────────────────────────────────────── */}
      {pageTab === "customers" && (
        <>
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                />
              </div>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="all">All Grades</option>
                {grades.length > 0
                  ? grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)
                  : (
                    <>
                      <option value="Bronze">Bronze</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                      <option value="Platinum">Platinum</option>
                    </>
                  )
                }
              </select>
              <MultiSelectDropdown
                label="Labels"
                options={labels}
                selected={labelFilter}
                onChange={setLabelFilter}
              />
              {(searchQuery || gradeFilter !== "all" || labelFilter.length > 0) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("")
                    setGradeFilter("all")
                    setLabelFilter([])
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            {loading && (
              <div className="py-10 text-center text-gray-400">Loading...</div>
            )}
            {!loading && <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spent</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Labels</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Visit</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{customer.first_name} {customer.last_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.email || "No email"}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{customer.phone || "-"}</td>
                    <td className="p-4"><GradeBadge grade={customer.grade} /></td>
                    <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{customer.points_balance.toLocaleString()}</td>
                    <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{customer.total_spent.toLocaleString()} MAD</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.labels.length > 0 ? (
                          customer.labels.slice(0, 2).map((label) => (
                            <LabelPill key={label.id} label={label} />
                          ))
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                        {customer.labels.length > 2 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">+{customer.labels.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{customer.last_visit}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(customer)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>}
            {!loading && filteredCustomers.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No customers found matching your criteria.
              </div>
            )}
          </div>
        </>
      )}

      {/* ── GRADES TAB ────────────────────────────────────────────────────────── */}
      {pageTab === "grades" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Customer Grades</h2>
            <Button
              variant="primary"
              onClick={() => {
                setGradeFormData({ name: "", min_points: 0, color: "gray", points_multiplier: 1 })
                setShowAddGradeModal(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Grade
            </Button>
          </div>
          {gradesLoading ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : grades.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">No grades defined yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Min Points</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points Multiplier</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Color</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {grades.map(grade => (
                  <tr key={grade.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">{grade.name}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{grade.min_points.toLocaleString()}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">×{grade.points_multiplier}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium bg-${grade.color ?? "gray"}-100 text-${grade.color ?? "gray"}-700`}>
                        {grade.color ?? "gray"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingGrade(grade)
                            setGradeFormData({ name: grade.name, min_points: grade.min_points, color: grade.color ?? "gray", points_multiplier: grade.points_multiplier })
                            setShowEditGradeModal(true)
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGrade(grade.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── LABELS TAB ────────────────────────────────────────────────────────── */}
      {pageTab === "labels" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Customer Labels</h2>
            <Button
              variant="primary"
              onClick={() => {
                setLabelFormData({ name: "", color: "gray" })
                setShowAddLabelModal(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Label
            </Button>
          </div>
          {labelsLoading ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : labels.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">No labels defined yet.</div>
          ) : (
            <div className="p-5 flex flex-wrap gap-3">
              {labels.map(label => (
                <div key={label.id} className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg">
                  <LabelPill label={label} />
                  <button
                    onClick={() => {
                      setEditingLabel(label)
                      setLabelFormData({ name: label.name, color: label.color })
                      setShowEditLabelModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteLabel(label.id)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ATTRIBUTES TAB ────────────────────────────────────────────────────── */}
      {pageTab === "attributes" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Custom Attributes</h2>
            <Button
              variant="primary"
              onClick={() => {
                setAttributeFormData({ attribute_name: "", data_type: "text", is_required: false })
                setShowAddAttributeModal(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Attribute
            </Button>
          </div>
          {attributesLoading ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : attributes.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">No custom attributes defined yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data Type</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Required</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {attributes.map(attr => (
                  <tr key={attr.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">{attr.attribute_name}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                        {getDataTypeIcon(attr.data_type)}
                        {attr.data_type}
                      </span>
                    </td>
                    <td className="p-4">
                      {attr.is_required
                        ? <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">Required</span>
                        : <span className="text-sm text-gray-400 dark:text-gray-500">Optional</span>
                      }
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingAttribute(attr)
                            setAttributeFormData({ attribute_name: attr.attribute_name, data_type: attr.data_type, is_required: attr.is_required })
                            setShowEditAttributeModal(true)
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAttribute(attr.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Customer Detail Slide Panel */}
      <SlidePanel
        isOpen={showDetailPanel}
        onClose={() => setShowDetailPanel(false)}
        title="Customer Details"
      >
        {selectedCustomer && (
          <div>
            {/* Profile Header */}
            <div className="p-6 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedCustomer.email || "No email"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCustomer.phone || "No phone"}</p>
                </div>
                <GradeBadge grade={selectedCustomer.grade} />
              </div>
              <div className="flex gap-4 mt-4 flex-wrap">
                <div className="bg-white dark:bg-[#0F0F12] rounded-lg px-4 py-2 border border-gray-200 dark:border-[#1F1F23]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Points Balance</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedCustomer.points_balance.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-[#0F0F12] rounded-lg px-4 py-2 border border-gray-200 dark:border-[#1F1F23]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedCustomer.total_spent.toLocaleString()} MAD</p>
                </div>
                <button
                  onClick={() => { setPointsAdjDelta(""); setPointsAdjReason(""); setShowPointsAdjModal(true) }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Star className="w-3.5 h-3.5" />
                  Adjust Points
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex">
                <button
                  onClick={() => setDetailTab("points")}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === "points" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <History className="w-4 h-4" />
                  Points History
                </button>
                <button
                  onClick={() => setDetailTab("transactions")}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === "transactions" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  Transactions
                </button>
                <button
                  onClick={() => setDetailTab("labels")}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === "labels" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  Labels
                </button>
                <button
                  onClick={() => setDetailTab("attributes")}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === "attributes" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  Attributes
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {detailTab === "points" && (
                <div className="space-y-3">
                  {pointsHistoryLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Loading history...</p>
                  ) : pointsHistory.length > 0 ? (
                    pointsHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.reason}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{entry.date}</p>
                        </div>
                        <span className={`font-medium ${entry.type === "earned" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {entry.type === "earned" ? "+" : "-"}{entry.amount}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No points history yet.</p>
                  )}
                </div>
              )}

              {detailTab === "transactions" && (
                <div className="space-y-3">
                  {selectedCustomer.transactions.length > 0 ? (
                    selectedCustomer.transactions.map((txn) => (
                      <div key={txn.id} className="p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{txn.transaction_number}</p>
                          <p className="font-medium text-gray-900 dark:text-white">{txn.total} MAD</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{txn.date}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{txn.items.join(", ")}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No transactions yet.</p>
                  )}
                </div>
              )}

              {detailTab === "labels" && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click to add or remove labels:</p>
                  {labels.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No labels defined.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {labels.map((label) => {
                        const hasLabel = selectedCustomer.labels.some(l => l.id === label.id)
                        return (
                          <button
                            key={label.id}
                            onClick={() => handleToggleLabel(label.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              hasLabel
                                ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-400"
                                : "bg-white dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                          >
                            {hasLabel && <Check className="w-3 h-3" />}
                            {label.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {detailTab === "attributes" && (
                <div className="space-y-4">
                  {attributes.length > 0 ? (
                    <div className="space-y-4">
                      {attributes.map((attr) => (
                        <div key={attr.id}>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                            {attr.attribute_name}
                            {attr.is_required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {attr.data_type === "text" && (
                            <input
                              type="text"
                              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                              placeholder={`Enter ${attr.attribute_name.toLowerCase()}`}
                            />
                          )}
                          {attr.data_type === "number" && (
                            <input
                              type="number"
                              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                              placeholder="0"
                            />
                          )}
                          {attr.data_type === "boolean" && (
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-200 dark:bg-[#1F1F23] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-900 dark:focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          )}
                          {attr.data_type === "date" && (
                            <input
                              type="date"
                              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                            />
                          )}
                        </div>
                      ))}
                      <Button variant="primary" className="w-full" onClick={handleSaveCustomerAttributes}>
                        Save Attributes
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No custom attributes defined. Add them in the Attributes tab.</p>
                  )}
                </div>
              )}
            </div>

            {/* Redeemable Rewards Section */}
            {selectedCustomer.points_balance > 0 && (
              <div className="p-6 border-t border-gray-200 dark:border-[#1F1F23] bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Available Rewards</h4>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-medium rounded-full">
                    {selectedCustomer.points_balance.toLocaleString()} pts
                  </span>
                </div>
                {getAffordableRewards(selectedCustomer.points_balance).length > 0 ? (
                  <div className="space-y-2">
                    {getAffordableRewards(selectedCustomer.points_balance).map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#0F0F12] rounded-lg border border-gray-200 dark:border-[#1F1F23]">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{rule.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{rule.point_value} pts</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              rule.reward_type === "discount"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            }`}>
                              {rule.reward_type === "discount" ? "Discount" : "Free Product"}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-300">{rule.reward_value}</span>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          className="text-xs px-3 py-1.5"
                          onClick={() => {
                            setSelectedReward(rule)
                            setShowRedeemModal(true)
                          }}
                        >
                          Redeem
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No rewards available at current points balance</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Add Customer Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Customer" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder="Enter first name"
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder="Enter last name"
            />
          </div>
          <Input
            label="Email (optional)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="customer@example.com"
          />
          <Input
            label="Phone (optional)"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+212 6 XX XX XX XX"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 w-full h-24 resize-none bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              placeholder="Any additional notes..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Labels</label>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const isSelected = formData.labels.includes(label.id)
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        labels: isSelected
                          ? prev.labels.filter(id => id !== label.id)
                          : [...prev.labels, label.id]
                      }))
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      isSelected
                        ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-400"
                        : "bg-white dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {label.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveCustomer} disabled={!formData.first_name || !formData.last_name}>
              Add Customer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Customer" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder="Enter first name"
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder="Enter last name"
            />
          </div>
          <Input
            label="Email (optional)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="customer@example.com"
          />
          <Input
            label="Phone (optional)"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+212 6 XX XX XX XX"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 w-full h-24 resize-none bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              placeholder="Any additional notes..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Labels</label>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const isSelected = formData.labels.includes(label.id)
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        labels: isSelected
                          ? prev.labels.filter(id => id !== label.id)
                          : [...prev.labels, label.id]
                      }))
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      isSelected
                        ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-400"
                        : "bg-white dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {label.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveCustomer} disabled={!formData.first_name || !formData.last_name}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Grade Modal */}
      <Modal isOpen={showAddGradeModal} onClose={() => setShowAddGradeModal(false)} title="Add Grade" size="sm">
        <div className="space-y-4">
          <Input
            label="Grade Name"
            value={gradeFormData.name}
            onChange={(e) => setGradeFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Gold"
          />
          <Input
            label="Minimum Points"
            type="number"
            value={gradeFormData.min_points}
            onChange={(e) => setGradeFormData(prev => ({ ...prev, min_points: parseInt(e.target.value) || 0 }))}
            placeholder="0"
          />
          <Input
            label="Points Multiplier"
            type="number"
            step="0.1"
            value={gradeFormData.points_multiplier}
            onChange={(e) => setGradeFormData(prev => ({ ...prev, points_multiplier: parseFloat(e.target.value) || 1 }))}
            placeholder="1"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <select
              value={gradeFormData.color}
              onChange={(e) => setGradeFormData(prev => ({ ...prev, color: e.target.value }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
            >
              {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddGradeModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleAddGrade} disabled={!gradeFormData.name}>
              Add Grade
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Grade Modal */}
      <Modal isOpen={showEditGradeModal} onClose={() => setShowEditGradeModal(false)} title="Edit Grade" size="sm">
        <div className="space-y-4">
          <Input
            label="Grade Name"
            value={gradeFormData.name}
            onChange={(e) => setGradeFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Gold"
          />
          <Input
            label="Minimum Points"
            type="number"
            value={gradeFormData.min_points}
            onChange={(e) => setGradeFormData(prev => ({ ...prev, min_points: parseInt(e.target.value) || 0 }))}
          />
          <Input
            label="Points Multiplier"
            type="number"
            step="0.1"
            value={gradeFormData.points_multiplier}
            onChange={(e) => setGradeFormData(prev => ({ ...prev, points_multiplier: parseFloat(e.target.value) || 1 }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <select
              value={gradeFormData.color}
              onChange={(e) => setGradeFormData(prev => ({ ...prev, color: e.target.value }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
            >
              {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditGradeModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleEditGrade} disabled={!gradeFormData.name}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Label Modal */}
      <Modal isOpen={showAddLabelModal} onClose={() => setShowAddLabelModal(false)} title="Add Label" size="sm">
        <div className="space-y-4">
          <Input
            label="Label Name"
            value={labelFormData.name}
            onChange={(e) => setLabelFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. VIP"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <select
              value={labelFormData.color}
              onChange={(e) => setLabelFormData(prev => ({ ...prev, color: e.target.value }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
            >
              {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddLabelModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleAddLabel} disabled={!labelFormData.name}>
              Add Label
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Label Modal */}
      <Modal isOpen={showEditLabelModal} onClose={() => setShowEditLabelModal(false)} title="Edit Label" size="sm">
        <div className="space-y-4">
          <Input
            label="Label Name"
            value={labelFormData.name}
            onChange={(e) => setLabelFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. VIP"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <select
              value={labelFormData.color}
              onChange={(e) => setLabelFormData(prev => ({ ...prev, color: e.target.value }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
            >
              {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditLabelModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleEditLabel} disabled={!labelFormData.name}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Attribute Modal */}
      <Modal isOpen={showAddAttributeModal} onClose={() => setShowAddAttributeModal(false)} title="Add Attribute" size="sm">
        <div className="space-y-4">
          <Input
            label="Attribute Name"
            value={attributeFormData.attribute_name}
            onChange={(e) => setAttributeFormData(prev => ({ ...prev, attribute_name: e.target.value }))}
            placeholder="e.g. Company Size"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Type</label>
            <select
              value={attributeFormData.data_type}
              onChange={(e) => setAttributeFormData(prev => ({ ...prev, data_type: e.target.value as "text" | "number" | "boolean" | "date" }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean (Yes/No)</option>
              <option value="date">Date</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={attributeFormData.is_required}
              onChange={(e) => setAttributeFormData(prev => ({ ...prev, is_required: e.target.checked }))}
              className="w-4 h-4 text-indigo-500 rounded focus:ring-gray-900 dark:focus:ring-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
          </label>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddAttributeModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleAddAttribute} disabled={!attributeFormData.attribute_name}>
              Add Attribute
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Attribute Modal */}
      <Modal isOpen={showEditAttributeModal} onClose={() => setShowEditAttributeModal(false)} title="Edit Attribute" size="sm">
        <div className="space-y-4">
          <Input
            label="Attribute Name"
            value={attributeFormData.attribute_name}
            onChange={(e) => setAttributeFormData(prev => ({ ...prev, attribute_name: e.target.value }))}
            placeholder="e.g. Company Size"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Type</label>
            <div
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#0F0F12] rounded-lg border border-gray-200 dark:border-[#1F1F23] cursor-not-allowed"
              title="Data type cannot be changed after values have been recorded"
            >
              <Lock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{attributeFormData.data_type}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Immutable</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Data type cannot be changed after values have been recorded</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditAttributeModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleEditAttribute} disabled={!attributeFormData.attribute_name}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Redeem Reward Modal */}
      <Modal
        isOpen={showRedeemModal}
        onClose={() => { setShowRedeemModal(false); setSelectedReward(null); }}
        title="Redeem Reward"
        size="sm"
      >
        {selectedCustomer && selectedReward && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-[#1F1F23]">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Redeem <span className="font-semibold text-gray-900 dark:text-white">{selectedReward.name}</span> for{" "}
                <span className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.first_name} {selectedCustomer.last_name}</span>?
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Points Cost:</span>
                <span className="font-medium text-red-600 dark:text-red-400">-{selectedReward.point_value} pts</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Current Balance:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedCustomer.points_balance.toLocaleString()} pts</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-[#1F1F23]">
                <span className="text-gray-500 dark:text-gray-400">Balance After:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {(selectedCustomer.points_balance - selectedReward.point_value).toLocaleString()} pts
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowRedeemModal(false); setSelectedReward(null); }}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={handleRedeemReward}>Confirm Redemption</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Points Adjustment Modal */}
      <Modal isOpen={showPointsAdjModal} onClose={() => setShowPointsAdjModal(false)} title="Adjust Points" size="sm">
        {selectedCustomer && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Adjust points for <span className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.first_name} {selectedCustomer.last_name}</span>.
              Use a positive number to add points, negative to deduct.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points Delta</label>
              <input
                type="number"
                value={pointsAdjDelta}
                onChange={(e) => setPointsAdjDelta(e.target.value)}
                placeholder="e.g. 100 or -50"
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
              <input
                type="text"
                value={pointsAdjReason}
                onChange={(e) => setPointsAdjReason(e.target.value)}
                placeholder="e.g. Birthday bonus"
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
            {pointsAdjDelta !== "" && !isNaN(parseInt(pointsAdjDelta, 10)) && (
              <div className="p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Current Balance:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedCustomer.points_balance.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">After Adjustment:</span>
                  <span className={`font-medium ${(selectedCustomer.points_balance + parseInt(pointsAdjDelta, 10)) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {(selectedCustomer.points_balance + parseInt(pointsAdjDelta, 10)).toLocaleString()} pts
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPointsAdjModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handlePointsAdjustment}
                disabled={!pointsAdjDelta || !pointsAdjReason.trim()}
              >
                Apply Adjustment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
