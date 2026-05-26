"use client"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Plus, Pencil, Trash2, X, Search } from "lucide-react"

interface TableType {
  id: string; name: string; default_capacity: number
  shape: "round" | "square" | "rectangle" | "bar"
  location: "indoor" | "outdoor" | "both"; is_active: boolean
}


const SHAPE_EMOJI: Record<string, string> = { round: "⭕", square: "⬜", rectangle: "▬", bar: "🪑" }
const LOC_COLORS: Record<string, string> = {
  indoor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  outdoor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  both: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

export default function TableTypesPage() {
  const [types, setTypes] = useState<TableType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TableType | null>(null)
  const [form, setForm] = useState({ name: "", default_capacity: 4, shape: "square" as TableType["shape"], location: "indoor" as TableType["location"] })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchTypes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: any[] }>("/api/business/table-types")
      setTypes(res.data.map((t: any) => ({
        id: t.id,
        name: t.name,
        default_capacity: t.default_capacity ?? 4,
        shape: t.shape ?? "square",
        location: t.location ?? "indoor",
        is_active: t.is_active,
      })))
    } catch (e: any) {
      setError(e.message ?? "Failed to load table types")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTypes() }, [])

  const filtered = types.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  const openAdd = () => { setEditing(null); setForm({ name: "", default_capacity: 4, shape: "square", location: "indoor" }); setShowModal(true) }
  const openEdit = (t: TableType) => { setEditing(t); setForm({ name: t.name, default_capacity: t.default_capacity, shape: t.shape, location: t.location }); setShowModal(true) }
  const save = async () => {
    if (!form.name.trim()) return
    setError(null)
    try {
      if (editing) {
        await apiFetch(`/api/business/table-types/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) })
      } else {
        await apiFetch("/api/business/table-types", { method: "POST", body: JSON.stringify(form) })
      }
      await fetchTypes()
      setShowModal(false)
    } catch (e: any) {
      setError(e.message ?? "Failed to save table type")
    }
  }
  const remove = async (id: string) => {
    setConfirmDelete(null)
    setError(null)
    try {
      await apiFetch(`/api/business/table-types/${id}`, { method: "DELETE" })
      await fetchTypes()
    } catch (e: any) {
      setError(e.message ?? "Failed to delete table type")
    }
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search table types..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Name", "Shape", "Capacity", "Location", "Status", "Actions"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{SHAPE_EMOJI[t.shape]} {t.shape}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.default_capacity} guests</td>
                <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${LOC_COLORS[t.location]}`}>{t.location}</span></td>
                <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"><Pencil className="w-4 h-4" /></button>
                    {confirmDelete === t.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => remove(t.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Table Type" : "New Table Type"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Round 6-Top" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Capacity</label>
                <input type="number" min={1} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.default_capacity} onChange={e => setForm(p => ({ ...p, default_capacity: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shape</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.shape} onChange={e => setForm(p => ({ ...p, shape: e.target.value as TableType["shape"] }))}>
                  {["round", "square", "rectangle", "bar"].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value as TableType["location"] }))}>
                {["indoor", "outdoor", "both"].map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">{editing ? "Save" : "Add Type"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
