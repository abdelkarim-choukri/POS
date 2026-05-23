"use client"

import { useState } from "react"
import {
  Settings,
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Palette,
  Globe,
  Receipt,
  Printer,
  Mail,
  Clock,
  Save,
  ChevronRight,
  Utensils,
  Link2,
  MapPin,
  Plus,
  Trash2,
  FileText,
} from "lucide-react"

// ==================== REUSABLE COMPONENTS ====================
function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
        checked ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-[#1F1F23]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

function Button({ children, variant = "primary", className = "", onClick }: { 
  children: React.ReactNode; 
  variant?: "primary" | "secondary"; 
  className?: string; 
  onClick?: () => void;
}) {
  const base = "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
  }
  return <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick}>{children}</button>
}

// ==================== MAIN COMPONENT ====================
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("business")
  const [settings, setSettings] = useState({
    // Business
    business_name: "Café Marrakech",
    business_email: "contact@cafemarrakech.ma",
    business_phone: "+212 5 22 123 456",
    business_address: "123 Mohammed V Boulevard, Casablanca",
    tax_id: "MA123456789",
    currency: "MAD",
    timezone: "Africa/Casablanca",
    
    // Fiscal fields (Morocco-specific)
    ice_number: "001234567000089",
    if_number: "12345678",
    taxe_professionnelle: "12345678",
    cnss_number: "9876543",
    rc_number: "123456",
    fiscal_year_start: "01",
    default_tva_rate: "20",
    
    // Receipt
    receipt_header: "Welcome to Café Marrakech",
    receipt_footer: "Thank you for your visit!",
    show_tax_breakdown: true,
    print_kitchen_ticket: true,
    auto_print: true,
    
    // Notifications
    email_daily_report: true,
    email_low_stock: true,
    email_large_orders: false,
    push_new_orders: true,
    push_void_alerts: true,
    
    // Security
    require_pin_for_void: true,
    require_pin_for_refund: true,
    require_pin_for_discount: false,
    session_timeout: 30,
    
    // Display
    theme: "system",
    language: "en",
    date_format: "DD/MM/YYYY",
    show_product_images: true,
    
    // Operations
    daily_settlement_cutoff: "02:00",
    points_earn_divisor: 10,
    promotion_stacking_mode: "best_only" as "best_only" | "stack_all",
    expiration_alert_lead_days: 7,
    kitchen_target_time: 15,
    table_default_duration: 60,
    auto_course_fire: false,
    require_table_for_dine_in: true,
    enable_table_reservations: true,
    max_reservation_days_ahead: 30,
    order_hold_timeout: 10,
    
    // Chain
    is_chain: true,
    chain_name: "Marrakech Group",
    allow_inter_location_transfer: true,
    centralized_menu: true,
    centralized_pricing: false,
    allow_local_promotions: true,
  })

  const sections = [
    { id: "business", label: "Business Profile", icon: Building2 },
    { id: "fiscal", label: "Fiscal Settings", icon: FileText },
    { id: "operations", label: "Operations", icon: Utensils },
    { id: "receipt", label: "Receipt Settings", icon: Receipt },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "display", label: "Display & Language", icon: Palette },
    { id: "integrations", label: "Integrations", icon: Globe },
    { id: "chain", label: "Chain Settings", icon: Link2 },
    { id: "billing", label: "Billing & Plan", icon: CreditCard },
  ]

  const [chainLocations, setChainLocations] = useState([
    { id: 1, name: "Café Marrakech - Casablanca", address: "123 Mohammed V Blvd", status: "active" },
    { id: 2, name: "Café Marrakech - Rabat", address: "45 Avenue Hassan II", status: "active" },
    { id: 3, name: "Café Marrakech - Marrakech", address: "78 Gueliz", status: "inactive" },
  ])

  const updateSetting = (key: string, value: string | boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your business preferences and configurations</p>
        </div>
        <Button variant="primary">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a20]"
                }`}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
                <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${activeSection === section.id ? "rotate-90" : ""}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-6">
            {/* Business Profile */}
            {activeSection === "business" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Business Profile</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Basic information about your business</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={settings.business_name}
                      onChange={(e) => updateSetting("business_name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={settings.business_email}
                      onChange={(e) => updateSetting("business_email", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={settings.business_phone}
                      onChange={(e) => updateSetting("business_phone", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ID</label>
                    <input
                      type="text"
                      value={settings.tax_id}
                      onChange={(e) => updateSetting("tax_id", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <textarea
                    value={settings.business_address}
                    onChange={(e) => updateSetting("business_address", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                    <select
                      value={settings.currency}
                      onChange={(e) => updateSetting("currency", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    >
                      <option value="MAD">MAD - Moroccan Dirham</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => updateSetting("timezone", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    >
                      <option value="Africa/Casablanca">Africa/Casablanca (GMT+1)</option>
                      <option value="Europe/Paris">Europe/Paris (GMT+2)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Fiscal Settings */}
            {activeSection === "fiscal" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Fiscal Settings</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Morocco-specific tax and fiscal registration numbers</p>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-300">These identifiers are required for legal invoicing in Morocco. Please ensure accuracy.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ICE Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.ice_number}
                      onChange={(e) => updateSetting("ice_number", e.target.value)}
                      placeholder="15-digit ICE number"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 font-mono"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Identifiant Commun de l&apos;Entreprise</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      IF Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.if_number}
                      onChange={(e) => updateSetting("if_number", e.target.value)}
                      placeholder="Identifiant Fiscal"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 font-mono"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Identifiant Fiscal — required on all TVA invoices</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Taxe Professionnelle <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.taxe_professionnelle}
                      onChange={(e) => updateSetting("taxe_professionnelle", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 font-mono"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Numéro de patente</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNSS Number</label>
                    <input
                      type="text"
                      value={settings.cnss_number}
                      onChange={(e) => updateSetting("cnss_number", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 font-mono"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Social Security registration</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RC Number</label>
                    <input
                      type="text"
                      value={settings.rc_number}
                      onChange={(e) => updateSetting("rc_number", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 font-mono"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Registre de Commerce</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fiscal Year Start</label>
                    <select
                      value={settings.fiscal_year_start}
                      onChange={(e) => updateSetting("fiscal_year_start", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    >
                      <option value="01">January</option>
                      <option value="04">April</option>
                      <option value="07">July</option>
                      <option value="10">October</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default TVA Rate</label>
                    <select
                      value={settings.default_tva_rate}
                      onChange={(e) => updateSetting("default_tva_rate", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    >
                      <option value="20">20% (Standard)</option>
                      <option value="14">14% (Reduced)</option>
                      <option value="10">10% (Reduced)</option>
                      <option value="7">7% (Reduced)</option>
                      <option value="0">0% (Exempt)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">TVA Declaration Status</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Last Declaration: December 2023</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Next Due: January 20, 2024</p>
                    </div>
                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">Up to date</span>
                  </div>
                </div>
              </div>
            )}

            {/* Operations Settings */}
            {activeSection === "operations" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Operations</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Kitchen, table management, and order flow settings</p>
                </div>

                {/* Business Rules Section */}
                <div className="border border-gray-200 dark:border-[#1F1F23] rounded-xl p-5 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Business Rules
                    </h3>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300">These settings affect financial reporting and loyalty calculations. Changes take effect on the next transaction.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Daily Settlement Cutoff Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Settlement Cutoff Time</label>
                      <input
                        type="time"
                        value={settings.daily_settlement_cutoff}
                        onChange={(e) => updateSetting("daily_settlement_cutoff", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                      />
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Transactions before this time count toward the previous business day. Affects daily ops reports only — TVA reports always use calendar date.</p>
                    </div>

                    {/* Points Earn Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points Earn Rate</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">1 point per</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={settings.points_earn_divisor}
                          onChange={(e) => updateSetting("points_earn_divisor", parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 text-center"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">MAD spent</span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Set to 0 to disable points earning entirely</p>
                    </div>
                  </div>

                  {/* Promotion Stacking Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Promotion Stacking Mode</label>
                    <div className="space-y-3">
                      <label
                        className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                          settings.promotion_stacking_mode === "best_only"
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                            : "border-gray-200 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#1a1a20]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="promotion_stacking_mode"
                          value="best_only"
                          checked={settings.promotion_stacking_mode === "best_only"}
                          onChange={(e) => updateSetting("promotion_stacking_mode", e.target.value)}
                          className="mt-1 accent-indigo-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Best Offer Only</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Apply only the highest single discount to each order</p>
                        </div>
                      </label>
                      <label
                        className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                          settings.promotion_stacking_mode === "stack_all"
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                            : "border-gray-200 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#1a1a20]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="promotion_stacking_mode"
                          value="stack_all"
                          checked={settings.promotion_stacking_mode === "stack_all"}
                          onChange={(e) => updateSetting("promotion_stacking_mode", e.target.value)}
                          className="mt-1 accent-indigo-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Stack All</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Apply all applicable discounts cumulatively</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Expiration Alert Lead Days */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiration Alert Lead Days</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={settings.expiration_alert_lead_days}
                      onChange={(e) => updateSetting("expiration_alert_lead_days", parseInt(e.target.value) || 1)}
                      className="w-32 px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Send expiration alert when a batch expires within X days. Alerts are generated by the nightly scan.</p>
                  </div>
                </div>

                {/* Kitchen Settings */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Utensils className="w-4 h-4" />
                    Kitchen Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Prep Time (minutes)</label>
                        <input
                          type="number"
                          value={settings.kitchen_target_time}
                          onChange={(e) => updateSetting("kitchen_target_time", parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Orders exceeding this time will be flagged</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Hold Timeout (minutes)</label>
                        <input
                          type="number"
                          value={settings.order_hold_timeout}
                          onChange={(e) => updateSetting("order_hold_timeout", parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Max time orders can be held before auto-fire</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Auto-Fire Courses</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Automatically send next course when previous is served</p>
                      </div>
                      <Toggle checked={settings.auto_course_fire} onChange={(val) => updateSetting("auto_course_fire", val)} />
                    </div>
                  </div>
                </div>

                {/* Table Management */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Table Management
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Table Duration (minutes)</label>
                        <input
                          type="number"
                          value={settings.table_default_duration}
                          onChange={(e) => updateSetting("table_default_duration", parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Reservation Days Ahead</label>
                        <input
                          type="number"
                          value={settings.max_reservation_days_ahead}
                          onChange={(e) => updateSetting("max_reservation_days_ahead", parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Require Table for Dine-In</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Must select table before adding items for dine-in orders</p>
                      </div>
                      <Toggle checked={settings.require_table_for_dine_in} onChange={(val) => updateSetting("require_table_for_dine_in", val)} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Enable Table Reservations</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Allow customers to reserve tables in advance</p>
                      </div>
                      <Toggle checked={settings.enable_table_reservations} onChange={(val) => updateSetting("enable_table_reservations", val)} />
                    </div>
                  </div>
                </div>

                {/* Order Types */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Active Order Types</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {["Dine-In", "Takeaway", "Delivery", "Drive-Through"].map((type) => (
                      <label key={type} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg cursor-pointer">
                        <input type="checkbox" defaultChecked={type !== "Drive-Through"} className="w-4 h-4 text-indigo-500 rounded" />
                        <span className="text-sm text-gray-900 dark:text-white">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Receipt Settings */}
            {activeSection === "receipt" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Receipt Settings</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customize your receipt appearance and printing</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Header</label>
                  <textarea
                    value={settings.receipt_header}
                    onChange={(e) => updateSetting("receipt_header", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Footer</label>
                  <textarea
                    value={settings.receipt_footer}
                    onChange={(e) => updateSetting("receipt_footer", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Show Tax Breakdown</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Display itemized tax on receipts</p>
                    </div>
                    <Toggle checked={settings.show_tax_breakdown} onChange={(val) => updateSetting("show_tax_breakdown", val)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Print Kitchen Ticket</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Automatically print kitchen orders</p>
                    </div>
                    <Toggle checked={settings.print_kitchen_ticket} onChange={(val) => updateSetting("print_kitchen_ticket", val)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Auto-Print Customer Receipt</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Print receipt after each transaction</p>
                    </div>
                    <Toggle checked={settings.auto_print} onChange={(val) => updateSetting("auto_print", val)} />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeSection === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Notifications</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Configure how you receive alerts and updates</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Notifications
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Daily Sales Report</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Receive daily summary at end of business day</p>
                      </div>
                      <Toggle checked={settings.email_daily_report} onChange={(val) => updateSetting("email_daily_report", val)} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Low Stock Alerts</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when items fall below threshold</p>
                      </div>
                      <Toggle checked={settings.email_low_stock} onChange={(val) => updateSetting("email_low_stock", val)} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Large Orders</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Alert for orders above 1000 MAD</p>
                      </div>
                      <Toggle checked={settings.email_large_orders} onChange={(val) => updateSetting("email_large_orders", val)} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Push Notifications
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">New Orders</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Real-time notification for new orders</p>
                      </div>
                      <Toggle checked={settings.push_new_orders} onChange={(val) => updateSetting("push_new_orders", val)} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Void Alerts</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notify when transactions are voided</p>
                      </div>
                      <Toggle checked={settings.push_void_alerts} onChange={(val) => updateSetting("push_void_alerts", val)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {activeSection === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Security</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Configure security and access controls</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Require PIN for Void</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Manager PIN required to void transactions</p>
                    </div>
                    <Toggle checked={settings.require_pin_for_void} onChange={(val) => updateSetting("require_pin_for_void", val)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Require PIN for Refund</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Manager PIN required to process refunds</p>
                    </div>
                    <Toggle checked={settings.require_pin_for_refund} onChange={(val) => updateSetting("require_pin_for_refund", val)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Require PIN for Discount</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Manager PIN required to apply discounts</p>
                    </div>
                    <Toggle checked={settings.require_pin_for_discount} onChange={(val) => updateSetting("require_pin_for_discount", val)} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Timeout (minutes)</label>
                  <select
                    value={settings.session_timeout}
                    onChange={(e) => updateSetting("session_timeout", parseInt(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={0}>Never</option>
                  </select>
                </div>
              </div>
            )}

            {/* Display & Language */}
            {activeSection === "display" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Display & Language</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customize appearance and localization</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
                    <select
                      value={settings.theme}
                      onChange={(e) => updateSetting("theme", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    >
                      <option value="system">System Default</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) => updateSetting("language", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
                    <select
                      value={settings.date_format}
                      onChange={(e) => updateSetting("date_format", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Show Product Images</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Display product thumbnails in POS interface</p>
                  </div>
                  <Toggle checked={settings.show_product_images} onChange={(val) => updateSetting("show_product_images", val)} />
                </div>
              </div>
            )}

            {/* Integrations */}
            {activeSection === "integrations" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Integrations</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Connect third-party services and APIs</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Payment Gateway</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">Connected to CMI</p>
                      </div>
                    </div>
                    <Button variant="secondary" className="!py-1.5 !px-3 !text-xs">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Accounting Software</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Not connected</p>
                      </div>
                    </div>
                    <Button variant="secondary" className="!py-1.5 !px-3 !text-xs">Connect</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Online Ordering</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">Active</p>
                      </div>
                    </div>
                    <Button variant="secondary" className="!py-1.5 !px-3 !text-xs">Manage</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Chain Settings */}
            {activeSection === "chain" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Chain Settings</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Multi-location management and synchronization</p>
                </div>

                {/* Chain Status */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-[#1F1F23] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white dark:bg-[#0F0F12] rounded-lg flex items-center justify-center shadow-sm">
                        <Link2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{settings.chain_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{chainLocations.filter(l => l.status === "active").length} active locations</p>
                      </div>
                    </div>
                    <Toggle checked={settings.is_chain} onChange={(val) => updateSetting("is_chain", val)} />
                  </div>
                </div>

                {settings.is_chain && (
                  <>
                    {/* Chain Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chain Name</label>
                      <input
                        type="text"
                        value={settings.chain_name}
                        onChange={(e) => updateSetting("chain_name", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                      />
                    </div>

                    {/* Locations */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Locations</h3>
                        <Button variant="secondary" className="!py-1.5 !px-3 !text-xs">
                          <Plus className="w-3 h-3 mr-1" />
                          Add Location
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {chainLocations.map((location) => (
                          <div key={location.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white dark:bg-[#1F1F23] rounded-lg flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{location.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{location.address}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                location.status === "active" 
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-[#1F1F23] text-gray-500 dark:text-gray-400"
                              }`}>
                                {location.status}
                              </span>
                              <Button variant="secondary" className="!py-1 !px-2 !text-xs">Edit</Button>
                              <button className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Synchronization Settings */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Synchronization Settings</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Centralized Menu</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Sync menu items across all locations</p>
                          </div>
                          <Toggle checked={settings.centralized_menu} onChange={(val) => updateSetting("centralized_menu", val)} />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Centralized Pricing</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Use same prices at all locations</p>
                          </div>
                          <Toggle checked={settings.centralized_pricing} onChange={(val) => updateSetting("centralized_pricing", val)} />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Allow Local Promotions</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Let locations create their own promotions</p>
                          </div>
                          <Toggle checked={settings.allow_local_promotions} onChange={(val) => updateSetting("allow_local_promotions", val)} />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Inter-Location Transfers</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Allow inventory transfers between locations</p>
                          </div>
                          <Toggle checked={settings.allow_inter_location_transfer} onChange={(val) => updateSetting("allow_inter_location_transfer", val)} />
                        </div>
                      </div>
                    </div>

                    {/* Chain Reports Access */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-blue-900 dark:text-blue-300">Consolidated Reports</p>
                          <p className="text-sm text-blue-700 dark:text-blue-400">View combined reports for all locations</p>
                        </div>
                        <Button variant="secondary" className="!py-1.5 !px-3 !text-xs">View Reports</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Billing */}
            {activeSection === "billing" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Billing & Plan</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage your subscription and payment method</p>
                </div>

                <div className="p-6 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm opacity-90">Current Plan</p>
                      <p className="text-2xl font-bold">Professional</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-90">Monthly</p>
                      <p className="text-2xl font-bold">499 MAD</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>5 Locations</span>
                    <span>|</span>
                    <span>15 Terminals</span>
                    <span>|</span>
                    <span>Unlimited Employees</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="secondary" className="flex-1">Change Plan</Button>
                  <Button variant="secondary" className="flex-1">Update Payment Method</Button>
                  <Button variant="secondary" className="flex-1">View Invoices</Button>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Next billing date: <span className="font-medium text-gray-900 dark:text-white">February 1, 2024</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


