"use client"
import { useState } from "react"
import { Save, RotateCcw, Info, CheckCircle } from "lucide-react"

interface SystemParameter {
  id: string
  key: string
  value: string
  description: string
  data_type: "string" | "number" | "boolean" | "json"
  is_sensitive: boolean
  updated_at: string
  updated_by: string
}

const mockParameters: SystemParameter[] = [
  { id: "sp-1", key: "platform.points_earn_divisor_default", value: "10", description: "Default MAD amount per loyalty point earned when not set at business level.", data_type: "number", is_sensitive: false, updated_at: "2025-01-15", updated_by: "super_admin" },
  { id: "sp-2", key: "platform.max_coupon_code_length", value: "12", description: "Length of auto-generated coupon codes.", data_type: "number", is_sensitive: false, updated_at: "2025-01-10", updated_by: "super_admin" },
  { id: "sp-3", key: "platform.tva_default_rate", value: "20", description: "Default TVA rate (%) applied to new products when category has no rate.", data_type: "number", is_sensitive: false, updated_at: "2025-01-01", updated_by: "system" },
  { id: "sp-4", key: "platform.sms_provider", value: "orange_ma", description: "Default SMS gateway provider for notification sends.", data_type: "string", is_sensitive: false, updated_at: "2025-01-05", updated_by: "super_admin" },
  { id: "sp-5", key: "platform.maintenance_mode", value: "false", description: "When true, only super admins can log in.", data_type: "boolean", is_sensitive: false, updated_at: "2025-01-20", updated_by: "super_admin" },
  { id: "sp-6", key: "platform.webhook_secret", value: "••••••••••••••••", description: "Shared secret for incoming webhook signature verification.", data_type: "string", is_sensitive: true, updated_at: "2025-01-01", updated_by: "system" },
  { id: "sp-7", key: "platform.max_businesses_per_chain", value: "50", description: "Maximum number of child businesses allowed per parent chain.", data_type: "number", is_sensitive: false, updated_at: "2025-01-01", updated_by: "system" },
  { id: "sp-8", key: "platform.session_timeout_minutes", value: "480", description: "JWT token validity in minutes (default 8 hours).", data_type: "number", is_sensitive: false, updated_at: "2025-01-12", updated_by: "super_admin" },
]

const TYPE_COLORS: Record<string, string> = {
  string: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  number: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  boolean: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  json: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

export default function SystemParametersPage() {
  const [params, setParams] = useState(mockParameters)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [savedId, setSavedId] = useState<string | null>(null)

  const startEdit = (param: SystemParameter) => {
    if (param.is_sensitive) return
    setEditingId(param.id)
    setEditValue(param.value)
  }

  const cancelEdit = () => { setEditingId(null); setEditValue("") }

  const saveEdit = (id: string) => {
    setParams(prev => prev.map(p => p.id === id ? { ...p, value: editValue, updated_at: "2025-01-21", updated_by: "super_admin" } : p))
    setEditingId(null)
    setSavedId(id)
    setTimeout(() => setSavedId(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          System parameters control platform-wide behavior. Changes take effect immediately. Sensitive values cannot be edited from this UI.
        </p>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>
              {["Parameter Key", "Type", "Value", "Description", "Last Updated", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {params.map(param => (
              <tr key={param.id} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors ${param.is_sensitive ? "opacity-70" : ""}`}>
                <td className="px-4 py-3">
                  <code className="text-xs font-mono text-indigo-700 dark:text-indigo-300">{param.key}</code>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[param.data_type]}`}>{param.data_type}</span>
                </td>
                <td className="px-4 py-3">
                  {editingId === param.id ? (
                    <input
                      className="px-2 py-1 text-sm border border-indigo-400 rounded-lg bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40 font-mono"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <code className={`text-sm font-mono ${param.is_sensitive ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"}`}>
                      {param.value}
                    </code>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs">
                  <p className="text-xs leading-relaxed">{param.description}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{param.updated_at}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600">{param.updated_by}</p>
                </td>
                <td className="px-4 py-3">
                  {param.is_sensitive ? (
                    <span className="text-xs text-gray-400 dark:text-gray-600">Protected</span>
                  ) : editingId === param.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(param.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition-colors">
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button onClick={cancelEdit}
                        className="flex items-center gap-1 px-2 py-1 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#1F1F23] text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                        <RotateCcw className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  ) : savedId === param.id ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" /> Saved
                    </span>
                  ) : (
                    <button onClick={() => startEdit(param)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
