"use client"

import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  X,
  Gift,
  Star,
  Coins,
  Trophy,
  Sparkles,
  ArrowRight,
  ArrowLeftRight,
  History,
  Users,
  TrendingUp,
  Settings,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
  Check,
  Zap,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────

/** Shape returned by the backend for a points-exchange rule */
interface PexRule {
  id: string
  name: string
  points_required: number
  reward_type: "discount" | "free_product" | "cash_equivalent"
  reward_value: number
  daily_limit?: number | null
  total_limit?: number | null
  is_active: boolean
  total_redemptions?: number
}

/** Shape of the create/edit form */
interface RuleFormState {
  name: string
  points_required: string   // kept as string for controlled input
  reward_type: "discount" | "free_product" | "cash_equivalent"
  reward_value: string
  daily_limit: string
  total_limit: string
  is_active: boolean
}

const emptyForm = (): RuleFormState => ({
  name: "",
  points_required: "",
  reward_type: "discount",
  reward_value: "",
  daily_limit: "",
  total_limit: "",
  is_active: true,
})

interface PointValueResult {
  equivalent_value: number
  currency: string
}

interface RedeemResult {
  coupon_code?: string
  redemption_id: string
  points_deducted: number
}

interface LoyaltyTier {
  id: string
  name: string
  min_points: number
  multiplier: number
  color: string
  perks: string[]
}

// Static tiers — these come from the customer-grades module (read-only here)
const staticTiers: LoyaltyTier[] = [
  { id: "1", name: "Bronze",   min_points: 0,    multiplier: 1.0, color: "amber",  perks: ["Earn 1 point per MAD spent", "Birthday reward"] },
  { id: "2", name: "Silver",   min_points: 500,  multiplier: 1.25, color: "gray",  perks: ["Earn 1.25 points per MAD", "Priority seating", "Double points Tuesdays"] },
  { id: "3", name: "Gold",     min_points: 1500, multiplier: 1.5, color: "yellow", perks: ["Earn 1.5 points per MAD", "Free monthly reward", "Exclusive events"] },
  { id: "4", name: "Platinum", min_points: 5000, multiplier: 2.0, color: "purple", perks: ["Earn 2 points per MAD", "Personal concierge", "VIP lounge access"] },
]

// ── Sub-components ─────────────────────────────────────────────────────────

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" | "purple" | "indigo" }) {
  const colors = {
    green:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray:   "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", className = "", onClick, disabled, type = "button" }: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "danger" | "ghost"
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
}) {
  const variants = {
    primary:   "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    danger:    "bg-red-500 text-white hover:bg-red-600",
    ghost:     "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
  }
  return (
    <button
      type={type}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg"
}) {
  if (!isOpen) return null
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: React.ElementType
  label: string
  value: string
  subValue?: string
  color: string
}) {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      {subValue && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{subValue}</p>}
    </div>
  )
}

// ── RuleForm shared between Add and Edit modals ────────────────────────────

function RuleFormFields({
  form,
  onChange,
  isEdit,
}: {
  form: RuleFormState
  onChange: (updates: Partial<RuleFormState>) => void
  isEdit: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
        <input
          required
          className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          placeholder="e.g., Silver Reward"
          value={form.name}
          onChange={e => onChange({ name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Points Required — immutable on edit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Points Required{isEdit && <span className="ml-1 text-xs text-gray-400">(immutable)</span>}
          </label>
          <input
            type="number"
            min={1}
            required={!isEdit}
            disabled={isEdit}
            className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="100"
            value={form.points_required}
            onChange={e => onChange({ points_required: e.target.value })}
          />
        </div>

        {/* Reward Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reward Type</label>
          <select
            required
            className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            value={form.reward_type}
            onChange={e => onChange({ reward_type: e.target.value as RuleFormState["reward_type"] })}
          >
            <option value="discount">Discount</option>
            <option value="free_product">Free Product</option>
            <option value="cash_equivalent">Cash Equivalent</option>
          </select>
        </div>
      </div>

      {/* Reward Value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reward Value{form.reward_type === "discount" ? " (MAD discount)" : form.reward_type === "cash_equivalent" ? " (MAD)" : " (product id or 0)"}
        </label>
        <input
          type="number"
          min={0}
          required
          className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          placeholder="0"
          value={form.reward_value}
          onChange={e => onChange({ reward_value: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Daily Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Limit (optional)</label>
          <input
            type="number"
            min={1}
            className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            placeholder="No limit"
            value={form.daily_limit}
            onChange={e => onChange({ daily_limit: e.target.value })}
          />
        </div>

        {/* Total Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Limit (optional)</label>
          <input
            type="number"
            min={1}
            className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            placeholder="No limit"
            value={form.total_limit}
            onChange={e => onChange({ total_limit: e.target.value })}
          />
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <input
          id="rule-active"
          type="checkbox"
          checked={form.is_active}
          onChange={e => onChange({ is_active: e.target.checked })}
          className="w-4 h-4 accent-indigo-600"
        />
        <label htmlFor="rule-active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Active (customers can redeem)
        </label>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PointsExchangePage() {
  // ── List state ────────────────────────────────────────────────────────────
  const [rules, setRules] = useState<PexRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"rewards" | "transactions" | "tiers" | "settings">("rewards")
  const [searchQuery, setSearchQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  // ── Add modal ─────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<RuleFormState>(emptyForm())
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<RuleFormState>(emptyForm())
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // ── Redeem modal ──────────────────────────────────────────────────────────
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [redeemRuleId, setRedeemRuleId] = useState<string>("")
  const [redeemCustomerId, setRedeemCustomerId] = useState("")
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null)

  // ── Check point value ─────────────────────────────────────────────────────
  const [checkPoints, setCheckPoints] = useState("")
  const [pointValueResult, setPointValueResult] = useState<PointValueResult | null>(null)
  const [pointValueLoading, setPointValueLoading] = useState(false)
  const [pointValueError, setPointValueError] = useState<string | null>(null)

  // ── Redeemable-for-customer ───────────────────────────────────────────────
  const [redeemableCustomerId, setRedeemableCustomerId] = useState("")
  const [redeemableRules, setRedeemableRules] = useState<PexRule[] | null>(null)
  const [redeemableLoading, setRedeemableLoading] = useState(false)
  const [redeemableError, setRedeemableError] = useState<string | null>(null)

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchRules = useCallback(() => {
    setLoading(true)
    setError(null)
    apiFetch<{ data: PexRule[] }>("/api/business/points-exchange-rules")
      .then(res => setRules(res.data ?? []))
      .catch(e => setError(e.message ?? "Failed to load rules"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules])

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const rewardTypeColor: Record<PexRule["reward_type"], "green" | "blue" | "indigo"> = {
    discount: "green",
    free_product: "blue",
    cash_equivalent: "indigo",
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function formToBody(form: RuleFormState, omitPointsRequired = false) {
    const body: Record<string, unknown> = {
      name: form.name,
      reward_type: form.reward_type,
      reward_value: parseFloat(form.reward_value) || 0,
      is_active: form.is_active,
    }
    if (!omitPointsRequired) {
      body.points_required = parseInt(form.points_required, 10) || 0
    }
    if (form.daily_limit.trim() !== "") body.daily_limit = parseInt(form.daily_limit, 10)
    if (form.total_limit.trim() !== "") body.total_limit = parseInt(form.total_limit, 10)
    return body
  }

  function ruleToForm(rule: PexRule): RuleFormState {
    return {
      name: rule.name,
      points_required: String(rule.points_required),
      reward_type: rule.reward_type,
      reward_value: String(rule.reward_value),
      daily_limit: rule.daily_limit != null ? String(rule.daily_limit) : "",
      total_limit: rule.total_limit != null ? String(rule.total_limit) : "",
      is_active: rule.is_active,
    }
  }

  // ── Create rule ─────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    try {
      await apiFetch("/api/business/points-exchange-rules", {
        method: "POST",
        body: JSON.stringify(formToBody(addForm, false)),
      })
      setShowAddModal(false)
      setAddForm(emptyForm())
      fetchRules()
    } catch (e: any) {
      setAddError(e.message ?? "Failed to create rule")
    } finally {
      setAddLoading(false)
    }
  }

  // ── Edit rule ───────────────────────────────────────────────────────────────
  async function openEditModal(rule: PexRule) {
    setEditTargetId(rule.id)
    setEditForm(ruleToForm(rule))   // optimistic pre-fill while fetching
    setEditError(null)
    setShowEditModal(true)
    setShowDropdown(null)
    // Fetch fresh detail from GET /api/business/points-exchange-rules/:id
    try {
      const fresh = await apiFetch<PexRule>(`/api/business/points-exchange-rules/${rule.id}`)
      setEditForm(ruleToForm(fresh))
    } catch (e: any) {
      setEditError(e.message ?? "Failed to load rule detail")
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTargetId) return
    setEditLoading(true)
    setEditError(null)
    try {
      await apiFetch(`/api/business/points-exchange-rules/${editTargetId}`, {
        method: "PATCH",
        body: JSON.stringify(formToBody(editForm, true)), // omit points_required
      })
      setShowEditModal(false)
      fetchRules()
    } catch (e: any) {
      setEditError(e.message ?? "Failed to update rule")
    } finally {
      setEditLoading(false)
    }
  }

  // ── Deactivate / delete ─────────────────────────────────────────────────────
  async function handleDeactivate(ruleId: string) {
    setShowDropdown(null)
    try {
      await apiFetch(`/api/business/points-exchange-rules/${ruleId}`, { method: "DELETE" })
      fetchRules()
    } catch (e: any) {
      setError(e.message ?? "Failed to deactivate rule")
    }
  }

  // ── Quick Redeem ────────────────────────────────────────────────────────────
  function openRedeemModal(ruleId = "") {
    setRedeemRuleId(ruleId)
    setRedeemCustomerId("")
    setRedeemError(null)
    setRedeemResult(null)
    setShowRedeemModal(true)
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    if (!redeemRuleId) { setRedeemError("Please select a rule"); return }
    if (!redeemCustomerId.trim()) { setRedeemError("Customer ID is required"); return }
    setRedeemLoading(true)
    setRedeemError(null)
    setRedeemResult(null)
    try {
      const res = await apiFetch<RedeemResult>(
        `/api/business/points-exchange-rules/${redeemRuleId}/redeem`,
        {
          method: "POST",
          body: JSON.stringify({ customer_id: redeemCustomerId.trim() }),
        }
      )
      setRedeemResult(res)
      fetchRules()
    } catch (e: any) {
      setRedeemError(e.message ?? "Redemption failed")
    } finally {
      setRedeemLoading(false)
    }
  }

  // ── Check point value ────────────────────────────────────────────────────────
  async function handleCheckPointValue(e: React.FormEvent) {
    e.preventDefault()
    const pts = parseInt(checkPoints, 10)
    if (!pts || pts <= 0) { setPointValueError("Enter a positive number of points"); return }
    setPointValueLoading(true)
    setPointValueError(null)
    setPointValueResult(null)
    try {
      const res = await apiFetch<PointValueResult>(
        `/api/business/points-exchange-rules/check-point-value?points=${pts}`
      )
      setPointValueResult(res)
    } catch (e: any) {
      setPointValueError(e.message ?? "Failed to check point value")
    } finally {
      setPointValueLoading(false)
    }
  }

  // ── Redeemable for customer ──────────────────────────────────────────────────
  async function handleRedeemableLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!redeemableCustomerId.trim()) { setRedeemableError("Enter a customer ID"); return }
    setRedeemableLoading(true)
    setRedeemableError(null)
    setRedeemableRules(null)
    try {
      const res = await apiFetch<{ data: PexRule[] }>(
        `/api/business/points-exchange-rules/redeemable-for-customer?customer_id=${encodeURIComponent(redeemableCustomerId.trim())}`
      )
      setRedeemableRules(res.data ?? [])
    } catch (e: any) {
      setRedeemableError(e.message ?? "Lookup failed")
    } finally {
      setRedeemableLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="py-10 text-center text-gray-400">Loading...</div>

  return (
    <div>
      {error && (
        <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Points Exchange</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage loyalty rewards and point redemptions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openRedeemModal()}>
            <ArrowLeftRight className="w-4 h-4" />
            Quick Redeem
          </Button>
          <Button variant="primary" onClick={() => { setAddForm(emptyForm()); setAddError(null); setShowAddModal(true) }}>
            <Plus className="w-4 h-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Coins}
          label="Total Rules"
          value={String(rules.length)}
          subValue={`${rules.filter(r => r.is_active).length} active`}
          color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          icon={Gift}
          label="Total Redemptions"
          value={rules.reduce((s, r) => s + (r.total_redemptions ?? 0), 0).toLocaleString()}
          color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={Star}
          label="Discount Rules"
          value={String(rules.filter(r => r.reward_type === "discount").length)}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Free Product Rules"
          value={String(rules.filter(r => r.reward_type === "free_product").length)}
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-[#0F0F12] p-1 rounded-lg w-fit">
        {[
          { key: "rewards",      label: "Exchange Rules", icon: Gift },
          { key: "transactions", label: "Check Points",   icon: Coins },
          { key: "tiers",        label: "Loyalty Tiers",  icon: Trophy },
          { key: "settings",     label: "Customer Lookup", icon: Users },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Exchange Rules Tab ─────────────────────────────────────────────── */}
      {activeTab === "rewards" && (
        <div>
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {filteredRules.length === 0 && (
            <div className="text-center py-16 text-gray-400">No exchange rules found.</div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {filteredRules.map(rule => (
              <div
                key={rule.id}
                className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-32 bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center relative">
                  <Gift className="w-12 h-12 text-white/80" />
                  {!rule.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge color="gray">Inactive</Badge>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(showDropdown === rule.id ? null : rule.id)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg"
                      >
                        <MoreHorizontal className="w-4 h-4 text-white" />
                      </button>
                      {showDropdown === rule.id && (
                        <>
                          <div className="fixed inset-0" onClick={() => setShowDropdown(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]"
                              onClick={() => openEditModal(rule)}
                            >
                              <Pencil className="w-4 h-4" /> Edit
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => { setShowDropdown(null); openRedeemModal(rule.id) }}
                            >
                              <ArrowLeftRight className="w-4 h-4" /> Redeem
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => handleDeactivate(rule.id)}
                            >
                              <Trash2 className="w-4 h-4" /> Deactivate
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
                    <Badge color={rewardTypeColor[rule.reward_type]}>
                      {rule.reward_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 mb-2">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold">{rule.points_required.toLocaleString()}</span>
                    <span className="text-xs">pts</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Value: <span className="font-medium">{rule.reward_value}</span>
                  </p>
                  {(rule.daily_limit != null || rule.total_limit != null) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {rule.daily_limit != null && `Daily: ${rule.daily_limit}`}
                      {rule.daily_limit != null && rule.total_limit != null && " · "}
                      {rule.total_limit != null && `Total: ${rule.total_limit}`}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#1F1F23]">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {rule.total_redemptions ?? 0} redemptions
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Check Points Tab ───────────────────────────────────────────────── */}
      {activeTab === "transactions" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6 max-w-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Check Point Value</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enter a number of points to see their equivalent monetary value.
          </p>
          <form onSubmit={handleCheckPointValue} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points</label>
              <input
                type="number"
                min={1}
                required
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                placeholder="e.g. 100"
                value={checkPoints}
                onChange={e => setCheckPoints(e.target.value)}
              />
            </div>
            {pointValueError && (
              <p className="text-sm text-red-500">{pointValueError}</p>
            )}
            {pointValueResult && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {checkPoints} pts
                  </span>{" "}
                  = {pointValueResult.equivalent_value} {pointValueResult.currency}
                </p>
              </div>
            )}
            <Button type="submit" variant="primary" disabled={pointValueLoading}>
              {pointValueLoading ? "Checking..." : "Check Value"}
            </Button>
          </form>
        </div>
      )}

      {/* ── Loyalty Tiers Tab ─────────────────────────────────────────────── */}
      {activeTab === "tiers" && (
        <div className="grid grid-cols-4 gap-4">
          {staticTiers.map(tier => {
            const tierColors: Record<string, string> = {
              amber:  "from-amber-600 to-amber-800",
              gray:   "from-gray-400 to-gray-600",
              yellow: "from-yellow-400 to-yellow-600",
              purple: "from-purple-500 to-purple-700",
            }
            return (
              <div key={tier.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
                <div className={`h-24 bg-gradient-to-br ${tierColors[tier.color] ?? "from-gray-400 to-gray-600"} flex items-center justify-center relative`}>
                  <Trophy className="w-10 h-10 text-white/80" />
                  <div className="absolute top-2 right-2 bg-white/20 px-2 py-1 rounded text-xs text-white font-bold">
                    {tier.multiplier}x
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{tier.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {tier.min_points === 0 ? "Starting tier" : `${tier.min_points.toLocaleString()}+ points`}
                  </p>
                  <div className="space-y-2">
                    {tier.perks.map((perk, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-300">{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Customer Lookup Tab ───────────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Redeemable Rules for Customer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enter a customer ID to see which exchange rules they can currently redeem.
          </p>
          <form onSubmit={handleRedeemableLookup} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                required
                className="flex-1 border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                placeholder="Customer UUID"
                value={redeemableCustomerId}
                onChange={e => setRedeemableCustomerId(e.target.value)}
              />
              <Button type="submit" variant="primary" disabled={redeemableLoading}>
                {redeemableLoading ? "Looking up..." : "Look Up"}
              </Button>
            </div>
            {redeemableError && <p className="text-sm text-red-500">{redeemableError}</p>}
          </form>

          {redeemableRules !== null && (
            <div className="mt-6">
              {redeemableRules.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No redeemable rules found for this customer.</p>
              ) : (
                <div className="space-y-3">
                  {redeemableRules.map(rule => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg border border-gray-100 dark:border-[#1F1F23]"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{rule.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {rule.points_required} pts · {rule.reward_type.replace("_", " ")} · value {rule.reward_value}
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => openRedeemModal(rule.id)}
                      >
                        Redeem
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Add Rule Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Exchange Rule" size="lg">
        <form onSubmit={handleCreate}>
          <RuleFormFields
            form={addForm}
            onChange={updates => setAddForm(prev => ({ ...prev, ...updates }))}
            isEdit={false}
          />
          {addError && <p className="mt-3 text-sm text-red-500">{addError}</p>}
          <div className="flex gap-3 pt-4 mt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={addLoading}>
              {addLoading ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Rule Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Exchange Rule" size="lg">
        <form onSubmit={handleEdit}>
          <RuleFormFields
            form={editForm}
            onChange={updates => setEditForm(prev => ({ ...prev, ...updates }))}
            isEdit={true}
          />
          {editError && <p className="mt-3 text-sm text-red-500">{editError}</p>}
          <div className="flex gap-3 pt-4 mt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Quick Redeem Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={showRedeemModal} onClose={() => setShowRedeemModal(false)} title="Redeem Points">
        <form onSubmit={handleRedeem}>
          <div className="space-y-4">
            {/* Rule selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exchange Rule
              </label>
              <select
                required
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                value={redeemRuleId}
                onChange={e => setRedeemRuleId(e.target.value)}
              >
                <option value="">Select a rule...</option>
                {rules.filter(r => r.is_active).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.points_required} pts)
                  </option>
                ))}
              </select>
            </div>

            {/* Customer ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer ID
              </label>
              <input
                required
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                placeholder="Customer UUID"
                value={redeemCustomerId}
                onChange={e => setRedeemCustomerId(e.target.value)}
              />
            </div>

            {redeemError && <p className="text-sm text-red-500">{redeemError}</p>}

            {redeemResult && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-1">
                <p className="font-semibold text-green-700 dark:text-green-400">Redemption successful!</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Points deducted: <span className="font-medium">{redeemResult.points_deducted}</span>
                </p>
                {redeemResult.coupon_code && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Coupon code: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{redeemResult.coupon_code}</span>
                  </p>
                )}
                <p className="text-xs text-gray-400">Redemption ID: {redeemResult.redemption_id}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowRedeemModal(false)}>
                {redeemResult ? "Close" : "Cancel"}
              </Button>
              {!redeemResult && (
                <Button type="submit" variant="primary" className="flex-1" disabled={redeemLoading}>
                  <Gift className="w-4 h-4" />
                  {redeemLoading ? "Redeeming..." : "Redeem"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
