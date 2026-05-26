"use client"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Plus, Pencil, Trash2, X, Search, FileText, Eye } from "lucide-react"

interface NotificationTemplate {
  id: string
  name: string
  channel: "sms" | "email" | "whatsapp"
  subject?: string
  body: string
  placeholders: string[]
  is_active: boolean
  send_count: number
}

const CHANNEL_BADGE: Record<string, string> = {
  sms: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  email: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  whatsapp: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<NotificationTemplate | null>(null)
  const [form, setForm] = useState({ name: "", channel: "sms" as NotificationTemplate["channel"], subject: "", body: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Per-operation loading/error states
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [previewResult, setPreviewResult] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Load templates on mount — GET /api/business/notifications/templates
  const loadTemplates = () => {
    setIsLoading(true)
    setLoadError(null)
    apiFetch<NotificationTemplate[] | { data: NotificationTemplate[] }>("/api/business/notifications/templates")
      .then(res => {
        const list = Array.isArray(res) ? res : (res as any).data ?? []
        setTemplates(list)
      })
      .catch((e: any) => setLoadError(e.message ?? "Failed to load templates"))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadTemplates() }, [])

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => {
    setEditing(null)
    setForm({ name: "", channel: "sms", subject: "", body: "" })
    setSaveError(null)
    setShowModal(true)
  }
  const openEdit = (t: NotificationTemplate) => {
    setEditing(t)
    setForm({ name: t.name, channel: t.channel, subject: t.subject ?? "", body: t.body })
    setSaveError(null)
    setShowModal(true)
  }

  // POST /api/business/notifications/templates  or  PATCH /api/business/notifications/templates/:id
  const save = () => {
    if (!form.name.trim() || !form.body.trim()) return
    setIsSaving(true)
    setSaveError(null)

    const body: Record<string, any> = {
      name: form.name,
      channel: form.channel,
      body: form.body,
      ...(form.channel === "email" && form.subject ? { subject: form.subject } : {}),
      placeholders: Array.from(form.body.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1]),
    }

    const url = editing
      ? `/api/business/notifications/templates/${editing.id}`
      : "/api/business/notifications/templates"
    const method = editing ? "PATCH" : "POST"

    apiFetch(url, { method, body: JSON.stringify(body) })
      .then(() => {
        setShowModal(false)
        loadTemplates()
      })
      .catch((e: any) => setSaveError(e.message ?? "Save failed"))
      .finally(() => setIsSaving(false))
  }

  // DELETE /api/business/notifications/templates/:id
  const remove = (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
    apiFetch(`/api/business/notifications/templates/${id}`, { method: "DELETE" })
      .then(() => {
        setConfirmDelete(null)
        loadTemplates()
      })
      .catch((e: any) => {
        setDeleteError(e.message ?? "Delete failed")
        setConfirmDelete(null)
      })
      .finally(() => setDeletingId(null))
  }

  // POST /api/business/notifications/templates/:id/preview
  const preview = (id: string) => {
    setPreviewingId(id)
    setPreviewResult(null)
    setPreviewError(null)
    apiFetch<{ rendered_body?: string; body?: string }>(`/api/business/notifications/templates/${id}/preview`, {
      method: "POST",
      body: JSON.stringify({}),
    })
      .then(res => setPreviewResult(res.rendered_body ?? res.body ?? JSON.stringify(res)))
      .catch((e: any) => setPreviewError(e.message ?? "Preview failed"))
      .finally(() => setPreviewingId(null))
  }

  return (
    <div className="space-y-6">
      {/* Global error banners */}
      {loadError && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
          <button onClick={() => setLoadError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
      {deleteError && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p>
          <button onClick={() => setDeleteError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No templates found.</p>
          )}
          {filtered.map(t => (
            <div key={t.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${CHANNEL_BADGE[t.channel]}`}>{t.channel}</span>
                      <span className="text-xs text-gray-400">{(t.send_count ?? 0).toLocaleString()} sent</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {/* Preview button */}
                  <button
                    onClick={() => preview(t.id)}
                    disabled={previewingId === t.id}
                    title="Preview rendered template"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {confirmDelete === t.id ? (
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => remove(t.id)}
                        disabled={deletingId === t.id}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50">
                        {deletingId === t.id ? "..." : "Yes"}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {t.subject && <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Subject: {t.subject}</p>}
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1a20] rounded-lg p-3 font-mono leading-relaxed">{t.body}</p>
              {t.placeholders && t.placeholders.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {t.placeholders.map(p => (
                    <code key={p} className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded">{`{{${p}}}`}</code>
                  ))}
                </div>
              )}
              {/* Per-template preview area */}
              {previewingId === t.id && (
                <p className="text-xs text-gray-400 italic">Loading preview...</p>
              )}
              {previewResult && previewingId !== t.id && previewResult && (
                // Show preview for the most-recently previewed template when it matches
                null
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview result — shown below the previewed card via global state */}
      {previewResult && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Preview Result</p>
            <button onClick={() => setPreviewResult(null)} className="p-1 text-indigo-400 hover:text-indigo-600"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-indigo-900 dark:text-indigo-100 font-mono whitespace-pre-wrap">{previewResult}</p>
        </div>
      )}
      {previewError && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">Preview failed: {previewError}</p>
          <button onClick={() => setPreviewError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Template" : "New Template"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Template name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value as NotificationTemplate["channel"] }))}>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>
            {form.channel === "email" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body * (use {"{{placeholder}}"} syntax)</label>
              <textarea className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                rows={4} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Hello {{customer_name}}, ..." />
            </div>
            {/* Inline save error */}
            {saveError && (
              <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} disabled={isSaving} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button
                onClick={save}
                disabled={isSaving || !form.name.trim() || !form.body.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
