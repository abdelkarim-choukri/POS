"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Plus,
  X,
  Link2,
  Unlink,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Building2,
  Users,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Settings,
  Eye,
  ArrowUpRight,
  FileText,
  Boxes,
  Warehouse,
  Calendar,
  Lock,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CURRENCY,
  DATE_FORMAT,
  PAGINATION,
  getStatusColor,
  CHAIN_LABELS as LABELS,
  COMMON_LABELS,
  PERMISSION_LABELS,
} from "@/lib/constants"

// ============== TYPES ==============
type ChainRole = "standalone" | "parent" | "child"

interface ChildBusiness {
  id: string
  name: string
  owner_email: string
  status: "active" | "inactive"
  location_count: number
  last_sync_at: string
  sync_status: "synced" | "pending" | "error"
}

interface UnmappedProduct {
  id: string
  product_name: string
  child_business_name: string
  child_business_id: string
  child_sku: string
}

interface ChainTransaction {
  id: string
  date: string
  child_business_name: string
  terminal: string
  amount: number
  payment_method: "cash" | "card" | "mobile"
  status: "completed" | "refunded" | "pending"
}

interface PORequest {
  id: string
  po_number: string
  requesting_business: string
  products_summary: string
  total_ttc: number
  requested_date: string
  status: "pending" | "fulfilled" | "rejected"
}

interface SyncedProduct {
  id: string
  product_name: string
  parent_product_id: string
  local_tva_rate: number
  local_price_override: number | null
}

// User permissions simulation
interface UserPermissions {
  role: "cashier" | "manager" | "owner"
  chain_role: ChainRole
  can_promote_to_parent: boolean
  can_rollout_to_chain: boolean
  can_fulfill_po: boolean
}

const mockUserPermissions: UserPermissions = {
  role: "owner",
  chain_role: "parent",
  can_promote_to_parent: true,
  can_rollout_to_chain: true,
  can_fulfill_po: true,
}

// Helper functions
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
function StoreRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-[#1F1F23]">
      <td className="p-4">
        <div>
          <Skeleton className="h-4 w-40 mb-1" />
          <Skeleton className="h-3 w-28" />
        </div>
      </td>
      <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="p-4"><Skeleton className="h-4 w-8" /></td>
      <td className="p-4"><Skeleton className="h-4 w-28" /></td>
      <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="p-4"><Skeleton className="h-8 w-24 rounded-lg" /></td>
    </tr>
  )
}

function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
      <Skeleton className="w-10 h-10 rounded-lg mb-2" />
      <Skeleton className="h-7 w-24 mb-1" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

// ============== MOCK DATA ==============
const mockChainRole: ChainRole = "parent" // Change to "standalone" or "child" to test different views
const mockParentName = "Marrakech Group HQ"

const mockChildBusinesses: ChildBusiness[] = [
  { id: "c1", name: "Cafe Marrakech - Casablanca", owner_email: "casa@cafemarrakech.ma", status: "active", location_count: 2, last_sync_at: "2024-03-15 14:30:00", sync_status: "synced" },
  { id: "c2", name: "Cafe Marrakech - Rabat", owner_email: "rabat@cafemarrakech.ma", status: "active", location_count: 1, last_sync_at: "2024-03-15 14:25:00", sync_status: "synced" },
  { id: "c3", name: "Cafe Marrakech - Marrakech", owner_email: "marrakech@cafemarrakech.ma", status: "active", location_count: 3, last_sync_at: "2024-03-15 10:00:00", sync_status: "pending" },
  { id: "c4", name: "Cafe Marrakech - Fes", owner_email: "fes@cafemarrakech.ma", status: "inactive", location_count: 1, last_sync_at: "2024-03-10 09:00:00", sync_status: "error" },
]

const mockUnmappedProducts: UnmappedProduct[] = [
  { id: "u1", product_name: "Local Special Coffee", child_business_name: "Cafe Marrakech - Casablanca", child_business_id: "c1", child_sku: "CASA-COF-001" },
  { id: "u2", product_name: "Regional Pastry", child_business_name: "Cafe Marrakech - Marrakech", child_business_id: "c3", child_sku: "MRK-PAS-001" },
  { id: "u3", product_name: "Rabat Mint Tea", child_business_name: "Cafe Marrakech - Rabat", child_business_id: "c2", child_sku: "RBT-TEA-001" },
]

const mockTransactions: ChainTransaction[] = [
  { id: "t1", date: "2024-03-15 14:30", child_business_name: "Cafe Marrakech - Casablanca", terminal: "T-001-CS", amount: 450, payment_method: "card", status: "completed" },
  { id: "t2", date: "2024-03-15 14:15", child_business_name: "Cafe Marrakech - Rabat", terminal: "T-001-RB", amount: 125, payment_method: "cash", status: "completed" },
  { id: "t3", date: "2024-03-15 14:00", child_business_name: "Cafe Marrakech - Marrakech", terminal: "T-002-MK", amount: 890, payment_method: "mobile", status: "completed" },
  { id: "t4", date: "2024-03-15 13:45", child_business_name: "Cafe Marrakech - Casablanca", terminal: "T-002-CS", amount: 75, payment_method: "card", status: "refunded" },
  { id: "t5", date: "2024-03-15 13:30", child_business_name: "Cafe Marrakech - Rabat", terminal: "T-001-RB", amount: 320, payment_method: "cash", status: "completed" },
]

const mockPORequests: PORequest[] = [
  { id: "po1", po_number: "PO-CASA-2024-001", requesting_business: "Cafe Marrakech - Casablanca", products_summary: "5x Coffee Beans, 10x Sugar", total_ttc: 2500, requested_date: "2024-03-15", status: "pending" },
  { id: "po2", po_number: "PO-RBT-2024-003", requesting_business: "Cafe Marrakech - Rabat", products_summary: "3x Flour, 2x Butter", total_ttc: 1800, requested_date: "2024-03-14", status: "pending" },
  { id: "po3", po_number: "PO-MRK-2024-008", requesting_business: "Cafe Marrakech - Marrakech", products_summary: "8x Tea Leaves", total_ttc: 950, requested_date: "2024-03-12", status: "fulfilled" },
]

const mockSyncedProducts: SyncedProduct[] = [
  { id: "sp1", product_name: "Signature Tagine", parent_product_id: "P-001", local_tva_rate: 20, local_price_override: null },
  { id: "sp2", product_name: "Moroccan Couscous", parent_product_id: "P-002", local_tva_rate: 20, local_price_override: 90 },
  { id: "sp3", product_name: "Mint Tea Set", parent_product_id: "P-003", local_tva_rate: 10, local_price_override: null },
  { id: "sp4", product_name: "Fresh Orange Juice", parent_product_id: "P-004", local_tva_rate: 10, local_price_override: 25 },
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

// ============== MAIN PAGE COMPONENT ==============
export default function ChainPage() {
  const [chainRole] = useState<ChainRole>(mockChainRole)
  const [activeTab, setActiveTab] = useState<"stores" | "sync_config" | "unmapped" | "dashboard" | "transactions" | "po_requests">("stores")
  const [isLoading, setIsLoading] = useState(true)
  const [permissions] = useState<UserPermissions>(mockUserPermissions)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGINATION.defaultPageSize)
  
  // Modals
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showFulfillModal, setShowFulfillModal] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PORequest | null>(null)
  
  // Filters
  const [childFilter, setChildFilter] = useState("all")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  
  // Sync config state
  const [syncConfig, setSyncConfig] = useState({
    sync_categories: true,
    sync_products: true,
    sync_promotions: false,
    tva_override_mode: "use_parent" as "use_parent" | "let_child_keep",
  })

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Permission checks
  const canPromoteToParent = permissions.role === "owner"
  const canRolloutToChain = chainRole === "parent"
  const canFulfillPO = chainRole === "parent"

  const handlePromoteToParent = () => {
    alert("Promotion to chain parent initiated. This will enable multi-store management.")
  }

  const handleSyncNow = (childId: string) => {
    alert(`Sync initiated for child: ${childId}. Job ID: SYNC-${Date.now()}`)
  }

  const handleSyncAll = () => {
    alert(`Sync All initiated. Job ID: SYNC-ALL-${Date.now()}`)
  }

  const handleFulfillPO = (po: PORequest) => {
    setSelectedPO(po)
    setShowFulfillModal(true)
  }

  // ============== STANDALONE VIEW ==============
  if (chainRole === "standalone") {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chain Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Multi-location business management</p>
          </div>
        </div>
        
        {/* Standalone Banner */}
        <div className="bg-gray-50 dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-[#1F1F23] rounded-full flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">This business is not part of a chain</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {LABELS.emptyState.standalone.description}
          </p>
          <Button 
            variant="primary" 
            onClick={handlePromoteToParent}
            disabled={!canPromoteToParent}
            title={!canPromoteToParent ? LABELS.permissions.promoteToParent : undefined}
          >
            <ArrowUpRight className="w-4 h-4" />
            {LABELS.promoteToParent}
          </Button>
        </div>
      </div>
    )
  }

  // ============== CHILD VIEW ==============
  if (chainRole === "child") {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chain Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connected to parent chain</p>
          </div>
        </div>
        
        {/* Child Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Link2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-300">Chain Member</p>
              <p className="text-sm text-blue-700 dark:text-blue-400">Parent: {mockParentName}</p>
            </div>
          </div>
        </div>

        {/* My Parent Section */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            My Parent
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Parent Business</p>
              <p className="font-medium text-gray-900 dark:text-white">{mockParentName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Sync</p>
              <p className="text-sm text-gray-900 dark:text-white">2024-03-15 14:30:00</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Synced Entities</p>
              <p className="text-sm text-gray-900 dark:text-white">45 categories, 320 products</p>
            </div>
          </div>
        </div>

        {/* Synced Catalog */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100 dark:border-[#1F1F23]">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Synced Catalog
            </h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Parent ID</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Local TVA</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Price Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {mockSyncedProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge color="blue">Synced</Badge>
                      <span className="font-medium text-gray-900 dark:text-white">{product.product_name}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{product.parent_product_id}</td>
                  <td className="p-4 text-sm text-gray-900 dark:text-white">{product.local_tva_rate}%</td>
                  <td className="p-4 text-sm text-gray-900 dark:text-white">
                    {product.local_price_override ? `${product.local_price_override} MAD` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Business Switcher */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Business Switcher
          </h3>
          <div className="space-y-3">
            {mockChildBusinesses.slice(0, 3).map(biz => (
              <div key={biz.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{biz.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{biz.owner_email}</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm">Switch</Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Warning: Switching will re-issue your session token for the selected business.
          </p>
        </div>
      </div>
    )
  }

  // ============== PARENT VIEW ==============
  const totalRevenue = mockTransactions.filter(t => t.status === "completed").reduce((sum, t) => sum + t.amount, 0)
  const totalTransactions = mockTransactions.length
  const avgOrderValue = totalRevenue / totalTransactions

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chain Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your chain of stores</p>
        </div>
        <Button variant="secondary" onClick={handleSyncAll}>
          <RefreshCw className="w-4 h-4" />
          Sync All
        </Button>
      </div>

      {/* Parent Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <Link2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-green-900 dark:text-green-300">Chain Parent</p>
            <p className="text-sm text-green-700 dark:text-green-400">{mockChildBusinesses.length} linked stores</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-[#1F1F23] mb-6 overflow-x-auto">
        {[
          { id: "stores", label: "My Stores", icon: Building2 },
          { id: "sync_config", label: "Sync Config", icon: Settings },
          { id: "unmapped", label: "Unmapped Products", icon: Package },
          { id: "dashboard", label: "Dashboard", icon: TrendingUp },
          { id: "transactions", label: "Transactions", icon: ShoppingCart },
          { id: "po_requests", label: "PO Requests", icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === "unmapped" && mockUnmappedProducts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">
                {mockUnmappedProducts.length}
              </span>
            )}
            {tab.id === "po_requests" && mockPORequests.filter(p => p.status === "pending").length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs rounded-full">
                {mockPORequests.filter(p => p.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "stores" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Linked Stores</h3>
            <Button variant="primary" onClick={() => setShowLinkModal(true)}>
              <Plus className="w-4 h-4" />
              Link Child Business
            </Button>
          </div>
          
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            {mockChildBusinesses.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No linked stores</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click &quot;Link Child Business&quot; to add your first branch to this chain</p>
                <Button variant="primary" onClick={() => setShowLinkModal(true)}>
                  <Plus className="w-4 h-4" />
                  Link Child Business
                </Button>
              </div>
            ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Business</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Locations</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Last Sync</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Sync Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {mockChildBusinesses.map(child => (
                  <tr key={child.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{child.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{child.owner_email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge color={child.status === "active" ? "green" : "gray"}>{child.status}</Badge>
                    </td>
                    <td className="p-4 text-sm text-gray-900 dark:text-white">{child.location_count}</td>
                    <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{child.last_sync_at}</td>
                    <td className="p-4">
                      <Badge color={child.sync_status === "synced" ? "green" : child.sync_status === "pending" ? "yellow" : "red"}>
                        {child.sync_status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button variant="secondary" size="sm" onClick={() => handleSyncNow(child.id)}>
                          <RefreshCw className="w-3 h-3" />
                          Sync
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                          <Unlink className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "sync_config" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sync Settings</h3>
            <div className="space-y-4">
              {[
                { key: "sync_categories", label: "Sync Categories", desc: "Push category structure to children" },
                { key: "sync_products", label: "Sync Products", desc: "Push product catalog to children" },
                { key: "sync_promotions", label: "Sync Promotions", desc: "Push promotions and discounts to children" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setSyncConfig(c => ({ ...c, [item.key]: !c[item.key as keyof typeof c] }))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${syncConfig[item.key as keyof typeof syncConfig] ? "bg-gray-900 dark:bg-white" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ left: syncConfig[item.key as keyof typeof syncConfig] ? "calc(100% - 22px)" : "2px" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">TVA Override Mode</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="tva_mode"
                  checked={syncConfig.tva_override_mode === "use_parent"}
                  onChange={() => setSyncConfig(c => ({ ...c, tva_override_mode: "use_parent" }))}
                  className="mt-1 text-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Use Parent TVA</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Children will use the parent&apos;s TVA rates</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="tva_mode"
                  checked={syncConfig.tva_override_mode === "let_child_keep"}
                  onChange={() => setSyncConfig(c => ({ ...c, tva_override_mode: "let_child_keep" }))}
                  className="mt-1 text-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Let Child Keep Own TVA</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">TVA rate is set to NULL on sync; child&apos;s own rate applies</p>
                </div>
              </label>
            </div>
            {/* TVA Info Box */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  When syncing products, the child&apos;s TVA rate is set to NULL — the child business applies its own local TVA rate.
                  This is required by Moroccan tax law for multi-entity structures.
                </p>
              </div>
            </div>
          </div>
          
          <Button variant="primary">
            <Check className="w-4 h-4" />
            Save Config
          </Button>
        </div>
      )}

      {activeTab === "unmapped" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Products at child stores with no parent mapping
            </p>
            <Button variant="secondary">
              <ArrowUpRight className="w-4 h-4" />
              Pull All
            </Button>
          </div>
          
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Child Business</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Child SKU</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {mockUnmappedProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">{product.product_name}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{product.child_business_name}</td>
                    <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{product.child_sku}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm">Map to Parent</Button>
                        <Button variant="ghost" size="sm">
                          <ArrowUpRight className="w-3 h-3" />
                          Pull
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRevenue.toLocaleString()} MAD</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            </div>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTransactions}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
            </div>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgOrderValue.toFixed(0)} MAD</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Order Value</p>
            </div>
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">Casablanca</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Best Performing</p>
            </div>
          </div>

          {/* Revenue by Store */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue by Store</h3>
            <div className="space-y-4">
              {mockChildBusinesses.filter(c => c.status === "active").map(child => {
                const revenue = Math.floor(Math.random() * 50000) + 10000
                const maxRevenue = 60000
                return (
                  <div key={child.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{child.name}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{revenue.toLocaleString()} MAD</span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-[#0F0F12] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full"
                        style={{ width: `${(revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "transactions" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
            <div className="flex items-center gap-4">
              <select
                value={childFilter}
                onChange={(e) => setChildFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="all">All Stores</option>
                {mockChildBusinesses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input type="date" className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
              <input type="date" className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
              <Button variant="secondary">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
          
          {/* Transactions Table */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Store</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Terminal</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {mockTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{tx.date}</td>
                    <td className="p-4 text-sm text-gray-900 dark:text-white">{tx.child_business_name}</td>
                    <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{tx.terminal}</td>
                    <td className="p-4 font-semibold text-gray-900 dark:text-white">{tx.amount} MAD</td>
                    <td className="p-4">
                      <Badge color={tx.payment_method === "cash" ? "green" : tx.payment_method === "card" ? "blue" : "purple"}>
                        {tx.payment_method}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge color={tx.status === "completed" ? "green" : tx.status === "refunded" ? "red" : "yellow"}>
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "po_requests" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Incoming purchase orders from child stores
          </p>
          
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">PO Number</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Requesting Store</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Products</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {mockPORequests.map(po => (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                    <td className="p-4 font-mono text-sm text-blue-600 dark:text-blue-400">{po.po_number}</td>
                    <td className="p-4 text-sm text-gray-900 dark:text-white">{po.requesting_business}</td>
                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{po.products_summary}</td>
                    <td className="p-4 font-semibold text-gray-900 dark:text-white">{po.total_ttc.toLocaleString()} MAD</td>
                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{po.requested_date}</td>
                    <td className="p-4">
                      <Badge color={po.status === "fulfilled" ? "green" : po.status === "pending" ? "yellow" : "red"}>
                        {po.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {po.status === "pending" && (
                        <Button variant="primary" size="sm" onClick={() => handleFulfillPO(po)}>
                          <Check className="w-3 h-3" />
                          Fulfill
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Link Child Modal */}
      <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="Link Child Business" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business ID</label>
            <input
              type="text"
              placeholder="Enter business ID to link..."
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowLinkModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowLinkModal(false)}>
              <Link2 className="w-4 h-4" />
              Link Business
            </Button>
          </div>
        </div>
      </Modal>

      {/* Fulfill PO Modal */}
      <Modal isOpen={showFulfillModal} onClose={() => setShowFulfillModal(false)} title="Fulfill Purchase Order" size="lg">
        {selectedPO && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
              <p className="font-mono text-sm text-blue-600 dark:text-blue-400">{selectedPO.po_number}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">From: {selectedPO.requesting_business}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Items to fulfill:</h4>
              <div className="p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedPO.products_summary}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fulfill from Warehouse</label>
              <select className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                <option>Main Warehouse - Casablanca</option>
                <option>Central Storage - Rabat</option>
              </select>
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Stock will be deducted from selected warehouse after fulfillment.
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowFulfillModal(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={() => setShowFulfillModal(false)}>
                <Check className="w-4 h-4" />
                Confirm Fulfillment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}



