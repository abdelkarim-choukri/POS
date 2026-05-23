"use client"
import { useState } from "react"
import { Search, Building2, Shield, CheckCircle, X } from "lucide-react"

interface FeatureFlag {
  key: string
  label: string
  description: string
  category: string
}

const FEATURES: FeatureFlag[] = [
  { key: "loyalty_program", label: "Loyalty Program", description: "Points earning, grades, and redemption", category: "Customer" },
  { key: "loyalty_points_exchange", label: "Points Exchange", description: "Exchange points for coupons or products", category: "Customer" },
  { key: "promotions", label: "Promotions", description: "Create and apply promotional discounts", category: "Sales" },
  { key: "coupons", label: "Coupons", description: "Issue and redeem coupon codes", category: "Sales" },
  { key: "recommendations", label: "Recommendations", description: "Product recommendation templates", category: "Sales" },
  { key: "inventory_tracking", label: "Inventory Tracking", description: "FIFO stock batches and movements", category: "Inventory" },
  { key: "purchase_orders", label: "Purchase Orders", description: "Vendor PO management and receiving", category: "Inventory" },
  { key: "stock_adjustment_approval", label: "Adjustment Approvals", description: "Require approval workflow for stock adjustments", category: "Inventory" },
  { key: "restaurant_tables", label: "Table Management", description: "Floor plan, sessions, and split billing", category: "Restaurant" },
  { key: "kds", label: "Kitchen Display System", description: "KDS screen for kitchen order management", category: "Restaurant" },
  { key: "chain_operations", label: "Chain Operations", description: "Multi-location franchise management", category: "Chain" },
  { key: "notifications_sms", label: "SMS Notifications", description: "Send SMS to customers via configured gateway", category: "Communications" },
  { key: "notifications_email", label: "Email Notifications", description: "Send emails to customers", category: "Communications" },
  { key: "notifications_whatsapp", label: "WhatsApp Notifications", description: "Send WhatsApp messages (beta)", category: "Communications" },
]

interface BusinessAuthority {
  business_id: string
  business_name: string
  business_type: string
  overrides: Record<string, boolean | null>
}

const mockBusinesses: BusinessAuthority[] = [
  { business_id: "b-1", business_name: "Café Atlas", business_type: "restaurant", overrides: { restaurant_tables: true, kds: true, loyalty_program: true, notifications_sms: true, notifications_whatsapp: false } },
  { business_id: "b-2", business_name: "Pharmacie Centrale", business_type: "pharmacy", overrides: { inventory_tracking: true, purchase_orders: true, loyalty_program: false } },
  { business_id: "b-3", business_name: "Atlas Fashion", business_type: "retail", overrides: { promotions: true, coupons: true, recommendations: true, chain_operations: true } },
  { business_id: "b-4", business_name: "Hôtel Kenzi", business_type: "hotel", overrides: { restaurant_tables: true, kds: true, notifications_email: true } },
]

const CATEGORIES = Array.from(new Set(FEATURES.map(f => f.category)))

export default function CustomAuthorityPage() {
  const [businesses, setBusinesses] = useState(mockBusinesses)
  const [search, setSearch] = useState("")
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessAuthority | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const filtered = businesses.filter(b =>
    b.business_name.toLowerCase().includes(search.toLowerCase()) ||
    b.business_type.toLowerCase().includes(search.toLowerCase())
  )

  const getOverride = (biz: BusinessAuthority, key: string): boolean | null =>
    biz.overrides[key] !== undefined ? biz.overrides[key] : null

  const setOverride = (key: string, value: boolean | null) => {
    if (!selectedBusiness) return
    setSelectedBusiness(prev => {
      if (!prev) return prev
      const overrides = { ...prev.overrides }
      if (value === null) delete overrides[key]
      else overrides[key] = value
      return { ...prev, overrides }
    })
  }

  const saveOverrides = () => {
    if (!selectedBusiness) return
    setBusinesses(prev => prev.map(b => b.business_id === selectedBusiness.business_id ? selectedBusiness : b))
    setSavedId(selectedBusiness.business_id)
    setTimeout(() => setSavedId(null), 1500)
  }

  const overrideCount = (biz: BusinessAuthority) => Object.keys(biz.overrides).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Per-business feature overrides take precedence over global defaults. <strong>Null</strong> means "use default for business type".
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search businesses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {filtered.map(biz => (
            <button key={biz.business_id} onClick={() => setSelectedBusiness(biz)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedBusiness?.business_id === biz.business_id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] hover:border-indigo-300"
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{biz.business_name}</p>
                </div>
                {overrideCount(biz) > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full font-medium">
                    {overrideCount(biz)} overrides
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 capitalize">{biz.business_type}</p>
            </button>
          ))}
        </div>

        {/* Feature flags editor */}
        <div className="lg:col-span-2">
          {selectedBusiness ? (
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{selectedBusiness.business_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{selectedBusiness.business_type}</p>
                </div>
                <button onClick={saveOverrides}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    savedId === selectedBusiness.business_id
                      ? "bg-green-500 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}>
                  {savedId === selectedBusiness.business_id ? (
                    <><CheckCircle className="w-4 h-4" /> Saved!</>
                  ) : "Save Overrides"}
                </button>
              </div>

              {CATEGORIES.map(category => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{category}</h4>
                  {FEATURES.filter(f => f.category === category).map(feature => {
                    const value = getOverride(selectedBusiness, feature.key)
                    return (
                      <div key={feature.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{feature.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-600">{feature.description}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-4">
                          <button onClick={() => setOverride(feature.key, true)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                              value === true
                                ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "border-gray-200 dark:border-[#1F1F23] text-gray-400 hover:border-green-300"
                            }`}>On</button>
                          <button onClick={() => setOverride(feature.key, null)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                              value === null
                                ? "border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                : "border-gray-200 dark:border-[#1F1F23] text-gray-400 hover:border-gray-400"
                            }`}>Default</button>
                          <button onClick={() => setOverride(feature.key, false)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                              value === false
                                ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                : "border-gray-200 dark:border-[#1F1F23] text-gray-400 hover:border-red-300"
                            }`}>Off</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] flex items-center justify-center">
              <div className="text-center space-y-2">
                <Shield className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto" />
                <p className="text-sm text-gray-400">Select a business to manage feature overrides</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
