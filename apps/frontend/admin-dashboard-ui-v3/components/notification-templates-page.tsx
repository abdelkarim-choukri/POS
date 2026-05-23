"use client"
import { useState } from "react"
import { Plus, Pencil, Trash2, X, Search, FileText } from "lucide-react"

interface NotificationTemplate {
  id: string
  name: string
  channel: "sms" | "email" | "whatsapp"
  subject?: string
  body: string
  placeholders: string[]
  is_active: boolean
  send_count: number
}

const mockTemplates: NotificationTemplate[] = [
  { id: "t-1", name: "Welcome Message", channel: "sms", body: "Bienvenue {{customer_name}} chez {{business_name}}! Votre code client: {{customer_code}}.", placeholders: ["customer_name", "business_name", "customer_code"], is_active: true, send_count: 342 },
  { id: "t-2", name: "Birthday Greeting", channel: "sms", body: "Joyeux anniversaire {{customer_name}}! Profitez de 15% de réduction aujourd'hui avec le code: {{coupon_code}}.", placeholders: ["customer_name", "coupon_code"], is_active: true, send_count: 87 },
  { id: "t-3", name: "Order Confirmation", channel: "email", subject: "Confirmation de commande #{{order_number}}", body: "Cher(e) {{customer_name}},\n\nVotre commande #{{order_number}} d'un montant de {{total}} MAD a été confirmée.", placeholders: ["customer_name", "order_number", "total"], is_active: true, send_count: 1204 },
  { id: "t-4", name: "Points Expiry Warning", channel: "sms", body: "Vos {{points}} points fidélité expirent le {{expiry_date}}. Dépensez-les vite!", placeholders: ["points", "expiry_date"], is_active: false, send_count: 0 },
]

const CHANNEL_BADGE: Record<string, string> = {
  sms: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  email: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  whatsapp: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState(mockTemplates)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<NotificationTemplate | null>(null)
  const [form, setForm] = useState({ name: "", channel: "sms" as NotificationTemplate["channel"], subject: "", body: "" })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditing(null); setForm({ name: "", channel: "sms", subject: "", body: "" }); setShowModal(true) }
  const openEdit = (t: NotificationTemplate) => { setEditing(t); setForm({ name: t.name, channel: t.channel, subject: t.subject ?? "", body: t.body }); setShowModal(true) }

  const save = () => {
    if (!form.name.trim() || !form.body.trim()) return
    if (editing) {
      setTemplates(prev => prev.map(t => t.id === editing.id ? { ...t, ...form } : t))
    } else {
      const placeholders = Array.from(form.body.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1])
      setTemplates(prev => [...prev, { id: `t-${Date.now()}`, ...form, placeholders, is_active: true, send_count: 0 }])
    }
    setShowModal(false)
  }

  const remove = (id: string) => { setTemplates(prev => prev.filter(t => t.id !== id)); setConfirmDelete(null) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(t => (
          <div key={t.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${CHANNEL_BADGE[t.channel]}`}>{t.channel}</span>
                    <span className="text-xs text-gray-400">{t.send_count.toLocaleString()} sent</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmDelete === t.id ? (
                  <div className="flex gap-1 items-center">
                    <button onClick={() => remove(t.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {t.subject && <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Subject: {t.subject}</p>}
            <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1a20] rounded-lg p-3 font-mono leading-relaxed">{t.body}</p>
            {t.placeholders.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {t.placeholders.map(p => (
                  <code key={p} className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded">{`{{${p}}}`}</code>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? "Edit Template" : "New Template"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Template name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value as NotificationTemplate["channel"] }))}>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>
            {form.channel === "email" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body * (use {"{{placeholder}}"} syntax)</label>
              <textarea className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                rows={4} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Hello {{customer_name}}, ..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                {editing ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
