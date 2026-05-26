"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Package,
  Tag,
  GripVertical,
  Link2,
  Check,
} from "lucide-react"

// ============== TYPES ==============
interface Modifier {
  id: string
  name: string
  price_delta: number
  is_available: boolean
  sort_order: number
}

interface ModifierGroup {
  id: string
  name: string
  selection_type: "single" | "multiple"
  min_selections: number
  max_selections: number
  is_active: boolean
  product_count: number
  modifiers: Modifier[]
}

interface Product {
  id: string
  name: string
  category: string
  sku: string
}

// ============== MOCK DATA ==============
const mockModifierGroups: ModifierGroup[] = [
  {
    id: "grp-1",
    name: "Milk Options",
    selection_type: "single",
    min_selections: 1,
    max_selections: 1,
    is_active: true,
    product_count: 8,
    modifiers: [
      { id: "mod-1-1", name: "Whole Milk", price_delta: 0, is_available: true, sort_order: 1 },
      { id: "mod-1-2", name: "Oat Milk", price_delta: 5, is_available: true, sort_order: 2 },
      { id: "mod-1-3", name: "Almond Milk", price_delta: 5, is_available: true, sort_order: 3 },
      { id: "mod-1-4", name: "Soy Milk", price_delta: 4, is_available: false, sort_order: 4 },
    ],
  },
  {
    id: "grp-2",
    name: "Extra Shots",
    selection_type: "multiple",
    min_selections: 0,
    max_selections: 3,
    is_active: true,
    product_count: 5,
    modifiers: [
      { id: "mod-2-1", name: "Espresso Shot", price_delta: 8, is_available: true, sort_order: 1 },
      { id: "mod-2-2", name: "Decaf Shot", price_delta: 8, is_available: true, sort_order: 2 },
    ],
  },
  {
    id: "grp-3",
    name: "Toppings",
    selection_type: "multiple",
    min_selections: 0,
    max_selections: 5,
    is_active: true,
    product_count: 12,
    modifiers: [
      { id: "mod-3-1", name: "Whipped Cream", price_delta: 6, is_available: true, sort_order: 1 },
      { id: "mod-3-2", name: "Chocolate Drizzle", price_delta: 5, is_available: true, sort_order: 2 },
      { id: "mod-3-3", name: "Caramel Drizzle", price_delta: 5, is_available: true, sort_order: 3 },
      { id: "mod-3-4", name: "Sprinkles", price_delta: 3, is_available: true, sort_order: 4 },
      { id: "mod-3-5", name: "Cinnamon", price_delta: 0, is_available: true, sort_order: 5 },
    ],
  },
  {
    id: "grp-4",
    name: "Add Protein",
    selection_type: "single",
    min_selections: 0,
    max_selections: 1,
    is_active: true,
    product_count: 3,
    modifiers: [
      { id: "mod-4-1", name: "Grilled Chicken", price_delta: 25, is_available: true, sort_order: 1 },
      { id: "mod-4-2", name: "Shrimp", price_delta: 35, is_available: true, sort_order: 2 },
      { id: "mod-4-3", name: "Tofu", price_delta: 15, is_available: true, sort_order: 3 },
    ],
  },
  {
    id: "grp-5",
    name: "Spice Level",
    selection_type: "single",
    min_selections: 1,
    max_selections: 1,
    is_active: false,
    product_count: 0,
    modifiers: [
      { id: "mod-5-1", name: "Mild", price_delta: 0, is_available: true, sort_order: 1 },
      { id: "mod-5-2", name: "Medium", price_delta: 0, is_available: true, sort_order: 2 },
      { id: "mod-5-3", name: "Hot", price_delta: 0, is_available: true, sort_order: 3 },
      { id: "mod-5-4", name: "Extra Hot", price_delta: 0, is_available: true, sort_order: 4 },
    ],
  },
]

const mockProducts: Product[] = [
  { id: "prod-1", name: "Cappuccino", category: "Beverages", sku: "BEV-001" },
  { id: "prod-2", name: "Latte", category: "Beverages", sku: "BEV-002" },
  { id: "prod-3", name: "Espresso", category: "Beverages", sku: "BEV-003" },
  { id: "prod-4", name: "Mocha", category: "Beverages", sku: "BEV-004" },
  { id: "prod-5", name: "Caesar Salad", category: "Food", sku: "FOD-001" },
  { id: "prod-6", name: "Greek Salad", category: "Food", sku: "FOD-002" },
  { id: "prod-7", name: "Chocolate Cake", category: "Desserts", sku: "DES-001" },
  { id: "prod-8", name: "Cheesecake", category: "Desserts", sku: "DES-002" },
]

// ============== REUSABLE COMPONENTS ==============
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" | "indigo" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md"
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  }
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" }
  return <button className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props} />
    </div>
  )
}

function Select({ label, options, ...props }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <select className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  if (!isOpen) return null
  const sizeClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }
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

// ============== MAIN PAGE COMPONENT ==============
export default function ModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [showAddModifier, setShowAddModifier] = useState<string | null>(null)
  const [showLinkProducts, setShowLinkProducts] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null)

  // Per-operation saving states
  const [groupSaving, setGroupSaving] = useState(false)
  const [groupSaveError, setGroupSaveError] = useState("")
  const [modifierSaving, setModifierSaving] = useState(false)
  const [modifierSaveError, setModifierSaveError] = useState("")
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkSaveError, setLinkSaveError] = useState("")

  // Form state
  const [groupForm, setGroupForm] = useState({
    name: "",
    selection_type: "single" as "single" | "multiple",
    min_selections: "0",
    max_selections: "1",
  })
  const [modifierForm, setModifierForm] = useState({ name: "", price_delta: "0", is_default: false })
  const [productSearch, setProductSearch] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  // ── Fetch modifier groups on mount ──────────────────────────────────────────
  const fetchGroups = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: any[] } | any[]>("/api/business/modifier-groups")
      const items: any[] = Array.isArray(res) ? res : (res as any).data ?? []
      const mapped: ModifierGroup[] = items.map((g: any) => ({
        id: g.id,
        name: g.name,
        selection_type: g.type === "multiple" ? "multiple" : "single",
        min_selections: g.min_selections ?? 0,
        max_selections: g.max_selections ?? 1,
        is_active: g.is_active ?? true,
        product_count: g.product_count ?? 0,
        modifiers: (g.modifiers ?? []).map((m: any) => ({
          id: m.id,
          name: m.name,
          price_delta: parseFloat(m.price_adjustment ?? m.price_delta ?? 0),
          is_available: m.is_available ?? true,
          sort_order: m.sort_order ?? 0,
        })),
      }))
      setGroups(mapped)
    } catch (e: any) {
      setError(e.message ?? "Failed to load modifier groups")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  // Filtered groups
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const handleToggleGroupActive = (groupId: string) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, is_active: !g.is_active } : g))
  }

  const handleToggleModifierAvailable = (groupId: string, modifierId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      return {
        ...g,
        modifiers: g.modifiers.map(m => m.id === modifierId ? { ...m, is_available: !m.is_available } : m)
      }
    }))
  }

  const handleAddGroup = () => {
    setGroupForm({ name: "", selection_type: "single", min_selections: "0", max_selections: "1" })
    setGroupSaveError("")
    setShowAddGroup(true)
  }

  const handleEditGroup = (group: ModifierGroup) => {
    setSelectedGroup(group)
    setGroupForm({
      name: group.name,
      selection_type: group.selection_type,
      min_selections: group.min_selections.toString(),
      max_selections: group.max_selections.toString(),
    })
    setGroupSaveError("")
    setShowEditGroup(true)
  }

  // ── Create group: POST /api/business/modifier-groups ────────────────────────
  const handleSaveAddGroup = async () => {
    if (!groupForm.name.trim()) return
    setGroupSaving(true)
    setGroupSaveError("")
    try {
      await apiFetch("/api/business/modifier-groups", {
        method: "POST",
        body: JSON.stringify({
          name: groupForm.name,
          type: groupForm.selection_type,
          min_selections: parseInt(groupForm.min_selections) || 0,
          max_selections: parseInt(groupForm.max_selections) || 1,
        }),
      })
      setShowAddGroup(false)
      await fetchGroups()
    } catch (e: any) {
      setGroupSaveError(e.message ?? "Failed to create modifier group")
    } finally {
      setGroupSaving(false)
    }
  }

  // ── Update group: PUT /api/business/modifier-groups/:id ─────────────────────
  const handleSaveEditGroup = async () => {
    if (!selectedGroup || !groupForm.name.trim()) return
    setGroupSaving(true)
    setGroupSaveError("")
    try {
      await apiFetch(`/api/business/modifier-groups/${selectedGroup.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: groupForm.name,
          type: groupForm.selection_type,
          min_selections: parseInt(groupForm.min_selections) || 0,
          max_selections: parseInt(groupForm.max_selections) || 1,
        }),
      })
      setShowEditGroup(false)
      setSelectedGroup(null)
      await fetchGroups()
    } catch (e: any) {
      setGroupSaveError(e.message ?? "Failed to update modifier group")
    } finally {
      setGroupSaving(false)
    }
  }

  const handleAddModifier = (groupId: string) => {
    setModifierForm({ name: "", price_delta: "0", is_default: false })
    setModifierSaveError("")
    setShowAddModifier(groupId)
  }

  // ── Add modifier: POST /api/business/modifier-groups/:id/modifiers ──────────
  const handleSaveAddModifier = async () => {
    if (!showAddModifier || !modifierForm.name.trim()) return
    setModifierSaving(true)
    setModifierSaveError("")
    try {
      await apiFetch(`/api/business/modifier-groups/${showAddModifier}/modifiers`, {
        method: "POST",
        body: JSON.stringify({
          name: modifierForm.name,
          price_adjustment: parseFloat(modifierForm.price_delta) || 0,
          is_default: modifierForm.is_default,
        }),
      })
      setShowAddModifier(null)
      await fetchGroups()
    } catch (e: any) {
      setModifierSaveError(e.message ?? "Failed to add modifier")
    } finally {
      setModifierSaving(false)
    }
  }

  const handleLinkProducts = (group: ModifierGroup) => {
    setSelectedGroup(group)
    setProductSearch("")
    setSelectedProducts(new Set())
    setLinkSaveError("")
    setShowLinkProducts(group.id)
  }

  // ── Link products: POST /api/business/products/:id/modifier-groups ──────────
  const handleSaveLinkProducts = async () => {
    if (!selectedGroup || selectedProducts.size === 0) {
      setShowLinkProducts(null)
      return
    }
    setLinkSaving(true)
    setLinkSaveError("")
    const errors: string[] = []
    for (const productId of Array.from(selectedProducts)) {
      try {
        await apiFetch(`/api/business/products/${productId}/modifier-groups`, {
          method: "POST",
          body: JSON.stringify({ modifier_group_id: selectedGroup.id }),
        })
      } catch (e: any) {
        errors.push(`Product ${productId}: ${e.message ?? "failed"}`)
      }
    }
    setLinkSaving(false)
    if (errors.length > 0) {
      setLinkSaveError(errors.join("; "))
    } else {
      setShowLinkProducts(null)
      await fetchGroups()
    }
  }

  const filteredProductsForLink = mockProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  )

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="h-full">
      {error && <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modifier Groups</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage product modifiers and customizations</p>
        </div>
        <Button variant="primary" onClick={handleAddGroup}>
          <Plus className="w-4 h-4" />
          Add Group
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search modifier groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Modifier Groups List */}
      <div className="space-y-4">
        {filteredGroups.map(group => (
          <div
            key={group.id}
            className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden"
          >
            {/* Group Header */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-[#1F1F23]">
              <button
                onClick={() => toggleGroup(group.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {expandedGroups.has(group.id) ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className={`font-semibold ${group.is_active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {group.name}
                  </h3>
                  <Badge color={group.selection_type === "single" ? "blue" : "indigo"}>
                    {group.selection_type}
                  </Badge>
                  {!group.is_active && <Badge color="gray">Inactive</Badge>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {group.modifiers.length} modifiers | Select {group.min_selections}-{group.max_selections} | Linked to {group.product_count} products
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Toggle checked={group.is_active} onChange={() => handleToggleGroupActive(group.id)} />
                <Button variant="ghost" size="sm" onClick={() => handleLinkProducts(group)}>
                  <Link2 className="w-4 h-4" />
                  Link
                </Button>
                <button
                  onClick={() => handleEditGroup(group)}
                  className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modifiers List (Expanded) */}
            {expandedGroups.has(group.id) && (
              <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/30">
                {group.modifiers.length > 0 ? (
                  <div className="space-y-2">
                    {group.modifiers.map(modifier => (
                      <div
                        key={modifier.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-[#0F0F12] rounded-lg border border-gray-100 dark:border-[#1F1F23]"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab" />
                          <div>
                            <p className={`font-medium ${modifier.is_available ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                              {modifier.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {modifier.price_delta === 0 ? "No extra charge" : modifier.price_delta > 0 ? `+${modifier.price_delta.toFixed(2)} MAD` : `${modifier.price_delta.toFixed(2)} MAD`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Toggle
                            checked={modifier.is_available}
                            onChange={() => handleToggleModifierAvailable(group.id, modifier.id)}
                          />
                          <button className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Tag className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No modifiers in this group</p>
                  </div>
                )}

                {/* Add Modifier Inline Form */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#1F1F23]">
                  <Button variant="secondary" size="sm" onClick={() => handleAddModifier(group.id)}>
                    <Plus className="w-4 h-4" />
                    Add Modifier
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
            <Tag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No modifier groups found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery ? "Try adjusting your search" : "Create your first modifier group to get started"}
            </p>
            <Button variant="primary" onClick={handleAddGroup}>
              <Plus className="w-4 h-4" />
              Add Group
            </Button>
          </div>
        )}
      </div>

      {/* Add Group Modal */}
      <Modal isOpen={showAddGroup} onClose={() => setShowAddGroup(false)} title="Add Modifier Group" size="md">
        <div className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Milk Options"
            value={groupForm.name}
            onChange={(e) => setGroupForm(f => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Selection Type"
            options={[
              { value: "single", label: "Single Selection (choose one)" },
              { value: "multiple", label: "Multiple Selection (choose many)" },
            ]}
            value={groupForm.selection_type}
            onChange={(e) => setGroupForm(f => ({ ...f, selection_type: e.target.value as "single" | "multiple" }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Selections"
              type="number"
              min="0"
              value={groupForm.min_selections}
              onChange={(e) => setGroupForm(f => ({ ...f, min_selections: e.target.value }))}
            />
            <Input
              label="Max Selections"
              type="number"
              min="1"
              value={groupForm.max_selections}
              onChange={(e) => setGroupForm(f => ({ ...f, max_selections: e.target.value }))}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {groupForm.selection_type === "single" ? (
                <>Customers will select exactly <strong>one</strong> option from this group.</>
              ) : (
                <>Customers can select between <strong>{groupForm.min_selections}</strong> and <strong>{groupForm.max_selections}</strong> options.</>
              )}
            </p>
          </div>
          {groupSaveError && <p className="text-sm text-red-600 dark:text-red-400">{groupSaveError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddGroup(false)} disabled={groupSaving}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveAddGroup} disabled={groupSaving || !groupForm.name.trim()}>
              {groupSaving ? "Creating…" : "Create Group"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal isOpen={showEditGroup} onClose={() => setShowEditGroup(false)} title="Edit Modifier Group" size="md">
        <div className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Milk Options"
            value={groupForm.name}
            onChange={(e) => setGroupForm(f => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Selection Type"
            options={[
              { value: "single", label: "Single Selection (choose one)" },
              { value: "multiple", label: "Multiple Selection (choose many)" },
            ]}
            value={groupForm.selection_type}
            onChange={(e) => setGroupForm(f => ({ ...f, selection_type: e.target.value as "single" | "multiple" }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Selections"
              type="number"
              min="0"
              value={groupForm.min_selections}
              onChange={(e) => setGroupForm(f => ({ ...f, min_selections: e.target.value }))}
            />
            <Input
              label="Max Selections"
              type="number"
              min="1"
              value={groupForm.max_selections}
              onChange={(e) => setGroupForm(f => ({ ...f, max_selections: e.target.value }))}
            />
          </div>
          {groupSaveError && <p className="text-sm text-red-600 dark:text-red-400">{groupSaveError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditGroup(false)} disabled={groupSaving}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveEditGroup} disabled={groupSaving || !groupForm.name.trim()}>
              {groupSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Modifier Modal */}
      <Modal isOpen={!!showAddModifier} onClose={() => setShowAddModifier(null)} title="Add Modifier" size="sm">
        <div className="space-y-4">
          <Input
            label="Modifier Name"
            placeholder="e.g. Oat Milk"
            value={modifierForm.name}
            onChange={(e) => setModifierForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Price Adjustment (MAD)"
            type="number"
            placeholder="0.00"
            value={modifierForm.price_delta}
            onChange={(e) => setModifierForm(f => ({ ...f, price_delta: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mod-is-default"
              checked={modifierForm.is_default}
              onChange={(e) => setModifierForm(f => ({ ...f, is_default: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 dark:border-[#1F1F23]"
            />
            <label htmlFor="mod-is-default" className="text-sm text-gray-700 dark:text-gray-300">Default selection</label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter 0 for no extra charge, positive values added to price, negative values deducted.
          </p>
          {modifierSaveError && <p className="text-sm text-red-600 dark:text-red-400">{modifierSaveError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModifier(null)} disabled={modifierSaving}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveAddModifier} disabled={modifierSaving || !modifierForm.name.trim()}>
              {modifierSaving ? "Adding…" : "Add Modifier"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Link Products Modal */}
      <Modal isOpen={!!showLinkProducts} onClose={() => setShowLinkProducts(null)} title="Link to Products" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select products to link with <strong>{selectedGroup?.name}</strong>
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-[#1F1F23] rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
            {filteredProductsForLink.map(product => (
              <label
                key={product.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-[#1a1a20] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product.id)}
                  onChange={(e) => {
                    setSelectedProducts(prev => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(product.id)
                      else next.delete(product.id)
                      return next
                    })
                  }}
                  className="w-4 h-4 rounded border-gray-300 dark:border-[#2a2a33] text-indigo-500 focus:ring-gray-900 dark:focus:ring-gray-300"
                />
                <div className="w-8 h-8 bg-gray-100 dark:bg-[#1F1F23] rounded flex items-center justify-center">
                  <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{product.category} | {product.sku}</p>
                </div>
              </label>
            ))}
          </div>
          {linkSaveError && <p className="text-sm text-red-600 dark:text-red-400">{linkSaveError}</p>}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedProducts.size} products selected
            </span>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowLinkProducts(null)} disabled={linkSaving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveLinkProducts} disabled={linkSaving || selectedProducts.size === 0}>
                <Check className="w-4 h-4" />
                {linkSaving ? "Linking…" : "Link Products"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}



