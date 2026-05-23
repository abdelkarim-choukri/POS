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
