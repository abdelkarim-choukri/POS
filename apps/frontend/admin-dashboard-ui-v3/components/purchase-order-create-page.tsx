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
