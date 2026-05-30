# Dashboard Missing Pages — Part 1 (Architecture + Products + Customers/Promotions)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the admin dashboard SPA with 30 missing pages (inline mock data, no API calls). Part 1 covers the architecture wiring and the first 8 pages.

**Architecture:** Single-file SPA (`app/page.tsx`) routes by `activePage: string` state. New pages follow the pattern: types → mock data → component. Detail pages accept `id?: string` and `onBack?: () => void` props. All data is hardcoded — zero fetch calls.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, lucide-react

---

## File Structure

**Modify:**
- `apps/frontend/admin-dashboard-ui-v3/app/page.tsx` — add imports, selectedId state, switch cases, titles, PAGES, sidebar nav items

**Create (Part 1):**
- `apps/frontend/admin-dashboard-ui-v3/components/categories-page.tsx`
- `apps/frontend/admin-dashboard-ui-v3/components/brands-page.tsx`
- `apps/frontend/admin-dashboard-ui-v3/components/units-of-measure-page.tsx`
- `apps/frontend/admin-dashboard-ui-v3/components/product-detail-page.tsx`
- `apps/frontend/admin-dashboard-ui-v3/components/customer-detail-page.tsx`
- `apps/frontend/admin-dashboard-ui-v3/components/promotion-create-page.tsx`
- `apps/frontend/admin-dashboard-ui-v3/components/promotion-detail-page.tsx`
- `apps/frontend/admin-dashboard-ui-v3/components/coupon-bulk-issue-page.tsx`

---

### Task 0: Architecture — extend `app/page.tsx`

**Files:**
- Modify: `apps/frontend/admin-dashboard-ui-v3/app/page.tsx`

- [ ] **Step 1: Add imports for all 30 new components** — insert after line 31 (after `VendorPaymentsPage` import):

```tsx
import CategoriesPage from "@/components/categories-page"
import BrandsPage from "@/components/brands-page"
import UnitsOfMeasurePage from "@/components/units-of-measure-page"
import ProductDetailPage from "@/components/product-detail-page"
import CustomerDetailPage from "@/components/customer-detail-page"
import PromotionCreatePage from "@/components/promotion-create-page"
import PromotionDetailPage from "@/components/promotion-detail-page"
import CouponBulkIssuePage from "@/components/coupon-bulk-issue-page"
import DiningAreasPage from "@/components/dining-areas-page"
import TableTypesPage from "@/components/table-types-page"
import StockPage from "@/components/stock-page"
import StockBatchesPage from "@/components/stock-batches-page"
import StockMovementsPage from "@/components/stock-movements-page"
import PurchaseOrderCreatePage from "@/components/purchase-order-create-page"
import PurchaseOrderDetailPage from "@/components/purchase-order-detail-page"
import StockTemplatesPage from "@/components/stock-templates-page"
import VendorDetailPage from "@/components/vendor-detail-page"
import ExpirationAlertsPage from "@/components/expiration-alerts-page"
import DiscrepancyAlertsPage from "@/components/discrepancy-alerts-page"
import NotificationChannelsPage from "@/components/notification-channels-page"
import NotificationTemplatesPage from "@/components/notification-templates-page"
import NotificationSendPage from "@/components/notification-send-page"
import PlatformAnnouncementsPage from "@/components/platform-announcements-page"
import RecommendationItemsPage from "@/components/recommendation-items-page"
import TradeCategoriesPage from "@/components/trade-categories-page"
import CouriersPage from "@/components/couriers-page"
import SystemParametersPage from "@/components/system-parameters-page"
import VersionLogPage from "@/components/version-log-page"
import CustomAuthorityPage from "@/components/custom-authority-page"
import AdminAnnouncementsPage from "@/components/admin-announcements-page"
```

- [ ] **Step 2: Update `App` component** — replace the existing `App` export (lines 1425–1433) with:

```tsx
export default function App() {
  const [page, setPage] = useState<Page>("super-dashboard")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const navigate = (newPage: string, id?: string) => {
    setPage(newPage as Page)
    setSelectedId(id ?? null)
  }

  if (page === "super-dashboard") {
    return <SuperAdminPage onBack={() => navigate("dashboard")} />
  }

  return <MainLayout activePage={page} selectedId={selectedId} onNavigate={navigate} />
}
```

- [ ] **Step 3: Update `MainLayout` signature** — replace the existing function signature:

```tsx
// OLD
function MainLayout({ activePage, onNavigate }: { activePage: string; onNavigate: (page: string) => void }) {

// NEW
function MainLayout({ activePage, selectedId, onNavigate }: { activePage: string; selectedId: string | null; onNavigate: (page: string, id?: string) => void }) {
```

- [ ] **Step 4: Add new cases to `renderContent()`** — insert before `default:` line:

```tsx
case "categories": return <CategoriesPage onNavigate={onNavigate} />
case "brands": return <BrandsPage />
case "units-of-measure": return <UnitsOfMeasurePage />
case "product-detail": return <ProductDetailPage id={selectedId ?? 'prod-1'} onBack={() => onNavigate('products')} />
case "customer-detail": return <CustomerDetailPage id={selectedId ?? 'cust-1'} onBack={() => onNavigate('customers')} />
case "promotion-create": return <PromotionCreatePage onBack={() => onNavigate('promotions')} />
case "promotion-detail": return <PromotionDetailPage id={selectedId ?? 'promo-1'} onBack={() => onNavigate('promotions')} />
case "coupon-bulk-issue": return <CouponBulkIssuePage onBack={() => onNavigate('coupons')} />
case "dining-areas": return <DiningAreasPage />
case "table-types": return <TableTypesPage />
case "stock": return <StockPage onNavigate={onNavigate} />
case "stock-batches": return <StockBatchesPage />
case "stock-movements": return <StockMovementsPage />
case "purchase-order-create": return <PurchaseOrderCreatePage onBack={() => onNavigate('purchase-orders')} />
case "purchase-order-detail": return <PurchaseOrderDetailPage id={selectedId ?? 'po-1'} onBack={() => onNavigate('purchase-orders')} />
case "stock-templates": return <StockTemplatesPage />
case "vendor-detail": return <VendorDetailPage id={selectedId ?? 'vendor-1'} onBack={() => onNavigate('vendors')} />
case "expiration-alerts": return <ExpirationAlertsPage />
case "discrepancy-alerts": return <DiscrepancyAlertsPage />
case "notification-channels": return <NotificationChannelsPage />
case "notification-templates": return <NotificationTemplatesPage />
case "notification-send": return <NotificationSendPage />
case "platform-announcements": return <PlatformAnnouncementsPage />
case "recommendation-items": return <RecommendationItemsPage id={selectedId ?? 'tmpl-1'} onBack={() => onNavigate('recommendations')} />
case "trade-categories": return <TradeCategoriesPage />
case "couriers": return <CouriersPage />
case "system-parameters": return <SystemParametersPage />
case "version-log": return <VersionLogPage />
case "custom-authority": return <CustomAuthorityPage />
case "admin-announcements": return <AdminAnnouncementsPage />
```

- [ ] **Step 5: Add new titles** — add inside the `titles` Record object:

```tsx
categories: { title: "Categories", subtitle: "Product category management" },
brands: { title: "Brands", subtitle: "Product brands" },
"units-of-measure": { title: "Units of Measure", subtitle: "Measurement units" },
"product-detail": { title: "Product Detail", subtitle: "Product information" },
"customer-detail": { title: "Customer Profile", subtitle: "Customer information and history" },
"promotion-create": { title: "Create Promotion", subtitle: "New marketing promotion" },
"promotion-detail": { title: "Promotion Detail", subtitle: "Performance and settings" },
"coupon-bulk-issue": { title: "Bulk Issue Coupons", subtitle: "Issue coupons to customer segments" },
"dining-areas": { title: "Dining Areas", subtitle: "Restaurant seating areas" },
"table-types": { title: "Table Types", subtitle: "Table configurations" },
stock: { title: "Stock", subtitle: "Current stock position" },
"stock-batches": { title: "Stock Batches", subtitle: "Inventory batch records" },
"stock-movements": { title: "Stock Movements", subtitle: "Inventory movement log" },
"purchase-order-create": { title: "Create Purchase Order", subtitle: "New order from vendor" },
"purchase-order-detail": { title: "Purchase Order", subtitle: "Order details and status" },
"stock-templates": { title: "Stock Templates", subtitle: "Reusable order templates" },
"vendor-detail": { title: "Vendor Profile", subtitle: "Vendor details and history" },
"expiration-alerts": { title: "Expiration Alerts", subtitle: "Products nearing expiry" },
"discrepancy-alerts": { title: "Discrepancy Alerts", subtitle: "Stock count mismatches" },
"notification-channels": { title: "Notification Channels", subtitle: "SMS, Email, WhatsApp setup" },
"notification-templates": { title: "Message Templates", subtitle: "Reusable notification templates" },
"notification-send": { title: "Send Notification", subtitle: "Compose and deliver messages" },
"platform-announcements": { title: "Platform Announcements", subtitle: "System-wide notices" },
"recommendation-items": { title: "Template Items", subtitle: "Products in recommendation template" },
"trade-categories": { title: "Trade Categories", subtitle: "Business sector classification" },
couriers: { title: "Couriers", subtitle: "Delivery partner management" },
"system-parameters": { title: "System Parameters", subtitle: "Platform-wide configuration" },
"version-log": { title: "Version Log", subtitle: "Release notes and changelog" },
"custom-authority": { title: "Custom Authority", subtitle: "Per-business feature overrides" },
"admin-announcements": { title: "Admin Announcements", subtitle: "Manage platform announcements" },
```

- [ ] **Step 6: Extend `PAGES` const** — replace line 1422 with:

```tsx
const PAGES = [
  "login", "dashboard", "products", "customers", "employees", "locations",
  "reports", "promotions", "coupons", "tables", "floor-plan-setup", "modifiers",
  "recommendations", "terminals", "kds", "pex", "warehouses", "vendors",
  "vendor-payments", "purchase-orders", "stock-adjustments", "stock-transfers",
  "announcements", "communications", "notifications", "chain", "settings",
  "super-login", "super-dashboard", "businesses", "terminals-admin",
  // New pages
  "categories", "brands", "units-of-measure", "product-detail",
  "customer-detail", "promotion-create", "promotion-detail", "coupon-bulk-issue",
  "dining-areas", "table-types", "stock", "stock-batches", "stock-movements",
  "purchase-order-create", "purchase-order-detail", "stock-templates",
  "vendor-detail", "expiration-alerts", "discrepancy-alerts",
  "notification-channels", "notification-templates", "notification-send",
  "platform-announcements", "recommendation-items", "trade-categories",
  "couriers", "system-parameters", "version-log", "custom-authority",
  "admin-announcements",
] as const
type Page = typeof PAGES[number]
```

- [ ] **Step 7: Add new sidebar nav items** — in the `navGroups` array, update these groups:

```tsx
// CATALOG group — add after Recommendations:
{ icon: FolderOpen, label: "Categories", page: "categories" },
{ icon: Award, label: "Brands", page: "brands" },
{ icon: Ruler, label: "Units of Measure", page: "units-of-measure" },

// MARKETING group — add after Gift/Point Exchange:
{ icon: PlusCircle, label: "Create Promotion", page: "promotion-create" },
{ icon: Send, label: "Bulk Issue Coupons", page: "coupon-bulk-issue" },

// OPERATIONS group — add after floor-plan-setup and kds:
{ icon: LayoutGrid, label: "Dining Areas", page: "dining-areas" },
{ icon: Armchair, label: "Table Types", page: "table-types" },

// INVENTORY group — add after stock-transfers:
{ icon: BarChart2, label: "Stock", page: "stock" },
{ icon: Boxes, label: "Stock Batches", page: "stock-batches" },
{ icon: ArrowUpDown, label: "Stock Movements", page: "stock-movements" },
{ icon: FilePlus, label: "Create PO", page: "purchase-order-create" },
{ icon: LayoutList, label: "Stock Templates", page: "stock-templates" },
{ icon: AlertTriangle, label: "Expiration Alerts", page: "expiration-alerts" },
{ icon: AlertCircle, label: "Discrepancy Alerts", page: "discrepancy-alerts" },

// COMMUNICATIONS group — add after Activity Feed:
{ icon: Radio, label: "Channels", page: "notification-channels" },
{ icon: FileText, label: "Msg Templates", page: "notification-templates" },
{ icon: Send, label: "Send Message", page: "notification-send" },
{ icon: Globe, label: "Platform Notices", page: "platform-announcements" },

// Add new ADMIN group before SYSTEM:
{
  title: "ADMIN",
  items: [
    { icon: FolderTree, label: "Trade Categories", page: "trade-categories" },
    { icon: Bike, label: "Couriers", page: "couriers" },
    { icon: SlidersHorizontal, label: "System Params", page: "system-parameters" },
    { icon: BookOpen, label: "Version Log", page: "version-log" },
    { icon: KeyRound, label: "Custom Authority", page: "custom-authority" },
    { icon: Megaphone, label: "Admin Notices", page: "admin-announcements" },
  ]
},
```

Add missing lucide icon imports to the existing import block:
`FolderOpen, Award, Ruler, PlusCircle, Armchair, BarChart2, Boxes, ArrowUpDown, FilePlus, LayoutList, AlertTriangle, AlertCircle, Radio, Globe, FolderTree, Bike, SlidersHorizontal, BookOpen, KeyRound`

- [ ] **Step 8: Verify the app compiles** (components don't exist yet — expect import errors; that's fine for now)

```bash
cd "apps/frontend/admin-dashboard-ui-v3" && npx tsc --noEmit 2>&1 | grep "Cannot find module" | head -5
```

Expected: errors for all 30 missing component modules. If you see other errors, fix them before proceeding.

- [ ] **Step 9: Commit**

```bash
git add "apps/frontend/admin-dashboard-ui-v3/app/page.tsx"
git commit -m "dashboard: wire 30 new page routes and sidebar nav items"
```

---

### Task 1: Products section (4 pages)

**Files:**
- Create: `apps/frontend/admin-dashboard-ui-v3/components/categories-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/brands-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/units-of-measure-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/product-detail-page.tsx`

- [ ] **Step 1: Create `categories-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, FolderOpen, Search } from "lucide-react"

interface Category {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  product_count: number
}

const mockCategories: Category[] = [
  { id: "cat-1", name: "Beverages", description: "Hot and cold drinks", sort_order: 1, is_active: true, product_count: 24 },
  { id: "cat-2", name: "Food", description: "Main dishes and sides", sort_order: 2, is_active: true, product_count: 18 },
  { id: "cat-3", name: "Desserts", description: "Pastries and sweets", sort_order: 3, is_active: true, product_count: 12 },
  { id: "cat-4", name: "Snacks", description: "Light bites", sort_order: 4, is_active: true, product_count: 8 },
  { id: "cat-5", name: "Seasonal", description: "Limited time items", sort_order: 5, is_active: false, product_count: 5 },
  { id: "cat-6", name: "Alcohol", description: "Alcoholic beverages", sort_order: 6, is_active: false, product_count: 0 },
]

export default function CategoriesPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const [items, setItems] = useState(mockCategories)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", description: "", sort_order: 1 })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => {
    setEditing(null)
    setForm({ name: "", description: "", sort_order: items.length + 1 })
    setShowModal(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, description: c.description ?? "", sort_order: c.sort_order })
    setShowModal(true)
  }

  const save = () => {
    if (!form.name.trim()) return
    if (editing) {
      setItems(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c))
    } else {
      setItems(prev => [...prev, { id: `cat-${Date.now()}`, ...form, is_active: true, product_count: 0 }])
    }
    setShowModal(false)
  }

  const toggle = (id: string) =>
    setItems(prev => prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c))

  const remove = (id: string) => {
    setItems(prev => prev.filter(c => c.id !== id))
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>
              {["Name", "Description", "Products", "Sort", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{cat.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{cat.product_count}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{cat.sort_order}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(cat.id)}>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDelete === cat.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => remove(cat.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded-md">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded-md">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(cat.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 dark:text-gray-600">No categories found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Category" : "New Category"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            {[
              { label: "Name *", key: "name", placeholder: "e.g. Beverages" },
              { label: "Description", key: "description", placeholder: "Optional" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
              <input
                type="number" min={1}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                {editing ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `brands-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Search, Award, ExternalLink } from "lucide-react"

interface Brand {
  id: string
  name: string
  description?: string
  website?: string
  logo_url?: string
  product_count: number
  is_active: boolean
}

const mockBrands: Brand[] = [
  { id: "br-1", name: "Danone", description: "Dairy and beverages", website: "danone.com", product_count: 12, is_active: true },
  { id: "br-2", name: "Centrale Laitière", description: "Moroccan dairy leader", website: "centralelaitiere.ma", product_count: 8, is_active: true },
  { id: "br-3", name: "Bimo", description: "Biscuits and snacks", website: "bimo.ma", product_count: 15, is_active: true },
  { id: "br-4", name: "Coca-Cola", description: "Soft drinks", website: "coca-cola.com", product_count: 6, is_active: true },
  { id: "br-5", name: "Lesieur", description: "Cooking oils", website: "lesieur.ma", product_count: 4, is_active: true },
  { id: "br-6", name: "Local Brand", description: "Unbranded local products", product_count: 22, is_active: false },
]

export default function BrandsPage() {
  const [items, setItems] = useState(mockBrands)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [form, setForm] = useState({ name: "", description: "", website: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = items.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm({ name: "", description: "", website: "" }); setShowModal(true) }
  const openEdit = (b: Brand) => { setEditing(b); setForm({ name: b.name, description: b.description ?? "", website: b.website ?? "" }); setShowModal(true) }

  const save = () => {
    if (!form.name.trim()) return
    if (editing) {
      setItems(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b))
    } else {
      setItems(prev => [...prev, { id: `br-${Date.now()}`, ...form, product_count: 0, is_active: true }])
    }
    setShowModal(false)
  }

  const toggle = (id: string) => setItems(prev => prev.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b))
  const remove = (id: string) => { setItems(prev => prev.filter(b => b.id !== id)); setConfirmDelete(null) }

  return (
    <div className="space-y-6">
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
```

- [ ] **Step 3: Create `units-of-measure-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Search, Ruler } from "lucide-react"

interface UnitOfMeasure {
  id: string
  name: string
  symbol: string
  unit_type: "weight" | "volume" | "length" | "piece" | "area"
  is_active: boolean
}

const mockUnits: UnitOfMeasure[] = [
  { id: "u-1", name: "Kilogram", symbol: "kg", unit_type: "weight", is_active: true },
  { id: "u-2", name: "Gram", symbol: "g", unit_type: "weight", is_active: true },
  { id: "u-3", name: "Liter", symbol: "L", unit_type: "volume", is_active: true },
  { id: "u-4", name: "Milliliter", symbol: "mL", unit_type: "volume", is_active: true },
  { id: "u-5", name: "Piece", symbol: "pcs", unit_type: "piece", is_active: true },
  { id: "u-6", name: "Box", symbol: "box", unit_type: "piece", is_active: true },
  { id: "u-7", name: "Meter", symbol: "m", unit_type: "length", is_active: false },
]

const TYPE_COLORS: Record<string, string> = {
  weight: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  volume: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  length: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  piece: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  area: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
}

export default function UnitsOfMeasurePage() {
  const [units, setUnits] = useState(mockUnits)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null)
  const [form, setForm] = useState({ name: "", symbol: "", unit_type: "piece" as UnitOfMeasure["unit_type"] })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = units.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.symbol.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setEditing(null); setForm({ name: "", symbol: "", unit_type: "piece" }); setShowModal(true) }
  const openEdit = (u: UnitOfMeasure) => { setEditing(u); setForm({ name: u.name, symbol: u.symbol, unit_type: u.unit_type }); setShowModal(true) }

  const save = () => {
    if (!form.name.trim() || !form.symbol.trim()) return
    if (editing) {
      setUnits(prev => prev.map(u => u.id === editing.id ? { ...u, ...form } : u))
    } else {
      setUnits(prev => [...prev, { id: `u-${Date.now()}`, ...form, is_active: true }])
    }
    setShowModal(false)
  }

  const toggle = (id: string) => setUnits(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
  const remove = (id: string) => { setUnits(prev => prev.filter(u => u.id !== id)); setConfirmDelete(null) }

  return (
    <div className="space-y-6">
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
              {["Name", "Symbol", "Type", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">{u.symbol}</code>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[u.unit_type]}`}>{u.unit_type}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(u.id)}>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDelete === u.id ? (
                      <div className="flex gap-1 items-center">
                        <button onClick={() => remove(u.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded dark:text-gray-300">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(u.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kilogram" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symbol *</label>
              <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} placeholder="e.g. kg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.unit_type} onChange={e => setForm(p => ({ ...p, unit_type: e.target.value as UnitOfMeasure["unit_type"] }))}>
                {["weight", "volume", "length", "piece", "area"].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                {editing ? "Save Changes" : "Add Unit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `product-detail-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { ArrowLeft, Package, Tag, Edit2, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react"

interface Variant { id: string; name: string; price_delta: number; sku?: string; is_available: boolean }
interface ModifierGroup { id: string; name: string; options: string[]; required: boolean }
interface StockBatch { id: string; warehouse: string; qty: number; cost: number; expires_at?: string }

interface ProductDetail {
  id: string
  name: string
  category: string
  brand?: string
  uom?: string
  price: number
  cost?: number
  tva_rate: number
  sku?: string
  barcode?: string
  description?: string
  is_active: boolean
  is_sold_out: boolean
  track_stock: boolean
  whole_price_1?: number
  whole_price_2?: number
  whole_price_3?: number
  whole_price_4?: number
  variants: Variant[]
  modifier_groups: ModifierGroup[]
  stock_batches: StockBatch[]
}

const mockProduct: ProductDetail = {
  id: "prod-1",
  name: "Café Latte",
  category: "Beverages",
  brand: "Nescafé",
  uom: "Cup",
  price: 28.00,
  cost: 8.50,
  tva_rate: 10,
  sku: "BEV-LAT-001",
  barcode: "6111234567890",
  description: "Creamy espresso with steamed milk, available in multiple sizes.",
  is_active: true,
  is_sold_out: false,
  track_stock: false,
  whole_price_1: 25.00,
  whole_price_2: 23.00,
  whole_price_3: 20.00,
  whole_price_4: undefined,
  variants: [
    { id: "v-1", name: "Small (200ml)", price_delta: -5, sku: "BEV-LAT-S", is_available: true },
    { id: "v-2", name: "Medium (300ml)", price_delta: 0, sku: "BEV-LAT-M", is_available: true },
    { id: "v-3", name: "Large (450ml)", price_delta: 8, sku: "BEV-LAT-L", is_available: true },
  ],
  modifier_groups: [
    { id: "mg-1", name: "Milk Type", options: ["Full Milk", "Skim Milk", "Oat Milk", "Almond Milk"], required: true },
    { id: "mg-2", name: "Extras", options: ["Extra Shot", "Vanilla Syrup", "Caramel Syrup"], required: false },
  ],
  stock_batches: [
    { id: "sb-1", warehouse: "Main Warehouse", qty: 240, cost: 8.50, expires_at: "2025-03-01" },
  ],
}

const TABS = ["Details", "Variants", "Modifiers", "Stock"] as const
type Tab = typeof TABS[number]

export default function ProductDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const product = mockProduct
  const [tab, setTab] = useState<Tab>("Details")

  const margin = product.cost ? (((product.price - product.cost) / product.price) * 100).toFixed(1) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && (
          <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${product.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
              {product.is_active ? "Active" : "Inactive"}
            </span>
            {product.is_sold_out && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Sold Out</span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{product.category} {product.brand ? `· ${product.brand}` : ""} {product.sku ? `· SKU: ${product.sku}` : ""}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{product.price.toFixed(2)} MAD</p>
          {margin && <p className="text-sm text-green-600 dark:text-green-400">{margin}% margin</p>}
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

      {/* Tab Content */}
      {tab === "Details" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Basic Information</h3>
            {[
              { label: "Category", value: product.category },
              { label: "Brand", value: product.brand ?? "—" },
              { label: "Unit of Measure", value: product.uom ?? "—" },
              { label: "TVA Rate", value: `${product.tva_rate}%` },
              { label: "SKU", value: product.sku ?? "—" },
              { label: "Barcode", value: product.barcode ?? "—" },
              { label: "Track Stock", value: product.track_stock ? "Yes" : "No" },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                <span className="font-medium text-gray-900 dark:text-white">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Pricing</h3>
              {[
                { label: "Sale Price", value: `${product.price.toFixed(2)} MAD` },
                { label: "Cost", value: product.cost ? `${product.cost.toFixed(2)} MAD` : "—" },
                { label: "Wholesale Tier 1", value: product.whole_price_1 ? `${product.whole_price_1.toFixed(2)} MAD` : "—" },
                { label: "Wholesale Tier 2", value: product.whole_price_2 ? `${product.whole_price_2.toFixed(2)} MAD` : "—" },
                { label: "Wholesale Tier 3", value: product.whole_price_3 ? `${product.whole_price_3.toFixed(2)} MAD` : "—" },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{row.value}</span>
                </div>
              ))}
            </div>
            {product.description && (
              <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "Variants" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>
                {["Variant Name", "Price", "SKU", "Available"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {product.variants.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.name}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {v.price_delta === 0 ? "Base" : v.price_delta > 0 ? `+${v.price_delta.toFixed(2)}` : v.price_delta.toFixed(2)} MAD
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400"><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{v.sku ?? "—"}</code></td>
                  <td className="px-4 py-3">
                    {v.is_available
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Modifiers" && (
        <div className="space-y-4">
          {product.modifier_groups.map(mg => (
            <div key={mg.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{mg.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mg.required ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                  {mg.required ? "Required" : "Optional"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mg.options.map(opt => (
                  <span key={opt} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm rounded-lg">{opt}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Stock" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          {product.track_stock ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a20]">
                <tr>
                  {["Batch ID", "Warehouse", "Qty", "Cost/Unit", "Expires"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
                {product.stock_batches.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{b.id}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{b.warehouse}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.qty}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{b.cost.toFixed(2)} MAD</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{b.expires_at ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-gray-400 dark:text-gray-600">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Stock tracking not enabled for this product</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Start dev server and navigate to each new page**

```bash
cd "apps/frontend/admin-dashboard-ui-v3" && npm run dev
```

Navigate to the app and click: Categories (sidebar) → verify list renders with search and modal. Brands → verify card grid. Units of Measure → verify table. Product Detail → verify tabs switch correctly.

- [ ] **Step 6: Commit**

```bash
git add "apps/frontend/admin-dashboard-ui-v3/components/categories-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/brands-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/units-of-measure-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/product-detail-page.tsx"
git commit -m "dashboard: add categories, brands, units-of-measure, product-detail pages"
```

---

### Task 2: Customers & Promotions (4 pages)

**Files:**
- Create: `apps/frontend/admin-dashboard-ui-v3/components/customer-detail-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/promotion-create-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/promotion-detail-page.tsx`
- Create: `apps/frontend/admin-dashboard-ui-v3/components/coupon-bulk-issue-page.tsx`

- [ ] **Step 1: Create `customer-detail-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { ArrowLeft, User, Phone, Mail, MapPin, Star, Gift, Calendar, ShoppingCart } from "lucide-react"

interface CustomerProfile {
  id: string; name: string; phone: string; email?: string; address?: string
  grade: "Bronze" | "Silver" | "Gold" | "Platinum"; points: number; total_spent: number
  visit_count: number; last_visit?: string; birthday?: string; notes?: string
  labels: string[]
}
interface Transaction { id: string; number: string; date: string; total: number; items: number; method: string }
interface PointsEvent { id: string; date: string; description: string; points: number; balance_after: number }

const mockCustomer: CustomerProfile = {
  id: "cust-1", name: "Fatima Zahra Benali", phone: "+212661234567",
  email: "fatima@example.com", address: "12 Rue Hassan II, Casablanca",
  grade: "Gold", points: 2340, total_spent: 18500, visit_count: 47,
  last_visit: "2025-01-20", birthday: "1990-04-15",
  notes: "Prefers window seating. Allergic to nuts.",
  labels: ["VIP", "Regular", "Loyalty Member"],
}
const mockTransactions: Transaction[] = [
  { id: "t-1", number: "TXN-2025-001234", date: "2025-01-20", total: 186, items: 3, method: "Card" },
  { id: "t-2", number: "TXN-2025-001180", date: "2025-01-15", total: 95, items: 2, method: "Cash" },
  { id: "t-3", number: "TXN-2025-001050", date: "2025-01-08", total: 420, items: 6, method: "Card" },
  { id: "t-4", number: "TXN-2024-009876", date: "2024-12-28", total: 310, items: 4, method: "Mobile" },
]
const mockPoints: PointsEvent[] = [
  { id: "pe-1", date: "2025-01-20", description: "Purchase TXN-2025-001234", points: +18, balance_after: 2340 },
  { id: "pe-2", date: "2025-01-15", description: "Purchase TXN-2025-001180", points: +9, balance_after: 2322 },
  { id: "pe-3", date: "2025-01-10", description: "Points redeemed — Discount coupon", points: -100, balance_after: 2313 },
  { id: "pe-4", date: "2025-01-08", description: "Purchase TXN-2025-001050", points: +42, balance_after: 2413 },
]

const GRADE_COLORS: Record<string, string> = {
  Bronze: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Silver: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  Gold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Platinum: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
}
const TABS = ["Profile", "Transactions", "Points History", "Labels"] as const

export default function CustomerDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const customer = mockCustomer
  const [tab, setTab] = useState<typeof TABS[number]>("Profile")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && (
          <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {customer.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${GRADE_COLORS[customer.grade]}`}>{customer.grade}</span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>
            {customer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customer.email}</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center flex-shrink-0">
          {[
            { label: "Points", value: customer.points.toLocaleString(), icon: Star },
            { label: "Spent", value: `${customer.total_spent.toLocaleString()} MAD`, icon: ShoppingCart },
            { label: "Visits", value: customer.visit_count.toString(), icon: Calendar },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-3 min-w-[100px]">
              <stat.icon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
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

      {tab === "Profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Contact Information</h3>
            {[
              { label: "Phone", value: customer.phone },
              { label: "Email", value: customer.email ?? "—" },
              { label: "Address", value: customer.address ?? "—" },
              { label: "Birthday", value: customer.birthday ?? "—" },
              { label: "Last Visit", value: customer.last_visit ?? "—" },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{row.value}</span>
              </div>
            ))}
          </div>
          {customer.notes && (
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{customer.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === "Transactions" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>{["Transaction #", "Date", "Items", "Method", "Total"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {mockTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{t.number}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.date}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.items} items</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-xs">{t.method}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{t.total.toFixed(2)} MAD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Points History" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>{["Date", "Description", "Points", "Balance"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {mockPoints.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.date}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.description}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${p.points > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                      {p.points > 0 ? "+" : ""}{p.points}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{p.balance_after.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Labels" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Assigned Labels</h3>
          <div className="flex flex-wrap gap-2">
            {customer.labels.map(label => (
              <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium">
                <Gift className="w-3.5 h-3.5" />{label}
              </span>
            ))}
            {customer.labels.length === 0 && <p className="text-sm text-gray-400">No labels assigned</p>}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `promotion-create-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { ArrowLeft, Tag, Calendar, Percent, DollarSign, Package, Info } from "lucide-react"

type PromoType = "percentage" | "fixed" | "bogo" | "bundle"

interface PromoForm {
  name: string; type: PromoType; value: string
  min_purchase: string; max_discount: string
  start_date: string; end_date: string
  description: string; auto_apply: boolean
  stacking: boolean
}

const TYPE_OPTIONS: { value: PromoType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "percentage", label: "Percentage Off", description: "Discount a % of the subtotal", icon: <Percent className="w-5 h-5" /> },
  { value: "fixed", label: "Fixed Amount", description: "Deduct a fixed MAD amount", icon: <DollarSign className="w-5 h-5" /> },
  { value: "bogo", label: "Buy One Get One", description: "Free item on qualifying purchase", icon: <Package className="w-5 h-5" /> },
  { value: "bundle", label: "Bundle Deal", description: "Discount when buying a set of items", icon: <Tag className="w-5 h-5" /> },
]

export default function PromotionCreatePage({ onBack }: { onBack?: () => void }) {
  const [form, setForm] = useState<PromoForm>({
    name: "", type: "percentage", value: "",
    min_purchase: "", max_discount: "",
    start_date: "", end_date: "",
    description: "", auto_apply: true, stacking: false,
  })
  const [saved, setSaved] = useState(false)

  const set = (key: keyof PromoForm, value: any) => setForm(p => ({ ...p, [key]: value }))

  const handleSave = () => {
    if (!form.name || !form.value || !form.start_date || !form.end_date) return
    setSaved(true)
    setTimeout(() => { setSaved(false); if (onBack) onBack() }, 1500)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create Promotion</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Set up a new marketing promotion</p>
        </div>
      </div>

      {/* Type Selector */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Promotion Type</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TYPE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => set("type", opt.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${form.type === opt.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-[#1F1F23] hover:border-indigo-300 dark:hover:border-indigo-700"}`}>
              <div className={`${form.type === opt.value ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`}>{opt.icon}</div>
              <p className={`text-xs font-semibold ${form.type === opt.value ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"}`}>{opt.label}</p>
              <p className="text-xs text-gray-400 leading-tight">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Promotion Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promotion Name *</label>
            <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Ramadan Special 20% Off" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {form.type === "percentage" ? "Discount %" : "Discount Amount (MAD)"} *
            </label>
            <div className="relative">
              <input type="number" min={0}
                className="w-full px-3 py-2 pr-12 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.value} onChange={e => set("value", e.target.value)} placeholder={form.type === "percentage" ? "20" : "50.00"} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{form.type === "percentage" ? "%" : "MAD"}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Purchase (MAD)</label>
            <input type="number" min={0}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.min_purchase} onChange={e => set("min_purchase", e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
            <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.start_date} onChange={e => set("start_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
            <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.end_date} onChange={e => set("end_date", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Internal notes about this promotion" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          {[
            { key: "auto_apply", label: "Auto Apply", desc: "Applied automatically at checkout without coupon code" },
            { key: "stacking", label: "Allow Stacking", desc: "Can be combined with other promotions" },
          ].map(toggle => (
            <label key={toggle.key} className="flex items-start gap-3 cursor-pointer flex-1 p-3 rounded-lg border border-gray-200 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
              <input type="checkbox" className="mt-0.5 accent-indigo-600" checked={(form as any)[toggle.key]}
                onChange={e => set(toggle.key as keyof PromoForm, e.target.checked)} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{toggle.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{toggle.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onBack && (
          <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
        )}
        <button onClick={handleSave}
          className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${saved ? "bg-green-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
          {saved ? "✓ Saved!" : "Create Promotion"}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `promotion-detail-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { ArrowLeft, Tag, TrendingUp, Users, DollarSign, Calendar, CheckCircle, PauseCircle, Archive } from "lucide-react"

interface PromoDetail {
  id: string; name: string; type: string; value: number; status: "active" | "paused" | "archived"
  start_date: string; end_date: string; min_purchase?: number; auto_apply: boolean
  total_uses: number; total_discount_given: number; unique_customers: number
  daily_uses: { date: string; uses: number; discount: number }[]
}

const mockPromo: PromoDetail = {
  id: "promo-1", name: "Winter Sale 15% Off", type: "percentage", value: 15, status: "active",
  start_date: "2025-01-01", end_date: "2025-02-28", min_purchase: 100, auto_apply: true,
  total_uses: 234, total_discount_given: 8760, unique_customers: 187,
  daily_uses: [
    { date: "2025-01-18", uses: 18, discount: 680 },
    { date: "2025-01-19", uses: 24, discount: 920 },
    { date: "2025-01-20", uses: 31, discount: 1140 },
    { date: "2025-01-21", uses: 28, discount: 1050 },
    { date: "2025-01-22", uses: 15, discount: 560 },
  ],
}

const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  paused: { label: "Paused", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: PauseCircle },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400", icon: Archive },
}

export default function PromotionDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const promo = mockPromo
  const sc = STATUS_CONFIG[promo.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && (
          <button onClick={onBack} className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{promo.name}</h1>
            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
              <sc.icon className="w-3.5 h-3.5" />{sc.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
            {promo.type} · {promo.value}{promo.type === "percentage" ? "%" : " MAD"} off
            {promo.min_purchase ? ` · Min purchase: ${promo.min_purchase} MAD` : ""}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />{promo.start_date} → {promo.end_date}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="px-3 py-1.5 text-sm font-medium text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">Pause</button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1F1F23] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">Edit</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Uses", value: promo.total_uses.toLocaleString(), icon: Tag, color: "text-indigo-500" },
          { label: "Discount Given", value: `${promo.total_discount_given.toLocaleString()} MAD`, icon: DollarSign, color: "text-red-500" },
          { label: "Unique Customers", value: promo.unique_customers.toLocaleString(), icon: Users, color: "text-green-500" },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#1a1a20] flex items-center justify-center flex-shrink-0">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Uses Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#1F1F23]">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>{["Date", "Uses", "Discount Given", "Avg per Use"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase last:text-right">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {promo.daily_uses.map(d => (
              <tr key={d.date} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{d.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.uses}</td>
                <td className="px-4 py-3 text-red-600 dark:text-red-400">{d.discount.toLocaleString()} MAD</td>
                <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{(d.discount / d.uses).toFixed(2)} MAD</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `coupon-bulk-issue-page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { ArrowLeft, Ticket, Users, ChevronDown, CheckCircle, Send } from "lucide-react"

interface CouponType { id: string; name: string; type: string; value: number; available: number }

const mockCouponTypes: CouponType[] = [
  { id: "ct-1", name: "10% Welcome Discount", type: "percentage", value: 10, available: 500 },
  { id: "ct-2", name: "30 MAD Off Order", type: "fixed", value: 30, available: 200 },
  { id: "ct-3", name: "20% Loyalty Reward", type: "percentage", value: 20, available: 150 },
  { id: "ct-4", name: "Birthday Special 15%", type: "percentage", value: 15, available: 1000 },
]

type Segment = "all" | "grade" | "label"
const GRADES = ["Bronze", "Silver", "Gold", "Platinum"]
const LABELS = ["VIP", "Regular", "New Customer", "Loyalty Member", "At Risk"]

export default function CouponBulkIssuePage({ onBack }: { onBack?: () => void }) {
  const [couponTypeId, setCouponTypeId] = useState("")
  const [segment, setSegment] = useState<Segment>("all")
  const [grade, setGrade] = useState("Gold")
  const [label, setLabel] = useState("VIP")
  const [issued, setIssued] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectedType = mockCouponTypes.find(c => c.id === couponTypeId)
  const estimatedCount = segment === "all" ? 1240 : segment === "grade" ? 187 : 94

  const handleIssue = () => {
    if (!couponTypeId) return
    setLoading(true)
    setTimeout(() => { setLoading(false); setIssued(true) }, 1200)
  }

  if (issued) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Coupons Issued!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center">
          {estimatedCount} coupons for <strong>{selectedType?.name}</strong> are being sent to customers.
        </p>
        <p className="text-sm text-gray-400">The job will run in the background. Check Jobs for status.</p>
        {onBack && (
          <button onClick={onBack} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            Back to Coupons
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Issue Coupons</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Issue coupon codes to a customer segment</p>
        </div>
      </div>

      {/* Step 1: Select Coupon Type */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
          Select Coupon Type
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mockCouponTypes.map(ct => (
            <button key={ct.id} onClick={() => setCouponTypeId(ct.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${couponTypeId === ct.id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-[#1F1F23] hover:border-indigo-300 dark:hover:border-indigo-700"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Ticket className={`w-4 h-4 ${couponTypeId === ct.id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`} />
                <p className={`text-sm font-medium ${couponTypeId === ct.id ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>{ct.name}</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{ct.type} · {ct.value}{ct.type === "percentage" ? "%" : " MAD"} off</p>
              <p className="text-xs text-gray-400 mt-1">{ct.available} available</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Target Segment */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
          Target Segment
        </h2>
        <div className="flex gap-3">
          {(["all", "grade", "label"] as Segment[]).map(s => (
            <button key={s} onClick={() => setSegment(s)}
              className={`px-4 py-2 text-sm rounded-lg border-2 font-medium transition-all capitalize ${segment === s ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"}`}>
              {s === "all" ? "All Customers" : s === "grade" ? "By Grade" : "By Label"}
            </button>
          ))}
        </div>

        {segment === "grade" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
            <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={grade} onChange={e => setGrade(e.target.value)}>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        )}

        {segment === "label" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
            <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={label} onChange={e => setLabel(e.target.value)}>
              {LABELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Estimated recipients: <strong>{estimatedCount.toLocaleString()}</strong> customers
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onBack && <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>}
        <button onClick={handleIssue} disabled={!couponTypeId || loading}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
          {loading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send className="w-4 h-4" />}
          {loading ? "Sending..." : `Issue to ${estimatedCount.toLocaleString()} Customers`}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Start dev server and verify all 4 pages render**

```bash
cd "apps/frontend/admin-dashboard-ui-v3" && npm run dev
```

Navigate: Customer Profile (sidebar) → verify tabs. Create Promotion → verify type selector. Promotion Detail → verify stats + table. Bulk Issue → verify step-by-step form, confirm success state.

- [ ] **Step 6: Commit**

```bash
git add "apps/frontend/admin-dashboard-ui-v3/components/customer-detail-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/promotion-create-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/promotion-detail-page.tsx" \
        "apps/frontend/admin-dashboard-ui-v3/components/coupon-bulk-issue-page.tsx"
git commit -m "dashboard: add customer-detail, promotion-create, promotion-detail, coupon-bulk-issue pages"
```
