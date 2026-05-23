"use client"
import { useState } from "react"
import { ArrowLeft, Package, CheckCircle, XCircle } from "lucide-react"

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
