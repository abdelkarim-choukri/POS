"use client"
import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, X, Search, Award } from "lucide-react"
import { brandsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { Brand, CreateBrandInput, UpdateBrandInput } from "@/lib/merchant/types"

type Form = { name: string; code: string; description: string; logo_url: string }
const emptyForm: Form = { name: "", code: "", description: "", logo_url: "" }

export default function BrandsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const brandsQuery = useQuery({ queryKey: merchantKeys.inventory.brands(), queryFn: () => brandsApi.list() })
  const items = brandsQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.inventory.brands() })
  const createMutation = useMutation({
    mutationFn: (input: CreateBrandInput) => brandsApi.create(input),
    onSuccess: () => { invalidate(); setShowModal(false); setForm(emptyForm) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBrandInput }) => brandsApi.update(id, input),
    onSuccess: () => { invalidate(); setShowModal(false); setEditing(null); setForm(emptyForm) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => brandsApi.remove(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null) },
  })
  // Activate/deactivate reuses the update endpoint (PATCH is_active).
  const toggleMutation = useMutation({
    mutationFn: (b: Brand) => brandsApi.update(b.id, { is_active: !b.is_active }),
    onSuccess: () => invalidate(),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(b => b.name.toLowerCase().includes(q) || (b.code ?? "").toLowerCase().includes(q))
  }, [items, search])

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (b: Brand) => {
    setEditing(b)
    setForm({ name: b.name, code: b.code ?? "", description: b.description ?? "", logo_url: b.logo_url ?? "" })
    setShowModal(true)
  }

  const submit = () => {
    if (!form.name.trim()) return
    const base = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      description: form.description.trim() || undefined,
      logo_url: form.logo_url.trim() || undefined,
    }
    if (editing) updateMutation.mutate({ id: editing.id, input: base })
    else createMutation.mutate(base)
  }

  const formError = createMutation.isError
    ? humanizeError(createMutation.error, "Failed to create brand.")
    : updateMutation.isError ? humanizeError(updateMutation.error, "Failed to update brand.") : null
  const listError = brandsQuery.isError ? humanizeError(brandsQuery.error, "Failed to load brands.") : null
  const opError = deleteMutation.isError
    ? humanizeError(deleteMutation.error, "Failed to delete brand.")
    : toggleMutation.isError ? humanizeError(toggleMutation.error, "Failed to update brand.") : null
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {listError && <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{listError}</div>}
      {opError && <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{opError}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search brands..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Brand
        </button>
      </div>

      {brandsQuery.isLoading && <div className="py-10 text-center text-gray-400">Loading brands...</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!brandsQuery.isLoading && filtered.map(brand => (
          <div key={brand.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {brand.logo_url
                    ? <img src={brand.logo_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                    : <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{brand.name}</p>
                  {brand.code && <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{brand.code}</p>}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${brand.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                {brand.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {brand.description && <p className="text-sm text-gray-500 dark:text-gray-400">{brand.description}</p>}
            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
              <button onClick={() => toggleMutation.mutate(brand)} disabled={toggleMutation.isPending} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded disabled:opacity-50">
                {brand.is_active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => openEdit(brand)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              {confirmDelete === brand.id ? (
                <div className="flex gap-1 items-center">
                  <button onClick={() => deleteMutation.mutate(brand.id)} disabled={deleteMutation.isPending} className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50">Yes</button>
                  <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded dark:text-gray-300">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(brand.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {!brandsQuery.isLoading && filtered.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-400">No brands found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Brand" : "New Brand"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            {formError && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{formError}</div>}
            {([
              { label: "Name *", key: "name", placeholder: "Brand name" },
              { label: "Code", key: "code", placeholder: "Optional short code" },
              { label: "Description", key: "description", placeholder: "Optional" },
              { label: "Logo URL", key: "logo_url", placeholder: "https://..." },
            ] as const).map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={submit} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Brand"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
