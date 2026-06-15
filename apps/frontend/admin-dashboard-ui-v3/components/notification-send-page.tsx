"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Send, Users, Eye, CheckCircle } from "lucide-react"
import { templatesApi, gradesApi, labelsApi, customersApi, notificationsSendApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { SendAudience } from "@/lib/merchant/types"

/**
 * Send Notification — TanStack Query migration (owner/manager: COM-050/051).
 *
 * Ground truth (notifications.controller send DTOs):
 *   - Single: SendSingleDto requires `to_customer_id` (the old body sent `customer_id`
 *     → 400). channel comes from the chosen template.
 *   - Segment: SendToSegmentDto = { channel, template_id, target_audience∈
 *     all|grade|label|specific_customers, target_grade_ids[]/target_label_ids[]/
 *     target_customer_ids[] (UUIDs) }. The old body sent `segment` + `grade_id`/
 *     `label_id`/`customer_ids` using NAME strings → 400.
 *   - The old GRADES/LABELS lists and the `estimatedCount` (1240/187/94) were mock —
 *     replaced with real grades/labels/customers; the real recipient estimate comes
 *     back in the send-to-segment response (`estimated_recipients`).
 */

type SendMode = "single" | "campaign"
const AUDIENCES: { value: SendAudience; label: string }[] = [
  { value: "all", label: "All Customers" },
  { value: "grade", label: "By Grade" },
  { value: "label", label: "By Label" },
  { value: "specific_customers", label: "Specific" },
]
const fullName = (c: { first_name: string; last_name: string; customer_code: string | null }) => `${c.first_name} ${c.last_name}`.trim() + (c.customer_code ? ` (${c.customer_code})` : "")

export default function NotificationSendPage() {
  const templatesQuery = useQuery({ queryKey: merchantKeys.notifTemplates.list(), queryFn: templatesApi.list })
  const gradesQuery = useQuery({ queryKey: merchantKeys.grades.list(), queryFn: gradesApi.list })
  const labelsQuery = useQuery({ queryKey: merchantKeys.labels.list(), queryFn: labelsApi.list })
  const customersQuery = useQuery({ queryKey: merchantKeys.customers.list("send-picker"), queryFn: () => customersApi.list({ limit: 100 }).then((r) => r.records ?? []) })

  const templates = templatesQuery.data ?? []
  const grades = gradesQuery.data ?? []
  const labels = labelsQuery.data ?? []
  const customers = customersQuery.data ?? []

  const [sendMode, setSendMode] = useState<SendMode>("campaign")
  const [templateId, setTemplateId] = useState("")
  const [toCustomerId, setToCustomerId] = useState("")
  const [audience, setAudience] = useState<SendAudience>("all")
  const [gradeId, setGradeId] = useState("")
  const [labelId, setLabelId] = useState("")
  const [specificIds, setSpecificIds] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplate = templates.find((t) => t.id === templateId)

  const previewBody = (selectedTemplate?.body ?? "")
    .replace(/\{\{customer_name\}\}/g, "Fatima Zahra")
    .replace(/\{\{business_name\}\}/g, "Boutique Marrakech")
    .replace(/\{\{customer_code\}\}/g, "CUST-00123")
    .replace(/\{\{coupon_code\}\}/g, "BDAY15")
    .replace(/\{\{points\}\}/g, "450")

  const singleM = useMutation({
    mutationFn: () => notificationsSendApi.sendSingle({ channel: selectedTemplate!.channel, template_id: templateId, to_customer_id: toCustomerId }),
    onSuccess: (res) => setDone(`Message ${res.status === "sent" ? "sent" : res.status} to the customer.`),
    onError: (e) => setError(humanizeError(e, "Send failed.")),
  })
  const segmentM = useMutation({
    mutationFn: () => notificationsSendApi.sendToSegment({
      channel: selectedTemplate!.channel, template_id: templateId, target_audience: audience,
      ...(audience === "grade" && gradeId ? { target_grade_ids: [gradeId] } : {}),
      ...(audience === "label" && labelId ? { target_label_ids: [labelId] } : {}),
      ...(audience === "specific_customers" && specificIds.length ? { target_customer_ids: specificIds } : {}),
    }),
    onSuccess: (res) => setDone(`Campaign queued (job ${res.job_id.slice(0, 8)}). Estimated recipients: ${res.estimated_recipients}.`),
    onError: (e) => setError(humanizeError(e, "Campaign send failed.")),
  })

  const sending = singleM.isPending || segmentM.isPending
  const canSend = useMemo(() => {
    if (!templateId) return false
    if (sendMode === "single") return !!toCustomerId
    if (audience === "grade") return !!gradeId
    if (audience === "label") return !!labelId
    if (audience === "specific_customers") return specificIds.length > 0
    return true
  }, [templateId, sendMode, toCustomerId, audience, gradeId, labelId, specificIds])

  const submit = () => { setError(null); sendMode === "single" ? singleM.mutate() : segmentM.mutate() }
  const reset = () => { setDone(null); setError(null); setTemplateId(""); setToCustomerId(""); setSpecificIds([]) }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" /></div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sent!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center">{done}</p>
        <button onClick={reset} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Send Another</button>
      </div>
    )
  }

  const selectCls = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Send Notification</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Compose and send a message to a customer or a segment</p>
      </div>

      <div className="flex gap-2">
        {(["campaign", "single"] as SendMode[]).map((mode) => (
          <button key={mode} onClick={() => { setSendMode(mode); setError(null) }} className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${sendMode === mode ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"}`}>{mode === "campaign" ? "Campaign (Segment)" : "Single Customer"}</button>
        ))}
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">1</span>Select Template</h2>
        {templatesQuery.isError && <p className="text-sm text-red-600 dark:text-red-400">{humanizeError(templatesQuery.error, "Failed to load templates.")}</p>}
        <select className={`${selectCls} disabled:opacity-50`} value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={templatesQuery.isLoading}>
          <option value="">{templatesQuery.isLoading ? "Loading templates..." : "Choose a template..."}</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.channel.toUpperCase()})</option>)}
        </select>
        {selectedTemplate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500 dark:text-gray-400">Message Preview</span><button onClick={() => setPreview(!preview)} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400"><Eye className="w-3.5 h-3.5" />{preview ? "Hide preview" : "Show with sample data"}</button></div>
            <div className="bg-gray-50 dark:bg-[#1a1a20] rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">{preview ? previewBody : selectedTemplate.body}</div>
          </div>
        )}
      </div>

      {sendMode === "single" ? (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</span>Customer</h2>
          <select className={selectCls} value={toCustomerId} onChange={(e) => setToCustomerId(e.target.value)} disabled={customersQuery.isLoading}>
            <option value="">{customersQuery.isLoading ? "Loading customers..." : "Choose a customer..."}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}
          </select>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</span>Target Audience</h2>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button key={a.value} onClick={() => setAudience(a.value)} className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-all ${audience === a.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"}`}>{a.label}</button>
            ))}
          </div>
          {audience === "grade" && (
            <select className={selectCls} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
              <option value="">Choose a grade...</option>{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          {audience === "label" && (
            <select className={selectCls} value={labelId} onChange={(e) => setLabelId(e.target.value)}>
              <option value="">Choose a label...</option>{labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          {audience === "specific_customers" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Select customers ({specificIds.length} selected)</label>
              <div className="max-h-44 overflow-y-auto border border-gray-200 dark:border-[#1F1F23] rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
                {customers.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-[#1a1a20] cursor-pointer text-sm">
                    <input type="checkbox" checked={specificIds.includes(c.id)} onChange={(e) => setSpecificIds((p) => e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id))} className="w-4 h-4 rounded" />
                    <span className="text-gray-700 dark:text-gray-300">{fullName(c)}</span>
                  </label>
                ))}
                {customers.length === 0 && <p className="p-3 text-xs text-gray-400">No customers</p>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-indigo-700 dark:text-indigo-300">The exact recipient count is computed by the server and shown after you send.</p>
          </div>
        </div>
      )}

      {error && <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <div className="flex justify-end gap-3">
        <button onClick={submit} disabled={!canSend || sending} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
          {sending ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending..." : sendMode === "single" ? "Send to Customer" : "Send Campaign"}
        </button>
      </div>
    </div>
  )
}
