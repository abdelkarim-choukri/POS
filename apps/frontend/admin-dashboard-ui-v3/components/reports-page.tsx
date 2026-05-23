"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Smartphone,
  Users,
  UserPlus,
  UserCheck,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  RefreshCw,
  Package,
  X,
  RotateCcw,
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

// ==================== UTILITIES ====================
function formatMAD(amount: number): string {
  return amount.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD"
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("fr-MA", { 
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

// ==================== REUSABLE COMPONENTS ====================
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" | "purple" | "amber" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
  const base = "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
        className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 focus:border-transparent bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
      >
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

function SlidePanel({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#0F0F12] h-full shadow-xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">{children}</div>
      </div>
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

function KPICard({ title, value, subtitle, trend, icon: Icon }: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  trend?: { value: number; isPositive: boolean };
  icon?: React.ElementType;
}) {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          {Icon && (
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.value}%
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-[#1F1F23] rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 dark:bg-[#1F1F23] rounded w-32" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-[#1F1F23] rounded w-40 mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-[#0F0F12] rounded" />
      </div>
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-100 dark:border-[#1F1F23] last:border-0">
            <div className="h-4 bg-gray-200 dark:bg-[#1F1F23] rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-[#0F0F12] rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-red-200 dark:border-red-900/30 p-12 text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Data</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      <Button variant="primary" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}

// ==================== DATE RANGE PICKER ====================
function DateRangePicker({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  onPresetSelect 
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onPresetSelect: (preset: string) => void;
}) {
  const presets = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "this_week", label: "This Week" },
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetSelect(preset.id)}
            className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-600"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-36"
          />
        </div>
        <span className="text-gray-400 text-sm">to</span>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-36"
          />
        </div>
      </div>
    </div>
  )
}

// ==================== MOCK DATA ====================
const salesDailyData = [
  { date: "2024-01-09", revenue: 6240, transactions: 45, avg: 138.67 },
  { date: "2024-01-10", revenue: 7850, transactions: 52, avg: 150.96 },
  { date: "2024-01-11", revenue: 5420, transactions: 38, avg: 142.63 },
  { date: "2024-01-12", revenue: 8920, transactions: 61, avg: 146.23 },
  { date: "2024-01-13", revenue: 9450, transactions: 68, avg: 138.97 },
  { date: "2024-01-14", revenue: 5890, transactions: 42, avg: 140.24 },
  { date: "2024-01-15", revenue: 4550, transactions: 33, avg: 137.88 },
]

const hourlyRevenueData = [
  { hour: "8h", revenue: 1200 },
  { hour: "9h", revenue: 2800 },
  { hour: "10h", revenue: 4200 },
  { hour: "11h", revenue: 3800 },
  { hour: "12h", revenue: 6500 },
  { hour: "13h", revenue: 7200 },
  { hour: "14h", revenue: 4100 },
  { hour: "15h", revenue: 3200 },
  { hour: "16h", revenue: 2800 },
  { hour: "17h", revenue: 3500 },
  { hour: "18h", revenue: 5200 },
  { hour: "19h", revenue: 6800 },
  { hour: "20h", revenue: 4500 },
  { hour: "21h", revenue: 2100 },
]

const paymentMethodsData = [
  { name: "Cash", value: 45, count: 142, amount: 21744, color: "#22c55e" },
  { name: "Card CMI", value: 35, count: 108, amount: 16912, color: "#3b82f6" },
  { name: "Card PayZone", value: 12, count: 38, amount: 5798, color: "#8b5cf6" },
  { name: "Mobile", value: 8, count: 24, amount: 3866, color: "#f59e0b" },
]

const voidsRefundsData = [
  { id: 1, date: "2024-01-15", txn: "TXN-001289", original: 245.00, amount: 245.00, type: "void", reason: "Customer changed mind", cashier: "Sara Idrissi" },
  { id: 2, date: "2024-01-14", txn: "TXN-001245", original: 89.50, amount: 89.50, type: "refund", reason: "Wrong order", cashier: "Ahmed Bennani" },
  { id: 3, date: "2024-01-13", txn: "TXN-001198", original: 156.00, amount: 78.00, type: "refund", reason: "Partial refund - item returned", cashier: "Sara Idrissi" },
  { id: 4, date: "2024-01-12", txn: "TXN-001156", original: 320.00, amount: 320.00, type: "void", reason: "Duplicate transaction", cashier: "Karim Alaoui" },
]

const tvaData = [
  { rate: "20%", baseHT: 32450.00, tva: 6490.00, ttc: 38940.00, count: 186 },
  { rate: "14%", baseHT: 8920.00, tva: 1248.80, ttc: 10168.80, count: 52 },
  { rate: "10%", baseHT: 4280.00, tva: 428.00, ttc: 4708.00, count: 38 },
  { rate: "7%", baseHT: 2150.00, tva: 150.50, ttc: 2300.50, count: 24 },
  { rate: "0% (Exonéré)", baseHT: 520.00, tva: 0, ttc: 520.00, count: 12 },
]

const customersData = [
  { id: 1, name: "Fatima Zahra Benali", phone: "+212 661 234 567", grade: "Gold", totalSpent: 12450, visits: 45, lastVisit: "2024-01-15", points: 2450 },
  { id: 2, name: "Mohammed Alami", phone: "+212 662 345 678", grade: "Silver", totalSpent: 5680, visits: 23, lastVisit: "2024-01-14", points: 1136 },
  { id: 3, name: "Khadija Ouazzani", phone: "+212 663 456 789", grade: "Platinum", totalSpent: 28900, visits: 89, lastVisit: "2024-01-15", points: 5780 },
  { id: 4, name: "Youssef Benjelloun", phone: "+212 664 567 890", grade: "Bronze", totalSpent: 1240, visits: 8, lastVisit: "2024-01-10", points: 248 },
  { id: 5, name: "Amina Tazi", phone: "+212 665 678 901", grade: "Gold", totalSpent: 9870, visits: 34, lastVisit: "2024-01-13", points: 1974 },
]

const gradeDistribution = [
  { grade: "Bronze", count: 142, color: "#cd7f32" },
  { grade: "Silver", count: 89, color: "#c0c0c0" },
  { grade: "Gold", count: 45, color: "#ffd700" },
  { grade: "Platinum", count: 12, color: "#e5e4e2" },
]

const employeePerformance = [
  { id: 1, name: "Sara Idrissi", role: "Cashier", transactions: 156, revenue: 23450, avg: 150.32, hours: 42, clockCount: 12 },
  { id: 2, name: "Ahmed Bennani", role: "Manager", transactions: 89, revenue: 15680, avg: 176.18, hours: 45, clockCount: 12 },
  { id: 3, name: "Karim Alaoui", role: "Cashier", transactions: 134, revenue: 18920, avg: 141.19, hours: 38, clockCount: 10 },
  { id: 4, name: "Nadia Chraibi", role: "Cashier", transactions: 98, revenue: 12450, avg: 127.04, hours: 35, clockCount: 9 },
]

const clockHistory = [
  { id: 1, date: "2024-01-15", employee: "Sara Idrissi", clockIn: "08:55", clockOut: "17:12", hours: 8.28 },
  { id: 2, date: "2024-01-15", employee: "Ahmed Bennani", clockIn: "08:30", clockOut: "18:45", hours: 10.25 },
  { id: 3, date: "2024-01-15", employee: "Karim Alaoui", clockIn: "12:00", clockOut: "20:15", hours: 8.25 },
  { id: 4, date: "2024-01-14", employee: "Sara Idrissi", clockIn: "08:48", clockOut: "17:05", hours: 8.28 },
  { id: 5, date: "2024-01-14", employee: "Nadia Chraibi", clockIn: "09:00", clockOut: "17:30", hours: 8.50 },
]

// Operations - Kitchen Performance (restaurant/hotel only)
const kitchenPerformance = [
  { id: 1, item: "Grilled Salmon", avg_prep_time: 12, orders_count: 45, on_time_rate: 94 },
  { id: 2, item: "Pasta Carbonara", avg_prep_time: 8, orders_count: 78, on_time_rate: 98 },
  { id: 3, item: "Caesar Salad", avg_prep_time: 5, orders_count: 92, on_time_rate: 99 },
  { id: 4, item: "Beef Tagine", avg_prep_time: 25, orders_count: 34, on_time_rate: 85 },
  { id: 5, item: "Moroccan Couscous", avg_prep_time: 20, orders_count: 56, on_time_rate: 88 },
]

// Operations - Table Turnover (restaurant/hotel only)
const tableTurnover = [
  { id: 1, table_number: "T-01", area_name: "Terrace", sessions_count: 24, avg_duration: 45, revenue_per_cover: 125, avg_covers: 2.5 },
  { id: 2, table_number: "T-02", area_name: "Terrace", sessions_count: 22, avg_duration: 52, revenue_per_cover: 142, avg_covers: 3.2 },
  { id: 3, table_number: "I-01", area_name: "Interior", sessions_count: 28, avg_duration: 38, revenue_per_cover: 98, avg_covers: 2.0 },
  { id: 4, table_number: "I-02", area_name: "Interior", sessions_count: 30, avg_duration: 42, revenue_per_cover: 115, avg_covers: 2.8 },
  { id: 5, table_number: "VIP-01", area_name: "VIP Room", sessions_count: 8, avg_duration: 95, revenue_per_cover: 285, avg_covers: 6.0 },
]

// Operations - Voids & Cancellations
const voidsData = [
  { id: 1, date: "2024-01-15", transaction_id: "TXN-001309", voided_by: "Ahmed Bennani", reason: "Customer changed order", amount: 45, item_count: 1 },
  { id: 2, date: "2024-01-15", transaction_id: "TXN-001285", voided_by: "Sara Idrissi", reason: "Item out of stock", amount: 78, item_count: 2 },
  { id: 3, date: "2024-01-14", transaction_id: "TXN-001245", voided_by: "Karim Alaoui", reason: "Wrong item entered", amount: 32, item_count: 1 },
  { id: 4, date: "2024-01-14", transaction_id: "TXN-001198", voided_by: "Ahmed Bennani", reason: "Customer complaint", amount: 125, item_count: 3 },
]

// Marketing - Promotion Report
const promotionReport = [
  { id: 1, name: "Summer Sale 20%", type: "percentage", redemptions_count: 142, total_discount_given: 4260, avg_discount_per_use: 30, revenue_influenced: 28500 },
  { id: 2, name: "Weekend Brunch", type: "fixed", redemptions_count: 89, total_discount_given: 1335, avg_discount_per_use: 15, revenue_influenced: 12800 },
  { id: 3, name: "Buy 2 Get 1 Free", type: "buy_x_get_y", redemptions_count: 56, total_discount_given: 2800, avg_discount_per_use: 50, revenue_influenced: 9500 },
  { id: 4, name: "Loyalty Reward", type: "fixed", redemptions_count: 67, total_discount_given: 1675, avg_discount_per_use: 25, revenue_influenced: 7800 },
]

// Marketing - Coupon Report
const couponReport = [
  { id: 1, coupon_type: "Welcome 10%", issued: 500, redeemed: 234, expired: 156, voided: 12, discount_given: 3510, redemption_rate: 46.8 },
  { id: 2, coupon_type: "Birthday 25 MAD", issued: 120, redeemed: 89, expired: 28, voided: 3, discount_given: 2225, redemption_rate: 74.2 },
  { id: 3, coupon_type: "Referral 15%", issued: 85, redeemed: 52, expired: 18, voided: 5, discount_given: 1560, redemption_rate: 61.2 },
]

// Marketing - Discount Write-offs
const discountWriteoffs = [
  { id: 1, terminal_name: "POS-01", location: "Casa Marina", discount_count: 156, total_discount: 4680 },
  { id: 2, terminal_name: "POS-02", location: "Casa Marina", discount_count: 98, total_discount: 2940 },
  { id: 3, terminal_name: "POS-03", location: "Casa Maarif", discount_count: 124, total_discount: 3720 },
  { id: 4, terminal_name: "POS-04", location: "Rabat Agdal", discount_count: 87, total_discount: 2610 },
]

// Marketing - Points Exchange Report
const pointsExchangeReport = [
  { id: 1, rule_name: "Free Coffee", redemptions_count: 234, points_exchanged: 117000, value_given: 5850 },
  { id: 2, rule_name: "10% Discount", redemptions_count: 156, points_exchanged: 156000, value_given: 7800 },
  { id: 3, rule_name: "Free Pastry", redemptions_count: 189, points_exchanged: 56700, value_given: 3402 },
  { id: 4, rule_name: "25% Discount", redemptions_count: 45, points_exchanged: 112500, value_given: 5625 },
]

// Inventory - Stock Position
const stockPosition = [
  { id: 1, product: "Coffee Beans (Arabica)", category: "Beverages", warehouse: "Main Store", qty_on_hand: 45, unit_cost: 180, total_value: 8100, is_low_stock: false, minimum: 20 },
  { id: 2, product: "Milk (Full Fat)", category: "Dairy", warehouse: "Main Store", qty_on_hand: 12, unit_cost: 15, total_value: 180, is_low_stock: true, minimum: 20 },
  { id: 3, product: "Croissants", category: "Bakery", warehouse: "Main Store", qty_on_hand: 35, unit_cost: 8, total_value: 280, is_low_stock: false, minimum: 15 },
  { id: 4, product: "Sugar (1kg)", category: "Ingredients", warehouse: "Main Store", qty_on_hand: 8, unit_cost: 12, total_value: 96, is_low_stock: true, minimum: 10 },
  { id: 5, product: "Orange Juice (1L)", category: "Beverages", warehouse: "Cold Storage", qty_on_hand: 28, unit_cost: 22, total_value: 616, is_low_stock: false, minimum: 15 },
]

// Inventory - Stock Movements
const stockMovements = [
  { id: 1, date: "2024-01-15", product: "Coffee Beans", warehouse: "Main Store", movement_type: "receive", qty_delta: 50, unit_cost: 180, reference: "PO-2024008" },
  { id: 2, date: "2024-01-15", product: "Milk", warehouse: "Main Store", movement_type: "consume", qty_delta: -8, unit_cost: 15, reference: "TXN-001312" },
  { id: 3, date: "2024-01-14", product: "Croissants", warehouse: "Main Store", movement_type: "dispose", qty_delta: -5, unit_cost: 8, reference: "WASTE-001" },
  { id: 4, date: "2024-01-14", product: "Sugar", warehouse: "Main Store", movement_type: "adjust", qty_delta: -2, unit_cost: 12, reference: "ADJ-001" },
  { id: 5, date: "2024-01-13", product: "Orange Juice", warehouse: "Cold Storage", movement_type: "transfer_in", qty_delta: 20, unit_cost: 22, reference: "TRF-001" },
]

// Inventory - Vendor Purchases
const vendorPurchases = [
  { id: 1, vendor: "Fresh Farms Produce", po_count: 12, total_ht: 18500, total_tva: 3700, total_ttc: 22200, last_order_date: "2024-01-15" },
  { id: 2, vendor: "Ocean Seafood Co.", po_count: 8, total_ht: 12400, total_tva: 2480, total_ttc: 14880, last_order_date: "2024-01-12" },
  { id: 3, vendor: "Bakery Supplies Ltd", po_count: 15, total_ht: 8200, total_tva: 1640, total_ttc: 9840, last_order_date: "2024-01-14" },
]

// Inventory - Input TVA
const inputTVA = [
  { id: 1, tva_rate: "20%", base_ht: 28500, tva_amount: 5700, ttc: 34200, invoice_count: 24 },
  { id: 2, tva_rate: "14%", base_ht: 8200, tva_amount: 1148, ttc: 9348, invoice_count: 8 },
  { id: 3, tva_rate: "10%", base_ht: 4500, tva_amount: 450, ttc: 4950, invoice_count: 5 },
  { id: 4, tva_rate: "7%", base_ht: 2100, tva_amount: 147, ttc: 2247, invoice_count: 3 },
]

// Inventory - COGS
const cogsReport = [
  { id: 1, product: "Cappuccino", units_sold: 892, cogs: 4460, revenue: 22300, gross_profit: 17840, margin: 80.0 },
  { id: 2, product: "Croissant", units_sold: 654, cogs: 5232, revenue: 11772, gross_profit: 6540, margin: 55.5 },
  { id: 3, product: "Latte", units_sold: 567, cogs: 2835, revenue: 15309, gross_profit: 12474, margin: 81.5 },
  { id: 4, product: "Sandwich", units_sold: 423, cogs: 8460, revenue: 16920, gross_profit: 8460, margin: 50.0 },
]

// Inventory - Vendor Balance
const vendorBalance = [
  { id: 1, vendor: "Fresh Farms Produce", total_po_value: 45000, total_paid: 25000, balance_due: 20000, oldest_unpaid_date: "2024-01-10" },
  { id: 2, vendor: "Ocean Seafood Co.", total_po_value: 28000, total_paid: 15000, balance_due: 13000, oldest_unpaid_date: "2024-01-08" },
]

// Inventory - Bill Aging
const billAging = [
  { id: 1, vendor: "Fresh Farms Produce", po_number: "PO-2024008", invoice_date: "2024-01-10", due_date: "2024-02-09", amount_due: 12000, days_overdue: 0, aging_bucket: "Current" },
  { id: 2, vendor: "Fresh Farms Produce", po_number: "PO-2024003", invoice_date: "2023-12-15", due_date: "2024-01-14", amount_due: 8000, days_overdue: 6, aging_bucket: "1-30d" },
  { id: 3, vendor: "Ocean Seafood Co.", po_number: "PO-2024010", invoice_date: "2023-11-20", due_date: "2023-12-20", amount_due: 13000, days_overdue: 31, aging_bucket: "31-60d" },
]

const transactionsData = [
  { id: 1, number: "TXN-001312", date: "2024-01-15T14:32:00", cashier: "Sara Idrissi", items: 4, payment: "Card CMI", total: 245.00, status: "completed", customerId: 1 },
  { id: 2, number: "TXN-001311", date: "2024-01-15T14:18:00", cashier: "Sara Idrissi", items: 2, payment: "Cash", total: 89.50, status: "completed", customerId: null },
  { id: 3, number: "TXN-001310", date: "2024-01-15T13:45:00", cashier: "Ahmed Bennani", items: 6, payment: "Mobile", total: 312.00, status: "completed", customerId: 3 },
  { id: 4, number: "TXN-001309", date: "2024-01-15T13:22:00", cashier: "Karim Alaoui", items: 1, payment: "Cash", total: 45.00, status: "voided", customerId: null },
  { id: 5, number: "TXN-001308", date: "2024-01-15T12:58:00", cashier: "Sara Idrissi", items: 3, payment: "Card PayZone", total: 178.50, status: "refunded", customerId: 2 },
  { id: 6, number: "TXN-001307", date: "2024-01-15T12:34:00", cashier: "Ahmed Bennani", items: 5, payment: "Cash", total: 267.00, status: "completed", customerId: 5 },
  { id: 7, number: "TXN-001306", date: "2024-01-15T11:52:00", cashier: "Nadia Chraibi", items: 2, payment: "Card CMI", total: 124.00, status: "completed", customerId: null },
  { id: 8, number: "TXN-001305", date: "2024-01-15T11:28:00", cashier: "Sara Idrissi", items: 4, payment: "Cash", total: 198.00, status: "completed", customerId: 1 },
]

const transactionDetail = {
  number: "TXN-001312",
  date: "2024-01-15T14:32:00",
  cashier: "Sara Idrissi",
  customer: "Fatima Zahra Benali",
  items: [
    { name: "Cappuccino", qty: 2, price: 25.00, total: 50.00 },
    { name: "Croissant", qty: 3, price: 18.00, total: 54.00 },
    { name: "Orange Juice", qty: 2, price: 35.00, total: 70.00 },
    { name: "Cheesecake", qty: 1, price: 45.00, total: 45.00 },
  ],
  subtotal: 219.00,
  tvaBreakdown: [
    { rate: "20%", base: 175.20, tva: 35.04 },
    { rate: "10%", base: 8.76, tva: 0.88 },
  ],
  totalTVA: 35.92,
  total: 254.92,
  payment: "Card CMI",
  status: "completed",
}

const mockLocations = [
  { value: "all", label: "All Locations" },
  { value: "loc1", label: "Casa Marina" },
  { value: "loc2", label: "Casa Maarif" },
  { value: "loc3", label: "Rabat Agdal" },
]

// ==================== TAB COMPONENTS ====================

// TAB 1: SALES
function SalesTab({ isLoading }: { isLoading: boolean }) {
  if (isLoading) return <LoadingSkeleton />
  
  const totalRevenue = salesDailyData.reduce((sum, d) => sum + d.revenue, 0)
  const totalTransactions = salesDailyData.reduce((sum, d) => sum + d.transactions, 0)
  const avgOrderValue = totalRevenue / totalTransactions

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KPICard 
          title="Total Revenue" 
          value={formatMAD(totalRevenue)} 
          trend={{ value: 12.5, isPositive: true }}
          icon={TrendingUp}
        />
        <KPICard 
          title="Transaction Count" 
          value={totalTransactions.toString()} 
          trend={{ value: 8.2, isPositive: true }}
        />
        <KPICard 
          title="Average Order Value" 
          value={formatMAD(avgOrderValue)} 
          trend={{ value: 3.8, isPositive: true }}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesDailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => formatDate(v)} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} 
                formatter={(value: number) => [formatMAD(value), "Revenue"]}
                labelFormatter={(label) => formatDate(label)}
              />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} dot={{ fill: "#22c55e", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Hour of Day</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} 
                formatter={(value: number) => [formatMAD(value), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium text-right">Transactions</th>
              <th className="pb-3 font-medium text-right">Revenue</th>
              <th className="pb-3 font-medium text-right">Avg Order</th>
            </tr>
          </thead>
          <tbody>
            {salesDailyData.map((row) => (
              <tr key={row.date} className="border-b border-gray-50 last:border-0">
                <td className="py-3 font-medium text-gray-900">{formatDate(row.date)}</td>
                <td className="py-3 text-right text-gray-600">{row.transactions}</td>
                <td className="py-3 text-right font-mono text-gray-900">{formatMAD(row.revenue)}</td>
                <td className="py-3 text-right font-mono text-gray-500">{formatMAD(row.avg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// TAB 2: PAYMENTS
function PaymentsTab({ isLoading }: { isLoading: boolean }) {
  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentMethodsData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {paymentMethodsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            {paymentMethodsData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Breakdown by Method</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Payment Method</th>
                <th className="pb-3 font-medium text-right">Count</th>
                <th className="pb-3 font-medium text-right">Total Amount</th>
                <th className="pb-3 font-medium text-right">% of Revenue</th>
              </tr>
            </thead>
            <tbody>
              {paymentMethodsData.map((item) => (
                <tr key={item.name} className="border-b border-gray-50 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.color + "20" }}>
                        {item.name === "Cash" && <Banknote className="w-4 h-4" style={{ color: item.color }} />}
                        {item.name.includes("Card") && <CreditCard className="w-4 h-4" style={{ color: item.color }} />}
                        {item.name === "Mobile" && <Smartphone className="w-4 h-4" style={{ color: item.color }} />}
                      </div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right text-gray-600">{item.count}</td>
                  <td className="py-3 text-right font-mono text-gray-900">{formatMAD(item.amount)}</td>
                  <td className="py-3 text-right font-mono text-gray-500">{item.value}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Voids & Refunds</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Transaction #</th>
              <th className="pb-3 font-medium text-right">Original Amount</th>
              <th className="pb-3 font-medium text-right">Refund/Void Amount</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Reason</th>
              <th className="pb-3 font-medium">Cashier</th>
            </tr>
          </thead>
          <tbody>
            {voidsRefundsData.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 last:border-0">
                <td className="py-3 text-gray-600">{formatDate(row.date)}</td>
                <td className="py-3 font-mono text-xs">{row.txn}</td>
                <td className="py-3 text-right font-mono text-gray-600">{formatMAD(row.original)}</td>
                <td className="py-3 text-right font-mono text-red-600">{formatMAD(row.amount)}</td>
                <td className="py-3"><Badge color={row.type === "void" ? "red" : "yellow"}>{row.type}</Badge></td>
                <td className="py-3 text-gray-500 text-xs max-w-[200px] truncate">{row.reason}</td>
                <td className="py-3 text-gray-600">{row.cashier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// TAB 3: ACCOUNTING (TVA)
function AccountingTab({ isLoading, dateRange }: { isLoading: boolean; dateRange: { start: string; end: string } }) {
  if (isLoading) return <LoadingSkeleton />

  const totalHT = tvaData.reduce((sum, d) => sum + d.baseHT, 0)
  const totalTVA = tvaData.reduce((sum, d) => sum + d.tva, 0)
  const totalTTC = tvaData.reduce((sum, d) => sum + d.ttc, 0)

  // Check if date range spans multiple months
  const startMonth = new Date(dateRange.start).getMonth()
  const endMonth = new Date(dateRange.end).getMonth()
  const spansMultipleMonths = startMonth !== endMonth

  return (
    <div className="space-y-6">
      {spansMultipleMonths && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">TVA declarations are filed monthly</p>
            <p className="text-sm text-amber-700">Consider filtering by a single month for accurate TVA reporting.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Total HT (excl. tax)" value={formatMAD(totalHT)} icon={FileText} />
        <KPICard title="Total TVA Collected" value={formatMAD(totalTVA)} icon={TrendingUp} />
        <KPICard title="Total TTC (incl. tax)" value={formatMAD(totalTTC)} icon={CreditCard} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">TVA by Rate Band</h3>
          <Button variant="primary">
            <Download className="w-4 h-4 mr-2" />
            Export TVA Declaration (PDF)
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">TVA Rate</th>
              <th className="pb-3 font-medium text-right">Base HT</th>
              <th className="pb-3 font-medium text-right">TVA Amount</th>
              <th className="pb-3 font-medium text-right">TTC Total</th>
              <th className="pb-3 font-medium text-right">Transaction Count</th>
            </tr>
          </thead>
          <tbody>
            {tvaData.map((row) => (
              <tr key={row.rate} className="border-b border-gray-50 last:border-0">
                <td className="py-3">
                  <Badge color={row.rate === "20%" ? "blue" : row.rate === "0% (Exonéré)" ? "gray" : "green"}>{row.rate}</Badge>
                </td>
                <td className="py-3 text-right font-mono text-gray-900">{formatMAD(row.baseHT)}</td>
                <td className="py-3 text-right font-mono text-green-600">{formatMAD(row.tva)}</td>
                <td className="py-3 text-right font-mono font-medium text-gray-900">{formatMAD(row.ttc)}</td>
                <td className="py-3 text-right text-gray-600">{row.count}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="py-3 font-semibold text-gray-900">Total</td>
              <td className="py-3 text-right font-mono font-semibold text-gray-900">{formatMAD(totalHT)}</td>
              <td className="py-3 text-right font-mono font-semibold text-green-600">{formatMAD(totalTVA)}</td>
              <td className="py-3 text-right font-mono font-bold text-gray-900">{formatMAD(totalTTC)}</td>
              <td className="py-3 text-right font-semibold text-gray-600">{tvaData.reduce((s, d) => s + d.count, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// TAB 4: CUSTOMERS
function CustomersTab({ isLoading }: { isLoading: boolean }) {
  if (isLoading) return <LoadingSkeleton />

  const newCustomers = 24
  const returningCustomers = 156
  const retentionRate = 78.5
  const avgPoints = 2317

  const gradeColors: Record<string, "amber" | "gray" | "yellow" | "purple"> = {
    Bronze: "amber",
    Silver: "gray",
    Gold: "yellow",
    Platinum: "purple",
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="New Customers" value={newCustomers.toString()} icon={UserPlus} />
        <KPICard title="Returning Customers" value={returningCustomers.toString()} icon={UserCheck} />
        <KPICard title="Retention Rate" value={`${retentionRate}%`} trend={{ value: 2.3, isPositive: true }} />
        <KPICard title="Avg Points Balance" value={avgPoints.toString()} icon={Star} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer List</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Customer Name</th>
                <th className="pb-3 font-medium">Phone</th>
                <th className="pb-3 font-medium">Grade</th>
                <th className="pb-3 font-medium text-right">Total Spent</th>
                <th className="pb-3 font-medium text-right">Visits</th>
                <th className="pb-3 font-medium">Last Visit</th>
                <th className="pb-3 font-medium text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {customersData.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="py-3 text-gray-600 text-xs">{c.phone}</td>
                  <td className="py-3"><Badge color={gradeColors[c.grade] || "gray"}>{c.grade}</Badge></td>
                  <td className="py-3 text-right font-mono text-gray-900">{formatMAD(c.totalSpent)}</td>
                  <td className="py-3 text-right text-gray-600">{c.visits}</td>
                  <td className="py-3 text-gray-500 text-xs">{formatDate(c.lastVisit)}</td>
                  <td className="py-3 text-right font-mono text-green-600">{c.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Grade Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis type="category" dataKey="grade" axisLine={false} tickLine={false} tick={{ fill: "#374151", fontSize: 12 }} width={70} />
                <Tooltip formatter={(value: number) => [value, "Customers"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {gradeDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {gradeDistribution.map((g) => (
              <div key={g.grade} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-gray-600">{g.grade}</span>
                </div>
                <span className="font-medium text-gray-900">{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// TAB 5: OPERATIONS
function OperationsTab({ isLoading }: { isLoading: boolean }) {
  // Simulating restaurant business type
  const businessType = "restaurant" // Would come from context
  const isRestaurant = businessType === "restaurant" || businessType === "hotel"

  if (isLoading) return <LoadingSkeleton />

  const totalVoids = voidsData.reduce((sum, v) => sum + v.amount, 0)
  const totalVoidCount = voidsData.length

  return (
    <div className="space-y-6">
      {/* Employee Performance */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employee Performance</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Employee Name</th>
              <th className="pb-3 font-medium">Role</th>
              <th className="pb-3 font-medium text-right">Transactions</th>
              <th className="pb-3 font-medium text-right">Revenue (MAD)</th>
              <th className="pb-3 font-medium text-right">Voids</th>
              <th className="pb-3 font-medium text-right">Avg Transaction</th>
            </tr>
          </thead>
          <tbody>
            {employeePerformance.map((emp) => {
              const empVoids = voidsData.filter(v => v.voided_by === emp.name).length
              return (
                <tr key={emp.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center text-xs font-semibold">
                        {emp.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{emp.name}</span>
                    </div>
                  </td>
                  <td className="py-3"><Badge color={emp.role === "Manager" ? "blue" : "gray"}>{emp.role}</Badge></td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-300">{emp.transactions}</td>
                  <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(emp.revenue)}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-300">{empVoids}</td>
                  <td className="py-3 text-right font-mono text-gray-500 dark:text-gray-400">{formatMAD(emp.avg)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Kitchen Performance (restaurant/hotel only) */}
      {isRestaurant ? (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kitchen Performance</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Avg Prep Time: <span className="font-semibold text-gray-900 dark:text-white">{(kitchenPerformance.reduce((s, k) => s + k.avg_prep_time, 0) / kitchenPerformance.length).toFixed(1)} min</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
                <th className="pb-3 font-medium">Item Name</th>
                <th className="pb-3 font-medium text-right">Avg Prep Time (min)</th>
                <th className="pb-3 font-medium text-right">Orders Count</th>
                <th className="pb-3 font-medium text-right">On-Time Rate</th>
              </tr>
            </thead>
            <tbody>
              {kitchenPerformance.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                  <td className="py-3 font-medium text-gray-900 dark:text-white">{item.item}</td>
                  <td className="py-3 text-right font-mono text-gray-600 dark:text-gray-300">{item.avg_prep_time}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-300">{item.orders_count}</td>
                  <td className="py-3 text-right">
                    <span className={`font-medium ${item.on_time_rate >= 95 ? "text-green-600 dark:text-green-400" : item.on_time_rate >= 85 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                      {item.on_time_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-amber-800 dark:text-amber-300">Kitchen Performance is available for restaurant and hotel business types only.</p>
          </div>
        </div>
      )}

      {/* Table Turnover (restaurant/hotel only) */}
      {isRestaurant ? (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Table Turnover</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total Sessions: <span className="font-semibold text-gray-900 dark:text-white">{tableTurnover.reduce((s, t) => s + t.sessions_count, 0)}</span></span>
              <span className="text-gray-500 dark:text-gray-400">Avg Duration: <span className="font-semibold text-gray-900 dark:text-white">{(tableTurnover.reduce((s, t) => s + t.avg_duration, 0) / tableTurnover.length).toFixed(0)} min</span></span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
                <th className="pb-3 font-medium">Table #</th>
                <th className="pb-3 font-medium">Area</th>
                <th className="pb-3 font-medium text-right">Sessions</th>
                <th className="pb-3 font-medium text-right">Avg Duration (min)</th>
                <th className="pb-3 font-medium text-right">Revenue/Cover</th>
                <th className="pb-3 font-medium text-right">Avg Covers</th>
              </tr>
            </thead>
            <tbody>
              {tableTurnover.map((table) => (
                <tr key={table.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                  <td className="py-3 font-medium text-gray-900 dark:text-white">{table.table_number}</td>
                  <td className="py-3"><Badge color={table.area_name === "VIP Room" ? "purple" : table.area_name === "Terrace" ? "green" : "gray"}>{table.area_name}</Badge></td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-300">{table.sessions_count}</td>
                  <td className="py-3 text-right font-mono text-gray-600 dark:text-gray-300">{table.avg_duration}</td>
                  <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(table.revenue_per_cover)}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-300">{table.avg_covers.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-amber-800 dark:text-amber-300">Table Turnover is available for restaurant and hotel business types only.</p>
          </div>
        </div>
      )}

      {/* Voids & Cancellations */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Voids & Cancellations</h3>
          <div className="flex gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-red-600 dark:text-red-400">Total Voids: </span>
              <span className="font-semibold text-red-700 dark:text-red-300">{totalVoidCount}</span>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-red-600 dark:text-red-400">Value: </span>
              <span className="font-semibold text-red-700 dark:text-red-300">{formatMAD(totalVoids)}</span>
            </div>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Transaction ID</th>
              <th className="pb-3 font-medium">Voided By</th>
              <th className="pb-3 font-medium">Reason</th>
              <th className="pb-3 font-medium text-right">Amount (MAD)</th>
              <th className="pb-3 font-medium text-right">Items</th>
            </tr>
          </thead>
          <tbody>
            {voidsData.map((v) => (
              <tr key={v.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 text-gray-600 dark:text-gray-300">{formatDate(v.date)}</td>
                <td className="py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{v.transaction_id}</td>
                <td className="py-3 text-gray-900 dark:text-white">{v.voided_by}</td>
                <td className="py-3 text-gray-600 dark:text-gray-300">{v.reason}</td>
                <td className="py-3 text-right font-mono text-red-600 dark:text-red-400">{formatMAD(v.amount)}</td>
                <td className="py-3 text-right text-gray-600 dark:text-gray-300">{v.item_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// TAB 6: MARKETING
function MarketingTab({ isLoading }: { isLoading: boolean }) {
  if (isLoading) return <LoadingSkeleton />

  const totalPromotionDiscount = promotionReport.reduce((s, p) => s + p.total_discount_given, 0)
  const totalCouponDiscount = couponReport.reduce((s, c) => s + c.discount_given, 0)
  const totalPointsExchanged = pointsExchangeReport.reduce((s, p) => s + p.points_exchanged, 0)
  const totalPointsValue = pointsExchangeReport.reduce((s, p) => s + p.value_given, 0)

  return (
    <div className="space-y-6">
      {/* Promotion Report */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Promotion Report</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Promotion Name</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium text-right">Redemptions</th>
              <th className="pb-3 font-medium text-right">Total Discount (MAD)</th>
              <th className="pb-3 font-medium text-right">Avg Discount/Use</th>
              <th className="pb-3 font-medium text-right">Revenue Influenced</th>
            </tr>
          </thead>
          <tbody>
            {promotionReport.map((promo) => (
              <tr key={promo.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 font-medium text-gray-900 dark:text-white">{promo.name}</td>
                <td className="py-3"><Badge color={promo.type === "percentage" ? "blue" : promo.type === "fixed" ? "purple" : "amber"}>{promo.type}</Badge></td>
                <td className="py-3 text-right text-gray-600 dark:text-gray-300">{promo.redemptions_count}</td>
                <td className="py-3 text-right font-mono text-red-600 dark:text-red-400">{formatMAD(promo.total_discount_given)}</td>
                <td className="py-3 text-right font-mono text-gray-500 dark:text-gray-400">{formatMAD(promo.avg_discount_per_use)}</td>
                <td className="py-3 text-right font-mono text-green-600 dark:text-green-400">{formatMAD(promo.revenue_influenced)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-[#0F0F12]/50 font-semibold">
              <td className="py-3 text-gray-900 dark:text-white">Grand Total</td>
              <td className="py-3"></td>
              <td className="py-3 text-right text-gray-900 dark:text-white">{promotionReport.reduce((s, p) => s + p.redemptions_count, 0)}</td>
              <td className="py-3 text-right font-mono text-red-600 dark:text-red-400">{formatMAD(totalPromotionDiscount)}</td>
              <td className="py-3"></td>
              <td className="py-3 text-right font-mono text-green-600 dark:text-green-400">{formatMAD(promotionReport.reduce((s, p) => s + p.revenue_influenced, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Coupon Report */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Coupon Report</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Coupon Type</th>
              <th className="pb-3 font-medium text-right">Issued</th>
              <th className="pb-3 font-medium text-right">Redeemed</th>
              <th className="pb-3 font-medium text-right">Expired</th>
              <th className="pb-3 font-medium text-right">Voided</th>
              <th className="pb-3 font-medium text-right">Discount Given</th>
              <th className="pb-3 font-medium text-right">Redemption Rate</th>
            </tr>
          </thead>
          <tbody>
            {couponReport.map((coupon) => (
              <tr key={coupon.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 font-medium text-gray-900 dark:text-white">{coupon.coupon_type}</td>
                <td className="py-3 text-right text-gray-600 dark:text-gray-300">{coupon.issued}</td>
                <td className="py-3 text-right text-green-600 dark:text-green-400">{coupon.redeemed}</td>
                <td className="py-3 text-right text-gray-400 dark:text-gray-500">{coupon.expired}</td>
                <td className="py-3 text-right text-red-600 dark:text-red-400">{coupon.voided}</td>
                <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(coupon.discount_given)}</td>
                <td className="py-3 text-right">
                  <span className={`font-medium ${coupon.redemption_rate >= 60 ? "text-green-600 dark:text-green-400" : coupon.redemption_rate >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {coupon.redemption_rate}%
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-[#0F0F12]/50 font-semibold">
              <td className="py-3 text-gray-900 dark:text-white">Grand Total</td>
              <td className="py-3 text-right text-gray-900 dark:text-white">{couponReport.reduce((s, c) => s + c.issued, 0)}</td>
              <td className="py-3 text-right text-green-600 dark:text-green-400">{couponReport.reduce((s, c) => s + c.redeemed, 0)}</td>
              <td className="py-3 text-right text-gray-400 dark:text-gray-500">{couponReport.reduce((s, c) => s + c.expired, 0)}</td>
              <td className="py-3 text-right text-red-600 dark:text-red-400">{couponReport.reduce((s, c) => s + c.voided, 0)}</td>
              <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(totalCouponDiscount)}</td>
              <td className="py-3"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Discount Write-offs */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Discount Write-offs</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Terminal Name</th>
              <th className="pb-3 font-medium">Location</th>
              <th className="pb-3 font-medium text-right">Discount Count</th>
              <th className="pb-3 font-medium text-right">Total Discount (MAD)</th>
            </tr>
          </thead>
          <tbody>
            {discountWriteoffs.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 font-medium text-gray-900 dark:text-white">{item.terminal_name}</td>
                <td className="py-3 text-gray-600 dark:text-gray-300">{item.location}</td>
                <td className="py-3 text-right text-gray-600 dark:text-gray-300">{item.discount_count}</td>
                <td className="py-3 text-right font-mono text-red-600 dark:text-red-400">{formatMAD(item.total_discount)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-[#0F0F12]/50 font-semibold">
              <td className="py-3 text-gray-900 dark:text-white" colSpan={2}>Grand Total</td>
              <td className="py-3 text-right text-gray-900 dark:text-white">{discountWriteoffs.reduce((s, d) => s + d.discount_count, 0)}</td>
              <td className="py-3 text-right font-mono text-red-600 dark:text-red-400">{formatMAD(discountWriteoffs.reduce((s, d) => s + d.total_discount, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Points Exchange Report */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Points Exchange Report</h3>
          <div className="flex gap-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-purple-600 dark:text-purple-400">Total Points: </span>
              <span className="font-semibold text-purple-700 dark:text-purple-300">{totalPointsExchanged.toLocaleString()}</span>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-green-600 dark:text-green-400">Value Given: </span>
              <span className="font-semibold text-green-700 dark:text-green-300">{formatMAD(totalPointsValue)}</span>
            </div>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Rule Name</th>
              <th className="pb-3 font-medium text-right">Redemptions</th>
              <th className="pb-3 font-medium text-right">Points Exchanged</th>
              <th className="pb-3 font-medium text-right">Value Given (MAD)</th>
            </tr>
          </thead>
          <tbody>
            {pointsExchangeReport.map((rule) => (
              <tr key={rule.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 font-medium text-gray-900 dark:text-white">{rule.rule_name}</td>
                <td className="py-3 text-right text-gray-600 dark:text-gray-300">{rule.redemptions_count}</td>
                <td className="py-3 text-right font-mono text-purple-600 dark:text-purple-400">{rule.points_exchanged.toLocaleString()}</td>
                <td className="py-3 text-right font-mono text-green-600 dark:text-green-400">{formatMAD(rule.value_given)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// TAB 7: INVENTORY
function InventoryTab({ isLoading }: { isLoading: boolean }) {
  const [warehouseFilter, setWarehouseFilter] = useState("all")
  const [productSearch, setProductSearch] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [movementTypeFilter, setMovementTypeFilter] = useState("all")
  // As of Date filters for balance reports
  const [vendorBalanceAsOf, setVendorBalanceAsOf] = useState(new Date().toISOString().split("T")[0])
  const [billAgingAsOf, setBillAgingAsOf] = useState(new Date().toISOString().split("T")[0])

  if (isLoading) return <LoadingSkeleton />

  const totalInventoryValue = stockPosition.reduce((s, p) => s + p.total_value, 0)
  const lowStockCount = stockPosition.filter(p => p.is_low_stock).length
  const filteredStock = stockPosition.filter(p => {
    if (lowStockOnly && !p.is_low_stock) return false
    if (productSearch && !p.product.toLowerCase().includes(productSearch.toLowerCase())) return false
    if (warehouseFilter !== "all" && p.warehouse !== warehouseFilter) return false
    return true
  })

  const filteredMovements = stockMovements.filter(m => {
    if (movementTypeFilter !== "all" && m.movement_type !== movementTypeFilter) return false
    return true
  })

  const agingBuckets = {
    current: billAging.filter(b => b.aging_bucket === "Current").reduce((s, b) => s + b.amount_due, 0),
    "1-30d": billAging.filter(b => b.aging_bucket === "1-30d").reduce((s, b) => s + b.amount_due, 0),
    "31-60d": billAging.filter(b => b.aging_bucket === "31-60d").reduce((s, b) => s + b.amount_due, 0),
    "61-90d": billAging.filter(b => b.aging_bucket === "61-90d").reduce((s, b) => s + b.amount_due, 0),
    "90d+": billAging.filter(b => b.aging_bucket === "90d+").reduce((s, b) => s + b.amount_due, 0),
  }

  const movementColors: Record<string, "green" | "red" | "yellow" | "blue" | "gray" | "purple"> = {
    receive: "green",
    consume: "red",
    adjust: "yellow",
    dispose: "red",
    transfer_in: "blue",
    transfer_out: "purple",
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Select
            label="Warehouse"
            options={[
              { value: "all", label: "All Warehouses" },
              { value: "Main Store", label: "Main Store" },
              { value: "Cold Storage", label: "Cold Storage" },
            ]}
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-48"
          />
          <Select
            label="Movement Type"
            options={[
              { value: "all", label: "All Types" },
              { value: "receive", label: "Receive" },
              { value: "consume", label: "Consume" },
              { value: "adjust", label: "Adjust" },
              { value: "dispose", label: "Dispose" },
              { value: "transfer_in", label: "Transfer In" },
              { value: "transfer_out", label: "Transfer Out" },
            ]}
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            className="w-48"
          />
          <Input
            label="Product Search"
            placeholder="Search products..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-48"
          />
          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 text-indigo-500 rounded"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">Low Stock Only</span>
          </label>
        </div>
      </div>

      {/* Stock Position */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stock Position</h3>
          <div className="flex gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-blue-600 dark:text-blue-400">Total Value: </span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">{formatMAD(totalInventoryValue)}</span>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-red-600 dark:text-red-400">Low Stock: </span>
              <span className="font-semibold text-red-700 dark:text-red-300">{lowStockCount} items</span>
            </div>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Warehouse</th>
              <th className="pb-3 font-medium text-right">Qty on Hand</th>
              <th className="pb-3 font-medium text-right">Unit Cost</th>
              <th className="pb-3 font-medium text-right">Total Value</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 font-medium text-gray-900 dark:text-white">{item.product}</td>
                <td className="py-3 text-gray-600 dark:text-gray-300">{item.category}</td>
                <td className="py-3 text-gray-600 dark:text-gray-300">{item.warehouse}</td>
                <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{item.qty_on_hand}</td>
                <td className="py-3 text-right font-mono text-gray-500 dark:text-gray-400">{formatMAD(item.unit_cost)}</td>
                <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(item.total_value)}</td>
                <td className="py-3">
                  {item.is_low_stock ? (
                    <Badge color="red">Low Stock</Badge>
                  ) : (
                    <Badge color="green">In Stock</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stock Movements */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stock Movements</h3>
          <Select
            options={[
              { value: "all", label: "All Types" },
              { value: "receive", label: "Receive" },
              { value: "consume", label: "Consume" },
              { value: "adjust", label: "Adjust" },
              { value: "dispose", label: "Dispose" },
              { value: "transfer_in", label: "Transfer In" },
              { value: "transfer_out", label: "Transfer Out" },
            ]}
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            className="w-40"
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium">Warehouse</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium text-right">Qty +/-</th>
              <th className="pb-3 font-medium text-right">Unit Cost</th>
              <th className="pb-3 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.map((mov) => (
              <tr key={mov.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 text-gray-600 dark:text-gray-300">{formatDate(mov.date)}</td>
                <td className="py-3 font-medium text-gray-900 dark:text-white">{mov.product}</td>
                <td className="py-3 text-gray-600 dark:text-gray-300">{mov.warehouse}</td>
                <td className="py-3"><Badge color={movementColors[mov.movement_type] || "gray"}>{mov.movement_type.replace("_", " ")}</Badge></td>
                <td className={`py-3 text-right font-mono ${mov.qty_delta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {mov.qty_delta > 0 ? "+" : ""}{mov.qty_delta}
                </td>
                <td className="py-3 text-right font-mono text-gray-500 dark:text-gray-400">{formatMAD(mov.unit_cost)}</td>
                <td className="py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{mov.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vendor Purchases */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vendor Purchases</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Vendor</th>
              <th className="pb-3 font-medium text-right">PO Count</th>
              <th className="pb-3 font-medium text-right">Total HT</th>
              <th className="pb-3 font-medium text-right">Total TVA</th>
              <th className="pb-3 font-medium text-right">Total TTC</th>
              <th className="pb-3 font-medium">Last Order</th>
            </tr>
          </thead>
          <tbody>
            {vendorPurchases.map((vp) => (
              <tr key={vp.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 font-medium text-gray-900 dark:text-white">{vp.vendor}</td>
                <td className="py-3 text-right text-gray-600 dark:text-gray-300">{vp.po_count}</td>
                <td className="py-3 text-right font-mono text-gray-600 dark:text-gray-300">{formatMAD(vp.total_ht)}</td>
                <td className="py-3 text-right font-mono text-amber-600 dark:text-amber-400">{formatMAD(vp.total_tva)}</td>
                <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(vp.total_ttc)}</td>
                <td className="py-3 text-gray-600 dark:text-gray-300">{formatDate(vp.last_order_date)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-[#0F0F12]/50 font-semibold">
              <td className="py-3 text-gray-900 dark:text-white">Grand Total</td>
              <td className="py-3 text-right text-gray-900 dark:text-white">{vendorPurchases.reduce((s, v) => s + v.po_count, 0)}</td>
              <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(vendorPurchases.reduce((s, v) => s + v.total_ht, 0))}</td>
              <td className="py-3 text-right font-mono text-amber-600 dark:text-amber-400">{formatMAD(vendorPurchases.reduce((s, v) => s + v.total_tva, 0))}</td>
              <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(vendorPurchases.reduce((s, v) => s + v.total_ttc, 0))}</td>
              <td className="py-3"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Input TVA */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Input TVA</h3>
          <div className="bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg text-xs text-amber-700 dark:text-amber-300">
            Based on calendar date per DGI requirements
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">TVA Rate</th>
              <th className="pb-3 font-medium text-right">Base HT (MAD)</th>
              <th className="pb-3 font-medium text-right">TVA Amount</th>
              <th className="pb-3 font-medium text-right">TTC (MAD)</th>
              <th className="pb-3 font-medium text-right">Invoices</th>
            </tr>
          </thead>
          <tbody>
            {inputTVA.map((tva) => (
              <tr key={tva.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3"><Badge color="blue">{tva.tva_rate}</Badge></td>
                <td className="py-3 text-right font-mono text-gray-600 dark:text-gray-300">{formatMAD(tva.base_ht)}</td>
                <td className="py-3 text-right font-mono text-amber-600 dark:text-amber-400">{formatMAD(tva.tva_amount)}</td>
                <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(tva.ttc)}</td>
                <td className="py-3 text-right text-gray-600 dark:text-gray-300">{tva.invoice_count}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 dark:bg-[#0F0F12]/50 font-semibold">
              <td className="py-3 text-gray-900 dark:text-white">Total</td>
              <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(inputTVA.reduce((s, t) => s + t.base_ht, 0))}</td>
              <td className="py-3 text-right font-mono text-amber-600 dark:text-amber-400">{formatMAD(inputTVA.reduce((s, t) => s + t.tva_amount, 0))}</td>
              <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(inputTVA.reduce((s, t) => s + t.ttc, 0))}</td>
              <td className="py-3 text-right text-gray-900 dark:text-white">{inputTVA.reduce((s, t) => s + t.invoice_count, 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* COGS Report */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cost of Goods Sold (COGS)</h3>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total COGS</p>
            <p className="text-lg font-bold font-mono text-gray-900 dark:text-white">{formatMAD(cogsReport.reduce((s, c) => s + c.cogs, 0))}</p>
          </div>
          <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-lg font-bold font-mono text-green-600 dark:text-green-400">{formatMAD(cogsReport.reduce((s, c) => s + c.revenue, 0))}</p>
          </div>
          <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross Profit</p>
            <p className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">{formatMAD(cogsReport.reduce((s, c) => s + c.gross_profit, 0))}</p>
          </div>
          <div className="bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Overall Margin</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{((cogsReport.reduce((s, c) => s + c.gross_profit, 0) / cogsReport.reduce((s, c) => s + c.revenue, 0)) * 100).toFixed(1)}%</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium text-right">Units Sold</th>
              <th className="pb-3 font-medium text-right">COGS (MAD)</th>
              <th className="pb-3 font-medium text-right">Revenue (MAD)</th>
              <th className="pb-3 font-medium text-right">Gross Profit</th>
              <th className="pb-3 font-medium text-right">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {cogsReport.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 font-medium text-gray-900 dark:text-white">{item.product}</td>
                <td className="py-3 text-right text-gray-600 dark:text-gray-300">{item.units_sold}</td>
                <td className="py-3 text-right font-mono text-red-600 dark:text-red-400">{formatMAD(item.cogs)}</td>
                <td className="py-3 text-right font-mono text-green-600 dark:text-green-400">{formatMAD(item.revenue)}</td>
                <td className="py-3 text-right font-mono text-blue-600 dark:text-blue-400">{formatMAD(item.gross_profit)}</td>
                <td className="py-3 text-right">
                  <span className={`font-medium ${item.margin >= 70 ? "text-green-600 dark:text-green-400" : item.margin >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {item.margin}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vendor Balance */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vendor Balance</h3>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <label className="text-sm text-gray-600 dark:text-gray-400">As of Date:</label>
            <input
              type="date"
              value={vendorBalanceAsOf}
              onChange={(e) => setVendorBalanceAsOf(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-400 dark:text-gray-500">Shows balances as they stood on this date</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Vendor</th>
              <th className="pb-3 font-medium text-right">Total PO Value</th>
              <th className="pb-3 font-medium text-right">Total Paid</th>
              <th className="pb-3 font-medium text-right">Balance Due</th>
              <th className="pb-3 font-medium">Oldest Unpaid</th>
            </tr>
          </thead>
          <tbody>
            {vendorBalance.map((vb) => (
              <tr key={vb.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                <td className="py-3 font-medium text-gray-900 dark:text-white">{vb.vendor}</td>
                <td className="py-3 text-right font-mono text-gray-600 dark:text-gray-300">{formatMAD(vb.total_po_value)}</td>
                <td className="py-3 text-right font-mono text-green-600 dark:text-green-400">{formatMAD(vb.total_paid)}</td>
                <td className="py-3 text-right font-mono text-red-600 dark:text-red-400 font-semibold">{formatMAD(vb.balance_due)}</td>
                <td className="py-3 text-gray-600 dark:text-gray-300">{formatDate(vb.oldest_unpaid_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bill Aging */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bill Aging</h3>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <label className="text-sm text-gray-600 dark:text-gray-400">As of Date:</label>
            <input
              type="date"
              value={billAgingAsOf}
              onChange={(e) => setBillAgingAsOf(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-400 dark:text-gray-500">Shows balances as they stood on this date</span>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 dark:text-green-400">Current</p>
            <p className="text-lg font-bold font-mono text-green-700 dark:text-green-300">{formatMAD(agingBuckets.current)}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">1-30 Days</p>
            <p className="text-lg font-bold font-mono text-yellow-700 dark:text-yellow-300">{formatMAD(agingBuckets["1-30d"])}</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
            <p className="text-xs text-indigo-600 dark:text-indigo-400">31-60 Days</p>
            <p className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">{formatMAD(agingBuckets["31-60d"])}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600 dark:text-red-400">61-90 Days</p>
            <p className="text-lg font-bold font-mono text-red-700 dark:text-red-300">{formatMAD(agingBuckets["61-90d"])}</p>
          </div>
          <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 text-center">
            <p className="text-xs text-red-700 dark:text-red-300">90+ Days</p>
            <p className="text-lg font-bold font-mono text-red-800 dark:text-red-200">{formatMAD(agingBuckets["90d+"])}</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#1F1F23]">
              <th className="pb-3 font-medium">Vendor</th>
              <th className="pb-3 font-medium">PO Number</th>
              <th className="pb-3 font-medium">Invoice Date</th>
              <th className="pb-3 font-medium">Due Date</th>
              <th className="pb-3 font-medium text-right">Amount Due</th>
              <th className="pb-3 font-medium text-right">Days Overdue</th>
              <th className="pb-3 font-medium">Aging</th>
            </tr>
          </thead>
          <tbody>
            {billAging.map((bill) => {
              const agingColor: Record<string, "green" | "yellow" | "amber" | "red" | "gray"> = {
                "Current": "green",
                "1-30d": "yellow",
                "31-60d": "amber",
                "61-90d": "red",
                "90d+": "red",
              }
              return (
                <tr key={bill.id} className="border-b border-gray-50 dark:border-[#1F1F23] last:border-0">
                  <td className="py-3 font-medium text-gray-900 dark:text-white">{bill.vendor}</td>
                  <td className="py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{bill.po_number}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-300">{formatDate(bill.invoice_date)}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-300">{formatDate(bill.due_date)}</td>
                  <td className="py-3 text-right font-mono text-gray-900 dark:text-white">{formatMAD(bill.amount_due)}</td>
                  <td className="py-3 text-right">
                    <span className={bill.days_overdue > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
                      {bill.days_overdue}
                    </span>
                  </td>
                  <td className="py-3"><Badge color={agingColor[bill.aging_bucket] || "gray"}>{bill.aging_bucket}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// TAB 8: TRANSACTIONS
function TransactionsTab({ 
  isLoading, 
  onSelectTransaction,
  canRefund
}: { 
  isLoading: boolean; 
  onSelectTransaction: (txn: typeof transactionsData[0]) => void;
  canRefund: boolean;
}) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const perPage = 10
  const totalPages = 6

  if (isLoading) return <LoadingSkeleton rows={8} />

  const filteredTransactions = transactionsData.filter(
    (t) => t.number.toLowerCase().includes(search.toLowerCase()) || 
           (t.customerId && customersData.find(c => c.id === t.customerId)?.name.toLowerCase().includes(search.toLowerCase()))
  )

  const statusColors: Record<string, "green" | "red" | "yellow"> = {
    completed: "green",
    voided: "red",
    refunded: "yellow",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by transaction # or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-4 font-medium">Transaction #</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Cashier</th>
              <th className="p-4 font-medium text-right">Items</th>
              <th className="p-4 font-medium">Payment</th>
              <th className="p-4 font-medium text-right">Total</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((txn) => (
              <tr 
                key={txn.id} 
                className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50"
                onClick={() => onSelectTransaction(txn)}
              >
                <td className="p-4 font-mono text-xs text-blue-600">{txn.number}</td>
                <td className="p-4 text-gray-600 text-xs">{formatDateTime(txn.date)}</td>
                <td className="p-4 text-gray-900">{txn.cashier}</td>
                <td className="p-4 text-right text-gray-600">{txn.items}</td>
                <td className="p-4 text-gray-600">{txn.payment}</td>
                <td className="p-4 text-right font-mono font-medium text-gray-900">{formatMAD(txn.total)}</td>
                <td className="p-4"><Badge color={statusColors[txn.status]}>{txn.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="px-3" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="secondary" className="px-3" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN REPORTS PAGE ====================
// ==================== UNIVERSAL API REPORTS TAB ====================
interface UniversalReportResponse {
  report_id: string
  title: string
  generated_at: string
  date_range: { start: string; end: string }
  kpis?: { key: string; label: string; value: number | string; format?: string }[]
  tables?: { title: string; columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }[]
  meta?: Record<string, unknown>
}

const REPORT_OPTIONS = [
  { value: "sales-summary", label: "Sales Summary" },
  { value: "sales-by-hour", label: "Sales by Hour" },
  { value: "sales-by-day", label: "Sales by Day" },
  { value: "sales-by-month", label: "Sales by Month" },
  { value: "sales-by-category", label: "Sales by Category" },
  { value: "sales-by-product", label: "Sales by Product" },
  { value: "payment-summary", label: "Payment Summary" },
  { value: "cash-report", label: "Cash Report" },
  { value: "customer-summary", label: "Customer Summary" },
  { value: "top-customers", label: "Top Customers" },
  { value: "employee-performance", label: "Employee Performance" },
  { value: "voids-cancellations", label: "Voids & Cancellations" },
  { value: "tva-declaration", label: "TVA Declaration" },
]

const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7days", label: "Last 7 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
]

function ApiReportsTab() {
  const [reportId, setReportId] = useState("sales-summary")
  const [dateRange, setDateRange] = useState("today")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [report, setReport] = useState<UniversalReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ date_range: dateRange })
      if (dateRange === "custom" && startDate) params.set("start_date", startDate)
      if (dateRange === "custom" && endDate) params.set("end_date", endDate)
      const res = await apiFetch<UniversalReportResponse>(`/api/business/reports/${reportId}?${params}`)
      setReport(res)
    } catch (e: any) {
      setError(e.message ?? "Failed to load report")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [reportId, dateRange])

  const formatKpiValue = (kpi: { value: number | string; format?: string }) => {
    if (typeof kpi.value === "number") {
      if (kpi.format === "currency") return `${kpi.value.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD`
      if (kpi.format === "percent") return `${kpi.value}%`
      return kpi.value.toLocaleString()
    }
    return String(kpi.value)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report</label>
            <select
              value={reportId}
              onChange={e => setReportId(e.target.value)}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {REPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DATE_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              <option value="custom">Custom</option>
            </select>
          </div>
          {dateRange === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
              </div>
            </>
          )}
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Run Report
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <div className="py-10 text-center text-gray-400">Loading...</div>}

      {/* Report Output */}
      {!loading && report && (
        <div className="space-y-6">
          {/* Report header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{report.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {report.date_range.start} — {report.date_range.end} &middot; Generated {new Date(report.generated_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* KPIs */}
          {report.kpis && report.kpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {report.kpis.map(kpi => (
                <div key={kpi.key} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-xl font-bold font-mono text-gray-900 dark:text-white">{formatKpiValue(kpi)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tables */}
          {report.tables && report.tables.map((table, ti) => (
            <div key={ti} className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
              {table.title && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#1F1F23]">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{table.title}</h3>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
                    <tr>
                      {table.columns.map(col => (
                        <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {table.rows.map((row, ri) => (
                      <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                        {table.columns.map(col => (
                          <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono">
                            {String(row[col.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {table.rows.length === 0 && (
                      <tr><td colSpan={table.columns.length} className="px-4 py-8 text-center text-gray-400">No data for this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("api-reports")
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState("2024-01-09")
  const [endDate, setEndDate] = useState("2024-01-15")
  const [location, setLocation] = useState("all")
  const [selectedTransaction, setSelectedTransaction] = useState<typeof transactionsData[0] | null>(null)
  const [showRefundModal, setShowRefundModal] = useState(false)

  const canRefund = true // This would come from user permissions

  const tabs = [
    { id: "api-reports", label: "Live Reports" },
    { id: "sales", label: "Sales" },
    { id: "payments", label: "Payments" },
    { id: "accounting", label: "Accounting (TVA)" },
    { id: "customers", label: "Customers" },
    { id: "operations", label: "Operations" },
    { id: "marketing", label: "Marketing" },
    { id: "inventory", label: "Inventory" },
    { id: "transactions", label: "Transactions" },
  ]

  const handlePresetSelect = (preset: string) => {
    const today = new Date()
    let start = new Date()
    let end = new Date()

    switch (preset) {
      case "today":
        start = today
        end = today
        break
      case "yesterday":
        start = new Date(today.setDate(today.getDate() - 1))
        end = start
        break
      case "this_week":
        start = new Date(today.setDate(today.getDate() - today.getDay()))
        end = new Date()
        break
      case "this_month":
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date()
        break
      case "last_month":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0)
        break
    }

    setStartDate(start.toISOString().split("T")[0])
    setEndDate(end.toISOString().split("T")[0])
  }

  const handleExportCSV = () => {
    // Mock export
    alert("Exporting CSV...")
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "api-reports":
        return <ApiReportsTab />
      case "sales":
        return <SalesTab isLoading={isLoading} />
      case "payments":
        return <PaymentsTab isLoading={isLoading} />
      case "accounting":
        return <AccountingTab isLoading={isLoading} dateRange={{ start: startDate, end: endDate }} />
      case "customers":
        return <CustomersTab isLoading={isLoading} />
      case "operations":
        return <OperationsTab isLoading={isLoading} />
      case "marketing":
        return <MarketingTab isLoading={isLoading} />
      case "inventory":
        return <InventoryTab isLoading={isLoading} />
      case "transactions":
        return (
          <TransactionsTab 
            isLoading={isLoading} 
            onSelectTransaction={(txn) => setSelectedTransaction(txn)}
            canRefund={canRefund}
          />
        )
      default:
        return null
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex items-center gap-3">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onPresetSelect={handlePresetSelect}
          />
          <Select
            options={mockLocations}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-40"
          />
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Transaction Detail Panel */}
      <SlidePanel 
        isOpen={!!selectedTransaction} 
        onClose={() => setSelectedTransaction(null)} 
        title="Transaction Details"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-lg font-semibold">{transactionDetail.number}</p>
                <p className="text-sm text-gray-500">{formatDateTime(transactionDetail.date)}</p>
              </div>
              <Badge color="green">{transactionDetail.status}</Badge>
            </div>

            {transactionDetail.customer && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Customer</p>
                <p className="font-medium text-gray-900">{transactionDetail.customer}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Items</p>
              <div className="space-y-2">
                {transactionDetail.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.qty} × {formatMAD(item.price)}</p>
                    </div>
                    <p className="font-mono text-gray-900">{formatMAD(item.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-mono">{formatMAD(transactionDetail.subtotal)}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-gray-200">
                <p className="text-xs text-gray-500 mb-2">TVA Breakdown</p>
                {transactionDetail.tvaBreakdown.map((t, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-gray-500">
                    <span>TVA {t.rate} on {formatMAD(t.base)}</span>
                    <span className="font-mono">{formatMAD(t.tva)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total TVA</span>
                <span className="font-mono">{formatMAD(transactionDetail.totalTVA)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="font-mono">{formatMAD(transactionDetail.total)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment Method</span>
                <span>{transactionDetail.payment}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cashier</span>
                <span>{transactionDetail.cashier}</span>
              </div>
            </div>

            {canRefund && selectedTransaction.status === "completed" && (
              <Button variant="danger" className="w-full" onClick={() => setShowRefundModal(true)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Issue Refund
              </Button>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Refund Modal */}
      <Modal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} title="Issue Refund" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Transaction: <span className="font-mono font-medium">{transactionDetail.number}</span>
          </p>
          <Input label="Amount (MAD)" type="number" value={transactionDetail.total.toString()} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea 
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full h-20 focus:outline-none focus:ring-2 focus:ring-red-500" 
              placeholder="Enter reason for refund..." 
            />
          </div>
          <Select 
            label="Refund Method" 
            options={[
              { value: "cash", label: "Cash" }, 
              { value: "card_cmi", label: "Card CMI" }, 
              { value: "card_payzone", label: "Card PayZone" }
            ]} 
          />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">This action cannot be undone</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowRefundModal(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1">Confirm Refund</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


