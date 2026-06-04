"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Plus, Pencil, X, User, Shield, Clock, Eye, EyeOff, AlertCircle } from "lucide-react"
import { employeesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import { EMPLOYEE_PERMISSION_GROUPS } from "@/lib/merchant/types"
import type { Employee, EmployeeRole } from "@/lib/merchant/types"

function n(v: unknown): number {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(x) ? x : 0
}
function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString() : "-" }
function fmtTime(iso: string | null) { return iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "-" }
function fmtHours(h: string | null) { const x = n(h); return h != null ? `${Math.floor(x)}h ${Math.round((x % 1) * 60)}m` : "-" }

const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
]
const ALL_PERM_KEYS = EMPLOYEE_PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key))

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "gray" | "blue" | "purple" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }: { children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md"; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  }
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" }
  return <button className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>
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

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-gray-300 dark:border-[#2a2a33]" />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
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

function SlidePanel({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[560px] bg-white dark:bg-[#0F0F12] shadow-2xl border-l border-gray-200 dark:border-[#1F1F23] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-hide">{children}</div>
      </div>
    </div>
  )
}

const ROLE_BADGE: Record<string, "purple" | "blue" | "gray"> = { owner: "purple", manager: "blue", employee: "gray" }
const emptyPerms = (): Record<string, boolean> => Object.fromEntries(ALL_PERM_KEYS.map(k => [k, false]))

type EmpForm = {
  first_name: string; last_name: string; email: string; role: EmployeeRole;
  pin: string; password: string; dashboard_access: boolean; permissions: Record<string, boolean>
}
const EMPTY_FORM: EmpForm = { first_name: "", last_name: "", email: "", role: "employee", pin: "", password: "", dashboard_access: false, permissions: emptyPerms() }

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | EmployeeRole>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState<EmpForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const [showClock, setShowClock] = useState(false)
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [selected, setSelected] = useState<Employee | null>(null)

  const employeesQuery = useQuery({ queryKey: merchantKeys.employees.list(), queryFn: () => employeesApi.list() })
  const employees = employeesQuery.data ?? []

  const clockQuery = useQuery({
    queryKey: merchantKeys.employees.clockHistory(selected?.id ?? ""),
    queryFn: () => employeesApi.clockHistory(selected!.id),
    enabled: showClock && !!selected,
  })
  const clockEntries = clockQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.employees.all })
  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof employeesApi.create>[0]) => employeesApi.create(input),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to add employee.")),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof employeesApi.update>[1] }) => employeesApi.update(id, input),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to update employee.")),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => employeesApi.setStatus(id, is_active),
    onSuccess: () => { invalidate(); setShowStatusConfirm(false); setSelected(null) },
  })

  const filtered = useMemo(() => employees.filter(e => {
    const q = searchQuery.trim().toLowerCase()
    if (q && !`${e.first_name} ${e.last_name}`.toLowerCase().includes(q) && !(e.email ?? "").toLowerCase().includes(q)) return false
    if (roleFilter !== "all" && e.role !== roleFilter) return false
    if (statusFilter === "active" && !e.is_active) return false
    if (statusFilter === "inactive" && e.is_active) return false
    return true
  }), [employees, searchQuery, roleFilter, statusFilter])

  const totalMinutes = clockEntries.reduce((s, e) => s + n(e.total_hours) * 60, 0)

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM, permissions: emptyPerms() }); setFormError(null); setShowModal(true) }
  const openEdit = (e: Employee) => {
    setEditing(e)
    setForm({
      first_name: e.first_name, last_name: e.last_name, email: e.email ?? "", role: e.role,
      pin: "", password: "", dashboard_access: e.dashboard_access,
      permissions: { ...emptyPerms(), ...(e.permissions ?? {}) },
    })
    setFormError(null); setShowModal(true)
  }
  const setPerm = (key: string, v: boolean) => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: v } }))

  const submit = () => {
    setFormError(null)
    if (!form.first_name.trim() || !form.last_name.trim()) { setFormError("First and last name are required."); return }
    if (form.pin && !/^\d{4,6}$/.test(form.pin)) { setFormError("PIN must be 4–6 digits."); return }
    if (editing) {
      updateMutation.mutate({ id: editing.id, input: {
        first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim() || undefined,
        role: form.role, dashboard_access: form.dashboard_access, permissions: form.permissions,
        ...(form.pin ? { pin: form.pin } : {}),
      } })
    } else {
      if (form.password.length < 6) { setFormError("Password is required (min 6 characters)."); return }
      createMutation.mutate({
        first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim() || undefined,
        password: form.password, role: form.role, dashboard_access: form.dashboard_access, permissions: form.permissions,
        ...(form.pin ? { pin: form.pin } : {}),
      })
    }
  }

  const openClock = (e: Employee) => { setSelected(e); setShowClock(true) }
  const askToggle = (e: Employee) => { setSelected(e); setShowStatusConfirm(true) }

  const listError = employeesQuery.isError ? humanizeError(employeesQuery.error, "Failed to load employees.") : null
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="h-full">
      {listError && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your team and permissions</p>
        </div>
        <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Employee</Button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
          </div>
          <Select options={[{ value: "all", label: "All Roles" }, ...ROLE_OPTIONS]} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)} />
          <Select options={[{ value: "all", label: "All Status" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} />
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        {employeesQuery.isLoading && <div className="py-10 text-center text-gray-400">Loading...</div>}
        {!employeesQuery.isLoading && (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dashboard</th>
                <th className="text-center p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((e) => (
                <tr key={e.id} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 ${!e.is_active ? 'opacity-60' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {(e.first_name[0] ?? "").toUpperCase()}{(e.last_name[0] ?? "").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{e.first_name} {e.last_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Joined {fmtDate(e.created_at)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><span className="text-sm text-gray-600 dark:text-gray-300">{e.email || "—"}</span></td>
                  <td className="p-4"><Badge color={ROLE_BADGE[e.role] ?? "gray"}>{e.role.charAt(0).toUpperCase() + e.role.slice(1)}</Badge></td>
                  <td className="p-4">{e.dashboard_access ? <Badge color="blue">Access</Badge> : <span className="text-sm text-gray-400">—</span>}</td>
                  <td className="p-4 text-center"><Badge color={e.is_active ? "green" : "gray"}>{e.is_active ? "Active" : "Inactive"}</Badge></td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openClock(e)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Clock History"><Clock className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(e)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => askToggle(e)} className={`p-2 rounded-lg ${e.is_active ? 'text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'}`} title={e.is_active ? "Deactivate" : "Activate"}>
                        {e.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!employeesQuery.isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No employees found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search or filters</p>
            <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Employee</Button>
          </div>
        )}
      </div>

      {/* Add/Edit Employee Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Employee" : "Add Employee"} size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" placeholder="Ahmed" value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} />
            <Input label="Last Name *" placeholder="Benali" value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <Input label="Email" type="email" placeholder="ahmed@cafe.ma" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Role" options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value as EmployeeRole }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="PIN (4–6 digits)" type="password" placeholder="****" maxLength={6} value={form.pin} onChange={(e) => setForm(f => ({ ...f, pin: e.target.value }))} />
            {!editing && <Input label="Password * (min 6)" type="password" placeholder="********" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />}
          </div>

          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dashboard access</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Allow this employee to sign in to the admin dashboard</p>
            </div>
            <input type="checkbox" checked={form.dashboard_access} onChange={(e) => setForm(f => ({ ...f, dashboard_access: e.target.checked }))} className="w-4 h-4 rounded" />
          </label>

          <div className="border-t border-gray-200 dark:border-[#1F1F23] pt-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-500" />Terminal Permissions</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {EMPLOYEE_PERMISSION_GROUPS.map(group => (
                <div key={group.title}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{group.title}</p>
                  <div className="space-y-2">
                    {group.permissions.map(perm => (
                      <Checkbox key={perm.key} label={perm.label} checked={!!form.permissions[perm.key]} onChange={(v) => setPerm(perm.key, v)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {formError && <p className="text-sm text-red-500 dark:text-red-400">{formError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={saving} onClick={submit}>{saving ? "Saving..." : editing ? "Save Changes" : "Add Employee"}</Button>
          </div>
        </div>
      </Modal>

      {/* Clock History Panel */}
      <SlidePanel isOpen={showClock} onClose={() => setShowClock(false)} title={`Clock History — ${selected?.first_name ?? ""} ${selected?.last_name ?? ""}`}>
        <div className="p-5">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-[#1F1F23] rounded-xl p-4 mb-6">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">Total Hours (latest 50 entries)</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{Math.floor(totalMinutes / 60)}h {Math.round(totalMinutes % 60)}m</p>
          </div>
          <div className="border border-gray-200 dark:border-[#1F1F23] rounded-lg overflow-hidden">
            {clockQuery.isLoading ? <div className="text-center py-8 text-gray-400 text-sm">Loading...</div> : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Clock In</th>
                      <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Clock Out</th>
                      <th className="text-right p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {clockEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                        <td className="p-3 text-sm text-gray-900 dark:text-white">{fmtDate(entry.clock_in)}</td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300">{fmtTime(entry.clock_in)}</td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300">{fmtTime(entry.clock_out)}</td>
                        <td className="p-3 text-sm text-gray-900 dark:text-white text-right font-mono">{fmtHours(entry.total_hours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {clockEntries.length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No clock entries yet</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SlidePanel>

      {/* Status Confirm */}
      <Modal isOpen={showStatusConfirm} onClose={() => setShowStatusConfirm(false)} title="Confirm Status Change" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0"><AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
            <div>
              <p className="text-gray-900 dark:text-white">Are you sure you want to {selected?.is_active ? "deactivate" : "activate"} <strong>{selected?.first_name} {selected?.last_name}</strong>?</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selected?.is_active ? "This employee will no longer be able to log in to terminals." : "This employee will be able to log in to terminals again."}</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowStatusConfirm(false)} disabled={statusMutation.isPending}>Cancel</Button>
            <Button variant={selected?.is_active ? "danger" : "primary"} className="flex-1" disabled={statusMutation.isPending} onClick={() => selected && statusMutation.mutate({ id: selected.id, is_active: !selected.is_active })}>
              {statusMutation.isPending ? "Updating..." : selected?.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
