"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import CustomersPage from "@/components/customers-page"
import PromotionsPage from "@/components/promotions-page"
import CouponsPage from "@/components/coupons-page"
import TableManagementPage from "@/components/table-management-page"
import FloorPlanSetupPage from "@/components/floor-plan-setup-page"
import ReportsPage from "@/components/reports-page"
import ProductsPageNew from "@/components/products-page"
import ModifiersPage from "@/components/modifiers-page"
import EmployeesPageNew from "@/components/employees-page"
import LocationsPageNew from "@/components/locations-page"
import WarehousesPage from "@/components/warehouses-page"
import VendorsPage from "@/components/vendors-page"
import PurchaseOrdersPage from "@/components/purchase-orders-page"
import StockAdjustmentsPage from "@/components/stock-adjustments-page"
import StockTransfersPage from "@/components/stock-transfers-page"
import KDSPage from "@/components/kds-page"
import PointsExchangePage from "@/components/points-exchange-page"
import NotificationsPage from "@/components/notifications-page"
import CommunicationsPage from "@/components/communications-page"
import AnnouncementsPage from "@/components/announcements-page"
import SettingsPage from "@/components/settings-page"
import RecommendationsPage from "@/components/recommendations-page"
import ChainPage from "@/components/chain-page"
import VendorPaymentsPage from "@/components/vendor-payments-page"
import CategoriesPage from "@/components/categories-page"
import BrandsPage from "@/components/brands-page"
import UnitsOfMeasurePage from "@/components/units-of-measure-page"
import ProductDetailPage from "@/components/product-detail-page"
import CustomerDetailPage from "@/components/customer-detail-page"
import PromotionCreatePage from "@/components/promotion-create-page"
import PromotionDetailPage from "@/components/promotion-detail-page"
import CouponBulkIssuePage from "@/components/coupon-bulk-issue-page"
import DiningAreasPage from "@/components/dining-areas-page"
import TableTypesPage from "@/components/table-types-page"
import StockPage from "@/components/stock-page"
import StockBatchesPage from "@/components/stock-batches-page"
import StockMovementsPage from "@/components/stock-movements-page"
import PurchaseOrderCreatePage from "@/components/purchase-order-create-page"
import PurchaseOrderDetailPage from "@/components/purchase-order-detail-page"
import StockTemplatesPage from "@/components/stock-templates-page"
import VendorDetailPage from "@/components/vendor-detail-page"
import ExpirationAlertsPage from "@/components/expiration-alerts-page"
import DiscrepancyAlertsPage from "@/components/discrepancy-alerts-page"
import NotificationChannelsPage from "@/components/notification-channels-page"
import NotificationTemplatesPage from "@/components/notification-templates-page"
import NotificationSendPage from "@/components/notification-send-page"
import PlatformAnnouncementsPage from "@/components/platform-announcements-page"
import RecommendationItemsPage from "@/components/recommendation-items-page"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiFetch, clearToken, setToken, setRefreshToken, loadToken, getToken } from "@/lib/api"
import { isPlatformOperator, type Me } from "@/lib/super-admin/types"
import { QueryProvider } from "@/components/providers/query-provider"
import { reportsApi, transactionsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import {
  SALES_SUMMARY_INDEX,
  type ReportPeriodType,
  type SalesByDayRow,
  type TopProductRow,
} from "@/lib/merchant/types"
import {
  LayoutDashboard,
  Package,
  Users,
  Box,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  UserCheck,
  CreditCard,
  MoreHorizontal,
  MapPin,
  LogOut,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  X,
  Upload,
  Phone,
  Wifi,
  WifiOff,
  UserPlus,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building2,
  Shield,
  Activity,
  UtensilsCrossed,
  LayoutGrid,
  ChefHat,
  Tag,
  Ticket,
  ArrowRight,
  FileText,
  Layers,
  Sun,
  Moon,
  Warehouse,
  Truck,
  ClipboardList,
  Link2,
  Megaphone,
  Mail,
  Send,
  Gift,
  Store,
  Menu,
  ChevronUp,
  Zap,
  Sparkles,
  Receipt,
  FolderOpen,
  Award,
  Ruler,
  PlusCircle,
  Armchair,
  BarChart2,
  Boxes,
  ArrowUpDown,
  FilePlus,
  LayoutList,
  AlertTriangle,
  AlertCircle,
  Radio,
  Globe,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"


// ============== TYPES ==============
interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: "owner" | "manager" | "employee"
  business_name: string
}

// ============== MOCK DATA ==============
const mockUser: User = {
  id: "1",
  email: "admin@rts.ma",
  first_name: "Ahmed",
  last_name: "Benali",
  role: "owner",
  business_name: "Café Marrakech",
}

const revenueData = [
  { day: "Mon", revenue: 4200, orders: 45 },
  { day: "Tue", revenue: 3800, orders: 38 },
  { day: "Wed", revenue: 5100, orders: 52 },
  { day: "Thu", revenue: 4700, orders: 48 },
  { day: "Fri", revenue: 6200, orders: 65 },
  { day: "Sat", revenue: 7800, orders: 82 },
  { day: "Sun", revenue: 5500, orders: 58 },
]

const topProducts = [
  { name: "Cappuccino", sold: 234, revenue: 5850, trend: 12 },
  { name: "Croissant", sold: 189, revenue: 3780, trend: 8 },
  { name: "Avocado Toast", sold: 156, revenue: 7020, trend: -3 },
  { name: "Fresh Orange Juice", sold: 142, revenue: 4260, trend: 15 },
  { name: "Club Sandwich", sold: 128, revenue: 6400, trend: 5 },
]

const recentTransactions = [
  { id: "TXN-001234", time: "10:30 AM", amount: 132.00, items: 4, method: "Card", status: "completed" },
  { id: "TXN-001235", time: "10:45 AM", amount: 45.00, items: 2, method: "Cash", status: "completed" },
  { id: "TXN-001236", time: "11:00 AM", amount: 89.50, items: 3, method: "Card", status: "completed" },
  { id: "TXN-001237", time: "11:15 AM", amount: 210.00, items: 6, method: "Mobile", status: "pending" },
]

const mockCategories = [
  { id: "1", name: "Hot Drinks", product_count: 12, is_active: true },
  { id: "2", name: "Cold Drinks", product_count: 8, is_active: true },
  { id: "3", name: "Pastries", product_count: 15, is_active: true },
  { id: "4", name: "Sandwiches", product_count: 10, is_active: false },
]

const mockProducts = [
  { id: "1", name: "Cappuccino", category: "Hot Drinks", price: 25.00, sku: "CAP-001", is_sold_out: false },
  { id: "2", name: "Espresso", category: "Hot Drinks", price: 18.00, sku: "ESP-001", is_sold_out: false },
  { id: "3", name: "Croissant", category: "Pastries", price: 20.00, sku: "CRO-001", is_sold_out: false },
  { id: "4", name: "Pain au Chocolat", category: "Pastries", price: 22.00, sku: "PAC-001", is_sold_out: true },
]

const mockEmployees = [
  { id: "1", name: "Sara Idrissi", email: "sara@cafe.ma", role: "manager", status: "active", permissions: ["void", "refund", "reports"] },
  { id: "2", name: "Youssef Amrani", email: "youssef@cafe.ma", role: "cashier", status: "active", permissions: ["void"] },
  { id: "3", name: "Fatima Zahra", email: "fatima@cafe.ma", role: "cashier", status: "inactive", permissions: [] },
]

const mockLocations = [
  { id: "1", name: "Downtown Branch", address: "123 Mohammed V Blvd", terminals: 3, status: "online" },
  { id: "2", name: "Marina Mall", address: "Marina Shopping Center", terminals: 2, status: "online" },
  { id: "3", name: "Airport Kiosk", address: "Terminal 1, Departure", terminals: 1, status: "offline" },
]

// ============== ANIMATION VARIANTS ==============
const sidebarItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }
  })
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }),
  hover: { 
    y: -6, 
    scale: 1.02,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    transition: { duration: 0.25, ease: "easeOut" } 
  }
}

const pageTransition = {
  hidden: { opacity: 0, x: 30, filter: "blur(4px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -30, filter: "blur(4px)", transition: { duration: 0.25 } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
}

// ============== UI COMPONENTS ==============
function Button({ children, variant = "primary", size = "md", className = "", ...props }: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  className?: string
  [key: string]: unknown
}) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]"
  const variants = {
    primary: "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 focus:ring-gray-900 dark:focus:ring-gray-300 shadow-sm",
    secondary: "bg-white dark:bg-[#0F0F12] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#1F1F23] focus:ring-gray-400",
    ghost: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a20] focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 shadow-sm",
  }
  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  }
  return <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "green" | "red" | "yellow" | "blue" | "gray" | "indigo" }) {
  const colors = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    gray: "bg-gray-100 text-gray-700 dark:bg-[#0F0F12] dark:text-gray-300",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  }
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${colors[color]}`}>{children}</span>
}

function Input({ label, ...props }: { label?: string; [key: string]: unknown }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>}
      <input className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#1F1F23] rounded-xl text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 focus:border-transparent transition-all" {...props} />
    </div>
  )
}

function Select({ label, options, ...props }: { label?: string; options: { value: string; label: string }[]; [key: string]: unknown }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>}
      <select className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#1F1F23] rounded-xl text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 focus:border-transparent transition-all appearance-none" {...props}>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 focus:ring-offset-2 ${checked ? "bg-gradient-to-r from-indigo-600 to-blue-600" : "bg-gray-200 dark:bg-[#1F1F23]"}`}
    >
      <motion.span
        initial={false}
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="inline-block h-5 w-5 rounded-full bg-white shadow-lg"
      />
    </button>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }
  if (!isOpen) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
          className={`bg-white dark:bg-[#0F0F12] rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F1F23]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function SlidePanel({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[420px] bg-white dark:bg-[#0F0F12] shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F1F23]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto h-[calc(100%-64px)]">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============== SIDEBAR COMPONENT ==============
interface NavItem {
  icon: React.ElementType
  label: string
  page: string
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

type MenuState = "full" | "collapsed" | "hidden"

function Sidebar({ activeItem, onNavigate, menuState, onToggleMenuState, onHoverChange, onSignOut }: {
  activeItem: string
  onNavigate: (page: string, id?: string) => void
  menuState: MenuState
  onToggleMenuState: () => void
  onHoverChange?: (hovered: boolean) => void
  onSignOut?: () => void
}) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["OVERVIEW", "CATALOG", "PEOPLE", "OPERATIONS", "MARKETING", "ANALYTICS", "INVENTORY", "COMMUNICATIONS", "ADMIN", "SYSTEM"])
  const [isHovered, setIsHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setIsHovered(false)
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).setIsMobileMenuOpen = setIsMobileOpen
      ;(window as any).isMobileMenuOpen = isMobileOpen
      ;(window as any).toggleMenuState = onToggleMenuState
      ;(window as any).menuState = menuState
    }
  }, [isMobileOpen, menuState, onToggleMenuState])

  const handleHover = (h: boolean) => {
    setIsHovered(h)
    onHoverChange?.(h)
  }

  const showText = menuState === "full" || (menuState === "collapsed" && isHovered) || (isMobile && isMobileOpen)
  const sidebarWidth = menuState === "hidden" ? 0 : (menuState === "collapsed" && !isHovered ? 64 : 256)

  const navGroups: NavGroup[] = [
    {
      title: "OVERVIEW",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", page: "dashboard" },
      ]
    },
    {
      title: "CATALOG",
      items: [
        { icon: Package, label: "Products", page: "products" },
        { icon: FolderOpen, label: "Categories", page: "categories" },
        { icon: Layers, label: "Modifiers", page: "modifiers" },
        { icon: Sparkles, label: "Recommendations", page: "recommendations" },
        { icon: Award, label: "Brands", page: "brands" },
        { icon: Ruler, label: "Units of Measure", page: "units-of-measure" },
      ]
    },
    {
      title: "PEOPLE",
      items: [
        { icon: Users, label: "Customers", page: "customers" },
        { icon: UserCheck, label: "Employees", page: "employees" },
      ]
    },
    {
      title: "OPERATIONS",
      items: [
        { icon: Box, label: "Locations", page: "locations" },
        { icon: UtensilsCrossed, label: "Tables", page: "tables" },
        { icon: LayoutGrid, label: "Floor Plan", page: "floor-plan-setup" },
        { icon: ChefHat, label: "Kitchen Display", page: "kds" },
        { icon: LayoutGrid, label: "Dining Areas", page: "dining-areas" },
        { icon: Armchair, label: "Table Types", page: "table-types" },
      ]
    },
    {
      title: "MARKETING",
      items: [
        { icon: Tag, label: "Promotions", page: "promotions" },
        { icon: Ticket, label: "Coupons", page: "coupons" },
        { icon: Gift, label: "Point Exchange", page: "pex" },
        { icon: PlusCircle, label: "Create Promotion", page: "promotion-create" },
        { icon: Send, label: "Bulk Issue Coupons", page: "coupon-bulk-issue" },
      ]
    },
    {
      title: "INVENTORY",
      items: [
        { icon: Warehouse, label: "Warehouses", page: "warehouses" },
        { icon: Truck, label: "Vendors", page: "vendors" },
        { icon: Receipt, label: "Vendor Payments", page: "vendor-payments" },
        { icon: ClipboardList, label: "Purchase Orders", page: "purchase-orders" },
        { icon: FileText, label: "Stock Adjustments", page: "stock-adjustments" },
        { icon: ArrowRight, label: "Stock Transfers", page: "stock-transfers" },
        { icon: BarChart2, label: "Stock", page: "stock" },
        { icon: Boxes, label: "Stock Batches", page: "stock-batches" },
        { icon: ArrowUpDown, label: "Stock Movements", page: "stock-movements" },
        { icon: FilePlus, label: "Create PO", page: "purchase-order-create" },
        { icon: LayoutList, label: "Stock Templates", page: "stock-templates" },
        { icon: AlertTriangle, label: "Expiration Alerts", page: "expiration-alerts" },
        { icon: AlertCircle, label: "Discrepancy Alerts", page: "discrepancy-alerts" },
      ]
    },
    {
      title: "COMMUNICATIONS",
      items: [
        { icon: Megaphone, label: "Announcements", page: "announcements" },
        { icon: Send, label: "Communications", page: "communications" },
        { icon: Bell, label: "Activity Feed", page: "notifications" },
        { icon: Radio, label: "Channels", page: "notification-channels" },
        { icon: FileText, label: "Msg Templates", page: "notification-templates" },
        { icon: Send, label: "Send Message", page: "notification-send" },
        { icon: Globe, label: "Platform Notices", page: "platform-announcements" },
      ]
    },
    {
      title: "ANALYTICS",
      items: [
        { icon: BarChart3, label: "Reports", page: "reports" },
      ]
    },
    {
      title: "CHAIN",
      items: [
        { icon: Link2, label: "Chain", page: "chain" },
      ]
    },
    {
      title: "SYSTEM",
      items: [
        { icon: Settings, label: "Settings", page: "settings" },
      ]
    },
  ]

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) ? prev.filter(g => g !== title) : [...prev, title]
    )
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`h-[86px] border-b border-gray-200 dark:border-[#1F1F23] flex items-center flex-shrink-0 ${showText ? "px-4 gap-3" : "justify-center"}`}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative flex-shrink-0 transition-all duration-300 ${showText ? "w-16 h-16" : "w-12 h-12"}`}
        >
          <Image
            src="/images/rts-logo-light.png"
            alt="RTS Logo"
            fill
            className="object-contain"
          />
        </motion.div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {navGroups.map((group, groupIndex) => (
          <div key={group.title}>
            {showText && (
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
              >
                <span>{group.title}</span>
                <motion.div
                  animate={{ rotate: expandedGroups.includes(group.title) ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronUp className="w-3 h-3" />
                </motion.div>
              </button>
            )}
            <AnimatePresence initial={false}>
              {(menuState !== "hidden" || isMobile) && (
                <motion.div
                  initial={showText ? { height: 0, opacity: 0 } : false}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {group.items.map((item, itemIndex) => {
                    const isActive = item.page === activeItem
                    return (
                      <motion.button
                        key={item.page}
                        custom={groupIndex * 5 + itemIndex}
                        variants={sidebarItemVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ x: 4, backgroundColor: "rgba(99, 102, 241, 0.05)" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { onNavigate(item.page); if (isMobile) setIsMobileOpen(false) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-500/10 to-blue-500/10 text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-400 to-blue-500 rounded-r-full"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <motion.div
                          animate={isActive ? { rotate: [0, -10, 10, 0] } : {}}
                          transition={{ duration: 0.4 }}
                        >
                          <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                        </motion.div>
                        <AnimatePresence>
                          {showText && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              className="whitespace-nowrap overflow-hidden"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {item.badge && showText && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                          >
                            {item.badge}
                          </motion.span>
                        )}
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-gray-200 dark:border-[#1F1F23] space-y-2">
        <button
          onClick={onToggleMenuState}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
        >
          <ChevronLeft
            className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${menuState !== "full" ? "rotate-180" : ""}`}
          />
          {showText && <span>{menuState === "full" ? "Collapse" : "Expand"}</span>}
        </button>

        <div className={`flex items-center gap-3 p-2 rounded-xl bg-gray-100 dark:bg-white/5 ${!showText ? "justify-center" : ""}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg flex-shrink-0">
            {mockUser.first_name[0]}{mockUser.last_name[0]}
          </div>
          {showText && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{mockUser.first_name} {mockUser.last_name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{mockUser.role}</p>
            </div>
          )}
          {showText && (
            <button
              onClick={onSignOut}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        <nav className={`fixed inset-y-0 left-0 z-[70] w-64 bg-white dark:bg-[#0F0F12] border-r border-gray-200 dark:border-[#1F1F23] flex flex-col transform transition-transform duration-300 ease-in-out ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {sidebarContent}
        </nav>
        {isMobileOpen && (
          <div className="fixed inset-0 bg-black/50 z-[65]" onClick={() => setIsMobileOpen(false)} />
        )}
      </>
    )
  }

  return (
    <nav
      className={`fixed inset-y-0 left-0 z-[60] flex flex-col bg-white dark:bg-[#0F0F12] overflow-hidden ${menuState === "hidden" ? "border-r-0" : "border-r border-gray-200 dark:border-[#1F1F23]"}`}
      style={{ width: sidebarWidth, transition: "width 0.3s ease-in-out" }}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
    >
      {menuState !== "hidden" && sidebarContent}
    </nav>
  )
}

// ============== HEADER COMPONENT ==============
function Header({ title, subtitle, onMobileMenuToggle }: { title: string; subtitle?: string; onMobileMenuToggle?: () => void }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#0F0F12]/80 backdrop-blur-xl border-b border-gray-200 dark:border-[#1F1F23] px-6 h-[86px] flex items-center">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {/* Menu toggle — works on all screen sizes */}
          <button
            onClick={onMobileMenuToggle}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              {title}
            </motion.h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <motion.div
            animate={{ width: searchFocused ? 280 : 220 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-[#0F0F12] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 transition-all"
            />
          </motion.div>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2.5 bg-gray-100 dark:bg-[#0F0F12] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a2a32] transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              3
            </motion.span>
          </motion.button>

          {/* Theme Toggle */}
          {mounted && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative p-2.5 bg-gray-100 dark:bg-[#0F0F12] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a2a32] transition-colors overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {theme === "dark" ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-5 h-5 text-amber-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-5 h-5 text-gray-600" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Date */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-[#0F0F12] rounded-xl">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* User Avatar in Header */}
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="hidden lg:flex flex-col items-end">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{mockUser.first_name} {mockUser.last_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize leading-tight">{mockUser.role}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg group-hover:shadow-indigo-600/30 transition-shadow">
              {mockUser.first_name[0]}{mockUser.last_name[0]}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

// ============== DASHBOARD PAGE ==============
const DASHBOARD_PERIODS: { key: ReportPeriodType; label: string }[] = [
  { key: "last_7days", label: "7 Days" },
  { key: "this_month", label: "Month" },
  { key: "this_year", label: "Year" },
]

// NUMERIC columns arrive as strings over JSON — coerce before any math/format.
function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : 0
}

function DashboardPage({ onNavigate }: { onNavigate: (page: string, id?: string) => void }) {
  const [period, setPeriod] = useState<ReportPeriodType>("last_7days")

  const summaryQuery = useQuery({
    queryKey: merchantKeys.reports.salesSummary(period),
    queryFn: () => reportsApi.salesSummary(period),
  })
  const txnQuery = useQuery({
    queryKey: merchantKeys.transactions.recent(),
    queryFn: () => transactionsApi.recent(),
  })

  const summary = summaryQuery.data?.summary ?? []
  const kpiValue = (idx: number) => toNum(summary[idx]?.value)

  const dayRows = ((summaryQuery.data?.tables?.[0]?.rows ?? []) as unknown as SalesByDayRow[])
  const productRows = ((summaryQuery.data?.tables?.[1]?.rows ?? []) as unknown as TopProductRow[]).slice(0, 5)
  const transactions = (txnQuery.data?.data ?? []).slice(0, 8)

  const kpis = [
    { title: "Total Revenue", value: kpiValue(SALES_SUMMARY_INDEX.totalTtc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), suffix: "MAD", icon: DollarSign, color: "indigo" },
    { title: "Transactions", value: kpiValue(SALES_SUMMARY_INDEX.orders).toLocaleString(), icon: ShoppingCart, color: "emerald" },
    { title: "Customers", value: kpiValue(SALES_SUMMARY_INDEX.customers).toLocaleString(), icon: Users, color: "sky" },
    { title: "Avg Order", value: kpiValue(SALES_SUMMARY_INDEX.avgOrderValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), suffix: "MAD", icon: CreditCard, color: "violet" },
  ]

  const quickActions = [
    { icon: Package, label: "Add Product", color: "emerald", page: "products" },
    { icon: UserPlus, label: "Add Customer", color: "sky", page: "customers" },
    { icon: BarChart3, label: "View Reports", color: "violet", page: "reports" },
    { icon: Tag, label: "Promotions", color: "indigo", page: "promotions" },
    { icon: Ticket, label: "Issue Coupon", color: "amber", page: "coupons" },
    { icon: Boxes, label: "Inventory", color: "rose", page: "stock" },
  ]

  const summaryError = summaryQuery.isError ? humanizeError(summaryQuery.error, "Failed to load dashboard metrics.") : null
  const loadingSummary = summaryQuery.isLoading

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {summaryError && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {summaryError}
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {summaryQuery.data ? `Period: ${summaryQuery.data.period.from} → ${summaryQuery.data.period.to}` : " "}
        </p>
        <div className="flex gap-2">
          {DASHBOARD_PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === p.key
                  ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2a2a32]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white dark:bg-[#0F0F12] rounded-2xl p-5 border border-gray-200 dark:border-[#1F1F23] shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
                className={`p-3 rounded-xl ${
                  kpi.color === "indigo" ? "bg-indigo-100 dark:bg-indigo-900/30" :
                  kpi.color === "emerald" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                  kpi.color === "sky" ? "bg-sky-100 dark:bg-sky-900/30" :
                  "bg-violet-100 dark:bg-violet-900/30"
                }`}
              >
                <kpi.icon className={`w-5 h-5 ${
                  kpi.color === "indigo" ? "text-indigo-600 dark:text-indigo-400" :
                  kpi.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                  kpi.color === "sky" ? "text-sky-600 dark:text-sky-400" :
                  "text-violet-600 dark:text-violet-400"
                }`} />
              </motion.div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{kpi.title}</p>
            <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white tabular-nums">
              {loadingSummary ? <span className="text-gray-300 dark:text-gray-600">—</span> : (
                <>
                  {kpi.value}
                  {kpi.suffix && <span className="text-sm font-normal text-gray-400 ml-1">{kpi.suffix}</span>}
                </>
              )}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <motion.div
          variants={fadeInUp}
          className="col-span-2 bg-white dark:bg-[#0F0F12] rounded-2xl p-6 border border-gray-200 dark:border-[#1F1F23] shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sales by day (TTC)</p>
            </div>
          </div>
          <div className="h-64">
            {loadingSummary ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading…</div>
            ) : dayRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">No sales in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayRows}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => { const n = Number(v); return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}` }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F0F12",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      padding: "12px 16px",
                    }}
                    formatter={(value: number) => [`${Number(value).toLocaleString()} MAD`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_ttc"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Top Products */}
        <motion.div
          variants={fadeInUp}
          className="bg-white dark:bg-[#0F0F12] rounded-2xl p-6 border border-gray-200 dark:border-[#1F1F23] shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Products</h3>
            <button onClick={() => onNavigate("reports")} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {loadingSummary ? (
              <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
            ) : productRows.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No product sales yet</p>
            ) : productRows.map((product, index) => (
              <motion.div
                key={product.product_name + index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2a2a32]/50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-lg flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.product_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{toNum(product.quantity_sold).toLocaleString()} sold</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{toNum(product.total_ttc).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">MAD</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions & Quick Actions */}
      <div className="grid grid-cols-3 gap-5">
        {/* Recent Transactions */}
        <motion.div
          variants={fadeInUp}
          className="col-span-2 bg-white dark:bg-[#0F0F12] rounded-2xl border border-gray-200 dark:border-[#1F1F23] shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F1F23]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
            <button onClick={() => onNavigate("reports")} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-3 font-medium">Transaction</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium">Items</th>
                  <th className="px-6 py-3 font-medium">Method</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {txnQuery.isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading…</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No transactions yet</td></tr>
                ) : transactions.map((txn, index) => (
                  <motion.tr
                    key={txn.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#2a2a32]/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white">{txn.transaction_number}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(txn.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{txn.items?.length ?? 0} items</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{txn.payment_method}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-gray-900 dark:text-white">{toNum(txn.total_ttc || txn.total).toFixed(2)} MAD</td>
                    <td className="px-6 py-4">
                      <Badge color={txn.status === "completed" ? "green" : txn.status === "refunded" || txn.status === "partial_refund" ? "red" : "yellow"}>{txn.status}</Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={fadeInUp}
          className="bg-white dark:bg-[#0F0F12] rounded-2xl p-6 border border-gray-200 dark:border-[#1F1F23] shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                onClick={() => onNavigate(action.page)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#2a2a32]/50 transition-all"
              >
                <div className={`p-2 rounded-lg ${
                  action.color === "indigo" ? "bg-indigo-100 dark:bg-indigo-900/30" :
                  action.color === "sky" ? "bg-sky-100 dark:bg-sky-900/30" :
                  action.color === "emerald" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                  action.color === "violet" ? "bg-violet-100 dark:bg-violet-900/30" :
                  action.color === "amber" ? "bg-amber-100 dark:bg-amber-900/30" :
                  "bg-rose-100 dark:bg-rose-900/30"
                }`}>
                  <action.icon className={`w-5 h-5 ${
                    action.color === "indigo" ? "text-indigo-600 dark:text-indigo-400" :
                    action.color === "sky" ? "text-sky-600 dark:text-sky-400" :
                    action.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                    action.color === "violet" ? "text-violet-600 dark:text-violet-400" :
                    action.color === "amber" ? "text-amber-600 dark:text-amber-400" :
                    "text-rose-600 dark:text-rose-400"
                  }`} />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ============== PRODUCTS PAGE ==============
function ProductsPage() {
  const [showModal, setShowModal] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all")

  return (
    <motion.div variants={pageTransition} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Product Catalog</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your products and categories</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" />Add Product</Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeCategory === "all" 
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm" 
              : "bg-white dark:bg-[#0F0F12] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#1F1F23] hover:border-indigo-300"
          }`}
        >
          All Products
        </button>
        {mockCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat.id 
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm" 
                : "bg-white dark:bg-[#0F0F12] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#1F1F23] hover:border-indigo-300"
            }`}
          >
            {cat.name} ({cat.product_count})
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-2xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="px-6 py-4 font-medium">Product</th>
              <th className="px-6 py-4 font-medium">SKU</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Price</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockProducts.map((product) => (
              <tr key={product.id} className="border-b border-gray-100 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#2a2a32]/30 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{product.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">{product.sku}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{product.category}</td>
                <td className="px-6 py-4 font-mono font-semibold text-gray-900 dark:text-white">{product.price.toFixed(2)} MAD</td>
                <td className="px-6 py-4">
                  <Badge color={product.is_sold_out ? "red" : "green"}>
                    {product.is_sold_out ? "Sold Out" : "Available"}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a32] rounded-lg transition-colors">
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Product">
        <div className="space-y-4">
          <Input label="Product Name" placeholder="Enter product name" />
          <Select label="Category" options={mockCategories.map(c => ({ value: c.id, label: c.name }))} />
          <Input label="Price (MAD)" type="number" placeholder="0.00" />
          <Input label="SKU" placeholder="Auto-generated" />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button>Save Product</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}

// ============== EMPLOYEES PAGE ==============
function EmployeesPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <motion.div variants={pageTransition} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage employees and permissions</p>
        </div>
        <Button onClick={() => setShowModal(true)}><UserPlus className="w-4 h-4" />Add Employee</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {mockEmployees.map((employee, index) => (
          <motion.div
            key={employee.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-[#0F0F12] rounded-2xl p-5 border border-gray-200 dark:border-[#1F1F23] shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-semibold">
                  {employee.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{employee.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{employee.email}</p>
                </div>
              </div>
              <Badge color={employee.status === "active" ? "green" : "gray"}>{employee.status}</Badge>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#1F1F23]">
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{employee.role}</span>
              <div className="flex gap-2">
                {employee.permissions.map(p => (
                  <span key={p} className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded-md">{p}</span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Employee">
        <div className="space-y-4">
          <Input label="Full Name" placeholder="Enter full name" />
          <Input label="Email" type="email" placeholder="email@example.com" />
          <Select label="Role" options={[
            { value: "cashier", label: "Cashier" },
            { value: "manager", label: "Manager" },
          ]} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button>Add Employee</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}

// ============== LOCATIONS PAGE ==============
function LocationsPage() {
  return (
    <motion.div variants={pageTransition} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Locations</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your business locations</p>
        </div>
        <Button><Plus className="w-4 h-4" />Add Location</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {mockLocations.map((location, index) => (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-[#0F0F12] rounded-2xl p-5 border border-gray-200 dark:border-[#1F1F23] shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                  <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{location.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{location.address}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#1F1F23]">
              <div className="flex items-center gap-2">
                {location.status === "online" ? (
                  <Wifi className="w-4 h-4 text-emerald-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm ${location.status === "online" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {location.status}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{location.terminals} terminals</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ============== PLACEHOLDER PAGES ==============
function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <motion.div variants={pageTransition} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center justify-center h-[60vh]">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl flex items-center justify-center mb-4"
      >
        <Zap className="w-10 h-10 text-indigo-500" />
      </motion.div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">{description}</p>
      <Button variant="secondary" className="mt-6">Coming Soon</Button>
    </motion.div>
  )
}

// ============== MAIN LAYOUT ==============
function MainLayout({ activePage, selectedId, onNavigate, onSignOut }: { activePage: string; selectedId: string | null; onNavigate: (page: string, id?: string) => void; onSignOut?: () => void }) {
  const [menuState, setMenuState] = useState<MenuState>("full")
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setMenuState("full")
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const toggleMenuState = () => {
    setMenuState(prev => prev === "full" ? "collapsed" : prev === "collapsed" ? "hidden" : "full")
  }

  const handleMenuToggle = () => {
    if (isMobile) {
      if (typeof window !== "undefined" && (window as any).setIsMobileMenuOpen) {
        const cur = (window as any).isMobileMenuOpen || false
        ;(window as any).setIsMobileMenuOpen(!cur)
      }
    } else {
      toggleMenuState()
    }
  }

  const titles: Record<string, { title: string; subtitle?: string }> = {
    dashboard: { title: "Dashboard", subtitle: "Overview of your business performance" },
    products: { title: "Products", subtitle: "Manage your product catalog" },
    customers: { title: "Customers", subtitle: "Customer management and loyalty" },
    employees: { title: "Employees", subtitle: "Team management" },
    locations: { title: "Locations", subtitle: "Business locations" },
    reports: { title: "Reports", subtitle: "Analytics and insights" },
    promotions: { title: "Promotions", subtitle: "Marketing campaigns" },
    coupons: { title: "Coupons", subtitle: "Discount codes" },
    tables: { title: "Tables", subtitle: "Restaurant table management" },
    "floor-plan-setup": { title: "Floor Plan", subtitle: "Visual layout setup" },
    modifiers: { title: "Modifiers", subtitle: "Product modifiers" },
    recommendations: { title: "Recommendations", subtitle: "AI-powered suggestions" },
    kds: { title: "Kitchen Display", subtitle: "Order management" },
    pex: { title: "Point Exchange", subtitle: "Loyalty rewards" },
    warehouses: { title: "Warehouses", subtitle: "Inventory locations" },
    vendors: { title: "Vendors", subtitle: "Supplier management" },
    "vendor-payments": { title: "Vendor Payments", subtitle: "Payment tracking" },
    "purchase-orders": { title: "Purchase Orders", subtitle: "Order management" },
    "stock-adjustments": { title: "Stock Adjustments", subtitle: "Inventory corrections" },
    "stock-transfers": { title: "Stock Transfers", subtitle: "Inter-location transfers" },
    categories: { title: "Categories", subtitle: "Product category management" },
    brands: { title: "Brands", subtitle: "Product brands" },
    "units-of-measure": { title: "Units of Measure", subtitle: "Measurement units" },
    "product-detail": { title: "Product Detail", subtitle: "Product information" },
    "customer-detail": { title: "Customer Profile", subtitle: "Customer information and history" },
    "promotion-create": { title: "Create Promotion", subtitle: "New marketing promotion" },
    "promotion-detail": { title: "Promotion Detail", subtitle: "Performance and settings" },
    "coupon-bulk-issue": { title: "Bulk Issue Coupons", subtitle: "Issue coupons to customer segments" },
    "dining-areas": { title: "Dining Areas", subtitle: "Restaurant seating areas" },
    "table-types": { title: "Table Types", subtitle: "Table configurations" },
    stock: { title: "Stock", subtitle: "Current stock position" },
    "stock-batches": { title: "Stock Batches", subtitle: "Inventory batch records" },
    "stock-movements": { title: "Stock Movements", subtitle: "Inventory movement log" },
    "purchase-order-create": { title: "Create Purchase Order", subtitle: "New order from vendor" },
    "purchase-order-detail": { title: "Purchase Order", subtitle: "Order details and status" },
    "stock-templates": { title: "Stock Templates", subtitle: "Reusable order templates" },
    "vendor-detail": { title: "Vendor Profile", subtitle: "Vendor details and history" },
    "expiration-alerts": { title: "Expiration Alerts", subtitle: "Products nearing expiry" },
    "discrepancy-alerts": { title: "Discrepancy Alerts", subtitle: "Stock count mismatches" },
    "notification-channels": { title: "Notification Channels", subtitle: "SMS, Email, WhatsApp setup" },
    "notification-templates": { title: "Message Templates", subtitle: "Reusable notification templates" },
    "notification-send": { title: "Send Notification", subtitle: "Compose and deliver messages" },
    "platform-announcements": { title: "Platform Announcements", subtitle: "System-wide notices" },
    "recommendation-items": { title: "Template Items", subtitle: "Products in recommendation template" },
    announcements: { title: "Announcements", subtitle: "Staff communications" },
    communications: { title: "Communications", subtitle: "Customer messaging" },
    notifications: { title: "Activity Feed", subtitle: "System notifications" },
    chain: { title: "Chain", subtitle: "Multi-store management" },
    settings: { title: "Settings", subtitle: "System configuration" },
  }

  const current = titles[activePage] || { title: "Page", subtitle: "" }

  const marginLeft = isMobile ? 0 : (menuState === "hidden" ? 0 : (menuState === "collapsed" && !sidebarHovered ? 64 : 256))

  const renderContent = () => {
    switch (activePage) {
      case "dashboard": return <DashboardPage onNavigate={onNavigate} />
      case "products": return <ProductsPageNew />
      case "customers": return <CustomersPage />
      case "employees": return <EmployeesPageNew />
      case "locations": return <LocationsPageNew />
      case "reports": return <ReportsPage />
      case "promotions": return <PromotionsPage />
      case "coupons": return <CouponsPage />
      case "tables": return <TableManagementPage />
      case "floor-plan-setup": return <FloorPlanSetupPage />
      case "modifiers": return <ModifiersPage />
      case "recommendations": return <RecommendationsPage />
      case "kds": return <KDSPage />
      case "pex": return <PointsExchangePage />
      case "warehouses": return <WarehousesPage />
      case "vendors": return <VendorsPage onNavigate={onNavigate} />
      case "vendor-payments": return <VendorPaymentsPage />
      case "purchase-orders": return <PurchaseOrdersPage onNavigate={onNavigate} />
      case "stock-adjustments": return <StockAdjustmentsPage />
      case "stock-transfers": return <StockTransfersPage />
      case "announcements": return <AnnouncementsPage />
      case "communications": return <CommunicationsPage />
      case "notifications": return <NotificationsPage />
      case "chain": return <ChainPage />
      case "settings": return <SettingsPage />
      case "categories": return <CategoriesPage onNavigate={onNavigate} />
      case "brands": return <BrandsPage />
      case "units-of-measure": return <UnitsOfMeasurePage />
      case "product-detail": return <ProductDetailPage id={selectedId ?? 'prod-1'} onBack={() => onNavigate('products')} />
      case "customer-detail": return <CustomerDetailPage id={selectedId ?? 'cust-1'} onBack={() => onNavigate('customers')} />
      case "promotion-create": return <PromotionCreatePage onBack={() => onNavigate('promotions')} />
      case "promotion-detail": return <PromotionDetailPage id={selectedId ?? 'promo-1'} onBack={() => onNavigate('promotions')} />
      case "coupon-bulk-issue": return <CouponBulkIssuePage onBack={() => onNavigate('coupons')} />
      case "dining-areas": return <DiningAreasPage />
      case "table-types": return <TableTypesPage />
      case "stock": return <StockPage onNavigate={onNavigate} />
      case "stock-batches": return <StockBatchesPage />
      case "stock-movements": return <StockMovementsPage />
      case "purchase-order-create": return <PurchaseOrderCreatePage onBack={() => onNavigate('purchase-orders')} />
      case "purchase-order-detail": return <PurchaseOrderDetailPage id={selectedId ?? 'po-1'} onBack={() => onNavigate('purchase-orders')} />
      case "stock-templates": return <StockTemplatesPage />
      case "vendor-detail": return <VendorDetailPage id={selectedId ?? 'vendor-1'} onBack={() => onNavigate('vendors')} />
      case "expiration-alerts": return <ExpirationAlertsPage />
      case "discrepancy-alerts": return <DiscrepancyAlertsPage />
      case "notification-channels": return <NotificationChannelsPage />
      case "notification-templates": return <NotificationTemplatesPage />
      case "notification-send": return <NotificationSendPage />
      case "platform-announcements": return <PlatformAnnouncementsPage />
      case "recommendation-items": return <RecommendationItemsPage id={selectedId ?? 'tmpl-1'} onBack={() => onNavigate('recommendations')} />
      default: return <DashboardPage onNavigate={onNavigate} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#09090f] transition-colors duration-500">
      <Sidebar
        activeItem={activePage}
        onNavigate={onNavigate}
        menuState={isMobile ? "full" : menuState}
        onToggleMenuState={toggleMenuState}
        onHoverChange={setSidebarHovered}
        onSignOut={onSignOut}
      />
      <main
        className="min-h-screen flex flex-col"
        style={{ marginLeft, transition: "margin-left 0.3s ease-in-out" }}
      >
        <Header title={current.title} subtitle={current.subtitle} onMobileMenuToggle={handleMenuToggle} />
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="p-6 flex-1"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

// ============== LOGIN SCREEN ==============
interface AccessibleBusiness { id: string; name: string; chain_role?: string }
interface LoginResult { access_token: string; refresh_token: string; user?: { role?: string } }

function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (isSuperAdmin: boolean) => void }) {
  const [loginType, setLoginType] = useState<"business" | "super">("business")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Accessible businesses (chain users)
  const [businesses, setBusinesses] = useState<AccessibleBusiness[] | null>(null)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [switchError, setSwitchError] = useState<string | null>(null)

  // Region validate (linked from this screen as a utility)
  const [regionCode, setRegionCode] = useState("")
  const [regionResult, setRegionResult] = useState<unknown | null>(null)
  const [regionLoading, setRegionLoading] = useState(false)
  const [regionError, setRegionError] = useState<string | null>(null)
  const [showRegionTool, setShowRegionTool] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setBusinesses(null)
    try {
      const endpoint = loginType === "super" ? "/api/auth/super-admin/login" : "/api/auth/login"
      const res = await apiFetch<LoginResult>(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      setToken(res.access_token)
      setRefreshToken(res.refresh_token)

      if (loginType === "business") {
        // Fetch accessible businesses for chain users
        try {
          const bizRes = await apiFetch<AccessibleBusiness[] | { data: AccessibleBusiness[] }>(
            "/api/auth/me/accessible-businesses"
          )
          const list = Array.isArray(bizRes) ? bizRes : (bizRes as { data: AccessibleBusiness[] }).data ?? []
          if (list.length > 1) {
            // Chain user — let them pick which business to enter
            setBusinesses(list)
            setLoading(false)
            return
          }
        } catch {
          // Not a chain user or endpoint not applicable — proceed normally
        }
        onLoginSuccess(false)
      } else {
        onLoginSuccess(true)
      }
    } catch (e: any) {
      setError(e.message ?? "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchBusiness = async (businessId: string) => {
    setSwitchingId(businessId)
    setSwitchError(null)
    try {
      const res = await apiFetch<LoginResult>("/api/auth/switch-business", {
        method: "POST",
        body: JSON.stringify({ business_id: businessId }),
      })
      setToken(res.access_token)
      if (res.refresh_token) setRefreshToken(res.refresh_token)
      onLoginSuccess(false)
    } catch (e: any) {
      setSwitchError(e.message ?? "Failed to switch business")
    } finally {
      setSwitchingId(null)
    }
  }

  const handleValidateRegion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regionCode.trim()) return
    setRegionLoading(true)
    setRegionError(null)
    setRegionResult(null)
    try {
      const res = await apiFetch("/api/auth/regions/validate", {
        method: "POST",
        body: JSON.stringify({ region_code: regionCode.trim() }),
      })
      setRegionResult(res)
    } catch (e: any) {
      setRegionError(e.message ?? "Validation failed")
    } finally {
      setRegionLoading(false)
    }
  }

  // If we have a list of businesses, show the picker instead of the form
  if (businesses) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#09090f] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full max-w-md p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Select Business</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">You have access to multiple businesses</p>
          </div>
          {switchError && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{switchError}</p>
          )}
          <div className="space-y-3">
            {businesses.map(biz => (
              <button
                key={biz.id}
                onClick={() => handleSwitchBusiness(biz.id)}
                disabled={switchingId === biz.id}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-[#1F1F23] hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left disabled:opacity-60"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {biz.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{biz.name}</p>
                  {biz.chain_role && (
                    <p className="text-xs text-gray-400 capitalize">{biz.chain_role}</p>
                  )}
                </div>
                {switchingId === biz.id && (
                  <span className="animate-spin w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setBusinesses(null); clearToken() }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#09090f] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full max-w-md p-8 space-y-6">
        {/* Logo / Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POS Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
        </div>

        {/* Login type tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-[#0F0F12] p-1 rounded-xl">
          <button
            onClick={() => { setLoginType("business"); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginType === "business" ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Building2 className="w-4 h-4" />
              Business Admin
            </div>
          </button>
          <button
            onClick={() => { setLoginType("super"); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginType === "super" ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Shield className="w-4 h-4" />
              Super Admin
            </div>
          </button>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#1F1F23] rounded-xl text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 border border-gray-200 dark:border-[#1F1F23] rounded-xl text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Signing in…
              </>
            ) : (
              `Sign in as ${loginType === "super" ? "Super Admin" : "Business Admin"}`
            )}
          </button>
        </form>

        {/* Region Validate utility (collapsed by default) */}
        <div className="border-t border-gray-200 dark:border-[#1F1F23] pt-4">
          <button
            onClick={() => setShowRegionTool(p => !p)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-full"
          >
            <MapPin className="w-3.5 h-3.5" />
            {showRegionTool ? "Hide" : "Validate region address"}
          </button>
          {showRegionTool && (
            <form onSubmit={handleValidateRegion} className="mt-3 space-y-2">
              <input
                type="text"
                required
                value={regionCode}
                onChange={e => setRegionCode(e.target.value)}
                placeholder="Region code (e.g. mr-r-01)"
                className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg text-xs bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {regionError && <p className="text-xs text-red-500">{regionError}</p>}
              {regionResult && (
                <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
                  Valid: {JSON.stringify(regionResult)}
                </p>
              )}
              <button
                type="submit"
                disabled={regionLoading}
                className="px-3 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                {regionLoading ? "Validating…" : "Validate"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ============== MAIN APP ==============
const PAGES = [
  "login", "dashboard", "products", "customers", "employees", "locations",
  "reports", "promotions", "coupons", "tables", "floor-plan-setup", "modifiers",
  "recommendations", "kds", "pex", "warehouses", "vendors",
  "vendor-payments", "purchase-orders", "stock-adjustments", "stock-transfers",
  "announcements", "communications", "notifications", "chain", "settings",
  "categories", "brands", "units-of-measure", "product-detail",
  "customer-detail", "promotion-create", "promotion-detail", "coupon-bulk-issue",
  "dining-areas", "table-types", "stock", "stock-batches", "stock-movements",
  "purchase-order-create", "purchase-order-detail", "stock-templates",
  "vendor-detail", "expiration-alerts", "discrepancy-alerts",
  "notification-channels", "notification-templates", "notification-send",
  "platform-announcements", "recommendation-items",
] as const
type Page = typeof PAGES[number]

export default function App() {
  const router = useRouter()
  const [page, setPage] = useState<Page>("dashboard")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // On mount, restore the token then verify the identity with the backend.
  // A token alone is NOT proof of a merchant session: a leftover super-admin
  // token (or an expired one) must never render the merchant shell. We resolve
  // the real identity via /api/auth/me and route accordingly:
  //   - no/invalid token  → clear it, show the login screen
  //   - platform operator → send to the isolated /super-admin console
  //   - merchant          → render the merchant dashboard
  useEffect(() => {
    let cancelled = false
    loadToken()
    if (!getToken()) {
      setAuthChecked(true)
      return
    }
    apiFetch<Me>("/api/auth/me")
      .then((me) => {
        if (cancelled) return
        if (isPlatformOperator(me)) {
          router.replace("/super-admin")
          return
        }
        setIsAuthenticated(true)
      })
      .catch(() => {
        if (cancelled) return
        clearToken()
        setIsAuthenticated(false)
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true)
      })
    return () => { cancelled = true }
  }, [router])

  const navigate = (newPage: string, id?: string) => {
    setPage(newPage as Page)
    setSelectedId(id ?? null)
  }

  const handleSignOut = async () => {
    try { await apiFetch("/api/auth/logout", { method: "POST" }) } catch {}
    clearToken()
    setIsAuthenticated(false)
    setPage("dashboard")
  }

  // Super admins live in their own isolated route segment (/super-admin).
  const handleLoginSuccess = (superAdmin: boolean) => {
    if (superAdmin) {
      router.push("/super-admin")
      return
    }
    setIsAuthenticated(true)
    setPage("dashboard")
  }

  if (!authChecked) return null  // avoid flash before localStorage check

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <QueryProvider>
      <MainLayout activePage={page} selectedId={selectedId} onNavigate={navigate} onSignOut={handleSignOut} />
    </QueryProvider>
  )
}

