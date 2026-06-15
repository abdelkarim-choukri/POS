"use client"
import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, X, Search, Ruler, Lock } from "lucide-react"
import { unitsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { UnitOfMeasure, CreateUnitInput, UpdateUnitInput } from "@/lib/merchant/types"

type Form = { name: string; abbreviation: string; sort_order: string; is_active: boolean }
const emptyForm: Form = { name: "", abbreviation: "", sort_order: "0", is_active: true }

export default function UnitsOfMeasurePage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const unitsQuery = useQuery({ queryKey: merchantKeys.inventory.units(), queryFn: () => unitsApi.list() })
  const units = unitsQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.inventory.units() })
  const createMutation = useMutation({
    mutationFn: (input: CreateUnitInput) => unitsApi.create(input),
    onSuccess: () => { invalidate(); setShowModal(false); setForm(emptyForm) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUnitInput }) => unitsApi.update(id, input),
    onSuccess: () => { invalidate(); setShowModal(false); setEditing(null); setForm(emptyForm) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => unitsApi.remove(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null) },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return units
    return units.filter(u => u.name.toLowerCase().includes(q) || u.abbreviation.toLowerCase().includes(q))
  }, [units, search])

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (u: UnitOfMeasure) => {
    setEditing(u)
    setForm({ name: u.name, abbreviation: u.abbreviation, sort_order: String(u.sort_order ?? 0), is_active: u.is_active })
    setShowModal(true)
  }

  const submit = () => {
    if (!form.name.trim() || !form.abbreviation.trim()) return
    const sort = parseInt(form.sort_order, 10)
    if (editing) {
      const input: UpdateUnitInput = {
        name: form.name.trim(),
        abbreviation: form.abbreviation.trim(),
        is_active: form.is_active,
        sort_order: Number.isFinite(sort) ? sort : 0,
      }
      updateMutation.mutate({ id: editing.id, input })
    } else {
      const input: CreateUnitInput = { name: form.name.trim(), abbreviation: form.abbreviation.trim() }
      if (Number.isFinite(sort)) input.sort_order = sort
      createMutation.mutate(input)
    }
  }

  const formError = createMutation.isError
    ? humanizeError(createMutation.error, "Failed to create unit.")
    : updateMutation.isError ? humanizeError(updateMutation.error, "Failed to update unit.") : null
  const listError = unitsQuery.isError ? humanizeError(unitsQuery.error, "Failed to load units of measure.") : null
  const deleteError = deleteMutation.isError ? humanizeError(deleteMutation.error, "Failed to delete unit.") : null
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {listError && <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{listError}</div>}
      {deleteError && <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{deleteError}</div>}

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
              {["Name", "Abbreviation", "Order", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {unitsQuery.isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>}
            {!unitsQuery.isLoading && filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                    {u.is_system && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Lock className="w-3 h-3" /> System
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">{u.abbreviation}</code>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {u.is_system ? (
                      <span className="text-xs text-gray-400 italic pr-1">Read-only</span>
                    ) : confirmDelete === u.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => deleteMutation.mutate(u.id)} disabled={deleteMutation.isPending} className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded dark:text-gray-300">No</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDelete(u.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!unitsQuery.isLoading && filtered.length === 0 && (
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
            {formError && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{formError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kilogram" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Abbreviation *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.abbreviation} onChange={e => setForm(p => ({ ...p, abbreviation: e.target.value }))} placeholder="e.g. kg" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
              <input type="number" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} placeholder="0" />
            </div>
            {editing && (
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" className="accent-indigo-600" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                Active
              </label>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={submit} disabled={saving || !form.name.trim() || !form.abbreviation.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Unit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
