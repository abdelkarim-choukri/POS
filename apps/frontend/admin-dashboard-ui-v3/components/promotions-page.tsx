"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, X, Calendar, Percent, DollarSign, Gift, Pause, Play, Archive,
  Pencil, Tag, Clock, Users, Share2, CheckCircle, AlertTriangle, Building2, Package, Layers, Star,
} from "lucide-react"
import { promotionsApi, chainApi, categoriesApi, productsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type {
  Promotion, PromotionType, PromotionStatus, CreatePromotionInput, SubStoreValidation,
} from "@/lib/merchant/types"

function n(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"
const todayISO = () => new Date().toISOString().slice(0, 10)
const plusDaysISO = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10)

const TYPE_GROUPS: { group: string; types: PromotionType[] }[] = [
  { group: "Order", types: ["percent_off_order", "fixed_off_order"] },
  { group: "Category", types: ["percent_off_category"] },
  { group: "Product", types: ["percent_off_product", "fixed_off_product"] },
  { group: "Special", types: ["bogo", "bundle", "points_multiplier"] },
]
const TYPE_LABEL: Record<PromotionType, string> = {
  percent_off_order: "% off order", fixed_off_order: "Fixed off order",
  percent_off_category: "% off category", percent_off_product: "% off product",
  fixed_off_product: "Fixed off product", bogo: "Buy one get one",
  bundle: "Bundle deal", points_multiplier: "Points multiplier",
}
const TYPE_ICON: Record<string, typeof Percent> = {
  percent_off_order: Percent, percent_off_category: Percent, percent_off_product: Percent,
  fixed_off_order: DollarSign, fixed_off_product: DollarSign, bogo: Gift, bundle: Layers, points_multiplier: Star,
}
const isPercent = (t: PromotionType) => t.startsWith("percent")
const isFixed = (t: PromotionType) => t.startsWith("fixed")
const needsCategory = (t: PromotionType) => t.endsWith("category")
const needsProduct = (t: PromotionType) => t.endsWith("product")
const valueLabel = (t: PromotionType) => isPercent(t) ? "Discount (%)" : isFixed(t) ? "Discount (MAD)" : t === "points_multiplier" ? "Points multiplier (×)" : "Value"
const valueDisplay = (p: Promotion) => isPercent(p.promotion_type) ? `${n(p.value)}%` : isFixed(p.promotion_type) ? `${n(p.value)} MAD` : p.promotion_type === "points_multiplier" ? `×${n(p.value)}` : `${n(p.value)}`

const STATUS_CFG: Record<PromotionStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
  active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  paused: { label: "Paused", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500" },
}

type PromoForm = {
  name: string; description: string; promotion_type: PromotionType; value: string
  target_category_id: string; target_product_id: string
  min_order_total_ttc: string; start_date: string; end_date: string
  max_total_uses: string; max_uses_per_customer: string
}
const emptyForm = (): PromoForm => ({
  name: "", description: "", promotion_type: "percent_off_order", value: "",
  target_category_id: "", target_product_id: "",
  min_order_total_ttc: "", start_date: todayISO(), end_date: plusDaysISO(30),
  max_total_uses: "", max_uses_per_customer: "",
})

export default function PromotionsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"all" | PromotionStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState<PromoForm>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const promotionsQuery = useQuery({ queryKey: merchantKeys.promotions.list("all"), queryFn: () => promotionsApi.list() })
  const promotions = promotionsQuery.data?.data ?? []
  // categories/products for target pickers
  const categoriesQuery = useQuery({ queryKey: merchantKeys.categories.list(), queryFn: () => categoriesApi.list() })
  const productsQuery = useQuery({ queryKey: merchantKeys.products.list(null), queryFn: () => productsApi.list() })
  const categories = categoriesQuery.data ?? []
  const products = productsQuery.data ?? []
  // chain children (present ⇒ parent)
  const childrenQuery = useQuery({
    queryKey: merchantKeys.chain.children(),
    queryFn: () => chainApi.dashboard("2020-01-01", todayISO()),
    retry: false,
  })
  const children = childrenQuery.data?.children ?? []
  const isParent = children.length > 0

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.promotions.all })
  const createMutation = useMutation({
    mutationFn: (input: CreatePromotionInput) => promotionsApi.create(input),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to create promotion.")),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreatePromotionInput> }) => promotionsApi.update(id, input),
    onSuccess: () => { invalidate(); setShowModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to update promotion.")),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "activate" | "pause" | "archive" }) => promotionsApi[action](id),
    onSuccess: invalidate,
  })

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return promotions.filter(p => {
      if (activeTab !== "all" && p.status !== activeTab) return false
      if (q && !p.name.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q) && !(p.code ?? "").toLowerCase().includes(q)) return false
      return true
    })
  }, [promotions, activeTab, searchQuery])

  const tabs: { key: "all" | PromotionStatus; label: string }[] = [
    { key: "all", label: "All" }, { key: "draft", label: "Draft" }, { key: "active", label: "Active" },
    { key: "paused", label: "Paused" }, { key: "archived", label: "Archived" },
  ]
  const activeCount = promotions.filter(p => p.status === "active").length
  const draftCount = promotions.filter(p => p.status === "draft").length
  const totalRedemptions = promotions.reduce((s, p) => s + n(p.current_uses), 0)

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setFormError(null); setShowModal(true) }
  const openEdit = (p: Promotion) => {
    setEditing(p)
    setForm({
      name: p.name, description: p.description ?? "", promotion_type: p.promotion_type, value: n(p.value).toString(),
      target_category_id: p.target_category_id ?? "", target_product_id: p.target_product_id ?? "",
      min_order_total_ttc: p.min_order_total_ttc != null ? n(p.min_order_total_ttc).toString() : "",
      start_date: p.start_date?.slice(0, 10) ?? todayISO(), end_date: p.end_date?.slice(0, 10) ?? plusDaysISO(30),
      max_total_uses: p.max_total_uses != null ? String(p.max_total_uses) : "",
      max_uses_per_customer: p.max_uses_per_customer != null ? String(p.max_uses_per_customer) : "",
    })
    setFormError(null); setShowModal(true)
  }

  const submit = () => {
    setFormError(null)
    if (!form.name.trim()) { setFormError("Promotion name is required."); return }
    if (form.value === "" || n(form.value) < 0) { setFormError("A valid value is required."); return }
    if (!form.start_date || !form.end_date) { setFormError("Start and end dates are required."); return }
    if (needsCategory(form.promotion_type) && !form.target_category_id) { setFormError("Select a target category for this promotion type."); return }
    if (needsProduct(form.promotion_type) && !form.target_product_id) { setFormError("Select a target product for this promotion type."); return }
    const payload: CreatePromotionInput = {
      name: form.name.trim(), promotion_type: form.promotion_type, value: n(form.value),
      start_date: form.start_date, end_date: form.end_date,
      description: form.description.trim() || undefined,
      min_order_total_ttc: form.min_order_total_ttc ? n(form.min_order_total_ttc) : undefined,
      target_category_id: needsCategory(form.promotion_type) ? form.target_category_id : undefined,
      target_product_id: needsProduct(form.promotion_type) ? form.target_product_id : undefined,
      max_total_uses: form.max_total_uses ? parseInt(form.max_total_uses) : undefined,
      max_uses_per_customer: form.max_uses_per_customer ? parseInt(form.max_uses_per_customer) : undefined,
    }
    if (editing) updateMutation.mutate({ id: editing.id, input: payload }); else createMutation.mutate(payload)
  }

  const listError = promotionsQuery.isError ? humanizeError(promotionsQuery.error, "Failed to load promotions.") : null
  const saving = createMutation.isPending || updateMutation.isPending

  // ── Chain rollout wizard ──
  const [showRollout, setShowRollout] = useState(false)
  const [rolloutStep, setRolloutStep] = useState<1 | 2>(1)
  const [rolloutPromoId, setRolloutPromoId] = useState("")
  const [validations, setValidations] = useState<SubStoreValidation[]>([])
  const [excluded, setExcluded] = useState<string[]>([])
  const [rolloutError, setRolloutError] = useState<string | null>(null)
  const [rolloutDone, setRolloutDone] = useState<number | null>(null)
  const childName = (id: string) => children.find(c => c.business_id === id)?.name ?? id

  const validateMutation = useMutation({
    mutationFn: () => chainApi.validateSubStores(rolloutPromoId, children.map(c => c.business_id)),
    onSuccess: (res) => { setValidations(res); setExcluded(res.filter(r => !r.can_rollout).map(r => r.child_business_id)) },
    onError: (e) => setRolloutError(humanizeError(e, "Validation failed.")),
  })
  const rolloutMutation = useMutation({
    mutationFn: () => chainApi.rollout(rolloutPromoId, validations.filter(v => !excluded.includes(v.child_business_id)).map(v => v.child_business_id)),
    onSuccess: (res) => { setRolloutDone(res.length) },
    onError: (e) => setRolloutError(humanizeError(e, "Rollout failed.")),
  })
  const openRollout = () => { setShowRollout(true); setRolloutStep(1); setRolloutPromoId(""); setValidations([]); setExcluded([]); setRolloutError(null); setRolloutDone(null) }
  const includedCount = validations.filter(v => !excluded.includes(v.child_business_id)).length

  return (
    <div className="p-6 space-y-6">
      {listError && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{listError}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Promotions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage promotional discounts and offers</p>
        </div>
        <div className="flex items-center gap-3">
          {isParent && (
            <button onClick={openRollout} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#0F0F12] text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a32] transition-colors font-medium border border-gray-200 dark:border-[#1F1F23]">
              <Share2 className="w-5 h-5" />Rollout to Chain
            </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium">
            <Plus className="w-5 h-5" />Create Promotion
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active", value: activeCount, icon: Play, bg: "bg-green-100", fg: "text-green-600" },
          { label: "Draft", value: draftCount, icon: Clock, bg: "bg-blue-100", fg: "text-blue-600" },
          { label: "Total Promotions", value: promotions.length, icon: Tag, bg: "bg-purple-100", fg: "text-purple-600" },
          { label: "Total Redemptions", value: totalRedemptions.toLocaleString(), icon: Users, bg: "bg-amber-100", fg: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 ${s.bg} rounded-lg`}><s.icon className={`w-5 h-5 ${s.fg}`} /></div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{promotionsQuery.isLoading ? "…" : s.value}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1a1a20] p-1 rounded-lg">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search promotions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Grid */}
      {promotionsQuery.isLoading ? <div className="py-10 text-center text-gray-400">Loading...</div>
        : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => {
              const TypeIcon = TYPE_ICON[p.promotion_type] ?? Tag
              const st = STATUS_CFG[p.status] ?? STATUS_CFG.draft
              return (
                <div key={p.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">{p.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 truncate">{p.description || p.code}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      <TypeIcon className="w-3 h-3" />{TYPE_LABEL[p.promotion_type]}: {valueDisplay(p)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /><span>{fmtDate(p.start_date)} – {fmtDate(p.end_date)}</span></div>
                    <div className="flex items-center gap-1.5"><Tag className="w-4 h-4" /><span>{n(p.current_uses)} uses{p.max_total_uses ? ` / ${p.max_total_uses}` : ""}</span></div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-[#1F1F23]">
                    <button onClick={() => openEdit(p)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg transition-colors"><Pencil className="w-4 h-4" />Edit</button>
                    {p.status !== "archived" && (
                      <>
                        <button onClick={() => statusMutation.mutate({ id: p.id, action: p.status === "active" ? "pause" : "activate" })} disabled={statusMutation.isPending}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${p.status === "active" ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"}`}>
                          {p.status === "active" ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4" />Activate</>}
                        </button>
                        <button onClick={() => statusMutation.mutate({ id: p.id, action: "archive" })} disabled={statusMutation.isPending} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg transition-colors"><Archive className="w-4 h-4" />Archive</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-[#1a1a20] rounded-full flex items-center justify-center mx-auto mb-4"><Tag className="w-6 h-6 text-gray-400" /></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No promotions found</h3>
            <p className="text-gray-500 dark:text-gray-400">{searchQuery ? "Try adjusting your search terms" : "Create your first promotion to get started"}</p>
          </div>
        )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23] sticky top-0 bg-white dark:bg-[#0F0F12]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Promotion" : "Create Promotion"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Promotion Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ramadan 20% Off"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Internal notes about this promotion"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Promotion Type *</label>
                <select value={form.promotion_type} onChange={(e) => setForm(f => ({ ...f, promotion_type: e.target.value as PromotionType, target_category_id: "", target_product_id: "" }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {TYPE_GROUPS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.types.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{valueLabel(form.promotion_type)} *</label>
                  <input type="number" min={0} max={isPercent(form.promotion_type) ? 100 : undefined} value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Min Order (MAD)</label>
                  <input type="number" min={0} value={form.min_order_total_ttc} onChange={(e) => setForm(f => ({ ...f, min_order_total_ttc: e.target.value }))} placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              {needsCategory(form.promotion_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target Category *</label>
                  <select value={form.target_category_id} onChange={(e) => setForm(f => ({ ...f, target_category_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select a category…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {needsProduct(form.promotion_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target Product *</label>
                  <select value={form.target_product_id} onChange={(e) => setForm(f => ({ ...f, target_product_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select a product…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Date *</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Uses Total</label>
                  <input type="number" min={0} value={form.max_total_uses} onChange={(e) => setForm(f => ({ ...f, max_total_uses: e.target.value }))} placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Per Customer</label>
                  <input type="number" min={0} value={form.max_uses_per_customer} onChange={(e) => setForm(f => ({ ...f, max_uses_per_customer: e.target.value }))} placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-[#1F1F23] sticky bottom-0 bg-white dark:bg-[#0F0F12]">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
              <button onClick={submit} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">{saving ? "Saving…" : editing ? "Save Changes" : "Create Promotion"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Chain Rollout Wizard */}
      {showRollout && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23] sticky top-0 bg-white dark:bg-[#0F0F12]">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rollout to Chain</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Step {rolloutStep} of 2: {rolloutStep === 1 ? "Validate Stores" : "Confirm Rollout"}</p>
              </div>
              <button onClick={() => setShowRollout(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-5">
              {rolloutError && <p className="text-sm text-red-500">{rolloutError}</p>}
              {rolloutDone != null ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-900 dark:text-white font-medium">Rolled out to {rolloutDone} store{rolloutDone === 1 ? "" : "s"}.</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Each child received a paused copy of the promotion.</p>
                  <button onClick={() => setShowRollout(false)} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Done</button>
                </div>
              ) : rolloutStep === 1 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select Promotion to Rollout</label>
                    <select value={rolloutPromoId} onChange={(e) => { setRolloutPromoId(e.target.value); setValidations([]); setExcluded([]) }}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Choose a promotion…</option>
                      {promotions.filter(p => p.status !== "archived").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {rolloutPromoId && validations.length === 0 && (
                    <button onClick={() => { setRolloutError(null); validateMutation.mutate() }} disabled={validateMutation.isPending}
                      className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">
                      {validateMutation.isPending ? "Validating…" : "Validate Stores"}
                    </button>
                  )}
                  {validations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">Validation Results</h4>
                      <div className="border border-gray-200 dark:border-[#1F1F23] rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
                            <tr>{["Include", "Store", "TVA Status"].map(h => <th key={h} className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>)}</tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
                            {validations.map(v => (
                              <tr key={v.child_business_id} className={excluded.includes(v.child_business_id) ? "bg-gray-50 dark:bg-[#1a1a20]/40" : ""}>
                                <td className="p-3">
                                  <input type="checkbox" checked={!excluded.includes(v.child_business_id)} onChange={() => setExcluded(prev => prev.includes(v.child_business_id) ? prev.filter(i => i !== v.child_business_id) : [...prev, v.child_business_id])} className="w-4 h-4 rounded" />
                                </td>
                                <td className="p-3"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /><span className="font-medium text-gray-900 dark:text-white">{childName(v.child_business_id)}</span></div></td>
                                <td className="p-3">
                                  {!v.is_linked_child ? <span className="text-sm text-red-600">Not a linked child</span>
                                    : v.tva_warnings.length === 0 ? <span className="flex items-center gap-1.5 text-green-600 text-sm"><CheckCircle className="w-4 h-4" /> Compatible</span>
                                      : <div><span className="flex items-center gap-1.5 text-amber-600 text-sm"><AlertTriangle className="w-4 h-4" /> {v.tva_warnings.length} product(s) missing TVA</span></div>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setValidations([]); setExcluded([]) }} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#1a1a20] text-gray-700 dark:text-gray-200 rounded-lg font-medium">Re-validate</button>
                        <button onClick={() => setRolloutStep(2)} disabled={includedCount === 0} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">Continue ({includedCount})</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-5">
                  <div className="bg-gray-50 dark:bg-[#1a1a20] rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Rollout Summary</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Rolling out <span className="font-medium text-gray-900 dark:text-white">{promotions.find(p => p.id === rolloutPromoId)?.name}</span> to <span className="font-medium text-gray-900 dark:text-white">{includedCount}</span> store(s).</p>
                  </div>
                  <div className="space-y-2">
                    {validations.filter(v => !excluded.includes(v.child_business_id)).map(v => (
                      <div key={v.child_business_id} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#1a1a20] rounded-lg"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-gray-900 dark:text-white">{childName(v.child_business_id)}</span></div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setRolloutStep(1)} disabled={rolloutMutation.isPending} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#1a1a20] text-gray-700 dark:text-gray-200 rounded-lg font-medium">Back</button>
                    <button onClick={() => { setRolloutError(null); rolloutMutation.mutate() }} disabled={rolloutMutation.isPending} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">{rolloutMutation.isPending ? "Rolling out…" : "Confirm Rollout"}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
