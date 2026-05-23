"use client"

import { useState } from "react"
import {
  Search,
  Plus,
  X,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  Check,
  AlertCircle,
  Eye,
  Clock,
  Users,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Trash2,
  Edit,
  Play,
  CheckCircle,
  XCircle,
} from "lucide-react"

// ==================== TYPES ====================
interface Channel {
  id: string
  type: "sms" | "email" | "whatsapp"
  name: string
  is_active: boolean
  credentials: {
    api_key?: string
    sender_id?: string
    from_email?: string
    phone_number?: string
  }
  balance?: number
  last_tested_at?: string
}

interface Template {
  id: string
  name: string
  channel: "sms" | "email" | "whatsapp"
  subject?: string
  body: string
  placeholders: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SendHistory {
  id: string
  template_name: string
  channel: "sms" | "email" | "whatsapp"
  recipient: string
  customer_name?: string
  status: "sent" | "delivered" | "failed" | "pending"
  sent_at: string
  cost?: number
  error_message?: string
}

// ==================== MOCK DATA ====================
const mockChannels: Channel[] = [
  {
    id: "1",
    type: "sms",
    name: "SMS Gateway",
    is_active: true,
    credentials: { api_key: "••••••••••••abcd", sender_id: "MYSTORE" },
    balance: 1250.50,
    last_tested_at: "2024-01-15 10:30",
  },
  {
    id: "2",
    type: "email",
    name: "Email Service",
    is_active: true,
    credentials: { api_key: "••••••••••••efgh", from_email: "noreply@mystore.ma" },
    last_tested_at: "2024-01-15 09:15",
  },
  {
    id: "3",
    type: "whatsapp",
    name: "WhatsApp Business",
    is_active: false,
    credentials: { phone_number: "+212 6XX XXX XXX" },
    last_tested_at: null,
  },
]

const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Order Confirmation",
    channel: "sms",
    body: "Merci {{customer_name}}! Votre commande #{{order_number}} de {{total}} MAD a été confirmée. Retrait prévu: {{pickup_time}}",
    placeholders: ["customer_name", "order_number", "total", "pickup_time"],
    is_active: true,
    created_at: "2024-01-01",
    updated_at: "2024-01-10",
  },
  {
    id: "2",
    name: "Welcome Email",
    channel: "email",
    subject: "Bienvenue chez {{business_name}}!",
    body: "Bonjour {{customer_name}},\n\nMerci de rejoindre notre programme de fidélité! Vous avez reçu {{welcome_points}} points de bienvenue.\n\nCordialement,\n{{business_name}}",
    placeholders: ["customer_name", "business_name", "welcome_points"],
    is_active: true,
    created_at: "2024-01-02",
    updated_at: "2024-01-12",
  },
  {
    id: "3",
    name: "Birthday Offer",
    channel: "sms",
    body: "Joyeux anniversaire {{customer_name}}! Profitez de {{discount}}% de réduction sur votre prochaine commande. Code: {{coupon_code}}",
    placeholders: ["customer_name", "discount", "coupon_code"],
    is_active: true,
    created_at: "2024-01-05",
    updated_at: "2024-01-05",
  },
  {
    id: "4",
    name: "Low Points Alert",
    channel: "email",
    subject: "Vos points expirent bientôt!",
    body: "Bonjour {{customer_name}},\n\n{{points_count}} de vos points fidélité expirent le {{expiry_date}}. Visitez-nous pour les utiliser!\n\nCordialement,\n{{business_name}}",
    placeholders: ["customer_name", "points_count", "expiry_date", "business_name"],
    is_active: false,
    created_at: "2024-01-08",
    updated_at: "2024-01-08",
  },
]

const mockHistory: SendHistory[] = [
  { id: "1", template_name: "Order Confirmation", channel: "sms", recipient: "+212 661 234 567", customer_name: "Ahmed Benali", status: "delivered", sent_at: "2024-01-15 14:32", cost: 0.25 },
  { id: "2", template_name: "Welcome Email", channel: "email", recipient: "fatima@example.com", customer_name: "Fatima Zahra", status: "sent", sent_at: "2024-01-15 14:15" },
  { id: "3", template_name: "Birthday Offer", channel: "sms", recipient: "+212 662 345 678", customer_name: "Karim Alaoui", status: "delivered", sent_at: "2024-01-15 13:45", cost: 0.25 },
  { id: "4", template_name: "Order Confirmation", channel: "sms", recipient: "+212 663 456 789", customer_name: "Sara Idrissi", status: "failed", sent_at: "2024-01-15 12:30", cost: 0, error_message: "Invalid phone number" },
  { id: "5", template_name: "Welcome Email", channel: "email", recipient: "youssef@example.com", customer_name: "Youssef Amrani", status: "delivered", sent_at: "2024-01-15 11:00" },
  { id: "6", template_name: "Order Confirmation", channel: "sms", recipient: "+212 664 567 890", customer_name: "Leila Benjelloun", status: "pending", sent_at: "2024-01-15 10:15", cost: 0.25 },
]

// ==================== REUSABLE COMPONENTS ====================
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" | "indigo" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", className = "", onClick, disabled }: { 
  children: React.ReactNode; 
  variant?: "primary" | "secondary" | "danger" | "ghost"; 
  className?: string; 
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base = "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
  }
  return <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
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
        className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
      />
    </div>
  )
}

function Select({ label, options, value, onChange, className = "" }: {
  label?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

function ChannelIcon({ type }: { type: "sms" | "email" | "whatsapp" }) {
  const icons = {
    sms: Smartphone,
    email: Mail,
    whatsapp: MessageSquare,
  }
  const Icon = icons[type]
  return <Icon className="w-5 h-5" />
}

// ==================== MAIN COMPONENT ====================
export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<"channels" | "templates" | "send" | "history">("channels")
  const [channels, setChannels] = useState(mockChannels)
  const [templates, setTemplates] = useState(mockTemplates)
  const [history] = useState(mockHistory)
  
  // Modal states
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  
  // Filter states
  const [historyFilter, setHistoryFilter] = useState({ channel: "all", status: "all", search: "" })
  const [templateSearch, setTemplateSearch] = useState("")
  
  // Send form state
  const [sendForm, setSendForm] = useState({
    type: "single" as "single" | "campaign",
    template_id: "",
    recipient: "",
    segment: "all",
  })

  const tabs = [
    { id: "channels" as const, label: "Channels", icon: Settings },
    { id: "templates" as const, label: "Templates", icon: Copy },
    { id: "send" as const, label: "Send", icon: Send },
    { id: "history" as const, label: "History", icon: Clock },
  ]

  const filteredHistory = history.filter(h => {
    const matchesChannel = historyFilter.channel === "all" || h.channel === historyFilter.channel
    const matchesStatus = historyFilter.status === "all" || h.status === historyFilter.status
    const matchesSearch = !historyFilter.search || 
      h.recipient.toLowerCase().includes(historyFilter.search.toLowerCase()) ||
      (h.customer_name && h.customer_name.toLowerCase().includes(historyFilter.search.toLowerCase()))
    return matchesChannel && matchesStatus && matchesSearch
  })

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.body.toLowerCase().includes(templateSearch.toLowerCase())
  )

  const handleTestChannel = (channel: Channel) => {
    // Mock test
    alert(`Testing ${channel.name}... Success!`)
  }

  const handleToggleChannel = (id: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c))
  }

  const handleToggleTemplate = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t))
  }

  const getStatusBadge = (status: SendHistory["status"]) => {
    switch (status) {
      case "sent": return <Badge color="blue"><Send className="w-3 h-3" /> Sent</Badge>
      case "delivered": return <Badge color="green"><CheckCircle className="w-3 h-3" /> Delivered</Badge>
      case "failed": return <Badge color="red"><XCircle className="w-3 h-3" /> Failed</Badge>
      case "pending": return <Badge color="yellow"><Clock className="w-3 h-3" /> Pending</Badge>
    }
  }

  const getChannelBadge = (channel: "sms" | "email" | "whatsapp") => {
    const colors: Record<string, "blue" | "green" | "indigo"> = {
      sms: "blue",
      email: "green",
      whatsapp: "indigo",
    }
    return <Badge color={colors[channel]}><ChannelIcon type={channel} /> {channel.toUpperCase()}</Badge>
  }

  // Calculate estimated recipients and cost for campaign
  const estimatedRecipients = sendForm.segment === "all" ? 1250 : sendForm.segment === "active" ? 890 : 360
  const estimatedCost = sendForm.template_id ? estimatedRecipients * 0.25 : 0

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage customer messaging channels and campaigns</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white dark:bg-[#0F0F12] p-1.5 rounded-xl border border-gray-200 dark:border-[#1F1F23] w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "channels" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channels.map(channel => (
              <div key={channel.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      channel.type === "sms" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                      channel.type === "email" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                      "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    }`}>
                      <ChannelIcon type={channel.type} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{channel.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{channel.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleChannel(channel.id)}
                    className={`w-12 h-6 rounded-full transition-colors ${channel.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-[#1F1F23]"}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${channel.is_active ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </div>
                
                {channel.type === "sms" && channel.balance !== undefined && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400">SMS Balance</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{channel.balance.toFixed(2)} MAD</p>
                  </div>
                )}
                
                <div className="space-y-2 text-sm">
                  {channel.credentials.sender_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Sender ID:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{channel.credentials.sender_id}</span>
                    </div>
                  )}
                  {channel.credentials.from_email && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">From:</span>
                      <span className="font-mono text-xs text-gray-900 dark:text-white">{channel.credentials.from_email}</span>
                    </div>
                  )}
                  {channel.credentials.phone_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{channel.credentials.phone_number}</span>
                    </div>
                  )}
                  {channel.credentials.api_key && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">API Key:</span>
                      <span className="font-mono text-xs text-gray-900 dark:text-white">{channel.credentials.api_key}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-[#1F1F23]">
                  <Button variant="secondary" className="flex-1" onClick={() => handleTestChannel(channel)}>
                    <Play className="w-4 h-4" />
                    Test
                  </Button>
                  <Button variant="ghost" onClick={() => { setSelectedChannel(channel); setShowChannelModal(true); }}>
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                
                {channel.last_tested_at && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
                    Last tested: {channel.last_tested_at}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="w-80 pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
            <Button variant="primary" onClick={() => { setSelectedTemplate(null); setShowTemplateModal(true); }}>
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </div>

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Template</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Channel</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Placeholders</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Updated</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTemplates.map(template => (
                  <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                        {template.subject && <p className="text-xs text-gray-500 dark:text-gray-400">Subject: {template.subject}</p>}
                      </div>
                    </td>
                    <td className="p-4">{getChannelBadge(template.channel)}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {template.placeholders.slice(0, 3).map(p => (
                          <span key={p} className="px-2 py-0.5 bg-gray-100 dark:bg-[#0F0F12] rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                            {`{{${p}}}`}
                          </span>
                        ))}
                        {template.placeholders.length > 3 && (
                          <span className="text-xs text-gray-400">+{template.placeholders.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge color={template.is_active ? "green" : "gray"}>
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{template.updated_at}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" onClick={() => { setSelectedTemplate(template); setShowTemplateModal(true); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" onClick={() => handleToggleTemplate(template.id)}>
                          {template.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "send" && (
        <div className="grid grid-cols-2 gap-6">
          {/* Single Send */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-500" />
              Single Message
            </h3>
            <div className="space-y-4">
              <Select
                label="Template"
                options={[
                  { value: "", label: "Select template..." },
                  ...templates.filter(t => t.is_active).map(t => ({ value: t.id, label: `${t.name} (${t.channel.toUpperCase()})` }))
                ]}
                value={sendForm.template_id}
                onChange={(e) => setSendForm(prev => ({ ...prev, template_id: e.target.value }))}
              />
              <Input
                label="Recipient"
                placeholder="Phone number or email..."
                value={sendForm.recipient}
                onChange={(e) => setSendForm(prev => ({ ...prev, recipient: e.target.value }))}
              />
              <Button variant="primary" className="w-full" disabled={!sendForm.template_id || !sendForm.recipient}>
                <Send className="w-4 h-4" />
                Send Message
              </Button>
            </div>
          </div>

          {/* Campaign Send */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Campaign
            </h3>
            <div className="space-y-4">
              <Select
                label="Template"
                options={[
                  { value: "", label: "Select template..." },
                  ...templates.filter(t => t.is_active).map(t => ({ value: t.id, label: `${t.name} (${t.channel.toUpperCase()})` }))
                ]}
                value={sendForm.template_id}
                onChange={(e) => setSendForm(prev => ({ ...prev, template_id: e.target.value }))}
              />
              <Select
                label="Customer Segment"
                options={[
                  { value: "all", label: "All Customers" },
                  { value: "active", label: "Active (Last 30 days)" },
                  { value: "inactive", label: "Inactive (90+ days)" },
                ]}
                value={sendForm.segment}
                onChange={(e) => setSendForm(prev => ({ ...prev, segment: e.target.value }))}
              />
              
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-[#1F1F23]">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-indigo-700 dark:text-indigo-300">Estimated Recipients:</span>
                  <span className="font-bold text-indigo-800 dark:text-indigo-200">{estimatedRecipients.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-indigo-700 dark:text-indigo-300">Estimated Cost (SMS):</span>
                  <span className="font-bold text-indigo-800 dark:text-indigo-200">{estimatedCost.toFixed(2)} MAD</span>
                </div>
              </div>
              
              <Button variant="primary" className="w-full" disabled={!sendForm.template_id}>
                <Send className="w-4 h-4" />
                Send Campaign
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by recipient or customer name..."
                  value={historyFilter.search}
                  onChange={(e) => setHistoryFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                />
              </div>
              <Select
                options={[
                  { value: "all", label: "All Channels" },
                  { value: "sms", label: "SMS" },
                  { value: "email", label: "Email" },
                  { value: "whatsapp", label: "WhatsApp" },
                ]}
                value={historyFilter.channel}
                onChange={(e) => setHistoryFilter(prev => ({ ...prev, channel: e.target.value }))}
                className="w-40"
              />
              <Select
                options={[
                  { value: "all", label: "All Status" },
                  { value: "sent", label: "Sent" },
                  { value: "delivered", label: "Delivered" },
                  { value: "failed", label: "Failed" },
                  { value: "pending", label: "Pending" },
                ]}
                value={historyFilter.status}
                onChange={(e) => setHistoryFilter(prev => ({ ...prev, status: e.target.value }))}
                className="w-40"
              />
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Template</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Channel</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Recipient</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Sent At</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No messages found</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters or send your first message</p>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                      <td className="p-4 font-medium text-gray-900 dark:text-white">{item.template_name}</td>
                      <td className="p-4">{getChannelBadge(item.channel)}</td>
                      <td className="p-4 font-mono text-xs text-gray-600 dark:text-gray-300">{item.recipient}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{item.customer_name || "-"}</td>
                      <td className="p-4">
                        {getStatusBadge(item.status)}
                        {item.error_message && (
                          <p className="text-xs text-red-500 mt-1">{item.error_message}</p>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{item.sent_at}</td>
                      <td className="p-4 text-right font-mono text-sm text-gray-600 dark:text-gray-300">
                        {item.cost !== undefined ? `${item.cost.toFixed(2)} MAD` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Channel Config Modal */}
      <Modal isOpen={showChannelModal} onClose={() => setShowChannelModal(false)} title={`Configure ${selectedChannel?.name || "Channel"}`} size="md">
        {selectedChannel && (
          <div className="space-y-4">
            <Input label="API Key" type="password" placeholder="Enter API key..." value={selectedChannel.credentials.api_key || ""} />
            {selectedChannel.type === "sms" && (
              <Input label="Sender ID" placeholder="MYSTORE" value={selectedChannel.credentials.sender_id || ""} />
            )}
            {selectedChannel.type === "email" && (
              <Input label="From Email" type="email" placeholder="noreply@example.com" value={selectedChannel.credentials.from_email || ""} />
            )}
            {selectedChannel.type === "whatsapp" && (
              <Input label="Phone Number" placeholder="+212 6XX XXX XXX" value={selectedChannel.credentials.phone_number || ""} />
            )}
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowChannelModal(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={() => setShowChannelModal(false)}>
                <Check className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Template Modal */}
      <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title={selectedTemplate ? "Edit Template" : "Create Template"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Template Name" placeholder="e.g. Order Confirmation" value={selectedTemplate?.name || ""} />
            <Select
              label="Channel"
              options={[
                { value: "sms", label: "SMS" },
                { value: "email", label: "Email" },
                { value: "whatsapp", label: "WhatsApp" },
              ]}
              value={selectedTemplate?.channel || "sms"}
            />
          </div>
          {(selectedTemplate?.channel === "email" || !selectedTemplate) && (
            <Input label="Subject" placeholder="Email subject with {{placeholders}}" value={selectedTemplate?.subject || ""} />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message Body</label>
            <textarea
              rows={5}
              placeholder="Enter your message. Use {{placeholder}} for dynamic content..."
              defaultValue={selectedTemplate?.body || ""}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
            />
          </div>
          <div className="p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available placeholders:</p>
            <div className="flex flex-wrap gap-2">
              {["customer_name", "order_number", "total", "business_name", "points", "coupon_code"].map(p => (
                <button key={p} className="px-2 py-1 bg-white dark:bg-[#1F1F23] border border-gray-200 dark:border-[#2a2a33] rounded text-xs font-mono text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                  {`{{${p}}}`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
            <Button variant="secondary">
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <Button variant="primary" onClick={() => setShowTemplateModal(false)}>
              <Check className="w-4 h-4" />
              {selectedTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}



