"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, X, Search } from "lucide-react"
import { tableTypesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { TableType, CreateTableTypeInput } from "@/lib/merchant/types"

/**
 * Table Types — TanStack Query migration (RST-010..013).
 *
 * Ground truth (restaurant.controller + table_types entity/DTOs):
 *   - Columns are ONLY: name, default_capacity (int, Min 1), is_active.
 *     The old UI invented `shape` and `location` and sent them on POST/PATCH →
 *     forbidNonWhitelisted 400. Both removed.
 *   - GET returns a plain TableType[] — the old `res.data.map` threw. Status was
 *     hardcoded "Active"; it now reflects `is_active` (PATCH supports toggling it).
 *   - POST / PATCH / DELETE all exist (owner/manager).
 */

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  )
}

export default function TableTypesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TableType | null>(null)
  const [form, setForm] = useState<{ name: string; default_capacity: number }>({ name: "", default_capacity: 4 })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const typesQuery = useQuery({ queryKey: merchantKeys.tableTypes.list(), queryFn: tableTypesApi.list })
  const types = typesQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.tableTypes.all })

  const saveMutation = useMutation({
    mutationFn: (input: CreateTableTypeInput) =>
      editing ? tableTypesApi.update(editing.id, input) : tableTypesApi.create(input),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to save table type.")),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => tableTypesApi.update(id, { is_active }),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tableTypesApi.remove(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null) },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? types.filter((t) => t.name.toLowerCase().includes(q)) : types
  }, [types, search])

  const openAdd = () => { setEditing(null); setForm({ name: "", default_capacity: 4 }); setFormError(null); setShowModal(true) }
  const openEdit = (t: TableType) => { setEditing(t); setForm({ name: t.name, default_capacity: t.default_capacity }); setFormError(null); setShowModal(true) }
  const save = () => {
    if (!form.name.trim()) return
    setFormError(null)
    saveMutation.mutate({ name: form.name.trim(), default_capacity: form.default_capacity })
  }

  const listError = typesQuery.isError ? humanizeError(typesQuery.error, "Failed to load table types.") : null

  if (typesQuery.isLoading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      {listError && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search table types..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Name", "Default Capacity", "Status", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.default_capacity} guests</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Toggle checked={t.is_active} disabled={toggleMutation.isPending} onChange={(v) => toggleMutation.mutate({ id: t.id, is_active: v })} />
                    <span className={`text-xs font-medium ${t.is_active ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>{t.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"><Pencil className="w-4 h-4" /></button>
                    {confirmDelete === t.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => deleteMutation.mutate(t.id)} disabled={deleteMutation.isPending} className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50">{deleteMutation.isPending ? "..." : "Yes"}</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No table types found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Table Type" : "New Table Type"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Round 6-Top" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Capacity</label>
              <input type="number" min={1} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.default_capacity} onChange={(e) => setForm((p) => ({ ...p, default_capacity: parseInt(e.target.value) || 1 }))} />
            </div>
            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} disabled={saveMutation.isPending || !form.name.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {saveMutation.isPending ? "Saving…" : editing ? "Save" : "Add Type"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
