"use client"

import { useState, useEffect, useCallback } from "react"
import { useTheme } from "next-themes"
import { apiFetch } from "@/lib/api"
import CouriersPage from "./couriers-page"
import VersionLogPage from "./version-log-page"
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
  // Aggregate metric NOT returned by GET /api/super/businesses — optional so
  // render sites must guard it (calling .toLocaleString() on undefined crashed).
  monthly_revenue?: number
  // Real fields from GET /api/super/businesses (used by Overview):
  is_active?: boolean
  business_code?: string
  created_at: string
  trial_ends_at?: string
}

// Backend-accurate (GET /api/super/dashboard/stats). Returns only these three
// (camelCase). totalBusinesses is the count of ACTIVE businesses. There is no
// transactions/revenue-today or system_health in this endpoint.
interface SystemStats {
  totalBusinesses: number
  totalTerminals: number
  onlineTerminals: number
}

// ==================== API TYPES ====================
// Backend-accurate shape of GET /api/super/terminals. `location` is a relation
// OBJECT (with a nested `business`), NOT a string — rendering it directly threw
// "Objects are not valid as a React child". Online/version/last-seen also use
// different field names than the older draft assumed.
interface TerminalLocation {
  id: string
  name: string
  city?: string | null
  business?: { id: string; name: string } | null
}
interface Terminal {
  id: string
  terminal_code?: string
  location_id?: string
  location?: TerminalLocation | null
  is_online?: boolean
  is_active?: boolean
  app_version?: string
  os_version?: string
  last_seen_at?: string
}

// Backend-accurate (audit_logs entity / GET /api/super/audit-logs).
interface AuditLog {
  id: string
  business_id?: string | null
  user_id?: string
  action: string
  entity_type?: string
  entity_id?: string
  details_json?: Record<string, unknown> | null
  ip_address?: string | null
  performed_at?: string
}

// Backend-accurate (platform_announcements / GET /api/super/announcements).
interface Announcement {
  id: string | number
  title: string
  body?: string
  severity?: string
  target_business_type_ids?: string[]
  target_business_ids?: string[]
  display_on_homepage?: boolean
  display_until?: string | null
  created_by_user_id?: string
  created_at?: string
}

// ============== CONFIG TAB MOCK DATA ==============
// Backend-accurate (GET /api/super/business-types). `features` is the relation
// array of toggle rows ({feature_key, is_enabled}), NOT a boolean-keyed object.
// There is no business_count field.
interface BusinessTypeFeature {
  feature_key: string
  is_enabled: boolean
}
interface BusinessType {
  id: string
  name: string
  label?: string
  description: string | null
  is_active?: boolean
  features: BusinessTypeFeature[]
}

interface TradeCategory {
  id: string
  name: string
  code: string
  sort_order: number
  parent_id: string | null
  is_active?: boolean
  business_count?: number
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
  id: string
  key: string
  value: string
  param_type?: string
  description: string
  is_overridable_per_business?: boolean
}

// ============== SUBSCRIPTIONS TYPES ==============
type SubscriptionPlan = "free" | "starter" | "professional" | "enterprise"
type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled"

// Backend-accurate (GET /api/super/subscriptions). plan/dates/amount use the
// real column names; price_mad is NUMERIC → serialized as a STRING by TypeORM;
// the business name comes from the `business` relation, not a flat field.
interface Subscription {
  id: string
  business_id: string
  plan_name: string
  status: SubscriptionStatus
  start_date: string
  end_date: string | null
  price_mad: string
  created_at: string
  updated_at?: string
  business?: { id: string; name: string; email?: string } | null
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
  const [systemParams, setSystemParams] = useState<SystemParameter[]>([])
  const [editingParamKey, setEditingParamKey] = useState<string | null>(null)
  const [editingParamValue, setEditingParamValue] = useState<string>("")
  const [savedParamKey, setSavedParamKey] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configLoading, setConfigLoading] = useState(false)

  // Modals
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false)
  const [businessTypeForm, setBusinessTypeForm] = useState({ name: "", label: "", description: "", features: [] as string[] })
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TradeCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: "", code: "", parent_id: "", sort_order: 0 })

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
    } else if (activeConfigSection === "system_params") {
      setConfigLoading(true)
      apiFetch<{ data: SystemParameter[] } | SystemParameter[]>("/api/super/system-parameters")
        .then(data => setSystemParams(Array.isArray(data) ? data : (data as any).data ?? []))
        .catch((e: any) => setConfigError(e.message ?? "Failed to load system parameters"))
        .finally(() => setConfigLoading(false))
    }
  }, [activeConfigSection])

  // Features PUT contract = { features: [{ feature_key, is_enabled }] } (UpdateFeaturesDto).
  const featuresEnabled = (bt: BusinessType, key: string) =>
    (bt.features ?? []).some(f => f.feature_key === key && f.is_enabled)
  const putFeatures = (typeId: string, features: BusinessTypeFeature[]) =>
    apiFetch<BusinessType>(`/api/super/business-types/${typeId}/features`, {
      method: "PUT",
      body: JSON.stringify({ features: features.map(f => ({ feature_key: f.feature_key, is_enabled: f.is_enabled })) }),
    })

  const handleToggleFeature = (typeId: string, featureKey: string) => {
    const bt = businessTypes.find(b => b.id === typeId)
    if (!bt) return
    const current = bt.features ?? []
    const next = current.some(f => f.feature_key === featureKey)
      ? current.map(f => f.feature_key === featureKey ? { ...f, is_enabled: !f.is_enabled } : f)
      : [...current, { feature_key: featureKey, is_enabled: true }]
    setBusinessTypes(prev => prev.map(b => b.id === typeId ? { ...b, features: next } : b)) // optimistic
    putFeatures(typeId, next).catch((e: any) => {
      setBusinessTypes(prev => prev.map(b => b.id === typeId ? { ...b, features: current } : b)) // revert
      setConfigError(e.message ?? "Failed to update features")
    })
  }

  const handleSaveBusinessTypeFeatures = (typeId: string) => {
    const bt = businessTypes.find(b => b.id === typeId)
    if (!bt) return
    putFeatures(typeId, bt.features ?? []).catch((e: any) => setConfigError(e.message ?? "Failed to save features"))
  }

  const handleSaveParam = (param: SystemParameter) => {
    // Backend route is PATCH /system-parameters/:id (UUID), not PUT /:key.
    apiFetch<SystemParameter>(`/api/super/system-parameters/${param.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value: editingParamValue }),
    })
      .then(() => {
        setSystemParams(prev => prev.map(p => p.id === param.id ? { ...p, value: editingParamValue } : p))
        setSavedParamKey(param.key)
        setEditingParamKey(null)
        setTimeout(() => setSavedParamKey(null), 2000)
      })
      .catch((e: any) => setConfigError(e.message ?? "Failed to save parameter"))
  }

  const handleCreateBusinessType = () => {
    if (!businessTypeForm.name.trim()) return
    // CreateBusinessTypeDto = { name, label, description? }. Features are NOT part
    // of create — they are applied afterward via PUT /business-types/:id/features.
    apiFetch<BusinessType>("/api/super/business-types", {
      method: "POST",
      body: JSON.stringify({
        name: businessTypeForm.name,
        label: businessTypeForm.label.trim() || businessTypeForm.name,
        description: businessTypeForm.description.trim() || undefined,
      }),
    })
      .then(async (created) => {
        if (businessTypeForm.features.length && created?.id) {
          await apiFetch(`/api/super/business-types/${created.id}/features`, {
            method: "PUT",
            body: JSON.stringify({ features: businessTypeForm.features.map(k => ({ feature_key: k, is_enabled: true })) }),
          }).catch(() => {})
        }
        setShowBusinessTypeModal(false)
        setBusinessTypeForm({ name: "", label: "", description: "", features: [] })
        return apiFetch<BusinessType[]>("/api/super/business-types")
      })
      .then(data => setBusinessTypes(Array.isArray(data) ? data : (data as any).data ?? []))
      .catch((e: any) => setConfigError(e.message ?? "Failed to create business type"))
  }

  const handleSaveCategory = () => {
    const isEdit = !!editingCategory
    const method = isEdit ? "PATCH" : "POST"
    const url = isEdit ? `/api/super/trade-categories/${editingCategory!.id}` : "/api/super/trade-categories"
    // CreateTradeCategoryDto = { name, code, parent_id?(UUID), sort_order? }.
    const payload = {
      name: categoryForm.name,
      code: categoryForm.code,
      parent_id: categoryForm.parent_id || undefined,
      sort_order: categoryForm.sort_order,
    }
    apiFetch<TradeCategory>(url, { method, body: JSON.stringify(payload) })
      .then(() => {
        setShowCategoryModal(false)
        return apiFetch<{ data: TradeCategory[] } | TradeCategory[]>("/api/super/trade-categories/tree")
      })
      .then(data => setTradeCategories(Array.isArray(data) ? data : (data as any).data ?? []))
      .catch((e: any) => setConfigError(e.message ?? "Failed to save category"))
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
              setBusinessTypeForm({ name: "", label: "", description: "", features: [] })
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
                    <Badge color="blue">{(bt.features ?? []).filter(f => f.is_enabled).length} features</Badge>
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
                            onClick={() => handleToggleFeature(bt.id, feature.key)}
                            className={`w-11 h-6 rounded-full relative transition-colors ${
                              featuresEnabled(bt, feature.key)
                                ? "bg-emerald-500"
                                : "bg-gray-600"
                            }`}
                          >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                              featuresEnabled(bt, feature.key)
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
              setCategoryForm({ name: "", code: "", parent_id: "", sort_order: 0 })
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
                      <p className="font-medium text-gray-900 dark:text-white">{category.name}</p>
                    </div>
                    <Badge color="gray" className="ml-2">{category.code}</Badge>
                    <span className="text-xs text-gray-500 ml-2">Sort: {category.sort_order}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingCategory(null)
                      setCategoryForm({ name: "", code: "", parent_id: category.id, sort_order: 0 })
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
                            <p className="font-medium text-gray-900 dark:text-white">{child.name}</p>
                          </div>
                          <Badge color="gray">{child.code}</Badge>
                          <span className="text-xs text-gray-500">Sort: {child.sort_order}</span>
                          <Badge color="blue">{child.business_count ?? 0} businesses</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={(child.business_count ?? 0) > 0}
                            title={(child.business_count ?? 0) > 0 ? `${child.business_count} businesses use this category` : undefined}
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
      {activeConfigSection === "couriers" && <CouriersPage />}

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
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
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
                          onClick={() => handleSaveParam(param)}
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
                  <td className="p-4 text-xs text-gray-500">{param.param_type ? <Badge color="gray">{param.param_type}</Badge> : "—"}</td>
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
                  placeholder="e.g. pharmacy"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessTypeForm.label}
                  onChange={(e) => setBusinessTypeForm(prev => ({ ...prev, label: e.target.value }))}
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
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Restaurant"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., RESTAURANT"
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
  const [viewingSubscription, setViewingSubscription] = useState<Subscription | null>(null)

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
    apiFetch<{ data: Business[]; total: number } | Business[]>("/api/super/businesses?limit=100")
      .then(res => setBusinessesForDropdown(Array.isArray(res) ? res : res.data))
      .catch(() => {})
  }, [fetchSubscriptions])

  // Calculate stats
  const activeCount = subscriptions.filter(s => s.status === "active").length
  const mrr = subscriptions
    .filter(s => s.status === "active" || s.status === "trial")
    .reduce((sum, s) => sum + (Number(s.price_mad) || 0), 0)
  const expiringThisMonth = subscriptions.filter(s => {
    if (!s.end_date) return false
    const expDate = new Date(s.end_date)
    const now = new Date()
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
  }).length

  // Filter subscriptions (business name comes from the `business` relation)
  const filteredSubscriptions = subscriptions.filter(sub => {
    const bizName = sub.business?.name ?? ""
    if (searchQuery && !bizName.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (planFilter !== "all" && sub.plan_name !== planFilter) return false
    if (statusFilter !== "all" && sub.status !== statusFilter) return false
    if (dateRange.start && new Date(sub.start_date) < new Date(dateRange.start)) return false
    if (dateRange.end && new Date(sub.start_date) > new Date(dateRange.end)) return false
    return true
  })

  const totalPages = Math.ceil(filteredSubscriptions.length / pageSize)
  const paginatedSubscriptions = filteredSubscriptions.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "starter": return "blue"
      case "professional": return "indigo"
      case "enterprise": return "purple"
      default: return "gray" // free, trial, or any custom plan name
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
      plan: (sub.plan_name as SubscriptionPlan) || "starter",
      status: sub.status,
      started_at: sub.start_date ? sub.start_date.slice(0, 10) : "",
      expires_at: sub.end_date ? sub.end_date.slice(0, 10) : "",
      amount_paid: Number(sub.price_mad) || 0,
      notes: "",
    })
    setShowEditModal(true)
  }

  const handleCreateSubscription = () => {
    setError(null)
    apiFetch<Subscription>("/api/super/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        business_id: formData.business_id,
        plan_name: formData.plan,
        start_date: formData.started_at,
        end_date: formData.expires_at || undefined,
        price_mad: formData.amount_paid,
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
        plan_name: formData.plan,
        status: formData.status,
        price_mad: formData.amount_paid,
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
      body: JSON.stringify({ status: "cancelled" }),
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
                    <p className="font-medium text-gray-900 dark:text-white">{sub.business?.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{sub.business?.email ?? ""}</p>
                  </div>
                </td>
                <td className="p-4">
                  <Badge color={getPlanBadgeColor(sub.plan_name)}>{sub.plan_name}</Badge>
                </td>
                <td className="p-4">
                  <Badge color={getStatusBadgeColor(sub.status)}>{sub.status}</Badge>
                </td>
                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{sub.start_date?.slice(0, 10) ?? "—"}</td>
                <td className="p-4">
                  {sub.end_date ? (
                    <span className={`text-sm ${isExpired(sub.end_date) ? "text-red-400 font-medium" : "text-gray-300"}`}>
                      {sub.end_date.slice(0, 10)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </td>
                <td className="p-4 font-mono text-sm text-gray-900 dark:text-white">
                  {Number(sub.price_mad) > 0 ? `${sub.price_mad} MAD` : "—"}
                </td>
                <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{sub.created_at?.slice(0, 10) ?? "—"}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <button 
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                      onClick={() => handleOpenEdit(sub)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg"
                      onClick={() => setViewingSubscription(sub)}
                    >
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
              Are you sure you want to cancel the subscription for <strong className="text-gray-900 dark:text-white">{selectedSubscription?.business?.name}</strong>?
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

      {/* View (details) Modal */}
      {viewingSubscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingSubscription(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Details</h3>
              <button onClick={() => setViewingSubscription(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Business", viewingSubscription.business?.name ?? "—"],
                ["Business Email", viewingSubscription.business?.email ?? "—"],
                ["Plan", viewingSubscription.plan_name],
                ["Status", viewingSubscription.status],
                ["Start Date", viewingSubscription.start_date?.slice(0, 10) ?? "—"],
                ["End Date", viewingSubscription.end_date?.slice(0, 10) ?? "—"],
                ["Price", Number(viewingSubscription.price_mad) > 0 ? `${viewingSubscription.price_mad} MAD` : "—"],
                ["Created", viewingSubscription.created_at?.slice(0, 10) ?? "—"],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{val}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setViewingSubscription(null)}>Close</Button>
              <Button variant="primary" className="flex-1" onClick={() => { const s = viewingSubscription; setViewingSubscription(null); handleOpenEdit(s) }}>Edit</Button>
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
  const [analytics, setAnalytics] = useState<{
    planDistribution: { plan: string; count: number; pct: number }[]
    totalSubs: number
    newBusinessesThisMonth: number
    avgRevenuePerBusiness: number
    totalBusinesses: number
  } | null>(null)
  const [health, setHealth] = useState<{ status?: string; db?: string; redis?: string; latencyMs?: number } | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [auditSearch, setAuditSearch] = useState("")
  const [auditAction, setAuditAction] = useState("all")
  const [auditDate, setAuditDate] = useState("")
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
  const [businessForm, setBusinessForm] = useState({ name: "", business_type_id: "", legal_name: "", email: "", phone: "", owner_email: "", owner_password: "", owner_first_name: "", owner_last_name: "" })
  const [businessTypes, setBusinessTypes] = useState<{ id: string; name: string }[]>([])
  const [activeTab, setActiveTab] = useState<"overview" | "businesses" | "terminals" | "billing" | "support" | "analytics" | "audit" | "config" | "versions" | "announcements" | "system">("overview")

  // Announcement form state
  const [annForm, setAnnForm] = useState({ title: "", body: "", severity: "info", display_on_homepage: false, display_until: "" })
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

  // Fetch businesses. Search is applied client-side (see `filteredBusinesses`),
  // so we never send a `search` query param — PaginationDto whitelists only
  // page/limit and the API rejects unknown params (400). limit caps at 100
  // server-side (PaginationDto @Max(100)); 200 → 400.
  const fetchBusinesses = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: "1", limit: "100" })
    apiFetch<{ data: Business[]; total: number } | Business[]>(`/api/super/businesses?${params}`)
      .then(res => setBusinesses(Array.isArray(res) ? res : res.data))
      .catch((e: any) => setError(e.message ?? "Failed to load businesses"))
      .finally(() => setLoading(false))
  }, [])

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

  // Analytics computed from existing endpoints (no dedicated analytics API):
  // plan distribution from /subscriptions, new-businesses-this-month + avg
  // revenue/business from /businesses + active subscription prices. Metrics with
  // no data source (churn, trial conversion, daily txn volume) are NOT faked.
  const fetchAnalytics = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      apiFetch<{ data: Subscription[] } | Subscription[]>("/api/super/subscriptions"),
      apiFetch<{ data: Business[] } | Business[]>("/api/super/businesses?limit=100"),
    ])
      .then(([subsRes, bizRes]) => {
        const subs = Array.isArray(subsRes) ? subsRes : subsRes.data ?? []
        const biz = Array.isArray(bizRes) ? bizRes : bizRes.data ?? []
        const counts = new Map<string, number>()
        subs.forEach(s => counts.set(s.plan_name || "unknown", (counts.get(s.plan_name || "unknown") ?? 0) + 1))
        const planDistribution = [...counts.entries()]
          .map(([plan, count]) => ({ plan, count, pct: subs.length ? Math.round((count / subs.length) * 100) : 0 }))
          .sort((a, b) => b.count - a.count)
        const now = new Date()
        const newBusinessesThisMonth = biz.filter(b => {
          const d = new Date(b.created_at)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length
        const activeRevenue = subs
          .filter(s => s.status === "active")
          .reduce((sum, s) => sum + (Number(s.price_mad) || 0), 0)
        setAnalytics({
          planDistribution,
          totalSubs: subs.length,
          newBusinessesThisMonth,
          avgRevenuePerBusiness: biz.length ? Math.round(activeRevenue / biz.length) : 0,
          totalBusinesses: biz.length,
        })
      })
      .catch((e: any) => setError(e.message ?? "Failed to load analytics"))
      .finally(() => setLoading(false))
  }, [])

  // System health from the real /api/health probe (status + db + redis up/down),
  // measuring API round-trip latency. Other infra metrics have no backend.
  const fetchHealth = useCallback(() => {
    const t0 = performance.now()
    apiFetch<{ status: string; db: string; redis: string }>("/api/health")
      .then(h => setHealth({ ...h, latencyMs: Math.round(performance.now() - t0) }))
      .catch(() => setHealth({ status: "down", db: "down", redis: "down" }))
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
    } else if (activeTab === "analytics") {
      fetchAnalytics()
    } else if (activeTab === "system") {
      fetchHealth()
      fetchAuditLogs(1) // reuse real audit log as the "recent activity" feed
    }
  }, [activeTab])  // eslint-disable-line react-hooks/exhaustive-deps

  // Probe /api/health once on mount so the sidebar health badge is always real.
  useEffect(() => { fetchHealth() }, [fetchHealth])

  // Derived real system-health label for the sidebar badge.
  const healthUp = (v?: string) => v === "up" || v === "ok"
  const systemHealthLabel = !health ? "checking"
    : (healthUp(health.status) && healthUp(health.db) && healthUp(health.redis)) ? "healthy"
    : healthUp(health.status) ? "degraded" : "down"

  // Audit: client-side filter over the current page (the API has no search params).
  const auditActions = [...new Set(auditLogs.map(l => l.action))].sort()
  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditAction !== "all" && log.action !== auditAction) return false
    if (auditDate && !(log.performed_at ?? "").startsWith(auditDate)) return false
    if (auditSearch) {
      const q = auditSearch.toLowerCase()
      const hay = `${log.action} ${log.entity_type ?? ""} ${log.entity_id ?? ""} ${log.user_id ?? ""} ${JSON.stringify(log.details_json ?? {})}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const exportAuditCsv = () => {
    const cols = ["performed_at", "action", "entity_type", "entity_id", "user_id", "ip_address"]
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const rows = filteredAuditLogs.map(l => cols.map(c => esc((l as unknown as Record<string, unknown>)[c])).join(","))
    const csv = [cols.join(","), ...rows].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url; a.download = `audit-logs-page-${auditPage}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

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
    // UpdateBusinessStatusDto = { is_active: boolean } (not a status string).
    apiFetch(`/api/super/businesses/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: newStatus === "active" }),
    })
      .then(() => setBusinesses(prev => prev.map(b => b.id === id ? { ...b, status: newStatus as Business["status"] } : b)))
      .catch((e: any) => setError(e.message ?? "Failed to update status"))
  }

  const handleCreateBusiness = () => {
    setError(null)
    // CreateBusinessDto: business_type_id(req), name, email, owner_email,
    // owner_password, owner_first_name, owner_last_name; legal_name/phone optional.
    apiFetch<Business>("/api/super/businesses", {
      method: "POST",
      body: JSON.stringify({
        name: businessForm.name,
        business_type_id: businessForm.business_type_id,
        legal_name: businessForm.legal_name || undefined,
        email: businessForm.email,
        phone: businessForm.phone || undefined,
        owner_email: businessForm.owner_email,
        owner_password: businessForm.owner_password,
        owner_first_name: businessForm.owner_first_name,
        owner_last_name: businessForm.owner_last_name,
      }),
    })
      .then(() => { setShowCreateBusinessModal(false); fetchBusinesses() })
      .catch((e: any) => setError(e.message ?? "Failed to create business"))
  }

  const handleEditBusiness = () => {
    if (!selectedBusiness) return
    setError(null)
    // UpdateBusinessDto only accepts name/legal_name/email/phone/logo_url.
    apiFetch<Business>(`/api/super/businesses/${selectedBusiness.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: businessForm.name,
        legal_name: businessForm.legal_name || undefined,
        email: businessForm.email || undefined,
        phone: businessForm.phone || undefined,
      }),
    })
      .then(() => { setShowEditBusinessModal(false); fetchBusinesses() })
      .catch((e: any) => setError(e.message ?? "Failed to update business"))
  }

  // CreatePlatformAnnouncementDto = { title, body, severity?(info|warning|critical),
  // target_business_type_ids?, target_business_ids?, display_on_homepage?, display_until? }.
  const announcementPayload = () => ({
    title: annForm.title,
    body: annForm.body,
    severity: annForm.severity,
    display_on_homepage: annForm.display_on_homepage,
    display_until: annForm.display_until || undefined,
  })

  const handleCreateAnnouncement = () => {
    setError(null)
    apiFetch<Announcement>("/api/super/announcements", {
      method: "POST",
      body: JSON.stringify(announcementPayload()),
    })
      .then(() => {
        setAnnForm({ title: "", body: "", severity: "info", display_on_homepage: false, display_until: "" })
        fetchAnnouncements()
      })
      .catch((e: any) => setError(e.message ?? "Failed to create announcement"))
  }

  const handleEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncement(ann)
    setAnnForm({
      title: ann.title,
      body: ann.body ?? "",
      severity: ann.severity ?? "info",
      display_on_homepage: ann.display_on_homepage ?? false,
      display_until: ann.display_until ? ann.display_until.slice(0, 10) : "",
    })
    setShowAnnModal(true)
  }

  const handleSaveAnnouncement = () => {
    if (!editingAnnouncement) return
    setError(null)
    apiFetch<Announcement>(`/api/super/announcements/${editingAnnouncement.id}`, {
      method: "PATCH",
      body: JSON.stringify(announcementPayload()),
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

  const navItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "businesses", label: "Businesses", icon: Building2 },
    { id: "terminals", label: "Terminals", icon: Monitor },
    { id: "billing", label: "Billing", icon: CreditCard },
    // "Support" tab hidden: it was an unbuilt mockup (no backend, no spec,
    // hardcoded empty ticket list + fake stats). Re-add this entry to restore it.
    // { id: "support", label: "Support", icon: HeadphonesIcon },
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
            systemHealthLabel === "healthy" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
            systemHealthLabel === "degraded" ? "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
            systemHealthLabel === "down" ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
            "bg-gray-100 dark:bg-gray-800 text-gray-500"
          }`}>
            <Activity className="w-4 h-4" />
            <span className="capitalize">{systemHealthLabel}</span>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalBusinesses ?? "—"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Businesses</p>
                <p className="text-xs text-gray-500 mt-1">platform-wide</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalTerminals ?? "—"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Terminals</p>
                <p className="text-xs text-emerald-400 mt-1">{stats?.onlineTerminals ?? "—"} online</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-400 dark:text-gray-600">—</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transactions Today</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">not available</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-400 dark:text-gray-600">—</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue Today</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">not available</p>
              </div>
            </div>

            {/* Recent businesses + alerts — derived from the real businesses list */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recently Added Businesses</h3>
                <div className="space-y-3">
                  {businesses.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No businesses yet.</p>}
                  {[...businesses].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 5).map((business, i) => (
                    <div key={business.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-500">#{i + 1}</span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{business.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{business.business_code ?? "—"}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{business.created_at ? new Date(business.created_at).toLocaleDateString() : "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Alerts</h3>
                <div className="space-y-3">
                  {(() => {
                    const suspended = businesses.filter(b => b.is_active === false)
                    if (suspended.length === 0) {
                      return (
                        <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-emerald-400">All clear</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">No suspended businesses.</p>
                          </div>
                        </div>
                      )
                    }
                    return suspended.slice(0, 6).map(b => (
                      <div key={b.id} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-400">Suspended Account</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{b.name} is currently suspended</p>
                        </div>
                      </div>
                    ))
                  })()}
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
                  setBusinessForm({ name: "", business_type_id: "", legal_name: "", email: "", phone: "", owner_email: "", owner_password: "", owner_first_name: "", owner_last_name: "" })
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
                      <td className="p-4 font-mono text-sm text-emerald-400">{business.monthly_revenue != null ? `${business.monthly_revenue.toLocaleString()} MAD` : "—"}</td>
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
                              apiFetch<Business & { business_type_id?: string; legal_name?: string; email?: string; phone?: string }>(`/api/super/businesses/${business.id}`)
                                .then(detail => {
                                  setSelectedBusiness(detail)
                                  setBusinessForm({
                                    name: detail.name,
                                    business_type_id: (detail as any).business_type_id ?? "",
                                    legal_name: (detail as any).legal_name ?? "",
                                    email: (detail as any).email ?? "",
                                    phone: (detail as any).phone ?? "",
                                    owner_email: "",
                                    owner_password: "",
                                    owner_first_name: "",
                                    owner_last_name: "",
                                  })
                                  setShowEditBusinessModal(true)
                                })
                                .catch(() => {
                                  setSelectedBusiness(business)
                                  setBusinessForm({
                                    name: business.name,
                                    business_type_id: (business as any).business_type_id ?? "",
                                    legal_name: (business as any).legal_name ?? "",
                                    email: (business as any).email ?? "",
                                    phone: (business as any).phone ?? "",
                                    owner_email: "",
                                    owner_password: "",
                                    owner_first_name: "",
                                    owner_last_name: "",
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
                <p className="text-2xl font-bold text-emerald-400">{terminals.filter(t => t.is_online).length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Online Now</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-red-400">{terminals.filter(t => !t.is_online).length}</p>
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
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{terminal.location?.business?.name ?? "—"}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{terminal.location?.name ?? terminal.location_id ?? "—"}</td>
                      <td className="p-4">
                        <Badge color={terminal.is_online ? "green" : "red"}>{terminal.is_online ? "online" : "offline"}</Badge>
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{terminal.app_version ?? terminal.os_version ?? "—"}</td>
                      <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{terminal.last_seen_at ?? "—"}</td>
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
                    <span className="text-emerald-400 font-semibold">+{analytics?.newBusinessesThisMonth ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Businesses</span>
                    <span className="text-white font-semibold">{analytics?.totalBusinesses ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Avg Revenue/Business</span>
                    <span className="text-white font-semibold">{analytics ? `${analytics.avgRevenuePerBusiness} MAD` : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between" title="No backend data source yet">
                    <span className="text-gray-400">Churn Rate</span>
                    <span className="text-gray-500 text-sm italic">not available</span>
                  </div>
                  <div className="flex items-center justify-between" title="No backend data source yet">
                    <span className="text-gray-400">Trial Conversion</span>
                    <span className="text-gray-500 text-sm italic">not available</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Plan Distribution
                  <span className="ml-2 text-xs font-normal text-gray-500">{analytics?.totalSubs ?? 0} subscriptions</span>
                </h3>
                <div className="space-y-3">
                  {!analytics && <p className="text-sm text-gray-500">Loading…</p>}
                  {analytics && analytics.planDistribution.length === 0 && (
                    <p className="text-sm text-gray-500">No subscriptions yet.</p>
                  )}
                  {analytics?.planDistribution.map(({ plan, count, pct }) => (
                    <div key={plan}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-400 capitalize">{plan}</span>
                        <span className="text-white">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            plan === "professional" ? "bg-blue-500" :
                            plan === "enterprise" ? "bg-purple-500" :
                            plan === "trial" ? "bg-amber-500" : "bg-gray-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transaction Volume — no platform-level daily-transaction endpoint exists */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transaction Volume (Last 7 Days)</h3>
              <div className="h-32 flex flex-col items-center justify-center text-center">
                <BarChart3 className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Not available yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Requires a platform transaction-volume endpoint.</p>
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
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={auditAction}
                  onChange={(e) => setAuditAction(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                >
                  <option value="all">All Actions</option>
                  {auditActions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input
                  type="date"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
                <Button variant="secondary" onClick={exportAuditCsv} disabled={filteredAuditLogs.length === 0}>
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
                  {filteredAuditLogs.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      {auditTotal === 0 ? "No audit log entries yet." : "No entries match the current filters."}
                    </td></tr>
                  )}
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {log.performed_at ? new Date(log.performed_at).toLocaleString() : "—"}
                      </td>
                      <td className="p-4">
                        <Badge color={
                          log.action.includes("suspend") ? "red" :
                          log.action.includes("login") ? "blue" :
                          log.action.includes("update") || log.action.includes("change") ? "yellow" : "green"
                        }>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-white font-mono text-xs">{log.user_id ? log.user_id.slice(0, 8) + "…" : "—"}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {log.entity_type ?? "—"}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ""}
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-500">{log.ip_address ?? "—"}</td>
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
          <VersionLogPage />
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
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Severity</label>
                    <select
                      value={annForm.severity}
                      onChange={(e) => setAnnForm(prev => ({ ...prev, severity: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Display Until</label>
                    <input
                      type="date"
                      value={annForm.display_until}
                      onChange={(e) => setAnnForm(prev => ({ ...prev, display_until: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={annForm.display_on_homepage}
                    onChange={(e) => setAnnForm(prev => ({ ...prev, display_on_homepage: e.target.checked }))}
                    className="rounded"
                  />
                  Show on merchant homepage
                </label>
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
                          {announcement.severity && (
                            <Badge color={announcement.severity === "critical" ? "red" : announcement.severity === "warning" ? "yellow" : "blue"}>
                              {announcement.severity}
                            </Badge>
                          )}
                          {announcement.display_on_homepage && <Badge color="green">homepage</Badge>}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{announcement.body}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Created: {announcement.created_at ? new Date(announcement.created_at).toLocaleDateString() : "—"}
                          {announcement.display_until && ` · shows until ${new Date(announcement.display_until).toLocaleDateString()}`}
                        </p>
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
            {(() => {
              const isUp = (v?: string) => v === "up" || v === "ok"
              const cards = [
                { label: "API Server", icon: Server, up: isUp(health?.status), extra: health?.latencyMs != null ? `${health.latencyMs}ms round-trip` : null },
                { label: "Database", icon: Globe, up: isUp(health?.db), extra: null },
                { label: "Redis Cache", icon: Zap, up: isUp(health?.redis), extra: null },
              ]
              return (
                <div className="grid grid-cols-3 gap-6">
                  {cards.map(c => (
                    <div key={c.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.up ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                          <c.icon className={`w-5 h-5 ${c.up ? "text-emerald-400" : "text-red-400"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{c.label}</p>
                          <p className={`text-xs ${health == null ? "text-gray-400" : c.up ? "text-emerald-400" : "text-red-400"}`}>
                            {health == null ? "Checking…" : c.up ? "Healthy" : "Down"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Status</span>
                          <span className="text-gray-900 dark:text-white">{health == null ? "—" : c.up ? "up" : "down"}</span>
                        </div>
                        {c.extra && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Latency</span>
                            <span className="text-gray-900 dark:text-white">{c.extra}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Live from <code>/api/health</code>. Throughput, uptime %, connection pool and storage metrics require an
              infrastructure-monitoring backend (not available).
            </p>

            {/* Recent platform activity — real audit log */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Platform Activity</h3>
              <div className="space-y-2 font-mono text-xs">
                {auditLogs.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity recorded.</p>
                )}
                {auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                    <span className="text-gray-500 whitespace-nowrap">{log.performed_at ? new Date(log.performed_at).toLocaleString() : "—"}</span>
                    <span className="text-emerald-400 uppercase">[{log.action}]</span>
                    <span className="text-gray-600 dark:text-gray-300">{log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ""}</span>
                  </div>
                ))}
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
                <p className="font-medium text-emerald-600 dark:text-emerald-400">{selectedBusiness.monthly_revenue != null ? `${selectedBusiness.monthly_revenue.toLocaleString()} MAD` : "—"}</p>
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Business Type <span className="text-red-500">*</span></label>
            <select value={businessForm.business_type_id} onChange={(e) => setBusinessForm(prev => ({ ...prev, business_type_id: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              <option value="">Select a type...</option>
              {businessTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Legal Name</label>
            <input type="text" value={businessForm.legal_name} onChange={(e) => setBusinessForm(prev => ({ ...prev, legal_name: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Business Email <span className="text-red-500">*</span></label>
              <input type="email" value={businessForm.email} onChange={(e) => setBusinessForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Phone</label>
              <input type="text" value={businessForm.phone} onChange={(e) => setBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+212 6 ..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Owner Account</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner First Name <span className="text-red-500">*</span></label>
                <input type="text" value={businessForm.owner_first_name} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_first_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner Last Name <span className="text-red-500">*</span></label>
                <input type="text" value={businessForm.owner_last_name} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_last_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner Email <span className="text-red-500">*</span></label>
            <input type="email" value={businessForm.owner_email} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_email: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Owner Password <span className="text-red-500">*</span></label>
            <input type="password" value={businessForm.owner_password} onChange={(e) => setBusinessForm(prev => ({ ...prev, owner_password: e.target.value }))}
              placeholder="min. 6 characters"
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Legal Name</label>
            <input type="text" value={businessForm.legal_name} onChange={(e) => setBusinessForm(prev => ({ ...prev, legal_name: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Business Email</label>
            <input type="email" value={businessForm.email} onChange={(e) => setBusinessForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Phone</label>
            <input type="text" value={businessForm.phone} onChange={(e) => setBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
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
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Severity</label>
              <select value={annForm.severity} onChange={(e) => setAnnForm(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Display Until</label>
              <input type="date" value={annForm.display_until} onChange={(e) => setAnnForm(prev => ({ ...prev, display_until: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={annForm.display_on_homepage} onChange={(e) => setAnnForm(prev => ({ ...prev, display_on_homepage: e.target.checked }))} className="rounded" />
            Show on merchant homepage
          </label>
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



