"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  MapPin,
  Monitor,
  Wifi,
  WifiOff,
  Building2,
  Clock,
  AlertCircle,
  Check,
  RefreshCw,
} from "lucide-react"

// ============== TYPES ==============
interface Terminal {
  id: string
  terminal_code: string
  name: string
  location_id: string | null
  last_seen_at: string | null
  firmware_version: string
  is_assigned: boolean
}

interface Location {
  id: string
  name: string
  address: string
  city: string
  terminal_count: number
  active_terminal_count: number
  status: "active" | "inactive"
  terminals: Terminal[]
}

// ============== MOCK DATA ==============
const mockLocations: Location[] = [
  {
    id: "loc-1",
    name: "Downtown Branch",
    address: "123 Mohammed V Boulevard",
    city: "Casablanca",
    terminal_count: 3,
    active_terminal_count: 3,
    status: "active",
    terminals: [
      { id: "term-1", terminal_code: "T-001-DT", name: "Main Counter", location_id: "loc-1", last_seen_at: "2024-03-15 10:30:00", firmware_version: "2.4.1", is_assigned: true },
      { id: "term-2", terminal_code: "T-002-DT", name: "Side Counter", location_id: "loc-1", last_seen_at: "2024-03-15 10:28:00", firmware_version: "2.4.1", is_assigned: true },
      { id: "term-3", terminal_code: "T-003-DT", name: "Drive-Through", location_id: "loc-1", last_seen_at: "2024-03-15 10:25:00", firmware_version: "2.4.0", is_assigned: true },
    ],
  },
  {
    id: "loc-2",
    name: "Marina Mall",
    address: "Marina Shopping Center, Level 2",
    city: "Casablanca",
    terminal_count: 2,
    active_terminal_count: 2,
    status: "active",
    terminals: [
      { id: "term-4", terminal_code: "T-001-MM", name: "Kiosk 1", location_id: "loc-2", last_seen_at: "2024-03-15 10:32:00", firmware_version: "2.4.1", is_assigned: true },
      { id: "term-5", terminal_code: "T-002-MM", name: "Kiosk 2", location_id: "loc-2", last_seen_at: "2024-03-15 09:45:00", firmware_version: "2.4.1", is_assigned: true },
    ],
  },
  {
    id: "loc-3",
    name: "Airport Kiosk",
    address: "Terminal 1, Departure Hall",
    city: "Casablanca",
    terminal_count: 1,
    active_terminal_count: 0,
    status: "active",
    terminals: [
      { id: "term-6", terminal_code: "T-001-AP", name: "Airport POS", location_id: "loc-3", last_seen_at: "2024-03-14 18:00:00", firmware_version: "2.3.9", is_assigned: true },
    ],
  },
]

const mockUnassignedTerminals: Terminal[] = [
  { id: "term-7", terminal_code: "T-SPARE-01", name: "Spare Unit 1", location_id: null, last_seen_at: null, firmware_version: "2.4.1", is_assigned: false },
  { id: "term-8", terminal_code: "T-SPARE-02", name: "Spare Unit 2", location_id: null, last_seen_at: "2024-03-10 14:00:00", firmware_version: "2.4.0", is_assigned: false },
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
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md"
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  }
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" }
  return <button className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props} />
    </div>
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

// ============== HEALTH STATUS HELPER ==============
function getHealthStatus(lastSeenAt: string | null): { status: "online" | "stale" | "offline"; color: "green" | "yellow" | "red" } {
  if (!lastSeenAt) return { status: "offline", color: "red" }
  
  const lastSeen = new Date(lastSeenAt)
  const now = new Date()
  const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
  
  if (diffMinutes < 5) return { status: "online", color: "green" }
  if (diffMinutes < 30) return { status: "stale", color: "yellow" }
  return { status: "offline", color: "red" }
}

function HealthBadge({ lastSeenAt }: { lastSeenAt: string | null }) {
  const { status, color } = getHealthStatus(lastSeenAt)
  const icon = status === "online" ? <Wifi className="w-3 h-3" /> : status === "stale" ? <AlertCircle className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />
  return (
    <Badge color={color}>
      <span className="flex items-center gap-1">
        {icon}
        {status === "online" ? "Online" : status === "stale" ? "Stale" : "Offline"}
      </span>
    </Badge>
  )
}

// ============== MAIN PAGE COMPONENT ==============
export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>(mockLocations)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"locations" | "all-terminals">("locations")
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set(["loc-1"]))
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [showEditLocation, setShowEditLocation] = useState(false)
  const [showAssignTerminal, setShowAssignTerminal] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  // Form state
  const [locationForm, setLocationForm] = useState({ name: "", address: "", city: "" })

  const fetchLocations = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: any[] }>("/api/business/locations")
      const mapped: Location[] = res.data.map((l: any) => ({
        id: l.id,
        name: l.name,
        address: l.address ?? "",
        city: l.city ?? "",
        terminal_count: l.terminal_count ?? 0,
        active_terminal_count: l.active_terminal_count ?? 0,
        status: l.is_active ? "active" : "inactive",
        terminals: [],
      }))
      setLocations(mapped)
    } catch (e: any) {
      setError(e.message ?? "Failed to load locations")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLocations() }, [])

  const handleSaveAddLocation = async () => {
    if (!locationForm.name.trim()) return
    try {
      await apiFetch("/api/business/locations", {
        method: "POST",
        body: JSON.stringify(locationForm),
      })
      setShowAddLocation(false)
      await fetchLocations()
    } catch (e: any) {
      setError(e.message ?? "Failed to create location")
    }
  }

  const handleSaveEditLocation = async () => {
    if (!selectedLocation || !locationForm.name.trim()) return
    try {
      await apiFetch(`/api/business/locations/${selectedLocation.id}`, {
        method: "PUT",
        body: JSON.stringify(locationForm),
      })
      setShowEditLocation(false)
      await fetchLocations()
    } catch (e: any) {
      setError(e.message ?? "Failed to update location")
    }
  }

  // All terminals (assigned + unassigned)
  const allTerminals = [
    ...locations.flatMap(loc => loc.terminals.map(t => ({ ...t, location_name: loc.name }))),
    ...mockUnassignedTerminals.map(t => ({ ...t, location_name: "Unassigned" })),
  ]

  // Filtered locations
  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleLocation = (locationId: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev)
      if (next.has(locationId)) next.delete(locationId)
      else next.add(locationId)
      return next
    })
  }

  const handleAddLocation = () => {
    setLocationForm({ name: "", address: "", city: "" })
    setShowAddLocation(true)
  }

  const handleEditLocation = (location: Location) => {
    setSelectedLocation(location)
    setLocationForm({ name: location.name, address: location.address, city: location.city })
    setShowEditLocation(true)
  }

  const handleAssignTerminal = (locationId: string) => {
    setShowAssignTerminal(locationId)
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="h-full">
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locations & Terminals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your business locations and POS terminals</p>
        </div>
        <Button variant="primary" onClick={handleAddLocation}>
          <Plus className="w-4 h-4" />
          Add Location
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#0F0F12] p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab("locations")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "locations"
              ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4 inline-block mr-2" />
          Locations
        </button>
        <button
          onClick={() => setActiveTab("all-terminals")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "all-terminals"
              ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Monitor className="w-4 h-4 inline-block mr-2" />
          All Terminals
        </button>
      </div>

      {activeTab === "locations" ? (
        <>
          {/* Search */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Locations List */}
          <div className="grid gap-4">
            {filteredLocations.map(location => (
              <div
                key={location.id}
                className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden"
              >
                {/* Location Header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50"
                  onClick={() => toggleLocation(location.id)}
                >
                  <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {expandedLocations.has(location.id) ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{location.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{location.address}, {location.city}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{location.terminal_count}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Terminals</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{location.active_terminal_count}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                    </div>
                    <Badge color={location.status === "active" ? "green" : "gray"}>
                      {location.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditLocation(location)}
                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terminals List (Expanded) */}
                {expandedLocations.has(location.id) && (
                  <div className="border-t border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/30 p-4">
                    {location.terminals.length > 0 ? (
                      <div className="space-y-2">
                        {location.terminals.map(terminal => (
                          <div
                            key={terminal.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-[#0F0F12] rounded-lg border border-gray-100 dark:border-[#1F1F23]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 dark:bg-[#1F1F23] rounded-lg flex items-center justify-center">
                                <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-white">{terminal.name}</p>
                                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{terminal.terminal_code}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  v{terminal.firmware_version} | Last seen: {terminal.last_seen_at ? new Date(terminal.last_seen_at).toLocaleString() : "Never"}
                                </p>
                              </div>
                            </div>
                            <HealthBadge lastSeenAt={terminal.last_seen_at} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Monitor className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No terminals assigned</p>
                      </div>
                    )}
                    <div className="mt-4">
                      <Button variant="secondary" size="sm" onClick={() => handleAssignTerminal(location.id)}>
                        <Plus className="w-4 h-4" />
                        Assign Terminal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredLocations.length === 0 && (
              <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
                <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No locations found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery ? "Try adjusting your search" : "Add your first location to get started"}
                </p>
                <Button variant="primary" onClick={handleAddLocation}>
                  <Plus className="w-4 h-4" />
                  Add Location
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* All Terminals Tab */
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Terminal</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Heartbeat</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Firmware</th>
                <th className="text-center p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {allTerminals.map((terminal) => (
                <tr key={terminal.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-[#1F1F23] rounded-lg flex items-center justify-center">
                        <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{terminal.name}</p>
                        <p className="font-mono text-xs text-gray-400 dark:text-gray-500">{terminal.terminal_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge color={terminal.location_id ? "blue" : "gray"}>
                      {terminal.location_name}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {terminal.last_seen_at ? new Date(terminal.last_seen_at).toLocaleString() : "Never"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">v{terminal.firmware_version}</span>
                  </td>
                  <td className="p-4 text-center">
                    <HealthBadge lastSeenAt={terminal.last_seen_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Location Modal */}
      <Modal isOpen={showAddLocation} onClose={() => setShowAddLocation(false)} title="Add Location" size="md">
        <div className="space-y-4">
          <Input label="Location Name" placeholder="e.g. Downtown Branch" value={locationForm.name} onChange={(e) => setLocationForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Address" placeholder="123 Main Street" value={locationForm.address} onChange={(e) => setLocationForm(f => ({ ...f, address: e.target.value }))} />
          <Input label="City" placeholder="Casablanca" value={locationForm.city} onChange={(e) => setLocationForm(f => ({ ...f, city: e.target.value }))} />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddLocation(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveAddLocation}>Add Location</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Location Modal */}
      <Modal isOpen={showEditLocation} onClose={() => setShowEditLocation(false)} title="Edit Location" size="md">
        <div className="space-y-4">
          <Input label="Location Name" placeholder="e.g. Downtown Branch" value={locationForm.name} onChange={(e) => setLocationForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Address" placeholder="123 Main Street" value={locationForm.address} onChange={(e) => setLocationForm(f => ({ ...f, address: e.target.value }))} />
          <Input label="City" placeholder="Casablanca" value={locationForm.city} onChange={(e) => setLocationForm(f => ({ ...f, city: e.target.value }))} />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditLocation(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveEditLocation}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Assign Terminal Modal */}
      <Modal isOpen={!!showAssignTerminal} onClose={() => setShowAssignTerminal(null)} title="Assign Terminal" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Select an unassigned terminal to add to this location.</p>
          {mockUnassignedTerminals.length > 0 ? (
            <div className="space-y-2">
              {mockUnassignedTerminals.map(terminal => (
                <label
                  key={terminal.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-[#1F1F23] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] cursor-pointer"
                >
                  <input type="radio" name="terminal" className="w-4 h-4 text-indigo-500 focus:ring-gray-900 dark:focus:ring-gray-300" />
                  <div className="w-8 h-8 bg-gray-100 dark:bg-[#1F1F23] rounded-lg flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{terminal.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{terminal.terminal_code} | v{terminal.firmware_version}</p>
                  </div>
                  <HealthBadge lastSeenAt={terminal.last_seen_at} />
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-gray-200 dark:border-[#1F1F23] rounded-lg">
              <Monitor className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No unassigned terminals available</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAssignTerminal(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAssignTerminal(null)} disabled={mockUnassignedTerminals.length === 0}>
              <Check className="w-4 h-4" />
              Assign Terminal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}



