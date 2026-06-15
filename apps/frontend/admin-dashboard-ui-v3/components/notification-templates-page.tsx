"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, X, Search, FileText, Eye } from "lucide-react"
import { templatesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { NotificationTemplate, NotificationChannelKey, TemplatePreview } from "@/lib/merchant/types"

/**
 * Notification Templates — TanStack Query migration (owner/manager: COM-040..044).
 *
 * Ground truth (notifications.controller + entity/DTOs):
 *   - GET returns a PLAIN array. Cols: channel, name, subject?, body,
 *     whatsapp_template_id?, is_transactional, is_active. There is NO `placeholders`
 *     or `send_count` — the old create/update sent a computed `placeholders` array →
 *     forbidNonWhitelisted 400, and update also sent `channel` (immutable) → 400.
 *   - Placeholders are now derived client-side from the body for DISPLAY only.
 *   - Preview → { subject, body, channel, is_transactional }.
 */

const CHANNEL_BADGE: Record<string, string> = {
  sms: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  email: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  whatsapp: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}
const placeholdersOf = (body: string) => Array.from(new Set(Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1])))

export default function NotificationTemplatesPage() {
  const queryClient = useQueryClient()
  const templatesQuery = useQuery({ queryKey: merchantKeys.notifTemplates.list(), queryFn: templatesApi.list })
  const templates = templatesQuery.data ?? []

  const [search, setSearch] = useState("")
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; t: NotificationTemplate } | null>(null)
  const [form, setForm] = useState({ name: "", channel: "sms" as NotificationChannelKey, subject: "", body: "", is_active: true })
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ id: string; data: TemplatePreview } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.notifTemplates.all })

  const saveM = useMutation({
    mutationFn: () => {
      if (modal?.mode === "edit") {
        // channel is immutable — never sent on update.
        return templatesApi.update(modal.t.id, { name: form.name.trim(), body: form.body.trim(), subject: form.subject.trim() || undefined, is_active: form.is_active })
      }
      return templatesApi.create({ channel: form.channel, name: form.name.trim(), body: form.body.trim(), ...(form.subject.trim() ? { subject: form.subject.trim() } : {}), is_active: form.is_active })
    },
    onSuccess: () => { invalidate(); setModal(null) },
    onError: (e) => setFormError(humanizeError(e, "Save failed.")),
  })
  const deleteM = useMutation({ mutationFn: (id: string) => templatesApi.remove(id), onSuccess: () => { invalidate(); setConfirmDelete(null) } })
  const previewM = useMutation({
    mutationFn: (id: string) => templatesApi.preview(id),
    onSuccess: (data, id) => { setPreviewError(null); setPreview({ id, data }) },
    onError: (e) => setPreviewError(humanizeError(e, "Preview failed.")),
  })

  const filtered = useMemo(() => templates.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase())), [templates, search])

  const openAdd = () => { setForm({ name: "", channel: "sms", subject: "", body: "", is_active: true }); setFormError(null); setModal({ mode: "create" }) }
  const openEdit = (t: NotificationTemplate) => { setForm({ name: t.name, channel: t.channel, subject: t.subject ?? "", body: t.body, is_active: t.is_active }); setFormError(null); setModal({ mode: "edit", t }) }
  const submit = () => { if (!form.name.trim() || !form.body.trim()) { setFormError("Name and body are required."); return } ; setFormError(null); saveM.mutate() }

  const loadError = templatesQuery.isError ? humanizeError(templatesQuery.error, "Failed to load templates.") : null

  return (
    <div className="space-y-6">
      {loadError && <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><p className="text-sm text-red-700 dark:text-red-400">{loadError}</p><button onClick={() => templatesQuery.refetch()} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded"><X className="w-4 h-4 text-red-500" /></button></div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"><Plus className="w-4 h-4" /> New Template</button>
      </div>

      {previewError && <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><p className="text-sm text-red-700 dark:text-red-400">Preview failed: {previewError}</p><button onClick={() => setPreviewError(null)} className="p-1"><X className="w-4 h-4 text-red-500" /></button></div>}

      {templatesQuery.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 animate-pulse"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" /></div>)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No templates found.</p>}
          {filtered.map((t) => {
            const placeholders = placeholdersOf(t.body)
            return (
              <div key={t.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${CHANNEL_BADGE[t.channel]}`}>{t.channel}</span>
                        {!t.is_active && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-[#1F1F23] dark:text-gray-400">Inactive</span>}
                        {t.is_transactional && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Transactional</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => previewM.mutate(t.id)} disabled={previewM.isPending} title="Preview rendered template" className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"><Pencil className="w-4 h-4" /></button>
                    {confirmDelete === t.id ? (
                      <span className="flex gap-1 items-center">
                        <button onClick={() => deleteM.mutate(t.id)} disabled={deleteM.isPending} className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50">{deleteM.isPending ? "..." : "Yes"}</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
                {t.subject && <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Subject: {t.subject}</p>}
                <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1a20] rounded-lg p-3 font-mono leading-relaxed whitespace-pre-wrap">{t.body}</p>
                {placeholders.length > 0 && <div className="flex flex-wrap gap-1">{placeholders.map((p) => <code key={p} className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded">{`{{${p}}}`}</code>)}</div>}
                {preview?.id === t.id && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1"><p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase">Preview</p><button onClick={() => setPreview(null)} className="p-0.5 text-indigo-400 hover:text-indigo-600"><X className="w-3.5 h-3.5" /></button></div>
                    {preview.data.subject && <p className="text-sm text-indigo-900 dark:text-indigo-100 font-medium">Subject: {preview.data.subject}</p>}
                    <p className="text-sm text-indigo-900 dark:text-indigo-100 font-mono whitespace-pre-wrap">{preview.data.body}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{modal.mode === "edit" ? "Edit Template" : "New Template"}</h3>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Template name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel{modal.mode === "edit" && <span className="ml-1 text-xs text-gray-400">(immutable)</span>}</label>
                <select disabled={modal.mode === "edit"} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60" value={form.channel} onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value as NotificationChannelKey }))}>
                  <option value="sms">SMS</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>
            {form.channel === "email" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Email subject" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body * (use {"{{placeholder}}"} syntax)</label>
              <textarea className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono" rows={4} value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} placeholder="Hello {{customer_name}}, ..." />
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700 dark:text-gray-300">Active</span></label>
            {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(null)} disabled={saveM.isPending} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={submit} disabled={saveM.isPending || !form.name.trim() || !form.body.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{saveM.isPending ? "Saving..." : modal.mode === "edit" ? "Save Changes" : "Create Template"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
