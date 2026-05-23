"use client"

import { useState } from "react"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  User,
  Shield,
  Clock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Calendar,
  Filter,
} from "lucide-react"

// ============== TYPES ==============
interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  role: "owner" | "manager" | "cashier"
  status: "active" | "inactive"
  pin: string
  avatar_url?: string
  permissions: {
    can_void: boolean
    can_refund: boolean
    can_apply_manual_discount: boolean
    can_view_reports: boolean
    can_receive_stock: boolean
    can_approve_adjustments: boolean
    can_open_table_session: boolean
    can_transfer_table_items: boolean
    can_force_close_table: boolean
    can_redeem_points: boolean
  }
  created_at: string
  last_clock_in?: string
}

interface ClockEntry {
  id: string
  employee_id: string
  clock_in: string
  clock_out?: string
  duration_minutes?: number
}

// ============== MOCK DATA ==============
const mockEmployees: Employee[] = [
  {
    id: "emp-1",
    first_name: "Ahmed",
    last_name: "Benali",
    email: "ahmed@cafe.ma",
    role: "owner",
    status: "active",
    pin: "1234",
    permissions: {
      can_void: true,
      can_refund: true,
      can_apply_manual_discount: true,
      can_view_reports: true,
      can_receive_stock: true,
      can_approve_adjustments: true,
      can_open_table_session: true,
      can_transfer_table_items: true,
      can_force_close_table: true,
      can_redeem_points: true,
    },
    created_at: "2024-01-15",
    last_clock_in: "2024-03-15 08:30",
  },
  {
    id: "emp-2",
    first_name: "Sara",
    last_name: "Idrissi",
    email: "sara@cafe.ma",
    role: "manager",
    status: "active",
    pin: "5678",
    permissions: {
      can_void: true,
      can_refund: true,
      can_apply_manual_discount: true,
      can_view_reports: true,
      can_receive_stock: true,
      can_approve_adjustments: false,
      can_open_table_session: true,
      can_transfer_table_items: true,
      can_force_close_table: true,
      can_redeem_points: true,
    },
    created_at: "2024-02-01",
    last_clock_in: "2024-03-15 07:45",
  },
  {
    id: "emp-3",
    first_name: "Youssef",
    last_name: "Amrani",
    email: "youssef@cafe.ma",
    role: "cashier",
    status: "active",
    pin: "9012",
    permissions: {
      can_void: true,
      can_refund: false,
      can_apply_manual_discount: false,
      can_view_reports: false,
      can_receive_stock: false,
      can_approve_adjustments: false,
      can_open_table_session: true,
      can_transfer_table_items: false,
      can_force_close_table: false,
      can_redeem_points: true,
    },
    created_at: "2024-02-15",
    last_clock_in: "2024-03-15 09:00",
  },
  {
    id: "emp-4",
    first_name: "Fatima",
    last_name: "Zahra",
    email: "fatima@cafe.ma",
    role: "cashier",
    status: "inactive",
    pin: "3456",
    permissions: {
      can_void: false,
      can_refund: false,
      can_apply_manual_discount: false,
      can_view_reports: false,
      can_receive_stock: false,
      can_approve_adjustments: false,
      can_open_table_session: true,
      can_transfer_table_items: false,
      can_force_close_table: false,
      can_redeem_points: false,
    },
    created_at: "2024-01-20",
  },
  {
    id: "emp-5",
    first_name: "Karim",
    last_name: "Bennani",
    email: "karim@cafe.ma",
    role: "cashier",
    status: "active",
    pin: "7890",
    permissions: {
      can_void: true,
      can_refund: false,
      can_apply_manual_discount: false,
      can_view_reports: false,
      can_receive_stock: true,
      can_approve_adjustments: false,
      can_open_table_session: true,
      can_transfer_table_items: true,
      can_force_close_table: false,
      can_redeem_points: true,
    },
    created_at: "2024-03-01",
    last_clock_in: "2024-03-15 08:15",
  },
]

const mockClockEntries: ClockEntry[] = [
  { id: "clk-1", employee_id: "emp-2", clock_in: "2024-03-15 07:45", clock_out: "2024-03-15 16:30", duration_minutes: 525 },
  { id: "clk-2", employee_id: "emp-2", clock_in: "2024-03-14 08:00", clock_out: "2024-03-14 17:00", duration_minutes: 540 },
  { id: "clk-3", employee_id: "emp-2", clock_in: "2024-03-13 07:30", clock_out: "2024-03-13 16:00", duration_minutes: 510 },
  { id: "clk-4", employee_id: "emp-2", clock_in: "2024-03-12 08:15", clock_out: "2024-03-12 17:30", duration_minutes: 555 },
  { id: "clk-5", employee_id: "emp-2", clock_in: "2024-03-11 07:45", clock_out: "2024-03-11 16:15", duration_minutes: 510 },
]

// ============== REUSABLE COMPONENTS ==============
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" | "indigo" | "purple" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md"
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a32]",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  }
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" }
  return <button className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props} />
    </div>
  )
}

function Select({ label, options, ...props }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <select className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 dark:border-[#2a2a33] text-indigo-500 focus:ring-gray-900 dark:focus:ring-gray-300"
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  if (!isOpen) return null
  const sizeClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function SlidePanel({ isOpen, onClose, title, children, width = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: "md" | "lg" | "xl" }) {
  if (!isOpen) return null
  const widthClasses = { md: "w-[480px]", lg: "w-[560px]", xl: "w-[640px]" }
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full ${widthClasses[width]} bg-white dark:bg-[#0F0F12] shadow-2xl border-l border-gray-200 dark:border-[#1F1F23] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-hide">{children}</div>
      </div>
    </div>
  )
}

// ============== PERMISSION GROUPS ==============
const permissionGroups = [
  {
    title: "Sales",
    permissions: [
      { key: "can_void", label: "Can void transactions/items" },
      { key: "can_refund", label: "Can issue refunds" },
      { key: "can_apply_manual_discount", label: "Can apply manual discounts" },
    ]
  },
  {
    title: "Reports",
    permissions: [
      { key: "can_view_reports", label: "Can view reports" },
    ]
  },
  {
    title: "Inventory",
    permissions: [
      { key: "can_receive_stock", label: "Can receive stock" },
      { key: "can_approve_adjustments", label: "Can approve stock adjustments" },
    ]
  },
  {
    title: "Tables",
    permissions: [
      { key: "can_open_table_session", label: "Can open table sessions" },
      { key: "can_transfer_table_items", label: "Can transfer table items" },
      { key: "can_force_close_table", label: "Can force close tables" },
    ]
  },
  {
    title: "Loyalty",
    permissions: [
      { key: "can_redeem_points", label: "Can redeem customer points" },
    ]
  },
]

// ============== MAIN PAGE COMPONENT ==============
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "manager" | "cashier">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  
  // Modals
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showEditEmployee, setShowEditEmployee] = useState(false)
  const [showClockHistory, setShowClockHistory] = useState(false)
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  // Form state
  const [employeeForm, setEmployeeForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "cashier" as "owner" | "manager" | "cashier",
    pin: "",
    password: "",
    permissions: {
      can_void: false,
      can_refund: false,
      can_apply_manual_discount: false,
      can_view_reports: false,
      can_receive_stock: false,
      can_approve_adjustments: false,
      can_open_table_session: true,
      can_transfer_table_items: false,
      can_force_close_table: false,
      can_redeem_points: false,
    }
  })

  // Clock history state
  const [clockDateRange, setClockDateRange] = useState({ from: "2024-03-01", to: "2024-03-15" })

  // Filtered employees
  const filteredEmployees = employees.filter(e => {
    if (searchQuery && !`${e.first_name} ${e.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) && !e.email.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (roleFilter !== "all" && e.role !== roleFilter) return false
    if (statusFilter !== "all" && e.status !== statusFilter) return false
    return true
  })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner": return "purple"
      case "manager": return "blue"
      case "cashier": return "gray"
      default: return "gray"
    }
  }

  const handleAddEmployee = () => {
    setEmployeeForm({
      first_name: "",
      last_name: "",
      email: "",
      role: "cashier",
      pin: "",
      password: "",
      permissions: {
        can_void: false,
        can_refund: false,
        can_apply_manual_discount: false,
        can_view_reports: false,
        can_receive_stock: false,
        can_approve_adjustments: false,
        can_open_table_session: true,
        can_transfer_table_items: false,
        can_force_close_table: false,
        can_redeem_points: false,
      }
    })
    setShowAddEmployee(true)
  }

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setEmployeeForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      role: employee.role,
      pin: employee.pin,
      password: "",
      permissions: { ...employee.permissions }
    })
    setShowEditEmployee(true)
  }

  const handleViewClockHistory = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowClockHistory(true)
  }

  const handleToggleStatus = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowStatusConfirm(true)
  }

  const confirmStatusToggle = () => {
    if (selectedEmployee) {
      setEmployees(prev => prev.map(e => 
        e.id === selectedEmployee.id ? { ...e, status: e.status === "active" ? "inactive" : "active" } : e
      ))
    }
    setShowStatusConfirm(false)
    setSelectedEmployee(null)
  }

  const updatePermission = (key: string, value: boolean) => {
    setEmployeeForm(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: value }
    }))
  }

  // Calculate total hours for clock history
  const employeeClockEntries = mockClockEntries.filter(e => e.employee_id === selectedEmployee?.id)
  const totalMinutes = employeeClockEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your team and permissions</p>
        </div>
        <Button variant="primary" onClick={handleAddEmployee}>
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
            />
          </div>
          <Select
            options={[
              { value: "all", label: "All Roles" },
              { value: "owner", label: "Owner" },
              { value: "manager", label: "Manager" },
              { value: "cashier", label: "Cashier" },
            ]}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          />
          <Select
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          />
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="text-center p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-right p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredEmployees.map((employee) => (
              <tr key={employee.id} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 ${employee.status === 'inactive' ? 'opacity-60' : ''}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {employee.last_clock_in ? `Last seen: ${employee.last_clock_in}` : "Never clocked in"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{employee.email}</span>
                </td>
                <td className="p-4">
                  <Badge color={getRoleBadgeColor(employee.role) as "green" | "red" | "yellow" | "blue" | "gray" | "indigo" | "purple"}>
                    {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                  </Badge>
                </td>
                <td className="p-4 text-center">
                  <Badge color={employee.status === "active" ? "green" : "gray"}>
                    {employee.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleViewClockHistory(employee)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      title="Clock History"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditEmployee(employee)}
                      className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(employee)}
                      className={`p-2 rounded-lg ${employee.status === 'active' ? 'text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                      title={employee.status === "active" ? "Deactivate" : "Activate"}
                    >
                      {employee.status === "active" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No employees found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search or filters</p>
            <Button variant="primary" onClick={handleAddEmployee}>
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal isOpen={showAddEmployee} onClose={() => setShowAddEmployee(false)} title="Add Employee" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" placeholder="Ahmed" value={employeeForm.first_name} onChange={(e) => setEmployeeForm(f => ({ ...f, first_name: e.target.value }))} />
            <Input label="Last Name" placeholder="Benali" value={employeeForm.last_name} onChange={(e) => setEmployeeForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <Input label="Email" type="email" placeholder="ahmed@cafe.ma" value={employeeForm.email} onChange={(e) => setEmployeeForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Role" options={[{ value: "cashier", label: "Cashier" }, { value: "manager", label: "Manager" }, { value: "owner", label: "Owner" }]} value={employeeForm.role} onChange={(e) => setEmployeeForm(f => ({ ...f, role: e.target.value as "owner" | "manager" | "cashier" }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="PIN (4 digits)" type="password" placeholder="****" maxLength={4} value={employeeForm.pin} onChange={(e) => setEmployeeForm(f => ({ ...f, pin: e.target.value }))} />
            <Input label="Password" type="password" placeholder="********" value={employeeForm.password} onChange={(e) => setEmployeeForm(f => ({ ...f, password: e.target.value }))} />
          </div>

          {/* Permissions */}
          <div className="border-t border-gray-200 dark:border-[#1F1F23] pt-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              Permissions
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {permissionGroups.map(group => (
                <div key={group.title}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{group.title}</p>
                  <div className="space-y-2">
                    {group.permissions.map(perm => (
                      <Checkbox
                        key={perm.key}
                        label={perm.label}
                        checked={employeeForm.permissions[perm.key as keyof typeof employeeForm.permissions]}
                        onChange={(checked) => updatePermission(perm.key, checked)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddEmployee(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAddEmployee(false)}>Add Employee</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal isOpen={showEditEmployee} onClose={() => setShowEditEmployee(false)} title="Edit Employee" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" placeholder="Ahmed" value={employeeForm.first_name} onChange={(e) => setEmployeeForm(f => ({ ...f, first_name: e.target.value }))} />
            <Input label="Last Name" placeholder="Benali" value={employeeForm.last_name} onChange={(e) => setEmployeeForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <Input label="Email" type="email" placeholder="ahmed@cafe.ma" value={employeeForm.email} onChange={(e) => setEmployeeForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Role" options={[{ value: "cashier", label: "Cashier" }, { value: "manager", label: "Manager" }, { value: "owner", label: "Owner" }]} value={employeeForm.role} onChange={(e) => setEmployeeForm(f => ({ ...f, role: e.target.value as "owner" | "manager" | "cashier" }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="PIN (4 digits)" type="password" placeholder="****" maxLength={4} value={employeeForm.pin} onChange={(e) => setEmployeeForm(f => ({ ...f, pin: e.target.value }))} />
            <div>
              <Input label="Password (leave blank to keep)" type="password" placeholder="********" value={employeeForm.password} onChange={(e) => setEmployeeForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>

          {/* Permissions */}
          <div className="border-t border-gray-200 dark:border-[#1F1F23] pt-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              Permissions
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {permissionGroups.map(group => (
                <div key={group.title}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{group.title}</p>
                  <div className="space-y-2">
                    {group.permissions.map(perm => (
                      <Checkbox
                        key={perm.key}
                        label={perm.label}
                        checked={employeeForm.permissions[perm.key as keyof typeof employeeForm.permissions]}
                        onChange={(checked) => updatePermission(perm.key, checked)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditEmployee(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowEditEmployee(false)}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Clock History Slide Panel */}
      <SlidePanel isOpen={showClockHistory} onClose={() => setShowClockHistory(false)} title={`Clock History - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`} width="lg">
        <div className="p-5">
          {/* Date Range Filter */}
          <div className="flex items-center gap-4 mb-6">
            <Input
              label="From"
              type="date"
              value={clockDateRange.from}
              onChange={(e) => setClockDateRange(r => ({ ...r, from: e.target.value }))}
            />
            <Input
              label="To"
              type="date"
              value={clockDateRange.to}
              onChange={(e) => setClockDateRange(r => ({ ...r, to: e.target.value }))}
            />
          </div>

          {/* Total Hours Summary */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-[#1F1F23] rounded-xl p-4 mb-6">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">Total Hours for Period</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {totalHours}h {remainingMinutes}m
            </p>
          </div>

          {/* Clock Entries Table */}
          <div className="border border-gray-200 dark:border-[#1F1F23] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0F0F12]/50">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Clock In</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Clock Out</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {employeeClockEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      {entry.clock_in.split(" ")[0]}
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                      {entry.clock_in.split(" ")[1]}
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                      {entry.clock_out ? entry.clock_out.split(" ")[1] : "-"}
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-white text-right font-mono">
                      {entry.duration_minutes ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employeeClockEntries.length === 0 && (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No clock entries for this period</p>
              </div>
            )}
          </div>
        </div>
      </SlidePanel>

      {/* Status Toggle Confirmation */}
      <Modal isOpen={showStatusConfirm} onClose={() => setShowStatusConfirm(false)} title="Confirm Status Change" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-gray-900 dark:text-white">
                Are you sure you want to {selectedEmployee?.status === "active" ? "deactivate" : "activate"}{" "}
                <strong>{selectedEmployee?.first_name} {selectedEmployee?.last_name}</strong>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedEmployee?.status === "active"
                  ? "This employee will no longer be able to log in to terminals."
                  : "This employee will be able to log in to terminals again."}
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowStatusConfirm(false)}>Cancel</Button>
            <Button
              variant={selectedEmployee?.status === "active" ? "danger" : "primary"}
              className="flex-1"
              onClick={confirmStatusToggle}
            >
              {selectedEmployee?.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}



