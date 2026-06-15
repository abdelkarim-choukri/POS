"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Plus, Pencil, X, ChevronDown, ChevronRight, Package, Tag, Link2, Check } from "lucide-react"
import { modifierGroupsApi, productsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { ModifierGroup, CreateModifierGroupInput } from "@/lib/merchant/types"

/**
 * Modifier Groups — TanStack Query migration.
 *
 * Ground truth (business.controller modifier-groups + entities/DTOs):
 *   - GET business/modifier-groups → bare entities with eager `modifiers`.
 *   - Group cols: name, is_required (bool), max_selections (int; 0 = unlimited),
 *     sort_order. There is NO type(single/multiple), min_selections, is_active,
 *     or product_count — the old UI invented all of these.
 *   - CreateModifierGroupDto = { name, is_required?, max_selections?, sort_order? }.
 *     The old POST sent { type, min_selections } → forbidNonWhitelisted 400.
 *   - Modifier cols: name, price (NUMERIC→string), is_active. CreateModifierDto =
 *     { name, price? }. The old POST sent { price_adjustment, is_default } → 400.
 *   - POST products/:id/modifier-groups { modifier_group_id } links a group; the
 *     link list now uses REAL products (was mock).
 *   - There are NO DELETE and NO modifier-update endpoints, so the group/modifier
 *     delete buttons, the group active-toggle, the modifier available-toggle, and
 *     the edit-modifier button (all dead/local-only before) were removed.
 */

const num = (v: string | number | null | undefined) => Number(v ?? 0)
const EMPTY_GROUP = { name: "", is_required: false, max_selections: "1" }

function Badge({ children, color }: { children: React.ReactNode; color: "blue" | "gray" | "indigo" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md"
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
  }
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" }
  return <button className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props} />
    </div>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!isOpen) return null
  const sizeClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" }
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

const maxLabel = (n: number) => (n <= 0 ? "Unlimited" : `Max ${n}`)

export default function ModifiersPage() {
  const queryClient = useQueryClient()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [groupModal, setGroupModal] = useState<{ mode: "add" } | { mode: "edit"; group: ModifierGroup } | null>(null)
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP)
  const [addModifierFor, setAddModifierFor] = useState<string | null>(null)
  const [modifierForm, setModifierForm] = useState({ name: "", price: "0" })
  const [linkFor, setLinkFor] = useState<ModifierGroup | null>(null)
  const [productSearch, setProductSearch] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [formError, setFormError] = useState("")

  const groupsQuery = useQuery({ queryKey: merchantKeys.modifierGroups.list(), queryFn: modifierGroupsApi.list })
  const groups = groupsQuery.data ?? []

  const productsQuery = useQuery({ queryKey: merchantKeys.products.list(null), queryFn: () => productsApi.list(), enabled: !!linkFor })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.modifierGroups.all })

  const buildGroupInput = (): CreateModifierGroupInput => ({
    name: groupForm.name.trim(),
    is_required: groupForm.is_required,
    max_selections: parseInt(groupForm.max_selections) || 0,
  })

  const createGroup = useMutation({
    mutationFn: () => modifierGroupsApi.create(buildGroupInput()),
    onSuccess: () => { invalidate(); setGroupModal(null) },
    onError: (e) => setFormError(humanizeError(e, "Failed to create group.")),
  })
  const updateGroup = useMutation({
    mutationFn: (id: string) => modifierGroupsApi.update(id, buildGroupInput()),
    onSuccess: () => { invalidate(); setGroupModal(null) },
    onError: (e) => setFormError(humanizeError(e, "Failed to update group.")),
  })
  const addModifier = useMutation({
    mutationFn: (groupId: string) => modifierGroupsApi.addModifier(groupId, { name: modifierForm.name.trim(), price: num(modifierForm.price) }),
    onSuccess: () => { invalidate(); setAddModifierFor(null) },
    onError: (e) => setFormError(humanizeError(e, "Failed to add modifier.")),
  })
  const linkProducts = useMutation({
    mutationFn: async (groupId: string) => {
      for (const pid of Array.from(selectedProducts)) {
        await modifierGroupsApi.linkToProduct(pid, groupId)
      }
    },
    onSuccess: () => { invalidate(); setLinkFor(null); setSelectedProducts(new Set()) },
    onError: (e) => setFormError(humanizeError(e, "Failed to link products.")),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => g.name.toLowerCase().includes(q))
  }, [groups, search])

  const products = productsQuery.data ?? []
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q))
  }, [products, productSearch])

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const openAdd = () => { setGroupForm(EMPTY_GROUP); setFormError(""); setGroupModal({ mode: "add" }) }
  const openEdit = (g: ModifierGroup) => {
    setGroupForm({ name: g.name, is_required: g.is_required, max_selections: String(g.max_selections) })
    setFormError(""); setGroupModal({ mode: "edit", group: g })
  }
  const openAddModifier = (groupId: string) => { setModifierForm({ name: "", price: "0" }); setFormError(""); setAddModifierFor(groupId) }
  const openLink = (g: ModifierGroup) => { setProductSearch(""); setSelectedProducts(new Set()); setFormError(""); setLinkFor(g) }

  const saving = createGroup.isPending || updateGroup.isPending
  const listError = groupsQuery.isError ? humanizeError(groupsQuery.error, "Failed to load modifier groups.") : null

  return (
    <div className="h-full">
      {listError && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modifier Groups</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage product modifiers and customizations</p>
        </div>
        <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Group</Button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search modifier groups..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
        </div>
      </div>

      {groupsQuery.isLoading ? (
        <div className="py-10 text-center text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((group) => (
            <div key={group.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-[#1F1F23]">
                <button onClick={() => toggle(group.id)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {expanded.has(group.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                    <Badge color={group.is_required ? "indigo" : "gray"}>{group.is_required ? "Required" : "Optional"}</Badge>
                    <Badge color="blue">{maxLabel(group.max_selections)}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {(group.modifiers ?? []).length} modifiers
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openLink(group)}><Link2 className="w-4 h-4" />Link</Button>
                  <button onClick={() => openEdit(group)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expanded.has(group.id) && (
                <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/30">
                  {(group.modifiers ?? []).length > 0 ? (
                    <div className="space-y-2">
                      {group.modifiers.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#0F0F12] rounded-lg border border-gray-100 dark:border-[#1F1F23]">
                          <div>
                            <p className={`font-medium ${m.is_active ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>{m.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {num(m.price) === 0 ? "No extra charge" : `+${num(m.price).toFixed(2)} MAD`}
                            </p>
                          </div>
                          {!m.is_active && <Badge color="gray">Inactive</Badge>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Tag className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No modifiers in this group</p>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#1F1F23]">
                    <Button variant="secondary" size="sm" onClick={() => openAddModifier(group.id)}><Plus className="w-4 h-4" />Add Modifier</Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
              <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No modifier groups found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{search ? "Try adjusting your search" : "Create your first modifier group to get started"}</p>
              <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Group</Button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Group Modal */}
      <Modal isOpen={!!groupModal} onClose={() => setGroupModal(null)} title={groupModal?.mode === "edit" ? "Edit Modifier Group" : "Add Modifier Group"}>
        <div className="space-y-4">
          <Input label="Group Name" placeholder="e.g. Milk Options" value={groupForm.name} onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Max Selections (0 = unlimited)" type="number" min="0" value={groupForm.max_selections} onChange={(e) => setGroupForm((f) => ({ ...f, max_selections: e.target.value }))} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={groupForm.is_required} onChange={(e) => setGroupForm((f) => ({ ...f, is_required: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Required — the customer must choose from this group</span>
          </label>
          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setGroupModal(null)} disabled={saving}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={saving || !groupForm.name.trim()}
              onClick={() => { setFormError(""); groupModal?.mode === "edit" ? updateGroup.mutate(groupModal.group.id) : createGroup.mutate() }}>
              {saving ? "Saving…" : groupModal?.mode === "edit" ? "Save Changes" : "Create Group"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Modifier Modal */}
      <Modal isOpen={!!addModifierFor} onClose={() => setAddModifierFor(null)} title="Add Modifier" size="sm">
        <div className="space-y-4">
          <Input label="Modifier Name" placeholder="e.g. Oat Milk" value={modifierForm.name} onChange={(e) => setModifierForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Price (MAD)" type="number" step="0.01" placeholder="0.00" value={modifierForm.price} onChange={(e) => setModifierForm((f) => ({ ...f, price: e.target.value }))} />
          <p className="text-xs text-gray-500 dark:text-gray-400">Enter 0 for no extra charge.</p>
          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAddModifierFor(null)} disabled={addModifier.isPending}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={addModifier.isPending || !modifierForm.name.trim()}
              onClick={() => { setFormError(""); if (addModifierFor) addModifier.mutate(addModifierFor) }}>
              {addModifier.isPending ? "Adding…" : "Add Modifier"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Link Products Modal — REAL products */}
      <Modal isOpen={!!linkFor} onClose={() => setLinkFor(null)} title="Link to Products" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Select products to link with <strong>{linkFor?.name}</strong></p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-[#1F1F23] rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
            {productsQuery.isLoading ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading products…</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No products found</div>
            ) : filteredProducts.map((product) => (
              <label key={product.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-[#1a1a20] cursor-pointer">
                <input type="checkbox" checked={selectedProducts.has(product.id)}
                  onChange={(e) => setSelectedProducts((prev) => { const next = new Set(prev); e.target.checked ? next.add(product.id) : next.delete(product.id); return next })}
                  className="w-4 h-4 rounded border-gray-300 dark:border-[#2a2a33] text-indigo-500" />
                <div className="w-8 h-8 bg-gray-100 dark:bg-[#1F1F23] rounded flex items-center justify-center"><Package className="w-4 h-4 text-gray-400 dark:text-gray-500" /></div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{product.category?.name ?? "—"}{product.sku ? ` | ${product.sku}` : ""}</p>
                </div>
              </label>
            ))}
          </div>
          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{selectedProducts.size} products selected</span>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setLinkFor(null)} disabled={linkProducts.isPending}>Cancel</Button>
              <Button variant="primary" disabled={linkProducts.isPending || selectedProducts.size === 0} onClick={() => { setFormError(""); if (linkFor) linkProducts.mutate(linkFor.id) }}>
                <Check className="w-4 h-4" />{linkProducts.isPending ? "Linking…" : "Link Products"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
