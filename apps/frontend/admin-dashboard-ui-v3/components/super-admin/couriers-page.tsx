"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, X, Search, Truck, Link2, Banknote } from "lucide-react"
import { couriersApi } from "@/lib/super-admin/api"
import { superKeys } from "@/lib/super-admin/query-keys"
import { humanizeError } from "@/lib/super-admin/errors"
import type { Courier, CreateCourierInput, UpdateCourierInput } from "@/lib/super-admin/types"

/**
 * Couriers — PILOT for the TanStack Query migration pattern.
 *
 * Reference baseline for all remaining super-admin tabs:
 *   - data via useQuery (no manual useState/useEffect/loading/error plumbing)
 *   - writes via useMutation + queryClient.invalidateQueries (cache-driven refresh)
 *   - typed against the verified backend shapes in lib/super-admin/types.ts
 *   - structured backend error codes mapped via humanizeError
 *
 * The former "My Business Couriers" tab was REMOVED: it called the business-scoped
 * /api/business/couriers, which a super-admin token (no business_id) cannot use.
 * Courier↔business linking belongs in the merchant app. (audit §1.4 / §2)
 */

type CourierForm = {
  name: string
  code: string
  logo_url: string
  api_endpoint: string
  tracking_url_template: string
  supports_cash_on_delivery: boolean
  is_active: boolean
}

const EMPTY_FORM: CourierForm = {
  name: "",
  code: "",
  logo_url: "",
  api_endpoint: "",
  tracking_url_template: "",
  supports_cash_on_delivery: false,
  is_active: true,
}

export default function CouriersPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Courier | null>(null)
  const [form, setForm] = useState<CourierForm>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // ── Query ───────────────────────────────────────────────────────────────
  const couriersQuery = useQuery({
    queryKey: superKeys.couriers.list(),
    queryFn: couriersApi.list,
  })
  const couriers = couriersQuery.data ?? []

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: superKeys.couriers.all })

  const createMutation = useMutation({
    mutationFn: (input: CreateCourierInput) => couriersApi.create(input),
    onSuccess: () => {
      invalidate()
      setShowModal(false)
    },
    onError: (e) => setFormError(humanizeError(e, "Failed to create courier.")),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCourierInput }) =>
      couriersApi.update(id, input),
    onSuccess: () => {
      invalidate()
      setShowModal(false)
    },
    onError: (e) => setFormError(humanizeError(e, "Failed to update courier.")),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couriersApi.remove(id),
    onSuccess: () => {
      invalidate()
      setConfirmDelete(null)
    },
  })

  const saving = createMutation.isPending || updateMutation.isPending

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return couriers
    return couriers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    )
  }, [couriers, search])

  // ── Handlers ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (c: Courier) => {
    setEditing(c)
    setForm({
      name: c.name,
      code: c.code,
      logo_url: c.logo_url ?? "",
      api_endpoint: c.api_endpoint ?? "",
      tracking_url_template: c.tracking_url_template ?? "",
      supports_cash_on_delivery: c.supports_cash_on_delivery,
      is_active: c.is_active,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleSave = () => {
    setFormError(null)
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Name and code are required.")
      return
    }
    const optional = {
      logo_url: form.logo_url.trim() || undefined,
      api_endpoint: form.api_endpoint.trim() || undefined,
      tracking_url_template: form.tracking_url_template.trim() || undefined,
      supports_cash_on_delivery: form.supports_cash_on_delivery,
    }

    if (editing) {
      // `code` is immutable — never sent on update.
      updateMutation.mutate({
        id: editing.id,
        input: { name: form.name.trim(), is_active: form.is_active, ...optional },
      })
    } else {
      createMutation.mutate({ name: form.name.trim(), code: form.code.trim(), ...optional })
    }
  }

  const listError = couriersQuery.isError ? humanizeError(couriersQuery.error, "Failed to load couriers.") : null

  return (
    <div className="space-y-6">
      {listError && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {listError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Courier
        </button>
      </div>

      {couriersQuery.isLoading && (
        <div className="py-16 text-center text-gray-400">Loading couriers...</div>
      )}

      {!couriersQuery.isLoading && !listError && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((courier) => (
            <div
              key={courier.id}
              className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center overflow-hidden">
                    {courier.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={courier.logo_url} alt={courier.name} className="w-full h-full object-contain" />
                    ) : (
                      <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{courier.name}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${courier.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}
                      >
                        {courier.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{courier.code}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(courier)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {confirmDelete === courier.id ? (
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => deleteMutation.mutate(courier.id)}
                        disabled={deleteMutation.isPending}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? "..." : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(courier.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {courier.tracking_url_template && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate text-xs">{courier.tracking_url_template}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Banknote className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs">
                    Cash on delivery: {courier.supports_cash_on_delivery ? "Supported" : "Not supported"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 py-16 text-center text-gray-400">No couriers found</div>
          )}
        </div>
      )}

      {/* Add/Edit Courier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? "Edit Courier" : "Add Courier"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Glovo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code *{editing && <span className="ml-1 text-xs text-gray-400">(immutable)</span>}
                </label>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 font-mono"
                  value={form.code}
                  disabled={!!editing}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="GLOVO"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.logo_url}
                  onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Endpoint</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.api_endpoint}
                  onChange={(e) => setForm((p) => ({ ...p, api_endpoint: e.target.value }))}
                  placeholder="https://api.courier.ma/v1"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tracking URL Template
                </label>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.tracking_url_template}
                  onChange={(e) => setForm((p) => ({ ...p, tracking_url_template: e.target.value }))}
                  placeholder="https://track.courier.ma/{tracking_number}"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="courier-cod"
                  className="rounded"
                  checked={form.supports_cash_on_delivery}
                  onChange={(e) => setForm((p) => ({ ...p, supports_cash_on_delivery: e.target.checked }))}
                />
                <label htmlFor="courier-cod" className="text-sm text-gray-700 dark:text-gray-300">
                  Cash on delivery
                </label>
              </div>
              {editing && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="courier-active"
                    className="rounded"
                    checked={form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  <label htmlFor="courier-active" className="text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Courier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
