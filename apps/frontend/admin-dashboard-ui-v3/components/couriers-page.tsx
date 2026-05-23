"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Search, Truck, Phone, Globe } from "lucide-react"

interface Courier {
  id: string
  name: string
  phone: string
  email: string
  website: string
  vehicle_type: "motorcycle" | "car" | "van" | "bicycle"
  coverage_area: string
  is_active: boolean
  linked_businesses: number
}

const mockCouriers: Courier[] = [
  { id: "c-1", name: "Amana Express", phone: "+212 522 000 001", email: "contact@amana.ma", website: "amana.ma", vehicle_type: "motorcycle", coverage_area: "Casablanca", is_active: true, linked_businesses: 14 },
  { id: "c-2", name: "Glovo Morocco", phone: "+212 522 000 002", email: "maroc@glovoapp.com", website: "glovoapp.com", vehicle_type: "motorcycle", coverage_area: "Casablanca, Rabat, Marrakech", is_active: true, linked_businesses: 38 },
  { id: "c-3", name: "PickUp Logistics", phone: "+212 522 000 003", email: "ops@pickup.ma", website: "pickup.ma", vehicle_type: "van", coverage_area: "National", is_active: true, linked_businesses: 7 },
  { id: "c-4", name: "Velo Delivery", phone: "+212 600 123 456", email: "hello@velo.ma", website: "", vehicle_type: "bicycle", coverage_area: "Casablanca Centre", is_active: false, linked_businesses: 2 },
]

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: "🏍️ Motorcycle",
  car: "🚗 Car",
  van: "🚐 Van",
  bicycle: "🚲 Bicycle",
}

const VEHICLE_COLORS: Record<string, string> = {
  motorcycle: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  car: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  van: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  bicycle: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

export default function CouriersPage() {
  const [couriers, setCouriers] = useState(mockCouriers)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Courier | null>(null)
  const [form, setForm] = useState({ name: "", phone: "", email: "", website: "", vehicle_type: "motorcycle" as Courier["vehicle_type"], coverage_area: "", is_active: true })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = couriers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.coverage_area.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditing(null)
    setForm({ name: "", phone: "", email: "", website: "", vehicle_type: "motorcycle", coverage_area: "", is_active: true })
    setShowModal(true)
  }

  const openEdit = (courier: Courier) => {
    setEditing(courier)
    setForm({ name: courier.name, phone: courier.phone, email: courier.email, website: courier.website, vehicle_type: courier.vehicle_type, coverage_area: courier.coverage_area, is_active: courier.is_active })
    setShowModal(true)
  }

  const save = () => {
    if (!form.name.trim()) return
    if (editing) {
      setCouriers(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c))
    } else {
      setCouriers(prev => [...prev, { id: `c-${Date.now()}`, ...form, linked_businesses: 0 }])
    }
    setShowModal(false)
  }

  const remove = (id: string) => { setCouriers(prev => prev.filter(c => c.id !== id)); setConfirmDelete(null) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search couriers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Courier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(courier => (
          <div key={courier.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{courier.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${courier.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {courier.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VEHICLE_COLORS[courier.vehicle_type]}`}>
                    {VEHICLE_LABELS[courier.vehicle_type]}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(courier)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmDelete === courier.id ? (
                  <div className="flex gap-1 items-center">
                    <button onClick={() => remove(courier.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(courier.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{courier.phone}</span>
              </div>
              {courier.website && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{courier.website}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span className="text-xs font-medium">Coverage:</span>
                <span className="text-xs">{courier.coverage_area}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-[#1F1F23]">
              <p className="text-xs text-gray-400 dark:text-gray-600">{courier.linked_businesses} linked businesses</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 py-16 text-center text-gray-400">No couriers found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Courier" : "Add Courier"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Courier name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+212 5XX XXX XXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Type</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.vehicle_type} onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value as Courier["vehicle_type"] }))}>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="contact@courier.ma" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="courier.ma" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coverage Area</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.coverage_area} onChange={e => setForm(p => ({ ...p, coverage_area: e.target.value }))} placeholder="Casablanca, Rabat..." />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="courier-active" className="rounded" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                <label htmlFor="courier-active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                {editing ? "Save Changes" : "Add Courier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
