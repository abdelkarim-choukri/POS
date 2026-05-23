"use client"
import { useState } from "react"
import { ArrowLeft, Tag, Percent, DollarSign, Package } from "lucide-react"

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
