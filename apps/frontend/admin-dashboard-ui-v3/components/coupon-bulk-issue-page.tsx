"use client"
import { useState } from "react"
import { ArrowLeft, Ticket, Users, CheckCircle, Send } from "lucide-react"

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
