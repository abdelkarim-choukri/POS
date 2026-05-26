"use client"
import { useState, useEffect } from "react"
import { ArrowLeft, Phone, Mail, Star, Gift, Calendar, ShoppingCart } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface CustomerProfile {
  id: string; name: string; phone: string; email?: string; address?: string
  grade: "Bronze" | "Silver" | "Gold" | "Platinum"; points: number; total_spent: number
  visit_count: number; last_visit?: string; birthday?: string; notes?: string
  labels: string[]
  // API response fields
  first_name?: string; last_name?: string; customer_code?: string; points_balance?: number
  created_at?: string
}

interface CustomerAttribute {
  attribute_id: string
  name: string
  value: string
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
  const [customer, setCustomer] = useState<CustomerProfile>(mockCustomer)
  const [attributes, setAttributes] = useState<CustomerAttribute[]>([])
  const [editingAttrs, setEditingAttrs] = useState<Record<string, string>>({})
  const [isEditingAttrs, setIsEditingAttrs] = useState(false)
  const [attrSaving, setAttrSaving] = useState(false)
  const [attrError, setAttrError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<typeof TABS[number]>("Profile")

  const fetchAttributes = async () => {
    const data = await apiFetch<{ attributes: CustomerAttribute[] }>(`/api/business/customers/${id}/attributes`)
    setAttributes(data.attributes ?? [])
  }

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([
          (async () => {
            const data = await apiFetch<any>(`/api/business/customers/${id}`)
            // Normalise API response into CustomerProfile shape
            setCustomer({
              id: data.id,
              name: [data.first_name, data.last_name].filter(Boolean).join(" ") || mockCustomer.name,
              phone: data.phone ?? mockCustomer.phone,
              email: data.email,
              address: data.address,
              grade: data.grade ?? mockCustomer.grade,
              points: data.points_balance ?? data.points ?? mockCustomer.points,
              total_spent: data.total_spent ?? mockCustomer.total_spent,
              visit_count: data.visit_count ?? mockCustomer.visit_count,
              last_visit: data.last_visit,
              birthday: data.birthday,
              notes: data.notes,
              labels: data.labels ?? mockCustomer.labels,
              first_name: data.first_name,
              last_name: data.last_name,
              customer_code: data.customer_code,
              points_balance: data.points_balance,
              created_at: data.created_at,
            })
          })(),
          fetchAttributes(),
        ])
      } catch (err: any) {
        setError(err?.message ?? "Failed to load customer data.")
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleEditAttrs = () => {
    const draft: Record<string, string> = {}
    attributes.forEach(a => { draft[a.attribute_id] = a.value })
    setEditingAttrs(draft)
    setIsEditingAttrs(true)
    setAttrError(null)
  }

  const handleCancelAttrs = () => {
    setIsEditingAttrs(false)
    setAttrError(null)
  }

  const handleSaveAttrs = async () => {
    setAttrSaving(true)
    setAttrError(null)
    try {
      await apiFetch(`/api/business/customers/${id}/attributes`, {
        method: "PUT",
        body: JSON.stringify({
          attributes: Object.entries(editingAttrs).map(([attribute_id, value]) => ({ attribute_id, value })),
        }),
      })
      await fetchAttributes()
      setIsEditingAttrs(false)
    } catch (err: any) {
      setAttrError(err?.message ?? "Failed to save attributes.")
    } finally {
      setAttrSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400 text-sm">
        Loading customer…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
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
        <div className="space-y-6">
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

          {/* Attributes */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Custom Attributes</h3>
              {!isEditingAttrs && attributes.length > 0 && (
                <button
                  onClick={handleEditAttrs}
                  className="text-sm px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {attrError && (
              <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-400">
                {attrError}
              </div>
            )}

            {attributes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No custom attributes defined.</p>
            ) : isEditingAttrs ? (
              <div className="space-y-3">
                {attributes.map(attr => (
                  <div key={attr.attribute_id} className="flex items-center gap-3 text-sm">
                    <span className="w-40 flex-shrink-0 text-gray-500 dark:text-gray-400">{attr.name}</span>
                    <input
                      type="text"
                      value={editingAttrs[attr.attribute_id] ?? ""}
                      onChange={e => setEditingAttrs(prev => ({ ...prev, [attr.attribute_id]: e.target.value }))}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-[#1F1F23] bg-white dark:bg-[#1a1a20] px-3 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveAttrs}
                    disabled={attrSaving}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {attrSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={handleCancelAttrs}
                    disabled={attrSaving}
                    className="px-4 py-1.5 rounded-lg border border-gray-300 dark:border-[#1F1F23] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a20] disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {attributes.map(attr => (
                  <div key={attr.attribute_id} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{attr.name}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{attr.value || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
