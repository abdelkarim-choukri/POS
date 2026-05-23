"use client"
import { useState } from "react"
import { MessageSquare, Mail, Phone, Save, ToggleLeft, ToggleRight, Eye, EyeOff } from "lucide-react"

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

const initialChannels: Channel[] = [
  { type: "sms", label: "SMS", icon: <Phone className="w-5 h-5" />, color: "text-blue-600 dark:text-blue-400", is_active: true, api_key: "sk_live_sms_abc123", sender_id: "MYSTORE", balance: 1240 },
  { type: "email", label: "Email", icon: <Mail className="w-5 h-5" />, color: "text-purple-600 dark:text-purple-400", is_active: true, api_key: "sg_key_email_xyz789", sender_id: "noreply@mystore.ma", balance: undefined },
  { type: "whatsapp", label: "WhatsApp", icon: <MessageSquare className="w-5 h-5" />, color: "text-green-600 dark:text-green-400", is_active: false, api_key: "", sender_id: "+212600000000", balance: undefined },
]

export default function NotificationChannelsPage() {
  const [channels, setChannels] = useState(initialChannels)
  const [showKey, setShowKey] = useState<Record<ChannelType, boolean>>({ sms: false, email: false, whatsapp: false })
  const [saved, setSaved] = useState<ChannelType | null>(null)

  const update = (type: ChannelType, field: keyof Channel, value: any) =>
    setChannels(prev => prev.map(c => c.type === type ? { ...c, [field]: value } : c))

  const save = (type: ChannelType) => {
    setSaved(type)
    setTimeout(() => setSaved(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Configure notification channels for sending SMS, email, and WhatsApp messages to customers.
      </div>

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
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-[#1F1F23]">
                <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#1F1F23] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  Test Connection
                </button>
                <button onClick={() => save(ch.type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${saved === ch.type ? "bg-green-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
                  <Save className="w-3.5 h-3.5" />
                  {saved === ch.type ? "Saved!" : "Save"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
