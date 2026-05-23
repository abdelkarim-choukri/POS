"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  Plus,
  X,
  Monitor,
  MapPin,
  Wifi,
  WifiOff,
  AlertCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle,
  Building2,
  Zap,
  Activity,
  Settings,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DATE_FORMAT,
  PAGINATION,
  TERMINALS_LABELS as LABELS,
  COMMON_LABELS,
  PERMISSION_LABELS,
} from "@/lib/constants"

// ============== TYPES ==============
interface Terminal {
  id: string
  terminal_code: string
  name: string
  location_id: string | null
  location_name: string | null
  last_heartbeat_at: string | null
  firmware_version: string
  transactions_today: number
  is_assigned: boolean
}

interface Location {
  id: string
  name: string
  address: string
  online_count: number
  total_count: number
}

// User permissions simulation
interface UserPermissions {
  role: "cashier" | "manager" | "owner"
  can_force_sync: boolean
  can_reassign_terminals: boolean
}

const mockUserPermissions: UserPermissions = {
  role: "manager",
  can_force_sync: true,
  can_reassign_terminals: true,
}

// ============== MOCK DATA ==============
const mockLocations: Location[] = [
  { id: "loc-1", name: "Downtown Branch", address: "123 Mohammed V Blvd, Casablanca", online_count: 3, total_count: 3 },
  { id: "loc-2", name: "Marina Mall", address: "Marina Shopping Center, Level 2", online_count: 1, total_count: 2 },
  { id: "loc-3", name: "Airport Kiosk", address: "Terminal 1, Departure Hall", online_count: 0, total_count: 1 },
  { id: "loc-4", name: "Rabat Central", address: "45 Avenue Hassan II, Rabat", online_count: 2, total_count: 2 },
]

const mockTerminals: Terminal[] = [
  { id: "t1", terminal_code: "T-001-DT", name: "Main Counter", location_id: "loc-1", location_name: "Downtown Branch", last_heartbeat_at: "2024-03-15 14:32:15", firmware_version: "2.4.1", transactions_today: 67, is_assigned: true },
  { id: "t2", terminal_code: "T-002-DT", name: "Side Counter", location_id: "loc-1", location_name: "Downtown Branch", last_heartbeat_at: "2024-03-15 14:31:42", firmware_version: "2.4.1", transactions_today: 45, is_assigned: true },
  { id: "t3", terminal_code: "T-003-DT", name: "Drive-Through", location_id: "loc-1", location_name: "Downtown Branch", last_heartbeat_at: "2024-03-15 14:30:00", firmware_version: "2.4.0", transactions_today: 38, is_assigned: true },
  { id: "t4", terminal_code: "T-001-MM", name: "Kiosk 1", location_id: "loc-2", location_name: "Marina Mall", last_heartbeat_at: "2024-03-15 14:28:00", firmware_version: "2.4.1", transactions_today: 28, is_assigned: true },
  { id: "t5", terminal_code: "T-002-MM", name: "Kiosk 2", location_id: "loc-2", location_name: "Marina Mall", last_heartbeat_at: "2024-03-15 10:15:00", firmware_version: "2.3.8", transactions_today: 12, is_assigned: true },
  { id: "t6", terminal_code: "T-001-AP", name: "Airport POS", location_id: "loc-3", location_name: "Airport Kiosk", last_heartbeat_at: "2024-03-14 18:00:00", firmware_version: "2.3.9", transactions_today: 0, is_assigned: true },
  { id: "t7", terminal_code: "T-001-RB", name: "Main Register", location_id: "loc-4", location_name: "Rabat Central", last_heartbeat_at: "2024-03-15 14:33:00", firmware_version: "2.4.1", transactions_today: 52, is_assigned: true },
  { id: "t8", terminal_code: "T-002-RB", name: "Takeaway", location_id: "loc-4", location_name: "Rabat Central", last_heartbeat_at: "2024-03-15 14:32:45", firmware_version: "2.4.1", transactions_today: 33, is_assigned: true },
]

const mockUnassignedTerminals: Terminal[] = [
  { id: "t9", terminal_code: "T-SPARE-01", name: "Spare Unit 1", location_id: null, location_name: null, last_heartbeat_at: null, firmware_version: "2.4.1", transactions_today: 0, is_assigned: false },
  { id: "t10", terminal_code: "T-SPARE-02", name: "Spare Unit 2", location_id: null, location_name: null, last_heartbeat_at: "2024-03-10 14:00:00", firmware_version: "2.4.0", transactions_today: 0, is_assigned: false },
  { id: "t11", terminal_code: "T-NEW-001", name: "New Terminal", location_id: null, location_name: null, last_heartbeat_at: null, firmware_version: "2.4.1", transactions_today: 0, is_assigned: false },
]

// ============== REUSABLE COMPONENTS ==============
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" | "indigo" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
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

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!isOpen) return null
  const sizeClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" }
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
      <div className="absolute right-0 top-0 h-full w-[480px] bg-white dark:bg-[#0F0F12] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

// Real-time indicator component
function LiveIndicator({ lastUpdated, isLive }: { lastUpdated: number; isLive: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      {isLive && (
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-600 dark:text-green-400">{LABELS.liveConnection}</span>
        </span>
      )}
      <span>{LABELS.lastUpdated} {lastUpdated} {LABELS.secondsAgo}</span>
    </div>
  )
}

// Skeleton Loaders
function TerminalRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-[#1F1F23]">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </td>
      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
      <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="p-4"><Skeleton className="h-4 w-12" /></td>
      <td className="p-4"><Skeleton className="h-8 w-20 rounded-lg" /></td>
    </tr>
  )
}

function LocationSkeleton() {
  return (
    <div className="w-full flex items-center gap-3 p-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-4 w-28 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
      <Skeleton className="w-9 h-9 rounded-lg mb-2" />
      <Skeleton className="h-6 w-12 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

// ============== HELPER FUNCTIONS ==============
function getHealthStatus(lastHeartbeat: string | null): { status: "online" | "stale" | "offline"; color: "green" | "yellow" | "red"; label: string } {
  if (!lastHeartbeat) return { status: "offline", color: "red", label: LABELS.offline }
  
  const last = new Date(lastHeartbeat)
  const now = new Date()
  const diffMinutes = (now.getTime() - last.getTime()) / (1000 * 60)
  
  if (diffMinutes < 5) return { status: "online", color: "green", label: LABELS.online }
  if (diffMinutes < 30) return { status: "stale", color: "yellow", label: LABELS.stale }
  return { status: "offline", color: "red", label: LABELS.offline }
}

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never"
  
  const date = new Date(dateStr)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`
  return `${Math.floor(diffMinutes / 1440)} days ago`
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "Never"
  return DATE_FORMAT.formatDateTime(dateStr)
}

function HealthBadge({ lastHeartbeat }: { lastHeartbeat: string | null }) {
  const { status, color, label } = getHealthStatus(lastHeartbeat)
  const icon = status === "online" ? <Wifi className="w-3 h-3" /> : status === "stale" ? <AlertCircle className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />
  return <Badge color={color}>{icon} {label}</Badge>
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-[#1F1F23]">
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
export default function TerminalsPage() {
  const [terminals] = useState<Terminal[]>([...mockTerminals, ...mockUnassignedTerminals])
  const [locations] = useState<Location[]>(mockLocations)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [permissions] = useState<UserPermissions>(mockUserPermissions)
  
  // Real-time data state
  const [lastUpdated, setLastUpdated] = useState(0)
  const [isLive, setIsLive] = useState(true)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGINATION.defaultPageSize)
  
  // Modals & Panels
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null)
  
  // Form state
  const [assignForm, setAssignForm] = useState({ terminal_code: "", location_id: "" })

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Real-time refresh (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(0)
      // In real app, would fetch new data here
    }, 30000)
    
    // Update seconds counter
    const secondsInterval = setInterval(() => {
      setLastUpdated(prev => prev + 1)
    }, 1000)
    
    return () => {
      clearInterval(interval)
      clearInterval(secondsInterval)
    }
  }, [])

  // Stats
  const totalTerminals = mockTerminals.length
  const onlineTerminals = mockTerminals.filter(t => getHealthStatus(t.last_heartbeat_at).status === "online").length
  const unassignedCount = mockUnassignedTerminals.length

  // Filtered terminals based on selected location
  const filteredTerminals = mockTerminals.filter(t => {
    const matchesLocation = !selectedLocationId || t.location_id === selectedLocationId
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.terminal_code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesLocation && matchesSearch
  })

  // Paginated terminals
  const totalPages = Math.ceil(filteredTerminals.length / pageSize) || 1
  const paginatedTerminals = filteredTerminals.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleViewTerminal = (terminal: Terminal) => {
    setSelectedTerminal(terminal)
    setShowDetailPanel(true)
  }

  const handleAssignTerminal = () => {
    setAssignForm({ terminal_code: "", location_id: "" })
    setShowAssignModal(true)
  }

  const handleForceSync = useCallback(() => {
    if (!permissions.can_force_sync) return
    alert("Sync requested! Job ID: SYNC-" + Date.now())
  }, [permissions.can_force_sync])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  const canForceSync = permissions.role === "manager" || permissions.role === "owner"
  const canReassign = permissions.role === "manager" || permissions.role === "owner"

  return (
    <div className="h-full flex gap-6">
      {/* Left Panel - Locations */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] sticky top-0">
          <div className="p-4 border-b border-gray-100 dark:border-[#1F1F23]">
            <h2 className="font-semibold text-gray-900 dark:text-white">{LABELS.allLocations}</h2>
          </div>
          <div className="p-2">
            {isLoading ? (
              <>
                <LocationSkeleton />
                <LocationSkeleton />
                <LocationSkeleton />
                <LocationSkeleton />
              </>
            ) : (
              <>
                {/* All Locations option */}
                <button
                  onClick={() => setSelectedLocationId(null)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedLocationId === null
                      ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                      : "hover:bg-gray-50 dark:hover:bg-[#1a1a20] text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedLocationId === null
                      ? "bg-indigo-100 dark:bg-indigo-900/30"
                      : "bg-gray-100 dark:bg-[#0F0F12]"
                  }`}>
                    <Building2 className={`w-5 h-5 ${selectedLocationId === null ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{LABELS.allLocations}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {onlineTerminals}/{totalTerminals} {LABELS.online.toLowerCase()}
                    </p>
                  </div>
                  {selectedLocationId === null && <ChevronRight className="w-4 h-4" />}
                </button>
                
                {/* Location cards */}
                {locations.map(location => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedLocationId(location.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedLocationId === location.id
                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                        : "hover:bg-gray-50 dark:hover:bg-[#1a1a20] text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedLocationId === location.id
                        ? "bg-indigo-100 dark:bg-indigo-900/30"
                        : "bg-gray-100 dark:bg-[#0F0F12]"
                    }`}>
                      <MapPin className={`w-5 h-5 ${selectedLocationId === location.id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{location.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className={location.online_count > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>{location.online_count}</span>/{location.total_count} {LABELS.online.toLowerCase()}
                      </p>
                    </div>
                    {selectedLocationId === location.id && <ChevronRight className="w-4 h-4" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Area - Terminal List */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{LABELS.pageTitle}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedLocationId ? locations.find(l => l.id === selectedLocationId)?.name : LABELS.allLocations} - {filteredTerminals.length} terminal(s)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <LiveIndicator lastUpdated={lastUpdated} isLive={isLive} />
            <Button variant="primary" onClick={handleAssignTerminal}>
              <Plus className="w-4 h-4" />
              Assign Terminal
            </Button>
          </div>
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
              <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalTerminals}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Terminals</p>
              </div>
              <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{onlineTerminals}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{LABELS.online} Now</p>
              </div>
              <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{unassignedCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{LABELS.unassigned}</p>
              </div>
              <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{mockTerminals.reduce((sum, t) => sum + t.transactions_today, 0)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Transactions Today</p>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`${COMMON_LABELS.search} terminals...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
            <Button variant="secondary" onClick={() => setLastUpdated(0)}>
              <RefreshCw className="w-4 h-4" />
              {COMMON_LABELS.refresh}
            </Button>
          </div>
        </div>

        {/* Terminal Table */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Terminal</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{LABELS.location}</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{LABELS.lastSeen}</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{LABELS.status}</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{LABELS.version}</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{COMMON_LABELS.view}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TerminalRowSkeleton key={i} />)
              ) : paginatedTerminals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Monitor className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{LABELS.emptyState.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{LABELS.emptyState.description}</p>
                    <Button variant="primary" onClick={handleAssignTerminal}>
                      <Plus className="w-4 h-4" />
                      {LABELS.emptyState.cta}
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedTerminals.map(terminal => (
                  <tr 
                    key={terminal.id} 
                    className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 cursor-pointer"
                    onClick={() => handleViewTerminal(terminal)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 dark:bg-[#0F0F12] rounded-lg flex items-center justify-center">
                          <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{terminal.name}</p>
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{terminal.terminal_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{terminal.location_name}</td>
                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{getRelativeTime(terminal.last_heartbeat_at)}</td>
                    <td className="p-4"><HealthBadge lastHeartbeat={terminal.last_heartbeat_at} /></td>
                    <td className="p-4 text-xs font-mono text-gray-500 dark:text-gray-400">v{terminal.firmware_version}</td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          disabled={!canReassign}
                          title={!canReassign ? LABELS.permissions.reassign : undefined}
                        >
                          Assign
                        </Button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          {!isLoading && filteredTerminals.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTerminals.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>

        {/* Unassigned Terminals Section */}
        {!isLoading && !selectedLocationId && (
          mockUnassignedTerminals.length > 0 ? (
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
            <div className="p-4 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {LABELS.unassigned} Terminals ({mockUnassignedTerminals.length})
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{LABELS.unassignedWarning}</p>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                {mockUnassignedTerminals.map(terminal => (
                  <tr key={terminal.id} className="hover:bg-amber-50 dark:hover:bg-amber-900/10">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                          <Monitor className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{terminal.name}</p>
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{terminal.terminal_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{getRelativeTime(terminal.last_heartbeat_at)}</td>
                    <td className="p-4"><HealthBadge lastHeartbeat={terminal.last_heartbeat_at} /></td>
                    <td className="p-4 text-xs font-mono text-gray-500 dark:text-gray-400">v{terminal.firmware_version}</td>
                    <td className="p-4">
                      <Button 
                        variant="primary" 
                        size="sm"
                        disabled={!canReassign}
                        title={!canReassign ? LABELS.permissions.reassign : undefined}
                      >
                        <MapPin className="w-3 h-3" />
                        Assign to Location
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-green-200 dark:border-green-800 p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">All terminals are assigned</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Great job! All your terminals have been assigned to locations.</p>
            </div>
          )
        )}
      </div>

      {/* Assign Terminal Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Terminal" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terminal</label>
            <select
              value={assignForm.terminal_code}
              onChange={(e) => setAssignForm(f => ({ ...f, terminal_code: e.target.value }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            >
              <option value="">Select unassigned terminal...</option>
              {mockUnassignedTerminals.map(t => (
                <option key={t.id} value={t.terminal_code}>{t.terminal_code} - {t.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{LABELS.location}</label>
            <select
              value={assignForm.location_id}
              onChange={(e) => setAssignForm(f => ({ ...f, location_id: e.target.value }))}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            >
              <option value="">Select location...</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAssignModal(false)}>{COMMON_LABELS.close}</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAssignModal(false)}>
              <Check className="w-4 h-4" />
              Assign Terminal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Terminal Detail Slide-out */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title={LABELS.viewDetails}>
        {selectedTerminal && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 dark:bg-[#0F0F12] rounded-xl flex items-center justify-center">
                <Monitor className="w-7 h-7 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTerminal.name}</h3>
                <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{selectedTerminal.terminal_code}</p>
              </div>
            </div>

            {/* Location */}
            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedTerminal.location_name || "Not assigned"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Assigned Location</p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  disabled={!canReassign}
                  title={!canReassign ? LABELS.permissions.reassign : undefined}
                >
                  {LABELS.reassign}
                </Button>
              </div>
            </div>

            {/* Health Status */}
            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Health {LABELS.status}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{LABELS.status}</p>
                  <HealthBadge lastHeartbeat={selectedTerminal.last_heartbeat_at} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{LABELS.lastSeen}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{getRelativeTime(selectedTerminal.last_heartbeat_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{LABELS.version}</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">v{selectedTerminal.firmware_version}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transactions Today</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTerminal.transactions_today}</p>
                </div>
              </div>
            </div>

            {/* Last Sync */}
            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Last Sync</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(selectedTerminal.last_heartbeat_at)}</p>
                  </div>
                </div>
                <Badge color="green">Synced</Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button 
                variant="primary" 
                className="w-full" 
                onClick={handleForceSync}
                disabled={!canForceSync}
                title={!canForceSync ? LABELS.permissions.forceSync : undefined}
              >
                <Zap className="w-4 h-4" />
                {LABELS.forceSync}
              </Button>
              <Button variant="secondary" className="w-full">
                <Settings className="w-4 h-4" />
                Configure Terminal
              </Button>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  )
}



