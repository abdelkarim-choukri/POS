"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, Pencil, Trash2, X, Package, Warehouse, AlertTriangle,
  Check, CheckCircle, XCircle, Building2, Tag,
} from "lucide-react"
import { warehousesApi, locationsApi, inventoryAlertsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type {
  Warehouse as WarehouseType,
  DiscrepancyAlert,
  ExpirationAlert,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  ResolveDiscrepancyInput,
  ResolveExpirationInput,
} from "@/lib/merchant/types"

function num(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }
const short = (id: string | null) => (id ? id.slice(0, 8) : "—")
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—")

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
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 disabled:opacity-50",
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

function Select({ label, options, ...props }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <select className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'} cursor-pointer`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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

function SlidePanel({ isOpen, onClose, title, children, width = "xl" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: "md" | "lg" | "xl" }) {
  if (!isOpen) return null
  const widthClasses = { md: "w-[480px]", lg: "w-[560px]", xl: "w-[700px]" }
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full ${widthClasses[width]} bg-white dark:bg-[#0F0F12] shadow-2xl border-l border-gray-200 dark:border-[#1F1F23] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-hide">{children}</div>
      </div>
    </div>
  )
}

// ============== FORM STATE TYPES ==============
type WarehouseForm = { name: string; code: string; address: string; linked_location_id: string; is_central: boolean; is_active: boolean }
const emptyForm: WarehouseForm = { name: "", code: "", address: "", linked_location_id: "", is_central: false, is_active: true }

// ============== MAIN PAGE COMPONENT ==============
export default function WarehousesPage() {
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState("")
  const [activePageTab, setActivePageTab] = useState<"warehouses" | "discrepancies">("warehouses")
  const [discrepancyStatus, setDiscrepancyStatus] = useState<"unresolved" | "resolved">("unresolved")
  const [discrepancyWarehouseFilter, setDiscrepancyWarehouseFilter] = useState<string>("all")

  // Detail panel
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null)

  // Create / edit warehouse
  const [showAddWarehouse, setShowAddWarehouse] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null)
  const [form, setForm] = useState<WarehouseForm>(emptyForm)

  // Resolve modals
  const [resolvingDiscrepancy, setResolvingDiscrepancy] = useState<DiscrepancyAlert | null>(null)
  const [discResolveForm, setDiscResolveForm] = useState<{ action: ResolveDiscrepancyInput["action"]; adjustment_quantity: string; notes: string }>({ action: "manual_recount", adjustment_quantity: "", notes: "" })
  const [resolvingExpiration, setResolvingExpiration] = useState<ExpirationAlert | null>(null)
  const [expResolveForm, setExpResolveForm] = useState<{ action: ResolveExpirationInput["action"]; notes: string }>({ action: "disposed", notes: "" })

  // ── Queries ──
  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: () => warehousesApi.list() })
  const warehouses = warehousesQuery.data ?? []

  const locationsQuery = useQuery({ queryKey: merchantKeys.inventory.locations(), queryFn: () => locationsApi.list() })
  const locations = locationsQuery.data ?? []

  const discrepancyQuery = useQuery({
    queryKey: merchantKeys.inventory.discrepancyAlerts(discrepancyStatus),
    queryFn: () => inventoryAlertsApi.listDiscrepancy({ is_resolved: discrepancyStatus === "resolved" }),
  })
  const discrepancyAlerts = discrepancyQuery.data?.records ?? []

  // Unresolved expiration alerts power the banner + per-warehouse detail.
  const expirationQuery = useQuery({
    queryKey: merchantKeys.inventory.expirationAlerts("unresolved"),
    queryFn: () => inventoryAlertsApi.listExpiration({ is_resolved: false }),
  })
  const expirationAlerts = expirationQuery.data?.records ?? []
  // Unresolved discrepancies for the banner (independent of the tab's status filter).
  const unresolvedDiscQuery = useQuery({
    queryKey: merchantKeys.inventory.discrepancyAlerts("banner-unresolved"),
    queryFn: () => inventoryAlertsApi.listDiscrepancy({ is_resolved: false }),
  })
  const unresolvedDiscCount = unresolvedDiscQuery.data?.records.length ?? 0
  const unresolvedExpCount = expirationAlerts.length

  // ── Mutations ──
  const invalidateWarehouses = () => queryClient.invalidateQueries({ queryKey: merchantKeys.inventory.warehouses() })
  const invalidateAlerts = () => queryClient.invalidateQueries({ queryKey: ["merchant", "inventory"] })

  const createMutation = useMutation({
    mutationFn: (input: CreateWarehouseInput) => warehousesApi.create(input),
    onSuccess: () => { invalidateWarehouses(); setShowAddWarehouse(false); setForm(emptyForm) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWarehouseInput }) => warehousesApi.update(id, input),
    onSuccess: () => { invalidateWarehouses(); setEditingWarehouse(null); setForm(emptyForm) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => warehousesApi.remove(id),
    onSuccess: () => invalidateWarehouses(),
  })
  const resolveDiscMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveDiscrepancyInput }) => inventoryAlertsApi.resolveDiscrepancy(id, input),
    onSuccess: () => { invalidateAlerts(); setResolvingDiscrepancy(null) },
  })
  const resolveExpMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveExpirationInput }) => inventoryAlertsApi.resolveExpiration(id, input),
    onSuccess: () => { invalidateAlerts(); setResolvingExpiration(null) },
  })

  // ── Helpers ──
  const warehouseName = (id: string | null) => warehouses.find(w => w.id === id)?.name ?? (id ? short(id) : "—")
  const locationName = (id: string | null) => locations.find(l => l.id === id)?.name ?? null

  const filteredWarehouses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return warehouses
    return warehouses.filter(w => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q))
  }, [warehouses, searchQuery])

  const filteredDiscrepancies = useMemo(() =>
    discrepancyWarehouseFilter === "all" ? discrepancyAlerts : discrepancyAlerts.filter(d => d.warehouse_id === discrepancyWarehouseFilter),
    [discrepancyAlerts, discrepancyWarehouseFilter])

  const locationOptions = useMemo(() => [
    { value: "", label: "No location" },
    ...locations.map(l => ({ value: l.id, label: l.name })),
  ], [locations])

  // ── Actions ──
  const openAdd = () => { setForm(emptyForm); setShowAddWarehouse(true) }
  const openEdit = (w: WarehouseType) => {
    setEditingWarehouse(w)
    setForm({ name: w.name, code: w.code, address: w.address ?? "", linked_location_id: w.linked_location_id ?? "", is_central: w.is_central, is_active: w.is_active })
  }

  const submitCreate = () => {
    const input: CreateWarehouseInput = { name: form.name.trim(), code: form.code.trim(), is_central: form.is_central }
    if (form.address.trim()) input.address = form.address.trim()
    if (form.linked_location_id) input.linked_location_id = form.linked_location_id
    createMutation.mutate(input)
  }
  const submitUpdate = () => {
    if (!editingWarehouse) return
    const input: UpdateWarehouseInput = {
      name: form.name.trim(),
      code: form.code.trim(),
      is_central: form.is_central,
      is_active: form.is_active,
      address: form.address.trim() || undefined,
      linked_location_id: form.linked_location_id || undefined,
    }
    updateMutation.mutate({ id: editingWarehouse.id, input })
  }
  const submitResolveDiscrepancy = () => {
    if (!resolvingDiscrepancy) return
    const input: ResolveDiscrepancyInput = { action: discResolveForm.action }
    if (discResolveForm.action === "adjust_batch") input.adjustment_quantity = num(discResolveForm.adjustment_quantity)
    if (discResolveForm.notes.trim()) input.notes = discResolveForm.notes.trim()
    resolveDiscMutation.mutate({ id: resolvingDiscrepancy.id, input })
  }
  const submitResolveExpiration = () => {
    if (!resolvingExpiration) return
    const input: ResolveExpirationInput = { action: expResolveForm.action }
    if (expResolveForm.notes.trim()) input.notes = expResolveForm.notes.trim()
    resolveExpMutation.mutate({ id: resolvingExpiration.id, input })
  }

  const formError = createMutation.isError
    ? humanizeError(createMutation.error, "Failed to create warehouse.")
    : updateMutation.isError ? humanizeError(updateMutation.error, "Failed to update warehouse.") : null
  const listError = warehousesQuery.isError ? humanizeError(warehousesQuery.error, "Failed to load warehouses.") : null
  const nameValid = form.name.trim().length > 0 && form.code.trim().length > 0

  const panelExpirations = selectedWarehouse ? expirationAlerts.filter(a => a.warehouse_id === selectedWarehouse.id) : []
  const panelDiscrepancies = selectedWarehouse ? (unresolvedDiscQuery.data?.records ?? []).filter(a => a.warehouse_id === selectedWarehouse.id) : []

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warehouses &amp; Stock</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage inventory storage locations and review stock alerts</p>
        </div>
        <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Warehouse</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-[#1F1F23]">
        <button onClick={() => setActivePageTab("warehouses")} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activePageTab === "warehouses" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
          <Warehouse className="w-4 h-4" />Warehouses
        </button>
        <button onClick={() => setActivePageTab("discrepancies")} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activePageTab === "discrepancies" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
          <AlertTriangle className="w-4 h-4" />Discrepancy Alerts
          {unresolvedDiscCount > 0 && <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">{unresolvedDiscCount}</span>}
        </button>
      </div>

      {/* ───── Warehouses Tab ───── */}
      {activePageTab === "warehouses" && (
        <>
          {(unresolvedExpCount > 0 || unresolvedDiscCount > 0) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Inventory Alerts</p>
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    {unresolvedExpCount > 0 && `${unresolvedExpCount} expiration alert${unresolvedExpCount === 1 ? "" : "s"}`}
                    {unresolvedExpCount > 0 && unresolvedDiscCount > 0 && " · "}
                    {unresolvedDiscCount > 0 && `${unresolvedDiscCount} discrepancy alert${unresolvedDiscCount === 1 ? "" : "s"}`}
                  </p>
                </div>
                {unresolvedDiscCount > 0 && <Button variant="secondary" size="sm" onClick={() => setActivePageTab("discrepancies")}>Review</Button>}
              </div>
            </div>
          )}

          {listError && <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{listError}</div>}
          {deleteMutation.isError && <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{humanizeError(deleteMutation.error, "Failed to deactivate warehouse.")}</div>}

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by name or code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
            </div>
          </div>

          {warehousesQuery.isLoading && <div className="py-10 text-center text-gray-400">Loading...</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!warehousesQuery.isLoading && filteredWarehouses.map(w => (
              <div key={w.id} onClick={() => setSelectedWarehouse(w)}
                className={`bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 hover:shadow-lg transition-shadow cursor-pointer ${!w.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                    <Warehouse className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    {w.is_central && <Badge color="blue">Central</Badge>}
                    {!w.is_active && <Badge color="gray">Inactive</Badge>}
                    <button onClick={(e) => { e.stopPropagation(); openEdit(w) }} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"><Pencil className="w-4 h-4" /></button>
                    {w.is_active && (
                      <button onClick={(e) => { e.stopPropagation(); if (confirm(`Deactivate warehouse "${w.name}"?`)) deleteMutation.mutate(w.id) }} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{w.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{w.code}</span>
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-[#1F1F23] space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    {locationName(w.linked_location_id) || "No location linked"}
                  </div>
                  {w.address && <p className="text-xs text-gray-400 truncate">{w.address}</p>}
                </div>
              </div>
            ))}

            {!warehousesQuery.isLoading && filteredWarehouses.length === 0 && (
              <div className="col-span-full bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
                <Warehouse className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No warehouses found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{searchQuery ? "No warehouses match your search" : "Add your first warehouse to get started"}</p>
                {!searchQuery && <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Warehouse</Button>}
              </div>
            )}
          </div>
        </>
      )}

      {/* ───── Discrepancy Alerts Tab ───── */}
      {activePageTab === "discrepancies" && (
        <div className="space-y-6">
          {discrepancyQuery.isError && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{humanizeError(discrepancyQuery.error, "Failed to load discrepancy alerts.")}</div>}

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
            <div className="flex flex-wrap items-center gap-4">
              <select className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" value={discrepancyStatus} onChange={(e) => setDiscrepancyStatus(e.target.value as typeof discrepancyStatus)}>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" value={discrepancyWarehouseFilter} onChange={(e) => setDiscrepancyWarehouseFilter(e.target.value)}>
                <option value="all">All Warehouses</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <span className="text-sm text-gray-400 ml-auto">{filteredDiscrepancies.length} alert{filteredDiscrepancies.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>{["Product", "Warehouse", "Expected", "Actual", "Discrepancy", "Source", "Status", "Date", ""].map(h => (
                  <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {discrepancyQuery.isLoading && <tr><td colSpan={9} className="p-10 text-center text-gray-400">Loading...</td></tr>}
                {!discrepancyQuery.isLoading && filteredDiscrepancies.map(alert => {
                  const disc = num(alert.discrepancy_quantity)
                  return (
                    <tr key={alert.id} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 ${alert.resolved_at ? "opacity-60" : ""}`}>
                      <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{short(alert.product_id)}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{warehouseName(alert.warehouse_id)}</td>
                      <td className="p-4 font-mono text-sm text-gray-900 dark:text-white">{num(alert.expected_remaining)}</td>
                      <td className="p-4 font-mono text-sm text-gray-900 dark:text-white">{num(alert.actual_remaining)}</td>
                      <td className="p-4"><span className={`font-mono font-semibold ${disc < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{disc > 0 ? "+" : ""}{disc}</span></td>
                      <td className="p-4"><Badge color={alert.source === "system_detected" ? "blue" : "gray"}>{alert.source.replace("_", " ")}</Badge></td>
                      <td className="p-4">
                        <Badge color={alert.resolved_at ? "green" : "red"}>
                          {alert.resolved_at
                            ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Resolved</span>
                            : <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Unresolved</span>}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{fmtDate(alert.created_at)}</td>
                      <td className="p-4">
                        {!alert.resolved_at && (
                          <Button variant="secondary" size="sm" onClick={() => { setResolvingDiscrepancy(alert); setDiscResolveForm({ action: "manual_recount", adjustment_quantity: num(alert.actual_remaining).toString(), notes: "" }) }}>Resolve</Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!discrepancyQuery.isLoading && filteredDiscrepancies.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-300 dark:text-green-700 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white">No {discrepancyStatus} discrepancies</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{discrepancyStatus === "unresolved" ? "All inventory is in sync" : "Nothing resolved yet"}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── Warehouse Detail Panel ───── */}
      <SlidePanel isOpen={!!selectedWarehouse} onClose={() => setSelectedWarehouse(null)} title={selectedWarehouse?.name || "Warehouse"} width="xl">
        {selectedWarehouse && (
          <div>
            <div className="p-5 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center"><Warehouse className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedWarehouse.name}</h3>
                    {selectedWarehouse.is_central && <Badge color="blue">Central</Badge>}
                    {!selectedWarehouse.is_active && <Badge color="gray">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{selectedWarehouse.code}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { openEdit(selectedWarehouse); setSelectedWarehouse(null) }}><Pencil className="w-4 h-4" />Edit</Button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Info */}
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-gray-500 dark:text-gray-400">Location</dt><dd className="text-gray-900 dark:text-white">{locationName(selectedWarehouse.linked_location_id) || "—"}</dd></div>
                <div><dt className="text-gray-500 dark:text-gray-400">Address</dt><dd className="text-gray-900 dark:text-white">{selectedWarehouse.address || "—"}</dd></div>
              </dl>

              {/* Stock breakdown — no per-warehouse stock endpoint exists yet. */}
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-[#1F1F23] p-5 text-center">
                <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Per-warehouse stock breakdown is not available.</p>
                <p className="text-xs text-gray-400 mt-1">Use the Stock page for product-level inventory across all warehouses.</p>
              </div>

              {/* Expiration alerts for this warehouse */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Expiration Alerts</h4>
                {panelExpirations.length === 0 ? (
                  <p className="text-sm text-gray-400">No unresolved expiration alerts.</p>
                ) : (
                  <div className="space-y-2">
                    {panelExpirations.map(a => (
                      <div key={a.id} className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs text-gray-500 dark:text-gray-400">Product {short(a.product_id)} · Batch {short(a.batch_id)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(a.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={a.severity === "expired" ? "red" : "yellow"}>{a.severity === "expired" ? "Expired" : "Expires Soon"}</Badge>
                          <Button variant="secondary" size="sm" onClick={() => { setResolvingExpiration(a); setExpResolveForm({ action: "disposed", notes: "" }) }}>Resolve</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discrepancy alerts for this warehouse */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Discrepancy Alerts</h4>
                {panelDiscrepancies.length === 0 ? (
                  <p className="text-sm text-gray-400">No unresolved discrepancy alerts.</p>
                ) : (
                  <div className="space-y-2">
                    {panelDiscrepancies.map(a => {
                      const disc = num(a.discrepancy_quantity)
                      return (
                        <div key={a.id} className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 flex items-center justify-between">
                          <div>
                            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">Product {short(a.product_id)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Expected {num(a.expected_remaining)} · Actual {num(a.actual_remaining)} · <span className={disc < 0 ? "text-red-600" : "text-green-600"}>{disc > 0 ? "+" : ""}{disc}</span></p>
                          </div>
                          <Button variant="secondary" size="sm" onClick={() => { setResolvingDiscrepancy(a); setDiscResolveForm({ action: "manual_recount", adjustment_quantity: num(a.actual_remaining).toString(), notes: "" }) }}>Resolve</Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* ───── Add / Edit Warehouse Modal ───── */}
      <Modal isOpen={showAddWarehouse || !!editingWarehouse} onClose={() => { setShowAddWarehouse(false); setEditingWarehouse(null) }} title={editingWarehouse ? "Edit Warehouse" : "Add Warehouse"} size="md">
        <div className="space-y-4">
          {formError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{formError}</div>}
          <Input label="Warehouse Name *" placeholder="e.g. Main Storage" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Code *" placeholder="e.g. WH-01" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} />
          <Select label="Linked Location" options={locationOptions} value={form.linked_location_id} onChange={(e) => setForm(f => ({ ...f, linked_location_id: e.target.value }))} />
          <Input label="Address" placeholder="Optional" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Central Warehouse</p><p className="text-xs text-gray-500 dark:text-gray-400">Hub warehouse for chain distribution</p></div>
            <Toggle checked={form.is_central} onChange={(c) => setForm(f => ({ ...f, is_central: c }))} />
          </div>
          {editingWarehouse && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
              <div><p className="text-sm font-medium text-gray-900 dark:text-white">Active</p><p className="text-xs text-gray-500 dark:text-gray-400">Available for stock operations</p></div>
              <Toggle checked={form.is_active} onChange={(c) => setForm(f => ({ ...f, is_active: c }))} />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowAddWarehouse(false); setEditingWarehouse(null) }}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={!nameValid || createMutation.isPending || updateMutation.isPending} onClick={editingWarehouse ? submitUpdate : submitCreate}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingWarehouse ? "Save Changes" : "Add Warehouse"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ───── Resolve Discrepancy Modal ───── */}
      <Modal isOpen={!!resolvingDiscrepancy} onClose={() => setResolvingDiscrepancy(null)} title="Resolve Discrepancy" size="md">
        {resolvingDiscrepancy && (
          <div className="space-y-4">
            {resolveDiscMutation.isError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{humanizeError(resolveDiscMutation.error, "Failed to resolve.")}</div>}
            <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xs text-gray-500 dark:text-gray-400">Expected</p><p className="text-xl font-bold font-mono text-gray-900 dark:text-white">{num(resolvingDiscrepancy.expected_remaining)}</p></div>
              <div><p className="text-xs text-gray-500 dark:text-gray-400">Actual</p><p className="text-xl font-bold font-mono text-gray-900 dark:text-white">{num(resolvingDiscrepancy.actual_remaining)}</p></div>
              <div><p className="text-xs text-gray-500 dark:text-gray-400">Diff</p><p className={`text-xl font-bold font-mono ${num(resolvingDiscrepancy.discrepancy_quantity) < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{num(resolvingDiscrepancy.discrepancy_quantity) > 0 ? "+" : ""}{num(resolvingDiscrepancy.discrepancy_quantity)}</p></div>
            </div>
            <Select label="Resolution Action" value={discResolveForm.action}
              onChange={(e) => setDiscResolveForm(f => ({ ...f, action: e.target.value as ResolveDiscrepancyInput["action"] }))}
              options={[
                { value: "manual_recount", label: "Manual recount (mark reviewed)" },
                { value: "accept_loss", label: "Accept loss (record waste)" },
                { value: "adjust_batch", label: "Adjust batch to quantity" },
              ]} />
            {discResolveForm.action === "adjust_batch" && (
              <Input label="Adjusted Quantity" type="number" value={discResolveForm.adjustment_quantity} onChange={(e) => setDiscResolveForm(f => ({ ...f, adjustment_quantity: e.target.value }))} />
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full h-20 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none" placeholder="Optional notes..." value={discResolveForm.notes} onChange={(e) => setDiscResolveForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setResolvingDiscrepancy(null)}>Cancel</Button>
              <Button variant="primary" className="flex-1" disabled={resolveDiscMutation.isPending} onClick={submitResolveDiscrepancy}><Check className="w-4 h-4" />{resolveDiscMutation.isPending ? "Resolving..." : "Resolve"}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ───── Resolve Expiration Modal ───── */}
      <Modal isOpen={!!resolvingExpiration} onClose={() => setResolvingExpiration(null)} title="Resolve Expiration Alert" size="sm">
        {resolvingExpiration && (
          <div className="space-y-4">
            {resolveExpMutation.isError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{humanizeError(resolveExpMutation.error, "Failed to resolve.")}</div>}
            <Select label="Action" value={expResolveForm.action}
              onChange={(e) => setExpResolveForm(f => ({ ...f, action: e.target.value as ResolveExpirationInput["action"] }))}
              options={[
                { value: "disposed", label: "Disposed" },
                { value: "sold", label: "Sold" },
                { value: "extended", label: "Extended" },
                { value: "other", label: "Other" },
              ]} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full h-20 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none" placeholder="Optional notes..." value={expResolveForm.notes} onChange={(e) => setExpResolveForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setResolvingExpiration(null)}>Cancel</Button>
              <Button variant="primary" className="flex-1" disabled={resolveExpMutation.isPending} onClick={submitResolveExpiration}><Check className="w-4 h-4" />{resolveExpMutation.isPending ? "Resolving..." : "Resolve"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
