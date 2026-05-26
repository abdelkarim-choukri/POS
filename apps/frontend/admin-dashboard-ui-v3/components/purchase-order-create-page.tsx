"use client"
import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface POItem { id: string; product_id: string; productName: string; qty: number; unit_cost: number; tva_rate: number }

interface Vendor { id: string; name: string }
interface Warehouse { id: string; name: string }
interface Product { id: string; name: string; sku: string; default_unit_cost_ht: number }

export default function PurchaseOrderCreatePage({ onBack }: { onBack?: () => void }) {
  const [vendorId, setVendorId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<POItem[]>([{ id: "i-1", product_id: "", productName: "", qty: 1, unit_cost: 0, tva_rate: 20 }])

  // Dropdown data
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [dropdownLoading, setDropdownLoading] = useState(false)
  const [dropdownError, setDropdownError] = useState<string | null>(null)

  // Product search
  const [productSearch, setProductSearch] = useState("")
  const [productResults, setProductResults] = useState<Product[]>([])
  const [productSearching, setProductSearching] = useState(false)
  const [activeSearchItemId, setActiveSearchItemId] = useState<string | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Load vendors + warehouses on mount
  useEffect(() => {
    setDropdownLoading(true)
    setDropdownError(null)
    Promise.all([
      apiFetch<{ data: Vendor[] } | Vendor[]>("/api/business/vendors"),
      apiFetch<{ data: Warehouse[] } | Warehouse[]>("/api/business/warehouses"),
    ])
      .then(([vendorRes, warehouseRes]) => {
        setVendors(Array.isArray(vendorRes) ? vendorRes : vendorRes.data)
        setWarehouses(Array.isArray(warehouseRes) ? warehouseRes : warehouseRes.data)
      })
      .catch(e => setDropdownError(e.message ?? "Failed to load vendors/warehouses"))
      .finally(() => setDropdownLoading(false))
  }, [])

  // Debounced product search
  const triggerProductSearch = (query: string, itemId: string) => {
    setActiveSearchItemId(itemId)
    setProductSearch(query)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!query.trim()) { setProductResults([]); return }
    searchDebounceRef.current = setTimeout(async () => {
      setProductSearching(true)
      try {
        const res = await apiFetch<{ data: Product[] } | Product[]>(`/api/business/products?search=${encodeURIComponent(query)}&limit=20`)
        setProductResults(Array.isArray(res) ? res : res.data)
      } catch {
        setProductResults([])
      } finally {
        setProductSearching(false)
      }
    }, 300)
  }

  const selectProduct = (itemId: string, product: Product) => {
    setItems(prev => prev.map(i =>
      i.id !== itemId ? i : { ...i, product_id: product.id, productName: product.name, unit_cost: product.default_unit_cost_ht ?? 0 }
    ))
    setProductResults([])
    setProductSearch("")
    setActiveSearchItemId(null)
  }

  const addItem = () => setItems(prev => [...prev, { id: `i-${Date.now()}`, product_id: "", productName: "", qty: 1, unit_cost: 0, tva_rate: 20 }])
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id: string, field: keyof POItem, value: any) =>
    setItems(prev => prev.map(i => i.id !== id ? i : { ...i, [field]: value }))

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_cost, 0)
  const tva = items.reduce((s, i) => s + i.qty * i.unit_cost * (i.tva_rate / 100), 0)
  const total = subtotal + tva

  const handleSave = async () => {
    if (!vendorId || !warehouseId) return
    const validItems = items.filter(i => i.product_id && i.qty > 0)
    if (validItems.length === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiFetch("/api/business/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId,
          warehouse_id: warehouseId,
          expected_delivery_date: deliveryDate || undefined,
          notes: notes || undefined,
          items: validItems.map(i => ({
            product_id: i.product_id,
            quantity_ordered: i.qty,
            unit_cost_ht: i.unit_cost,
            tva_rate: i.tva_rate,
          })),
        }),
      })
      if (onBack) onBack()
    } catch (e: any) {
      setSubmitError(e.message ?? "Failed to create purchase order")
    } finally {
      setSubmitting(false)
    }
  }

  const canSave = vendorId && warehouseId && items.some(i => i.product_id && i.qty > 0) && !submitting

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

        {dropdownError && (
          <p className="text-xs text-red-500">{dropdownError}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor *</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              value={vendorId}
              onChange={e => setVendorId(e.target.value)}
              disabled={dropdownLoading}
            >
              <option value="">{dropdownLoading ? "Loading..." : "Select vendor..."}</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warehouse *</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              disabled={dropdownLoading}
            >
              <option value="">{dropdownLoading ? "Loading..." : "Select warehouse..."}</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
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
            <div key={item.id} className="space-y-1">
              <div className="flex gap-3 items-end">
                {/* Product search input */}
                <div className="flex-1 relative">
                  {idx === 0 && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>}
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Search product..."
                    value={activeSearchItemId === item.id ? productSearch : item.productName}
                    onChange={e => triggerProductSearch(e.target.value, item.id)}
                    onFocus={() => { if (item.productName) { setActiveSearchItemId(item.id); setProductSearch(item.productName) } }}
                    onBlur={() => setTimeout(() => { setProductResults([]); setActiveSearchItemId(null); setProductSearch("") }, 150)}
                  />
                  {/* Search dropdown */}
                  {activeSearchItemId === item.id && (productResults.length > 0 || productSearching) && (
                    <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white dark:bg-[#1a1a20] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {productSearching && <div className="px-3 py-2 text-xs text-gray-400">Searching...</div>}
                      {!productSearching && productResults.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => selectProduct(item.id, p)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        >
                          <span className="font-medium">{p.name}</span>
                          {p.sku && <span className="ml-2 text-xs text-gray-400">{p.sku}</span>}
                          {p.default_unit_cost_ht != null && <span className="ml-2 text-xs text-gray-400">{p.default_unit_cost_ht} MAD</span>}
                        </button>
                      ))}
                    </div>
                  )}
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

                <div className="w-20">
                  {idx === 0 && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">TVA %</label>}
                  <input type="number" min={0} max={100} step={1} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={item.tva_rate} onChange={e => updateItem(item.id, "tva_rate", parseFloat(e.target.value) || 0)} />
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
            </div>
          ))}
        </div>
        <button onClick={addItem} className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors">
          <Plus className="w-4 h-4" /> Add Item
        </button>

        <div className="border-t border-gray-100 dark:border-[#1F1F23] pt-4 space-y-2 text-sm">
          {[["Subtotal (HT)", subtotal], ["TVA", tva]].map(([label, val]) => (
            <div key={label as string} className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{label}</span><span>{(val as number).toFixed(2)} MAD</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-1 border-t border-gray-100 dark:border-[#1F1F23]">
            <span>Total (TTC)</span><span>{total.toFixed(2)} MAD</span>
          </div>
        </div>
      </div>

      {submitError && (
        <p className="text-sm text-red-500">{submitError}</p>
      )}

      <div className="flex justify-end gap-3">
        {onBack && <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>}
        <button onClick={handleSave} disabled={!canSave}
          className="flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white">
          <Save className="w-4 h-4" />{submitting ? "Saving..." : "Save as Draft"}
        </button>
      </div>
    </div>
  )
}
