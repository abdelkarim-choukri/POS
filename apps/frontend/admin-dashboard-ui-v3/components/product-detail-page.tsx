"use client"
import { useState, useEffect } from "react"
import { ArrowLeft, Package, CheckCircle, XCircle, Pencil, Plus, X } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Variant { id: string; name: string; price_delta: number; sku?: string; is_available: boolean; stock?: number }
interface ModifierGroup { id: string; name: string; options: string[]; required: boolean }
interface StockBatch { id: string; warehouse: string; qty: number; cost: number; expires_at?: string }
interface NutritionInfo { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; fiber_g?: number; sodium_mg?: number; allergens?: string }

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

const emptyVariantForm = { name: "", price_delta: "", sku: "", is_available: true }
const emptyNutritionForm: NutritionInfo = { calories: undefined, protein_g: undefined, carbs_g: undefined, fat_g: undefined, fiber_g: undefined, sodium_mg: undefined, allergens: "" }

export default function ProductDetailPage({ id, onBack }: { id: string; onBack?: () => void }) {
  const [product, setProduct] = useState<ProductDetail>(mockProduct)
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("Details")

  // Variants state
  const [variants, setVariants] = useState<Variant[]>(mockProduct.variants)
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variantsError, setVariantsError] = useState<string | null>(null)
  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null)
  const [variantForm, setVariantForm] = useState(emptyVariantForm)
  const [variantSaving, setVariantSaving] = useState(false)
  const [variantFormError, setVariantFormError] = useState<string | null>(null)

  // Nutrition state
  const [nutrition, setNutrition] = useState<NutritionInfo>(emptyNutritionForm)
  const [nutritionLoading, setNutritionLoading] = useState(false)
  const [nutritionError, setNutritionError] = useState<string | null>(null)
  const [nutritionSaving, setNutritionSaving] = useState(false)
  const [nutritionSaveError, setNutritionSaveError] = useState<string | null>(null)
  const [nutritionPresets, setNutritionPresets] = useState<any[]>([])
  const [presetsOpen, setPresetsOpen] = useState(false)

  const margin = product.cost ? (((product.price - product.cost) / product.price) * 100).toFixed(1) : null

  async function fetchProduct() {
    setProductLoading(true)
    setProductError(null)
    try {
      const data = await apiFetch<ProductDetail>(`/api/business/products/${id}`)
      setProduct(data)
    } catch (e: any) {
      setProductError(e?.message ?? "Failed to load product")
    } finally {
      setProductLoading(false)
    }
  }

  async function fetchVariants() {
    setVariantsLoading(true)
    setVariantsError(null)
    try {
      const res = await apiFetch(`/api/business/products/${id}/variants`)
      const data = Array.isArray(res) ? res : (res?.data ?? [])
      setVariants(data)
    } catch (e: any) {
      setVariantsError(e?.message ?? "Failed to load variants")
    } finally {
      setVariantsLoading(false)
    }
  }

  async function fetchNutrition() {
    setNutritionLoading(true)
    setNutritionError(null)
    try {
      const res = await apiFetch(`/api/business/products/${id}/nutrition`)
      if (res) setNutrition(res)
    } catch (e: any) {
      setNutritionError(e?.message ?? "Failed to load nutrition info")
    } finally {
      setNutritionLoading(false)
    }
  }

  async function loadNutritionPresets() {
    if (nutritionPresets.length > 0) { setPresetsOpen(true); return }
    try {
      const res = await apiFetch<any[] | { data: any[] }>("/api/business/nutrition-info")
      const list = Array.isArray(res) ? res : (res?.data ?? [])
      setNutritionPresets(list)
      setPresetsOpen(true)
    } catch {
      setPresetsOpen(false)
    }
  }

  useEffect(() => {
    Promise.all([fetchProduct(), fetchVariants(), fetchNutrition()])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function openAddVariant() {
    setEditingVariant(null)
    setVariantForm(emptyVariantForm)
    setVariantFormError(null)
    setVariantModalOpen(true)
  }

  function openEditVariant(v: Variant) {
    setEditingVariant(v)
    setVariantForm({ name: v.name, price_delta: String(v.price_delta), sku: v.sku ?? "", is_available: v.is_available })
    setVariantFormError(null)
    setVariantModalOpen(true)
  }

  function closeVariantModal() {
    setVariantModalOpen(false)
    setEditingVariant(null)
    setVariantFormError(null)
  }

  async function saveVariant() {
    if (!variantForm.name.trim()) { setVariantFormError("Name is required"); return }
    const priceDelta = parseFloat(variantForm.price_delta)
    if (isNaN(priceDelta)) { setVariantFormError("Price delta must be a number"); return }
    setVariantSaving(true)
    setVariantFormError(null)
    const body = { name: variantForm.name.trim(), price_delta: priceDelta, sku: variantForm.sku.trim() || undefined, is_available: variantForm.is_available }
    try {
      if (editingVariant) {
        await apiFetch(`/api/business/variants/${editingVariant.id}`, { method: "PUT", body: JSON.stringify(body) })
      } else {
        await apiFetch(`/api/business/products/${id}/variants`, { method: "POST", body: JSON.stringify(body) })
      }
      closeVariantModal()
      await fetchVariants()
    } catch (e: any) {
      setVariantFormError(e?.message ?? "Failed to save variant")
    } finally {
      setVariantSaving(false)
    }
  }

  async function saveNutrition() {
    setNutritionSaving(true)
    setNutritionSaveError(null)
    const body: Record<string, any> = {}
    if (nutrition.calories !== undefined && nutrition.calories !== null && String(nutrition.calories) !== "") body.calories = Number(nutrition.calories)
    if (nutrition.protein_g !== undefined && nutrition.protein_g !== null && String(nutrition.protein_g) !== "") body.protein_g = Number(nutrition.protein_g)
    if (nutrition.carbs_g !== undefined && nutrition.carbs_g !== null && String(nutrition.carbs_g) !== "") body.carbs_g = Number(nutrition.carbs_g)
    if (nutrition.fat_g !== undefined && nutrition.fat_g !== null && String(nutrition.fat_g) !== "") body.fat_g = Number(nutrition.fat_g)
    if (nutrition.fiber_g !== undefined && nutrition.fiber_g !== null && String(nutrition.fiber_g) !== "") body.fiber_g = Number(nutrition.fiber_g)
    if (nutrition.sodium_mg !== undefined && nutrition.sodium_mg !== null && String(nutrition.sodium_mg) !== "") body.sodium_mg = Number(nutrition.sodium_mg)
    if (nutrition.allergens !== undefined && nutrition.allergens !== "") body.allergens = nutrition.allergens
    try {
      await apiFetch(`/api/business/products/${id}/nutrition`, { method: "PUT", body: JSON.stringify(body) })
    } catch (e: any) {
      setNutritionSaveError(e?.message ?? "Failed to save nutrition info")
    } finally {
      setNutritionSaving(false)
    }
  }

  if (productLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 text-sm">
        Loading product…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {productError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {productError}
        </div>
      )}
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

            {/* Nutrition Section */}
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Nutrition Info</h3>
                <button
                  onClick={loadNutritionPresets}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Load preset
                </button>
              </div>
              {presetsOpen && nutritionPresets.length > 0 && (
                <div className="border border-gray-200 dark:border-[#2a2a32] rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#1a1a20]">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Select a nutrition template</span>
                    <button onClick={() => setPresetsOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-[#1F1F23]">
                    {nutritionPresets.map((p: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => { setNutrition({ calories: p.calories, protein_g: p.protein_g, carbs_g: p.carbs_g, fat_g: p.fat_g, fiber_g: p.fiber_g, sodium_mg: p.sodium_mg, allergens: p.allergens }); setPresetsOpen(false) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300"
                      >
                        {p.name ?? p.label ?? `Preset ${i + 1}`}
                        {p.calories && <span className="ml-2 text-xs text-gray-400">{p.calories} kcal</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {nutritionLoading && <p className="text-xs text-gray-400">Loading…</p>}
              {nutritionError && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{nutritionError}</div>
              )}
              {nutritionSaveError && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{nutritionSaveError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {(["calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sodium_mg"] as const).map(field => (
                  <div key={field}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize">{field.replace(/_/g, " ")}</label>
                    <input
                      type="number"
                      min="0"
                      value={nutrition[field] ?? ""}
                      onChange={e => setNutrition(n => ({ ...n, [field]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-[#2a2a32] bg-gray-50 dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Allergens</label>
                <input
                  type="text"
                  value={nutrition.allergens ?? ""}
                  onChange={e => setNutrition(n => ({ ...n, allergens: e.target.value }))}
                  placeholder="e.g. Gluten, Dairy, Nuts"
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-[#2a2a32] bg-gray-50 dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={saveNutrition}
                disabled={nutritionSaving}
                className="w-full mt-1 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {nutritionSaving ? "Saving…" : "Save Nutrition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "Variants" && (
        <div className="space-y-4">
          {/* Error banner */}
          {variantsError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">{variantsError}</div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">{variantsLoading ? "Loading variants…" : `${variants.length} variant${variants.length !== 1 ? "s" : ""}`}</p>
            <button
              onClick={openAddVariant}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Variant
            </button>
          </div>

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a20]">
                <tr>
                  {["Variant Name", "Price", "SKU", "Available", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
                {variants.map(v => (
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditVariant(v)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        title="Edit variant"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!variantsLoading && variants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-600">No variants yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

      {/* Variant Modal */}
      {variantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1F1F23]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingVariant ? "Edit Variant" : "Add Variant"}
              </h2>
              <button onClick={closeVariantModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {variantFormError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{variantFormError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={variantForm.name}
                  onChange={e => setVariantForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Large (450ml)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#2a2a32] bg-gray-50 dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Price Delta (MAD) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  value={variantForm.price_delta}
                  onChange={e => setVariantForm(f => ({ ...f, price_delta: e.target.value }))}
                  placeholder="0 = base price, +8 = more, -5 = less"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#2a2a32] bg-gray-50 dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SKU</label>
                <input
                  type="text"
                  value={variantForm.sku}
                  onChange={e => setVariantForm(f => ({ ...f, sku: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#2a2a32] bg-gray-50 dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="variant-available"
                  checked={variantForm.is_available}
                  onChange={e => setVariantForm(f => ({ ...f, is_available: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="variant-available" className="text-sm text-gray-700 dark:text-gray-300">Available for sale</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-[#1F1F23]">
              <button onClick={closeVariantModal} className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors">
                Cancel
              </button>
              <button
                onClick={saveVariant}
                disabled={variantSaving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {variantSaving ? "Saving…" : editingVariant ? "Save Changes" : "Add Variant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
