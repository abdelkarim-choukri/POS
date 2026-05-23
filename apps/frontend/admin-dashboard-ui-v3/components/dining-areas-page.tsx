"use client"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Plus, Pencil, Trash2, X, Search, LayoutGrid, Users } from "lucide-react"

interface DiningArea {
  id: string; name: string; description?: string
  table_count: number; capacity: number; is_active: boolean
}

const mockAreas: DiningArea[] = [
  { id: "da-1", name: "Main Hall", description: "Ground floor seating area", table_count: 12, capacity: 48, is_active: true },
  { id: "da-2", name: "Terrace", description: "Outdoor open-air section", table_count: 8, capacity: 32, is_active: true },
  { id: "da-3", name: "VIP Room", description: "Private dining room", table_count: 3, capacity: 18, is_active: true },
  { id: "da-4", name: "Bar Area", description: "Counter seating near bar", table_count: 6, capacity: 12, is_active: true },
  { id: "da-5", name: "Rooftop", description: "Seasonal rooftop lounge", table_count: 0, capacity: 0, is_active: false },
]

export default function DiningAreasPage() {
  const [areas, setAreas] = useState(mockAreas)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DiningArea | null>(null)
  const [form, setForm] = useState({ name: "", description: "", capacity: 0 })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchAreas = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: any[] }>("/api/business/dining-areas")
      setAreas(res.data.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        table_count: a.table_count ?? 0,
        capacity: a.capacity ?? 0,
        is_active: a.is_active,
      })))
    } catch (e: any) {
      setError(e.message ?? "Failed to load dining areas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAreas() }, [])

  const filtered = areas.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm({ name: "", description: "", capacity: 0 }); setShowModal(true) }
  const openEdit = (a: DiningArea) => { setEditing(a); setForm({ name: a.name, description: a.description ?? "", capacity: a.capacity }); setShowModal(true) }
  const save = async () => {
    if (!form.name.trim()) return
    try {
      if (editing) {
        await apiFetch(`/api/business/dining-areas/${editing.id}`, { method: "PUT", body: JSON.stringify(form) })
      } else {
        await apiFetch("/api/business/dining-areas", { method: "POST", body: JSON.stringify(form) })
      }
      setShowModal(false)
      await fetchAreas()
    } catch (e: any) {
      setError(e.message ?? "Failed to save dining area")
    }
  }
  const toggle = (id: string) => setAreas(prev => prev.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a))
  const remove = async (id: string) => {
    try {
      await apiFetch(`/api/business/dining-areas/${id}`, { method: "DELETE" })
      setAreas(prev => prev.filter(a => a.id !== id))
    } catch (e: any) {
      setError(e.message ?? "Failed to delete dining area")
    }
    setConfirmDelete(null)
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search areas..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Area
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(area => (
          <div key={area.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{area.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{area.table_count} tables</p>
                </div>
              </div>
              <button onClick={() => toggle(area.id)}>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${area.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                  {area.is_active ? "Active" : "Inactive"}
                </span>
              </button>
            </div>
            {area.description && <p className="text-sm text-gray-500 dark:text-gray-400">{area.description}</p>}
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" /> Capacity: {area.capacity} guests
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
              <button onClick={() => openEdit(area)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              {confirmDelete === area.id ? (
                <div className="flex gap-1 items-center">
                  <button onClick={() => remove(area.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                  <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(area.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-3 py-10 text-center text-gray-400">No dining areas found</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Area" : "New Dining Area"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            {[{ label: "Name *", key: "name", placeholder: "e.g. Main Hall" }, { label: "Description", key: "description", placeholder: "Optional" }].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Capacity</label>
              <input type="number" min={0} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                {editing ? "Save Changes" : "Add Area"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
