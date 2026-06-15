"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageSquare, Mail, Phone, Save, ToggleLeft, ToggleRight, Eye, EyeOff, X, RefreshCw } from "lucide-react"
import { settingsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { NotificationChannelKey } from "@/lib/merchant/types"

/**
 * Notification Channels — TanStack Query migration (owner-only: COM-020/021/022/031).
 *
 * Ground truth (communications.controller + notification_channels entity/DTOs):
 *   - GET .../channels returns entities with `is_active` (NOT is_enabled), `provider`,
 *     `provider_config_json` (MASKED '***', NOT `credentials`), `default_sender_id`.
 *   - PUT upsert DTO = { channel, is_active?, provider?, provider_config_json?,
 *     default_sender_id?, default_sender_name? }. The old PUT sent `is_enabled` +
 *     `credentials{...}` → forbidNonWhitelisted 400.
 *   - POST .../channels/test DTO = { channel, to (REQUIRED), test_message? }. The old
 *     body sent `test_recipient` → 400.
 *   - The masked config means the API key is never returned; it's only written. The
 *     SMS balance (GET .../sms/balance, was never fetched) now shows on the SMS card.
 */

const META: Record<NotificationChannelKey, { label: string; icon: React.ReactNode; color: string }> = {
  sms: { label: "SMS", icon: <Phone className="w-5 h-5" />, color: "text-blue-600 dark:text-blue-400" },
  email: { label: "Email", icon: <Mail className="w-5 h-5" />, color: "text-purple-600 dark:text-purple-400" },
  whatsapp: { label: "WhatsApp", icon: <MessageSquare className="w-5 h-5" />, color: "text-green-600 dark:text-green-400" },
}
const ALL: NotificationChannelKey[] = ["sms", "email", "whatsapp"]

type Draft = { is_active: boolean; api_key: string; sender_id: string; configured: boolean }

export default function NotificationChannelsPage() {
  const queryClient = useQueryClient()
  const channelsQuery = useQuery({ queryKey: merchantKeys.settings.channels(), queryFn: settingsApi.listChannels })
  const smsBalanceQuery = useQuery({ queryKey: merchantKeys.settings.smsBalance(), queryFn: settingsApi.getSmsBalance })

  // Local edit drafts keyed by channel, seeded from server data.
  const [drafts, setDrafts] = useState<Partial<Record<NotificationChannelKey, Draft>>>({})
  const [showKey, setShowKey] = useState<Record<NotificationChannelKey, boolean>>({ sms: false, email: false, whatsapp: false })
  const [test, setTest] = useState<Partial<Record<NotificationChannelKey, string>>>({})
  const [msg, setMsg] = useState<Partial<Record<NotificationChannelKey, { ok?: string; err?: string }>>>({})

  // Effective channel view = server row merged with the 3 known types, plus any draft.
  const channels = useMemo(() => {
    const byType = new Map((channelsQuery.data ?? []).map((c) => [c.channel, c]))
    return ALL.map((type) => {
      const server = byType.get(type)
      const draft = drafts[type]
      return {
        type,
        ...META[type],
        is_active: draft?.is_active ?? server?.is_active ?? false,
        api_key: draft?.api_key ?? "",
        sender_id: draft?.sender_id ?? server?.default_sender_id ?? "",
        configured: !!server?.provider,
      }
    })
  }, [channelsQuery.data, drafts])

  const setDraft = (type: NotificationChannelKey, patch: Partial<Draft>) =>
    setDrafts((d) => {
      const cur = channels.find((c) => c.type === type)!
      const existing: Draft = d[type] ?? { is_active: cur.is_active, api_key: cur.api_key, sender_id: cur.sender_id, configured: cur.configured }
      return { ...d, [type]: { ...existing, ...patch } }
    })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.settings.all })

  const saveM = useMutation({
    mutationFn: (type: NotificationChannelKey) => {
      const ch = channels.find((c) => c.type === type)!
      return settingsApi.upsertChannel({
        channel: type,
        is_active: ch.is_active,
        ...(ch.sender_id.trim() ? { default_sender_id: ch.sender_id.trim() } : {}),
        // Only write the key when the user actually typed one (it is never returned).
        ...(ch.api_key.trim() ? { provider_config_json: { api_key: ch.api_key.trim() } } : {}),
      })
    },
    onSuccess: (_d, type) => { setMsg((m) => ({ ...m, [type]: { ok: "Saved" } })); setDrafts((d) => { const n = { ...d }; delete n[type]; return n }); invalidate(); setTimeout(() => setMsg((m) => ({ ...m, [type]: {} })), 2000) },
    onError: (e, type) => setMsg((m) => ({ ...m, [type]: { err: humanizeError(e, "Save failed.") } })),
  })

  const testM = useMutation({
    mutationFn: ({ type, to }: { type: NotificationChannelKey; to: string }) => settingsApi.testChannel({ channel: type, to }),
    onSuccess: (_d, { type }) => { setMsg((m) => ({ ...m, [type]: { ok: "Test sent" } })); setTimeout(() => setMsg((m) => ({ ...m, [type]: {} })), 2500) },
    onError: (e, { type }) => setMsg((m) => ({ ...m, [type]: { err: humanizeError(e, "Test failed.") } })),
  })

  const refreshBalanceM = useMutation({ mutationFn: () => settingsApi.refreshSmsBalance(), onSuccess: () => queryClient.invalidateQueries({ queryKey: merchantKeys.settings.smsBalance() }) })

  const loadError = channelsQuery.isError ? humanizeError(channelsQuery.error, "Failed to load channels.") : null

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500 dark:text-gray-400">Configure notification channels for sending SMS, email, and WhatsApp messages to customers. (Owner only.)</div>

      {loadError && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
          <button onClick={() => channelsQuery.refetch()} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded"><X className="w-4 h-4 text-red-500" /></button>
        </div>
      )}

      <div className="space-y-4">
        {channels.map((ch) => (
          <div key={ch.type} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gray-50 dark:bg-[#1a1a20] flex items-center justify-center ${ch.color}`}>{ch.icon}</div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{ch.label}</p>
                  {ch.type === "sms" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      {smsBalanceQuery.data?.balance != null ? `Balance: ${Number(smsBalanceQuery.data.balance).toLocaleString()} credits` : (smsBalanceQuery.data?.message ?? "Balance: —")}
                      <button onClick={() => refreshBalanceM.mutate()} title="Refresh balance" className="ml-1 text-gray-400 hover:text-gray-600"><RefreshCw className={`w-3 h-3 ${refreshBalanceM.isPending ? "animate-spin" : ""}`} /></button>
                    </p>
                  )}
                  {ch.type !== "sms" && ch.configured && <p className="text-xs text-gray-400 dark:text-gray-500">Configured</p>}
                </div>
              </div>
              <button onClick={() => setDraft(ch.type, { is_active: !ch.is_active })} className="flex items-center gap-2 text-sm">
                {ch.is_active ? <ToggleRight className="w-8 h-8 text-indigo-600 dark:text-indigo-400" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                <span className={ch.is_active ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-gray-400"}>{ch.is_active ? "Enabled" : "Disabled"}</span>
              </button>
            </div>

            {ch.is_active && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key {ch.configured && <span className="text-xs text-gray-400">(set — leave blank to keep)</span>}</label>
                    <div className="relative">
                      <input type={showKey[ch.type] ? "text" : "password"} className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" value={ch.api_key} onChange={(e) => setDraft(ch.type, { api_key: e.target.value })} placeholder={ch.configured ? "•••••••• (unchanged)" : "Enter API key..."} />
                      <button onClick={() => setShowKey((p) => ({ ...p, [ch.type]: !p[ch.type] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">{showKey[ch.type] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ch.type === "email" ? "From Address" : "Sender ID"}</label>
                    <input className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={ch.sender_id} onChange={(e) => setDraft(ch.type, { sender_id: e.target.value })} placeholder={ch.type === "email" ? "noreply@example.com" : "MYSTORE"} />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#1F1F23]">
                  {msg[ch.type]?.err && <p className="text-xs text-red-600 dark:text-red-400">{msg[ch.type]?.err}</p>}
                  {msg[ch.type]?.ok && <p className="text-xs text-green-600 dark:text-green-400">{msg[ch.type]?.ok}</p>}
                  <div className="flex items-center justify-end gap-3">
                    <input value={test[ch.type] ?? ""} onChange={(e) => setTest((t) => ({ ...t, [ch.type]: e.target.value }))} placeholder={ch.type === "email" ? "test@example.com" : "+212600000000"} className="px-3 py-1.5 text-xs border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white w-44 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={() => testM.mutate({ type: ch.type, to: (test[ch.type] ?? "").trim() })} disabled={testM.isPending || !(test[ch.type] ?? "").trim()} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#1F1F23] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors disabled:opacity-50">{testM.isPending ? "Testing..." : "Test Connection"}</button>
                    <button onClick={() => saveM.mutate(ch.type)} disabled={saveM.isPending} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"><Save className="w-3.5 h-3.5" />{saveM.isPending ? "Saving..." : "Save"}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
