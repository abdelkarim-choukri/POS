"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Star,
  Clock,
  Tag,
  Users,
  TrendingUp,
  DollarSign,
  GripVertical,
  Eye,
  Check,
  ChevronRight,
  Sparkles,
  Calendar,
  Info,
  Lock,
  ChevronLeft,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CURRENCY,
  DATE_FORMAT,
  PAGINATION,
  getStatusColor,
  RECOMMENDATIONS_LABELS as LABELS,
  COMMON_LABELS,
  PERMISSION_LABELS,
} from "@/lib/constants"

// ============== TYPES ==============
type TemplateType = "manual" | "seasonal" | "top_seller" | "high_margin" | "time_of_day" | "customer_grade_targeted"

interface RecommendationTemplate {
  id: string
  name: string
  type: TemplateType
  is_active: boolean
  whole_price_tier?: string | null
  // Type-specific fields
  start_time?: string // for time_of_day
  end_time?: string
  days_of_week?: string[] // ["Mon", "Tue", ...]
  target_grade?: string // for customer_grade_targeted
  items?: TemplateItem[]
  created_at: string
}

interface TemplateItem {
  id: string
  product_id: string
  product_name: string
  category: string
  price: number
  sort_order: number
}

interface Product {
  id: string
  name: string
  sku: string
  category: string
  price: number
}

// ============== MOCK DATA ==============
const mockTemplates: RecommendationTemplate[] = [
  {
    id: "1",
    name: "Chef's Picks",
    type: "manual",
    is_active: true,
    items: [
      { id: "i1", product_id: "p1", product_name: "Signature Tagine", category: "Main Courses", price: 95, sort_order: 1 },
      { id: "i2", product_id: "p2", product_name: "Moroccan Couscous", category: "Main Courses", price: 85, sort_order: 2 },
      { id: "i3", product_id: "p3", product_name: "Mint Tea Set", category: "Beverages", price: 35, sort_order: 3 },
    ],
    created_at: "2024-01-15",
  },
  {
    id: "2",
    name: "Ramadan Specials",
    type: "seasonal",
    is_active: false,
    items: [
      { id: "i4", product_id: "p4", product_name: "Harira Soup", category: "Soups", price: 25, sort_order: 1 },
      { id: "i5", product_id: "p5", product_name: "Chebakia", category: "Desserts", price: 40, sort_order: 2 },
    ],
    created_at: "2024-02-01",
  },
  {
    id: "3",
    name: "Best Sellers",
    type: "top_seller",
    is_active: true,
    created_at: "2024-01-10",
  },
  {
    id: "4",
    name: "High Margin Items",
    type: "high_margin",
    is_active: true,
    created_at: "2024-01-10",
  },
  {
    id: "5",
    name: "Breakfast Menu",
    type: "time_of_day",
    is_active: true,
    start_time: "07:00",
    end_time: "11:00",
    days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    created_at: "2024-01-20",
  },
  {
    id: "6",
    name: "Gold Member Exclusives",
    type: "customer_grade_targeted",
    is_active: true,
    target_grade: "Gold",
    items: [
      { id: "i6", product_id: "p6", product_name: "Premium Lamb Mechoui", category: "Main Courses", price: 180, sort_order: 1 },
    ],
    created_at: "2024-02-10",
  },
]

const mockProducts: Product[] = [
  { id: "p1", name: "Signature Tagine", sku: "TAG-001", category: "Main Courses", price: 95 },
  { id: "p2", name: "Moroccan Couscous", sku: "COU-001", category: "Main Courses", price: 85 },
  { id: "p3", name: "Mint Tea Set", sku: "TEA-001", category: "Beverages", price: 35 },
  { id: "p4", name: "Harira Soup", sku: "SOU-001", category: "Soups", price: 25 },
  { id: "p5", name: "Chebakia", sku: "DES-001", category: "Desserts", price: 40 },
  { id: "p6", name: "Premium Lamb Mechoui", sku: "LAM-001", category: "Main Courses", price: 180 },
  { id: "p7", name: "Pastilla", sku: "PAS-001", category: "Main Courses", price: 75 },
  { id: "p8", name: "Orange Juice Fresh", sku: "JUI-001", category: "Beverages", price: 20 },
]

// ============== REUSABLE COMPONENTS ==============
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" | "indigo" | "purple" | "pink" | "amber" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative ${checked ? "bg-gray-900 dark:bg-white" : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5.5 left-0.5" : "left-0.5"}`} style={{ transform: checked ? "translateX(22px)" : "translateX(0)" }} />
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
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

// Immutable Field Indicator
function ImmutableIndicator({ tooltip }: { tooltip: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500" title={tooltip}>
      <Lock className="w-3 h-3" />
    </span>
  )
}

// Skeleton Loaders
function TemplateCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-3" />
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1F1F23] mt-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  )
}

function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
      <Skeleton className="w-10 h-10 rounded-lg mb-2" />
      <Skeleton className="h-7 w-12 mb-1" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

// ============== HELPER FUNCTIONS ==============
function getTypeBadgeColor(type: TemplateType): "blue" | "green" | "indigo" | "purple" | "amber" | "pink" {
  const colors: Record<TemplateType, "blue" | "green" | "indigo" | "purple" | "amber" | "pink"> = {
    manual: "blue",
    seasonal: "green",
    top_seller: "indigo",
    high_margin: "purple",
    time_of_day: "amber",
    customer_grade_targeted: "pink",
  }
  return colors[type]
}

function getTypeIcon(type: TemplateType) {
  const icons: Record<TemplateType, React.ReactNode> = {
    manual: <Star className="w-3 h-3" />,
    seasonal: <Calendar className="w-3 h-3" />,
    top_seller: <TrendingUp className="w-3 h-3" />,
    high_margin: <DollarSign className="w-3 h-3" />,
    time_of_day: <Clock className="w-3 h-3" />,
    customer_grade_targeted: <Users className="w-3 h-3" />,
  }
  return icons[type]
}

function getTypeLabel(type: TemplateType): string {
  return LABELS.types[type === "customer_grade_targeted" ? "customer_grade" : type] || type
}

function isCurrentlyActive(template: RecommendationTemplate): boolean {
  if (!template.is_active) return false
  
  if (template.type === "time_of_day" && template.start_time && template.end_time && template.days_of_week) {
    const now = new Date()
    const currentDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()]
    if (!template.days_of_week.includes(currentDay)) return false
    
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = template.start_time.split(":").map(Number)
    const [endH, endM] = template.end_time.split(":").map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    
    return currentTime >= startMinutes && currentTime <= endMinutes
  }
  
  return template.is_active
}

function formatDate(dateStr: string): string {
  return DATE_FORMAT.formatDate(dateStr)
}

function formatPrice(amount: number): string {
  return CURRENCY.format(amount)
}

// ============== PAGINATION COMPONENT ==============
function PaginationControls({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }: {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)
  
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0F0F12] border-t border-gray-200 dark:border-[#1F1F23] rounded-b-xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>{COMMON_LABELS.showing} {startItem}-{endItem} {COMMON_LABELS.of} {totalItems} {COMMON_LABELS.results}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="ml-2 px-2 py-1 border border-gray-300 dark:border-[#1F1F23] rounded text-xs bg-white dark:bg-[#0F0F12]"
        >
          {PAGINATION.pageSizeOptions.map(size => (
            <option key={size} value={size}>{size} {COMMON_LABELS.perPage}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300">
          {COMMON_LABELS.page} {currentPage} {COMMON_LABELS.of} {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ============== MAIN PAGE COMPONENT ==============
export default function RecommendationsPage() {
  const [templates, setTemplates] = useState<RecommendationTemplate[]>(mockTemplates)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TemplateType | "all">("all")
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGINATION.defaultPageSize)
  
  // Modals & Panels
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<RecommendationTemplate | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "manual" as TemplateType,
    is_active: true,
    whole_price_tier: "",
    start_time: "09:00",
    end_time: "17:00",
    days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri"] as string[],
    target_grade: "Gold",
  })
  
  // Product search for adding items
  const [productSearch, setProductSearch] = useState("")

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Filtered templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || t.type === typeFilter
    const matchesActive = !activeOnlyFilter || t.is_active
    return matchesSearch && matchesType && matchesActive
  })

  // Paginated templates
  const totalPages = Math.ceil(filteredTemplates.length / pageSize)
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleAddTemplate = () => {
    setIsEditing(false)
    setFormData({
      name: "",
      type: "manual",
      is_active: true,
      whole_price_tier: "",
      start_time: "09:00",
      end_time: "17:00",
      days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      target_grade: "Gold",
    })
    setShowAddModal(true)
  }

  const handleViewTemplate = (template: RecommendationTemplate) => {
    setSelectedTemplate(template)
    setShowDetailPanel(true)
  }

  const handleToggleActive = (templateId: string) => {
    setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, is_active: !t.is_active } : t))
  }

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }))
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  const filteredProducts = mockProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{LABELS.pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{LABELS.pageSubtitle}</p>
        </div>
        <Button variant="primary" onClick={handleAddTemplate}>
          <Plus className="w-4 h-4" />
          {LABELS.newTemplate}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{templates.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Templates</p>
            </div>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{templates.filter(t => t.is_active).length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Templates</p>
            </div>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{templates.filter(t => t.type === "manual" || t.type === "seasonal").length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manual/Seasonal</p>
            </div>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{templates.filter(t => t.type === "top_seller" || t.type === "high_margin").length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Auto-Resolved</p>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`${COMMON_LABELS.search} templates...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TemplateType | "all")}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="manual">{LABELS.types.manual}</option>
            <option value="seasonal">{LABELS.types.seasonal}</option>
            <option value="top_seller">{LABELS.types.top_seller}</option>
            <option value="high_margin">{LABELS.types.high_margin}</option>
            <option value="time_of_day">{LABELS.types.time_of_day}</option>
            <option value="customer_grade_targeted">{LABELS.types.customer_grade}</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={activeOnlyFilter}
              onChange={(e) => setActiveOnlyFilter(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-500"
            />
            Active only
          </label>
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{LABELS.emptyState.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{LABELS.emptyState.description}</p>
          <Button variant="primary" onClick={handleAddTemplate}>
            <Plus className="w-4 h-4" />
            {LABELS.emptyState.cta}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedTemplates.map(template => (
              <div
                key={template.id}
                className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewTemplate(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge color={getTypeBadgeColor(template.type)}>
                    {getTypeIcon(template.type)}
                    {getTypeLabel(template.type)}
                  </Badge>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {isCurrentlyActive(template) && (
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" title="Currently active" />
                    )}
                    <Toggle checked={template.is_active} onChange={() => handleToggleActive(template.id)} />
                  </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{template.name}</h3>
                
                {/* Type-specific info */}
                {template.type === "time_of_day" && template.start_time && template.end_time && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {template.start_time} - {template.end_time}
                    {template.days_of_week && ` (${template.days_of_week.join(", ")})`}
                  </p>
                )}
                
                {template.type === "customer_grade_targeted" && template.target_grade && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <Users className="w-3 h-3 inline mr-1" />
                    Target: {template.target_grade} members
                  </p>
                )}
                
                {(template.type === "manual" || template.type === "seasonal") && template.items && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <Tag className="w-3 h-3 inline mr-1" />
                    {template.items.length} items configured
                  </p>
                )}
                
                {(template.type === "top_seller" || template.type === "high_margin") && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Auto-resolved from sales data
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1F1F23] mt-3">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Created {formatDate(template.created_at)}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {filteredTemplates.length > pageSize && (
            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredTemplates.length}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={isEditing ? LABELS.editTemplate : LABELS.newTemplate} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{LABELS.templateName}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Chef's Picks"
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {LABELS.templateType}
              {isEditing && <ImmutableIndicator tooltip={LABELS.immutableField} />}
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(f => ({ ...f, type: e.target.value as TemplateType }))}
              disabled={isEditing}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="manual">{LABELS.types.manual}</option>
              <option value="seasonal">{LABELS.types.seasonal}</option>
              <option value="top_seller">{LABELS.types.top_seller} (Auto)</option>
              <option value="high_margin">{LABELS.types.high_margin} (Auto)</option>
              <option value="time_of_day">{LABELS.types.time_of_day}</option>
              <option value="customer_grade_targeted">{LABELS.types.customer_grade}</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{LABELS.status}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enable this template on POS</p>
            </div>
            <Toggle checked={formData.is_active} onChange={(val) => setFormData(f => ({ ...f, is_active: val }))} />
          </div>
          
          {(formData.type === "manual" || formData.type === "seasonal") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wholesale Price Tier (Optional)</label>
              <select
                value={formData.whole_price_tier}
                onChange={(e) => setFormData(f => ({ ...f, whole_price_tier: e.target.value }))}
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="">None</option>
                <option value="tier_1">Tier 1</option>
                <option value="tier_2">Tier 2</option>
                <option value="tier_3">Tier 3</option>
                <option value="tier_4">Tier 4</option>
              </select>
            </div>
          )}
          
          {/* Time of Day specific fields */}
          {formData.type === "time_of_day" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{LABELS.timeOfDay.startTime}</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(f => ({ ...f, start_time: e.target.value }))}
                    className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{LABELS.timeOfDay.endTime}</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(f => ({ ...f, end_time: e.target.value }))}
                    className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{LABELS.timeOfDay.days}</label>
                <div className="flex flex-wrap gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        formData.days_of_week.includes(day)
                          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                          : "bg-gray-100 dark:bg-[#0F0F12] text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Customer Grade specific fields */}
          {formData.type === "customer_grade_targeted" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{LABELS.customerGrade.targetGrade}</label>
              <select
                value={formData.target_grade}
                onChange={(e) => setFormData(f => ({ ...f, target_grade: e.target.value }))}
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
              </select>
            </div>
          )}
          
          {/* Auto-resolved info banner */}
          {(formData.type === "top_seller" || formData.type === "high_margin") && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-300">Auto-Resolved Template</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Items are resolved automatically from {formData.type === "top_seller" ? "last 7 days sales data" : "profit margin calculations"}. 
                    Use Preview in the detail panel to see current results.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>{LABELS.cancel}</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAddModal(false)}>
              <Check className="w-4 h-4" />
              {isEditing ? COMMON_LABELS.update : COMMON_LABELS.create} Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Side Panel */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title={selectedTemplate?.name || "Template Details"}>
        {selectedTemplate && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Badge color={getTypeBadgeColor(selectedTemplate.type)}>
                {getTypeIcon(selectedTemplate.type)}
                {getTypeLabel(selectedTemplate.type)}
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowPreviewModal(true)}>
                  <Eye className="w-4 h-4" />
                  {LABELS.preview}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setIsEditing(true); setShowAddModal(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Type-specific info for time_of_day */}
            {selectedTemplate.type === "time_of_day" && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Active: {selectedTemplate.start_time} - {selectedTemplate.end_time}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Days: {selectedTemplate.days_of_week?.join(", ")}
                </p>
              </div>
            )}
            
            {/* Type-specific info for customer_grade_targeted */}
            {selectedTemplate.type === "customer_grade_targeted" && (
              <div className="p-4 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg">
                <p className="text-sm font-medium text-pink-800 dark:text-pink-300">
                  Target Grade: {selectedTemplate.target_grade}
                </p>
              </div>
            )}
            
            {/* Auto-resolved info */}
            {(selectedTemplate.type === "top_seller" || selectedTemplate.type === "high_margin") && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  This template auto-selects items based on {selectedTemplate.type === "top_seller" ? "last 7 days sales" : "profit margin"}.
                  Use Preview to see current results.
                </p>
              </div>
            )}
            
            {/* Items Editor for manual/seasonal/customer_grade */}
            {(selectedTemplate.type === "manual" || selectedTemplate.type === "seasonal" || selectedTemplate.type === "customer_grade_targeted") && (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Manage Items</h3>
                  
                  {/* Product Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search products to add..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  {/* Product Search Results */}
                  {productSearch && (
                    <div className="bg-gray-50 dark:bg-[#0F0F12] rounded-lg p-2 mb-4 max-h-40 overflow-y-auto">
                      {filteredProducts.slice(0, 5).map(product => (
                        <button
                          key={product.id}
                          className="w-full flex items-center justify-between p-2 hover:bg-white dark:hover:bg-[#2a2a32] rounded-lg text-left"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{product.category} • {product.sku}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{formatPrice(product.price)}</span>
                            <Plus className="w-4 h-4 text-indigo-500" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Current Items */}
                  <div className="space-y-2">
                    {selectedTemplate.items?.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg"
                      >
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                        <span className="w-6 h-6 bg-gray-100 dark:bg-[#1F1F23] rounded text-xs flex items-center justify-center text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{item.product_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.category}</p>
                        </div>
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-300">{formatPrice(item.price)}</span>
                        <button className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    {(!selectedTemplate.items || selectedTemplate.items.length === 0) && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No items added yet</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button variant="primary" className="w-full">
                  <Check className="w-4 h-4" />
                  {LABELS.save} Items
                </Button>
              </>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Preview Modal */}
      <Modal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} title="Template Preview" size="xl">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Resolved via: <Badge color={selectedTemplate ? getTypeBadgeColor(selectedTemplate.type) : "gray"}>{selectedTemplate ? getTypeLabel(selectedTemplate.type) : ""}</Badge>
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {(selectedTemplate?.items || mockProducts.slice(0, 4)).map((item, i) => {
              const product = "product_name" in item ? item : { product_name: item.name, category: item.category, price: item.price }
              return (
                <div key={i} className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
                  <div className="w-full h-24 bg-gray-200 dark:bg-[#1F1F23] rounded-lg mb-3 flex items-center justify-center">
                    <Tag className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{product.product_name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
                  <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">{formatPrice(product.price)}</p>
                </div>
              )
            })}
          </div>
          
          <Button variant="secondary" className="w-full" onClick={() => setShowPreviewModal(false)}>{COMMON_LABELS.close} Preview</Button>
        </div>
      </Modal>
    </div>
  )
}



