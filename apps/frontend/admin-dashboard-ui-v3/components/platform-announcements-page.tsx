"use client"
import { useState } from "react"
import { Megaphone, Calendar, Building2, X } from "lucide-react"

interface PlatformAnnouncement {
  id: string
  title: string
  body: string
  target_business_types: string[]
  starts_at: string
  ends_at: string
  is_active: boolean
  priority: "low" | "medium" | "high"
  view_count: number
}

const mockAnnouncements: PlatformAnnouncement[] = [
  { id: "pa-1", title: "New TVA Compliance Update", body: "Important update regarding Finance Law 50-25 requirements. Please review the updated TVA declaration process effective from January 2025.", target_business_types: ["retail", "restaurant", "pharmacy", "salon", "hotel"], starts_at: "2025-01-01", ends_at: "2025-03-31", is_active: true, priority: "high", view_count: 1240 },
  { id: "pa-2", title: "System Maintenance Scheduled", body: "Planned maintenance on Sunday January 26, 2025 from 02:00-04:00 AM. The system will be unavailable during this window.", target_business_types: ["retail", "restaurant", "pharmacy"], starts_at: "2025-01-20", ends_at: "2025-01-27", is_active: true, priority: "medium", view_count: 892 },
  { id: "pa-3", title: "Loyalty Program Enhancement", body: "New features added to the loyalty program. Customers can now exchange points across chain locations.", target_business_types: ["retail"], starts_at: "2025-02-01", ends_at: "2025-04-30", is_active: false, priority: "low", view_count: 0 },
]

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

export default function PlatformAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(mockAnnouncements)
  const [selected, setSelected] = useState<PlatformAnnouncement | null>(null)

  const toggle = (id: string) =>
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">Platform-wide announcements visible to all business dashboards.</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Megaphone className="w-4 h-4" /> New Announcement
        </button>
      </div>

      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ann.priority === "high" ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Megaphone className={`w-4 h-4 ${ann.priority === "high" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{ann.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[ann.priority]}`}>{ann.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ann.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {ann.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{ann.body}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setSelected(ann)} className="text-xs px-2 py-1 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">View</button>
                <button onClick={() => toggle(ann.id)} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${ann.is_active ? "text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20" : "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"}`}>
                  {ann.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-600">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{ann.starts_at} → {ann.ends_at}</span>
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{ann.target_business_types.length === 5 ? "All types" : ann.target_business_types.join(", ")}</span>
              <span>{ann.view_count.toLocaleString()} views</span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selected.body}</p>
            <div className="text-xs text-gray-400 dark:text-gray-600 space-y-1">
              <p>Active: {selected.starts_at} → {selected.ends_at}</p>
              <p>Targets: {selected.target_business_types.join(", ")}</p>
              <p>Views: {selected.view_count.toLocaleString()}</p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
