"use client"

import { useState, useEffect, useCallback } from "react"
import { useTheme } from "next-themes"
import { apiFetch } from "@/lib/api"
import {
  Building2,
  Users,
  Monitor,
  TrendingUp,
  DollarSign,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Settings,
  Power,
  BarChart3,
  Zap,
  Globe,
  Server,
  CreditCard,
  HeadphonesIcon,
  FileText,
  Sliders,
  RefreshCw,
  MessageSquare,
  Download,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  GitBranch,
  Megaphone,
  Tag,
  Send,
  ChevronDown,
  ChevronUp,
  Store,
  ShoppingBag,
  Truck,
  Link2,
  Unlink,
  Check,
  Sun,
  Moon,
} from "lucide-react"

// ==================== TYPES ====================
interface Business {
  id: string
  name: string
  owner_name: string
  owner_email: string
  plan: "starter" | "professional" | "enterprise"
  status: "active" | "suspended" | "trial"
  locations_count: number
  terminals_count: number
  employees_count: number
  monthly_revenue: number
  created_at: string
  trial_ends_at?: string
}

interface SystemStats {
  total_businesses: number
  active_businesses: number
  total_terminals: number
  online_terminals: number
  total_transactions_today: number
  total_revenue_today: number
  system_health: "healthy" | "degraded" | "down"
}

// ==================== API TYPES ====================
interface Terminal {
  id: string
  terminal_code?: string
  business_id?: string
  location_id?: string
  business?: string
  location?: string
  status?: string
  last_seen?: string
  version?: string
  transactions_today?: number
}

interface AuditLog {
  id: number | string
  action: string
  actor?: string
  performed_by?: string
  target?: string
  entity_type?: string
  timestamp?: string
  created_at?: string
  ip?: string
}

interface Announcement {
  id: string | number
  title: string
  body?: string
  message?: string
  type?: string
  status?: string
  target?: string
  target_business_types?: string[]
  starts_at?: string
  ends_at?: string
  created_at?: string
  created?: string
}

// ============== CONFIG TAB MOCK DATA ==============
interface BusinessType {
  id: string
  name: string
  description: string
  business_count: number
  features: {
    loyalty_points: boolean
    promotions_campaigns: boolean
    coupons_vouchers: boolean
    inventory_management: boolean
    restaurant_operations: boolean
    kitchen_display_system: boolean
    chain_multi_store: boolean
    recommendations_engine: boolean
  }
}

interface TradeCategory {
  id: string
  name_fr: string
  name_ar?: string
  icon_name: string
  sort_order: number
  parent_id: string | null
  business_count: number
  children?: TradeCategory[]
}

interface Courier {
  id: string
  name: string
  phone?: string
  email?: string
  website?: string
  notes?: string
  is_active: boolean
  linked_businesses: { id: string; name: string }[]
}

interface SystemParameter {
  key: string
  value: string
  description: string
  updated_at: string
}

// ============== SUBSCRIPTIONS TYPES ==============
type SubscriptionPlan = "free" | "starter" | "professional" | "enterprise"
type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled"

interface Subscription {
  id: string
  business_id: string
  business_name: string
  owner_email: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  started_at: string
  expires_at: string | null
  amount_paid: number
  created_by: string
  notes?: string
}


// ==================== REUSABLE COMPONENTS ====================
function Badge({ children, color, className = "" }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" | "purple" | "indigo"; className?: string }) {
  const colors = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]} ${className}`}>{children}</span>
}

function Button({ children, variant = "primary", size = "md", className = "", onClick, disabled }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base = "font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  }
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
  }
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!isOpen) return null
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================
// ============== CONFIG TAB COMPONENT ==============
function ConfigTab() {
  const [activeConfigSection, setActiveConfigSection] = useState<"business_types" | "trade_categories" | "couriers" | "system_params">("business_types")
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([])
  const [expandedBusinessType, setExpandedBusinessType] = useState<string | null>(null)
  const [tradeCategories, setTradeCategories] = useState<TradeCategory[]>([])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [expandedCourier, setExpandedCourier] = useState<string | null>(null)
  const [systemParams, setSystemParams] = useState<SystemParameter[]>([])
  const [editingParamKey, setEditingParamKey] = useState<string | null>(null)
  const [editingParamValue, setEditingParamValue] = useState<string>("")
  const [savedParamKey, setSavedParamKey] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configLoading, setConfigLoading] = useState(false)

  // Modals
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false)
  const [businessTypeForm, setBusinessTypeForm] = useState({ name: "", features: [] as string[] })
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showCourierModal, setShowCourierModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TradeCategory | null>(null)
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name_fr: "", name_ar: "", parent_id: "", icon_name: "", sort_order: 0 })
  const [courierForm, setCourierForm] = useState({ name: "", phone: "", email: "", website: "", notes: "" })

  // Fetch data when section changes
  useEffect(() => {
    setConfigError(null)
    if (activeConfigSection === "business_types") {
      setConfigLoading(true)
      apiFetch<BusinessType[]>("/api/super/business-types")
        .then(data => setBusinessTypes(data))
        .catch((e: any) => setConfigError(e.message ?? "Failed to load business types"))
        .finally(() => setConfigLoading(false))
    } else if (activeConfigSection === "trade_categories") {
      setConfigLoading(true)
      apiFetch<{ data: TradeCategory[] } | TradeCategory[]>("/api/super/trade-categories/tree")
        .then(data => setTradeCategories(Array.isArray(data) ? data : (data as any).data ?? []))
        .catch((e: any) => setConfigError(e.message ?? "Failed to load trade categories"))
        .finally(() => setConfigLoading(false))
    } else if (activeConfigSection === "couriers") {
      setConfigLoading(true)
      apiFetch<{ data: Courier[] } | Courier[]>("/api/super/couriers")
        .then(data => setCouriers(Array.isArray(data) ? data : (data as any).data ?? []))
        .catch((e: any) => setConfigError(e.message ?? "Failed to load couriers"))
        .finally(() => setConfigLoading(false))
    } else if (activeConfigSection === "system_params") {
      setConfigLoading(true)
      apiFetch<{ data: SystemParameter[] } | SystemParameter[]>("/api/super/system-parameters")
        .then(data => setSystemParams(Array.isArray(data) ? data : (data as any).data ?? []))
        .catch((e: any) => setConfigError(e.message ?? "Failed to load system parameters"))
        .finally(() => setConfigLoading(false))
    }
  }, [activeConfigSection])

  const handleToggleFeature = (typeId: string, feature: keyof BusinessType["features"]) => {
    const bt = businessTypes.find(b => b.id === typeId)
    if (!bt) return
    const updatedFeatures = { ...bt.features, [feature]: !bt.features[feature] }
    // Optimistic update
    setBusinessTypes(prev => prev.map(b =>
      b.id === typeId ? { ...b, features: updatedFeatures } : b
    ))
    apiFetch<BusinessType>(`/api/super/business-types/${typeId}/features`, {
      method: "PUT",
      body: JSON.stringify({ features: Object.entries(updatedFeatures).filter(([, v]) => v).map(([k]) => k) }),
    }).catch((e: any) => {
      // Revert on error
      setBusinessTypes(prev => prev.map(b =>
        b.id === typeId ? { ...b, features: bt.features } : b
      ))
      setConfigError(e.message ?? "Failed to update features")
    })
  }

  const handleSaveBusinessTypeFeatures = (typeId: string) => {
    const bt = businessTypes.find(b => b.id === typeId)
    if (!bt) return
    const featuresArr = Object.entries(bt.features).filter(([, v]) => v).map(([k]) => k)
    apiFetch<BusinessType>(`/api/super/business-types/${typeId}/features`, {
      method: "PUT",
      body: JSON.stringify({ features: featuresArr }),
    }).catch((e: any) => setConfigError(e.message ?? "Failed to save features"))
  }

  const handleSaveParam = (key: string) => {
    apiFetch<SystemParameter>(`/api/super/system-parameters/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value: editingParamValue }),
    })
      .then(updated => {
        setSystemParams(prev => prev.map(p => p.key === key ? { ...p, value: editingParamValue, updated_at: updated.updated_at ?? "just now" } : p))
        setSavedParamKey(key)
        setEditingParamKey(null)
        setTimeout(() => setSavedParamKey(null), 2000)
      })
      .catch((e: any) => setConfigError(e.message ?? "Failed to save parameter"))
  }

  const handleCreateBusinessType = () => {
    if (!businessTypeForm.name.trim()) return
    apiFetch<BusinessType>("/api/super/business-types", {
      method: "POST",
      body: JSON.stringify({ name: businessTypeForm.name, features: businessTypeForm.features }),
    })
      .then(() => {
        setShowBusinessTypeModal(false)
        setBusinessTypeForm({ name: "", features: [] })
        return apiFetch<BusinessType[]>("/api/super/business-types")
      })
      .then(data => setBusinessTypes(Array.isArray(data) ? data : (data as any).data ?? []))
      .catch((e: any) => setConfigError(e.message ?? "Failed to create business type"))
  }

  const handleSaveCategory = () => {
    const isEdit = !!editingCategory
    const method = isEdit ? "PATCH" : "POST"
    const url = isEdit ? `/api/super/trade-categories/${editingCategory!.id}` : "/api/super/trade-categories"
    apiFetch<TradeCategory>(url, { method, body: JSON.stringify(categoryForm) })
      .then(() => {
        setShowCategoryModal(false)
        return apiFetch<{ data: TradeCategory[] } | TradeCategory[]>("/api/super/trade-categories/tree")
      })
      .then(data => setTradeCategories(Array.isArray(data) ? data : (data as any).data ?? []))
      .catch((e: any) => setConfigError(e.message ?? "Failed to save category"))
  }

  const handleSaveCourier = () => {
    const isEdit = !!editingCourier
    const method = isEdit ? "PUT" : "POST"
    const url = isEdit ? `/api/super/couriers/${editingCourier!.id}` : "/api/super/couriers"
    apiFetch<Courier>(url, { method, body: JSON.stringify(courierForm) })
      .then(() => {
        setShowCourierModal(false)
        return apiFetch<{ data: Courier[] } | Courier[]>("/api/super/couriers")
      })
      .then(data => setCouriers(Array.isArray(data) ? data : (data as any).data ?? []))
      .catch((e: any) => setConfigError(e.message ?? "Failed to save courier"))
  }

  const configSections = [
    { id: "business_types", label: "Business Types", icon: Store },
    { id: "trade_categories", label: "Trade Categories", icon: Tag },
    { id: "couriers", label: "Couriers", icon: Truck },
    { id: "system_params", label: "System Parameters", icon: Settings },
  ] as const

  return (
    <div className="space-y-6">
      {configError && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
          {configError}
        </div>
      )}
      {configLoading && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading...</div>
      )}
      {/* Inner Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-4">
        {configSections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveConfigSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeConfigSection === section.id
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Business Types Section */}
      {activeConfigSection === "business_types" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Business Types & Feature Flags</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configure which features are available for each business type</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => {
              setBusinessTypeForm({ name: "", features: [] })
              setShowBusinessTypeModal(true)
            }}>
              <Plus className="w-4 h-4" />
              Add Type
            </Button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {businessTypes.map(bt => (
              <div key={bt.id}>
                <button
                  onClick={() => setExpandedBusinessType(expandedBusinessType === bt.id ? null : bt.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <Store className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{bt.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{bt.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color="blue">{bt.business_count} businesses</Badge>
                    {expandedBusinessType === bt.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                </button>
                {expandedBusinessType === bt.id && (
                  <div className="px-4 pb-4 bg-gray-100/50 dark:bg-gray-800/30">
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      {[
                        { key: "loyalty_points", label: "Loyalty & Points" },
                        { key: "promotions_campaigns", label: "Promotions & Campaigns" },
                        { key: "coupons_vouchers", label: "Coupons & Vouchers" },
                        { key: "inventory_management", label: "Inventory Management" },
                        { key: "restaurant_operations", label: "Restaurant Operations" },
                        { key: "kitchen_display_system", label: "Kitchen Display System" },
                        { key: "chain_multi_store", label: "Chain / Multi-Store" },
                        { key: "recommendations_engine", label: "Recommendations Engine" },
                      ].map(feature => (
                        <div key={feature.key} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{feature.label}</span>
                          <button
                            onClick={() => handleToggleFeature(bt.id, feature.key as keyof BusinessType["features"])}
                            className={`w-11 h-6 rounded-full relative transition-colors ${
                              bt.features[feature.key as keyof BusinessType["features"]]
                                ? "bg-emerald-500"
                                : "bg-gray-600"
                            }`}
                          >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                              bt.features[feature.key as keyof BusinessType["features"]]
                                ? "right-0.5"
                                : "left-0.5"
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button variant="primary" size="sm" onClick={() => handleSaveBusinessTypeFeatures(bt.id)}>
                        <Check className="w-4 h-4" />
                        Save Features
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade Categories Section */}
      {activeConfigSection === "trade_categories" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Trade Categories</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Organize businesses into categories and subcategories</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => {
              setEditingCategory(null)
              setCategoryForm({ name_fr: "", name_ar: "", parent_id: "", icon_name: "", sort_order: 0 })
              setShowCategoryModal(true)
            }}>
              <Plus className="w-4 h-4" />
              Add Root Category
            </Button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {tradeCategories.map(category => (
              <div key={category.id}>
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    className="flex items-center gap-3 flex-1"
                  >
                    {category.children && category.children.length > 0 ? (
                      expandedCategory === category.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )
                    ) : (
                      <div className="w-4" />
                    )}
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{category.name_fr}</p>
                      {category.name_ar && <p className="text-xs text-gray-500" dir="rtl">{category.name_ar}</p>}
                    </div>
                    <Badge color="gray" className="ml-2">{category.icon_name}</Badge>
                    <span className="text-xs text-gray-500 ml-2">Sort: {category.sort_order}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setCategoryForm({ name_fr: "", name_ar: "", parent_id: category.id, icon_name: "", sort_order: 0 })
                      setShowCategoryModal(true)
                    }}>
                      <Plus className="w-4 h-4" />
                      Add Sub
                    </Button>
                    <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={category.children && category.children.length > 0}
                      title={category.children && category.children.length > 0 ? "Remove children first" : undefined}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {expandedCategory === category.id && category.children && (
                  <div className="bg-gray-100/50 dark:bg-gray-800/30">
                    {category.children.map(child => (
                      <div key={child.id} className="p-4 pl-12 flex items-center justify-between border-t border-gray-200 dark:border-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 -ml-4 mr-2" />
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <Tag className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{child.name_fr}</p>
                            {child.name_ar && <p className="text-xs text-gray-500" dir="rtl">{child.name_ar}</p>}
                          </div>
                          <Badge color="gray">{child.icon_name}</Badge>
                          <span className="text-xs text-gray-500">Sort: {child.sort_order}</span>
                          <Badge color="blue">{child.business_count} businesses</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={child.business_count > 0}
                            title={child.business_count > 0 ? `${child.business_count} businesses use this category` : undefined}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Couriers Section */}
      {activeConfigSection === "couriers" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Delivery Couriers</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage courier services and business links</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => {
              setEditingCourier(null)
              setCourierForm({ name: "", phone: "", email: "", website: "", notes: "" })
              setShowCourierModal(true)
            }}>
              <Plus className="w-4 h-4" />
              Add Courier
            </Button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Linked</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {couriers.map(courier => (
                <>
                  <tr key={courier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4">
                      <button
                        onClick={() => setExpandedCourier(expandedCourier === courier.id ? null : courier.id)}
                        className="flex items-center gap-2 font-medium text-gray-900 dark:text-white hover:text-indigo-400"
                      >
                        {expandedCourier === courier.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {courier.name}
                      </button>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{courier.phone || "-"}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{courier.email || "-"}</td>
                    <td className="p-4">
                      <button
                        onClick={() => setCouriers(prev => prev.map(c => 
                          c.id === courier.id ? { ...c, is_active: !c.is_active } : c
                        ))}
                        className={`w-11 h-6 rounded-full relative transition-colors ${
                          courier.is_active ? "bg-emerald-500" : "bg-gray-600"
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                          courier.is_active ? "right-0.5" : "left-0.5"
                        }`} />
                      </button>
                    </td>
                    <td className="p-4">
                      <Badge color={courier.linked_businesses.length > 0 ? "blue" : "gray"}>
                        {courier.linked_businesses.length} businesses
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                          onClick={() => {
                            setEditingCourier(courier)
                            setCourierForm({
                              name: courier.name,
                              phone: courier.phone || "",
                              email: courier.email || "",
                              website: courier.website || "",
                              notes: courier.notes || ""
                            })
                            setShowCourierModal(true)
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={courier.linked_businesses.length > 0}
                          title={courier.linked_businesses.length > 0 ? `${courier.linked_businesses.length} businesses linked` : undefined}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedCourier === courier.id && (
                    <tr>
                      <td colSpan={6} className="bg-gray-100/50 dark:bg-gray-800/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Linked Businesses</h4>
                          <Button variant="secondary" size="sm">
                            <Link2 className="w-4 h-4" />
                            Link to Business
                          </Button>
                        </div>
                        {courier.linked_businesses.length > 0 ? (
                          <div className="space-y-2">
                            {courier.linked_businesses.map(biz => (
                              <div key={biz.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  <span className="text-sm text-gray-900 dark:text-white">{biz.name}</span>
                                </div>
                                <button className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                                  <Unlink className="w-3 h-3" />
                                  Unlink
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">No businesses linked to this courier</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* System Parameters Section */}
      {activeConfigSection === "system_params" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">System Parameters</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Platform-wide configuration values (click value to edit)</p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Parameter Key</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Updated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {systemParams.map(param => (
                <tr 
                  key={param.key} 
                  className={`transition-colors ${
                    savedParamKey === param.key 
                      ? "bg-emerald-900/20" 
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <td className="p-4 font-mono text-sm text-gray-500 dark:text-gray-400">{param.key}</td>
                  <td className="p-4">
                    {editingParamKey === param.key ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingParamValue}
                          onChange={(e) => setEditingParamValue(e.target.value)}
                          className="w-32 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white font-mono"
                          autoFocus
                        />
                        <button 
                          onClick={() => handleSaveParam(param.key)}
                          className="p-1 text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingParamKey(null)}
                          className="p-1 text-red-400 hover:bg-red-900/20 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingParamKey(param.key)
                          setEditingParamValue(param.value)
                        }}
                        className="font-mono text-sm text-gray-900 dark:text-white hover:text-indigo-500 dark:hover:text-indigo-400 hover:underline"
                      >
                        {param.value}
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{param.description}</td>
                  <td className="p-4 text-xs text-gray-500">{param.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Business Type Create Modal */}
      {showBusinessTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Business Type</h3>
              <button onClick={() => setShowBusinessTypeModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessTypeForm.name}
                  onChange={(e) => setBusinessTypeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Pharmacy"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Features</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "loyalty_points", label: "Loyalty & Points" },
                    { key: "promotions_campaigns", label: "Promotions" },
                    { key: "coupons_vouchers", label: "Coupons" },
                    { key: "inventory_management", label: "Inventory" },
                    { key: "restaurant_operations", label: "Restaurant Ops" },
                    { key: "kitchen_display_system", label: "KDS" },
                    { key: "chain_multi_store", label: "Chain / Multi-Store" },
                    { key: "recommendations_engine", label: "Recommendations" },
                  ].map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessTypeForm.features.includes(f.key)}
                        onChange={(e) => setBusinessTypeForm(prev => ({
                          ...prev,
                          features: e.target.checked
                            ? [...prev.features, f.key]
                            : prev.features.filter(k => k !== f.key),
                        }))}
                        className="rounded"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setShowBusinessTypeModal(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={handleCreateBusinessType}>Create Type</Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCategory ? "Edit Category" : categoryForm.parent_id ? "Add Sub-category" : "Add Root Category"}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  French Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name_fr}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name_fr: e.target.value }))}
                  placeholder="e.g., Restaurant"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Arabic Name</label>
                <input
                  type="text"
                  value={categoryForm.name_ar}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name_ar: e.target.value }))}
                  placeholder="e.g., مطعم"
                  dir="rtl"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Icon Name</label>
                <input
                  type="text"
                  value={categoryForm.icon_name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, icon_name: e.target.value }))}
                  placeholder="e.g., ShoppingBag"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-24 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={handleSaveCategory}>Save Category</Button>
            </div>
          </div>
        </div>
      )}

      {/* Courier Modal */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCourier ? "Edit Courier" : "Add Courier"}
              </h3>
              <button onClick={() => setShowCourierModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={courierForm.name}
                  onChange={(e) => setCourierForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Glovo Morocco"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={courierForm.phone}
                    onChange={(e) => setCourierForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+212 5 22 ..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={courierForm.email}
                    onChange={(e) => setCourierForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Website</label>
                <input
                  type="url"
                  value={courierForm.website}
                  onChange={(e) => setCourierForm(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={courierForm.notes}
                  onChange={(e) => setCourierForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Internal notes about this courier..."
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setShowCourierModal(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={handleSaveCourier}>{editingCourier ? "Save Changes" : "Add Courier"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============== SUBSCRIPTIONS TAB COMPONENT ==============
function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessesForDropdown, setBusinessesForDropdown] = useState<Business[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [planFilter, setPlanFilter] = useState<"all" | SubscriptionPlan>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | SubscriptionStatus>("all")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    business_id: "",
    plan: "starter" as SubscriptionPlan,
    status: "active" as SubscriptionStatus,
    started_at: new Date().toISOString().split("T")[0],
    expires_at: "",
    amount_paid: 0,
    notes: "",
  })

  const fetchSubscriptions = useCallback(() => {
    setLoading(true)
    setError(null)
    apiFetch<{ data: Subscription[]; total: number } | Subscription[]>("/api/super/subscriptions")
      .then(res => setSubscriptions(Array.isArray(res) ? res : res.data))
      .catch((e: any) => setError(e.message ?? "Failed to load subscriptions"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchSubscriptions()
    // Also load businesses for the dropdown
    apiFetch<{ data: Business[]; total: number } | Business[]>("/api/super/businesses?limit=200")
      .then(res => setBusinessesForDropdown(Array.isArray(res) ? res : res.data))
      .catch(() => {})
  }, [fetchSubscriptions])

  // Calculate stats
  const activeCount = subscriptions.filter(s => s.status === "active").length
  const mrr = subscriptions
    .filter(s => s.status === "active" || s.status === "trial")
    .reduce((sum, s) => sum + s.amount_paid, 0)
  const expiringThisMonth = subscriptions.filter(s => {
    if (!s.expires_at) return false
    const expDate = new Date(s.expires_at)
    const now = new Date()
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
  }).length

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (searchQuery && !sub.business_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (planFilter !== "all" && sub.plan !== planFilter) return false
    if (statusFilter !== "all" && sub.status !== statusFilter) return false
    if (dateRange.start && new Date(sub.started_at) < new Date(dateRange.start)) return false
    if (dateRange.end && new Date(sub.started_at) > new Date(dateRange.end)) return false
    return true
  })

  const totalPages = Math.ceil(filteredSubscriptions.length / pageSize)
  const paginatedSubscriptions = filteredSubscriptions.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getPlanBadgeColor = (plan: SubscriptionPlan) => {
    switch (plan) {
      case "free": return "gray"
      case "starter": return "blue"
      case "professional": return "indigo"
      case "enterprise": return "purple"
    }
  }

  const getStatusBadgeColor = (status: SubscriptionStatus) => {
    switch (status) {
      case "active": return "green"
      case "trial": return "yellow"
      case "expired": return "red"
      case "cancelled": return "red"
    }
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const handleOpenCreate = () => {
    setFormData({
      business_id: "",
      plan: "starter",
      status: "active",
      started_at: new Date().toISOString().split("T")[0],
      expires_at: "",
      amount_paid: 0,
      notes: "",
    })
    setShowCreateModal(true)
  }

  const handleOpenEdit = (sub: Subscription) => {
    setSelectedSubscription(sub)
    setFormData({
      business_id: sub.business_id,
      plan: sub.plan,
      status: sub.status,
      started_at: sub.started_at,
      expires_at: sub.expires_at || "",
      amount_paid: sub.amount_paid,
      notes: sub.notes || "",
    })
    setShowEditModal(true)
  }

  const handleCreateSubscription = () => {
    setError(null)
    apiFetch<Subscription>("/api/super/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        business_id: formData.business_id,
        plan: formData.plan,
        starts_at: formData.started_at,
        ends_at: formData.expires_at || undefined,
      }),
    })
      .then(() => { setShowCreateModal(false); fetchSubscriptions() })
      .catch((e: any) => setError(e.message ?? "Failed to create subscription"))
  }

  const handleEditSubscription = () => {
    if (!selectedSubscription) return
    setError(null)
    apiFetch<Subscription>(`/api/super/subscriptions/${selectedSubscription.id}`, {
      method: "PUT",
      body: JSON.stringify({
        business_id: formData.business_id,
        plan: formData.plan,
        starts_at: formData.started_at,
        ends_at: formData.expires_at || undefined,
      }),
    })
      .then(() => { setShowEditModal(false); fetchSubscriptions() })
      .catch((e: any) => setError(e.message ?? "Failed to update subscription"))
  }

  const handleCancelSubscription = () => {
    if (!selectedSubscription) return
    setError(null)
    apiFetch<Subscription>(`/api/super/subscriptions/${selectedSubscription.id}`, {
      method: "PUT",
      body: JSON.stringify({
        business_id: selectedSubscription.business_id,
        plan: selectedSubscription.plan,
        starts_at: selectedSubscription.started_at,
        ends_at: selectedSubscription.expires_at || undefined,
        status: "cancelled",
      }),
    })
      .then(() => { setShowCancelConfirm(false); setShowEditModal(false); fetchSubscriptions() })
      .catch((e: any) => setError(e.message ?? "Failed to cancel subscription"))
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {loading && <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading...</div>}
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mrr.toLocaleString()} MAD</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Recurring Revenue</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${expiringThisMonth > 0 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
              <Clock className={`w-5 h-5 ${expiringThisMonth > 0 ? "text-amber-400" : "text-gray-400"}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${expiringThisMonth > 0 ? "text-amber-500 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>{expiringThisMonth}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Expiring This Month</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search by business name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Create Button */}
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Create Subscription
          </Button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business Name</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Started At</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expires At</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount Paid</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedSubscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{sub.business_name}</p>
                    <p className="text-xs text-gray-500">{sub.owner_email}</p>
                  </div>
                </td>
                <td className="p-4">
                  <Badge color={getPlanBadgeColor(sub.plan)}>{sub.plan}</Badge>
                </td>
                <td className="p-4">
                  <Badge color={getStatusBadgeColor(sub.status)}>{sub.status}</Badge>
                </td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{sub.started_at}</td>
                <td className="p-4">
                  {sub.expires_at ? (
                    <span className={`text-sm ${isExpired(sub.expires_at) ? "text-red-400 font-medium" : "text-gray-300"}`}>
                      {sub.expires_at}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </td>
                <td className="p-4 font-mono text-sm text-gray-900 dark:text-white">
                  {sub.amount_paid > 0 ? `${sub.amount_paid} MAD` : "—"}
                </td>
                <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{sub.created_by}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <button 
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                      onClick={() => handleOpenEdit(sub)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSubscriptions.length)} of {filteredSubscriptions.length} subscriptions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-300">Page {currentPage} of {totalPages || 1}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {showCreateModal ? "Create Subscription" : "Edit Subscription"}
              </h3>
              <button 
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Business Select */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Business <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.business_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  disabled={showEditModal}
                >
                  <option value="">Select a business...</option>
                  {businessesForDropdown.map(biz => (
                    <option key={biz.id} value={biz.id}>{biz.name} — {biz.owner_email}</option>
                  ))}
                </select>
              </div>
              
              {/* Plan & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value as SubscriptionPlan }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as SubscriptionStatus }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Started At</label>
                  <input
                    type="date"
                    value={formData.started_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, started_at: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Expires At {formData.plan !== "free" && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                    disabled={formData.plan === "free"}
                  />
                </div>
              </div>
              
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Amount Paid (MAD)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.amount_paid}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount_paid: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  disabled={formData.plan === "free"}
                />
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Optional notes about this subscription..."
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              {showEditModal && selectedSubscription?.status !== "cancelled" && (
                <Button 
                  variant="danger" 
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel Subscription
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={showCreateModal ? handleCreateSubscription : handleEditSubscription}>
                {showCreateModal ? "Create" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cancel Subscription?</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to cancel the subscription for <strong className="text-gray-900 dark:text-white">{selectedSubscription?.business_name}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowCancelConfirm(false)}>
                Keep Subscription
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleCancelSubscription}>
                Yes, Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SuperAdminPage({ onBack }: { onBack?: () => void } = {}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [showBusinessModal, setShowBusinessModal] = useState(false)
  const [showCreateBusinessModal, setShowCreateBusinessModal] = useState(false)
  const [showEditBusinessModal, setShowEditBusinessModal] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [businessForm, setBusinessForm] = useState({ name: "", business_type_id: "", owner_name: "", owner_email: "", owner_phone: "", ice: "", trade_register: "" })
  const [businessTypes, setBusinessTypes] = useState<{ id: string; name: string }[]>([])
  const [activeTab, setActiveTab] = useState<"overview" | "businesses" | "terminals" | "billing" | "support" | "analytics" | "audit" | "config" | "versions" | "announcements" | "system">("overview")

  // Announcement form state
  const [annForm, setAnnForm] = useState({ title: "", body: "", type: "info", target_business_types: [] as string[], starts_at: "", ends_at: "" })
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [showAnnModal, setShowAnnModal] = useState(false)

  // Fetch business types for create form dropdown (load once on mount)
  useEffect(() => {
    apiFetch<{ data: { id: string; name: string }[] } | { id: string; name: string }[]>("/api/super/business-types")
      .then(res => setBusinessTypes(Array.isArray(res) ? res : (res as any).data ?? []))
      .catch(() => {})
  }, [])

  // Fetch overview stats
  const fetchStats = useCallback(() => {
    apiFetch<SystemStats>("/api/super/dashboard/stats")
      .then(data => setStats(data))
      .catch(() => {})
  }, [])

  // Fetch businesses (with client-side filter applied to cached list)
  const fetchBusinesses = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: "1", limit: "200" })
    if (searchQuery) params.set("search", searchQuery)
    apiFetch<{ data: Business[]; total: number } | Business[]>(`/api/super/businesses?${params}`)
      .then(res => setBusinesses(Array.isArray(res) ? res : res.data))
      .catch((e: any) => setError(e.message ?? "Failed to load businesses"))
      .finally(() => setLoading(false))
  }, [searchQuery])

  // Fetch terminals
  const fetchTerminals = useCallback(() => {
    setLoading(true)
    setError(null)
    apiFetch<{ data: Terminal[] } | Terminal[]>("/api/super/terminals")
      .then(res => setTerminals(Array.isArray(res) ? res : res.data))
      .catch((e: any) => setError(e.message ?? "Failed to load terminals"))
      .finally(() => setLoading(false))
  }, [])

  // Fetch audit logs
  const fetchAuditLogs = useCallback((page = 1) => {
    setLoading(true)
    setError(null)
    apiFetch<{ data: AuditLog[]; total: number }>(`/api/super/audit-logs?page=${page}&limit=20`)
      .then(res => { setAuditLogs(res.data); setAuditTotal(res.total); setAuditPage(page) })
      .catch((e: any) => setError(e.message ?? "Failed to load audit logs"))
      .finally(() => setLoading(false))
  }, [])

  // Fetch announcements
  const fetchAnnouncements = useCallback(() => {
    setLoading(true)
    setError(null)
    apiFetch<{ data: Announcement[]; total: number } | Announcement[]>("/api/super/announcements")
      .then(res => setAnnouncements(Array.isArray(res) ? res : res.data))
      .catch((e: any) => setError(e.message ?? "Failed to load announcements"))
      .finally(() => setLoading(false))
  }, [])

  // Load data when active tab changes
  useEffect(() => {
    setError(null)
    if (activeTab === "overview") {
      fetchStats()
      fetchBusinesses()
    } else if (activeTab === "businesses") {
      fetchBusinesses()
    } else if (activeTab === "terminals") {
      fetchTerminals()
    } else if (activeTab === "audit") {
      fetchAuditLogs(1)
    } else if (activeTab === "announcements") {
      fetchAnnouncements()
    }
  }, [activeTab])  // eslint-disable-line react-hooks/exhaustive-deps

  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = !searchQuery ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.owner_email ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || b.status === statusFilter
    const matchesPlan = planFilter === "all" || b.plan === planFilter
    return matchesSearch && matchesStatus && matchesPlan
  })

  const getPlanColor = (plan: Business["plan"]): "gray" | "blue" | "purple" => {
    switch (plan) {
      case "starter": return "gray"
      case "professional": return "blue"
      case "enterprise": return "purple"
    }
  }

  const getStatusColor = (status: Business["status"]): "green" | "red" | "yellow" => {
    switch (status) {
      case "active": return "green"
      case "suspended": return "red"
      case "trial": return "yellow"
    }
  }

  const handleSuspend = (id: string) => {
    const biz = businesses.find(b => b.id === id)
    if (!biz) return
    const newStatus = biz.status === "suspended" ? "active" : "suspended"
    apiFetch(`/api/super/businesses/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    })
      .then(() => setBusinesses(prev => prev.map(b => b.id === id ? { ...b, status: newStatus as Business["status"] } : b)))
      .catch((e: any) => setError(e.message ?? "Failed to update status"))
  }

  const handleCreateBusiness = () => {
    setError(null)
    apiFetch<Business>("/api/super/businesses", {
      method: "POST",
      body: JSON.stringify({
        name: businessForm.name,
        business_type_id: businessForm.business_type_id || undefined,
        owner_name: businessForm.owner_name,
        owner_email: businessForm.owner_email,
        owner_phone: businessForm.owner_phone || undefined,
        ice: businessForm.ice || undefined,
        trade_register: businessForm.trade_register || undefined,
      }),
    })
      .then(() => { setShowCreateBusinessModal(false); fetchBusinesses() })
      .catch((e: any) => setError(e.message ?? "Failed to create business"))
  }

  const handleEditBusiness = () => {
    if (!selectedBusiness) return
    setError(null)
    apiFetch<Business>(`/api/super/businesses/${selectedBusiness.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: businessForm.name,
        business_type_id: businessForm.business_type_id || undefined,
        owner_name: businessForm.owner_name,
        owner_email: businessForm.owner_email,
        owner_phone: businessForm.owner_phone || undefined,
        ice: businessForm.ice || undefined,
        trade_register: businessForm.trade_register || undefined,
      }),
    })
      .then(() => { setShowEditBusinessModal(false); fetchBusinesses() })
      .catch((e: any) => setError(e.message ?? "Failed to update business"))
  }

  const handleCreateAnnouncement = () => {
    setError(null)
    apiFetch<Announcement>("/api/super/announcements", {
      method: "POST",
      body: JSON.stringify(annForm),
    })
      .then(() => {
        setAnnForm({ title: "", body: "", type: "info", target_business_types: [], starts_at: "", ends_at: "" })
        fetchAnnouncements()
      })
      .catch((e: any) => setError(e.message ?? "Failed to create announcement"))
  }

  const handleEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncement(ann)
    setAnnForm({
      title: ann.title,
      body: ann.body ?? ann.message ?? "",
      type: ann.type ?? "info",
      target_business_types: ann.target_business_types ?? [],
      starts_at: ann.starts_at ?? "",
      ends_at: ann.ends_at ?? "",
    })
    setShowAnnModal(true)
  }

  const handleSaveAnnouncement = () => {
    if (!editingAnnouncement) return
    setError(null)
    apiFetch<Announcement>(`/api/super/announcements/${editingAnnouncement.id}`, {
      method: "PATCH",
      body: JSON.stringify(annForm),
    })
      .then(() => { setShowAnnModal(false); setEditingAnnouncement(null); fetchAnnouncements() })
      .catch((e: any) => setError(e.message ?? "Failed to update announcement"))
  }

  const handleDeleteAnnouncement = (id: string | number) => {
    setError(null)
    apiFetch(`/api/super/announcements/${id}`, { method: "DELETE" })
      .then(() => fetchAnnouncements())
      .catch((e: any) => setError(e.message ?? "Failed to delete announcement"))
  }

  // Support and Versions tabs: no backend endpoints provided — kept as empty state
  const tickets: { id: string; business: string; subject: string; priority: string; status: string; assignee: string; created: string }[] = []
  const versionLogs: { version: string; date: string; type: string; notes: string; deployed: boolean }[] = []

  const navItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "businesses", label: "Businesses", icon: Building2 },
    { id: "terminals", label: "Terminals", icon: Monitor },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "support", label: "Support", icon: HeadphonesIcon },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "audit", label: "Audit", icon: FileText },
    { id: "config", label: "Config", icon: Sliders },
    { id: "versions", label: "Versions", icon: GitBranch },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "system", label: "System", icon: Server },
  ] as const

  const activeNavItem = navItems.find(n => n.id === activeTab)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#09090f] flex">

      {/* Left Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#0F0F12] border-r border-gray-200 dark:border-[#1F1F23] flex flex-col z-50">
        {/* Logo area */}
        <div className="h-[86px] border-b border-gray-200 dark:border-[#1F1F23] flex items-center px-4 gap-3 flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">RTS Super Admin</p>
            <p className="text-xs text-gray-500">Platform Console</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
          <p className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Management</p>
          {navItems.map((item) => {
            const isActive = item.id === activeTab
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500/10 to-blue-500/10 text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-400 to-blue-500 rounded-r-full" />
                )}
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-indigo-400" : ""}`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Bottom: health + back */}
        <div className="p-3 border-t border-gray-200 dark:border-[#1F1F23] space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
            (stats?.system_health ?? "healthy") === "healthy" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
            stats?.system_health === "degraded" ? "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
            "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          }`}>
            <Activity className="w-4 h-4" />
            <span className="capitalize">{stats?.system_health ?? "..."}</span>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            >
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              Back to Dashboard
            </button>
          )}
        </div>
      </aside>

      {/* Main area (offset by sidebar) */}
      <div className="flex-1 flex flex-col ml-64 min-h-screen">

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#0F0F12]/80 backdrop-blur-xl border-b border-gray-200 dark:border-[#1F1F23] px-6 h-[86px] flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeNavItem?.label ?? "Overview"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Platform Management Console</p>
          </div>
          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            <Button variant="ghost" className="!text-gray-500 dark:!text-gray-400">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>


        <div className="p-6 flex-1">
        {/* Global error/loading banner */}
        {error && activeTab !== "businesses" && activeTab !== "announcements" && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {loading && activeTab !== "billing" && activeTab !== "announcements" && (
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        )}
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total_businesses ?? "—"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Businesses</p>
                <p className="text-xs text-emerald-400 mt-1">{stats?.active_businesses ?? "—"} active</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total_terminals ?? "—"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Terminals</p>
                <p className="text-xs text-emerald-400 mt-1">{stats?.online_terminals ?? "—"} online</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total_transactions_today?.toLocaleString() ?? "—"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transactions Today</p>
                <p className="text-xs text-gray-500 mt-1">Across all businesses</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats ? `${(stats.total_revenue_today / 1000).toFixed(0)}K MAD` : "—"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue Today</p>
                <p className="text-xs text-emerald-400 mt-1">+12% vs yesterday</p>
              </div>
            </div>

            {/* Recent Activity & Top Businesses */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Businesses</h3>
                <div className="space-y-3">
                  {businesses.filter(b => b.status === "active").sort((a, b) => b.monthly_revenue - a.monthly_revenue).slice(0, 5).map((business, i) => (
                    <div key={business.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-500">#{i + 1}</span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{business.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{business.locations_count} locations</p>
                        </div>
                      </div>
                      <p className="font-mono font-medium text-emerald-400">{(business.monthly_revenue / 1000).toFixed(0)}K MAD</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Alerts</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">Trial Expiring Soon</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Bakery Casablanca trial ends in 5 days</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400">Suspended Account</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fast Food Express suspended for non-payment</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-400">New Business Onboarded</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Patisserie Royal joined 2 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === "businesses" && (
          <div className="space-y-6">
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>
            )}
            {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>}
            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search businesses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </select>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                >
                  <option value="all">All Plans</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <Button variant="primary" onClick={() => {
                  setBusinessForm({ name: "", type: "", email: "", phone: "", address: "", ice: "", if_number: "" })
                  setShowCreateBusinessModal(true)
                }}>
                  <Plus className="w-4 h-4" />
                  Add Business
                </Button>
              </div>
            </div>

            {/* Businesses Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Locations</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Terminals</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monthly Revenue</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredBusinesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{business.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{business.owner_email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge color={getPlanColor(business.plan)}>{business.plan}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge color={getStatusColor(business.status)}>
                          {business.status}
                          {business.trial_ends_at && ` (ends ${business.trial_ends_at})`}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{business.locations_count}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{business.terminals_count}</td>
                      <td className="p-4 font-mono text-sm text-emerald-400">{business.monthly_revenue.toLocaleString()} MAD</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              apiFetch<Business>(`/api/super/businesses/${business.id}`)
                                .then(detail => { setSelectedBusiness(detail); setShowBusinessModal(true) })
                                .catch(() => { setSelectedBusiness(business); setShowBusinessModal(true) })
                            }}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg"
                            onClick={() => {
                              apiFetch<Business & { business_type_id?: string; owner_name?: string; owner_phone?: string; trade_register?: string }>(`/api/super/businesses/${business.id}`)
                                .then(detail => {
                                  setSelectedBusiness(detail)
                                  setBusinessForm({
                                    name: detail.name,
                                    business_type_id: (detail as any).business_type_id ?? "",
                                    owner_name: detail.owner_name ?? "",
                                    owner_email: detail.owner_email ?? "",
                                    owner_phone: (detail as any).owner_phone ?? "",
                                    ice: (detail as any).ice ?? "",
                                    trade_register: (detail as any).trade_register ?? "",
                                  })
                                  setShowEditBusinessModal(true)
                                })
                                .catch(() => {
                                  setSelectedBusiness(business)
                                  setBusinessForm({
                                    name: business.name,
                                    business_type_id: (business as any).business_type_id ?? "",
                                    owner_name: business.owner_name ?? "",
                                    owner_email: business.owner_email ?? "",
                                    owner_phone: (business as any).owner_phone ?? "",
                                    ice: (business as any).ice ?? "",
                                    trade_register: (business as any).trade_register ?? "",
                                  })
                                  setShowEditBusinessModal(true)
                                })
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSuspend(business.id)}
                            className={`p-2 rounded-lg ${
                              business.status === "suspended" 
                                ? "text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20" 
                                : "text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Terminals Tab */}
        {activeTab === "terminals" && (
          <div className="space-y-6">
            {/* Terminal Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{terminals.length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Terminals</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-emerald-400">{terminals.filter(t => t.status === "online").length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Online Now</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-red-400">{terminals.filter(t => t.status !== "online").length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-amber-400">3</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Need Updates</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search terminals..."
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
                <Button variant="secondary">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Terminals Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Terminal ID</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Seen</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {terminals.map((terminal) => (
                    <tr key={terminal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 font-mono text-sm text-gray-900 dark:text-white">{terminal.terminal_code ?? terminal.id}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{terminal.business ?? terminal.business_id}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{terminal.location ?? terminal.location_id}</td>
                      <td className="p-4">
                        <Badge color={terminal.status === "online" ? "green" : "red"}>{terminal.status}</Badge>
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{terminal.version}</td>
                      <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{terminal.last_seen}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg">
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscriptions Tab (formerly Billing) */}
        {activeTab === "billing" && (
          <SubscriptionsTab />
        )}

        {/* Support Tab */}
        {activeTab === "support" && (
          <div className="space-y-6">
            {/* Support Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">24</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Open Tickets</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-red-400">5</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">High Priority</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-emerald-400">2.4h</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Response Time</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-blue-400">94%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Resolution Rate</p>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Support Tickets</h3>
                <div className="flex gap-2">
                  <select className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white">
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="escalated">Escalated</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ticket</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assignee</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {tickets.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No tickets data available.</td></tr>
                  )}
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 font-mono text-sm text-blue-400">{ticket.id}</td>
                      <td className="p-4 text-sm text-white">{ticket.business}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{ticket.subject}</td>
                      <td className="p-4">
                        <Badge color={ticket.priority === "high" ? "red" : ticket.priority === "medium" ? "yellow" : "gray"}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge color={
                          ticket.status === "open" ? "blue" : 
                          ticket.status === "in_progress" ? "yellow" : 
                          ticket.status === "escalated" ? "red" : "green"
                        }>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{ticket.assignee}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg">
                            <Phone className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Analytics Overview */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Growth</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">New Businesses (This Month)</span>
                    <span className="text-emerald-400 font-semibold">+12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Churn Rate</span>
                    <span className="text-amber-400 font-semibold">2.3%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Trial Conversion</span>
                    <span className="text-emerald-400 font-semibold">68%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Avg Revenue/Business</span>
                    <span className="text-white font-semibold">552 MAD</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plan Distribution</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-400">Starter</span>
                      <span className="text-white">34 (22%)</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full w-[22%] bg-gray-500 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-400">Professional</span>
                      <span className="text-white">89 (57%)</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full w-[57%] bg-blue-500 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-400">Enterprise</span>
                      <span className="text-white">33 (21%)</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full w-[21%] bg-purple-500 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Volume */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transaction Volume (Last 7 Days)</h3>
              <div className="grid grid-cols-7 gap-4">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                  <div key={day} className="text-center">
                    <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg relative overflow-hidden">
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-indigo-600 to-blue-600 rounded-b-lg"
                        style={{ height: `${[65, 72, 58, 80, 92, 100, 78][i]}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{day}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{[8.2, 9.1, 7.3, 10.1, 11.6, 12.8, 9.9][i]}K</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search audit logs..."
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                  <option value="all">All Actions</option>
                  <option value="business_suspended">Suspensions</option>
                  <option value="plan_changed">Plan Changes</option>
                  <option value="user_login">Logins</option>
                  <option value="config_changed">Config Changes</option>
                </select>
                <input type="date" className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
                <Button variant="secondary">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actor</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{log.timestamp ?? log.created_at}</td>
                      <td className="p-4">
                        <Badge color={
                          log.action.includes("suspended") ? "red" :
                          log.action.includes("login") ? "blue" :
                          log.action.includes("changed") ? "yellow" : "green"
                        }>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-white">{log.actor ?? log.performed_by}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{log.target ?? log.entity_type}</td>
                      <td className="p-4 font-mono text-xs text-gray-500">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(auditPage - 1) * 20 + 1}–{Math.min(auditPage * 20, auditTotal)} of {auditTotal} entries
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="!py-1.5 !px-3" disabled={auditPage <= 1} onClick={() => fetchAuditLogs(auditPage - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" className="!py-1.5 !px-3" disabled={auditPage * 20 >= auditTotal} onClick={() => fetchAuditLogs(auditPage + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === "config" && (
          <ConfigTab />
        )}

        {/* Versions Tab */}
        {activeTab === "versions" && (
          <div className="space-y-6">
            {/* Version Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">2.4.1</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Version</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-emerald-400">398</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Up to Date</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-amber-400">22</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Update</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-red-400">3</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Outdated (2+ versions)</p>
              </div>
            </div>

            {/* Version History */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Version History</h3>
                <Button variant="primary" className="!py-1.5 !px-3 !text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  New Release
                </Button>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Release Notes</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {versionLogs.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No version log entries available.</td></tr>
                  )}
                  {versionLogs.map((version) => (
                    <tr key={version.version} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 font-mono font-semibold text-gray-900 dark:text-white">{version.version}</td>
                      <td className="p-4">
                        <Badge color={version.type === "minor" ? "blue" : "gray"}>
                          {version.type}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{version.notes}</td>
                      <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{version.date}</td>
                      <td className="p-4">
                        <Badge color={version.deployed ? "green" : "yellow"}>
                          {version.deployed ? "Deployed" : "Pending"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rollback Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Emergency Rollback</h3>
              <div className="flex items-center gap-4">
                <select className="flex-1 max-w-xs px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                  <option value="">Select version to rollback to...</option>
                  {mockVersionLogs.slice(1).map(v => (
                    <option key={v.version} value={v.version}>{v.version} - {v.notes}</option>
                  ))}
                </select>
                <Button variant="danger" className="!py-2">
                  <RefreshCw className="w-4 h-4" />
                  Initiate Rollback
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Warning: Rollback will affect all connected terminals and may cause temporary service interruption.</p>
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === "announcements" && (
          <div className="space-y-6">
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>
            )}
            {/* Create Announcement */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Announcement</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="Announcement title..."
                    value={annForm.title}
                    onChange={(e) => setAnnForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Message</label>
                  <textarea
                    placeholder="Write your announcement..."
                    rows={3}
                    value={annForm.body}
                    onChange={(e) => setAnnForm(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Type</label>
                    <select
                      value={annForm.type}
                      onChange={(e) => setAnnForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="feature">New Feature</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Starts At</label>
                    <input
                      type="datetime-local"
                      value={annForm.starts_at}
                      onChange={(e) => setAnnForm(prev => ({ ...prev, starts_at: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="primary" onClick={handleCreateAnnouncement}>
                    <Send className="w-4 h-4" />
                    Send Now
                  </Button>
                </div>
              </div>
            </div>

            {/* Previous Announcements */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">Previous Announcements</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading && <p className="text-sm text-gray-500 p-4">Loading...</p>}
                {!loading && announcements.length === 0 && <p className="text-sm text-gray-500 p-4">No announcements yet.</p>}
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{announcement.title}</h4>
                          {announcement.status && (
                            <Badge color={announcement.status === "active" ? "green" : "yellow"}>
                              {announcement.status}
                            </Badge>
                          )}
                          {announcement.type && <Badge color="gray">{announcement.type}</Badge>}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{announcement.body ?? announcement.message}</p>
                        <p className="text-xs text-gray-500 mt-2">Created: {announcement.created_at ?? announcement.created}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg"
                          onClick={() => handleEditAnnouncement(announcement)}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === "system" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">API Server</p>
                    <p className="text-xs text-emerald-400">Healthy</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Response Time</span>
                    <span className="text-white">45ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-white">99.98%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Requests/min</span>
                    <span className="text-white">2,847</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Database</p>
                    <p className="text-xs text-emerald-400">Healthy</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Connections</span>
                    <span className="text-white">142/500</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Query Time</span>
                    <span className="text-white">12ms avg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Storage</span>
                    <span className="text-white">67% used</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Payment Gateway</p>
                    <p className="text-xs text-emerald-400">Healthy</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Success Rate</span>
                    <span className="text-white">99.7%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Avg Processing</span>
                    <span className="text-white">1.2s</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Today Volume</span>
                    <span className="text-white">1.5M MAD</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Logs */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Logs</h3>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-start gap-3 p-2 bg-gray-800/50 rounded">
                  <span className="text-gray-500">14:32:15</span>
                  <span className="text-emerald-400">[INFO]</span>
                  <span className="text-gray-300">New business registered: Patisserie Royal</span>
                </div>
                <div className="flex items-start gap-3 p-2 bg-gray-800/50 rounded">
                  <span className="text-gray-500">14:31:42</span>
                  <span className="text-blue-400">[DEBUG]</span>
                  <span className="text-gray-300">Payment webhook received for TXN-847291</span>
                </div>
                <div className="flex items-start gap-3 p-2 bg-gray-800/50 rounded">
                  <span className="text-gray-500">14:30:18</span>
                  <span className="text-amber-400">[WARN]</span>
                  <span className="text-gray-300">High API latency detected: 120ms (threshold: 100ms)</span>
                </div>
                <div className="flex items-start gap-3 p-2 bg-gray-800/50 rounded">
                  <span className="text-gray-500">14:28:55</span>
                  <span className="text-emerald-400">[INFO]</span>
                  <span className="text-gray-300">Backup completed successfully</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Business Detail Modal */}
      <Modal isOpen={showBusinessModal} onClose={() => setShowBusinessModal(false)} title="Business Details" size="lg">
        {selectedBusiness && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedBusiness.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBusiness.owner_email}</p>
              </div>
              <div className="flex gap-2">
                <Badge color={getPlanColor(selectedBusiness.plan)}>{selectedBusiness.plan}</Badge>
                <Badge color={getStatusColor(selectedBusiness.status)}>{selectedBusiness.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Owner</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedBusiness.owner_name}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedBusiness.created_at}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Locations</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedBusiness.locations_count}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Terminals</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedBusiness.terminals_count}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Employees</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedBusiness.employees_count}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Revenue</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">{selectedBusiness.monthly_revenue.toLocaleString()} MAD</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[#1F1F23]">
              <Button variant="secondary" className="flex-1">View Full Dashboard</Button>
              <Button variant="primary" className="flex-1">Contact Owner</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Business Modal */}
      <Modal isOpen={showCreateBusinessModal} onClose={() => setShowCreateBusinessModal(false)} title="Add Business" size="md">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Business Name <span className="text-red-500">*</span></label>
            <input type="text" value={businessForm.name} onChange={(e) => setBusinessForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Business Type</label>
            <select value={businessForm.business_type_id} onChange={(e) => setBusinessForm(prev => ({ ...prev, business_type_id: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              <option value="">Select a type...</option>
              {businessTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner Name <span className="text-red-500">*</span></label>
            <input type="text" value={businessForm.owner_name} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_name: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner Email <span className="text-red-500">*</span></label>
            <input type="email" value={businessForm.owner_email} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_email: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner Phone</label>
            <input type="text" value={businessForm.owner_phone} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_phone: e.target.value }))}
              placeholder="+212 6 ..."
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">ICE</label>
              <input type="text" value={businessForm.ice} onChange={(e) => setBusinessForm(prev => ({ ...prev, ice: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Trade Register</label>
              <input type="text" value={businessForm.trade_register} onChange={(e) => setBusinessForm(prev => ({ ...prev, trade_register: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreateBusinessModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleCreateBusiness}>Create Business</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Business Modal */}
      <Modal isOpen={showEditBusinessModal} onClose={() => setShowEditBusinessModal(false)} title="Edit Business" size="md">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Business Name</label>
            <input type="text" value={businessForm.name} onChange={(e) => setBusinessForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Business Type</label>
            <select value={businessForm.business_type_id} onChange={(e) => setBusinessForm(prev => ({ ...prev, business_type_id: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              <option value="">Select a type...</option>
              {businessTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner Name</label>
            <input type="text" value={businessForm.owner_name} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_name: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner Email</label>
            <input type="email" value={businessForm.owner_email} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_email: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner Phone</label>
            <input type="text" value={businessForm.owner_phone} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_phone: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">ICE</label>
              <input type="text" value={businessForm.ice} onChange={(e) => setBusinessForm(prev => ({ ...prev, ice: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Trade Register</label>
              <input type="text" value={businessForm.trade_register} onChange={(e) => setBusinessForm(prev => ({ ...prev, trade_register: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditBusinessModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleEditBusiness}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Announcement Modal */}
      <Modal isOpen={showAnnModal} onClose={() => { setShowAnnModal(false); setEditingAnnouncement(null) }} title="Edit Announcement" size="md">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Title</label>
            <input type="text" value={annForm.title} onChange={(e) => setAnnForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Body</label>
            <textarea rows={3} value={annForm.body} onChange={(e) => setAnnForm(prev => ({ ...prev, body: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Type</label>
              <select value={annForm.type} onChange={(e) => setAnnForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
                <option value="feature">New Feature</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Starts At</label>
              <input type="datetime-local" value={annForm.starts_at} onChange={(e) => setAnnForm(prev => ({ ...prev, starts_at: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowAnnModal(false); setEditingAnnouncement(null) }}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveAnnouncement}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      </div>
    </div>
  )
}



