"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
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

// ==================== MOCK DATA ====================
const mockStats: SystemStats = {
  total_businesses: 156,
  active_businesses: 142,
  total_terminals: 423,
  online_terminals: 398,
  total_transactions_today: 12847,
  total_revenue_today: 1547820,
  system_health: "healthy",
}

const mockBusinesses: Business[] = [
  {
    id: "1",
    name: "Café Marrakech",
    owner_name: "Ahmed Benali",
    owner_email: "ahmed@cafemarrakech.ma",
    plan: "professional",
    status: "active",
    locations_count: 3,
    terminals_count: 8,
    employees_count: 24,
    monthly_revenue: 245000,
    created_at: "2023-06-15",
  },
  {
    id: "2",
    name: "Restaurant La Marina",
    owner_name: "Fatima Zahra",
    owner_email: "fatima@lamarina.ma",
    plan: "enterprise",
    status: "active",
    locations_count: 5,
    terminals_count: 15,
    employees_count: 56,
    monthly_revenue: 520000,
    created_at: "2023-03-20",
  },
  {
    id: "3",
    name: "Bakery Casablanca",
    owner_name: "Youssef Amrani",
    owner_email: "youssef@bakery.ma",
    plan: "starter",
    status: "trial",
    locations_count: 1,
    terminals_count: 2,
    employees_count: 5,
    monthly_revenue: 35000,
    created_at: "2024-01-10",
    trial_ends_at: "2024-02-10",
  },
  {
    id: "4",
    name: "Fast Food Express",
    owner_name: "Sara Idrissi",
    owner_email: "sara@ffexpress.ma",
    plan: "professional",
    status: "suspended",
    locations_count: 2,
    terminals_count: 4,
    employees_count: 12,
    monthly_revenue: 0,
    created_at: "2023-09-01",
  },
]

// Mock data for new tabs
const mockTerminals = [
  { id: "T001", business: "Café Marrakech", location: "Casablanca Main", status: "online", last_seen: "2024-01-15 14:32:15", version: "2.4.1", transactions_today: 45 },
  { id: "T002", business: "Café Marrakech", location: "Casablanca Main", status: "online", last_seen: "2024-01-15 14:31:42", version: "2.4.1", transactions_today: 38 },
  { id: "T003", business: "Restaurant La Marina", location: "Rabat Center", status: "offline", last_seen: "2024-01-15 10:15:00", version: "2.3.8", transactions_today: 12 },
  { id: "T004", business: "Restaurant La Marina", location: "Rabat Center", status: "online", last_seen: "2024-01-15 14:30:55", version: "2.4.1", transactions_today: 67 },
  { id: "T005", business: "Bakery Casablanca", location: "Main Store", status: "online", last_seen: "2024-01-15 14:32:00", version: "2.4.0", transactions_today: 28 },
]

const mockBillingData = [
  { id: "INV-001", business: "Café Marrakech", plan: "professional", amount: 499, status: "paid", date: "2024-01-01", method: "card" },
  { id: "INV-002", business: "Restaurant La Marina", plan: "enterprise", amount: 999, status: "paid", date: "2024-01-01", method: "bank" },
  { id: "INV-003", business: "Bakery Casablanca", plan: "starter", amount: 0, status: "trial", date: "2024-01-10", method: "-" },
  { id: "INV-004", business: "Fast Food Express", plan: "professional", amount: 499, status: "overdue", date: "2024-01-01", method: "card" },
]

const mockTickets = [
  { id: "TKT-001", business: "Café Marrakech", subject: "Terminal not printing receipts", priority: "high", status: "open", created: "2024-01-15 10:00", assignee: "Support Team A" },
  { id: "TKT-002", business: "Restaurant La Marina", subject: "Need help with inventory setup", priority: "medium", status: "in_progress", created: "2024-01-14 15:30", assignee: "Support Team B" },
  { id: "TKT-003", business: "Bakery Casablanca", subject: "Questions about pricing tiers", priority: "low", status: "resolved", created: "2024-01-13 09:00", assignee: "Sales Team" },
  { id: "TKT-004", business: "Fast Food Express", subject: "Account suspension appeal", priority: "high", status: "escalated", created: "2024-01-12 14:00", assignee: "Management" },
]

const mockAuditLogs = [
  { id: 1, action: "business_suspended", actor: "admin@rts.ma", target: "Fast Food Express", timestamp: "2024-01-15 14:00:00", ip: "196.200.x.x" },
  { id: 2, action: "plan_changed", actor: "billing@rts.ma", target: "Restaurant La Marina", timestamp: "2024-01-14 11:30:00", ip: "196.200.x.x" },
  { id: 3, action: "terminal_registered", actor: "system", target: "T005 - Bakery Casablanca", timestamp: "2024-01-13 09:15:00", ip: "auto" },
  { id: 4, action: "user_login", actor: "admin@rts.ma", target: "Super Admin Portal", timestamp: "2024-01-15 08:00:00", ip: "196.200.x.x" },
  { id: 5, action: "config_changed", actor: "admin@rts.ma", target: "Global Settings", timestamp: "2024-01-12 16:45:00", ip: "196.200.x.x" },
]

const mockVersionLogs = [
  { version: "2.4.1", date: "2024-01-10", type: "patch", notes: "Bug fixes for receipt printing", deployed: true },
  { version: "2.4.0", date: "2024-01-05", type: "minor", notes: "Added multi-currency support", deployed: true },
  { version: "2.3.8", date: "2023-12-20", type: "patch", notes: "Performance improvements", deployed: true },
  { version: "2.3.7", date: "2023-12-15", type: "patch", notes: "Security updates", deployed: true },
  { version: "2.3.0", date: "2023-12-01", type: "minor", notes: "New inventory management features", deployed: true },
]

const mockAdminAnnouncements = [
  { id: 1, title: "Scheduled Maintenance", message: "System will be down for maintenance on Jan 20th from 2-4 AM", status: "scheduled", target: "all", created: "2024-01-15" },
  { id: 2, title: "New Feature: Multi-Currency", message: "You can now accept payments in multiple currencies!", status: "sent", target: "enterprise", created: "2024-01-10" },
  { id: 3, title: "Holiday Hours Reminder", message: "Don't forget to update your business hours for the holidays", status: "sent", target: "all", created: "2024-01-05" },
]

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

const mockBusinessTypes: BusinessType[] = [
  {
    id: "retail",
    name: "Retail",
    description: "General retail stores, supermarkets, convenience stores",
    business_count: 45,
    features: {
      loyalty_points: true,
      promotions_campaigns: true,
      coupons_vouchers: true,
      inventory_management: true,
      restaurant_operations: false,
      kitchen_display_system: false,
      chain_multi_store: true,
      recommendations_engine: true,
    }
  },
  {
    id: "restaurant",
    name: "Restaurant / Café",
    description: "Restaurants, cafés, fast food, food trucks",
    business_count: 72,
    features: {
      loyalty_points: true,
      promotions_campaigns: true,
      coupons_vouchers: true,
      inventory_management: true,
      restaurant_operations: true,
      kitchen_display_system: true,
      chain_multi_store: true,
      recommendations_engine: true,
    }
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    description: "Pharmacies and medical supply stores",
    business_count: 18,
    features: {
      loyalty_points: true,
      promotions_campaigns: false,
      coupons_vouchers: false,
      inventory_management: true,
      restaurant_operations: false,
      kitchen_display_system: false,
      chain_multi_store: true,
      recommendations_engine: false,
    }
  },
  {
    id: "salon",
    name: "Salon / Spa",
    description: "Hair salons, beauty spas, nail salons",
    business_count: 12,
    features: {
      loyalty_points: true,
      promotions_campaigns: true,
      coupons_vouchers: true,
      inventory_management: false,
      restaurant_operations: false,
      kitchen_display_system: false,
      chain_multi_store: false,
      recommendations_engine: false,
    }
  },
  {
    id: "hotel",
    name: "Hotel",
    description: "Hotels, riads, guesthouses",
    business_count: 9,
    features: {
      loyalty_points: true,
      promotions_campaigns: true,
      coupons_vouchers: true,
      inventory_management: false,
      restaurant_operations: true,
      kitchen_display_system: true,
      chain_multi_store: true,
      recommendations_engine: false,
    }
  },
]

const mockTradeCategories: TradeCategory[] = [
  {
    id: "food",
    name_fr: "Alimentation",
    name_ar: "غذاء",
    icon_name: "UtensilsCrossed",
    sort_order: 1,
    parent_id: null,
    business_count: 0,
    children: [
      { id: "restaurant", name_fr: "Restaurant", name_ar: "مطعم", icon_name: "ChefHat", sort_order: 1, parent_id: "food", business_count: 45 },
      { id: "cafe", name_fr: "Café", name_ar: "مقهى", icon_name: "Coffee", sort_order: 2, parent_id: "food", business_count: 28 },
      { id: "bakery", name_fr: "Boulangerie", name_ar: "مخبز", icon_name: "Croissant", sort_order: 3, parent_id: "food", business_count: 15 },
    ]
  },
  {
    id: "retail",
    name_fr: "Commerce de détail",
    name_ar: "تجارة التجزئة",
    icon_name: "ShoppingBag",
    sort_order: 2,
    parent_id: null,
    business_count: 0,
    children: [
      { id: "grocery", name_fr: "Épicerie", name_ar: "بقالة", icon_name: "ShoppingCart", sort_order: 1, parent_id: "retail", business_count: 32 },
      { id: "clothing", name_fr: "Vêtements", name_ar: "ملابس", icon_name: "Shirt", sort_order: 2, parent_id: "retail", business_count: 18 },
    ]
  },
  {
    id: "health",
    name_fr: "Santé & Beauté",
    name_ar: "صحة وجمال",
    icon_name: "Heart",
    sort_order: 3,
    parent_id: null,
    business_count: 0,
    children: [
      { id: "pharmacy", name_fr: "Pharmacie", name_ar: "صيدلية", icon_name: "Pill", sort_order: 1, parent_id: "health", business_count: 18 },
      { id: "salon", name_fr: "Salon de coiffure", name_ar: "صالون", icon_name: "Scissors", sort_order: 2, parent_id: "health", business_count: 12 },
    ]
  },
]

const mockCouriers: Courier[] = [
  {
    id: "1",
    name: "Glovo Morocco",
    phone: "+212 5 22 123 456",
    email: "partners@glovo.ma",
    website: "https://glovoapp.com",
    notes: "Main delivery partner for Casablanca region",
    is_active: true,
    linked_businesses: [
      { id: "1", name: "Café Marrakech" },
      { id: "2", name: "Restaurant La Marina" },
      { id: "5", name: "Bakery Casablanca" },
    ]
  },
  {
    id: "2",
    name: "Jumia Food",
    phone: "+212 5 22 789 012",
    email: "business@jumia.ma",
    website: "https://food.jumia.ma",
    is_active: true,
    linked_businesses: [
      { id: "1", name: "Café Marrakech" },
    ]
  },
  {
    id: "3",
    name: "Local Express",
    phone: "+212 6 61 234 567",
    email: "contact@localexpress.ma",
    is_active: false,
    linked_businesses: []
  },
]

const mockSystemParameters: SystemParameter[] = [
  { key: "max_terminals_per_location", value: "10", description: "Maximum number of terminals allowed per business location", updated_at: "2024-01-10 14:30" },
  { key: "default_tva_rate", value: "20", description: "Default TVA rate (%) applied to new products", updated_at: "2024-01-05 09:15" },
  { key: "points_expiry_months", value: "12", description: "Number of months before loyalty points expire", updated_at: "2024-01-08 11:00" },
  { key: "invoice_prefix", value: "INV", description: "Prefix used for invoice numbering", updated_at: "2023-12-20 16:45" },
  { key: "support_email", value: "support@rts.ma", description: "Primary support email address", updated_at: "2024-01-12 10:00" },
  { key: "platform_currency", value: "MAD", description: "Platform default currency code", updated_at: "2023-11-15 08:30" },
]

// ============== SUBSCRIPTIONS MOCK DATA ==============
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

const mockSubscriptions: Subscription[] = [
  {
    id: "SUB001",
    business_id: "1",
    business_name: "Café Marrakech",
    owner_email: "hassan@cafemarrakech.ma",
    plan: "professional",
    status: "active",
    started_at: "2024-01-01",
    expires_at: "2025-01-01",
    amount_paid: 499,
    created_by: "admin@rts.ma",
  },
  {
    id: "SUB002",
    business_id: "2",
    business_name: "Restaurant La Marina",
    owner_email: "fatima@lamarina.ma",
    plan: "enterprise",
    status: "active",
    started_at: "2023-11-15",
    expires_at: "2024-11-15",
    amount_paid: 999,
    created_by: "admin@rts.ma",
  },
  {
    id: "SUB003",
    business_id: "3",
    business_name: "Superette Centrale",
    owner_email: "karim@superette.ma",
    plan: "starter",
    status: "trial",
    started_at: "2024-01-10",
    expires_at: "2024-02-10",
    amount_paid: 0,
    created_by: "system",
    notes: "30-day trial started via website signup",
  },
  {
    id: "SUB004",
    business_id: "4",
    business_name: "Pharmacie Ibn Sina",
    owner_email: "dr.alami@ibnsina.ma",
    plan: "professional",
    status: "expired",
    started_at: "2023-06-01",
    expires_at: "2024-01-01",
    amount_paid: 499,
    created_by: "billing@rts.ma",
  },
  {
    id: "SUB005",
    business_id: "5",
    business_name: "Bakery Casablanca",
    owner_email: "youssef@bakery.ma",
    plan: "starter",
    status: "active",
    started_at: "2024-01-05",
    expires_at: "2025-01-05",
    amount_paid: 199,
    created_by: "admin@rts.ma",
  },
  {
    id: "SUB006",
    business_id: "6",
    business_name: "Fast Food Express",
    owner_email: "omar@fastfood.ma",
    plan: "professional",
    status: "cancelled",
    started_at: "2023-09-01",
    expires_at: "2024-03-01",
    amount_paid: 499,
    created_by: "admin@rts.ma",
    notes: "Customer requested cancellation - migrating to competitor",
  },
  {
    id: "SUB007",
    business_id: "7",
    business_name: "Salon Beauté Plus",
    owner_email: "sara@beauteplus.ma",
    plan: "free",
    status: "active",
    started_at: "2024-01-12",
    expires_at: null,
    amount_paid: 0,
    created_by: "system",
  },
  {
    id: "SUB008",
    business_id: "8",
    business_name: "Hotel Riad Fes",
    owner_email: "manager@riadfes.ma",
    plan: "enterprise",
    status: "trial",
    started_at: "2024-01-08",
    expires_at: "2024-02-08",
    amount_paid: 0,
    created_by: "sales@rts.ma",
    notes: "Enterprise trial - potential big client",
  },
]

const mockBusinessesForDropdown = [
  { id: "1", name: "Café Marrakech", email: "hassan@cafemarrakech.ma" },
  { id: "2", name: "Restaurant La Marina", email: "fatima@lamarina.ma" },
  { id: "3", name: "Superette Centrale", email: "karim@superette.ma" },
  { id: "9", name: "Pizzeria Napoli", email: "marco@napoli.ma" },
  { id: "10", name: "Gym Fitness Pro", email: "coach@fitnesspro.ma" },
]

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
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>(mockBusinessTypes)
  const [expandedBusinessType, setExpandedBusinessType] = useState<string | null>(null)
  const [tradeCategories] = useState<TradeCategory[]>(mockTradeCategories)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [couriers, setCouriers] = useState<Courier[]>(mockCouriers)
  const [expandedCourier, setExpandedCourier] = useState<string | null>(null)
  const [systemParams, setSystemParams] = useState<SystemParameter[]>(mockSystemParameters)
  const [editingParamKey, setEditingParamKey] = useState<string | null>(null)
  const [editingParamValue, setEditingParamValue] = useState<string>("")
  const [savedParamKey, setSavedParamKey] = useState<string | null>(null)
  
  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showCourierModal, setShowCourierModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TradeCategory | null>(null)
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name_fr: "", name_ar: "", parent_id: "", icon_name: "", sort_order: 0 })
  const [courierForm, setCourierForm] = useState({ name: "", phone: "", email: "", website: "", notes: "" })

  const handleToggleFeature = (typeId: string, feature: keyof BusinessType["features"]) => {
    setBusinessTypes(prev => prev.map(bt => 
      bt.id === typeId 
        ? { ...bt, features: { ...bt.features, [feature]: !bt.features[feature] } }
        : bt
    ))
  }

  const handleSaveParam = (key: string) => {
    setSystemParams(prev => prev.map(p => 
      p.key === key 
        ? { ...p, value: editingParamValue, updated_at: "just now" }
        : p
    ))
    setSavedParamKey(key)
    setEditingParamKey(null)
    setTimeout(() => setSavedParamKey(null), 2000)
  }

  const configSections = [
    { id: "business_types", label: "Business Types", icon: Store },
    { id: "trade_categories", label: "Trade Categories", icon: Tag },
    { id: "couriers", label: "Couriers", icon: Truck },
    { id: "system_params", label: "System Parameters", icon: Settings },
  ] as const

  return (
    <div className="space-y-6">
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
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">Business Types & Feature Flags</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configure which features are available for each business type</p>
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
                      <Button variant="primary" size="sm">
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
              <Button variant="primary" className="flex-1">Save Category</Button>
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
              <Button variant="primary" className="flex-1">{editingCourier ? "Save Changes" : "Add Courier"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============== SUBSCRIPTIONS TAB COMPONENT ==============
function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockSubscriptions)
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

  const handleCancelSubscription = () => {
    if (selectedSubscription) {
      setSubscriptions(prev => prev.map(s => 
        s.id === selectedSubscription.id ? { ...s, status: "cancelled" as SubscriptionStatus } : s
      ))
      setShowCancelConfirm(false)
      setShowEditModal(false)
    }
  }

  return (
    <div className="space-y-6">
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
                  {mockBusinessesForDropdown.map(biz => (
                    <option key={biz.id} value={biz.id}>{biz.name} — {biz.email}</option>
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
              <Button variant="primary">
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

  const [businesses, setBusinesses] = useState(mockBusinesses)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const [showBusinessModal, setShowBusinessModal] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "businesses" | "terminals" | "billing" | "support" | "analytics" | "audit" | "config" | "versions" | "announcements" | "system">("overview")

  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.owner_email.toLowerCase().includes(searchQuery.toLowerCase())
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
    setBusinesses(businesses.map(b => 
      b.id === id ? { ...b, status: b.status === "suspended" ? "active" as const : "suspended" as const } : b
    ))
  }

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
            mockStats.system_health === "healthy" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
            mockStats.system_health === "degraded" ? "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
            "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          }`}>
            <Activity className="w-4 h-4" />
            <span className="capitalize">{mockStats.system_health}</span>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.total_businesses}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Businesses</p>
                <p className="text-xs text-emerald-400 mt-1">{mockStats.active_businesses} active</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.total_terminals}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Terminals</p>
                <p className="text-xs text-emerald-400 mt-1">{mockStats.online_terminals} online</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.total_transactions_today.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transactions Today</p>
                <p className="text-xs text-gray-500 mt-1">Across all businesses</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(mockStats.total_revenue_today / 1000).toFixed(0)}K MAD</p>
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
                <Button variant="primary">
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
                            onClick={() => { setSelectedBusiness(business); setShowBusinessModal(true) }}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg">
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.total_terminals}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Terminals</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-emerald-400">{mockStats.online_terminals}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Online Now</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-2xl font-bold text-red-400">{mockStats.total_terminals - mockStats.online_terminals}</p>
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
                  {mockTerminals.map((terminal) => (
                    <tr key={terminal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 font-mono text-sm text-gray-900 dark:text-white">{terminal.id}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{terminal.business}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{terminal.location}</td>
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
                  {mockTickets.map((ticket) => (
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
                  {mockAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{log.timestamp}</td>
                      <td className="p-4">
                        <Badge color={
                          log.action.includes("suspended") ? "red" :
                          log.action.includes("login") ? "blue" :
                          log.action.includes("changed") ? "yellow" : "green"
                        }>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-white">{log.actor}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{log.target}</td>
                      <td className="p-4 font-mono text-xs text-gray-500">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">Showing 1-5 of 1,234 entries</p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="!py-1.5 !px-3">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" className="!py-1.5 !px-3">
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
                  {mockVersionLogs.map((version) => (
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
            {/* Create Announcement */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Announcement</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="Announcement title..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Message</label>
                  <textarea
                    placeholder="Write your announcement..."
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Target Audience</label>
                    <select className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                      <option value="all">All Businesses</option>
                      <option value="starter">Starter Plan Only</option>
                      <option value="professional">Professional Plan Only</option>
                      <option value="enterprise">Enterprise Plan Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Schedule</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary">Save as Draft</Button>
                  <Button variant="primary">
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
                {mockAdminAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{announcement.title}</h4>
                          <Badge color={announcement.status === "sent" ? "green" : "yellow"}>
                            {announcement.status}
                          </Badge>
                          <Badge color="gray">
                            {announcement.target === "all" ? "All" : announcement.target}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{announcement.message}</p>
                        <p className="text-xs text-gray-500 mt-2">Created: {announcement.created}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg">
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
      </div>
    </div>
  )
}



