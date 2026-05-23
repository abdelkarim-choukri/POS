"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  X,
  Calendar,
  Percent,
  DollarSign,
  Gift,
  Pause,
  Play,
  Archive,
  Pencil,
  Tag,
  Clock,
  Users,
  ShoppingBag,
  Share2,
  CheckCircle,
  AlertTriangle,
  Building2,
} from "lucide-react"

// ============== TYPES ==============
type PromotionType = "percentage_discount" | "fixed_discount" | "buy_x_get_y"
type PromotionStatus = "active" | "scheduled" | "paused" | "archived"

interface Promotion {
  id: string
  name: string
  description: string
  type: PromotionType
  discount_value: number
  buy_quantity?: number
  get_quantity?: number
  start_date: string
  end_date: string
  days_of_week: string[]
  min_order_amount?: number
  max_uses_total?: number
  max_uses_per_customer?: number
  applicable_categories: string[]
  applicable_products: string[]
  status: PromotionStatus
  usage_count: number
}

// Chain rollout types
interface ChildBusiness {
  id: string
  name: string
  tva_rate: number
  products_mapped: number
  total_products: number
}

interface ValidationResult {
  business_id: string
  business_name: string
  tva_compatible: boolean
  tva_mismatch_reason?: string
  products_mapped: number
  total_products: number
}

// Mock chain data
const mockCurrentBusiness = {
  id: "1",
  name: "Main Restaurant",
  chain_role: "parent" as const, // "parent" | "child" | "standalone"
  tva_rate: 20,
}

const mockChildBusinesses: ChildBusiness[] = [
  { id: "2", name: "Branch - Casablanca", tva_rate: 20, products_mapped: 45, total_products: 50 },
  { id: "3", name: "Branch - Rabat", tva_rate: 20, products_mapped: 50, total_products: 50 },
  { id: "4", name: "Branch - Marrakech", tva_rate: 14, products_mapped: 38, total_products: 50 },
  { id: "5", name: "Branch - Agadir", tva_rate: 20, products_mapped: 42, total_products: 50 },
]

// ============== MOCK DATA ==============
const mockCategories = [
  { id: "1", name: "Beverages" },
  { id: "2", name: "Food" },
  { id: "3", name: "Desserts" },
  { id: "4", name: "Snacks" },
  { id: "5", name: "Merchandise" },
]

const mockProducts = [
  { id: "1", name: "Cappuccino", category: "Beverages" },
  { id: "2", name: "Latte", category: "Beverages" },
  { id: "3", name: "Espresso", category: "Beverages" },
  { id: "4", name: "Croissant", category: "Food" },
  { id: "5", name: "Sandwich", category: "Food" },
  { id: "6", name: "Cheesecake", category: "Desserts" },
  { id: "7", name: "Brownie", category: "Desserts" },
  { id: "8", name: "Chips", category: "Snacks" },
]

const mockPromotions: Promotion[] = [
  {
    id: "1",
    name: "Summer Sale",
    description: "20% off all beverages during summer season",
    type: "percentage_discount",
    discount_value: 20,
    start_date: "2026-05-01",
    end_date: "2026-05-31",
    days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    min_order_amount: 50,
    max_uses_total: 1000,
    max_uses_per_customer: 5,
    applicable_categories: ["Beverages"],
    applicable_products: [],
    status: "active",
    usage_count: 142,
  },
  {
    id: "2",
    name: "Weekend Brunch Special",
    description: "15 MAD off orders over 100 MAD on weekends",
    type: "fixed_discount",
    discount_value: 15,
    start_date: "2026-05-01",
    end_date: "2026-06-30",
    days_of_week: ["Sat", "Sun"],
    min_order_amount: 100,
    applicable_categories: [],
    applicable_products: [],
    status: "active",
    usage_count: 89,
  },
  {
    id: "3",
    name: "Buy 2 Get 1 Free Coffee",
    description: "Buy any 2 coffees and get the 3rd one free",
    type: "buy_x_get_y",
    discount_value: 100,
    buy_quantity: 2,
    get_quantity: 1,
    start_date: "2026-06-01",
    end_date: "2026-06-15",
    days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    applicable_categories: [],
    applicable_products: ["Cappuccino", "Latte", "Espresso"],
    status: "scheduled",
    usage_count: 0,
  },
  {
    id: "4",
    name: "Happy Hour",
    description: "30% off all items between 3-5 PM",
    type: "percentage_discount",
    discount_value: 30,
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    applicable_categories: [],
    applicable_products: [],
    status: "paused",
    usage_count: 256,
  },
  {
    id: "5",
    name: "Spring Promo 2025",
    description: "10% off desserts - ended campaign",
    type: "percentage_discount",
    discount_value: 10,
    start_date: "2025-03-01",
    end_date: "2025-03-31",
    days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    applicable_categories: ["Desserts"],
    applicable_products: [],
    status: "archived",
    usage_count: 412,
  },
  {
    id: "6",
    name: "Loyalty Reward",
    description: "25 MAD off for returning customers",
    type: "fixed_discount",
    discount_value: 25,
    start_date: "2026-05-01",
    end_date: "2026-12-31",
    days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    min_order_amount: 75,
    max_uses_per_customer: 1,
    applicable_categories: [],
    applicable_products: [],
    status: "active",
    usage_count: 67,
  },
]

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// ============== UTILITY FUNCTIONS ==============
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const getTypeConfig = (type: PromotionType) => {
  switch (type) {
    case "percentage_discount":
      return { label: "Percentage", color: "bg-blue-100 text-blue-700", icon: Percent }
    case "fixed_discount":
      return { label: "Fixed Amount", color: "bg-purple-100 text-purple-700", icon: DollarSign }
    case "buy_x_get_y":
      return { label: "Buy X Get Y", color: "bg-amber-100 text-amber-700", icon: Gift }
  }
}

const getStatusConfig = (status: PromotionStatus) => {
  switch (status) {
    case "active":
      return { label: "Active", color: "bg-green-100 text-green-700" }
    case "scheduled":
      return { label: "Scheduled", color: "bg-blue-100 text-blue-700" }
    case "paused":
      return { label: "Paused", color: "bg-amber-100 text-amber-700" }
    case "archived":
      return { label: "Archived", color: "bg-gray-100 text-gray-600" }
  }
}

// ============== COMPONENTS ==============
function PromotionCard({
  promotion,
  onEdit,
  onToggleStatus,
  onArchive,
}: {
  promotion: Promotion
  onEdit: () => void
  onToggleStatus: () => void
  onArchive: () => void
}) {
  const typeConfig = getTypeConfig(promotion.type)
  const statusConfig = getStatusConfig(promotion.status)
  const TypeIcon = typeConfig.icon

  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-lg">{promotion.name}</h3>
          <p className="text-muted-foreground text-sm mt-1">{promotion.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
          <TypeIcon className="w-3 h-3" />
          {typeConfig.label}
          {promotion.type === "percentage_discount" && `: ${promotion.discount_value}%`}
          {promotion.type === "fixed_discount" && `: ${promotion.discount_value} MAD`}
          {promotion.type === "buy_x_get_y" && `: Buy ${promotion.buy_quantity} Get ${promotion.get_quantity}`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(promotion.start_date)} – {formatDate(promotion.end_date)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Tag className="w-4 h-4" />
          <span>{promotion.usage_count} redemptions</span>
        </div>
      </div>

      {(promotion.applicable_categories.length > 0 || promotion.applicable_products.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {promotion.applicable_categories.map((cat) => (
            <span key={cat} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">
              {cat}
            </span>
          ))}
          {promotion.applicable_products.map((prod) => (
            <span key={prod} className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs">
              {prod}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
        {promotion.status !== "archived" && (
          <>
            <button
              onClick={onToggleStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                promotion.status === "paused"
                  ? "text-green-600 hover:bg-green-50"
                  : "text-amber-600 hover:bg-amber-50"
              }`}
            >
              {promotion.status === "paused" ? (
                <>
                  <Play className="w-4 h-4" />
                  Activate
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              )}
            </button>
            <button
              onClick={onArchive}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function CreateEditModal({
  isOpen,
  onClose,
  promotion,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  promotion: Promotion | null
  onSave: (data: Partial<Promotion>) => void
}) {
  const [formData, setFormData] = useState<Partial<Promotion>>(
    promotion || {
      name: "",
      description: "",
      type: "percentage_discount",
      discount_value: 10,
      buy_quantity: 2,
      get_quantity: 1,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      min_order_amount: undefined,
      max_uses_total: undefined,
      max_uses_per_customer: undefined,
      applicable_categories: [],
      applicable_products: [],
    }
  )

  const [selectedCategories, setSelectedCategories] = useState<string[]>(promotion?.applicable_categories || [])
  const [selectedProducts, setSelectedProducts] = useState<string[]>(promotion?.applicable_products || [])
  const [selectedDays, setSelectedDays] = useState<string[]>(promotion?.days_of_week || DAYS_OF_WEEK)

  if (!isOpen) return null

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const toggleProduct = (prod: string) => {
    setSelectedProducts((prev) =>
      prev.includes(prod) ? prev.filter((p) => p !== prod) : [...prev, prod]
    )
  }

  const handleSubmit = () => {
    onSave({
      ...formData,
      days_of_week: selectedDays,
      applicable_categories: selectedCategories,
      applicable_products: selectedProducts,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-foreground">
            {promotion ? "Edit Promotion" : "Create Promotion"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Promotion Name
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Summer Sale"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
              placeholder="Brief description of the promotion"
            />
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Promotion Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["percentage_discount", "fixed_discount", "buy_x_get_y"] as PromotionType[]).map((type) => {
                const config = getTypeConfig(type)
                const Icon = config.icon
                const isSelected = formData.type === type
                return (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, type })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? "border-primary bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                      {config.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Discount Value */}
          <div className="grid grid-cols-2 gap-4">
            {formData.type === "buy_x_get_y" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Buy Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.buy_quantity || 2}
                    onChange={(e) => setFormData({ ...formData, buy_quantity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Get Quantity (Free)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.get_quantity || 1}
                    onChange={(e) => setFormData({ ...formData, get_quantity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Discount Value {formData.type === "percentage_discount" ? "(%)" : "(MAD)"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={formData.type === "percentage_discount" ? 100 : undefined}
                  value={formData.discount_value || 0}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date || ""}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date || ""}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Active Days
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day)
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-muted"
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Optional Limits */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Min Order (MAD)
              </label>
              <input
                type="number"
                min={0}
                value={formData.min_order_amount || ""}
                onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Max Uses Total
              </label>
              <input
                type="number"
                min={0}
                value={formData.max_uses_total || ""}
                onChange={(e) => setFormData({ ...formData, max_uses_total: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Max Per Customer
              </label>
              <input
                type="number"
                min={0}
                value={formData.max_uses_per_customer || ""}
                onChange={(e) => setFormData({ ...formData, max_uses_per_customer: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Applicable Categories */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Applicable Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {mockCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.name)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-secondary text-secondary-foreground hover:bg-muted"
                    }`}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leave empty to apply to all categories</p>
          </div>

          {/* Applicable Products */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Applicable Products
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {mockProducts.map((prod) => {
                const isSelected = selectedProducts.includes(prod.name)
                return (
                  <button
                    key={prod.id}
                    onClick={() => toggleProduct(prod.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-purple-500 text-white"
                        : "bg-secondary text-secondary-foreground hover:bg-muted"
                    }`}
                  >
                    {prod.name}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leave empty to apply to all products</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border sticky bottom-0 bg-card">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            {promotion ? "Save Changes" : "Create Promotion"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============== MAIN COMPONENT ==============
export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>(mockPromotions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"all" | PromotionStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  
  // Chain rollout state
  const [showRolloutModal, setShowRolloutModal] = useState(false)
  const [rolloutStep, setRolloutStep] = useState<1 | 2>(1)
  const [selectedRolloutPromotion, setSelectedRolloutPromotion] = useState<string>("")
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [excludedStores, setExcludedStores] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)

  const fetchPromotions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: any[]; total: number }>("/api/business/promotions")
      const mapped: Promotion[] = res.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        type: p.type,
        discount_value: p.value ?? p.discount_value ?? 0,
        buy_quantity: p.buy_quantity,
        get_quantity: p.get_quantity,
        start_date: p.start_date,
        end_date: p.end_date,
        days_of_week: p.days_of_week ?? [],
        min_order_amount: p.min_order_amount,
        max_uses_total: p.max_uses,
        max_uses_per_customer: p.max_uses_per_customer,
        applicable_categories: p.applicable_categories ?? [],
        applicable_products: p.applicable_products ?? [],
        status: p.status,
        usage_count: p.current_uses ?? 0,
      }))
      setPromotions(mapped)
    } catch (e: any) {
      setError(e.message ?? "Failed to load promotions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPromotions() }, [])

  const tabs: { key: "all" | PromotionStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "scheduled", label: "Scheduled" },
    { key: "paused", label: "Paused" },
    { key: "archived", label: "Archived" },
  ]

  const filteredPromotions = promotions.filter((promo) => {
    const matchesTab = activeTab === "all" || promo.status === activeTab
    const matchesSearch =
      promo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditingPromotion(null)
    setIsModalOpen(true)
  }

  const handleToggleStatus = async (promotionId: string) => {
    const promo = promotions.find(p => p.id === promotionId)
    if (!promo) return
    const endpoint = promo.status === "paused" ? "activate" : "pause"
    try {
      await apiFetch(`/api/business/promotions/${promotionId}/${endpoint}`, { method: "POST" })
      await fetchPromotions()
    } catch (e: any) {
      setError(e.message ?? `Failed to ${endpoint} promotion`)
    }
  }

  const handleArchive = async (promotionId: string) => {
    try {
      await apiFetch(`/api/business/promotions/${promotionId}/archive`, { method: "POST" })
      await fetchPromotions()
    } catch (e: any) {
      setError(e.message ?? "Failed to archive promotion")
    }
  }

  const handleSave = (data: Partial<Promotion>) => {
    if (editingPromotion) {
      setPromotions((prev) =>
        prev.map((p) => (p.id === editingPromotion.id ? { ...p, ...data } : p))
      )
    } else {
      const newPromotion: Promotion = {
        id: String(Date.now()),
        name: data.name || "New Promotion",
        description: data.description || "",
        type: data.type || "percentage_discount",
        discount_value: data.discount_value || 10,
        buy_quantity: data.buy_quantity,
        get_quantity: data.get_quantity,
        start_date: data.start_date || new Date().toISOString().split("T")[0],
        end_date: data.end_date || new Date().toISOString().split("T")[0],
        days_of_week: data.days_of_week || DAYS_OF_WEEK,
        min_order_amount: data.min_order_amount,
        max_uses_total: data.max_uses_total,
        max_uses_per_customer: data.max_uses_per_customer,
        applicable_categories: data.applicable_categories || [],
        applicable_products: data.applicable_products || [],
        status: "scheduled",
        usage_count: 0,
      }
      setPromotions((prev) => [newPromotion, ...prev])
    }
  }

  // Chain rollout handlers
  const handleOpenRollout = () => {
    setShowRolloutModal(true)
    setRolloutStep(1)
    setSelectedRolloutPromotion("")
    setValidationResults([])
    setExcludedStores([])
  }

  const handleValidateStores = () => {
    setIsValidating(true)
    // Simulate API call
    setTimeout(() => {
      const results: ValidationResult[] = mockChildBusinesses.map(child => ({
        business_id: child.id,
        business_name: child.name,
        tva_compatible: child.tva_rate === mockCurrentBusiness.tva_rate,
        tva_mismatch_reason: child.tva_rate !== mockCurrentBusiness.tva_rate 
          ? `TVA rate mismatch: ${child.tva_rate}% vs parent ${mockCurrentBusiness.tva_rate}%` 
          : undefined,
        products_mapped: child.products_mapped,
        total_products: child.total_products,
      }))
      setValidationResults(results)
      // Auto-exclude incompatible stores
      const incompatible = results.filter(r => !r.tva_compatible).map(r => r.business_id)
      setExcludedStores(incompatible)
      setIsValidating(false)
    }, 1000)
  }

  const handleToggleStoreExclusion = (businessId: string) => {
    setExcludedStores(prev => 
      prev.includes(businessId) 
        ? prev.filter(id => id !== businessId) 
        : [...prev, businessId]
    )
  }

  const handleConfirmRollout = () => {
    const includedStores = validationResults.filter(r => !excludedStores.includes(r.business_id))
    // In real app, this would call the API
    console.log("Rolling out promotion", selectedRolloutPromotion, "to stores:", includedStores)
    setShowRolloutModal(false)
    // Show success toast in real app
  }

  const getActivePromotions = () => promotions.filter(p => p.status === "active")

  // Stats
  const activeCount = promotions.filter((p) => p.status === "active").length
  const scheduledCount = promotions.filter((p) => p.status === "scheduled").length
  const totalRedemptions = promotions.reduce((sum, p) => sum + p.usage_count, 0)

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promotions</h1>
          <p className="text-muted-foreground mt-1">Manage promotional discounts and offers</p>
        </div>
        <div className="flex items-center gap-3">
          {mockCurrentBusiness.chain_role === "parent" && (
            <button
              onClick={handleOpenRollout}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium border border-border"
            >
              <Share2 className="w-5 h-5" />
              Rollout to Chain
            </button>
          )}
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Promotion
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-xl font-bold text-foreground">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-xl font-bold text-foreground">{scheduledCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-lg">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Promotions</p>
              <p className="text-xl font-bold text-foreground">{promotions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Redemptions</p>
              <p className="text-xl font-bold text-foreground">{totalRedemptions.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search promotions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Promotions Grid */}
      {filteredPromotions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromotions.map((promotion) => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              onEdit={() => handleEdit(promotion)}
              onToggleStatus={() => handleToggleStatus(promotion.id)}
              onArchive={() => handleArchive(promotion.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No promotions found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Create your first promotion to get started"}
          </p>
        </div>
      )}

      {/* Modal */}
      <CreateEditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingPromotion(null)
        }}
        promotion={editingPromotion}
        onSave={handleSave}
      />

      {/* Chain Rollout Modal */}
      {showRolloutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Rollout to Chain
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Step {rolloutStep} of 2: {rolloutStep === 1 ? "Validate Stores" : "Confirm Rollout"}
                </p>
              </div>
              <button
                onClick={() => setShowRolloutModal(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {rolloutStep === 1 && (
                <>
                  {/* Promotion Selector */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Select Promotion to Rollout
                    </label>
                    <select
                      value={selectedRolloutPromotion}
                      onChange={(e) => setSelectedRolloutPromotion(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Choose a promotion...</option>
                      {getActivePromotions().map(promo => (
                        <option key={promo.id} value={promo.id}>{promo.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedRolloutPromotion && !validationResults.length && (
                    <button
                      onClick={handleValidateStores}
                      disabled={isValidating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                    >
                      {isValidating ? "Validating..." : "Validate Stores"}
                    </button>
                  )}

                  {/* Validation Results */}
                  {validationResults.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground">Validation Results</h4>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-secondary/50">
                            <tr>
                              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Include</th>
                              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Store</th>
                              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">TVA Status</th>
                              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Products</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {validationResults.map((result) => (
                              <tr key={result.business_id} className={excludedStores.includes(result.business_id) ? "bg-muted/30" : ""}>
                                <td className="p-3">
                                  <input
                                    type="checkbox"
                                    checked={!excludedStores.includes(result.business_id)}
                                    onChange={() => handleToggleStoreExclusion(result.business_id)}
                                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground">{result.business_name}</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  {result.tva_compatible ? (
                                    <span className="flex items-center gap-1.5 text-green-600 text-sm">
                                      <CheckCircle className="w-4 h-4" /> Compatible
                                    </span>
                                  ) : (
                                    <div>
                                      <span className="flex items-center gap-1.5 text-amber-600 text-sm">
                                        <AlertTriangle className="w-4 h-4" /> Mismatch
                                      </span>
                                      <p className="text-xs text-muted-foreground mt-0.5">{result.tva_mismatch_reason}</p>
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                                    {result.products_mapped}/{result.total_products} mapped
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setValidationResults([])
                            setExcludedStores([])
                          }}
                          className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                        >
                          Re-validate
                        </button>
                        <button
                          onClick={() => setRolloutStep(2)}
                          disabled={validationResults.filter(r => !excludedStores.includes(r.business_id)).length === 0}
                          className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                        >
                          Continue to Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {rolloutStep === 2 && (
                <div className="space-y-5">
                  {/* Summary */}
                  <div className="bg-secondary/30 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-2">Rollout Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      Rolling out <span className="font-medium text-foreground">{promotions.find(p => p.id === selectedRolloutPromotion)?.name}</span> to{" "}
                      <span className="font-medium text-foreground">{validationResults.filter(r => !excludedStores.includes(r.business_id)).length}</span> stores
                    </p>
                  </div>

                  {/* Included Stores List */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Included Stores</h4>
                    <div className="space-y-2">
                      {validationResults.filter(r => !excludedStores.includes(r.business_id)).map(result => (
                        <div key={result.business_id} className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-foreground">{result.business_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setRolloutStep(1)}
                      className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmRollout}
                      className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Confirm Rollout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


