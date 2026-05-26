"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  UtensilsCrossed,
  MapPin,
  Armchair,
  Hash,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  AlertCircle,
} from "lucide-react"

interface DiningArea {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  table_count: number
}

interface TableType {
  id: string
  name: string
  default_capacity: number
  is_active: boolean
  table_count: number
}

interface Table {
  id: string
  table_number: string
  capacity: number
  area_id: string
  area_name: string
  table_type_id: string
  table_type_name: string
  is_active: boolean
  position_x?: number
  position_y?: number
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "green" | "red" | "blue" | "yellow" | "gray" }) {
  const variants = {
    default: "bg-gray-100 text-gray-700 dark:bg-[#1F1F23] dark:text-gray-300",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    gray: "bg-gray-100 text-gray-500 dark:bg-[#1F1F23] dark:text-gray-400",
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-indigo-600" : "bg-gray-200 dark:bg-[#1F1F23]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 dark:border-[#1F1F23]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
const selectCls = "w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
const addBtnCls = "flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
const saveBtnCls = "px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
const cancelBtnCls = "px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"

function mapArea(a: any): DiningArea {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    sort_order: a.sort_order ?? 0,
    is_active: a.is_active,
    table_count: a.table_count ?? 0,
  }
}

function mapTableType(t: any): TableType {
  return {
    id: t.id,
    name: t.name,
    default_capacity: t.default_capacity ?? t.capacity ?? 4,
    is_active: t.is_active,
    table_count: t.table_count ?? 0,
  }
}

function mapTable(t: any): Table {
  return {
    id: t.id,
    table_number: String(t.table_number),
    capacity: t.capacity ?? 4,
    area_id: t.dining_area?.id ?? t.area_id ?? "",
    area_name: t.dining_area?.name ?? t.area_name ?? "",
    table_type_id: t.table_type?.id ?? t.table_type_id ?? "",
    table_type_name: t.table_type?.name ?? t.table_type_name ?? "",
    is_active: t.is_active,
    position_x: t.position_x,
    position_y: t.position_y,
  }
}

function DiningAreasTab() {
  const [areas, setAreas] = useState<DiningArea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingArea, setEditingArea] = useState<DiningArea | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "", sort_order: "0" })
  const [saving, setSaving] = useState(false)

  const fetchAreas = () => {
    setLoading(true)
    apiFetch<{ data: any[] }>("/api/business/dining-areas")
      .then((res) => setAreas(res.data.map(mapArea)))
      .catch((e: any) => setError(e.message ?? "Failed to load dining areas"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAreas() }, [])

  const openCreate = () => {
    setFormData({ name: "", description: "", sort_order: "0" })
    setEditingArea(null)
    setShowCreateModal(true)
  }

  const openEdit = (area: DiningArea) => {
    setFormData({ name: area.name, description: area.description ?? "", sort_order: String(area.sort_order) })
    setEditingArea(area)
    setShowCreateModal(true)
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      const body = { name: formData.name, description: formData.description, sort_order: Number(formData.sort_order) }
      if (editingArea) {
        // PATCH /api/business/dining-areas/:id
        await apiFetch(`/api/business/dining-areas/${editingArea.id}`, { method: "PATCH", body: JSON.stringify(body) })
      } else {
        // POST /api/business/dining-areas
        await apiFetch("/api/business/dining-areas", { method: "POST", body: JSON.stringify(body) })
      }
      setShowCreateModal(false)
      fetchAreas()
    } catch (e: any) {
      setError(e.message ?? "Failed to save dining area")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (area: DiningArea) => {
    if (!confirm(`Delete "${area.name}"?`)) return
    setError(null)
    try {
      // DELETE /api/business/dining-areas/:id
      await apiFetch(`/api/business/dining-areas/${area.id}`, { method: "DELETE" })
      fetchAreas()
    } catch (e: any) {
      setError(e.message ?? "Failed to delete dining area")
    }
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={openCreate} className={addBtnCls}>
          <Plus className="w-4 h-4" />
          Add Dining Area
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50/50 dark:bg-[#1F1F23]/50">
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Name</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Description</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Tables</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Sort Order</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {areas.map((area) => (
              <tr key={area.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1F1F23]/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{area.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{area.description || "-"}</span>
                </td>
                <td className="px-5 py-4">
                  <Badge variant="blue">{area.table_count} tables</Badge>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{area.sort_order}</span>
                </td>
                <td className="px-5 py-4">
                  <Badge variant={area.is_active ? "green" : "gray"}>{area.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(area)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <div className="relative group">
                      <button
                        onClick={() => handleDelete(area)}
                        className={`p-2 rounded-lg transition-colors ${
                          area.table_count > 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-red-50 dark:hover:bg-red-900/20"
                        }`}
                        disabled={area.table_count > 0}
                      >
                        <Trash2 className={`w-4 h-4 ${area.table_count > 0 ? "text-gray-400" : "text-red-500"}`} />
                      </button>
                      {area.table_count > 0 && (
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          Reassign tables first
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingArea ? "Edit Dining Area" : "Create Dining Area"}
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Indoor Seating" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description..." rows={3} className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>Sort Order</label>
            <input type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateModal(false)} className={cancelBtnCls}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className={saveBtnCls}>
              {saving ? "Saving..." : editingArea ? "Save Changes" : "Create Area"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function TableTypesTab() {
  const [types, setTypes] = useState<TableType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState<TableType | null>(null)
  const [formData, setFormData] = useState({ name: "", default_capacity: "4", description: "" })
  const [saving, setSaving] = useState(false)

  const fetchTypes = () => {
    setLoading(true)
    // GET /api/business/table-types
    apiFetch<{ data: any[] }>("/api/business/table-types")
      .then((res) => setTypes(res.data.map(mapTableType)))
      .catch((e: any) => setError(e.message ?? "Failed to load table types"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTypes() }, [])

  const openCreate = () => {
    setFormData({ name: "", default_capacity: "4", description: "" })
    setEditingType(null)
    setShowModal(true)
  }

  const openEdit = (type: TableType) => {
    setFormData({ name: type.name, default_capacity: String(type.default_capacity), description: "" })
    setEditingType(type)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, any> = {
        name: formData.name,
        capacity: Number(formData.default_capacity),
      }
      if (formData.description) body.description = formData.description
      if (editingType) {
        // PATCH /api/business/table-types/:id
        await apiFetch(`/api/business/table-types/${editingType.id}`, { method: "PATCH", body: JSON.stringify(body) })
      } else {
        // POST /api/business/table-types
        await apiFetch("/api/business/table-types", { method: "POST", body: JSON.stringify(body) })
      }
      setShowModal(false)
      fetchTypes()
    } catch (e: any) {
      setError(e.message ?? "Failed to save table type")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (type: TableType) => {
    if (!confirm(`Delete "${type.name}"?`)) return
    setError(null)
    try {
      // DELETE /api/business/table-types/:id
      await apiFetch(`/api/business/table-types/${type.id}`, { method: "DELETE" })
      fetchTypes()
    } catch (e: any) {
      setError(e.message ?? "Failed to delete table type")
    }
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={openCreate} className={addBtnCls}>
          <Plus className="w-4 h-4" />
          Add Table Type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map((type) => (
          <div key={type.id} className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Armchair className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{type.name}</h3>
              </div>
              <Badge variant={type.is_active ? "green" : "gray"}>{type.is_active ? "Active" : "Inactive"}</Badge>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4 text-gray-400" />
                <span>{type.default_capacity} seats</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="blue">{type.table_count} tables using this type</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1F1F23]">
              <button
                onClick={() => openEdit(type)}
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <div className="relative group">
                <button
                  onClick={() => handleDelete(type)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    type.table_count > 0 ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-red-500 hover:text-red-600"
                  }`}
                  disabled={type.table_count > 0}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                {type.table_count > 0 && (
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Reassign tables first
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingType ? "Edit Table Type" : "Create Table Type"}
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Standard" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Default Capacity *</label>
            <input type="number" value={formData.default_capacity} onChange={(e) => setFormData({ ...formData, default_capacity: e.target.value })} min={1} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className={cancelBtnCls}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className={saveBtnCls}>
              {saving ? "Saving..." : editingType ? "Save Changes" : "Create Type"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function TablesTab() {
  const [tables, setTables] = useState<Table[]>([])
  const [diningAreas, setDiningAreas] = useState<DiningArea[]>([])
  const [tableTypes, setTableTypes] = useState<TableType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [areaFilter, setAreaFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [formData, setFormData] = useState({
    table_number: "",
    dining_area_id: "",
    table_type_id: "",
    capacity: "4",
    position_x: "",
    position_y: "",
  })
  const [saving, setSaving] = useState(false)

  const fetchAll = () => {
    setLoading(true)
    // GET /api/business/tables + GET /api/business/dining-areas + GET /api/business/table-types
    Promise.all([
      apiFetch<{ data: any[] }>("/api/business/tables"),
      apiFetch<{ data: any[] }>("/api/business/dining-areas"),
      apiFetch<{ data: any[] }>("/api/business/table-types"),
    ]).then(([tablesRes, areasRes, typesRes]) => {
      setTables(tablesRes.data.map(mapTable))
      setDiningAreas(areasRes.data.map(mapArea))
      setTableTypes(typesRes.data.map(mapTableType))
    }).catch((e: any) => setError(e.message ?? "Failed to load tables"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const openCreate = () => {
    setFormData({ table_number: "", dining_area_id: "", table_type_id: "", capacity: "4", position_x: "", position_y: "" })
    setEditingTable(null)
    setShowModal(true)
  }

  const openEdit = (table: Table) => {
    setFormData({
      table_number: table.table_number,
      dining_area_id: table.area_id,
      table_type_id: table.table_type_id,
      capacity: String(table.capacity),
      position_x: table.position_x != null ? String(table.position_x) : "",
      position_y: table.position_y != null ? String(table.position_y) : "",
    })
    setEditingTable(table)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, any> = {
        table_number: formData.table_number,
        dining_area_id: formData.dining_area_id,
        capacity: Number(formData.capacity),
      }
      if (formData.table_type_id) body.table_type_id = formData.table_type_id
      if (formData.position_x !== "") body.position_x = Number(formData.position_x)
      if (formData.position_y !== "") body.position_y = Number(formData.position_y)

      if (editingTable) {
        // PATCH /api/business/tables/:id
        await apiFetch(`/api/business/tables/${editingTable.id}`, { method: "PATCH", body: JSON.stringify(body) })
      } else {
        // POST /api/business/tables
        await apiFetch("/api/business/tables", { method: "POST", body: JSON.stringify(body) })
      }
      setShowModal(false)
      fetchAll()
    } catch (e: any) {
      setError(e.message ?? "Failed to save table")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (table: Table) => {
    if (!confirm(`Delete table "${table.table_number}"?`)) return
    setError(null)
    try {
      // DELETE /api/business/tables/:id
      await apiFetch(`/api/business/tables/${table.id}`, { method: "DELETE" })
      fetchAll()
    } catch (e: any) {
      setError(e.message ?? "Failed to delete table")
    }
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  const filteredTables = tables.filter((table) => {
    if (areaFilter !== "all" && table.area_id !== areaFilter) return false
    if (statusFilter === "active" && !table.is_active) return false
    if (statusFilter === "inactive" && table.is_active) return false
    return true
  })

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className={selectCls}>
              <option value="all">All Areas</option>
              {diningAreas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <button onClick={openCreate} className={addBtnCls}>
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50/50 dark:bg-[#1F1F23]/50">
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Table #</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Area</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Type</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Capacity</th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filteredTables.map((table) => (
              <tr key={table.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1F1F23]/50 transition-colors">
                <td className="px-5 py-4">
                  <span className="font-mono bg-gray-100 dark:bg-[#1F1F23] text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-sm">{table.table_number}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{table.area_name}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{table.table_type_name}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4 text-gray-400" />
                    {table.capacity}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge variant={table.is_active ? "green" : "gray"}>{table.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(table)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(table)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTable ? "Edit Table" : "Create Table"}
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Table Number *</label>
            <input type="text" value={formData.table_number} onChange={(e) => setFormData({ ...formData, table_number: e.target.value })} placeholder="T-01" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className={labelCls}>Area *</label>
            <div className="relative">
              <select value={formData.dining_area_id} onChange={(e) => setFormData({ ...formData, dining_area_id: e.target.value })} className={selectCls}>
                <option value="">Select area...</option>
                {diningAreas.filter((a) => a.is_active).map((area) => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Table Type</label>
            <div className="relative">
              <select value={formData.table_type_id} onChange={(e) => setFormData({ ...formData, table_type_id: e.target.value })} className={selectCls}>
                <option value="">Select type...</option>
                {tableTypes.filter((t) => t.is_active).map((type) => (
                  <option key={type.id} value={type.id}>{type.name} ({type.default_capacity} seats)</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Capacity</label>
            <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} min={1} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Floor Plan Position (optional)</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Leave blank to auto-place on floor plan</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">X (0-100)</label>
                <input type="number" value={formData.position_x} onChange={(e) => setFormData({ ...formData, position_x: e.target.value })} min={0} max={100} placeholder="0" className={inputCls} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Y (0-100)</label>
                <input type="number" value={formData.position_y} onChange={(e) => setFormData({ ...formData, position_y: e.target.value })} min={0} max={100} placeholder="0" className={inputCls} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className={cancelBtnCls}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className={saveBtnCls}>
              {saving ? "Saving..." : editingTable ? "Save Changes" : "Create Table"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function TableManagementPage() {
  const [activeTab, setActiveTab] = useState<"areas" | "types" | "tables">("areas")

  const tabs = [
    { id: "areas" as const, label: "Dining Areas" },
    { id: "types" as const, label: "Table Types" },
    { id: "tables" as const, label: "Tables" },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Table Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure dining areas, table types, and tables for restaurant service</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-1 bg-gray-100 dark:bg-[#1F1F23] p-1 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "areas" && <DiningAreasTab />}
      {activeTab === "types" && <TableTypesTab />}
      {activeTab === "tables" && <TablesTab />}
    </div>
  )
}
