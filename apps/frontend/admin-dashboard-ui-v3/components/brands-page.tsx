"use client"
import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, Search, Award, ExternalLink } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Brand {
  id: string
  name: string
  description?: string
  website?: string
  logo_url?: string
  product_count: number
  is_active: boolean
}

export default function BrandsPage() {
  const [items, setItems] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [form, setForm] = useState({ name: "", description: "", website: "", logo_url: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchBrands = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: Brand[] } | Brand[]>("/api/business/brands")
      setItems(Array.isArray(res) ? res : (res as { data: Brand[] }).data)
    } catch (e: any) {
      setError(e.message ?? "Failed to load brands")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBrands() }, [])

  const filtered = items.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm({ name: "", description: "", website: "", logo_url: "" }); setShowModal(true) }
  const openEdit = (b: Brand) => { setEditing(b); setForm({ name: b.name, description: b.description ?? "", website: b.website ?? "", logo_url: b.logo_url ?? "" }); setShowModal(true) }

  const save = async () => {
    if (!form.name.trim()) return
    setError(null)
    try {
      const body: Record<string, string> = { name: form.name }
      if (form.description) body.description = form.description
      if (form.website) body.website = form.website
      if (form.logo_url) body.logo_url = form.logo_url
      if (editing) {
        await apiFetch(`/api/business/brands/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
      } else {
        await apiFetch("/api/business/brands", { method: "POST", body: JSON.stringify(body) })
      }
      await fetchBrands()
      setShowModal(false)
    } catch (e: any) {
      setError(e.message ?? "Failed to save brand")
    }
  }

  const toggle = async (id: string) => {
    const brand = items.find(b => b.id === id)
    if (!brand) return
    setError(null)
    try {
      await apiFetch(`/api/business/brands/${id}`, { method: "PATCH", body: JSON.stringify({ is_active: !brand.is_active }) })
      await fetchBrands()
    } catch (e: any) {
      setError(e.message ?? "Failed to update brand")
    }
  }

  const remove = async (id: string) => {
    setError(null)
    try {
      await apiFetch(`/api/business/brands/${id}`, { method: "DELETE" })
      await fetchBrands()
    } catch (e: any) {
      setError(e.message ?? "Failed to delete brand")
    }
    setConfirmDelete(null)
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading brands...</div>

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(brand => (
          <div key={brand.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{brand.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{brand.product_count} products</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${brand.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                {brand.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {brand.description && <p className="text-sm text-gray-500 dark:text-gray-400">{brand.description}</p>}
            {brand.website && (
              <div className="flex items-center gap-1 text-xs text-indigo-500">
                <ExternalLink className="w-3 h-3" />{brand.website}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
              <button onClick={() => toggle(brand.id)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded">
                {brand.is_active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => openEdit(brand)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              {confirmDelete === brand.id ? (
                <div className="flex gap-1 items-center">
                  <button onClick={() => remove(brand.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
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
        {filtered.length === 0 && (
          <div className="col-span-3 py-10 text-center text-gray-400">No brands found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Brand" : "New Brand"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            {[
              { label: "Name *", key: "name", placeholder: "Brand name" },
              { label: "Description", key: "description", placeholder: "Optional" },
              { label: "Website", key: "website", placeholder: "example.com" },
              { label: "Logo URL", key: "logo_url", placeholder: "https://..." },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                {editing ? "Save Changes" : "Add Brand"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
