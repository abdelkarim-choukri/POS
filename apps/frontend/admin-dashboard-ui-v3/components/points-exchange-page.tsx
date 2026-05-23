"use client"

import { useState } from "react"
import {
  Search,
  Plus,
  X,
  Gift,
  Star,
  Coins,
  Trophy,
  Sparkles,
  ArrowRight,
  ArrowLeftRight,
  History,
  Users,
  TrendingUp,
  Settings,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
  Check,
  Zap,
} from "lucide-react"

// Types
interface Reward {
  id: string
  name: string
  description: string
  points_required: number
  category: "food" | "beverage" | "discount" | "merchandise" | "experience"
  status: "active" | "inactive"
  stock?: number
  redemptions: number
  image?: string
}

interface PointsTransaction {
  id: string
  customer_name: string
  customer_id: string
  type: "earned" | "redeemed" | "expired" | "adjusted"
  points: number
  description: string
  created_at: string
  reward_name?: string
}

interface LoyaltyTier {
  id: string
  name: string
  min_points: number
  multiplier: number
  color: string
  perks: string[]
}

// Mock Data
const mockRewards: Reward[] = [
  { id: "1", name: "Free Coffee", description: "Any size hot or iced coffee", points_required: 100, category: "beverage", status: "active", stock: 999, redemptions: 234 },
  { id: "2", name: "Free Pastry", description: "Choice of any pastry item", points_required: 150, category: "food", status: "active", stock: 50, redemptions: 128 },
  { id: "3", name: "15% Off Order", description: "Discount on entire order", points_required: 200, category: "discount", status: "active", redemptions: 89 },
  { id: "4", name: "Free Lunch Combo", description: "Sandwich, drink, and side", points_required: 500, category: "food", status: "active", stock: 20, redemptions: 45 },
  { id: "5", name: "Birthday Cake Slice", description: "Complimentary birthday treat", points_required: 0, category: "food", status: "active", redemptions: 67 },
  { id: "6", name: "Branded Mug", description: "Exclusive ceramic mug", points_required: 800, category: "merchandise", status: "active", stock: 15, redemptions: 23 },
  { id: "7", name: "VIP Tasting Event", description: "Exclusive menu preview", points_required: 2000, category: "experience", status: "inactive", redemptions: 5 },
]

const mockTransactions: PointsTransaction[] = [
  { id: "1", customer_name: "Ahmed Benali", customer_id: "C001", type: "earned", points: 50, description: "Purchase at Main Location", created_at: "2024-01-20 14:30" },
  { id: "2", customer_name: "Fatima Alami", customer_id: "C002", type: "redeemed", points: -100, description: "Reward redemption", created_at: "2024-01-20 13:15", reward_name: "Free Coffee" },
  { id: "3", customer_name: "Karim Idrissi", customer_id: "C003", type: "earned", points: 125, description: "Purchase at Downtown Branch", created_at: "2024-01-20 12:00" },
  { id: "4", customer_name: "Sara Tazi", customer_id: "C004", type: "adjusted", points: 200, description: "Goodwill adjustment", created_at: "2024-01-20 10:30" },
  { id: "5", customer_name: "Omar Benjelloun", customer_id: "C005", type: "expired", points: -50, description: "Points expiration", created_at: "2024-01-19 23:59" },
]

const mockTiers: LoyaltyTier[] = [
  { id: "1", name: "Bronze", min_points: 0, multiplier: 1.0, color: "amber", perks: ["Earn 1 point per MAD spent", "Birthday reward"] },
  { id: "2", name: "Silver", min_points: 500, multiplier: 1.25, color: "gray", perks: ["Earn 1.25 points per MAD", "Priority seating", "Double points Tuesdays"] },
  { id: "3", name: "Gold", min_points: 1500, multiplier: 1.5, color: "yellow", perks: ["Earn 1.5 points per MAD", "Free monthly reward", "Exclusive events"] },
  { id: "4", name: "Platinum", min_points: 5000, multiplier: 2.0, color: "purple", perks: ["Earn 2 points per MAD", "Personal concierge", "VIP lounge access"] },
]

// Components
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "blue" | "yellow" | "gray" | "purple" | "indigo" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", className = "", onClick, disabled }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string; onClick?: () => void; disabled?: boolean }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
  }
  return <button className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!isOpen) return null
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, subValue, color }: { icon: React.ElementType; label: string; value: string; subValue?: string; color: string }) {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      {subValue && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{subValue}</p>}
    </div>
  )
}

export default function PointsExchangePage() {
  const [activeTab, setActiveTab] = useState<"rewards" | "transactions" | "tiers" | "settings">("rewards")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddRewardModal, setShowAddRewardModal] = useState(false)
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  const categoryColors = {
    food: "indigo",
    beverage: "blue",
    discount: "green",
    merchandise: "purple",
    experience: "yellow",
  }

  const filteredRewards = mockRewards.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Points Exchange</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage loyalty rewards and point redemptions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowRedeemModal(true)}>
            <ArrowLeftRight className="w-4 h-4" />
            Quick Redeem
          </Button>
          <Button variant="primary" onClick={() => setShowAddRewardModal(true)}>
            <Plus className="w-4 h-4" />
            Add Reward
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Coins}
          label="Total Points Issued"
          value="125,430"
          subValue="+12.5% this month"
          color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          icon={Gift}
          label="Rewards Redeemed"
          value="591"
          subValue="This month"
          color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={Users}
          label="Active Members"
          value="2,847"
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Redemption Rate"
          value="68%"
          subValue="+5% vs last month"
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-[#0F0F12] p-1 rounded-lg w-fit">
        {[
          { key: "rewards", label: "Rewards Catalog", icon: Gift },
          { key: "transactions", label: "Transactions", icon: History },
          { key: "tiers", label: "Loyalty Tiers", icon: Trophy },
          { key: "settings", label: "Settings", icon: Settings },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rewards Tab */}
      {activeTab === "rewards" && (
        <div>
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rewards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                />
              </div>
              <select className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                <option value="all">All Categories</option>
                <option value="food">Food</option>
                <option value="beverage">Beverage</option>
                <option value="discount">Discount</option>
                <option value="merchandise">Merchandise</option>
                <option value="experience">Experience</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {filteredRewards.map(reward => (
              <div key={reward.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-32 bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center relative">
                  <Gift className="w-12 h-12 text-white/80" />
                  {reward.status === "inactive" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge color="gray">Inactive</Badge>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(showDropdown === reward.id ? null : reward.id)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg"
                      >
                        <MoreHorizontal className="w-4 h-4 text-white" />
                      </button>
                      {showDropdown === reward.id && (
                        <>
                          <div className="fixed inset-0" onClick={() => setShowDropdown(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]">
                              <Pencil className="w-4 h-4" /> Edit
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{reward.name}</h3>
                    <Badge color={categoryColors[reward.category] as "indigo" | "blue" | "green" | "purple" | "yellow"}>
                      {reward.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{reward.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-bold">{reward.points_required === 0 ? "Free" : reward.points_required.toLocaleString()}</span>
                      {reward.points_required > 0 && <span className="text-xs">pts</span>}
                    </div>
                    {reward.stock !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{reward.stock} in stock</span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#1F1F23]">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{reward.redemptions} redemptions</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Points</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {mockTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                  <td className="p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{tx.customer_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{tx.customer_id}</p>
                  </td>
                  <td className="p-4">
                    <Badge color={
                      tx.type === "earned" ? "green" :
                      tx.type === "redeemed" ? "blue" :
                      tx.type === "expired" ? "red" : "yellow"
                    }>
                      {tx.type}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{tx.description}</p>
                    {tx.reward_name && <p className="text-xs text-indigo-600 dark:text-indigo-400">{tx.reward_name}</p>}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`font-mono font-bold ${tx.points >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {tx.points >= 0 ? "+" : ""}{tx.points}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{tx.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tiers Tab */}
      {activeTab === "tiers" && (
        <div className="grid grid-cols-4 gap-4">
          {mockTiers.map((tier, index) => {
            const tierColors = {
              amber: "from-amber-600 to-amber-800",
              gray: "from-gray-400 to-gray-600",
              yellow: "from-yellow-400 to-yellow-600",
              purple: "from-purple-500 to-purple-700",
            }
            return (
              <div key={tier.id} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
                <div className={`h-24 bg-gradient-to-br ${tierColors[tier.color as keyof typeof tierColors]} flex items-center justify-center relative`}>
                  <Trophy className="w-10 h-10 text-white/80" />
                  <div className="absolute top-2 right-2 bg-white/20 px-2 py-1 rounded text-xs text-white font-bold">
                    {tier.multiplier}x
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{tier.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {tier.min_points === 0 ? "Starting tier" : `${tier.min_points.toLocaleString()}+ points`}
                  </p>
                  <div className="space-y-2">
                    {tier.perks.map((perk, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-300">{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Points Configuration</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Points per MAD spent</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Base earning rate for all customers</p>
              </div>
              <input
                type="number"
                defaultValue={1}
                className="w-20 border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white text-center"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Points expiration</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Days until unused points expire</p>
              </div>
              <input
                type="number"
                defaultValue={365}
                className="w-20 border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white text-center"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Welcome bonus</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Points awarded on signup</p>
              </div>
              <input
                type="number"
                defaultValue={50}
                className="w-20 border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white text-center"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Double points days</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enable promotional multipliers</p>
              </div>
              <button className="w-12 h-6 bg-indigo-600 rounded-full">
                <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-6" />
              </button>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#1F1F23]">
            <Button variant="primary">Save Changes</Button>
          </div>
        </div>
      )}

      {/* Add Reward Modal */}
      <Modal isOpen={showAddRewardModal} onClose={() => setShowAddRewardModal(false)} title="Add New Reward" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reward Name</label>
            <input className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="e.g., Free Coffee" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white h-20" placeholder="What does this reward include?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points Required</label>
              <input type="number" className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                <option value="food">Food</option>
                <option value="beverage">Beverage</option>
                <option value="discount">Discount</option>
                <option value="merchandise">Merchandise</option>
                <option value="experience">Experience</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock (optional)</label>
            <input type="number" className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="Leave empty for unlimited" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddRewardModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1">Add Reward</Button>
          </div>
        </div>
      </Modal>

      {/* Quick Redeem Modal */}
      <Modal isOpen={showRedeemModal} onClose={() => setShowRedeemModal(false)} title="Quick Points Redemption">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Phone or ID</label>
            <input className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="Search customer..." />
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Available Balance</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">0 points</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter customer info to see balance</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Reward</label>
            <select className="w-full border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
              <option value="">Choose a reward...</option>
              {mockRewards.filter(r => r.status === "active").map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.points_required} pts)</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowRedeemModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1"><Gift className="w-4 h-4" /> Redeem</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}



