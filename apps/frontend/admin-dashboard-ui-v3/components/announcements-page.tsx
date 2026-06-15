"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Search, X, Megaphone, Pencil, Trash2, Globe, Users, AlertCircle } from "lucide-react"
import { announcementsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { BusinessAnnouncement, AnnouncementRole, CreateAnnouncementInput } from "@/lib/merchant/types"

/**
 * Business Announcements — TanStack Query migration.
 *
 * Ground truth (communications.controller COM-010/011 + entity/DTO):
 *   - GET /announcements and /announcements/for-me both return a PLAIN array (the
 *     old `res.data.map` threw → it fell back to MOCK announcements).
 *   - Columns: title, body, target_role∈{all,manager,employee}, display_until,
 *     is_active. The old UI invented `type`, `status`, `views_count`,
 *     `target_audience`/`target_roles[]` and sent them → forbidNonWhitelisted 400.
 *   - Create/Update DTO = { title, body, target_role?, display_until?, is_active? }.
 *     The old update sent `role` (not target_role) → 400. Writes are owner/manager.
 */

const ROLE_OPTIONS: { value: AnnouncementRole; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "manager", label: "Managers" },
  { value: "employee", label: "Employees" },
]
const roleLabel = (r: string) => ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r
const RoleIcon = ({ role }: { role: string }) => (role === "all" ? <Globe className="w-4 h-4" /> : <Users className="w-4 h-4" />)
const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : null)

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "gray" | "blue" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    gray: "bg-gray-100 text-gray-500 dark:bg-[#1F1F23] dark:text-gray-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[color]}`}>{children}</span>
}

const EMPTY = { title: "", body: "", target_role: "all" as AnnouncementRole, display_until: "", is_active: true }

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"

export default function AnnouncementsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"all" | "for-me">("all")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; a: BusinessAnnouncement } | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const listQuery = useQuery({ queryKey: merchantKeys.announcements.list(), queryFn: announcementsApi.list })
  const forMeQuery = useQuery({ queryKey: merchantKeys.announcements.forMe(), queryFn: announcementsApi.forMe, enabled: activeTab === "for-me" })
  const announcements = listQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.announcements.all })

  const buildInput = (): CreateAnnouncementInput => ({
    title: form.title.trim(),
    body: form.body.trim(),
    target_role: form.target_role,
    ...(form.display_until ? { display_until: new Date(form.display_until).toISOString() } : {}),
    is_active: form.is_active,
  })
  const createM = useMutation({ mutationFn: () => announcementsApi.create(buildInput()), onSuccess: () => { invalidate(); setModal(null) }, onError: (e) => setFormError(humanizeError(e, "Failed to create announcement.")) })
  const updateM = useMutation({ mutationFn: (id: string) => announcementsApi.update(id, buildInput()), onSuccess: () => { invalidate(); setModal(null) }, onError: (e) => setFormError(humanizeError(e, "Failed to update announcement.")) })
  const toggleM = useMutation({ mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => announcementsApi.update(id, { is_active }), onSuccess: invalidate })
  const deleteM = useMutation({ mutationFn: (id: string) => announcementsApi.remove(id), onSuccess: () => { invalidate(); setConfirmDelete(null) } })

  const filtered = useMemo(() => announcements.filter((a) => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? a.is_active : !a.is_active)
    return matchesSearch && matchesStatus
  }), [announcements, search, statusFilter])

  const openCreate = () => { setForm(EMPTY); setFormError(null); setModal({ mode: "create" }) }
  const openEdit = (a: BusinessAnnouncement) => { setForm({ title: a.title, body: a.body, target_role: a.target_role, display_until: a.display_until ? a.display_until.slice(0, 10) : "", is_active: a.is_active }); setFormError(null); setModal({ mode: "edit", a }) }
  const submit = () => { if (!form.title.trim() || !form.body.trim()) { setFormError("Title and body are required."); return } ; setFormError(null); modal?.mode === "edit" ? updateM.mutate(modal.a.id) : createM.mutate() }

  const saving = createM.isPending || updateM.isPending
  const listError = listQuery.isError ? humanizeError(listQuery.error, "Failed to load announcements.") : null

  return (
    <div className="space-y-5">
      {listError && <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"><AlertCircle className="w-4 h-4" />{listError}</div>}

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-[#1F1F23] p-1 rounded-xl w-fit">
          {([["all", "All Announcements"], ["for-me", "For Me"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === k ? "bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>{label}</button>
          ))}
        </div>
        {activeTab === "all" && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"><Plus className="w-4 h-4" />New Announcement</button>}
      </div>

      {activeTab === "all" ? (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Search announcements..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>

          {listQuery.isLoading ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => {
                const until = fmtDate(a.display_until)
                return (
                  <div key={a.id} className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center shrink-0"><Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{a.title}</h3>
                            <Badge color={a.is_active ? "green" : "gray"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                            <Badge color="blue"><RoleIcon role={a.target_role} />{roleLabel(a.target_role)}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{a.body}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{until ? `Shown until ${until}` : "No expiry"} · Created {fmtDate(a.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleM.mutate({ id: a.id, is_active: !a.is_active })} disabled={toggleM.isPending} title={a.is_active ? "Deactivate" : "Activate"} className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a20]">{a.is_active ? "Deactivate" : "Activate"}</button>
                        <button onClick={() => openEdit(a)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg"><Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                        {confirmDelete === a.id ? (
                          <span className="flex gap-1 items-center">
                            <button onClick={() => deleteM.mutate(a.id)} disabled={deleteM.isPending} className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50">{deleteM.isPending ? "..." : "Yes"}</button>
                            <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDelete(a.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && <div className="py-12 text-center text-gray-400">No announcements found</div>}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {forMeQuery.isLoading ? <div className="py-10 text-center text-gray-400">Loading...</div>
            : forMeQuery.isError ? <div className="py-10 text-center text-red-500 text-sm">{humanizeError(forMeQuery.error, "Failed to load.")}</div>
            : (forMeQuery.data ?? []).length === 0 ? <div className="py-12 text-center text-gray-400">No announcements for you right now</div>
            : (forMeQuery.data ?? []).map((a) => (
              <div key={a.id} className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-5">
                <div className="flex items-center gap-2"><Megaphone className="w-4 h-4 text-indigo-500" /><h3 className="font-semibold text-gray-900 dark:text-white">{a.title}</h3></div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{a.body}</p>
                {fmtDate(a.display_until) && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Shown until {fmtDate(a.display_until)}</p>}
              </div>
            ))}
        </div>
      )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Announcement" : "New Announcement"}>
        <div className="space-y-4">
          <div><label className={labelCls}>Title *</label><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Holiday hours" /></div>
          <div><label className={labelCls}>Message *</label><textarea rows={4} className={`${inputCls} resize-none`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Announcement text..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Audience</label><select className={inputCls} value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value as AnnouncementRole })}>{ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label className={labelCls}>Show until</label><input type="date" className={inputCls} value={form.display_until} onChange={(e) => setForm({ ...form, display_until: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700 dark:text-gray-300">Active (visible to the selected audience)</span></label>
          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg">Cancel</button>
            <button onClick={submit} disabled={saving || !form.title.trim() || !form.body.trim()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving..." : modal?.mode === "edit" ? "Save Changes" : "Create"}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
