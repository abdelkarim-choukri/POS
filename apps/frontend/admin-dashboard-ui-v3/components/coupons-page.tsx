"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Plus, X, Percent, DollarSign, Gift, Package, Ticket, Ban, Users, User, Copy, ChevronDown } from "lucide-react"
import { couponsApi, customersApi, gradesApi, labelsApi, productsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { CouponType, CouponDiscountType, IssuedCoupon, CreateCouponTypeInput } from "@/lib/merchant/types"

function n(v: unknown): number { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0 }

const DISCOUNT_TYPES: { value: CouponDiscountType; label: string; icon: typeof Percent }[] = [
  { value: "percent_off", label: "Percentage off", icon: Percent },
  { value: "fixed_off", label: "Fixed amount off", icon: DollarSign },
  { value: "free_item", label: "Free item", icon: Gift },
  { value: "bogo", label: "Buy one get one", icon: Package },
]
const DISC_ICON: Record<CouponDiscountType, typeof Percent> = { percent_off: Percent, fixed_off: DollarSign, free_item: Gift, bogo: Package }
const DISC_LABEL: Record<CouponDiscountType, string> = { percent_off: "Percentage", fixed_off: "Fixed", free_item: "Free item", bogo: "BOGO" }
const discValue = (t: CouponType) => t.discount_type === "percent_off" ? `${n(t.discount_value)}%` : t.discount_type === "fixed_off" ? `${n(t.discount_value)} MAD` : t.discount_type === "free_item" ? "Free item" : "BOGO"

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "info" | "warning" | "error" | "muted" }> = {
  available: { label: "Active", variant: "success" },
  redeemed: { label: "Used", variant: "info" },
  used: { label: "Used", variant: "info" },
  expired: { label: "Expired", variant: "warning" },
  voided: { label: "Voided", variant: "error" },
}

function Badge({ children, variant = "muted" }: { children: React.ReactNode; variant?: "success" | "info" | "warning" | "error" | "muted" }) {
  const variants = {
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    muted: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onChange} disabled={disabled} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!isOpen) return null
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#0F0F12] rounded-xl shadow-xl w-full ${sizes[size]} mx-4 max-h-[90vh] overflow-auto`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a20]"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"

type TypeForm = { name: string; discount_type: CouponDiscountType; discount_value: string; validity_days_from_issue: string; min_order_total_ttc: string; free_item_product_id: string; description: string }
const emptyTypeForm = (): TypeForm => ({ name: "", discount_type: "percent_off", discount_value: "", validity_days_from_issue: "30", min_order_total_ttc: "", free_item_product_id: "", description: "" })

export default function CouponsPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // coupon types
  const typesQuery = useQuery({ queryKey: merchantKeys.coupons.types(), queryFn: () => couponsApi.listTypes() })
  const types = typesQuery.data ?? []
  const productsQuery = useQuery({ queryKey: merchantKeys.products.list(null), queryFn: () => productsApi.list() })
  const products = productsQuery.data ?? []
  const invalidateTypes = () => queryClient.invalidateQueries({ queryKey: merchantKeys.coupons.all })

  // create/edit type
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [editingType, setEditingType] = useState<CouponType | null>(null)
  const [typeForm, setTypeForm] = useState<TypeForm>(emptyTypeForm())
  const [typeError, setTypeError] = useState<string | null>(null)

  const createTypeMutation = useMutation({
    mutationFn: (input: CreateCouponTypeInput) => couponsApi.createType(input),
    onSuccess: () => { invalidateTypes(); setShowTypeModal(false) },
    onError: (e) => setTypeError(humanizeError(e, "Failed to create coupon type.")),
  })
  const updateTypeMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof couponsApi.updateType>[1] }) => couponsApi.updateType(id, input),
    onSuccess: () => { invalidateTypes(); setShowTypeModal(false) },
    onError: (e) => setTypeError(humanizeError(e, "Failed to update coupon type.")),
  })
  const toggleTypeMutation = useMutation({
    mutationFn: (t: CouponType) => t.is_active ? couponsApi.deactivateType(t.id) : couponsApi.updateType(t.id, { is_active: true }),
    onSuccess: invalidateTypes,
    onError: (e) => setError(humanizeError(e, "Failed to update status.")),
  })
  const cloneMutation = useMutation({
    mutationFn: (id: string) => couponsApi.cloneType(id),
    onSuccess: invalidateTypes,
    onError: (e) => setError(humanizeError(e, "Failed to clone.")),
  })

  const openCreateType = () => { setEditingType(null); setTypeForm(emptyTypeForm()); setTypeError(null); setShowTypeModal(true) }
  const openEditType = (t: CouponType) => {
    setEditingType(t)
    setTypeForm({
      name: t.name, discount_type: t.discount_type, discount_value: n(t.discount_value).toString(),
      validity_days_from_issue: String(t.validity_days_from_issue ?? 30),
      min_order_total_ttc: t.min_order_total_ttc != null ? n(t.min_order_total_ttc).toString() : "",
      free_item_product_id: t.free_item_product_id ?? "", description: t.description ?? "",
    })
    setTypeError(null); setShowTypeModal(true)
  }
  const saveType = () => {
    setTypeError(null)
    if (!typeForm.name.trim()) { setTypeError("Name is required."); return }
    if (editingType) {
      // discount_type/value are locked once issued — only editable fields are sent
      updateTypeMutation.mutate({ id: editingType.id, input: {
        name: typeForm.name.trim(), description: typeForm.description.trim() || undefined,
        validity_days_from_issue: typeForm.validity_days_from_issue ? parseInt(typeForm.validity_days_from_issue) : undefined,
        min_order_total_ttc: typeForm.min_order_total_ttc ? n(typeForm.min_order_total_ttc) : undefined,
      } })
    } else {
      if (typeForm.discount_type !== "free_item" && typeForm.discount_type !== "bogo" && (typeForm.discount_value === "" || n(typeForm.discount_value) < 0)) { setTypeError("A valid discount value is required."); return }
      if (typeForm.discount_type === "free_item" && !typeForm.free_item_product_id) { setTypeError("Select the free item product."); return }
      createTypeMutation.mutate({
        name: typeForm.name.trim(), discount_type: typeForm.discount_type,
        discount_value: typeForm.discount_value ? n(typeForm.discount_value) : 0,
        validity_days_from_issue: typeForm.validity_days_from_issue ? parseInt(typeForm.validity_days_from_issue) : undefined,
        min_order_total_ttc: typeForm.min_order_total_ttc ? n(typeForm.min_order_total_ttc) : undefined,
        free_item_product_id: typeForm.discount_type === "free_item" ? typeForm.free_item_product_id : undefined,
        description: typeForm.description.trim() || undefined,
      })
    }
  }

  // ── Issue coupons ──
  const [showIssue, setShowIssue] = useState(false)
  const [issueTypeId, setIssueTypeId] = useState("")
  const [issueMode, setIssueMode] = useState<"single" | "segment">("single")
  const [custSearch, setCustSearch] = useState("")
  const [custSearchDebounced, setCustSearchDebounced] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null)
  const [segAudience, setSegAudience] = useState<"all" | "grade" | "label">("all")
  const [segGradeId, setSegGradeId] = useState("")
  const [segLabelId, setSegLabelId] = useState("")
  const [issueError, setIssueError] = useState<string | null>(null)
  const [issueResult, setIssueResult] = useState<string | null>(null)

  const custQuery = useQuery({
    queryKey: merchantKeys.customers.list(`coupon|${custSearchDebounced}`),
    queryFn: () => customersApi.list({ search: custSearchDebounced || undefined, limit: 8 }),
    enabled: showIssue && issueMode === "single" && custSearchDebounced.length > 0,
  })
  const gradesQuery = useQuery({ queryKey: merchantKeys.grades.list(), queryFn: () => gradesApi.list(), enabled: showIssue })
  const labelsQuery = useQuery({ queryKey: merchantKeys.labels.list(), queryFn: () => labelsApi.list(), enabled: showIssue })

  // debounce customer search
  useEffect(() => { const t = setTimeout(() => setCustSearchDebounced(custSearch), 300); return () => clearTimeout(t) }, [custSearch])

  const [lastIssued, setLastIssued] = useState<IssuedCoupon[]>([])
  const issueSingleMutation = useMutation({
    mutationFn: () => couponsApi.issue(issueTypeId, selectedCustomer?.id),
    onSuccess: (c) => { setLastIssued(prev => [c, ...prev]); setIssueResult(`Issued coupon ${c.coupon_code}.`); setShowIssue(false) },
    onError: (e) => setIssueError(humanizeError(e, "Failed to issue coupon.")),
  })
  const issueSegmentMutation = useMutation({
    mutationFn: () => couponsApi.issueToSegment({
      coupon_type_id: issueTypeId, target_audience: segAudience,
      target_grade_ids: segAudience === "grade" && segGradeId ? [segGradeId] : undefined,
      target_label_ids: segAudience === "label" && segLabelId ? [segLabelId] : undefined,
    }),
    onSuccess: (r: any) => { const cnt = r?.issued_count ?? r?.length ?? null; setIssueResult(cnt != null ? `Issued ${cnt} coupon(s) to segment.` : "Coupons issued to segment."); setShowIssue(false) },
    onError: (e) => setIssueError(humanizeError(e, "Failed to issue to segment.")),
  })
  const openIssue = () => { setIssueTypeId(""); setIssueMode("single"); setCustSearch(""); setSelectedCustomer(null); setSegAudience("all"); setSegGradeId(""); setSegLabelId(""); setIssueError(null); setShowIssue(true) }
  const submitIssue = () => {
    setIssueError(null)
    if (!issueTypeId) { setIssueError("Select a coupon type."); return }
    if (issueMode === "single") issueSingleMutation.mutate()
    else { if (segAudience === "grade" && !segGradeId) { setIssueError("Select a grade."); return } if (segAudience === "label" && !segLabelId) { setIssueError("Select a label."); return } issueSegmentMutation.mutate() }
  }

  // ── Lookup + void ──
  const [lookupCode, setLookupCode] = useState("")
  const [lookupRows, setLookupRows] = useState<IssuedCoupon[]>([])
  const [voidReason, setVoidReason] = useState<{ id: string; reason: string } | null>(null)
  const lookupMutation = useMutation({
    mutationFn: (code: string) => couponsApi.lookup(code),
    onSuccess: (c) => setLookupRows(prev => { const ex = prev.find(r => r.coupon_code === c.coupon_code); return ex ? prev.map(r => r.coupon_code === c.coupon_code ? c : r) : [c, ...prev] }),
    onError: (e) => setError(humanizeError(e, "Coupon not found.")),
  })
  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => couponsApi.void(id, reason),
    onSuccess: (_d, vars) => { setLookupRows(prev => prev.map(r => r.id === vars.id ? { ...r, status: "voided" } : r)); setLastIssued(prev => prev.map(r => r.id === vars.id ? { ...r, status: "voided" } : r)); setVoidReason(null) },
    onError: (e) => setError(humanizeError(e, "Failed to void.")),
  })

  const issuedRows = useMemo(() => {
    const map = new Map<string, IssuedCoupon>()
    for (const c of [...lastIssued, ...lookupRows]) map.set(c.coupon_code, c)
    return Array.from(map.values())
  }, [lastIssued, lookupRows])

  const listError = typesQuery.isError ? humanizeError(typesQuery.error, "Failed to load coupon types.") : null
  const savingType = createTypeMutation.isPending || updateTypeMutation.isPending
  const isEditLocked = !!editingType // discount_type/value locked on edit
  const typeName = (id: string) => types.find(t => t.id === id)?.name ?? ""

  return (
    <div className="p-6 space-y-6">
      {(error || listError) && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center justify-between">
          <span>{error || listError}</span>{error && <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>}
        </div>
      )}
      {issueResult && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center justify-between">
          <span>{issueResult}</span><button onClick={() => setIssueResult(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coupons</h1>
        <button onClick={openCreateType} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"><Plus className="w-4 h-4" />Create Coupon Type</button>
      </div>

      {/* Coupon Types */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-[#1F1F23] flex items-center justify-between">
          <div className="flex items-center gap-2"><Ticket className="w-5 h-5 text-indigo-500" /><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Coupon Types</h2></div>
          <button onClick={openIssue} disabled={types.filter(t => t.is_active).length === 0} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50"><Plus className="w-4 h-4" />Issue Coupons</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>{["Name", "Discount", "Value", "Validity", "Status", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {typesQuery.isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
              {!typesQuery.isLoading && types.map(t => {
                const Icon = DISC_ICON[t.discount_type] ?? Ticket
                return (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/40">
                    <td className="px-4 py-4"><p className="font-medium text-gray-900 dark:text-white">{t.name}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.description || t.code}</p></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-1.5"><Icon className="w-4 h-4 text-indigo-500" /><span className="text-sm text-gray-700 dark:text-gray-300">{DISC_LABEL[t.discount_type]}</span></div></td>
                    <td className="px-4 py-4"><span className="text-sm font-medium text-gray-900 dark:text-white">{discValue(t)}</span></td>
                    <td className="px-4 py-4"><span className="text-sm text-gray-700 dark:text-gray-300">{t.validity_days_from_issue} days</span></td>
                    <td className="px-4 py-4"><Toggle checked={t.is_active} onChange={() => toggleTypeMutation.mutate(t)} disabled={toggleTypeMutation.isPending} /></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEditType(t)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Edit</button>
                        <button onClick={() => cloneMutation.mutate(t.id)} disabled={cloneMutation.isPending} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium flex items-center gap-1"><Copy className="w-3.5 h-3.5" />Clone</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!typesQuery.isLoading && types.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No coupon types yet. Create one to get started.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issued coupons (lookup-based — backend has no bulk list endpoint) */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-[#1F1F23]">
          <div className="flex items-center gap-2 mb-4"><Ticket className="w-5 h-5 text-indigo-500" /><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Issued Coupons</h2><span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-[#1a1a20] text-gray-500 dark:text-gray-400 rounded-full">{issuedRows.length}</span></div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Look up a coupon by exact code…" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && lookupCode.trim()) lookupMutation.mutate(lookupCode.trim()) }} className={`${inputCls} pl-9`} />
            </div>
            <button onClick={() => lookupCode.trim() && lookupMutation.mutate(lookupCode.trim())} disabled={lookupMutation.isPending || !lookupCode.trim()} className="px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">{lookupMutation.isPending ? "…" : "Lookup"}</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Issued coupons appear here after you issue or look them up (no bulk listing endpoint exists).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#1a1a20]">
              <tr>{["Code", "Type", "Value", "Status", "Expires", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
              {issuedRows.map(c => {
                const st = STATUS_BADGE[c.status] ?? { label: c.status, variant: "muted" as const }
                return (
                  <tr key={c.coupon_code} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/40">
                    <td className="px-4 py-4"><div className="flex items-center gap-2"><code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-[#1a1a20] px-2 py-1 rounded">{c.coupon_code}</code><button onClick={() => navigator.clipboard.writeText(c.coupon_code)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="Copy"><Copy className="w-3.5 h-3.5" /></button></div></td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{c.discount_type ? DISC_LABEL[c.discount_type] : "—"}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">{c.discount_type === "percent_off" ? `${n(c.discount_value)}%` : c.discount_type === "fixed_off" ? `${n(c.discount_value)} MAD` : c.discount_type ? DISC_LABEL[c.discount_type] : "—"}</td>
                    <td className="px-4 py-4"><Badge variant={st.variant}>{st.label}</Badge></td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-4">
                      {c.status === "available" && (voidReason?.id === c.id ? (
                        <div className="flex flex-col gap-1.5">
                          <input type="text" value={voidReason.reason} onChange={(e) => setVoidReason({ id: c.id, reason: e.target.value })} placeholder="Void reason…" className="w-40 px-2 py-1 text-xs border border-gray-200 dark:border-[#1F1F23] rounded bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-400" />
                          <div className="flex gap-2">
                            <button onClick={() => voidMutation.mutate({ id: c.id, reason: voidReason.reason.trim() })} disabled={!voidReason.reason.trim() || voidMutation.isPending} className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50">Confirm</button>
                            <button onClick={() => setVoidReason(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setVoidReason({ id: c.id, reason: "" })} className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"><Ban className="w-3.5 h-3.5" />Void</button>
                      ))}
                    </td>
                  </tr>
                )
              })}
              {issuedRows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No coupons to show yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Coupon Type Modal */}
      <Modal isOpen={showTypeModal} onClose={() => setShowTypeModal(false)} title={editingType ? "Edit Coupon Type" : "Create Coupon Type"} size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name *</label><input type="text" value={typeForm.name} onChange={(e) => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Welcome Discount" className={inputCls} /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Discount Type {isEditLocked && <span className="text-xs text-gray-400">(locked after issue)</span>}</label>
            <div className="grid grid-cols-2 gap-2">
              {DISCOUNT_TYPES.map(dt => (
                <button key={dt.value} type="button" disabled={isEditLocked} onClick={() => setTypeForm(f => ({ ...f, discount_type: dt.value }))}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors disabled:opacity-60 ${typeForm.discount_type === dt.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a20]"}`}>
                  <dt.icon className="w-4 h-4" />{dt.label}
                </button>
              ))}
            </div>
          </div>
          {typeForm.discount_type === "free_item" ? (
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Free Item Product {isEditLocked && <span className="text-xs text-gray-400">(locked)</span>}</label>
              <select value={typeForm.free_item_product_id} disabled={isEditLocked} onChange={(e) => setTypeForm(f => ({ ...f, free_item_product_id: e.target.value }))} className={`${inputCls} disabled:opacity-60`}>
                <option value="">Select a product…</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ) : typeForm.discount_type !== "bogo" && (
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Value {typeForm.discount_type === "percent_off" ? "(%)" : "(MAD)"} {isEditLocked && <span className="text-xs text-gray-400">(locked)</span>}</label>
              <input type="number" min={0} value={typeForm.discount_value} disabled={isEditLocked} onChange={(e) => setTypeForm(f => ({ ...f, discount_value: e.target.value }))} className={`${inputCls} disabled:opacity-60`} /></div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Validity (days from issue)</label><input type="number" min={1} value={typeForm.validity_days_from_issue} onChange={(e) => setTypeForm(f => ({ ...f, validity_days_from_issue: e.target.value }))} className={inputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Min Order (MAD)</label><input type="number" min={0} value={typeForm.min_order_total_ttc} onChange={(e) => setTypeForm(f => ({ ...f, min_order_total_ttc: e.target.value }))} placeholder="Optional" className={inputCls} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label><textarea value={typeForm.description} onChange={(e) => setTypeForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Describe this coupon type…" className={`${inputCls} resize-none`} /></div>
          {typeError && <p className="text-sm text-red-500">{typeError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowTypeModal(false)} disabled={savingType} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
            <button onClick={saveType} disabled={savingType} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg">{savingType ? "Saving…" : editingType ? "Save Changes" : "Create Type"}</button>
          </div>
        </div>
      </Modal>

      {/* Issue Modal */}
      <Modal isOpen={showIssue} onClose={() => setShowIssue(false)} title="Issue Coupons" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Coupon Type</label>
            <select value={issueTypeId} onChange={(e) => setIssueTypeId(e.target.value)} className={inputCls}>
              <option value="">Select a coupon type…</option>
              {types.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name} ({discValue(t)})</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Issue To</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIssueMode("single")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${issueMode === "single" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-300"}`}><User className="w-4 h-4" />Single Customer</button>
              <button type="button" onClick={() => setIssueMode("segment")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${issueMode === "segment" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-300"}`}><Users className="w-4 h-4" />Segment</button>
            </div>
          </div>

          {issueMode === "single" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Customer <span className="text-xs text-gray-400">(optional — leave blank for an unassigned coupon)</span></label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">{selectedCustomer.name}</span>
                  <button onClick={() => { setSelectedCustomer(null); setCustSearch("") }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={custSearch} onChange={(e) => setCustSearch(e.target.value)} placeholder="Search customers by name/phone…" className={`${inputCls} pl-9`} />
                  {custSearchDebounced && (custQuery.data?.records.length ?? 0) > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg py-1 max-h-48 overflow-auto">
                      {custQuery.data!.records.map(c => (
                        <button key={c.id} type="button" onClick={() => { setSelectedCustomer({ id: c.id, name: `${c.first_name} ${c.last_name}` }); setCustSearch("") }} className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-[#1a1a20]">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{c.first_name} {c.last_name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{c.phone || c.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Audience</label>
                <select value={segAudience} onChange={(e) => setSegAudience(e.target.value as typeof segAudience)} className={inputCls}>
                  <option value="all">All customers</option><option value="grade">By grade</option><option value="label">By label</option>
                </select>
              </div>
              {segAudience === "grade" && (
                <select value={segGradeId} onChange={(e) => setSegGradeId(e.target.value)} className={inputCls}>
                  <option value="">Select a grade…</option>{(gradesQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              {segAudience === "label" && (
                <select value={segLabelId} onChange={(e) => setSegLabelId(e.target.value)} className={inputCls}>
                  <option value="">Select a label…</option>{(labelsQuery.data ?? []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
            </div>
          )}

          {issueError && <p className="text-sm text-red-500">{issueError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowIssue(false)} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
            <button onClick={submitIssue} disabled={!issueTypeId || issueSingleMutation.isPending || issueSegmentMutation.isPending} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg">{(issueSingleMutation.isPending || issueSegmentMutation.isPending) ? "Issuing…" : "Issue Coupons"}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
