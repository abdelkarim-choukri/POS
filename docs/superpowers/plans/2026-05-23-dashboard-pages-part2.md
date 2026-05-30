# Dashboard Missing Pages — Part 2 (Restaurant + Inventory)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking. Prerequisite: Part 1 (architecture wiring) must be complete.

**Goal:** Build 11 inventory and restaurant pages with inline mock data, zero API calls.

**Context:** SPA in `apps/frontend/admin-dashboard-ui-v3/app/page.tsx`. All new components go in `components/`. Pattern: `'use client'` → types → mock data → component. Dark mode: `dark:bg-[#0F0F12]` containers, `dark:border-[#1F1F23]` borders.

---

### Task 3: Restaurant section (2 pages)

**Files:**
- Create: `apps/frontend/admin-dashboard-ui-v3/components/dining-areas-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/table-types-page.tsx`

- [ ] **Step 1: Create `dining-areas-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Search, LayoutGrid, Users } from "lucide-react"

interface DiningArea {
  id: string; name: string; description?: string
  table_count: number; capacity: number; is_active: boolean
}

const mockAreas: DiningArea[] = [
  { id: "da-1", name: "Main Hall", description: "Ground floor seating area", table_count: 12, capacity: 48, is_active: true },
  { id: "da-2", name: "Terrace", description: "Outdoor open-air section", table_count: 8, capacity: 32, is_active: true },
  { id: "da-3", name: "VIP Room", description: "Private dining room", table_count: 3, capacity: 18, is_active: true },
  { id: "da-4", name: "Bar Area", description: "Counter seating near bar", table_count: 6, capacity: 12, is_active: true },
  { id: "da-5", name: "Rooftop", description: "Seasonal rooftop lounge", table_count: 0, capacity: 0, is_active: false },
]

export default function DiningAreasPage() {
  const [areas, setAreas] = useState(mockAreas)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DiningArea | null>(null)
  const [form, setForm] = useState({ name: "", description: "", capacity: 0 })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = areas.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm({ name: "", description: "", capacity: 0 }); setShowModal(true) }
  const openEdit = (a: DiningArea) => { setEditing(a); setForm({ name: a.name, description: a.description ?? "", capacity: a.capacity }); setShowModal(true) }
  const save = () => {
    if (!form.name.trim()) return
    if (editing) {
      setAreas(prev => prev.map(a => a.id === editing.id ? { ...a, ...form } : a))
    } else {
      setAreas(prev => [...prev, { id: `da-${Date.now()}`, ...form, table_count: 0, is_active: true }])
    }
    setShowModal(false)
  }
  const toggle = (id: string) => setAreas(prev => prev.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a))
  const remove = (id: string) => { setAreas(prev => prev.filter(a => a.id !== id)); setConfirmDelete(null) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search areas..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Area
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(area => (
          <div key={area.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{area.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{area.table_count} tables</p>
                </div>
              </div>
              <button onClick={() => toggle(area.id)}>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${area.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                  {area.is_active ? "Active" : "Inactive"}
                </span>
              </button>
            </div>
            {area.description && <p className="text-sm text-gray-500 dark:text-gray-400">{area.description}</p>}
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" /> Capacity: {area.capacity} guests
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
              <button onClick={() => openEdit(area)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              {confirmDelete === area.id ? (
                <div className="flex gap-1 items-center">
                  <button onClick={() => remove(area.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Area" : "New Dining Area"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            {[{ label: "Name *", key: "name", placeholder: "e.g. Main Hall" }, { label: "Description", key: "description", placeholder: "Optional" }].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Capacity</label>
              <input type="number" min={0} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                {editing ? "Save Changes" : "Add Area"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `table-types-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Search } from "lucide-react"

interface TableType {
  id: string; name: string; default_capacity: number
  shape: "round" | "square" | "rectangle" | "bar"
  location: "indoor" | "outdoor" | "both"; is_active: boolean
}

const mockTypes: TableType[] = [
  { id: "tt-1", name: "Standard 2-Top", default_capacity: 2, shape: "square", location: "indoor", is_active: true },
  { id: "tt-2", name: "Standard 4-Top", default_capacity: 4, shape: "square", location: "indoor", is_active: true },
  { id: "tt-3", name: "Round 6-Top", default_capacity: 6, shape: "round", location: "indoor", is_active: true },
  { id: "tt-4", name: "Long Banquet", default_capacity: 12, shape: "rectangle", location: "indoor", is_active: true },
  { id: "tt-5", name: "Bar Stool", default_capacity: 1, shape: "bar", location: "indoor", is_active: true },
  { id: "tt-6", name: "Terrace 4-Top", default_capacity: 4, shape: "round", location: "outdoor", is_active: true },
]

const SHAPE_EMOJI: Record<string, string> = { round: "⭕", square: "⬜", rectangle: "▬", bar: "🪑" }
const LOC_COLORS: Record<string, string> = {
  indoor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  outdoor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  both: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

export default function TableTypesPage() {
  const [types, setTypes] = useState(mockTypes)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TableType | null>(null)
  const [form, setForm] = useState({ name: "", default_capacity: 4, shape: "square" as TableType["shape"], location: "indoor" as TableType["location"] })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = types.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  const openAdd = () => { setEditing(null); setForm({ name: "", default_capacity: 4, shape: "square", location: "indoor" }); setShowModal(true) }
  const openEdit = (t: TableType) => { setEditing(t); setForm({ name: t.name, default_capacity: t.default_capacity, shape: t.shape, location: t.location }); setShowModal(true) }
  const save = () => {
    if (!form.name.trim()) return
    if (editing) setTypes(prev => prev.map(t => t.id === editing.id ? { ...t, ...form } : t))
    else setTypes(prev => [...prev, { id: `tt-${Date.now()}`, ...form, is_active: true }])
    setShowModal(false)
  }
  const remove = (id: string) => { setTypes(prev => prev.filter(t => t.id !== id)); setConfirmDelete(null) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search table types..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Name", "Shape", "Capacity", "Location", "Status", "Actions"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{SHAPE_EMOJI[t.shape]} {t.shape}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.default_capacity} guests</td>
                <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${LOC_COLORS[t.location]}`}>{t.location}</span></td>
                <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"><Pencil className="w-4 h-4" /></button>
                    {confirmDelete === t.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => remove(t.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Table Type" : "New Table Type"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Round 6-Top" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Capacity</label>
                <input type="number" min={1} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.default_capacity} onChange={e => setForm(p => ({ ...p, default_capacity: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shape</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.shape} onChange={e => setForm(p => ({ ...p, shape: e.target.value as TableType["shape"] }))}>
                  {["round", "square", "rectangle", "bar"].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value as TableType["location"] }))}>
                {["indoor", "outdoor", "both"].map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">{editing ? "Save" : "Add Type"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/frontend/admin-dashboard-ui-v3/components/dining-areas-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/table-types-page.tsx"
git commit -m "dashboard: add dining-areas, table-types pages"
```

---

### Task 4: Inventory A — stock, stock-batches, stock-movements (3 pages)

**Files:**
- Create: `apps/frontend/admin-dashboard-ui-v3/components/stock-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/stock-batches-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/stock-movements-page.tsx`

- [ ] **Step 1: Create `stock-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Search, AlertTriangle, Package, TrendingDown, DollarSign, Filter } from "lucide-react"

interface StockPosition {
  id: string; product: string; category: string; sku: string
  warehouse: string; qty: number; unit: string; reorder_point: number
  cost_per_unit: number; total_value: number; batch_count: number
  status: "ok" | "low" | "out"
}

const mockStock: StockPosition[] = [
  { id: "s-1", product: "Arabica Coffee Beans", category: "Beverages", sku: "BEV-COF-001", warehouse: "Main WH", qty: 48, unit: "kg", reorder_point: 20, cost_per_unit: 85, total_value: 4080, batch_count: 2, status: "ok" },
  { id: "s-2", product: "Whole Milk", category: "Dairy", sku: "DAI-MLK-001", warehouse: "Main WH", qty: 12, unit: "L", reorder_point: 30, cost_per_unit: 8.5, total_value: 102, batch_count: 1, status: "low" },
  { id: "s-3", product: "Paper Cups (M)", category: "Packaging", sku: "PKG-CUP-M", warehouse: "Main WH", qty: 850, unit: "pcs", reorder_point: 500, cost_per_unit: 0.6, total_value: 510, batch_count: 1, status: "ok" },
  { id: "s-4", product: "Sugar Sachets", category: "Condiments", sku: "CON-SUG-001", warehouse: "Main WH", qty: 0, unit: "pcs", reorder_point: 200, cost_per_unit: 0.5, total_value: 0, batch_count: 0, status: "out" },
  { id: "s-5", product: "Vanilla Syrup", category: "Syrups", sku: "SYR-VAN-001", warehouse: "Main WH", qty: 4, unit: "L", reorder_point: 10, cost_per_unit: 45, total_value: 180, batch_count: 1, status: "low" },
  { id: "s-6", product: "Croissants (frozen)", category: "Bakery", sku: "BAK-CRO-001", warehouse: "Cold WH", qty: 120, unit: "pcs", reorder_point: 50, cost_per_unit: 6, total_value: 720, batch_count: 1, status: "ok" },
]

const STATUS_CONFIG = {
  ok: { label: "OK", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  low: { label: "Low Stock", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  out: { label: "Out of Stock", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

export default function StockPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const [search, setSearch] = useState("")
  const [lowOnly, setLowOnly] = useState(false)
  const [warehouse, setWarehouse] = useState("all")

  const warehouses = ["all", ...Array.from(new Set(mockStock.map(s => s.warehouse)))]
  const filtered = mockStock.filter(s => {
    const matchSearch = s.product.toLowerCase().includes(search.toLowerCase()) || s.sku.toLowerCase().includes(search.toLowerCase())
    const matchWH = warehouse === "all" || s.warehouse === warehouse
    const matchLow = !lowOnly || s.status !== "ok"
    return matchSearch && matchWH && matchLow
  })

  const totalValue = mockStock.reduce((sum, s) => sum + s.total_value, 0)
  const lowCount = mockStock.filter(s => s.status === "low").length
  const outCount = mockStock.filter(s => s.status === "out").length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: mockStock.length.toString(), icon: Package, color: "text-indigo-500" },
          { label: "Low Stock", value: lowCount.toString(), icon: TrendingDown, color: "text-yellow-500" },
          { label: "Out of Stock", value: outCount.toString(), icon: AlertTriangle, color: "text-red-500" },
          { label: "Total Value", value: `${totalValue.toLocaleString()} MAD`, icon: DollarSign, color: "text-green-500" },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-[#1a1a20] flex items-center justify-center flex-shrink-0">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search products or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={warehouse} onChange={e => setWarehouse(e.target.value)}>
          {warehouses.map(w => <option key={w} value={w}>{w === "all" ? "All Warehouses" : w}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" className="accent-indigo-600" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "SKU", "Warehouse", "Qty", "Reorder At", "Value", "Status"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(s => {
              const sc = STATUS_CONFIG[s.status]
              return (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{s.product}</p>
                    <p className="text-xs text-gray-400">{s.category}</p>
                  </td>
                  <td className="px-4 py-3"><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">{s.sku}</code></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.warehouse}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{s.qty} {s.unit}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.reorder_point} {s.unit}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.total_value.toLocaleString()} MAD</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No items match your filters</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `stock-batches-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Search, Package, AlertTriangle } from "lucide-react"

interface StockBatch {
  id: string; batch_number: string; product: string; warehouse: string
  received_qty: number; current_qty: number; cost_per_unit: number
  received_at: string; expires_at?: string
  status: "available" | "depleted" | "disposed" | "expiring_soon"
}

const mockBatches: StockBatch[] = [
  { id: "b-1", batch_number: "BATCH-2025-001", product: "Arabica Coffee Beans", warehouse: "Main WH", received_qty: 50, current_qty: 48, cost_per_unit: 85, received_at: "2025-01-05", status: "available" },
  { id: "b-2", batch_number: "BATCH-2025-002", product: "Whole Milk", warehouse: "Main WH", received_qty: 40, current_qty: 12, cost_per_unit: 8.5, received_at: "2025-01-18", expires_at: "2025-02-01", status: "available" },
  { id: "b-3", batch_number: "BATCH-2025-003", product: "Vanilla Syrup", warehouse: "Main WH", received_qty: 10, current_qty: 4, cost_per_unit: 45, received_at: "2025-01-10", expires_at: "2025-02-15", status: "expiring_soon" },
  { id: "b-4", batch_number: "BATCH-2024-089", product: "Caramel Syrup", warehouse: "Main WH", received_qty: 12, current_qty: 0, cost_per_unit: 42, received_at: "2024-11-01", status: "depleted" },
  { id: "b-5", batch_number: "BATCH-2025-004", product: "Paper Cups (M)", warehouse: "Main WH", received_qty: 1000, current_qty: 850, cost_per_unit: 0.6, received_at: "2025-01-12", status: "available" },
  { id: "b-6", batch_number: "BATCH-2025-005", product: "Croissants (frozen)", warehouse: "Cold WH", received_qty: 200, current_qty: 120, cost_per_unit: 6, received_at: "2025-01-20", expires_at: "2025-03-01", status: "available" },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  depleted: { label: "Depleted", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  disposed: { label: "Disposed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expiring_soon: { label: "Expiring Soon", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
}

export default function StockBatchesPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = mockBatches.filter(b => {
    const matchSearch = b.product.toLowerCase().includes(search.toLowerCase()) || b.batch_number.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || b.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search batches..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} batches</p>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Batch #", "Product", "Warehouse", "Received", "Current", "Cost/Unit", "Expires", "Status"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(b => {
              const sc = STATUS_CONFIG[b.status]
              return (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{b.batch_number}</code></td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.product}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{b.warehouse}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.received_qty}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{b.current_qty}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.cost_per_unit.toFixed(2)} MAD</td>
                  <td className="px-4 py-3">
                    {b.expires_at ? (
                      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        {b.status === "expiring_soon" && <AlertTriangle className="w-3.5 h-3.5" />}{b.expires_at}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No batches found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `stock-movements-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Search, ArrowUp, ArrowDown, ArrowLeftRight, Package } from "lucide-react"

interface StockMovement {
  id: string; date: string; type: "receive" | "consume" | "adjust" | "transfer" | "dispose"
  product: string; warehouse: string; qty_change: number; unit: string
  reference?: string; performed_by: string; notes?: string
}

const mockMovements: StockMovement[] = [
  { id: "m-1", date: "2025-01-21 14:32", type: "receive", product: "Arabica Coffee Beans", warehouse: "Main WH", qty_change: +50, unit: "kg", reference: "PO-2025-0042", performed_by: "Hassan M." },
  { id: "m-2", date: "2025-01-21 12:15", type: "consume", product: "Whole Milk", warehouse: "Main WH", qty_change: -3, unit: "L", reference: "TXN-2025-001234", performed_by: "System" },
  { id: "m-3", date: "2025-01-20 09:00", type: "adjust", product: "Paper Cups (M)", warehouse: "Main WH", qty_change: -50, unit: "pcs", performed_by: "Fatima Z.", notes: "Damaged during delivery" },
  { id: "m-4", date: "2025-01-19 16:45", type: "transfer", product: "Vanilla Syrup", warehouse: "Cold WH → Main WH", qty_change: +5, unit: "L", performed_by: "Ahmed K." },
  { id: "m-5", date: "2025-01-18 11:20", type: "receive", product: "Croissants (frozen)", warehouse: "Cold WH", qty_change: +200, unit: "pcs", reference: "PO-2025-0038", performed_by: "Hassan M." },
  { id: "m-6", date: "2025-01-17 15:00", type: "dispose", product: "Expired Milk", warehouse: "Main WH", qty_change: -8, unit: "L", performed_by: "Fatima Z.", notes: "Past expiry date" },
]

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  receive: { label: "Receive", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <ArrowDown className="w-3.5 h-3.5" /> },
  consume: { label: "Consume", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Package className="w-3.5 h-3.5" /> },
  adjust: { label: "Adjust", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <ArrowUp className="w-3.5 h-3.5" /> },
  transfer: { label: "Transfer", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  dispose: { label: "Dispose", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <ArrowUp className="w-3.5 h-3.5" /> },
}

export default function StockMovementsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const filtered = mockMovements.filter(m => {
    const matchSearch = m.product.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || m.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Date", "Type", "Product", "Warehouse", "Change", "Reference", "By"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(m => {
              const tc = TYPE_CONFIG[m.type]
              return (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${tc.color}`}>
                      {tc.icon}{tc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.product}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.warehouse}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${m.qty_change > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                      {m.qty_change > 0 ? "+" : ""}{m.qty_change} {m.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.reference ? <code className="text-xs text-indigo-600 dark:text-indigo-400">{m.reference}</code> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.performed_by}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No movements found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add "apps/frontend/admin-dashboard-ui-v3/components/stock-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/stock-batches-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/stock-movements-page.tsx"
git commit -m "dashboard: add stock, stock-batches, stock-movements pages"
```

---

### Task 5: Inventory B — PO create, PO detail, stock templates, vendor detail (4 pages)

**Files:**
- Create: `apps/frontend/admin-dashboard-ui-v3/components/purchase-order-create-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/purchase-order-detail-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/stock-templates-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/vendor-detail-page.tsx`

- [ ] **Step 1: Create `purchase-order-create-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"

interface POItem { id: string; product: string; qty: number; unit_cost: number }

const mockVendors = [
  { id: "v-1", name: "Al Watan Supplies" },
  { id: "v-2", name: "Sahara Distribution" },
  { id: "v-3", name: "Atlas Food Co." },
]
const mockProducts = [
  { id: "p-1", name: "Arabica Coffee Beans", cost: 85 },
  { id: "p-2", name: "Whole Milk", cost: 8.5 },
  { id: "p-3", name: "Vanilla Syrup", cost: 45 },
  { id: "p-4", name: "Paper Cups (M)", cost: 0.6 },
  { id: "p-5", name: "Croissants (frozen)", cost: 6 },
]

export default function PurchaseOrderCreatePage({ onBack }: { onBack?: () => void }) {
  const [vendorId, setVendorId] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<POItem[]>([{ id: "i-1", product: "", qty: 1, unit_cost: 0 }])
  const [saved, setSaved] = useState(false)

  const addItem = () => setItems(prev => [...prev, { id: `i-${Date.now()}`, product: "", qty: 1, unit_cost: 0 }])
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id: string, field: keyof POItem, value: any) =>
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i
      const updated = { ...i, [field]: value }
      if (field === "product") {
        const prod = mockProducts.find(p => p.name === value)
        if (prod) updated.unit_cost = prod.cost
      }
      return updated
    }))

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_cost, 0)
  const tva = subtotal * 0.20
  const total = subtotal + tva

  const handleSave = () => {
    if (!vendorId) return
    setSaved(true)
    setTimeout(() => { setSaved(false); if (onBack) onBack() }, 1500)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        {onBack && <button onClick={onBack} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors"><ArrowLeft className="w-5 h-5" /></button>}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create Purchase Order</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">New order from vendor</p>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Order Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor *</label>
            <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={vendorId} onChange={e => setVendorId(e.target.value)}>
              <option value="">Select vendor...</option>
              {mockVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Delivery</label>
            <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Order Items</h2>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="flex gap-3 items-end">
              <div className="flex-1">
                {idx === 0 && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>}
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={item.product} onChange={e => updateItem(item.id, "product", e.target.value)}>
                  <option value="">Select product...</option>
                  {mockProducts.map(p => <option key={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="w-24">
                {idx === 0 && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Qty</label>}
                <input type="number" min={1} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={item.qty} onChange={e => updateItem(item.id, "qty", parseInt(e.target.value) || 1)} />
              </div>
              <div className="w-32">
                {idx === 0 && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit Cost (MAD)</label>}
                <input type="number" min={0} step={0.01} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={item.unit_cost} onChange={e => updateItem(item.id, "unit_cost", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="w-28 text-right">
                {idx === 0 && <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Line Total</div>}
                <p className="py-2 text-sm font-medium text-gray-900 dark:text-white">{(item.qty * item.unit_cost).toFixed(2)} MAD</p>
              </div>
              <button onClick={() => removeItem(item.id)} disabled={items.length === 1}
                className="pb-1 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors">
          <Plus className="w-4 h-4" /> Add Item
        </button>

        <div className="border-t border-gray-100 dark:border-[#1F1F23] pt-4 space-y-2 text-sm">
          {[["Subtotal (HT)", subtotal], ["TVA (20%)", tva]].map(([label, val]) => (
            <div key={label as string} className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{label}</span><span>{(val as number).toFixed(2)} MAD</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
            <span>Total (TTC)</span><span>{total.toFixed(2)} MAD</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {onBack && <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>}
        <button onClick={handleSave} disabled={!vendorId}
          className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors ${saved ? "bg-green-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white"}`}>
          <Save className="w-4 h-4" />{saved ? "Saved as Draft!" : "Save as Draft"}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `purchase-order-detail-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { ArrowLeft, CheckCircle, Clock, Truck, XCircle, Send, Package } from "lucide-react"

interface PODetail {
  id: string; number: string; vendor: string; status: "draft" | "sent" | "confirmed" | "received" | "cancelled"
  created_at: string; expected_delivery?: string; notes?: string
  subtotal_ht: number; tva_amount: number; total_ttc: number; amount_paid: number
  items: { id: string; product: string; qty: number; unit_cost: number; line_total: number; received?: number }[]
}

const mockPO: PODetail = {
  id: "po-1", number: "PO-2025-0042", vendor: "Al Watan Supplies", status: "confirmed",
  created_at: "2025-01-19", expected_delivery: "2025-01-25", notes: "Urgent order for weekend event",
  subtotal_ht: 4250, tva_amount: 850, total_ttc: 5100, amount_paid: 2000,
  items: [
    { id: "pi-1", product: "Arabica Coffee Beans", qty: 50, unit_cost: 85, line_total: 4250 },
  ],
}

const STATUS_STEPS = [
  { key: "draft", label: "Draft", icon: Clock },
  { key: "sent", label: "Sent", icon: Send },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "received", label: "Received", icon: Package },
]
const STATUS_IDX: Record<string, number> = { draft: 0, sent: 1, confirmed: 2, received: 3, cancelled: -1 }

export default function PurchaseOrderDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const po = mockPO
  const currentStep = STATUS_IDX[po.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>}
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{po.number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${po.status === "received" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : po.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"}`}>
              {po.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vendor: {po.vendor} · Created: {po.created_at}{po.expected_delivery ? ` · Expected: ${po.expected_delivery}` : ""}</p>
        </div>
        <div className="flex gap-2">
          {po.status === "draft" && <button className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Send to Vendor</button>}
          {po.status === "confirmed" && <button className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Mark Received</button>}
        </div>
      </div>

      {/* Status Timeline */}
      {po.status !== "cancelled" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, idx) => (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${idx <= currentStep ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12]"}`}>
                    <step.icon className={`w-4 h-4 ${idx <= currentStep ? "text-indigo-600 dark:text-indigo-400" : "text-gray-300 dark:text-gray-600"}`} />
                  </div>
                  <span className={`text-xs font-medium ${idx <= currentStep ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-600"}`}>{step.label}</span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-5 mx-1 ${idx < currentStep ? "bg-indigo-500" : "bg-gray-200 dark:bg-[#1F1F23]"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#1F1F23]">
          <h3 className="font-semibold text-gray-900 dark:text-white">Order Items</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "Qty", "Unit Cost", "Line Total"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {po.items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.product}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.qty}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.unit_cost.toFixed(2)} MAD</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{item.line_total.toFixed(2)} MAD</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-4 border-t border-gray-100 dark:border-[#1F1F23] space-y-2 text-sm">
          {[["Subtotal HT", po.subtotal_ht], ["TVA", po.tva_amount]].map(([l, v]) => (
            <div key={l as string} className="flex justify-between text-gray-500 dark:text-gray-400"><span>{l}</span><span>{(v as number).toFixed(2)} MAD</span></div>
          ))}
          <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
            <span>Total TTC</span><span>{po.total_ttc.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-between text-green-600 dark:text-green-400"><span>Paid</span><span>{po.amount_paid.toFixed(2)} MAD</span></div>
          <div className="flex justify-between font-semibold text-red-600 dark:text-red-400"><span>Balance Due</span><span>{(po.total_ttc - po.amount_paid).toFixed(2)} MAD</span></div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `stock-templates-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Search, LayoutList, FileText } from "lucide-react"

interface TemplateItem { product: string; qty: number; unit: string }
interface StockTemplate { id: string; name: string; description?: string; item_count: number; items: TemplateItem[]; is_active: boolean }

const mockTemplates: StockTemplate[] = [
  { id: "t-1", name: "Weekly Coffee Supplies", description: "Standard weekly coffee station restock", item_count: 5, is_active: true,
    items: [{ product: "Arabica Coffee Beans", qty: 20, unit: "kg" }, { product: "Whole Milk", qty: 60, unit: "L" }, { product: "Paper Cups (M)", qty: 500, unit: "pcs" }, { product: "Vanilla Syrup", qty: 3, unit: "L" }, { product: "Sugar Sachets", qty: 300, unit: "pcs" }] },
  { id: "t-2", name: "Monthly Bakery Order", description: "Frozen items for cold storage", item_count: 3, is_active: true,
    items: [{ product: "Croissants (frozen)", qty: 400, unit: "pcs" }, { product: "Pain au Chocolat", qty: 200, unit: "pcs" }, { product: "Muffins (frozen)", qty: 150, unit: "pcs" }] },
  { id: "t-3", name: "Emergency Top-Up", description: "Fast replenishment for critical items", item_count: 2, is_active: true,
    items: [{ product: "Paper Cups (M)", qty: 200, unit: "pcs" }, { product: "Whole Milk", qty: 20, unit: "L" }] },
]

export default function StockTemplatesPage() {
  const [templates, setTemplates] = useState(mockTemplates)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setForm({ name: "", description: "" }); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(t => (
          <div key={t.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23]">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <LayoutList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                {t.description && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t.description}</p>}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t.item_count} items</span>
              <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#1F1F23] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                {expanded === t.id ? "Hide" : "View Items"}
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <FileText className="w-3.5 h-3.5 inline mr-1" />Generate PO
              </button>
              {confirmDelete === t.id ? (
                <div className="flex gap-1">
                  <button onClick={() => { setTemplates(prev => prev.filter(x => x.id !== t.id)); setConfirmDelete(null) }} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                  <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {expanded === t.id && (
              <div className="border-t border-gray-100 dark:border-[#1F1F23] px-4 pb-4 pt-3">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="pb-2">Product</th><th className="pb-2">Qty</th><th className="pb-2">Unit</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[#1F1F23]">
                    {t.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5 text-gray-900 dark:text-white">{item.product}</td>
                        <td className="py-1.5 text-gray-600 dark:text-gray-400">{item.qty}</td>
                        <td className="py-1.5 text-gray-600 dark:text-gray-400">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Template</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Template name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={() => {
                if (!form.name.trim()) return
                setTemplates(prev => [...prev, { id: `t-${Date.now()}`, name: form.name, description: form.description, item_count: 0, items: [], is_active: true }])
                setShowModal(false)
              }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Create Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `vendor-detail-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { ArrowLeft, Building2, Phone, Mail, MapPin, CreditCard, FileText, DollarSign } from "lucide-react"

interface VendorDetail {
  id: string; name: string; contact_name?: string; phone?: string; email?: string; address?: string
  payment_terms_days: number; ice?: string; rib?: string; is_active: boolean
  checks: { id: string; number: string; bank: string; amount: number; due_date: string; status: "pending" | "cleared" | "bounced" }[]
  recent_pos: { id: string; number: string; date: string; total: number; status: string }[]
  stats: { total_purchases: number; outstanding_balance: number; avg_payment_days: number }
}

const mockVendor: VendorDetail = {
  id: "vendor-1", name: "Al Watan Supplies", contact_name: "Youssef Alami", phone: "+212522334455",
  email: "youssef@alwatan.ma", address: "Zone Industrielle, Ain Sebaa, Casablanca",
  payment_terms_days: 30, ice: "001234567000012", rib: "320 006 0123456789012345 07",
  is_active: true,
  checks: [
    { id: "c-1", number: "CHK-2025-001", bank: "Attijariwafa Bank", amount: 5100, due_date: "2025-02-15", status: "pending" },
    { id: "c-2", number: "CHK-2024-089", bank: "CIH Bank", amount: 3800, due_date: "2025-01-10", status: "cleared" },
  ],
  recent_pos: [
    { id: "po-1", number: "PO-2025-0042", date: "2025-01-19", total: 5100, status: "confirmed" },
    { id: "po-2", number: "PO-2025-0028", date: "2025-01-05", total: 3200, status: "received" },
    { id: "po-3", number: "PO-2024-0183", date: "2024-12-15", total: 6700, status: "received" },
  ],
  stats: { total_purchases: 84600, outstanding_balance: 5100, avg_payment_days: 28 },
}

const TABS = ["Info", "Checks", "Purchase Orders"] as const

export default function VendorDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const vendor = mockVendor
  const [tab, setTab] = useState<typeof TABS[number]>("Info")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>}
        <div className="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{vendor.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${vendor.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
              {vendor.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          {vendor.contact_name && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Contact: {vendor.contact_name}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center flex-shrink-0">
          {[
            { label: "Total Purchases", value: `${(vendor.stats.total_purchases / 1000).toFixed(0)}K MAD` },
            { label: "Outstanding", value: `${vendor.stats.outstanding_balance.toLocaleString()} MAD` },
            { label: "Avg Pay Days", value: `${vendor.stats.avg_payment_days}d` },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-3 min-w-[100px]">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-[#1F1F23]">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === "Info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Contact</h3>
            {[
              { icon: Phone, label: "Phone", value: vendor.phone ?? "—" },
              { icon: Mail, label: "Email", value: vendor.email ?? "—" },
              { icon: MapPin, label: "Address", value: vendor.address ?? "—" },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3 text-sm">
                <row.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-gray-400">{row.label}</p><p className="text-gray-900 dark:text-white">{row.value}</p></div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Financial</h3>
            {[
              { icon: CreditCard, label: "Payment Terms", value: `${vendor.payment_terms_days} days` },
              { icon: FileText, label: "ICE", value: vendor.ice ?? "—" },
              { icon: DollarSign, label: "RIB", value: vendor.rib ?? "—" },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3 text-sm">
                <row.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-gray-400">{row.label}</p><p className="font-mono text-xs text-gray-900 dark:text-white">{row.value}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Checks" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>{["Check #", "Bank", "Amount", "Due Date", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {vendor.checks.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{c.number}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.bank}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{c.amount.toLocaleString()} MAD</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.due_date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${c.status === "cleared" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : c.status === "bounced" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Purchase Orders" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>{["PO Number", "Date", "Status", "Total"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {vendor.recent_pos.map(po => (
                <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{po.number}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{po.date}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-xs capitalize">{po.status}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{po.total.toLocaleString()} MAD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/admin-dashboard-ui-v3/components/purchase-order-create-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/purchase-order-detail-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/stock-templates-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/vendor-detail-page.tsx"
git commit -m "dashboard: add PO create/detail, stock-templates, vendor-detail pages"
```

---

### Task 6: Inventory C — expiration alerts and discrepancy alerts (2 pages)

**Files:**
- Create: `apps/frontend/admin-dashboard-ui-v3/components/expiration-alerts-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/discrepancy-alerts-page.tsx`

- [ ] **Step 1: Create `expiration-alerts-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { AlertTriangle, CheckCircle, Clock, Search, Filter } from "lucide-react"

interface ExpirationAlert {
  id: string; product: string; batch_number: string; warehouse: string
  qty: number; unit: string; expires_at: string; days_until_expiry: number
  status: "active" | "resolved"
}

const mockAlerts: ExpirationAlert[] = [
  { id: "ea-1", product: "Vanilla Syrup", batch_number: "BATCH-2025-003", warehouse: "Main WH", qty: 4, unit: "L", expires_at: "2025-02-15", days_until_expiry: 26, status: "active" },
  { id: "ea-2", product: "Whole Milk", batch_number: "BATCH-2025-002", warehouse: "Main WH", qty: 12, unit: "L", expires_at: "2025-02-01", days_until_expiry: 12, status: "active" },
  { id: "ea-3", product: "Fresh Cream", batch_number: "BATCH-2025-001", warehouse: "Cold WH", qty: 2, unit: "L", expires_at: "2025-01-25", days_until_expiry: 5, status: "active" },
  { id: "ea-4", product: "Yogurt Cups", batch_number: "BATCH-2024-099", warehouse: "Cold WH", qty: 18, unit: "pcs", expires_at: "2025-01-10", days_until_expiry: -10, status: "resolved" },
]

export default function ExpirationAlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [statusFilter, setStatusFilter] = useState("active")
  const [search, setSearch] = useState("")

  const filtered = alerts.filter(a => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter
    const matchSearch = a.product.toLowerCase().includes(search.toLowerCase()) || a.batch_number.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const resolve = (id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "resolved" as const } : a))

  const urgencyColor = (days: number) => {
    if (days < 0) return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
    if (days <= 7) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    if (days <= 30) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Alerts</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
          <AlertTriangle className="w-4 h-4" />
          {alerts.filter(a => a.status === "active").length} active alerts
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "Batch", "Warehouse", "Qty", "Expires", "Urgency", "Status", "Action"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.product}</td>
                <td className="px-4 py-3"><code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{a.batch_number}</code></td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.warehouse}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.qty} {a.unit}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.expires_at}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyColor(a.days_until_expiry)}`}>
                    {a.days_until_expiry < 0 ? "Expired" : a.days_until_expiry <= 7 ? "Critical" : a.days_until_expiry <= 30 ? "Warning" : "Watch"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 text-xs font-medium ${a.status === "active" ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`}>
                    {a.status === "active" ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.status === "active" && (
                    <button onClick={() => resolve(a.id)} className="px-2.5 py-1 text-xs font-medium bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg transition-colors">
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No alerts found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `discrepancy-alerts-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { AlertCircle, Search, CheckCircle, Clock } from "lucide-react"

interface DiscrepancyAlert {
  id: string; product: string; warehouse: string; system_qty: number
  actual_qty: number; unit: string; detected_at: string
  status: "open" | "investigating" | "resolved"; source: "system_detected" | "offline_sync"
}

const mockAlerts: DiscrepancyAlert[] = [
  { id: "da-1", product: "Paper Cups (M)", warehouse: "Main WH", system_qty: 900, actual_qty: 780, unit: "pcs", detected_at: "2025-01-21", status: "open", source: "system_detected" },
  { id: "da-2", product: "Sugar Sachets", warehouse: "Main WH", system_qty: 300, actual_qty: 0, unit: "pcs", detected_at: "2025-01-20", status: "investigating", source: "offline_sync" },
  { id: "da-3", product: "Vanilla Syrup", warehouse: "Main WH", system_qty: 5, actual_qty: 4, unit: "L", detected_at: "2025-01-18", status: "resolved", source: "system_detected" },
]

const ACTIONS = ["manual_recount", "accept_loss", "adjust_batch"] as const

export default function DiscrepancyAlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [search, setSearch] = useState("")
  const [actionModal, setActionModal] = useState<{ alertId: string; action: typeof ACTIONS[number] } | null>(null)

  const filtered = alerts.filter(a => a.product.toLowerCase().includes(search.toLowerCase()))

  const applyAction = () => {
    if (!actionModal) return
    setAlerts(prev => prev.map(a => a.id === actionModal.alertId ? { ...a, status: "resolved" as const } : a))
    setActionModal(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          {alerts.filter(a => a.status !== "resolved").length} open discrepancies
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Product", "Warehouse", "System Qty", "Actual Qty", "Difference", "Detected", "Source", "Status", "Actions"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(a => {
              const diff = a.actual_qty - a.system_qty
              return (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.product}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.warehouse}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.system_qty} {a.unit}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.actual_qty} {a.unit}</td>
                  <td className="px-4 py-3"><span className={`font-semibold ${diff < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{diff > 0 ? "+" : ""}{diff} {a.unit}</span></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.detected_at}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded capitalize">{a.source.replace("_", " ")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${a.status === "resolved" ? "text-green-600 dark:text-green-400" : a.status === "investigating" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                      {a.status === "resolved" ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status !== "resolved" && (
                      <div className="flex gap-1 flex-wrap">
                        {ACTIONS.map(action => (
                          <button key={action} onClick={() => setActionModal({ alertId: a.id, action })}
                            className="px-2 py-1 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors capitalize">
                            {action.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No discrepancies found</td></tr>}
          </tbody>
        </table>
      </div>

      {actionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{actionModal.action.replace(/_/g, " ")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {actionModal.action === "manual_recount" && "Mark this alert as under investigation pending a physical recount."}
              {actionModal.action === "accept_loss" && "Accept the discrepancy as a loss. The system quantity will be updated to match actual."}
              {actionModal.action === "adjust_batch" && "Create a batch adjustment to reconcile the discrepancy."}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={applyAction} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/frontend/admin-dashboard-ui-v3/components/expiration-alerts-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/discrepancy-alerts-page.tsx"
git commit -m "dashboard: add expiration-alerts, discrepancy-alerts pages"
```
