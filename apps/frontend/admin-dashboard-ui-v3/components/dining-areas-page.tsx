"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, X, Search, LayoutGrid } from "lucide-react"
import { diningAreasApi, locationsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { DiningArea, CreateDiningAreaInput } from "@/lib/merchant/types"

/**
 * Dining Areas — TanStack Query migration.
 *
 * Ground truth (restaurant.controller dining-areas + entity/DTOs):
 *   - GET returns a RAW array { id, location_id, name, description, sort_order,
 *     is_active, table_count } — `table_count` is computed (COUNT, string). There
 *     is NO `capacity` — the old UI invented it and sent it on POST/PATCH → 400.
 *   - CreateDiningAreaDto REQUIRES `location_id` (the old POST omitted it → 400).
 *     UpdateDiningAreaDto has name?/description?/sort_order?/is_active? (no location_id).
 *   - The list DEFAULTS to is_active=true, so we fetch active + inactive and merge
 *     (otherwise deactivating an area would make it vanish). Names unique per business → 409.
 *   - The old page started from `mockAreas` and read `res.data` (it's a plain array).
 */

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors disabled:opacity-50 ${checked ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
      {checked ? "Active" : "Inactive"}
    </button>
  )
}

export default function DiningAreasPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DiningArea | null>(null)
  const [form, setForm] = useState({ name: "", description: "", location_id: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const activeQuery = useQuery({ queryKey: merchantKeys.diningAreas.list("active"), queryFn: () => diningAreasApi.list({ is_active: true }) })
  const inactiveQuery = useQuery({ queryKey: merchantKeys.diningAreas.list("inactive"), queryFn: () => diningAreasApi.list({ is_active: false }) })
  const locationsQuery = useQuery({ queryKey: merchantKeys.locations.list(), queryFn: locationsApi.list, enabled: showModal && !editing })

  const areas = useMemo(
    () => [...(activeQuery.data ?? []), ...(inactiveQuery.data ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [activeQuery.data, inactiveQuery.data],
  )
  const locations = locationsQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.diningAreas.all })

  const createMutation = useMutation({
    mutationFn: (input: CreateDiningAreaInput) => diningAreasApi.create(input),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to create dining area.")),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; description?: string } }) => diningAreasApi.update(id, input),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to update dining area.")),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => diningAreasApi.update(id, { is_active }),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => diningAreasApi.remove(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null) },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? areas.filter((a) => a.name.toLowerCase().includes(q)) : areas
  }, [areas, search])

  const openAdd = () => { setEditing(null); setForm({ name: "", description: "", location_id: "" }); setFormError(null); setShowModal(true) }
  const openEdit = (a: DiningArea) => { setEditing(a); setForm({ name: a.name, description: a.description ?? "", location_id: a.location_id }); setFormError(null); setShowModal(true) }
  const save = () => {
    if (!form.name.trim()) return
    setFormError(null)
    if (editing) {
      updateMutation.mutate({ id: editing.id, input: { name: form.name.trim(), description: form.description.trim() || undefined } })
    } else {
      if (!form.location_id) { setFormError("Please choose a location."); return }
      createMutation.mutate({ location_id: form.location_id, name: form.name.trim(), ...(form.description.trim() ? { description: form.description.trim() } : {}) })
    }
  }

  const listError = activeQuery.isError ? humanizeError(activeQuery.error, "Failed to load dining areas.") : null
  const saving = createMutation.isPending || updateMutation.isPending

  if (activeQuery.isLoading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      {listError && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search areas..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Area
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((area) => (
          <div key={area.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{area.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{Number(area.table_count)} tables</p>
                </div>
              </div>
              <Toggle checked={area.is_active} disabled={toggleMutation.isPending} onChange={(v) => toggleMutation.mutate({ id: area.id, is_active: v })} />
            </div>
            {area.description && <p className="text-sm text-gray-500 dark:text-gray-400">{area.description}</p>}
            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
              <button onClick={() => openEdit(area)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              {confirmDelete === area.id ? (
                <div className="flex gap-1 items-center">
                  <button onClick={() => deleteMutation.mutate(area.id)} disabled={deleteMutation.isPending} className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50">{deleteMutation.isPending ? "..." : "Yes"}</button>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Area" : "New Dining Area"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>

            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.location_id} onChange={(e) => setForm((p) => ({ ...p, location_id: e.target.value }))}>
                  <option value="">{locationsQuery.isLoading ? "Loading…" : "Select location…"}</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Hall" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional" />
            </div>

            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Area"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
