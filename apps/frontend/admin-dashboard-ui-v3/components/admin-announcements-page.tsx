"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Megaphone, Calendar, Building2, Eye } from "lucide-react"

interface AdminAnnouncement {
  id: string
  title: string
  body: string
  target_business_types: string[]
  starts_at: string
  ends_at: string
  is_active: boolean
  priority: "low" | "medium" | "high"
  created_at: string
  view_count: number
  dismiss_count: number
}

const ALL_TYPES = ["retail", "restaurant", "pharmacy", "salon", "hotel"]

const mockAnnouncements: AdminAnnouncement[] = [
  {
    id: "aa-1",
    title: "New TVA Compliance Update — Finance Law 50-25",
    body: "Important update regarding Finance Law 50-25 requirements. All businesses must review the updated TVA declaration process effective from January 2025. Please ensure your ICE and IF numbers are correctly configured in your business profile.",
    target_business_types: ["retail", "restaurant", "pharmacy", "salon", "hotel"],
    starts_at: "2025-01-01", ends_at: "2025-03-31",
    is_active: true, priority: "high",
    created_at: "2024-12-20", view_count: 1240, dismiss_count: 387,
  },
  {
    id: "aa-2",
    title: "System Maintenance — Sunday January 26",
    body: "Planned maintenance on Sunday January 26, 2025 from 02:00–04:00 AM (Casablanca time). The system will be unavailable during this window. All terminal offline queues will sync automatically once service resumes.",
    target_business_types: ["retail", "restaurant", "pharmacy"],
    starts_at: "2025-01-20", ends_at: "2025-01-27",
    is_active: true, priority: "medium",
    created_at: "2025-01-15", view_count: 892, dismiss_count: 612,
  },
  {
    id: "aa-3",
    title: "Loyalty Program Enhancement — Cross-Location Points",
    body: "New features added to the loyalty program. Customers can now exchange points across chain locations using the points exchange module. Contact support to enable this feature for your chain.",
    target_business_types: ["retail"],
    starts_at: "2025-02-01", ends_at: "2025-04-30",
    is_active: false, priority: "low",
    created_at: "2025-01-18", view_count: 0, dismiss_count: 0,
  },
]

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(mockAnnouncements)
  const [showModal, setShowModal] = useState(false)
  const [viewing, setViewing] = useState<AdminAnnouncement | null>(null)
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null)
  const [form, setForm] = useState({
    title: "", body: "", starts_at: "", ends_at: "",
    priority: "medium" as AdminAnnouncement["priority"],
    target_business_types: [...ALL_TYPES],
    is_active: true,
  })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const openAdd = () => {
    setEditing(null)
    setForm({ title: "", body: "", starts_at: "", ends_at: "", priority: "medium", target_business_types: [...ALL_TYPES], is_active: true })
    setShowModal(true)
  }

  const openEdit = (ann: AdminAnnouncement) => {
    setEditing(ann)
    setForm({ title: ann.title, body: ann.body, starts_at: ann.starts_at, ends_at: ann.ends_at, priority: ann.priority, target_business_types: [...ann.target_business_types], is_active: ann.is_active })
    setShowModal(true)
  }

  const save = () => {
    if (!form.title.trim() || !form.body.trim()) return
    if (editing) {
      setAnnouncements(prev => prev.map(a => a.id === editing.id ? { ...a, ...form } : a))
    } else {
      setAnnouncements(prev => [...prev, {
        id: `aa-${Date.now()}`, ...form,
        created_at: "2025-01-21", view_count: 0, dismiss_count: 0,
      }])
    }
    setShowModal(false)
  }

  const remove = (id: string) => { setAnnouncements(prev => prev.filter(a => a.id !== id)); setConfirmDelete(null) }

  const toggleType = (type: string) => {
    setForm(prev => ({
      ...prev,
      target_business_types: prev.target_business_types.includes(type)
        ? prev.target_business_types.filter(t => t !== type)
        : [...prev.target_business_types, type],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create platform-wide announcements visible to all business dashboards.
        </p>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ann.priority === "high" ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Megaphone className={`w-4 h-4 ${ann.priority === "high" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{ann.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[ann.priority]}`}>{ann.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ann.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {ann.is_active ? "Active" : "Draft"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{ann.body}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setViewing(ann)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => openEdit(ann)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmDelete === ann.id ? (
                  <div className="flex gap-1 items-center">
                    <button onClick={() => remove(ann.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(ann.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-600 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />{ann.starts_at} → {ann.ends_at}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {ann.target_business_types.length === ALL_TYPES.length ? "All types" : ann.target_business_types.join(", ")}
              </span>
              <span>{ann.view_count.toLocaleString()} views</span>
              <span>{ann.dismiss_count.toLocaleString()} dismissed</span>
              <span>Created {ann.created_at}</span>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="py-16 text-center text-gray-400">No announcements yet.</div>
        )}
      </div>

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{viewing.title}</h3>
              <button onClick={() => setViewing(null)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{viewing.body}</p>
            <div className="text-xs text-gray-400 dark:text-gray-600 space-y-1">
              <p>Period: {viewing.starts_at} → {viewing.ends_at}</p>
              <p>Targets: {viewing.target_business_types.join(", ")}</p>
              <p>Views: {viewing.view_count.toLocaleString()} · Dismissed: {viewing.dismiss_count.toLocaleString()}</p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setViewing(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Announcement" : "New Announcement"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body *</label>
                <textarea className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={4} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Announcement body..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as AdminAnnouncement["priority"] }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active (visible to businesses)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Starts At</label>
                  <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ends At</label>
                  <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Business Types</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TYPES.map(type => (
                    <button key={type} onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-all capitalize ${
                        form.target_business_types.includes(type)
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                          : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                {editing ? "Save Changes" : "Create Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
