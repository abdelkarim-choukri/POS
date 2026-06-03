"use client"
import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, X, Calendar, ChevronDown, ChevronRight } from "lucide-react"
import { apiFetch } from "@/lib/api"

// Backend-accurate shapes:
//   menus  → GET /api/super/version-log/menus           → { id, name, sort_order }
//   entries→ GET /api/auth/version-log/entries?menu_id= → { id, menu_id, version, description, published_at, expires_at }
//   create → POST  /api/super/version-log/entries   { menu_id, version, description, published_at?, expires_at? }
//   update → PATCH /api/super/version-log/entries/:id { version?, description?, expires_at? }
//   delete → DELETE /api/super/version-log/entries/:id
interface VersionLogMenu {
  id: string
  name: string
  sort_order: number
}

interface VersionLogEntry {
  id: string
  menu_id: string
  version: string
  description: string
  published_at: string
  expires_at: string | null
}

export default function VersionLogPage() {
  const [menus, setMenus] = useState<VersionLogMenu[]>([])
  const [entries, setEntries] = useState<VersionLogEntry[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<VersionLogEntry | null>(null)
  const [form, setForm] = useState({ version: "", description: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMenus = useCallback(async () => {
    try {
      const data = await apiFetch<VersionLogMenu[]>("/api/super/version-log/menus")
      setMenus(data)
      if (data.length > 0) setSelectedMenuId(prev => prev ?? data[0].id)
    } catch (e: any) {
      setError(e.message ?? "Failed to load menus")
    }
  }, [])

  const fetchEntries = useCallback(async (menuId: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ data: VersionLogEntry[]; total: number }>(
        `/api/auth/version-log/entries?menu_id=${menuId}&page=1&limit=50`
      )
      setEntries(data.data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load entries")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMenus() }, [fetchMenus])
  useEffect(() => { if (selectedMenuId) fetchEntries(selectedMenuId) }, [selectedMenuId, fetchEntries])

  const filtered = entries.filter(e => e.menu_id === selectedMenuId)

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ version: "", description: "" })
    setShowModal(true)
  }

  const openEdit = (entry: VersionLogEntry) => {
    setEditing(entry)
    setForm({ version: entry.version, description: entry.description })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.version.trim() || !form.description.trim()) return
    try {
      if (editing) {
        await apiFetch(`/api/super/version-log/entries/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ version: form.version, description: form.description }),
        })
      } else {
        if (!selectedMenuId) return
        await apiFetch("/api/super/version-log/entries", {
          method: "POST",
          body: JSON.stringify({ menu_id: selectedMenuId, version: form.version, description: form.description }),
        })
      }
      if (selectedMenuId) await fetchEntries(selectedMenuId)
      setShowModal(false)
    } catch (e: any) {
      setError(e.message ?? "Failed to save entry")
    }
  }

  const remove = async (id: string) => {
    try {
      await apiFetch(`/api/super/version-log/entries/${id}`, { method: "DELETE" })
      if (selectedMenuId) await fetchEntries(selectedMenuId)
      setConfirmDelete(null)
    } catch (e: any) {
      setError(e.message ?? "Failed to delete entry")
    }
  }

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—")

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {menus.map(menu => (
            <button key={menu.id} onClick={() => setSelectedMenuId(menu.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                selectedMenuId === menu.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                  : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"
              }`}>
              {menu.name}
            </button>
          ))}
        </div>
        <button onClick={openAdd} disabled={!selectedMenuId}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      <div className="space-y-3">
        {loading && <div className="py-16 text-center text-gray-400">Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">No version entries yet for this menu.</div>
        )}
        {!loading && [...filtered].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "")).map(entry => (
          <div key={entry.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors"
              onClick={() => toggleExpand(entry.id)}>
              <div className="flex items-center gap-3 min-w-0">
                <button className="text-gray-400">
                  {expanded.has(entry.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <code className="text-sm font-semibold font-mono text-indigo-700 dark:text-indigo-300 flex-shrink-0">{entry.version}</code>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{entry.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
                  <Calendar className="w-3.5 h-3.5" />
                  {fmt(entry.published_at)}
                </div>
                <button onClick={e => { e.stopPropagation(); openEdit(entry) }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmDelete === entry.id ? (
                  <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => remove(entry.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                  </div>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(entry.id) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {expanded.has(entry.id) && (
              <div className="px-14 pb-4 border-t border-gray-100 dark:border-[#1F1F23]">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3 whitespace-pre-line">{entry.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Entry" : "New Version Entry"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version *</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="v2.6.0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                <textarea className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={5} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe what changed in this release..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                {editing ? "Save Changes" : "Create Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
