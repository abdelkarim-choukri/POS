"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Tag, Calendar, ChevronDown, ChevronRight } from "lucide-react"

interface VersionLogMenu {
  id: string
  name: string
  slug: string
  sort_order: number
}

interface VersionLogEntry {
  id: string
  menu_id: string
  version: string
  title: string
  released_at: string
  notes: string
  type: "feature" | "fix" | "improvement" | "breaking"
}

const mockMenus: VersionLogMenu[] = [
  { id: "vm-1", name: "Backend API", slug: "backend-api", sort_order: 1 },
  { id: "vm-2", name: "Terminal App", slug: "terminal-app", sort_order: 2 },
  { id: "vm-3", name: "Dashboard", slug: "dashboard", sort_order: 3 },
]

const mockEntries: VersionLogEntry[] = [
  { id: "ve-1", menu_id: "vm-1", version: "v2.5.0", title: "Points Exchange & Chain Operations", released_at: "2025-01-20", notes: "Added points exchange rules with per-customer daily limits. Chain franchise module with max 2-level hierarchy. CHN-052 fulfills child PO from parent warehouse.", type: "feature" },
  { id: "ve-2", menu_id: "vm-1", version: "v2.4.1", title: "TVA Declaration Fix", released_at: "2025-01-15", notes: "Fixed calendar date grouping for TVA reports. DGI audit now uses calendar date not settlement cutoff.", type: "fix" },
  { id: "ve-3", menu_id: "vm-1", version: "v2.4.0", title: "Restaurant Operations", released_at: "2025-01-10", notes: "Table sessions, floor plan WebSocket, KDS integration, split billing (by item/even/custom).", type: "feature" },
  { id: "ve-4", menu_id: "vm-2", version: "v1.8.0", title: "Offline Sync & Loyalty Lookup", released_at: "2025-01-18", notes: "Customer quick-add on terminal. Points balance shown on receipt. Improved offline queue handling.", type: "feature" },
  { id: "ve-5", menu_id: "vm-2", version: "v1.7.2", title: "KDS Status Bugfix", released_at: "2025-01-08", notes: "Fixed race condition on simultaneous item status updates from multiple KDS screens.", type: "fix" },
  { id: "ve-6", menu_id: "vm-3", version: "v3.2.0", title: "Reports Module", released_at: "2025-01-12", notes: "26 reports across sales, payments, customers, inventory, TVA. Universal response schema. i18n (fr/ar/en).", type: "feature" },
]

const TYPE_STYLES: Record<string, string> = {
  feature: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  fix: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  improvement: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  breaking: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
}

export default function VersionLogPage() {
  const [menus] = useState(mockMenus)
  const [entries, setEntries] = useState(mockEntries)
  const [activeMenu, setActiveMenu] = useState("vm-1")
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ve-1"]))
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<VersionLogEntry | null>(null)
  const [form, setForm] = useState({ version: "", title: "", released_at: "", notes: "", type: "feature" as VersionLogEntry["type"] })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = entries.filter(e => e.menu_id === activeMenu)

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ version: "", title: "", released_at: "", notes: "", type: "feature" })
    setShowModal(true)
  }

  const openEdit = (entry: VersionLogEntry) => {
    setEditing(entry)
    setForm({ version: entry.version, title: entry.title, released_at: entry.released_at, notes: entry.notes, type: entry.type })
    setShowModal(true)
  }

  const save = () => {
    if (!form.version.trim() || !form.title.trim()) return
    if (editing) {
      setEntries(prev => prev.map(e => e.id === editing.id ? { ...e, ...form } : e))
    } else {
      setEntries(prev => [...prev, { id: `ve-${Date.now()}`, menu_id: activeMenu, ...form }])
    }
    setShowModal(false)
  }

  const remove = (id: string) => { setEntries(prev => prev.filter(e => e.id !== id)); setConfirmDelete(null) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {menus.map(menu => (
            <button key={menu.id} onClick={() => setActiveMenu(menu.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                activeMenu === menu.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                  : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"
              }`}>
              {menu.name}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">No version entries yet for this menu.</div>
        )}
        {filtered.sort((a, b) => b.released_at.localeCompare(a.released_at)).map(entry => (
          <div key={entry.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors"
              onClick={() => toggleExpand(entry.id)}>
              <div className="flex items-center gap-3">
                <button className="text-gray-400">
                  {expanded.has(entry.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-semibold font-mono text-indigo-700 dark:text-indigo-300">{entry.version}</code>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_STYLES[entry.type]}`}>{entry.type}</span>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{entry.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
                  <Calendar className="w-3.5 h-3.5" />
                  {entry.released_at}
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
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3 whitespace-pre-line">{entry.notes}</p>
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version *</label>
                  <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="v2.6.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as VersionLogEntry["type"] }))}>
                    <option value="feature">Feature</option>
                    <option value="fix">Fix</option>
                    <option value="improvement">Improvement</option>
                    <option value="breaking">Breaking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Released At</label>
                  <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.released_at} onChange={e => setForm(p => ({ ...p, released_at: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Release title..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Release Notes</label>
                <textarea className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={4} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Describe what changed..." />
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
