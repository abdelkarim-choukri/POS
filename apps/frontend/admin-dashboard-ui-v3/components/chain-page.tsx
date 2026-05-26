"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  Megaphone,
  Truck,
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
import { apiFetch } from "@/lib/api"

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

interface AccessibleBusiness {
  id: string
  name: string
  owner_email?: string
}

interface SyncConfig {
  sync_products: boolean
  sync_promotions: boolean
  sync_prices: boolean
  auto_sync_interval_hours: number
}

interface ChainDashboard {
  total_revenue: number
  total_transactions: number
  by_location: Array<{ id: string; name: string; revenue: number; transactions: number }>
}

interface ParentVendorInfo {
  id: string
  name: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  payment_terms_days?: number
}

interface ChainTreeNode {
  id: string
  name: string
  chain_role: ChainRole
  children?: ChainTreeNode[]
}

interface SyncJobStatus {
  id: string
  status: "pending" | "active" | "completed" | "failed"
  result_json?: { synced?: number; failed?: number; errors?: string[] }
}

interface PromotionValidation {
  valid: boolean
  issues: Array<{ child_business_id: string; child_business_name: string; issue: string }>
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
  const [chainRole] = useState<ChainRole>("parent")
  const [activeTab, setActiveTab] = useState<"stores" | "sync_config" | "unmapped" | "dashboard" | "transactions" | "po_requests" | "vendor_info" | "promotions">("stores")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissions] = useState<UserPermissions>(mockUserPermissions)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGINATION.defaultPageSize)

  // Modals
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showFulfillModal, setShowFulfillModal] = useState(false)
  const [showRolloutModal, setShowRolloutModal] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PORequest | null>(null)
  const [showChainTreeModal, setShowChainTreeModal] = useState(false)

  // Filters
  const [childFilter, setChildFilter] = useState("all")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })

  // Data state — all real API data
  const [dashboardStats, setDashboardStats] = useState<ChainDashboard | null>(null)
  const [accessibleBusinesses, setAccessibleBusinesses] = useState<AccessibleBusiness[]>([])
  const [poRequests, setPoRequests] = useState<PORequest[]>([])
  const [unmappedProducts, setUnmappedProducts] = useState<UnmappedProduct[]>([])
  const [chainTransactions, setChainTransactions] = useState<ChainTransaction[]>([])
  const [transactionsTotal, setTransactionsTotal] = useState(0)
  const [parentVendorInfo, setParentVendorInfo] = useState<ParentVendorInfo | null>(null)
  const [chainTree, setChainTree] = useState<ChainTreeNode | null>(null)

  // Sync config state
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    sync_products: true,
    sync_promotions: false,
    sync_prices: false,
    auto_sync_interval_hours: 24,
  })
  const [syncConfigLoading, setSyncConfigLoading] = useState(false)
  const [syncConfigError, setSyncConfigError] = useState<string | null>(null)
  const [syncConfigSaving, setSyncConfigSaving] = useState(false)

  // Per-action loading/error state
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncAllError, setSyncAllError] = useState<string | null>(null)
  const [syncJobId, setSyncJobId] = useState<string | null>(null)
  const [syncJobStatus, setSyncJobStatus] = useState<SyncJobStatus | null>(null)
  const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [unmappedLoading, setUnmappedLoading] = useState(false)
  const [unmappedError, setUnmappedError] = useState<string | null>(null)
  const [pullingProduct, setPullingProduct] = useState<string | null>(null)
  const [pullError, setPullError] = useState<string | null>(null)
  const [fulfilling, setFulfilling] = useState(false)
  const [fulfillError, setFulfillError] = useState<string | null>(null)
  const [fulfillWarehouseId, setFulfillWarehouseId] = useState("")
  const [switchingBusiness, setSwitchingBusiness] = useState<string | null>(null)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  // Parent vendor info state
  const [vendorInfoLoading, setVendorInfoLoading] = useState(false)
  const [vendorInfoError, setVendorInfoError] = useState<string | null>(null)

  // Promotions tab state
  const [promotionId, setPromotionId] = useState("")
  const [validateLoading, setValidateLoading] = useState(false)
  const [validateResult, setValidateResult] = useState<PromotionValidation | null>(null)
  const [validateError, setValidateError] = useState<string | null>(null)
  const [rolloutLoading, setRolloutLoading] = useState(false)
  const [rolloutError, setRolloutError] = useState<string | null>(null)
  const [rolloutSuccess, setRolloutSuccess] = useState<string | null>(null)

  // Chain tree (super admin) state
  const [chainTreeLoading, setChainTreeLoading] = useState(false)
  const [chainTreeError, setChainTreeError] = useState<string | null>(null)

  // Link child modal state
  const [linkChildId, setLinkChildId] = useState("")
  const [linkParentId, setLinkParentId] = useState("")
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Unlink state
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [unlinkError, setUnlinkError] = useState<string | null>(null)

  // Promote to parent state (standalone view)
  const [promotingToParent, setPromotingToParent] = useState(false)
  const [promoteError, setPromoteError] = useState<string | null>(null)

  // Grant access state
  const [grantUserId, setGrantUserId] = useState("")
  const [grantBusinessId, setGrantBusinessId] = useState("")
  const [grantRole, setGrantRole] = useState("manager")
  const [grantLoading, setGrantLoading] = useState(false)
  const [grantError, setGrantError] = useState<string | null>(null)
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null)
  const [showGrantModal, setShowGrantModal] = useState(false)

  // Permission checks
  const canPromoteToParent = permissions.role === "owner"
  const canRolloutToChain = chainRole === "parent"
  const canFulfillPO = chainRole === "parent"

  // ── Mount-time fetches ─────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (dateRange.start) params.set("from_date", dateRange.start)
      if (dateRange.end) params.set("to_date", dateRange.end)
      const qs = params.toString()
      const data = await apiFetch<ChainDashboard>(`/api/business/chain/dashboard${qs ? `?${qs}` : ""}`)
      setDashboardStats(data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load chain dashboard")
    }
  }, [dateRange.start, dateRange.end])

  const fetchAccessibleBusinesses = useCallback(async () => {
    try {
      const data = await apiFetch<AccessibleBusiness[]>("/api/auth/me/accessible-businesses")
      setAccessibleBusinesses(data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load accessible businesses")
    }
  }, [])

  const fetchPoRequests = useCallback(async () => {
    try {
      const data = await apiFetch<PORequest[]>("/api/business/chain/incoming-po-requests")
      setPoRequests(data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load PO requests")
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      fetchDashboard(),
      fetchAccessibleBusinesses(),
      fetchPoRequests(),
    ]).finally(() => setIsLoading(false))
  }, [fetchDashboard, fetchAccessibleBusinesses, fetchPoRequests])

  // ── Transactions fetch (on tab open or filter change) ─────────────────────

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true)
    setTxError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(currentPage))
      params.set("limit", String(pageSize))
      if (childFilter !== "all") params.set("location_id", childFilter)
      const data = await apiFetch<{ data: ChainTransaction[]; total: number }>(
        `/api/business/chain/transactions?${params.toString()}`
      )
      setChainTransactions(data.data)
      setTransactionsTotal(data.total)
    } catch (e: any) {
      setTxError(e.message ?? "Failed to load transactions")
    } finally {
      setTxLoading(false)
    }
  }, [currentPage, pageSize, childFilter])

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions()
    }
  }, [activeTab, fetchTransactions])

  // ── Sync config fetch (when tab opens) ────────────────────────────────────

  const fetchSyncConfig = useCallback(async () => {
    setSyncConfigLoading(true)
    setSyncConfigError(null)
    try {
      const data = await apiFetch<SyncConfig>("/api/business/chain/sync-config")
      setSyncConfig(data)
    } catch (e: any) {
      setSyncConfigError(e.message ?? "Failed to load sync config")
    } finally {
      setSyncConfigLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "sync_config") {
      fetchSyncConfig()
    }
  }, [activeTab, fetchSyncConfig])

  // ── Unmapped products fetch (when tab opens) ───────────────────────────────

  const fetchUnmappedProducts = useCallback(async () => {
    setUnmappedLoading(true)
    setUnmappedError(null)
    try {
      const data = await apiFetch<UnmappedProduct[]>("/api/business/chain/unmapped-products")
      setUnmappedProducts(data)
    } catch (e: any) {
      setUnmappedError(e.message ?? "Failed to load unmapped products")
    } finally {
      setUnmappedLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "unmapped") {
      fetchUnmappedProducts()
    }
  }, [activeTab, fetchUnmappedProducts])

  // ── Parent vendor info fetch (when tab opens) ──────────────────────────────

  const fetchParentVendorInfo = useCallback(async () => {
    setVendorInfoLoading(true)
    setVendorInfoError(null)
    try {
      const data = await apiFetch<ParentVendorInfo>("/api/business/chain/parent-vendor-info")
      setParentVendorInfo(data)
    } catch (e: any) {
      setVendorInfoError(e.message ?? "Failed to load parent vendor info")
    } finally {
      setVendorInfoLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "vendor_info") {
      fetchParentVendorInfo()
    }
  }, [activeTab, fetchParentVendorInfo])

  // ── Sync job polling ───────────────────────────────────────────────────────

  const pollSyncJob = useCallback(async (jobId: string) => {
    try {
      const data = await apiFetch<SyncJobStatus>(`/api/business/chain/sync-jobs/${jobId}`)
      setSyncJobStatus(data)
      if (data.status === "completed" || data.status === "failed") {
        if (syncPollRef.current) {
          clearInterval(syncPollRef.current)
          syncPollRef.current = null
        }
      }
    } catch {
      // swallow poll errors silently — stop polling on persistent failure
      if (syncPollRef.current) {
        clearInterval(syncPollRef.current)
        syncPollRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (syncPollRef.current) clearInterval(syncPollRef.current)
    }
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  // #16 — POST /api/super/businesses/:id/promote-to-parent
  const handlePromoteToParent = async () => {
    if (!canPromoteToParent) return
    const businessId = typeof localStorage !== "undefined" ? localStorage.getItem("dash_business_id") : null
    if (!businessId) {
      setPromoteError("Cannot determine current business ID")
      return
    }
    setPromotingToParent(true)
    setPromoteError(null)
    try {
      await apiFetch(`/api/super/businesses/${businessId}/promote-to-parent`, { method: "POST" })
      alert("Business promoted to chain parent. Please reload to see the updated view.")
      window.location.reload()
    } catch (e: any) {
      setPromoteError(e.message ?? "Failed to promote to parent")
    } finally {
      setPromotingToParent(false)
    }
  }

  // #5 — POST /api/business/chain/sync + #6 — poll job status
  const handleSyncNow = async (childId: string) => {
    setSyncAllError(null)
    setSyncingAll(true)
    setSyncJobId(null)
    setSyncJobStatus(null)
    try {
      const data = await apiFetch<{ job_id: string }>("/api/business/chain/sync", {
        method: "POST",
        body: JSON.stringify({ child_business_ids: [childId] }),
      })
      setSyncJobId(data.job_id)
      alert(`Sync initiated for child: ${childId}. Job ID: ${data.job_id}`)
      // Start polling job status (#6)
      if (syncPollRef.current) clearInterval(syncPollRef.current)
      syncPollRef.current = setInterval(() => pollSyncJob(data.job_id), 3000)
    } catch (e: any) {
      setSyncAllError(e.message ?? "Failed to trigger sync")
    } finally {
      setSyncingAll(false)
    }
  }

  const handleSyncAll = async () => {
    setSyncAllError(null)
    setSyncingAll(true)
    setSyncJobId(null)
    setSyncJobStatus(null)
    try {
      const data = await apiFetch<{ job_id: string }>("/api/business/chain/sync", {
        method: "POST",
        body: JSON.stringify({}),
      })
      setSyncJobId(data.job_id)
      alert(`Sync All initiated. Job ID: ${data.job_id}`)
      // Start polling job status (#6)
      if (syncPollRef.current) clearInterval(syncPollRef.current)
      syncPollRef.current = setInterval(() => pollSyncJob(data.job_id), 3000)
    } catch (e: any) {
      setSyncAllError(e.message ?? "Failed to trigger sync all")
    } finally {
      setSyncingAll(false)
    }
  }

  // #4 — PUT /api/business/chain/sync-config
  const handleSaveSyncConfig = async () => {
    setSyncConfigSaving(true)
    setSyncConfigError(null)
    try {
      const updated = await apiFetch<SyncConfig>("/api/business/chain/sync-config", {
        method: "PUT",
        body: JSON.stringify({
          sync_products: syncConfig.sync_products,
          sync_categories: syncConfig.sync_prices, // mapped from UI "sync_prices" field
          sync_promotions: syncConfig.sync_promotions,
          auto_sync: syncConfig.auto_sync_interval_hours > 0,
        }),
      })
      setSyncConfig(updated)
    } catch (e: any) {
      setSyncConfigError(e.message ?? "Failed to save sync config")
    } finally {
      setSyncConfigSaving(false)
    }
  }

  // #8 — POST /api/business/chain/pull-product
  const handlePullProduct = async (parentProductId: string) => {
    setPullingProduct(parentProductId)
    setPullError(null)
    try {
      await apiFetch("/api/business/chain/pull-product", {
        method: "POST",
        body: JSON.stringify({ parent_product_id: parentProductId }),
      })
      await fetchUnmappedProducts()
    } catch (e: any) {
      setPullError(e.message ?? "Failed to pull product")
    } finally {
      setPullingProduct(null)
    }
  }

  // #13 — POST /api/business/chain/incoming-po-requests/:id/fulfill
  const handleFulfillPO = (po: PORequest) => {
    setSelectedPO(po)
    setFulfillWarehouseId("")
    setFulfillError(null)
    setShowFulfillModal(true)
  }

  const handleConfirmFulfill = async () => {
    if (!selectedPO) return
    if (!fulfillWarehouseId.trim()) {
      setFulfillError("Please enter a warehouse ID")
      return
    }
    setFulfilling(true)
    setFulfillError(null)
    try {
      await apiFetch(`/api/business/chain/incoming-po-requests/${selectedPO.id}/fulfill`, {
        method: "POST",
        body: JSON.stringify({ source_warehouse_id: fulfillWarehouseId }),
      })
      setShowFulfillModal(false)
      setSelectedPO(null)
      await fetchPoRequests()
    } catch (e: any) {
      setFulfillError(e.message ?? "Failed to fulfill PO")
    } finally {
      setFulfilling(false)
    }
  }

  const handleSwitchBusiness = async (businessId: string) => {
    setSwitchingBusiness(businessId)
    setSwitchError(null)
    try {
      const data = await apiFetch<{ token: string }>("/api/auth/switch-business", {
        method: "POST",
        body: JSON.stringify({ business_id: businessId }),
      })
      localStorage.setItem("dashboard_jwt", data.token)
      window.location.reload()
    } catch (e: any) {
      setSwitchError(e.message ?? "Failed to switch business")
    } finally {
      setSwitchingBusiness(null)
    }
  }

  // #17 — POST /api/super/businesses/:child_id/link-parent
  const handleLinkChild = async () => {
    if (!linkChildId.trim() || !linkParentId.trim()) {
      setLinkError("Both child business ID and parent business ID are required")
      return
    }
    setLinkLoading(true)
    setLinkError(null)
    try {
      await apiFetch(`/api/super/businesses/${linkChildId}/link-parent`, {
        method: "POST",
        body: JSON.stringify({ parent_id: linkParentId }),
      })
      setShowLinkModal(false)
      setLinkChildId("")
      setLinkParentId("")
      await fetchAccessibleBusinesses()
    } catch (e: any) {
      setLinkError(e.message ?? "Failed to link child business")
    } finally {
      setLinkLoading(false)
    }
  }

  // #18 — POST /api/super/businesses/:child_id/unlink-parent
  const handleUnlinkBusiness = async (childId: string) => {
    if (!confirm("Are you sure you want to unlink this business from the chain?")) return
    setUnlinkingId(childId)
    setUnlinkError(null)
    try {
      await apiFetch(`/api/super/businesses/${childId}/unlink-parent`, { method: "POST" })
      await fetchAccessibleBusinesses()
    } catch (e: any) {
      setUnlinkError(e.message ?? "Failed to unlink business")
    } finally {
      setUnlinkingId(null)
    }
  }

  // #15 — GET /api/super/businesses/chain-tree
  const handleLoadChainTree = async () => {
    setChainTreeLoading(true)
    setChainTreeError(null)
    setShowChainTreeModal(true)
    try {
      const data = await apiFetch<ChainTreeNode>("/api/super/businesses/chain-tree")
      setChainTree(data)
    } catch (e: any) {
      setChainTreeError(e.message ?? "Failed to load chain tree")
    } finally {
      setChainTreeLoading(false)
    }
  }

  // #9 — POST /api/business/promotions/:id/validate-sub-stores
  const handleValidatePromotion = async () => {
    if (!promotionId.trim()) {
      setValidateError("Please enter a promotion ID")
      return
    }
    setValidateLoading(true)
    setValidateError(null)
    setValidateResult(null)
    try {
      const data = await apiFetch<PromotionValidation>(
        `/api/business/promotions/${promotionId}/validate-sub-stores`,
        { method: "POST", body: JSON.stringify({}) }
      )
      setValidateResult(data)
    } catch (e: any) {
      setValidateError(e.message ?? "Failed to validate promotion")
    } finally {
      setValidateLoading(false)
    }
  }

  // #10 — POST /api/business/promotions/:id/rollout-to-children
  const handleRolloutPromotion = async () => {
    if (!promotionId.trim()) {
      setRolloutError("Please enter a promotion ID")
      return
    }
    setRolloutLoading(true)
    setRolloutError(null)
    setRolloutSuccess(null)
    try {
      const body: Record<string, unknown> = {}
      // If we have validation results we can pass specific child IDs that passed validation
      if (validateResult && validateResult.issues.length > 0) {
        const failedIds = new Set(validateResult.issues.map(i => i.child_business_id))
        const passingIds = accessibleBusinesses
          .map(b => b.id)
          .filter(id => !failedIds.has(id))
        if (passingIds.length > 0) body.child_business_ids = passingIds
      }
      await apiFetch(`/api/business/promotions/${promotionId}/rollout-to-children`, {
        method: "POST",
        body: JSON.stringify(body),
      })
      setRolloutSuccess("Promotion rolled out to child stores successfully.")
    } catch (e: any) {
      setRolloutError(e.message ?? "Failed to rollout promotion")
    } finally {
      setRolloutLoading(false)
    }
  }

  // #14 — POST /api/business/users/:id/grant-business-access
  const handleGrantAccess = async () => {
    if (!grantUserId.trim() || !grantBusinessId.trim()) {
      setGrantError("User ID and business ID are required")
      return
    }
    setGrantLoading(true)
    setGrantError(null)
    setGrantSuccess(null)
    try {
      await apiFetch(`/api/business/users/${grantUserId}/grant-business-access`, {
        method: "POST",
        body: JSON.stringify({ business_id: grantBusinessId, role: grantRole }),
      })
      setGrantSuccess("Access granted successfully.")
      setGrantUserId("")
      setGrantBusinessId("")
      setGrantRole("manager")
    } catch (e: any) {
      setGrantError(e.message ?? "Failed to grant business access")
    } finally {
      setGrantLoading(false)
    }
  }

  // Derived stats from real dashboard data
  const totalRevenue = dashboardStats?.total_revenue ?? 0
  const totalTransactions = dashboardStats?.total_transactions ?? 0
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  const bestLocation = dashboardStats?.by_location?.length
    ? dashboardStats.by_location.reduce((a, b) => (b.revenue > a.revenue ? b : a)).name
    : "—"

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
          {promoteError && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {promoteError}
            </p>
          )}
          <Button
            variant="primary"
            onClick={handlePromoteToParent}
            disabled={!canPromoteToParent || promotingToParent}
            title={!canPromoteToParent ? LABELS.permissions.promoteToParent : undefined}
          >
            {promotingToParent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            {promotingToParent ? "Promoting..." : LABELS.promoteToParent}
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
              <p className="text-sm text-blue-700 dark:text-blue-400">Connected to chain</p>
            </div>
          </div>
        </div>

        {/* Business Switcher */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Business Switcher
          </h3>
          {switchError && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {switchError}
            </p>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {accessibleBusinesses.map(biz => (
                <div key={biz.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{biz.name}</p>
                      {biz.owner_email && <p className="text-xs text-gray-500 dark:text-gray-400">{biz.owner_email}</p>}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={switchingBusiness === biz.id}
                    onClick={() => handleSwitchBusiness(biz.id)}
                  >
                    {switchingBusiness === biz.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                    Switch
                  </Button>
                </div>
              ))}
              {accessibleBusinesses.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No accessible businesses found.</p>
              )}
            </div>
          )}
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Warning: Switching will re-issue your session token for the selected business.
          </p>
        </div>
      </div>
    )
  }

  // ============== PARENT VIEW ==============

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chain Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your chain of stores</p>
        </div>
        <div className="flex items-center gap-3">
          {syncAllError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {syncAllError}
            </p>
          )}
          <Button variant="secondary" onClick={handleLoadChainTree} size="sm">
            <Eye className="w-4 h-4" />
            Chain Tree
          </Button>
          <Button variant="secondary" onClick={() => setShowGrantModal(true)} size="sm">
            <Users className="w-4 h-4" />
            Grant Access
          </Button>
          <Button variant="secondary" onClick={handleSyncAll} disabled={syncingAll}>
            <RefreshCw className={`w-4 h-4 ${syncingAll ? "animate-spin" : ""}`} />
            Sync All
          </Button>
        </div>
      </div>

      {/* Sync job status banner */}
      {syncJobId && syncJobStatus && (
        <div className={`mb-4 p-3 rounded-lg border text-sm flex items-center gap-2 ${
          syncJobStatus.status === "completed"
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
            : syncJobStatus.status === "failed"
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
        }`}>
          {syncJobStatus.status === "completed" ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : syncJobStatus.status === "failed" ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
          )}
          <span>
            Sync job <span className="font-mono">{syncJobId.slice(0, 8)}…</span>
            {" — "}{syncJobStatus.status}
            {syncJobStatus.result_json && syncJobStatus.status === "completed" && (
              ` (${syncJobStatus.result_json.synced ?? 0} synced, ${syncJobStatus.result_json.failed ?? 0} failed)`
            )}
          </span>
          <button
            className="ml-auto text-xs opacity-60 hover:opacity-100"
            onClick={() => { setSyncJobId(null); setSyncJobStatus(null) }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Global error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {error}
          </p>
        </div>
      )}

      {/* Parent Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <Link2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-green-900 dark:text-green-300">Chain Parent</p>
            <p className="text-sm text-green-700 dark:text-green-400">
              {accessibleBusinesses.length > 0 ? `${accessibleBusinesses.length} accessible businesses` : "Managing chain"}
            </p>
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
          { id: "vendor_info", label: "Parent Vendor", icon: Truck },
          { id: "promotions", label: "Promotions Rollout", icon: Megaphone },
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
            {tab.id === "unmapped" && unmappedProducts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">
                {unmappedProducts.length}
              </span>
            )}
            {tab.id === "po_requests" && poRequests.filter(p => p.status === "pending").length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs rounded-full">
                {poRequests.filter(p => p.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Stores ── */}
      {activeTab === "stores" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Linked Stores</h3>
            <Button variant="primary" onClick={() => setShowLinkModal(true)}>
              <Plus className="w-4 h-4" />
              Link Child Business
            </Button>
          </div>

          {unlinkError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {unlinkError}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            {isLoading ? (
              <table className="w-full">
                <tbody>{[1, 2, 3].map(i => <StoreRowSkeleton key={i} />)}</tbody>
              </table>
            ) : accessibleBusinesses.length === 0 ? (
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
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {accessibleBusinesses.map(biz => (
                    <tr key={biz.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{biz.name}</p>
                          {biz.owner_email && <p className="text-xs text-gray-500 dark:text-gray-400">{biz.owner_email}</p>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button variant="secondary" size="sm" disabled={syncingAll} onClick={() => handleSyncNow(biz.id)}>
                            <RefreshCw className={`w-3 h-3 ${syncingAll ? "animate-spin" : ""}`} />
                            Sync
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={unlinkingId === biz.id}
                            onClick={() => handleUnlinkBusiness(biz.id)}
                            title="Unlink from chain (super admin)"
                          >
                            {unlinkingId === biz.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
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

      {/* ── Tab: Sync Config ── */}
      {activeTab === "sync_config" && (
        <div className="space-y-6">
          {syncConfigError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {syncConfigError}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sync Settings</h3>
            {syncConfigLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { key: "sync_products" as keyof SyncConfig, label: "Sync Products", desc: "Push product catalog to children" },
                  { key: "sync_promotions" as keyof SyncConfig, label: "Sync Promotions", desc: "Push promotions and discounts to children" },
                  { key: "sync_prices" as keyof SyncConfig, label: "Sync Prices", desc: "Push pricing changes to children" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setSyncConfig(c => ({ ...c, [item.key]: !c[item.key] }))}
                      className={`w-11 h-6 rounded-full transition-colors relative ${syncConfig[item.key] ? "bg-gray-900 dark:bg-white" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ left: syncConfig[item.key] ? "calc(100% - 22px)" : "2px" }} />
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Auto-Sync Interval (hours)</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">How often to automatically sync children</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={syncConfig.auto_sync_interval_hours}
                    onChange={e => setSyncConfig(c => ({ ...c, auto_sync_interval_hours: Number(e.target.value) }))}
                    className="w-20 px-2 py-1 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white text-right"
                  />
                </div>
              </div>
            )}
          </div>

          {/* TVA Info Box */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  When syncing products, the child&apos;s TVA rate is set to NULL — the child business applies its own local TVA rate.
                  This is required by Moroccan tax law for multi-entity structures.
                </p>
              </div>
            </div>
          </div>

          <Button variant="primary" onClick={handleSaveSyncConfig} disabled={syncConfigSaving || syncConfigLoading}>
            {syncConfigSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {syncConfigSaving ? "Saving..." : "Save Config"}
          </Button>
        </div>
      )}

      {/* ── Tab: Unmapped Products ── */}
      {activeTab === "unmapped" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Products at child stores with no parent mapping
            </p>
            <Button variant="secondary" disabled={unmappedLoading} onClick={fetchUnmappedProducts}>
              <RefreshCw className={`w-4 h-4 ${unmappedLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {unmappedError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {unmappedError}
              </p>
            </div>
          )}

          {pullError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {pullError}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            {unmappedLoading ? (
              <table className="w-full">
                <tbody>
                  {[1, 2, 3].map(i => (
                    <tr key={i} className="border-b border-gray-100 dark:border-[#1F1F23]">
                      <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-20 rounded-lg" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : unmappedProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No unmapped products found.</p>
              </div>
            ) : (
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
                  {unmappedProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                      <td className="p-4 font-medium text-gray-900 dark:text-white">{product.product_name}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{product.child_business_name}</td>
                      <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{product.child_sku}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pullingProduct === product.id}
                            onClick={() => handlePullProduct(product.id)}
                          >
                            {pullingProduct === product.id
                              ? <RefreshCw className="w-3 h-3 animate-spin" />
                              : <ArrowUpRight className="w-3 h-3" />}
                            Pull
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

      {/* ── Tab: Dashboard ── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <StatsCardSkeleton key={i} />)
            ) : (
              <>
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{bestLocation}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Best Performing</p>
                </div>
              </>
            )}
          </div>

          {/* Revenue by Store */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue by Store</h3>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
              </div>
            ) : dashboardStats?.by_location && dashboardStats.by_location.length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  const maxRevenue = Math.max(...dashboardStats.by_location.map(l => l.revenue), 1)
                  return dashboardStats.by_location.map(loc => (
                    <div key={loc.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{loc.name}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{loc.revenue.toLocaleString()} MAD</span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-[#0F0F12] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full"
                          style={{ width: `${(loc.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No location data available.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Transactions ── */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
            <div className="flex items-center gap-4">
              <select
                value={childFilter}
                onChange={(e) => { setChildFilter(e.target.value); setCurrentPage(1) }}
                className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="all">All Stores</option>
                {accessibleBusinesses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
              <Button variant="secondary" onClick={fetchTransactions} disabled={txLoading}>
                <RefreshCw className={`w-4 h-4 ${txLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {txError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {txError}
              </p>
            </div>
          )}

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
                {txLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="border-b border-gray-100 dark:border-[#1F1F23]">
                      {[1, 2, 3, 4, 5, 6].map(j => (
                        <td key={j} className="p-4"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : chainTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  chainTransactions.map(tx => (
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
                  ))
                )}
              </tbody>
            </table>
            {/* Pagination */}
            {transactionsTotal > pageSize && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-[#1F1F23]">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {transactionsTotal} total
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage}</span>
                  <Button variant="secondary" size="sm" disabled={currentPage * pageSize >= transactionsTotal} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: PO Requests ── */}
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
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="border-b border-gray-100 dark:border-[#1F1F23]">
                      {[1, 2, 3, 4, 5, 6, 7].map(j => (
                        <td key={j} className="p-4"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : poRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                      No PO requests found.
                    </td>
                  </tr>
                ) : (
                  poRequests.map(po => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Parent Vendor Info ── */}
      {activeTab === "vendor_info" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vendor details for your parent chain supplier
            </p>
            <Button variant="secondary" disabled={vendorInfoLoading} onClick={fetchParentVendorInfo}>
              <RefreshCw className={`w-4 h-4 ${vendorInfoLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {vendorInfoError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {vendorInfoError}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            {vendorInfoLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-6 w-full rounded" />)}
              </div>
            ) : parentVendorInfo ? (
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor Name</dt>
                  <dd className="text-sm text-gray-900 dark:text-white font-medium">{parentVendorInfo.name}</dd>
                </div>
                {parentVendorInfo.contact_name && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{parentVendorInfo.contact_name}</dd>
                  </div>
                )}
                {parentVendorInfo.contact_email && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{parentVendorInfo.contact_email}</dd>
                  </div>
                )}
                {parentVendorInfo.contact_phone && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{parentVendorInfo.contact_phone}</dd>
                  </div>
                )}
                {parentVendorInfo.address && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{parentVendorInfo.address}</dd>
                  </div>
                )}
                {parentVendorInfo.payment_terms_days != null && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Terms</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{parentVendorInfo.payment_terms_days} days</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No parent vendor info available.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Promotions Rollout ── */}
      {activeTab === "promotions" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Validate &amp; Roll Out Promotion to Children</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Promotion ID
                </label>
                <input
                  type="text"
                  value={promotionId}
                  onChange={e => {
                    setPromotionId(e.target.value)
                    setValidateResult(null)
                    setValidateError(null)
                    setRolloutSuccess(null)
                    setRolloutError(null)
                  }}
                  placeholder="Enter promotion UUID..."
                  className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                {/* #9 — Validate */}
                <Button
                  variant="secondary"
                  onClick={handleValidatePromotion}
                  disabled={validateLoading || !promotionId.trim()}
                >
                  {validateLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Validate Sub-Stores
                </Button>
                {/* #10 — Rollout */}
                <Button
                  variant="primary"
                  onClick={handleRolloutPromotion}
                  disabled={rolloutLoading || !promotionId.trim()}
                >
                  {rolloutLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  Roll Out to Children
                </Button>
              </div>

              {validateError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {validateError}
                </p>
              )}
              {rolloutError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {rolloutError}
                </p>
              )}
              {rolloutSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  <Check className="w-3 h-3 inline mr-1" />
                  {rolloutSuccess}
                </p>
              )}
            </div>

            {/* Validation results */}
            {validateResult && (
              <div className="mt-6">
                {validateResult.valid ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      All sub-stores passed validation. Safe to roll out.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {validateResult.issues.length} sub-store(s) have TVA issues
                    </p>
                    <div className="space-y-2">
                      {validateResult.issues.map((issue, idx) => (
                        <div key={idx} className="text-xs text-amber-700 dark:text-amber-400 pl-2 border-l-2 border-amber-400">
                          <span className="font-medium">{issue.child_business_name}:</span> {issue.issue}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                      Rolling out will skip the stores with issues and apply to the remaining stores.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Link Child Modal ── */}
      <Modal isOpen={showLinkModal} onClose={() => { setShowLinkModal(false); setLinkError(null) }} title="Link Child Business" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Child Business ID</label>
            <input
              type="text"
              value={linkChildId}
              onChange={e => setLinkChildId(e.target.value)}
              placeholder="Enter child business UUID..."
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parent Business ID</label>
            <input
              type="text"
              value={linkParentId}
              onChange={e => setLinkParentId(e.target.value)}
              placeholder="Enter parent business UUID..."
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This action calls the super-admin endpoint and requires a super-admin JWT.
          </p>
          {linkError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {linkError}
            </p>
          )}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowLinkModal(false); setLinkError(null) }}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleLinkChild} disabled={linkLoading}>
              {linkLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Link Business
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Fulfill PO Modal ── */}
      <Modal isOpen={showFulfillModal} onClose={() => { setShowFulfillModal(false); setFulfillError(null) }} title="Fulfill Purchase Order" size="lg">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source Warehouse ID
              </label>
              <input
                type="text"
                value={fulfillWarehouseId}
                onChange={e => setFulfillWarehouseId(e.target.value)}
                placeholder="Enter warehouse ID..."
                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>

            {fulfillError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {fulfillError}
              </p>
            )}

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Stock will be deducted from selected warehouse after fulfillment.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowFulfillModal(false); setFulfillError(null) }}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleConfirmFulfill} disabled={fulfilling}>
                {fulfilling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {fulfilling ? "Fulfilling..." : "Confirm Fulfillment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Chain Tree Modal (super admin) ── */}
      <Modal isOpen={showChainTreeModal} onClose={() => setShowChainTreeModal(false)} title="Chain Tree" size="lg">
        <div className="min-h-[200px]">
          {chainTreeLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}
            </div>
          ) : chainTreeError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {chainTreeError}
            </p>
          ) : chainTree ? (
            <ChainTreeView node={chainTree} depth={0} />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No chain tree data.</p>
          )}
        </div>
      </Modal>

      {/* ── Grant Access Modal ── */}
      <Modal isOpen={showGrantModal} onClose={() => { setShowGrantModal(false); setGrantError(null); setGrantSuccess(null) }} title="Grant Business Access" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</label>
            <input
              type="text"
              value={grantUserId}
              onChange={e => setGrantUserId(e.target.value)}
              placeholder="Enter user UUID..."
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business ID</label>
            <input
              type="text"
              value={grantBusinessId}
              onChange={e => setGrantBusinessId(e.target.value)}
              placeholder="Enter business UUID..."
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              value={grantRole}
              onChange={e => setGrantRole(e.target.value)}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            >
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          {grantError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {grantError}
            </p>
          )}
          {grantSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              <Check className="w-3 h-3 inline mr-1" />
              {grantSuccess}
            </p>
          )}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowGrantModal(false); setGrantError(null); setGrantSuccess(null) }}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleGrantAccess} disabled={grantLoading}>
              {grantLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Grant Access
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Chain tree renderer (recursive) ──────────────────────────────────────────
function ChainTreeView({ node, depth }: { node: ChainTreeNode; depth: number }) {
  const roleColors: Record<ChainRole, string> = {
    parent: "text-green-600 dark:text-green-400",
    child: "text-blue-600 dark:text-blue-400",
    standalone: "text-gray-500 dark:text-gray-400",
  }
  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <div className="flex items-center gap-2 py-1.5">
        {depth > 0 && <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-900 dark:text-white font-medium">{node.name}</span>
        <span className={`text-xs ${roleColors[node.chain_role]}`}>({node.chain_role})</span>
      </div>
      {node.children?.map(child => (
        <ChainTreeView key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}
