"use client"
import { useState } from "react"
import { Send, Users, Eye, CheckCircle } from "lucide-react"

interface Template { id: string; name: string; channel: string; body: string }

const mockTemplates: Template[] = [
  { id: "t-1", name: "Welcome Message", channel: "sms", body: "Bienvenue {{customer_name}} chez {{business_name}}! Votre code client: {{customer_code}}." },
  { id: "t-2", name: "Birthday Greeting", channel: "sms", body: "Joyeux anniversaire {{customer_name}}! Profitez de 15% de réduction avec: {{coupon_code}}." },
  { id: "t-3", name: "Order Confirmation", channel: "email", body: "Cher(e) {{customer_name}}, votre commande #{{order_number}} est confirmée." },
  { id: "t-4", name: "Points Expiry Warning", channel: "sms", body: "Vos {{points}} points expirent le {{expiry_date}}." },
]

type Segment = "all" | "grade" | "label" | "specific"
const GRADES = ["Bronze", "Silver", "Gold", "Platinum"]
const LABELS = ["VIP", "Regular", "New Customer", "Loyalty Member"]

export default function NotificationSendPage() {
  const [templateId, setTemplateId] = useState("")
  const [segment, setSegment] = useState<Segment>("all")
  const [grade, setGrade] = useState("Gold")
  const [label, setLabel] = useState("VIP")
  const [preview, setPreview] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const selectedTemplate = mockTemplates.find(t => t.id === templateId)
  const estimatedCount = segment === "all" ? 1240 : segment === "grade" ? 187 : segment === "label" ? 94 : 1

  const previewBody = selectedTemplate?.body
    .replace("{{customer_name}}", "Fatima Zahra")
    .replace("{{business_name}}", "Café Atlas")
    .replace("{{customer_code}}", "CUST-00123")
    .replace("{{coupon_code}}", "BDAY15")
    .replace("{{order_number}}", "TXN-2025-001234")
    .replace("{{points}}", "450")
    .replace("{{expiry_date}}", "2025-03-01") ?? ""

  const handleSend = () => {
    if (!templateId) return
    setSending(true)
    setTimeout(() => { setSending(false); setSent(true) }, 1500)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Campaign Sent!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center">
          <strong>{selectedTemplate?.name}</strong> is being sent to {estimatedCount.toLocaleString()} customers.
        </p>
        <button onClick={() => { setSent(false); setTemplateId("") }}
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

      {/* Step 1: Template */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
          Select Template
        </h2>
        <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={templateId} onChange={e => setTemplateId(e.target.value)}>
          <option value="">Choose a template...</option>
          {mockTemplates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.channel.toUpperCase()})</option>)}
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

      {/* Step 2: Segment */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
          Target Audience
        </h2>
        <div className="flex flex-wrap gap-2">
          {(["all", "grade", "label"] as Segment[]).map(s => (
            <button key={s} onClick={() => setSegment(s)}
              className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-all capitalize ${segment === s ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-400 hover:border-indigo-300"}`}>
              {s === "all" ? "All Customers" : s === "grade" ? "By Grade" : "By Label"}
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
        <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Estimated recipients: <strong>{estimatedCount.toLocaleString()}</strong> customers
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={handleSend} disabled={!templateId || sending}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
          {sending ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending..." : `Send to ${estimatedCount.toLocaleString()} Customers`}
        </button>
      </div>
    </div>
  )
}
