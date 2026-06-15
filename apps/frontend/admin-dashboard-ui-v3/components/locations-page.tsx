"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, MapPin,
  Monitor, Wifi, WifiOff, Building2, AlertCircle,
} from "lucide-react"
import { locationsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { BusinessLocation, BusinessTerminal, CreateLocationInput } from "@/lib/merchant/types"

/**
 * Locations & Terminals — TanStack Query migration.
 *
 * Ground truth (business.controller LOCATIONS + Location/Terminal entities):
 *   - GET business/locations → plain Location[] (NOT {data}) with eager `terminals`.
 *     No terminal_count / active_terminal_count / status columns → derived here.
 *   - Terminal columns: terminal_code, device_name (NOT `name`), app_version (NOT
 *     `firmware_version`), is_online, last_seen_at. location_id is NOT NULL — there
 *     are no "unassigned" terminals, so that concept (and the mock data behind it)
 *     was removed.
 *   - CreateLocationDto/UpdateLocationDto: name, address?, city?, phone?. POST + PUT
 *     only — there is NO DELETE and NO assign-terminal endpoint, so the delete button
 *     stays disabled and the (mock) Assign-Terminal modal was removed.
 */

const EMPTY_FORM: CreateInput = { name: "", address: "", city: "", phone: "" }
type CreateInput = Required<Pick<CreateLocationInput, "name">> & { address: string; city: string; phone: string }

// ============== HELPERS ==============
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
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
  return <button className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props} />
    </div>
  )
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function getHealth(lastSeenAt: string | null): { status: "online" | "stale" | "offline"; color: "green" | "yellow" | "red" } {
  if (!lastSeenAt) return { status: "offline", color: "red" }
  const diffMin = (Date.now() - new Date(lastSeenAt).getTime()) / 60000
  if (diffMin < 5) return { status: "online", color: "green" }
  if (diffMin < 30) return { status: "stale", color: "yellow" }
  return { status: "offline", color: "red" }
}

function HealthBadge({ lastSeenAt }: { lastSeenAt: string | null }) {
  const { status, color } = getHealth(lastSeenAt)
  const icon = status === "online" ? <Wifi className="w-3 h-3" /> : status === "stale" ? <AlertCircle className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />
  return <Badge color={color}><span className="flex items-center gap-1">{icon}{status === "online" ? "Online" : status === "stale" ? "Stale" : "Offline"}</span></Badge>
}

const termName = (t: BusinessTerminal) => t.device_name || t.terminal_code
const fmtSeen = (s: string | null) => (s ? new Date(s).toLocaleString() : "Never")

// ============== MAIN ==============
export default function LocationsPage() {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<"locations" | "all-terminals">("locations")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<BusinessLocation | null>(null)
  const [form, setForm] = useState<CreateInput>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const locationsQuery = useQuery({ queryKey: merchantKeys.locations.list(), queryFn: locationsApi.list })
  const locations = locationsQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.locations.all })

  const buildInput = (): CreateLocationInput => ({
    name: form.name.trim(),
    ...(form.address.trim() ? { address: form.address.trim() } : {}),
    ...(form.city.trim() ? { city: form.city.trim() } : {}),
    ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
  })

  const createMutation = useMutation({
    mutationFn: () => locationsApi.create(buildInput()),
    onSuccess: () => { invalidate(); setShowAdd(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to create location.")),
  })
  const updateMutation = useMutation({
    mutationFn: (id: string) => locationsApi.update(id, buildInput()),
    onSuccess: () => { invalidate(); setEditing(null) },
    onError: (e) => setFormError(humanizeError(e, "Failed to update location.")),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return locations
    return locations.filter((l) => l.name.toLowerCase().includes(q) || (l.address ?? "").toLowerCase().includes(q) || (l.city ?? "").toLowerCase().includes(q))
  }, [locations, search])

  const allTerminals = useMemo(
    () => locations.flatMap((l) => (l.terminals ?? []).map((t) => ({ ...t, location_name: l.name }))),
    [locations],
  )

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(null); setShowAdd(true) }
  const openEdit = (l: BusinessLocation) => {
    setEditing(l)
    setForm({ name: l.name, address: l.address ?? "", city: l.city ?? "", phone: l.phone ?? "" })
    setFormError(null)
  }

  const listError = locationsQuery.isError ? humanizeError(locationsQuery.error, "Failed to load locations.") : null
  const saving = createMutation.isPending || updateMutation.isPending

  const renderForm = (onSave: () => void, cta: string) => (
    <div className="space-y-4">
      <Input label="Location Name *" placeholder="e.g. Downtown Branch" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      <Input label="Address" placeholder="123 Main Street" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
      <Input label="City" placeholder="Casablanca" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
      <Input label="Phone" placeholder="+212 5..." value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      {formError && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">{formError}</p>}
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1" onClick={() => { setShowAdd(false); setEditing(null) }}>Cancel</Button>
        <Button variant="primary" className="flex-1" disabled={!form.name.trim() || saving} onClick={onSave}>{saving ? "Saving..." : cta}</Button>
      </div>
    </div>
  )

  return (
    <div className="h-full">
      {listError && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locations &amp; Terminals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your business locations and POS terminals</p>
        </div>
        <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Location</Button>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#0F0F12] p-1 rounded-xl w-fit mb-6">
        <button onClick={() => setActiveTab("locations")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "locations" ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>
          <Building2 className="w-4 h-4 inline-block mr-2" />Locations
        </button>
        <button onClick={() => setActiveTab("all-terminals")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "all-terminals" ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>
          <Monitor className="w-4 h-4 inline-block mr-2" />All Terminals
        </button>
      </div>

      {activeTab === "locations" ? (
        <>
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search locations..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
            </div>
          </div>

          {locationsQuery.isLoading ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((location) => {
                const terminals = location.terminals ?? []
                const onlineCount = terminals.filter((t) => t.is_online).length
                return (
                  <div key={location.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
                    <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50" onClick={() => toggle(location.id)}>
                      <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {expanded.has(location.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{location.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{[location.address, location.city].filter(Boolean).join(", ") || "No address"}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{terminals.length}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Terminals</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{onlineCount}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                        </div>
                        <Badge color={location.is_active ? "green" : "gray"}>{location.is_active ? "Active" : "Inactive"}</Badge>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openEdit(location)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {/* No backend DELETE for locations — button disabled */}
                          <button disabled title="Deleting locations is not supported" className="p-2 text-gray-200 dark:text-gray-700 cursor-not-allowed rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {expanded.has(location.id) && (
                      <div className="border-t border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/30 p-4">
                        {terminals.length > 0 ? (
                          <div className="space-y-2">
                            {terminals.map((terminal) => (
                              <div key={terminal.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#0F0F12] rounded-lg border border-gray-100 dark:border-[#1F1F23]">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gray-100 dark:bg-[#1F1F23] rounded-lg flex items-center justify-center">
                                    <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-gray-900 dark:text-white">{termName(terminal)}</p>
                                      <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{terminal.terminal_code}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {terminal.app_version ? `v${terminal.app_version} | ` : ""}Last seen: {fmtSeen(terminal.last_seen_at)}
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
                      </div>
                    )}
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
                  <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No locations found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{search ? "Try adjusting your search" : "Add your first location to get started"}</p>
                  <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Location</Button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
              <tr>
                {["Terminal", "Location", "Last Heartbeat", "App Version", "Health"].map((h) => (
                  <th key={h} className={`p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h === "Health" ? "text-center" : "text-left"}`}>{h}</th>
                ))}
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
                        <p className="font-medium text-gray-900 dark:text-white">{termName(terminal)}</p>
                        <p className="font-mono text-xs text-gray-400 dark:text-gray-500">{terminal.terminal_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><Badge color="blue">{terminal.location_name}</Badge></td>
                  <td className="p-4"><span className="text-sm text-gray-600 dark:text-gray-300">{fmtSeen(terminal.last_seen_at)}</span></td>
                  <td className="p-4"><span className="font-mono text-xs text-gray-500 dark:text-gray-400">{terminal.app_version ? `v${terminal.app_version}` : "—"}</span></td>
                  <td className="p-4 text-center"><HealthBadge lastSeenAt={terminal.last_seen_at} /></td>
                </tr>
              ))}
              {allTerminals.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400 text-sm">No terminals registered</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Location">
        {renderForm(() => createMutation.mutate(), "Add Location")}
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Location">
        {editing && renderForm(() => updateMutation.mutate(editing.id), "Save Changes")}
      </Modal>
    </div>
  )
}
