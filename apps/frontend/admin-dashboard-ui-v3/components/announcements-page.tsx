"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  X,
  Megaphone,
  Calendar,
  Clock,
  Eye,
  Pencil,
  Trash2,
  Send,
  Users,
  Building2,
  Globe,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

// ==================== TYPES ====================
interface Announcement {
  id: string
  title: string
  content: string
  type: "info" | "warning" | "success" | "urgent"
  target_audience: "all" | "employees" | "managers" | "specific_locations"
  target_locations?: string[]
  status: "draft" | "scheduled" | "published" | "expired"
  publish_date: string
  expiry_date?: string
  created_by: string
  created_at: string
  views_count: number
}

// ==================== MOCK DATA ====================
const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "New Menu Items Available",
    content: "We are excited to announce new summer menu items. Please review the training materials before your next shift.",
    type: "info",
    target_audience: "all",
    status: "published",
    publish_date: "2024-01-15",
    expiry_date: "2024-02-15",
    created_by: "Admin",
    created_at: "2024-01-14",
    views_count: 45,
  },
  {
    id: "2",
    title: "System Maintenance Scheduled",
    content: "POS system will be under maintenance on Sunday from 2 AM to 6 AM. Please complete all transactions before this time.",
    type: "warning",
    target_audience: "all",
    status: "scheduled",
    publish_date: "2024-01-20",
    created_by: "IT Admin",
    created_at: "2024-01-16",
    views_count: 0,
  },
  {
    id: "3",
    title: "Employee of the Month",
    content: "Congratulations to Sara Idrissi for being selected as Employee of the Month! Thank you for your dedication.",
    type: "success",
    target_audience: "employees",
    status: "published",
    publish_date: "2024-01-10",
    created_by: "HR Manager",
    created_at: "2024-01-09",
    views_count: 38,
  },
  {
    id: "4",
    title: "Urgent: Health Inspection Tomorrow",
    content: "Health inspection scheduled for tomorrow at Downtown location. All staff must ensure stations are clean and organized.",
    type: "urgent",
    target_audience: "specific_locations",
    target_locations: ["Downtown"],
    status: "published",
    publish_date: "2024-01-17",
    created_by: "Operations Manager",
    created_at: "2024-01-17",
    views_count: 12,
  },
]

// ==================== REUSABLE COMPONENTS ====================
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" | "purple" | "amber" | "indigo" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", className = "", onClick, disabled }: { 
  children: React.ReactNode; 
  variant?: "primary" | "secondary" | "danger" | "ghost"; 
  className?: string; 
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base = "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
  }
  return <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function Input({ label, type = "text", placeholder, value, onChange, className = "" }: {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 focus:border-transparent bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
      />
    </div>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!isOpen) return null
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================
export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(mockAnnouncements)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info" as Announcement["type"],
    target_audience: "all" as Announcement["target_audience"],
    publish_date: "",
    expiry_date: "",
  })

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getTypeIcon = (type: Announcement["type"]) => {
    switch (type) {
      case "info": return <Megaphone className="w-4 h-4 text-blue-500" />
      case "warning": return <AlertCircle className="w-4 h-4 text-amber-500" />
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />
      case "urgent": return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getTypeBadgeColor = (type: Announcement["type"]): "blue" | "yellow" | "green" | "red" => {
    switch (type) {
      case "info": return "blue"
      case "warning": return "yellow"
      case "success": return "green"
      case "urgent": return "red"
    }
  }

  const getStatusBadgeColor = (status: Announcement["status"]): "green" | "yellow" | "blue" | "gray" => {
    switch (status) {
      case "published": return "green"
      case "scheduled": return "blue"
      case "draft": return "gray"
      case "expired": return "yellow"
    }
  }

  const getAudienceIcon = (audience: Announcement["target_audience"]) => {
    switch (audience) {
      case "all": return <Globe className="w-4 h-4" />
      case "employees": return <Users className="w-4 h-4" />
      case "managers": return <Users className="w-4 h-4" />
      case "specific_locations": return <Building2 className="w-4 h-4" />
    }
  }

  const handleCreate = () => {
    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      ...formData,
      status: formData.publish_date ? "scheduled" : "draft",
      created_by: "Current User",
      created_at: new Date().toISOString().split("T")[0],
      views_count: 0,
    }
    setAnnouncements([newAnnouncement, ...announcements])
    setShowCreateModal(false)
    setFormData({ title: "", content: "", type: "info", target_audience: "all", publish_date: "", expiry_date: "" })
  }

  const handlePublish = (id: string) => {
    setAnnouncements(announcements.map(a => 
      a.id === id ? { ...a, status: "published" as const, publish_date: new Date().toISOString().split("T")[0] } : a
    ))
  }

  const handleDelete = (id: string) => {
    setAnnouncements(announcements.filter(a => a.id !== id))
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Communicate with your team across all locations</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create Announcement
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{announcements.length}</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{announcements.filter(a => a.status === "published").length}</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{announcements.filter(a => a.status === "scheduled").length}</p>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Drafts</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{announcements.filter(a => a.status === "draft").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.map((announcement) => (
          <div key={announcement.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  announcement.type === "info" ? "bg-blue-100 dark:bg-blue-900/30" :
                  announcement.type === "warning" ? "bg-amber-100 dark:bg-amber-900/30" :
                  announcement.type === "success" ? "bg-green-100 dark:bg-green-900/30" :
                  "bg-red-100 dark:bg-red-900/30"
                }`}>
                  {getTypeIcon(announcement.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{announcement.title}</h3>
                    <Badge color={getTypeBadgeColor(announcement.type)}>{announcement.type}</Badge>
                    <Badge color={getStatusBadgeColor(announcement.status)}>{announcement.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{announcement.content}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      {getAudienceIcon(announcement.target_audience)}
                      {announcement.target_audience === "specific_locations" 
                        ? announcement.target_locations?.join(", ") 
                        : announcement.target_audience.replace("_", " ")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {announcement.publish_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {announcement.views_count} views
                    </span>
                    <span>By {announcement.created_by}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {announcement.status === "draft" && (
                  <Button variant="primary" className="!py-1.5 !px-3" onClick={() => handlePublish(announcement.id)}>
                    <Send className="w-3 h-3" />
                    Publish
                  </Button>
                )}
                <button
                  onClick={() => { setSelectedAnnouncement(announcement); setShowViewModal(true) }}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredAnnouncements.length === 0 && (
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#0F0F12] rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No announcements found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create your first announcement to communicate with your team.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Announcement" size="lg">
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Enter announcement title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your announcement..."
              rows={4}
              className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Announcement["type"] })}
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="info">Information</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
              <select
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as Announcement["target_audience"] })}
                className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              >
                <option value="all">All Staff</option>
                <option value="employees">Employees Only</option>
                <option value="managers">Managers Only</option>
                <option value="specific_locations">Specific Locations</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Publish Date"
              type="date"
              value={formData.publish_date}
              onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
            />
            <Input
              label="Expiry Date (Optional)"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[#1F1F23]">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="secondary" className="flex-1" onClick={handleCreate}>Save as Draft</Button>
            <Button variant="primary" className="flex-1" onClick={() => { handleCreate(); handlePublish(Date.now().toString()) }}>
              <Send className="w-4 h-4" />
              Publish Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Announcement Details" size="lg">
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getTypeIcon(selectedAnnouncement.type)}
              <Badge color={getTypeBadgeColor(selectedAnnouncement.type)}>{selectedAnnouncement.type}</Badge>
              <Badge color={getStatusBadgeColor(selectedAnnouncement.status)}>{selectedAnnouncement.status}</Badge>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedAnnouncement.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{selectedAnnouncement.content}</p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-[#1F1F23]">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Target Audience</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{selectedAnnouncement.target_audience.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Published</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedAnnouncement.publish_date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Created By</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedAnnouncement.created_by}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Views</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedAnnouncement.views_count}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}



