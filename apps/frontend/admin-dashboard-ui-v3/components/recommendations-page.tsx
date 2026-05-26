"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
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

// (mock data removed — all data loaded from API)

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
  const [templates, setTemplates] = useState<RecommendationTemplate[]>([])
  const [featuredItems, setFeaturedItems] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TemplateType | "all">("all")
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingItems, setIsSavingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Items panel state — tracks the working list of product_ids for the selected template
  const [pendingItemIds, setPendingItemIds] = useState<string[]>([])

  // Product search for adding items
  const [productSearch, setProductSearch] = useState("")
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([])

  // ---- data fetching helpers ----

  function mapTemplate(t: any): RecommendationTemplate {
    return {
      id: t.id,
      name: t.name,
      type: t.template_type ?? t.type,
      is_active: t.is_active,
      whole_price_tier: t.whole_price_tier,
      start_time: t.start_time,
      end_time: t.end_time,
      days_of_week: t.days_of_week,
      target_grade: t.target_grade,
      items: t.items,
      created_at: t.created_at ?? "",
    }
  }

  function fetchTemplates() {
    setIsLoading(true)
    setError(null)
    apiFetch<{ data: any[] }>("/api/business/recommendation-templates")
      .then(res => {
        setTemplates((res.data ?? []).map(mapTemplate))
      })
      .catch((e: any) => setError(e.message ?? "Failed to load templates"))
      .finally(() => setIsLoading(false))
  }

  // Fetch featured items (GET /api/business/recommendation-templates/featured)
  function fetchFeaturedItems() {
    apiFetch<{ items: any[] }>("/api/business/recommendation-templates/featured")
      .then(res => {
        const items: Product[] = (res.items ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku ?? "",
          category: p.category_name ?? p.category ?? "",
          price: p.price_ttc ?? p.price ?? 0,
        }))
        setFeaturedItems(items)
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchTemplates()
    fetchFeaturedItems()
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

  const handleEditTemplate = (template: RecommendationTemplate) => {
    setIsEditing(true)
    setFormData({
      name: template.name,
      type: template.type,
      is_active: template.is_active,
      whole_price_tier: template.whole_price_tier ?? "",
      start_time: template.start_time ?? "09:00",
      end_time: template.end_time ?? "17:00",
      days_of_week: template.days_of_week ?? ["Mon", "Tue", "Wed", "Thu", "Fri"],
      target_grade: template.target_grade ?? "Gold",
    })
    setShowAddModal(true)
  }

  const handleViewTemplate = (template: RecommendationTemplate) => {
    setSelectedTemplate(template)
    setPendingItemIds((template.items ?? []).map(i => i.product_id))
    setShowDetailPanel(true)
  }

  // PATCH /api/business/recommendation-templates/:id (toggle active)
  const handleToggleActive = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return
    const newActive = !template.is_active
    setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, is_active: newActive } : t))
    apiFetch(`/api/business/recommendation-templates/${templateId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: newActive }),
    }).catch((e: any) => {
      // revert on failure
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, is_active: !newActive } : t))
      setError(e.message ?? "Failed to update template")
    })
  }

  // POST or PATCH /api/business/recommendation-templates[/:id]
  const handleSaveTemplate = () => {
    setIsSaving(true)
    setError(null)

    const tierNum = formData.whole_price_tier ? parseInt(formData.whole_price_tier.replace("tier_", ""), 10) : undefined
    const body: Record<string, any> = {
      name: formData.name,
      is_active: formData.is_active,
      ...(tierNum ? { whole_price_tier: tierNum } : {}),
    }
    if (!isEditing) {
      body.type = formData.type
    }
    if (formData.type === "time_of_day") {
      body.schedule = {
        start_time: formData.start_time,
        end_time: formData.end_time,
        days_of_week: formData.days_of_week,
      }
    }
    if (formData.type === "customer_grade_targeted") {
      body.grade_target = formData.target_grade
    }

    const url = isEditing && selectedTemplate
      ? `/api/business/recommendation-templates/${selectedTemplate.id}`
      : "/api/business/recommendation-templates"
    const method = isEditing ? "PATCH" : "POST"

    apiFetch(url, { method, body: JSON.stringify(body) })
      .then(() => {
        setShowAddModal(false)
        fetchTemplates()
      })
      .catch((e: any) => setError(e.message ?? "Failed to save template"))
      .finally(() => setIsSaving(false))
  }

  // DELETE /api/business/recommendation-templates/:id
  const handleDeleteTemplate = (templateId: string) => {
    setIsDeleting(true)
    setError(null)
    apiFetch(`/api/business/recommendation-templates/${templateId}`, { method: "DELETE" })
      .then(() => {
        setShowDetailPanel(false)
        setSelectedTemplate(null)
        fetchTemplates()
      })
      .catch((e: any) => setError(e.message ?? "Failed to delete template"))
      .finally(() => setIsDeleting(false))
  }

  // PUT /api/business/recommendation-templates/:id/items
  const handleSaveItems = () => {
    if (!selectedTemplate) return
    setIsSavingItems(true)
    setError(null)
    apiFetch(`/api/business/recommendation-templates/${selectedTemplate.id}/items`, {
      method: "PUT",
      body: JSON.stringify({ items: pendingItemIds.map((product_id, idx) => ({ product_id, sort_order: idx + 1 })) }),
    })
      .then(() => {
        fetchTemplates()
        // Sync selectedTemplate.items locally for immediate feedback
        setSelectedTemplate(prev => prev ? { ...prev, items: pendingItemIds.map((pid, idx) => ({
          id: pid,
          product_id: pid,
          product_name: productSearchResults.find(p => p.id === pid)?.name ?? pid,
          category: productSearchResults.find(p => p.id === pid)?.category ?? "",
          price: productSearchResults.find(p => p.id === pid)?.price ?? 0,
          sort_order: idx + 1,
        })) } : prev)
      })
      .catch((e: any) => setError(e.message ?? "Failed to save items"))
      .finally(() => setIsSavingItems(false))
  }

  // Product search (uses business products endpoint)
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductSearchResults([])
      return
    }
    const timeout = setTimeout(() => {
      apiFetch<{ data: any[] }>(`/api/business/products?search=${encodeURIComponent(productSearch)}&limit=10`)
        .then(res => {
          setProductSearchResults((res.data ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku ?? "",
            category: p.category_name ?? p.category ?? "",
            price: p.price_ttc ?? p.price ?? 0,
          })))
        })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(timeout)
  }, [productSearch])

  const handleAddItemToTemplate = (product: Product) => {
    if (pendingItemIds.includes(product.id)) return
    setPendingItemIds(prev => [...prev, product.id])
    setProductSearchResults(prev => {
      if (prev.find(p => p.id === product.id)) return prev
      return [...prev, product]
    })
    setProductSearch("")
  }

  const handleRemoveItemFromTemplate = (productId: string) => {
    setPendingItemIds(prev => prev.filter(id => id !== productId))
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

  return (
    <div className="h-full">
      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded"><X className="w-4 h-4 text-red-500" /></button>
        </div>
      )}

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
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)} disabled={isSaving}>{LABELS.cancel}</Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveTemplate} disabled={isSaving || !formData.name.trim()}>
              <Check className="w-4 h-4" />
              {isSaving ? "Saving..." : `${isEditing ? COMMON_LABELS.update : COMMON_LABELS.create} Template`}
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
                <Button variant="ghost" size="sm" onClick={() => selectedTemplate && handleEditTemplate(selectedTemplate)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  disabled={isDeleting}
                  onClick={() => selectedTemplate && handleDeleteTemplate(selectedTemplate.id)}
                >
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
                      {productSearchResults.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">No products found</p>
                      ) : productSearchResults.slice(0, 5).map(product => (
                        <button
                          key={product.id}
                          onClick={() => handleAddItemToTemplate(product)}
                          disabled={pendingItemIds.includes(product.id)}
                          className="w-full flex items-center justify-between p-2 hover:bg-white dark:hover:bg-[#2a2a32] rounded-lg text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{product.category} • {product.sku}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{formatPrice(product.price)}</span>
                            {pendingItemIds.includes(product.id)
                              ? <Check className="w-4 h-4 text-green-500" />
                              : <Plus className="w-4 h-4 text-indigo-500" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Current Items (driven by pendingItemIds) */}
                  <div className="space-y-2">
                    {pendingItemIds.map((productId, index) => {
                      // Try to resolve display info from saved items first, then from search results
                      const savedItem = selectedTemplate.items?.find(i => i.product_id === productId)
                      const searchItem = productSearchResults.find(p => p.id === productId)
                      const displayName = savedItem?.product_name ?? searchItem?.name ?? productId
                      const displayCategory = savedItem?.category ?? searchItem?.category ?? ""
                      const displayPrice = savedItem?.price ?? searchItem?.price ?? 0
                      return (
                        <div
                          key={productId}
                          className="flex items-center gap-3 p-3 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                          <span className="w-6 h-6 bg-gray-100 dark:bg-[#1F1F23] rounded text-xs flex items-center justify-center text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{displayCategory}</p>
                          </div>
                          <span className="font-mono text-sm text-gray-600 dark:text-gray-300">{formatPrice(displayPrice)}</span>
                          <button
                            onClick={() => handleRemoveItemFromTemplate(productId)}
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}

                    {pendingItemIds.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No items added yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button variant="primary" className="w-full" onClick={handleSaveItems} disabled={isSavingItems}>
                  <Check className="w-4 h-4" />
                  {isSavingItems ? "Saving..." : `${LABELS.save} Items`}
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
            {(() => {
              // For auto-resolved types, show featured items; otherwise show template items
              const isAutoType = selectedTemplate?.type === "top_seller" || selectedTemplate?.type === "high_margin"
              const displayItems = isAutoType
                ? featuredItems.map(p => ({ product_name: p.name, category: p.category, price: p.price }))
                : (selectedTemplate?.items ?? []).map(i => ({ product_name: i.product_name, category: i.category, price: i.price }))
              if (displayItems.length === 0) {
                return (
                  <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No items to preview</p>
                  </div>
                )
              }
              return displayItems.map((item, i) => (
                <div key={i} className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
                  <div className="w-full h-24 bg-gray-200 dark:bg-[#1F1F23] rounded-lg mb-3 flex items-center justify-center">
                    <Tag className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{item.product_name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.category}</p>
                  <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">{formatPrice(item.price)}</p>
                </div>
              ))
            })()}
          </div>
          
          <Button variant="secondary" className="w-full" onClick={() => setShowPreviewModal(false)}>{COMMON_LABELS.close} Preview</Button>
        </div>
      </Modal>
    </div>
  )
}



