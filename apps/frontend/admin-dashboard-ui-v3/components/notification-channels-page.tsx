"use client"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { MessageSquare, Mail, Phone, Save, ToggleLeft, ToggleRight, Eye, EyeOff, X } from "lucide-react"

type ChannelType = "sms" | "email" | "whatsapp"

interface Channel {
  type: ChannelType
  label: string
  icon: React.ReactNode
  color: string
  is_active: boolean
  api_key: string
  sender_id: string
  balance?: number
}

const CHANNEL_META: Record<ChannelType, { label: string; icon: React.ReactNode; color: string }> = {
  sms:      { label: "SMS",       icon: <Phone className="w-5 h-5" />,          color: "text-blue-600 dark:text-blue-400" },
  email:    { label: "Email",     icon: <Mail className="w-5 h-5" />,            color: "text-purple-600 dark:text-purple-400" },
  whatsapp: { label: "WhatsApp",  icon: <MessageSquare className="w-5 h-5" />,   color: "text-green-600 dark:text-green-400" },
}

const ALL_CHANNELS: ChannelType[] = ["sms", "email", "whatsapp"]

function buildDefaultChannels(): Channel[] {
  return ALL_CHANNELS.map(type => ({
    type,
    ...CHANNEL_META[type],
    is_active: false,
    api_key: "",
    sender_id: "",
    balance: undefined,
  }))
}

export default function NotificationChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>(buildDefaultChannels)
  const [showKey, setShowKey] = useState<Record<ChannelType, boolean>>({ sms: false, email: false, whatsapp: false })

  // Per-card loading/error/success states
  const [saving, setSaving] = useState<Partial<Record<ChannelType, boolean>>>({})
  const [testing, setTesting] = useState<Partial<Record<ChannelType, boolean>>>({})
  const [saveError, setSaveError] = useState<Partial<Record<ChannelType, string>>>({})
  const [testError, setTestError] = useState<Partial<Record<ChannelType, string>>>({})
  const [saved, setSaved] = useState<Partial<Record<ChannelType, boolean>>>({})
  const [testOk, setTestOk] = useState<Partial<Record<ChannelType, boolean>>>({})
  const [loadError, setLoadError] = useState<string | null>(null)

  // Load channels on mount
  useEffect(() => {
    apiFetch<{ channel: string; is_enabled: boolean; credentials: Record<string, any> }[]>(
      "/api/business/notifications/channels"
    )
      .then(data => {
        setChannels(prev =>
          prev.map(ch => {
            const found = data.find(d => d.channel === ch.type)
            if (!found) return ch
            return {
              ...ch,
              is_active: found.is_enabled,
              // credentials are server-redacted; pre-fill display values only when present
              api_key: found.credentials?.api_key ?? "",
              sender_id: found.credentials?.sender_id ?? found.credentials?.from_address ?? "",
            }
          })
        )
      })
      .catch((e: any) => setLoadError(e.message ?? "Failed to load channels"))
  }, [])

  const update = (type: ChannelType, field: keyof Channel, value: any) =>
    setChannels(prev => prev.map(c => c.type === type ? { ...c, [field]: value } : c))

  // PUT /api/business/notifications/channels
  const save = (type: ChannelType) => {
    const ch = channels.find(c => c.type === type)
    if (!ch) return
    setSaving(p => ({ ...p, [type]: true }))
    setSaveError(p => ({ ...p, [type]: undefined }))
    setSaved(p => ({ ...p, [type]: false }))

    apiFetch("/api/business/notifications/channels", {
      method: "PUT",
      body: JSON.stringify({
        channel: type,
        is_enabled: ch.is_active,
        credentials: {
          api_key: ch.api_key,
          sender_id: ch.sender_id,
        },
      }),
    })
      .then(() => {
        setSaved(p => ({ ...p, [type]: true }))
        setTimeout(() => setSaved(p => ({ ...p, [type]: false })), 2000)
      })
      .catch((e: any) => setSaveError(p => ({ ...p, [type]: e.message ?? "Save failed" })))
      .finally(() => setSaving(p => ({ ...p, [type]: false })))
  }

  // POST /api/business/notifications/channels/test
  const test = (type: ChannelType) => {
    const ch = channels.find(c => c.type === type)
    if (!ch) return
    // Use sender_id as test recipient for SMS/WhatsApp, or a generic placeholder for email
    const testRecipient = type === "email"
      ? (ch.sender_id || "test@example.com")
      : (ch.sender_id || "+212600000000")

    setTesting(p => ({ ...p, [type]: true }))
    setTestError(p => ({ ...p, [type]: undefined }))
    setTestOk(p => ({ ...p, [type]: false }))

    apiFetch("/api/business/notifications/channels/test", {
      method: "POST",
      body: JSON.stringify({ channel: type, test_recipient: testRecipient }),
    })
      .then(() => {
        setTestOk(p => ({ ...p, [type]: true }))
        setTimeout(() => setTestOk(p => ({ ...p, [type]: false })), 2000)
      })
      .catch((e: any) => setTestError(p => ({ ...p, [type]: e.message ?? "Test failed" })))
      .finally(() => setTesting(p => ({ ...p, [type]: false })))
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Configure notification channels for sending SMS, email, and WhatsApp messages to customers.
      </div>

      {loadError && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
          <button onClick={() => setLoadError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      <div className="space-y-4">
        {channels.map(ch => (
          <div key={ch.type} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gray-50 dark:bg-[#1a1a20] flex items-center justify-center ${ch.color}`}>
                  {ch.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{ch.label}</p>
                  {ch.balance !== undefined && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Balance: {ch.balance.toLocaleString()} credits</p>
                  )}
                </div>
              </div>
              <button onClick={() => update(ch.type, "is_active", !ch.is_active)} className="flex items-center gap-2 text-sm">
                {ch.is_active
                  ? <ToggleRight className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                <span className={ch.is_active ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-gray-400"}>
                  {ch.is_active ? "Enabled" : "Disabled"}
                </span>
              </button>
            </div>

            {ch.is_active && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey[ch.type] ? "text" : "password"}
                      className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      value={ch.api_key}
                      onChange={e => update(ch.type, "api_key", e.target.value)}
                      placeholder="Enter API key..."
                    />
                    <button
                      onClick={() => setShowKey(p => ({ ...p, [ch.type]: !p[ch.type] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      {showKey[ch.type] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {ch.type === "email" ? "From Address" : "Sender ID"}
                  </label>
                  <input
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={ch.sender_id}
                    onChange={e => update(ch.type, "sender_id", e.target.value)}
                    placeholder={ch.type === "email" ? "noreply@example.com" : "MYSTORE"}
                  />
                </div>
              </div>
            )}

            {ch.is_active && (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#1F1F23]">
                {/* Inline error messages */}
                {testError[ch.type] && (
                  <p className="text-xs text-red-600 dark:text-red-400">{testError[ch.type]}</p>
                )}
                {saveError[ch.type] && (
                  <p className="text-xs text-red-600 dark:text-red-400">{saveError[ch.type]}</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => test(ch.type)}
                    disabled={!!testing[ch.type]}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#1F1F23] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors disabled:opacity-50">
                    {testing[ch.type] ? "Testing..." : testOk[ch.type] ? "Sent!" : "Test Connection"}
                  </button>
                  <button
                    onClick={() => save(ch.type)}
                    disabled={!!saving[ch.type]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${saved[ch.type] ? "bg-green-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
                    <Save className="w-3.5 h-3.5" />
                    {saving[ch.type] ? "Saving..." : saved[ch.type] ? "Saved!" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
