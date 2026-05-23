"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Search, Ruler } from "lucide-react"

interface UnitOfMeasure {
  id: string
  name: string
  symbol: string
  unit_type: "weight" | "volume" | "length" | "piece" | "area"
  is_active: boolean
}

const mockUnits: UnitOfMeasure[] = [
  { id: "u-1", name: "Kilogram", symbol: "kg", unit_type: "weight", is_active: true },
  { id: "u-2", name: "Gram", symbol: "g", unit_type: "weight", is_active: true },
  { id: "u-3", name: "Liter", symbol: "L", unit_type: "volume", is_active: true },
  { id: "u-4", name: "Milliliter", symbol: "mL", unit_type: "volume", is_active: true },
  { id: "u-5", name: "Piece", symbol: "pcs", unit_type: "piece", is_active: true },
  { id: "u-6", name: "Box", symbol: "box", unit_type: "piece", is_active: true },
  { id: "u-7", name: "Meter", symbol: "m", unit_type: "length", is_active: false },
]

const TYPE_COLORS: Record<string, string> = {
  weight: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  volume: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  length: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  piece: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  area: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
}

export default function UnitsOfMeasurePage() {
  const [units, setUnits] = useState(mockUnits)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null)
  const [form, setForm] = useState({ name: "", symbol: "", unit_type: "piece" as UnitOfMeasure["unit_type"] })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = units.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.symbol.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setEditing(null); setForm({ name: "", symbol: "", unit_type: "piece" }); setShowModal(true) }
  const openEdit = (u: UnitOfMeasure) => { setEditing(u); setForm({ name: u.name, symbol: u.symbol, unit_type: u.unit_type }); setShowModal(true) }

  const save = () => {
    if (!form.name.trim() || !form.symbol.trim()) return
    if (editing) {
      setUnits(prev => prev.map(u => u.id === editing.id ? { ...u, ...form } : u))
    } else {
      setUnits(prev => [...prev, { id: `u-${Date.now()}`, ...form, is_active: true }])
    }
    setShowModal(false)
  }

  const toggle = (id: string) => setUnits(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
  const remove = (id: string) => { setUnits(prev => prev.filter(u => u.id !== id)); setConfirmDelete(null) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search units..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>
              {["Name", "Symbol", "Type", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">{u.symbol}</code>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[u.unit_type]}`}>{u.unit_type}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(u.id)}>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDelete === u.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => remove(u.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded dark:text-gray-300">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(u.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No units found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Unit" : "New Unit"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kilogram" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symbol *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} placeholder="e.g. kg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.unit_type} onChange={e => setForm(p => ({ ...p, unit_type: e.target.value as UnitOfMeasure["unit_type"] }))}>
                {["weight", "volume", "length", "piece", "area"].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                {editing ? "Save Changes" : "Add Unit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
