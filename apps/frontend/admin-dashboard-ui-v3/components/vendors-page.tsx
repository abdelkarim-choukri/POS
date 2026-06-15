"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, X, Building2, Phone, Mail, MoreHorizontal, Pencil,
  Trash2, FileText, Eye,
} from "lucide-react"
import { vendorsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { Vendor, CreateVendorInput, UpdateVendorInput } from "@/lib/merchant/types"

// ── Reusable Components ──
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", className = "", onClick, disabled }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string; onClick?: () => void; disabled?: boolean }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
  }
  return <button className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props} />
    </div>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!isOpen) return null
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

type VendorForm = {
  name: string; code: string; contact_name: string; contact_email: string; contact_phone: string
  address: string; ice_number: string; if_number: string; payment_terms_days: string; notes: string
}
const emptyForm: VendorForm = { name: "", code: "", contact_name: "", contact_email: "", contact_phone: "", address: "", ice_number: "", if_number: "", payment_terms_days: "", notes: "" }
const toForm = (v: Vendor): VendorForm => ({
  name: v.name, code: v.code, contact_name: v.contact_name ?? "", contact_email: v.contact_email ?? "",
  contact_phone: v.contact_phone ?? "", address: v.address ?? "", ice_number: v.ice_number ?? "",
  if_number: v.if_number ?? "", payment_terms_days: String(v.payment_terms_days ?? ""), notes: v.notes ?? "",
})
const buildInput = (f: VendorForm): CreateVendorInput => {
  const i: CreateVendorInput = { name: f.name.trim(), code: f.code.trim() }
  if (f.contact_name.trim()) i.contact_name = f.contact_name.trim()
  if (f.contact_email.trim()) i.contact_email = f.contact_email.trim()
  if (f.contact_phone.trim()) i.contact_phone = f.contact_phone.trim()
  if (f.address.trim()) i.address = f.address.trim()
  if (f.ice_number.trim()) i.ice_number = f.ice_number.trim()
  if (f.if_number.trim()) i.if_number = f.if_number.trim()
  if (f.payment_terms_days.trim() && Number.isFinite(Number(f.payment_terms_days))) i.payment_terms_days = Number(f.payment_terms_days)
  if (f.notes.trim()) i.notes = f.notes.trim()
  return i
}
const termsLabel = (days: number) => (days > 0 ? `Net ${days}` : "COD")

export default function VendorsPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | null>(null)
  const [form, setForm] = useState<VendorForm>(emptyForm)
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null)

  // ── Queries ──
  const vendorsQuery = useQuery({ queryKey: merchantKeys.vendors.list(), queryFn: () => vendorsApi.list() })
  const vendors = vendorsQuery.data ?? []

  // ── Mutations ──
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: merchantKeys.vendors.list() })
  const createMutation = useMutation({
    mutationFn: (input: CreateVendorInput) => vendorsApi.create(input),
    onSuccess: () => { invalidateList(); setShowAddModal(false); setForm(emptyForm) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVendorInput }) => vendorsApi.update(id, input),
    onSuccess: (_d, { id }) => { invalidateList(); queryClient.invalidateQueries({ queryKey: merchantKeys.vendors.detail(id) }); setEditVendor(null); setForm(emptyForm) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorsApi.remove(id),
    onSuccess: () => { invalidateList(); setDeleteVendor(null) },
  })

  // ── Derived ──
  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return vendors.filter(v => {
      const matchesSearch = !q || v.name.toLowerCase().includes(q) || (v.contact_name ?? "").toLowerCase().includes(q) || v.code.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? v.is_active : !v.is_active)
      return matchesSearch && matchesStatus
    })
  }, [vendors, searchQuery, statusFilter])

  const openAdd = () => { setForm(emptyForm); setShowAddModal(true) }
  const openEdit = (v: Vendor) => { setEditVendor(v); setForm(toForm(v)); setShowDropdown(null) }
  const submitVendor = () => {
    const input = buildInput(form)
    if (editVendor) updateMutation.mutate({ id: editVendor.id, input })
    else createMutation.mutate(input)
  }

  const formError = createMutation.isError
    ? humanizeError(createMutation.error, "Failed to create vendor.")
    : updateMutation.isError ? humanizeError(updateMutation.error, "Failed to update vendor.") : null
  const listError = vendorsQuery.isError ? humanizeError(vendorsQuery.error, "Failed to load vendors.") : null
  const deleteError = deleteMutation.isError ? humanizeError(deleteMutation.error, "Failed to delete vendor.") : null
  const nameCodeValid = form.name.trim().length > 0 && form.code.trim().length > 0
  const activeCount = vendors.filter(v => v.is_active).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendors</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your suppliers and vendors</p>
        </div>
        <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Vendor</Button>
      </div>

      {/* Stats — only metrics the API actually provides */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: Building2, iconWrap: "bg-blue-100 dark:bg-blue-900/30", icon_: "text-blue-600 dark:text-blue-400", value: vendors.length, label: "Total Vendors" },
          { icon: FileText, iconWrap: "bg-green-100 dark:bg-green-900/30", icon_: "text-green-600 dark:text-green-400", value: activeCount, label: "Active" },
          { icon: Trash2, iconWrap: "bg-gray-100 dark:bg-gray-800", icon_: "text-gray-600 dark:text-gray-400", value: vendors.length - activeCount, label: "Inactive" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${s.iconWrap}`}>
              <s.icon className={`w-5 h-5 ${s.icon_}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{vendorsQuery.isLoading ? "…" : s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search vendors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {listError && <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{listError}</div>}
      {deleteError && <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{deleteError}</div>}

      {/* Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        {vendorsQuery.isLoading && <div className="py-10 text-center text-gray-400">Loading...</div>}
        {!vendorsQuery.isLoading && (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
              <tr>{["Vendor", "Contact", "Code", "Payment Terms", "Status", ""].map(h => (
                <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredVendors.map(vendor => (
                <tr key={vendor.id} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 ${!vendor.is_active ? "opacity-60" : ""}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold">{vendor.name.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{vendor.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{vendor.contact_name || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1"><Mail className="w-3 h-3" /> {vendor.contact_email || "—"}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {vendor.contact_phone || "—"}</p>
                    </div>
                  </td>
                  <td className="p-4"><code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">{vendor.code}</code></td>
                  <td className="p-4"><Badge color="blue">{termsLabel(vendor.payment_terms_days)}</Badge></td>
                  <td className="p-4"><Badge color={vendor.is_active ? "green" : "gray"}>{vendor.is_active ? "active" : "inactive"}</Badge></td>
                  <td className="p-4">
                    <div className="relative">
                      <button onClick={() => setShowDropdown(showDropdown === vendor.id ? null : vendor.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><MoreHorizontal className="w-4 h-4 text-gray-500" /></button>
                      {showDropdown === vendor.id && (
                        <>
                          <div className="fixed inset-0" onClick={() => setShowDropdown(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                            <button onClick={() => { setShowDropdown(null); onNavigate?.("vendor-detail", vendor.id) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]"><Eye className="w-4 h-4" /> View Details</button>
                            <button onClick={() => openEdit(vendor)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]"><Pencil className="w-4 h-4" /> Edit</button>
                            {vendor.is_active && <button onClick={() => { setDeleteVendor(vendor); setShowDropdown(null) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Deactivate</button>}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVendors.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-gray-400">No vendors found</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Vendor Modal */}
      <Modal isOpen={showAddModal || !!editVendor} onClose={() => { setShowAddModal(false); setEditVendor(null) }} title={editVendor ? "Edit Vendor" : "Add Vendor"} size="lg">
        <div className="space-y-4">
          {formError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vendor Name *" placeholder="Company name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
            <Input label="Code *" placeholder="e.g. VND-01" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} />
          </div>
          <Input label="Contact Name" placeholder="Contact person" value={form.contact_name} onChange={(e) => setForm(p => ({ ...p, contact_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Email" type="email" placeholder="vendor@example.com" value={form.contact_email} onChange={(e) => setForm(p => ({ ...p, contact_email: e.target.value }))} />
            <Input label="Contact Phone" placeholder="+212 6 XX XX XX XX" value={form.contact_phone} onChange={(e) => setForm(p => ({ ...p, contact_phone: e.target.value }))} />
          </div>
          <Input label="Address" placeholder="Full address" value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="ICE" placeholder="ICE number" value={form.ice_number} onChange={(e) => setForm(p => ({ ...p, ice_number: e.target.value }))} />
            <Input label="IF" placeholder="IF number" value={form.if_number} onChange={(e) => setForm(p => ({ ...p, if_number: e.target.value }))} />
            <Input label="Payment Terms (days)" type="number" placeholder="30" value={form.payment_terms_days} onChange={(e) => setForm(p => ({ ...p, payment_terms_days: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm h-20 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowAddModal(false); setEditVendor(null) }}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={submitVendor} disabled={!nameCodeValid || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editVendor ? "Save Changes" : "Add Vendor"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteVendor} onClose={() => setDeleteVendor(null)} title="Deactivate Vendor" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">Deactivate <strong>{deleteVendor?.name}</strong>? It will be hidden from active selection but its history is preserved.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteVendor(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={() => deleteVendor && deleteMutation.mutate(deleteVendor.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "..." : "Deactivate"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
