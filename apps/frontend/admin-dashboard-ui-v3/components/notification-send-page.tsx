"use client"
import { useState, useEffect } from "react"
import { Send, Users, Eye, CheckCircle } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Template { id: string; name: string; channel: string; body: string }

type SendMode = "single" | "campaign"
type Segment = "all" | "grade" | "label" | "specific"
const GRADES = ["Bronze", "Silver", "Gold", "Platinum"]
const LABELS = ["VIP", "Regular", "New Customer", "Loyalty Member"]

export default function NotificationSendPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  const [sendMode, setSendMode] = useState<SendMode>("campaign")
  const [templateId, setTemplateId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [segment, setSegment] = useState<Segment>("all")
  const [grade, setGrade] = useState("Gold")
  const [label, setLabel] = useState("VIP")
  const [customerIds, setCustomerIds] = useState("")
  const [preview, setPreview] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setTemplatesLoading(true)
    setTemplatesError(null)
    apiFetch<{ data: Template[] } | Template[]>("/api/business/notifications/templates")
      .then(res => {
        const list = Array.isArray(res) ? res : (res as { data: Template[] }).data ?? []
        setTemplates(list)
      })
      .catch(err => setTemplatesError(err?.message ?? "Failed to load templates"))
      .finally(() => setTemplatesLoading(false))
  }, [])

  const selectedTemplate = templates.find(t => t.id === templateId)
  const estimatedCount = segment === "all" ? 1240 : segment === "grade" ? 187 : segment === "label" ? 94 : 1

  const previewBody = selectedTemplate?.body
    .replace("{{customer_name}}", "Fatima Zahra")
    .replace("{{business_name}}", "Café Atlas")
    .replace("{{customer_code}}", "CUST-00123")
    .replace("{{coupon_code}}", "BDAY15")
    .replace("{{order_number}}", "TXN-2025-001234")
    .replace("{{points}}", "450")
    .replace("{{expiry_date}}", "2025-03-01") ?? ""

  const handleSend = async () => {
    if (!templateId) return
    setSending(true)
    setSendError(null)
    setSuccessMessage(null)
    try {
      if (sendMode === "single") {
        // Single customer send → POST /api/business/notifications/send
        await apiFetch("/api/business/notifications/send", {
          method: "POST",
          body: JSON.stringify({
            template_id: templateId,
            customer_id: customerId.trim(),
            channel: selectedTemplate?.channel ?? "sms",
          }),
        })
        setSuccessMessage("Message sent successfully.")
      } else {
        // Campaign / segment send → POST /api/business/notifications/send-to-segment
        const body: Record<string, unknown> = {
          template_id: templateId,
          channel: selectedTemplate?.channel ?? "sms",
          segment,
        }
        if (segment === "grade") body.grade_id = grade
        if (segment === "label") body.label_id = label
        if (segment === "specific") {
          const ids = customerIds.split(",").map((s: string) => s.trim()).filter(Boolean)
          body.customer_ids = ids
        }
        const res = await apiFetch<{ job_id?: string; estimated_recipients?: number }>("/api/business/notifications/send-to-segment", {
          method: "POST",
          body: JSON.stringify(body),
        })
        setSuccessMessage(
          res.job_id
            ? `Campaign queued (job ${res.job_id}). Estimated recipients: ${res.estimated_recipients ?? "unknown"}.`
            : "Campaign sent successfully."
        )
      }
      setSent(true)
    } catch (e: any) {
      setSendError(e.message ?? "Failed")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Campaign Sent!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center">
          {successMessage ?? <>
            <strong>{selectedTemplate?.name}</strong> is being sent to {estimatedCount.toLocaleString()} customers.
          </>}
        </p>
        <button onClick={() => { setSent(false); setTemplateId(""); setSuccessMessage(null) }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          Send Another
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Send Notification</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Compose and send a message campaign to customers</p>
      </div>

      {/* Send mode toggle */}
      <div className="flex gap-2">
        {(["campaign", "single"] as SendMode[]).map(mode => (
          <button key={mode} onClick={() => { setSendMode(mode); setSendError(null); setSuccessMessage(null) }}
            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${sendMode === mode ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"}`}>
            {mode === "campaign" ? "Campaign (Segment)" : "Single Customer"}
          </button>
        ))}
      </div>

      {/* Step 1: Template */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
          Select Template
        </h2>
        {templatesError && (
          <p className="text-sm text-red-600 dark:text-red-400">{templatesError}</p>
        )}
        <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          value={templateId} onChange={e => setTemplateId(e.target.value)} disabled={templatesLoading}>
          <option value="">{templatesLoading ? "Loading templates..." : "Choose a template..."}</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.channel.toUpperCase()})</option>)}
        </select>

        {selectedTemplate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Message Preview</span>
              <button onClick={() => setPreview(!preview)} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                <Eye className="w-3.5 h-3.5" />{preview ? "Hide preview" : "Show with sample data"}
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-[#1a1a20] rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
              {preview ? previewBody : selectedTemplate.body}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Single customer OR Segment */}
      {sendMode === "single" ? (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
            Customer
          </h2>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Customer ID (UUID)</label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
            Target Audience
          </h2>
          <div className="flex flex-wrap gap-2">
            {(["all", "grade", "label", "specific"] as Segment[]).map(s => (
              <button key={s} onClick={() => setSegment(s)}
                className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-all capitalize ${segment === s ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"}`}>
                {s === "all" ? "All Customers" : s === "grade" ? "By Grade" : s === "label" ? "By Label" : "Specific"}
              </button>
            ))}
          </div>
          {segment === "grade" && (
            <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={grade} onChange={e => setGrade(e.target.value)}>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          )}
          {segment === "label" && (
            <select className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={label} onChange={e => setLabel(e.target.value)}>
              {LABELS.map(l => <option key={l}>{l}</option>)}
            </select>
          )}
          {segment === "specific" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Customer IDs (comma-separated UUIDs)</label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-none"
                rows={3}
                placeholder="e.g. uuid-1, uuid-2, uuid-3"
                value={customerIds}
                onChange={e => setCustomerIds(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Estimated recipients: <strong>{estimatedCount.toLocaleString()}</strong> customers
            </p>
          </div>
        </div>
      )}

      {/* Send error */}
      {sendError && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {sendError}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSend}
          disabled={!templateId || sending || (sendMode === "single" && !customerId.trim())}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
          {sending ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending..." : sendMode === "single" ? "Send to Customer" : `Send to ${estimatedCount.toLocaleString()} Customers`}
        </button>
      </div>
    </div>
  )
}
