"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { UtensilsCrossed, MapPin, Armchair, Users, Plus, Pencil, Trash2, X, ChevronDown, AlertCircle } from "lucide-react"
import { diningAreasApi, tableTypesApi, tablesApi, locationsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { DiningArea, TableType, BusinessTable } from "@/lib/merchant/types"

/**
 * Table Management — TanStack Query migration (re-wires onto the data layers built
 * for the dining-areas / table-types / floor-plan pages).
 *
 * Drift fixed (verified vs restaurant.controller DTOs):
 *   - All three lists read `res.data`; dining-areas & tables return { records },
 *     table-types returns a PLAIN array.
 *   - Dining-area create omitted the REQUIRED `location_id` → 400 (now a selector).
 *   - Table-type create/update sent `capacity` (+`description`); DTO is { name,
 *     default_capacity? } → 400. `table_count` isn't returned for types → removed.
 *   - Table create sent `dining_area_id` and omitted `location_id`; CreateTableDto
 *     needs `area_id` + `location_id` (location derived from the chosen area).
 *   - Table rows nest `area`/`table_type` (the old `t.dining_area` was wrong).
 */

const num = (v: unknown) => Number(v ?? 0)

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "green" | "blue" | "gray" }) {
  const variants = {
    default: "bg-gray-100 text-gray-700 dark:bg-[#1F1F23] dark:text-gray-300",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-500 dark:bg-[#1F1F23] dark:text-gray-400",
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 dark:border-[#1F1F23]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
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
const saveBtnCls = "px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
const cancelBtnCls = "px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"

function ErrorBanner({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"><AlertCircle className="w-4 h-4 shrink-0" />{msg}</div>
}

// ============== DINING AREAS TAB ==============
function DiningAreasTab() {
  const qc = useQueryClient()
  const activeQ = useQuery({ queryKey: merchantKeys.diningAreas.list("active"), queryFn: () => diningAreasApi.list({ is_active: true }) })
  const inactiveQ = useQuery({ queryKey: merchantKeys.diningAreas.list("inactive"), queryFn: () => diningAreasApi.list({ is_active: false }) })
  const locationsQ = useQuery({ queryKey: merchantKeys.locations.list(), queryFn: locationsApi.list })
  const areas = useMemo(() => [...(activeQ.data ?? []), ...(inactiveQ.data ?? [])].sort((a, b) => a.sort_order - b.sort_order), [activeQ.data, inactiveQ.data])

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DiningArea | null>(null)
  const [form, setForm] = useState({ name: "", description: "", sort_order: "0", location_id: "" })
  const [err, setErr] = useState<string | null>(null)
  const invalidate = () => qc.invalidateQueries({ queryKey: merchantKeys.diningAreas.all })

  const createM = useMutation({
    mutationFn: () => diningAreasApi.create({ location_id: form.location_id, name: form.name.trim(), description: form.description.trim() || undefined, sort_order: num(form.sort_order) }),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setErr(humanizeError(e, "Failed to create dining area.")),
  })
  const updateM = useMutation({
    mutationFn: (id: string) => diningAreasApi.update(id, { name: form.name.trim(), description: form.description.trim() || undefined, sort_order: num(form.sort_order) }),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setErr(humanizeError(e, "Failed to update dining area.")),
  })
  const deleteM = useMutation({ mutationFn: (id: string) => diningAreasApi.remove(id), onSuccess: invalidate, onError: (e) => setErr(humanizeError(e, "Failed to delete dining area.")) })

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "", sort_order: "0", location_id: "" }); setErr(null); setShowModal(true) }
  const openEdit = (a: DiningArea) => { setEditing(a); setForm({ name: a.name, description: a.description ?? "", sort_order: String(a.sort_order), location_id: a.location_id }); setErr(null); setShowModal(true) }
  const submit = () => {
    if (!form.name.trim()) return
    setErr(null)
    if (editing) updateM.mutate(editing.id)
    else { if (!form.location_id) { setErr("Please choose a location."); return } createM.mutate() }
  }

  if (activeQ.isLoading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      <ErrorBanner msg={err ?? (activeQ.isError ? humanizeError(activeQ.error, "Failed to load dining areas.") : null)} />
      <div className="flex justify-end"><button onClick={openCreate} className={addBtnCls}><Plus className="w-4 h-4" />Add Dining Area</button></div>

      <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50/50 dark:bg-[#1F1F23]/50">
            {["Name", "Description", "Tables", "Sort Order", "Status", ""].map((h, i) => <th key={h + i} className={`text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3 ${i === 5 ? "text-right" : "text-left"}`}>{h || "Actions"}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {areas.map((area) => {
              const tc = num(area.table_count)
              return (
                <tr key={area.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1F1F23]/50 transition-colors">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center"><MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div><span className="font-medium text-gray-900 dark:text-white">{area.name}</span></div></td>
                  <td className="px-5 py-4"><span className="text-sm text-gray-500 dark:text-gray-400">{area.description || "-"}</span></td>
                  <td className="px-5 py-4"><Badge variant="blue">{tc} tables</Badge></td>
                  <td className="px-5 py-4"><span className="text-sm text-gray-600 dark:text-gray-400">{area.sort_order}</span></td>
                  <td className="px-5 py-4"><Badge variant={area.is_active ? "green" : "gray"}>{area.is_active ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-5 py-4"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(area)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"><Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                    <button onClick={() => { if (confirm(`Delete "${area.name}"?`)) deleteM.mutate(area.id) }} disabled={tc > 0} title={tc > 0 ? "Reassign tables first" : "Delete"} className={`p-2 rounded-lg transition-colors ${tc > 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-red-50 dark:hover:bg-red-900/20"}`}><Trash2 className={`w-4 h-4 ${tc > 0 ? "text-gray-400" : "text-red-500"}`} /></button>
                  </div></td>
                </tr>
              )
            })}
            {areas.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No dining areas yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Dining Area" : "Create Dining Area"}>
        <div className="space-y-4">
          {!editing && (
            <div>
              <label className={labelCls}>Location *</label>
              <div className="relative">
                <select value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })} className={selectCls}>
                  <option value="">{locationsQ.isLoading ? "Loading…" : "Select location…"}</option>
                  {(locationsQ.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
          <div><label className={labelCls}>Name *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Indoor Seating" className={inputCls} /></div>
          <div><label className={labelCls}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." rows={3} className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Sort Order</label><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputCls} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className={cancelBtnCls}>Cancel</button>
            <button onClick={submit} disabled={createM.isPending || updateM.isPending || !form.name.trim()} className={saveBtnCls}>{createM.isPending || updateM.isPending ? "Saving..." : editing ? "Save Changes" : "Create Area"}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============== TABLE TYPES TAB ==============
function TableTypesTab() {
  const qc = useQueryClient()
  const typesQ = useQuery({ queryKey: merchantKeys.tableTypes.list(), queryFn: tableTypesApi.list })
  const types = typesQ.data ?? []
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TableType | null>(null)
  const [form, setForm] = useState({ name: "", default_capacity: "4" })
  const [err, setErr] = useState<string | null>(null)
  const invalidate = () => qc.invalidateQueries({ queryKey: merchantKeys.tableTypes.all })

  const saveM = useMutation({
    mutationFn: () => {
      const input = { name: form.name.trim(), default_capacity: num(form.default_capacity) }
      return editing ? tableTypesApi.update(editing.id, input) : tableTypesApi.create(input)
    },
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setErr(humanizeError(e, "Failed to save table type.")),
  })
  const deleteM = useMutation({ mutationFn: (id: string) => tableTypesApi.remove(id), onSuccess: invalidate, onError: (e) => setErr(humanizeError(e, "Failed to delete table type.")) })

  const openCreate = () => { setEditing(null); setForm({ name: "", default_capacity: "4" }); setErr(null); setShowModal(true) }
  const openEdit = (t: TableType) => { setEditing(t); setForm({ name: t.name, default_capacity: String(t.default_capacity) }); setErr(null); setShowModal(true) }

  if (typesQ.isLoading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      <ErrorBanner msg={err ?? (typesQ.isError ? humanizeError(typesQ.error, "Failed to load table types.") : null)} />
      <div className="flex justify-end"><button onClick={openCreate} className={addBtnCls}><Plus className="w-4 h-4" />Add Table Type</button></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map((type) => (
          <div key={type.id} className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center"><Armchair className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div><h3 className="font-semibold text-lg text-gray-900 dark:text-white">{type.name}</h3></div>
              <Badge variant={type.is_active ? "green" : "gray"}>{type.is_active ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4"><Users className="w-4 h-4 text-gray-400" /><span>{type.default_capacity} seats</span></div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1F1F23]">
              <button onClick={() => openEdit(type)} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><Pencil className="w-4 h-4" />Edit</button>
              <button onClick={() => { if (confirm(`Delete "${type.name}"?`)) deleteM.mutate(type.id) }} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" />Delete</button>
            </div>
          </div>
        ))}
        {types.length === 0 && <div className="col-span-3 py-10 text-center text-gray-400">No table types yet</div>}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Table Type" : "Create Table Type"}>
        <div className="space-y-4">
          <div><label className={labelCls}>Name *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard" className={inputCls} /></div>
          <div><label className={labelCls}>Default Capacity *</label><input type="number" value={form.default_capacity} onChange={(e) => setForm({ ...form, default_capacity: e.target.value })} min={1} className={inputCls} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className={cancelBtnCls}>Cancel</button>
            <button onClick={() => { setErr(null); if (form.name.trim()) saveM.mutate() }} disabled={saveM.isPending || !form.name.trim()} className={saveBtnCls}>{saveM.isPending ? "Saving..." : editing ? "Save Changes" : "Create Type"}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============== TABLES TAB ==============
function TablesTab() {
  const qc = useQueryClient()
  const activeQ = useQuery({ queryKey: merchantKeys.tables.list(), queryFn: () => tablesApi.list({ is_active: true }) })
  const inactiveQ = useQuery({ queryKey: ["merchant", "tables", "list", "inactive"], queryFn: () => tablesApi.list({ is_active: false }) })
  const areasQ = useQuery({ queryKey: merchantKeys.diningAreas.list("active"), queryFn: () => diningAreasApi.list({ is_active: true }) })
  const typesQ = useQuery({ queryKey: merchantKeys.tableTypes.list(), queryFn: tableTypesApi.list })
  const tables = useMemo(() => [...(activeQ.data ?? []), ...(inactiveQ.data ?? [])], [activeQ.data, inactiveQ.data])
  const areas = areasQ.data ?? []
  const types = typesQ.data ?? []

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BusinessTable | null>(null)
  const [areaFilter, setAreaFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [form, setForm] = useState({ table_number: "", area_id: "", table_type_id: "", capacity: "4", position_x: "", position_y: "" })
  const [err, setErr] = useState<string | null>(null)
  const invalidate = () => qc.invalidateQueries({ queryKey: merchantKeys.tables.all })

  const posInt = (v: string) => (v === "" ? undefined : Math.min(100, Math.max(0, Math.round(Number(v)))))

  const createM = useMutation({
    mutationFn: () => {
      const loc = areas.find((a) => a.id === form.area_id)?.location_id
      if (!loc) throw new Error("Selected area has no location.")
      return tablesApi.create({
        location_id: loc, area_id: form.area_id, table_number: form.table_number.trim(), capacity: num(form.capacity),
        ...(form.table_type_id ? { table_type_id: form.table_type_id } : {}),
        ...(posInt(form.position_x) !== undefined ? { position_x: posInt(form.position_x) } : {}),
        ...(posInt(form.position_y) !== undefined ? { position_y: posInt(form.position_y) } : {}),
      })
    },
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setErr(humanizeError(e, "Failed to create table.")),
  })
  const updateM = useMutation({
    mutationFn: (id: string) => tablesApi.update(id, {
      table_number: form.table_number.trim(), area_id: form.area_id, capacity: num(form.capacity),
      ...(form.table_type_id ? { table_type_id: form.table_type_id } : {}),
      ...(posInt(form.position_x) !== undefined ? { position_x: posInt(form.position_x) } : {}),
      ...(posInt(form.position_y) !== undefined ? { position_y: posInt(form.position_y) } : {}),
    }),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setErr(humanizeError(e, "Failed to update table.")),
  })
  const deleteM = useMutation({ mutationFn: (id: string) => tablesApi.remove(id), onSuccess: invalidate, onError: (e) => setErr(humanizeError(e, "Failed to delete table.")) })

  const openCreate = () => { setEditing(null); setForm({ table_number: "", area_id: "", table_type_id: "", capacity: "4", position_x: "", position_y: "" }); setErr(null); setShowModal(true) }
  const openEdit = (t: BusinessTable) => {
    setEditing(t)
    setForm({ table_number: t.table_number, area_id: t.area?.id ?? "", table_type_id: t.table_type?.id ?? "", capacity: String(t.capacity), position_x: t.position_x != null ? String(t.position_x) : "", position_y: t.position_y != null ? String(t.position_y) : "" })
    setErr(null); setShowModal(true)
  }
  const submit = () => {
    if (!form.table_number.trim() || !form.area_id) { setErr("Table number and area are required."); return }
    setErr(null)
    editing ? updateM.mutate(editing.id) : createM.mutate()
  }

  const filtered = tables.filter((t) => {
    if (areaFilter !== "all" && t.area?.id !== areaFilter) return false
    if (statusFilter === "active" && !t.is_active) return false
    if (statusFilter === "inactive" && t.is_active) return false
    return true
  })

  if (activeQ.isLoading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      <ErrorBanner msg={err ?? (activeQ.isError ? humanizeError(activeQ.error, "Failed to load tables.") : null)} />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative"><select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className={selectCls}><option value="all">All Areas</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>
          <div className="relative"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>
        </div>
        <button onClick={openCreate} className={addBtnCls}><Plus className="w-4 h-4" />Add Table</button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50/50 dark:bg-[#1F1F23]/50">
            {["Table #", "Area", "Type", "Capacity", "Status", ""].map((h, i) => <th key={h + i} className={`text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3 ${i === 5 ? "text-right" : "text-left"}`}>{h || "Actions"}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1F1F23]/50 transition-colors">
                <td className="px-5 py-4"><span className="font-mono bg-gray-100 dark:bg-[#1F1F23] text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-sm">{t.table_number}</span></td>
                <td className="px-5 py-4"><span className="text-sm text-gray-600 dark:text-gray-400">{t.area?.name ?? "—"}</span></td>
                <td className="px-5 py-4"><span className="text-sm text-gray-600 dark:text-gray-400">{t.table_type?.name ?? "—"}</span></td>
                <td className="px-5 py-4"><div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400"><Users className="w-4 h-4 text-gray-400" />{t.capacity}</div></td>
                <td className="px-5 py-4"><Badge variant={t.is_active ? "green" : "gray"}>{t.is_active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-5 py-4"><div className="flex items-center justify-end gap-1">
                  <button onClick={() => openEdit(t)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"><Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                  <button onClick={() => { if (confirm(`Delete table "${t.table_number}"?`)) deleteM.mutate(t.id) }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No tables found</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Table" : "Create Table"}>
        <div className="space-y-4">
          <div><label className={labelCls}>Table Number *</label><input type="text" value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })} placeholder="T-01" className={`${inputCls} font-mono`} /></div>
          <div><label className={labelCls}>Area *</label><div className="relative"><select value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })} className={selectCls}><option value="">Select area...</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div></div>
          <div><label className={labelCls}>Table Type</label><div className="relative"><select value={form.table_type_id} onChange={(e) => setForm({ ...form, table_type_id: e.target.value })} className={selectCls}><option value="">Select type...</option>{types.filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.default_capacity} seats)</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div></div>
          <div><label className={labelCls}>Capacity</label><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} min={1} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Floor Plan Position (optional)</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Whole numbers 0–100. Leave blank to place later on the floor plan.</p>
            <div className="flex gap-3">
              <div className="flex-1"><label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">X</label><input type="number" value={form.position_x} onChange={(e) => setForm({ ...form, position_x: e.target.value })} min={0} max={100} placeholder="—" className={inputCls} /></div>
              <div className="flex-1"><label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Y</label><input type="number" value={form.position_y} onChange={(e) => setForm({ ...form, position_y: e.target.value })} min={0} max={100} placeholder="—" className={inputCls} /></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className={cancelBtnCls}>Cancel</button>
            <button onClick={submit} disabled={createM.isPending || updateM.isPending} className={saveBtnCls}>{createM.isPending || updateM.isPending ? "Saving..." : editing ? "Save Changes" : "Create Table"}</button>
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
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center"><UtensilsCrossed className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Table Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure dining areas, table types, and tables for restaurant service</p>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex gap-1 bg-gray-100 dark:bg-[#1F1F23] p-1 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>{tab.label}</button>
          ))}
        </div>
      </div>
      {activeTab === "areas" && <DiningAreasTab />}
      {activeTab === "types" && <TableTypesTab />}
      {activeTab === "tables" && <TablesTab />}
    </div>
  )
}
