"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { User, Shield, Bell, Globe, Save, ChevronRight, Settings as SettingsIcon } from "lucide-react"
import { authApi, settingsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { NotificationChannel } from "@/lib/merchant/types"

/**
 * Settings — TanStack Query migration (honest trim).
 *
 * Only the backend-persisted flows remain. The previous page was ~80% local-only
 * mock (Business Profile, Fiscal, Receipt, Security toggles, Display, Integrations,
 * Chain, Billing) behind a dead top "Save Changes" button — there are NO endpoints
 * to persist any of it, so those sections were removed rather than fake success.
 *
 * Real endpoints (verified against controllers/DTOs):
 *   - GET /api/auth/me                                    → account (read-only; no profile-update endpoint)
 *   - PUT /api/auth/change-password                       → { current_password, new_password } (MinLength 6)
 *   - GET/PUT /api/business/settings/settlement-cutoff    → { cutoff_time HH:MM }; PUT owner-only
 *   - GET/PUT /api/business/notifications/channels        → BOTH owner-only; toggle col is `is_active`
 *       (NOT is_enabled); PUT is an upsert — send ONLY { channel, is_active }; config returns masked.
 */

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 disabled:opacity-50 ${checked ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-[#1F1F23]"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  )
}

const CHANNEL_LABEL: Record<string, string> = { sms: "SMS", email: "Email", whatsapp: "WhatsApp" }

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<"account" | "operations" | "notifications">("account")

  // ── Queries ───────────────────────────────────────────────────────────────
  const meQuery = useQuery({ queryKey: merchantKeys.auth.me(), queryFn: authApi.me })
  const me = meQuery.data
  const isOwner = me?.role === "owner"

  const cutoffQuery = useQuery({ queryKey: merchantKeys.settings.cutoff(), queryFn: settingsApi.getCutoff })
  // Channels GET is owner-only → don't even fire it for non-owners (avoids a 403).
  const channelsQuery = useQuery({
    queryKey: merchantKeys.settings.channels(),
    queryFn: settingsApi.listChannels,
    enabled: isOwner,
  })

  // ── Change password ───────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" })
  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState("")
  const pwMutation = useMutation({
    mutationFn: () => authApi.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
    onSuccess: () => {
      setPwSuccess("Password changed successfully")
      setPwForm({ current_password: "", new_password: "", confirm_password: "" })
    },
    onError: (e) => setPwError(humanizeError(e, "Failed to change password.")),
  })
  const submitPassword = () => {
    setPwError(""); setPwSuccess("")
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError("New passwords do not match"); return }
    if (pwForm.new_password.length < 6) { setPwError("New password must be at least 6 characters"); return }
    pwMutation.mutate()
  }

  // ── Settlement cutoff ─────────────────────────────────────────────────────
  const [cutoff, setCutoff] = useState<string | null>(null)
  const [cutoffMsg, setCutoffMsg] = useState("")
  const cutoffValue = cutoff ?? cutoffQuery.data?.cutoff_time ?? "02:00"
  const cutoffMutation = useMutation({
    mutationFn: (time: string) => settingsApi.updateCutoff(time),
    onSuccess: (data) => {
      setCutoffMsg("Settlement cutoff saved")
      queryClient.setQueryData(merchantKeys.settings.cutoff(), data)
    },
    onError: (e) => setCutoffMsg(humanizeError(e, "Failed to save settlement cutoff.")),
  })

  // ── Notification channels ─────────────────────────────────────────────────
  const channelMutation = useMutation({
    mutationFn: ({ channel, is_active }: { channel: NotificationChannel["channel"]; is_active: boolean }) =>
      settingsApi.upsertChannel({ channel, is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: merchantKeys.settings.channels() }),
  })

  const sections = [
    { id: "account" as const, label: "Account", icon: User },
    { id: "operations" as const, label: "Operations", icon: SettingsIcon },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
  ]

  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
  const roCls = "w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg text-sm bg-gray-50 dark:bg-[#0F0F12] text-gray-500 dark:text-gray-400 cursor-not-allowed"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account and the business settings that can be saved</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-2">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === s.id ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a20]"}`}
              >
                <s.icon className="w-5 h-5" />
                {s.label}
                <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${activeSection === s.id ? "rotate-90" : ""}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            {/* ACCOUNT */}
            {activeSection === "account" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Account</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your profile and password</p>
                </div>

                <div className="border border-gray-200 dark:border-[#1F1F23] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><User className="w-4 h-4" />Your Account</h3>
                  {meQuery.isLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                  ) : meQuery.isError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{humanizeError(meQuery.error, "Failed to load profile.")}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                        <input type="text" value={me?.first_name ?? ""} readOnly className={roCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                        <input type="text" value={me?.last_name ?? ""} readOnly className={roCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input type="email" value={me?.email ?? ""} readOnly className={roCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <input type="text" value={me?.role ?? ""} readOnly className={`${roCls} capitalize`} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business</label>
                        <input type="text" value={me?.business?.name ?? ""} readOnly className={roCls} />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">Profile fields are read-only — there is no self-service profile edit endpoint yet.</p>
                </div>

                <div className="border border-gray-200 dark:border-[#1F1F23] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="w-4 h-4" />Change Password</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                      <input type="password" autoComplete="current-password" value={pwForm.current_password} onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                      <input type="password" autoComplete="new-password" value={pwForm.new_password} onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                      <input type="password" autoComplete="new-password" value={pwForm.confirm_password} onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))} className={inputCls} />
                    </div>
                    {pwError && <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>}
                    {pwSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{pwSuccess}</p>}
                    <button
                      onClick={submitPassword}
                      disabled={pwMutation.isPending || !pwForm.current_password || !pwForm.new_password || !pwForm.confirm_password}
                      className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />{pwMutation.isPending ? "Saving…" : "Update Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* OPERATIONS — settlement cutoff */}
            {activeSection === "operations" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Operations</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Daily settlement cutoff</p>
                </div>
                <div className="border border-gray-200 dark:border-[#1F1F23] rounded-xl p-5 space-y-3 max-w-md">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Daily Settlement Cutoff Time</label>
                  {cutoffQuery.isLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                  ) : (
                    <>
                      <input type="time" value={cutoffValue} disabled={!isOwner} onChange={(e) => { setCutoff(e.target.value); setCutoffMsg("") }} className={`${inputCls} ${!isOwner ? "opacity-60 cursor-not-allowed" : ""}`} />
                      <p className="text-xs text-gray-400 dark:text-gray-500">Transactions before this time count toward the previous business day. Affects daily ops reports only — TVA reports always use calendar date.</p>
                      {isOwner ? (
                        <button onClick={() => { setCutoffMsg(""); cutoffMutation.mutate(cutoffValue) }} disabled={cutoffMutation.isPending} className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                          <Save className="w-3 h-3" />{cutoffMutation.isPending ? "Saving…" : "Save Cutoff"}
                        </button>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Only an owner can change the settlement cutoff.</p>
                      )}
                      {cutoffMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400">{cutoffMsg}</p>}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* NOTIFICATIONS — channels */}
            {activeSection === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Notification Channels</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable the channels used to message your customers</p>
                </div>
                {!isOwner ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Only an owner can view and manage notification channels.</p>
                ) : channelsQuery.isLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading channels…</p>
                ) : channelsQuery.isError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{humanizeError(channelsQuery.error, "Failed to load channels.")}</p>
                ) : (channelsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No channels configured yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(channelsQuery.data ?? []).map((ch) => (
                      <div key={ch.channel} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{CHANNEL_LABEL[ch.channel] ?? ch.channel}</p>
                            {ch.provider && <p className="text-xs text-gray-500 dark:text-gray-400">{ch.provider}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {channelMutation.isPending && channelMutation.variables?.channel === ch.channel && <span className="text-xs text-gray-400">Saving…</span>}
                          <Toggle checked={ch.is_active} disabled={channelMutation.isPending} onChange={(val) => channelMutation.mutate({ channel: ch.channel, is_active: val })} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
