"use client"
import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import { vendorsApi, warehousesApi, productsApi, purchaseOrdersApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { CreatePOInput, CreatePOItemInput } from "@/lib/merchant/types"

function num(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }

type POItemRow = { key: string; product_id: string; productName: string; qty: string; unit_cost: string; tva_rate: string }
const newRow = (): POItemRow => ({ key: `i-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, product_id: "", productName: "", qty: "1", unit_cost: "", tva_rate: "20" })

export default function PurchaseOrderCreatePage({ onBack }: { onBack?: () => void }) {
  const queryClient = useQueryClient()
  const [vendorId, setVendorId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<POItemRow[]>([newRow()])
  const [openSearchKey, setOpenSearchKey] = useState<string | null>(null)

  const vendorsQuery = useQuery({ queryKey: merchantKeys.vendors.list(), queryFn: () => vendorsApi.list() })
  const vendors = (vendorsQuery.data ?? []).filter(v => v.is_active)
  const warehousesQuery = useQuery({ queryKey: merchantKeys.inventory.warehouses(), queryFn: () => warehousesApi.list() })
  const warehouses = warehousesQuery.data ?? []
  const productsQuery = useQuery({ queryKey: merchantKeys.inventory.products(), queryFn: () => productsApi.list() })
  const products = productsQuery.data ?? []

  const dropdownLoading = vendorsQuery.isLoading || warehousesQuery.isLoading

  const createMutation = useMutation({
    mutationFn: (input: CreatePOInput) => purchaseOrdersApi.create(input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: merchantKeys.purchaseOrders.all }); onBack?.() },
  })

  const updateItem = (key: string, patch: Partial<POItemRow>) => setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i))
  const addItem = () => setItems(prev => [...prev, newRow()])
  const removeItem = (key: string) => setItems(prev => prev.length === 1 ? prev : prev.filter(i => i.key !== key))

  const searchResults = (row: POItemRow) => {
    const q = row.productName.trim().toLowerCase()
    if (openSearchKey !== row.key || !q) return []
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20)
  }
  const selectProduct = (key: string, p: { id: string; name: string; price_mad?: unknown }) => {
    updateItem(key, { product_id: p.id, productName: p.name })
    setOpenSearchKey(null)
  }

  const subtotal = items.reduce((s, i) => s + num(i.qty) * num(i.unit_cost), 0)
  const tva = items.reduce((s, i) => s + num(i.qty) * num(i.unit_cost) * (num(i.tva_rate) / 100), 0)
  const total = subtotal + tva

  const validItems: CreatePOItemInput[] = items.filter(i => i.product_id && num(i.qty) > 0).map(i => ({
    product_id: i.product_id, quantity_ordered: num(i.qty), unit_cost_ht: num(i.unit_cost), tva_rate: num(i.tva_rate),
  }))
  const canSave = !!warehouseId && validItems.length > 0 && !createMutation.isPending

  const submit = () => {
    const input: CreatePOInput = { warehouse_id: warehouseId, items: validItems }
    if (vendorId) input.vendor_id = vendorId
    if (deliveryDate) input.expected_delivery_date = deliveryDate
    if (notes.trim()) input.notes = notes.trim()
    createMutation.mutate(input)
  }

  const submitError = createMutation.isError ? humanizeError(createMutation.error, "Failed to create purchase order.") : null

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        {onBack && <button onClick={onBack} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors"><ArrowLeft className="w-5 h-5" /></button>}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create Purchase Order</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">New order from vendor</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Order Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor</label>
            <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" value={vendorId} onChange={e => setVendorId(e.target.value)} disabled={dropdownLoading}>
              <option value="">{dropdownLoading ? "Loading..." : "No vendor"}</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warehouse *</label>
            <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} disabled={dropdownLoading}>
              <option value="">{dropdownLoading ? "Loading..." : "Select warehouse..."}</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Delivery</label>
            <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Order Items</h2>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.key} className="flex gap-3 items-end">
              <div className="flex-1 relative">
                {idx === 0 && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>}
                <input type="text" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search product..."
                  value={item.productName}
                  onChange={e => { updateItem(item.key, { productName: e.target.value, product_id: "" }); setOpenSearchKey(item.key) }}
                  onFocus={() => setOpenSearchKey(item.key)}
                  onBlur={() => setTimeout(() => setOpenSearchKey(k => k === item.key ? null : k), 150)} />
                {searchResults(item).length > 0 && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white dark:bg-[#1a1a20] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults(item).map(p => (
                      <button key={p.id} type="button" onMouseDown={() => selectProduct(item.key, p)} className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                        <span className="font-medium">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-24">
                {idx === 0 && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Qty</label>}
                <input type="number" min={0.0001} step="any" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={item.qty} onChange={e => updateItem(item.key, { qty: e.target.value })} />
              </div>
              <div className="w-32">
                {idx === 0 && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit Cost HT</label>}
                <input type="number" min={0} step="any" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={item.unit_cost} onChange={e => updateItem(item.key, { unit_cost: e.target.value })} />
              </div>
              <div className="w-20">
                {idx === 0 && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">TVA %</label>}
                <input type="number" min={0} max={100} step="any" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={item.tva_rate} onChange={e => updateItem(item.key, { tva_rate: e.target.value })} />
              </div>
              <div className="w-28 text-right">
                {idx === 0 && <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Line Total</div>}
                <p className="py-2 text-sm font-medium text-gray-900 dark:text-white">{(num(item.qty) * num(item.unit_cost)).toFixed(2)} MAD</p>
              </div>
              <button onClick={() => removeItem(item.key)} disabled={items.length === 1} className="pb-1 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"><Plus className="w-4 h-4" /> Add Item</button>

        <div className="border-t border-gray-100 dark:border-[#1F1F23] pt-4 space-y-2 text-sm">
          {[["Subtotal (HT)", subtotal], ["TVA", tva]].map(([label, val]) => (
            <div key={label as string} className="flex justify-between text-gray-600 dark:text-gray-400"><span>{label}</span><span>{(val as number).toFixed(2)} MAD</span></div>
          ))}
          <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base pt-1 border-t border-gray-100 dark:border-[#1F1F23]"><span>Total (TTC)</span><span>{total.toFixed(2)} MAD</span></div>
        </div>
      </div>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <div className="flex justify-end gap-3">
        {onBack && <button onClick={onBack} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>}
        <button onClick={submit} disabled={!canSave} className="flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white"><Save className="w-4 h-4" />{createMutation.isPending ? "Saving..." : "Save as Draft"}</button>
      </div>
    </div>
  )
}
