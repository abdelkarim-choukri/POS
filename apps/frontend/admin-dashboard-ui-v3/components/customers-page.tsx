"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, Users, Award, Tag as TagIcon, X, Eye, Pencil, Trash2,
  Star, History, Settings2, Check,
} from "lucide-react"
import { customersApi, gradesApi, labelsApi, attributesApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type {
  Customer, CustomerAttribute, CustomerGrade, CustomerLabel,
  CreateAttributeInput, CreateCustomerInput, GradeInput, LabelInput,
} from "@/lib/merchant/types"

// NUMERIC columns serialize as strings.
function n(v: unknown): number {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(x) ? x : 0
}

const COLOR_OPTIONS = ["gray", "blue", "green", "purple", "pink", "amber", "red", "yellow"]
const PILL: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
}
const pill = (color?: string | null) => PILL[(color ?? "").toLowerCase()] ?? PILL.gray

function ColorBadge({ color, children }: { color?: string | null; children: React.ReactNode }) {
  return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center ${pill(color)}`}>{children}</span>
}

function Button({ variant = "primary", children, className = "", ...props }: { variant?: "primary" | "secondary" | "ghost" | "danger"; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900",
    secondary: "bg-white dark:bg-[#0F0F12] border border-gray-300 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#2a2a32] text-gray-700 dark:text-gray-200",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a20] text-gray-600 dark:text-gray-400",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  }
  return <button className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>{children}</button>
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <input className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 focus:border-transparent w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" {...props} />
    </div>
  )
}

function Modal({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  if (!isOpen) return null
  const sizeClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-[#0F0F12] rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function SlidePanel({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[560px] bg-white dark:bg-[#0F0F12] shadow-2xl border-l border-gray-200 dark:border-[#1F1F23] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#1F1F23]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a20] rounded-lg"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, iconBg }: { title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; iconBg: string }) {
  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

const DATA_TYPE_OPTIONS: { value: CustomerAttribute["data_type"]; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / No" },
  { value: "date", label: "Date" },
]
const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const [pageTab, setPageTab] = useState<"customers" | "grades" | "labels" | "attributes">("customers")

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [gradeFilter, setGradeFilter] = useState<string>("all") // grade_id or "all"

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [detailTab, setDetailTab] = useState<"points" | "labels" | "attributes">("points")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", notes: "", labels: [] as string[] })

  // grade/label/attribute mgmt
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [editingGrade, setEditingGrade] = useState<CustomerGrade | null>(null)
  const [gradeForm, setGradeForm] = useState({ name: "", min_points: 0, color: "gray", points_multiplier: 1 })
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [editingLabel, setEditingLabel] = useState<CustomerLabel | null>(null)
  const [labelForm, setLabelForm] = useState({ name: "", color: "gray" })
  const [showAttrModal, setShowAttrModal] = useState(false)
  const [editingAttr, setEditingAttr] = useState<CustomerAttribute | null>(null)
  const [attrForm, setAttrForm] = useState({ label: "", data_type: "string" as CustomerAttribute["data_type"], is_required: false })
  const [subError, setSubError] = useState<string | null>(null)

  // points adjustment
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [pointsDelta, setPointsDelta] = useState("")
  const [pointsReason, setPointsReason] = useState("")
  const [pointsError, setPointsError] = useState<string | null>(null)

  // attribute values editor
  const [attrValues, setAttrValues] = useState<Record<string, string>>({})

  // debounce search → query key
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const monthStart = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01` }, [])

  // ── Queries ──
  const customersQuery = useQuery({
    queryKey: merchantKeys.customers.list(`${search}|${gradeFilter}`),
    queryFn: () => customersApi.list({ search: search || undefined, grade_id: gradeFilter !== "all" ? gradeFilter : undefined }),
  })
  const newThisMonthQuery = useQuery({
    queryKey: merchantKeys.customers.newThisMonth(monthStart),
    queryFn: () => customersApi.list({ created_from: monthStart, limit: 1 }),
  })
  const gradesQuery = useQuery({ queryKey: merchantKeys.grades.list(), queryFn: () => gradesApi.list() })
  const labelsQuery = useQuery({ queryKey: merchantKeys.labels.list(), queryFn: () => labelsApi.list() })
  const attributesQuery = useQuery({ queryKey: merchantKeys.attributes.list(), queryFn: () => attributesApi.list() })

  const customers = customersQuery.data?.records ?? []
  const totalCustomers = customersQuery.data?.total ?? 0
  const grades = gradesQuery.data ?? []
  const labels = labelsQuery.data ?? []
  const attributes = attributesQuery.data ?? []

  const detailQuery = useQuery({
    queryKey: merchantKeys.customers.detail(selectedCustomer?.id ?? ""),
    queryFn: () => customersApi.detail(selectedCustomer!.id),
    enabled: showDetailPanel && !!selectedCustomer,
  })
  const detail = detailQuery.data
  const pointsHistoryQuery = useQuery({
    queryKey: merchantKeys.customers.pointsHistory(selectedCustomer?.id ?? ""),
    queryFn: () => customersApi.pointsHistory(selectedCustomer!.id),
    enabled: showDetailPanel && !!selectedCustomer,
  })

  // seed attribute-value editor from detail
  useEffect(() => {
    if (detail?.attribute_values) {
      const map: Record<string, string> = {}
      for (const av of detail.attribute_values) if (av.attribute?.key) map[av.attribute.key] = av.value
      setAttrValues(map)
    } else setAttrValues({})
  }, [detail])

  // ── Mutations ──
  const invalidateCustomers = () => queryClient.invalidateQueries({ queryKey: merchantKeys.customers.all })

  const createCustomerMutation = useMutation({
    mutationFn: (input: CreateCustomerInput) => customersApi.create(input),
    onSuccess: () => { invalidateCustomers(); setShowAddModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to create customer.")),
  })
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, input, label_ids }: { id: string; input: { first_name: string; last_name: string; email?: string; phone?: string; notes?: string }; label_ids: string[] }) => {
      await customersApi.update(id, input)
      await customersApi.assignLabels(id, label_ids)
    },
    onSuccess: () => { invalidateCustomers(); setShowEditModal(false) },
    onError: (e) => setFormError(humanizeError(e, "Failed to update customer.")),
  })
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: invalidateCustomers,
  })
  const assignLabelsMutation = useMutation({
    mutationFn: ({ id, label_ids }: { id: string; label_ids: string[] }) => customersApi.assignLabels(id, label_ids),
    onSuccess: () => {
      invalidateCustomers()
      if (selectedCustomer) queryClient.invalidateQueries({ queryKey: merchantKeys.customers.detail(selectedCustomer.id) })
    },
  })
  const adjustPointsMutation = useMutation({
    mutationFn: ({ id, delta, reason }: { id: string; delta: number; reason: string }) => customersApi.adjustPoints(id, delta, reason),
    onSuccess: () => {
      invalidateCustomers()
      if (selectedCustomer) {
        queryClient.invalidateQueries({ queryKey: merchantKeys.customers.detail(selectedCustomer.id) })
        queryClient.invalidateQueries({ queryKey: merchantKeys.customers.pointsHistory(selectedCustomer.id) })
      }
      setShowPointsModal(false); setPointsDelta(""); setPointsReason("")
    },
    onError: (e) => setPointsError(humanizeError(e, "Failed to adjust points.")),
  })
  const setAttrValuesMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, string> }) => customersApi.setAttributeValues(id, values),
    onSuccess: () => { if (selectedCustomer) queryClient.invalidateQueries({ queryKey: merchantKeys.customers.detail(selectedCustomer.id) }) },
  })

  const invalidateGrades = () => queryClient.invalidateQueries({ queryKey: merchantKeys.grades.all })
  const invalidateLabels = () => queryClient.invalidateQueries({ queryKey: merchantKeys.labels.all })
  const invalidateAttrs = () => queryClient.invalidateQueries({ queryKey: merchantKeys.attributes.all })

  const gradeCreate = useMutation({ mutationFn: (i: GradeInput) => gradesApi.create(i), onSuccess: () => { invalidateGrades(); setShowGradeModal(false) }, onError: (e) => setSubError(humanizeError(e, "Failed to save grade.")) })
  const gradeUpdate = useMutation({ mutationFn: ({ id, i }: { id: string; i: Partial<GradeInput> }) => gradesApi.update(id, i), onSuccess: () => { invalidateGrades(); setShowGradeModal(false) }, onError: (e) => setSubError(humanizeError(e, "Failed to save grade.")) })
  const gradeDelete = useMutation({ mutationFn: (id: string) => gradesApi.remove(id), onSuccess: () => { invalidateGrades(); invalidateCustomers() } })

  const labelCreate = useMutation({ mutationFn: (i: LabelInput) => labelsApi.create(i), onSuccess: () => { invalidateLabels(); setShowLabelModal(false) }, onError: (e) => setSubError(humanizeError(e, "Failed to save label.")) })
  const labelUpdate = useMutation({ mutationFn: ({ id, i }: { id: string; i: Partial<LabelInput> }) => labelsApi.update(id, i), onSuccess: () => { invalidateLabels(); setShowLabelModal(false) }, onError: (e) => setSubError(humanizeError(e, "Failed to save label.")) })
  const labelDelete = useMutation({ mutationFn: (id: string) => labelsApi.remove(id), onSuccess: invalidateLabels })

  const attrCreate = useMutation({ mutationFn: (i: CreateAttributeInput) => attributesApi.create(i), onSuccess: () => { invalidateAttrs(); setShowAttrModal(false) }, onError: (e) => setSubError(humanizeError(e, "Failed to save attribute.")) })
  const attrUpdate = useMutation({ mutationFn: ({ id, i }: { id: string; i: { label: string } }) => attributesApi.update(id, i), onSuccess: () => { invalidateAttrs(); setShowAttrModal(false) }, onError: (e) => setSubError(humanizeError(e, "Failed to save attribute.")) })
  const attrDelete = useMutation({ mutationFn: (id: string) => attributesApi.remove(id), onSuccess: invalidateAttrs })

  // ── Handlers ──
  const openAdd = () => { setForm({ first_name: "", last_name: "", email: "", phone: "", notes: "", labels: [] }); setFormError(null); setShowAddModal(true) }
  const openEdit = (c: Customer) => {
    setSelectedCustomer(c)
    setForm({
      first_name: c.first_name, last_name: c.last_name, email: c.email ?? "", phone: c.phone ?? "", notes: c.notes ?? "",
      labels: (c.label_assignments ?? []).map(a => a.label.id),
    })
    setFormError(null); setShowEditModal(true)
  }
  const submitCustomer = () => {
    setFormError(null)
    if (!form.first_name.trim() || !form.last_name.trim()) { setFormError("First and last name are required."); return }
    if (!form.phone.trim()) { setFormError("Phone is required (it uniquely identifies the customer)."); return }
    if (showEditModal && selectedCustomer) {
      updateCustomerMutation.mutate({
        id: selectedCustomer.id,
        input: { first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim() || undefined, phone: form.phone.trim(), notes: form.notes.trim() || undefined },
        label_ids: form.labels,
      })
    } else {
      createCustomerMutation.mutate({
        first_name: form.first_name.trim(), last_name: form.last_name.trim(), phone: form.phone.trim(),
        email: form.email.trim() || undefined, notes: form.notes.trim() || undefined,
        label_ids: form.labels.length ? form.labels : undefined,
      })
    }
  }
  const openView = (c: Customer) => { setSelectedCustomer(c); setDetailTab("points"); setShowDetailPanel(true) }
  const handleDelete = (c: Customer) => { if (confirm(`Delete ${c.first_name} ${c.last_name}? This deactivates the customer.`)) deleteCustomerMutation.mutate(c.id) }

  const toggleLabelOnCustomer = (labelId: string) => {
    if (!detail) return
    const current = (detail.label_assignments ?? []).map(a => a.label.id)
    const next = current.includes(labelId) ? current.filter(id => id !== labelId) : [...current, labelId]
    assignLabelsMutation.mutate({ id: detail.id, label_ids: next })
  }

  const submitPoints = () => {
    if (!selectedCustomer) return
    setPointsError(null)
    const delta = parseInt(pointsDelta, 10)
    if (isNaN(delta) || delta === 0) { setPointsError("Enter a non-zero whole number."); return }
    if (pointsReason.trim().length < 10) { setPointsError("Reason must be at least 10 characters."); return }
    adjustPointsMutation.mutate({ id: selectedCustomer.id, delta, reason: pointsReason.trim() })
  }

  const openAddGrade = () => { setEditingGrade(null); setGradeForm({ name: "", min_points: 0, color: "gray", points_multiplier: 1 }); setSubError(null); setShowGradeModal(true) }
  const openEditGrade = (g: CustomerGrade) => { setEditingGrade(g); setGradeForm({ name: g.name, min_points: n(g.min_points), color: g.color_hex ?? "gray", points_multiplier: n(g.points_multiplier) || 1 }); setSubError(null); setShowGradeModal(true) }
  const saveGrade = () => {
    setSubError(null)
    if (!gradeForm.name.trim()) { setSubError("Grade name is required."); return }
    const payload: GradeInput = { name: gradeForm.name.trim(), min_points: gradeForm.min_points, points_multiplier: gradeForm.points_multiplier, color_hex: gradeForm.color }
    if (editingGrade) gradeUpdate.mutate({ id: editingGrade.id, i: payload }); else gradeCreate.mutate(payload)
  }

  const openAddLabel = () => { setEditingLabel(null); setLabelForm({ name: "", color: "gray" }); setSubError(null); setShowLabelModal(true) }
  const openEditLabel = (l: CustomerLabel) => { setEditingLabel(l); setLabelForm({ name: l.name, color: l.color_hex ?? "gray" }); setSubError(null); setShowLabelModal(true) }
  const saveLabel = () => {
    setSubError(null)
    if (!labelForm.name.trim()) { setSubError("Label name is required."); return }
    const payload: LabelInput = { name: labelForm.name.trim(), color_hex: labelForm.color }
    if (editingLabel) labelUpdate.mutate({ id: editingLabel.id, i: payload }); else labelCreate.mutate(payload)
  }

  const openAddAttr = () => { setEditingAttr(null); setAttrForm({ label: "", data_type: "string", is_required: false }); setSubError(null); setShowAttrModal(true) }
  const openEditAttr = (a: CustomerAttribute) => { setEditingAttr(a); setAttrForm({ label: a.label, data_type: a.data_type, is_required: a.is_required }); setSubError(null); setShowAttrModal(true) }
  const saveAttr = () => {
    setSubError(null)
    if (!attrForm.label.trim()) { setSubError("Attribute name is required."); return }
    if (editingAttr) {
      attrUpdate.mutate({ id: editingAttr.id, i: { label: attrForm.label.trim() } })
    } else {
      attrCreate.mutate({ key: slugify(attrForm.label) || `attr_${Date.now()}`, label: attrForm.label.trim(), data_type: attrForm.data_type, is_required: attrForm.is_required })
    }
  }

  const listError =
    (customersQuery.isError && humanizeError(customersQuery.error, "Failed to load customers.")) ||
    (gradesQuery.isError && humanizeError(gradesQuery.error, "Failed to load grades.")) || null
  const savingCustomer = createCustomerMutation.isPending || updateCustomerMutation.isPending
  const customerLabels = (c: Customer) => (c.label_assignments ?? []).map(a => a.label)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4 mr-2 inline" />Add Customer</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Customers" value={customersQuery.isLoading ? "…" : totalCustomers} icon={Users} iconBg="bg-blue-100" />
        <StatCard title="New This Month" value={newThisMonthQuery.isLoading ? "…" : (newThisMonthQuery.data?.total ?? 0)} icon={Star} iconBg="bg-green-100" />
        <StatCard title="Loyalty Grades" value={gradesQuery.isLoading ? "…" : grades.length} icon={Award} iconBg="bg-amber-100" />
        <StatCard title="Labels" value={labelsQuery.isLoading ? "…" : labels.length} icon={TagIcon} iconBg="bg-purple-100" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-[#1F1F23] mb-6">
        <div className="flex gap-1">
          {(["customers", "grades", "labels", "attributes"] as const).map(tab => (
            <button key={tab} onClick={() => setPageTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${pageTab === tab ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {listError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">{listError}</div>
      )}

      {/* CUSTOMERS TAB */}
      {pageTab === "customers" && (
        <>
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search by name, phone, or email..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" />
              </div>
              <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white">
                <option value="all">All Grades</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {(searchInput || gradeFilter !== "all") && (
                <Button variant="ghost" onClick={() => { setSearchInput(""); setGradeFilter("all") }}>Clear filters</Button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            {customersQuery.isLoading && <div className="py-10 text-center text-gray-400">Loading...</div>}
            {!customersQuery.isLoading && (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                  <tr>
                    {["Customer", "Phone", "Grade", "Points", "Labels", "Joined", "Actions"].map(h =>
                      <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                      <td className="p-4">
                        <p className="font-medium text-gray-900 dark:text-white">{c.first_name} {c.last_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{c.email || "No email"}</p>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{c.phone || "-"}</td>
                      <td className="p-4">{c.grade ? <ColorBadge color={c.grade.color_hex}>{c.grade.name}</ColorBadge> : <span className="text-sm text-gray-400">—</span>}</td>
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{n(c.points_balance).toLocaleString()}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {customerLabels(c).length > 0
                            ? customerLabels(c).slice(0, 2).map(l => <ColorBadge key={l.id} color={l.color_hex}>{l.name}</ColorBadge>)
                            : <span className="text-sm text-gray-400 dark:text-gray-500">-</span>}
                          {customerLabels(c).length > 2 && <span className="text-xs text-gray-400">+{customerLabels(c).length - 2}</span>}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{c.created_at ? c.created_at.slice(0, 10) : "-"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openView(c)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="View"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(c)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!customersQuery.isLoading && customers.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">No customers found.</div>
            )}
          </div>
        </>
      )}

      {/* GRADES TAB */}
      {pageTab === "grades" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Customer Grades</h2>
            <Button variant="primary" onClick={openAddGrade}><Plus className="w-4 h-4 mr-2 inline" />Add Grade</Button>
          </div>
          {gradesQuery.isLoading ? <div className="py-10 text-center text-gray-400">Loading...</div>
            : grades.length === 0 ? <div className="py-12 text-center text-gray-500 dark:text-gray-400">No grades defined yet.</div>
              : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                    <tr>{["Name", "Min Points", "Multiplier", "Color", "Actions"].map(h => <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {grades.map(g => (
                      <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                        <td className="p-4 font-medium text-gray-900 dark:text-white">{g.name}</td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{n(g.min_points).toLocaleString()}</td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">×{n(g.points_multiplier)}</td>
                        <td className="p-4"><ColorBadge color={g.color_hex}>{g.color_hex ?? "gray"}</ColorBadge></td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditGrade(g)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => { if (confirm("Delete this grade? Customers on it will be demoted.")) gradeDelete.mutate(g.id) }} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
        </div>
      )}

      {/* LABELS TAB */}
      {pageTab === "labels" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Customer Labels</h2>
            <Button variant="primary" onClick={openAddLabel}><Plus className="w-4 h-4 mr-2 inline" />Add Label</Button>
          </div>
          {labelsQuery.isLoading ? <div className="py-10 text-center text-gray-400">Loading...</div>
            : labels.length === 0 ? <div className="py-12 text-center text-gray-500 dark:text-gray-400">No labels defined yet.</div>
              : (
                <div className="p-5 flex flex-wrap gap-3">
                  {labels.map(l => (
                    <div key={l.id} className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-[#1F1F23] rounded-lg">
                      <ColorBadge color={l.color_hex}>{l.name}</ColorBadge>
                      <button onClick={() => openEditLabel(l)} className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm("Delete this label?")) labelDelete.mutate(l.id) }} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
        </div>
      )}

      {/* ATTRIBUTES TAB */}
      {pageTab === "attributes" && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#1F1F23]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Custom Attributes</h2>
            <Button variant="primary" onClick={openAddAttr}><Plus className="w-4 h-4 mr-2 inline" />Add Attribute</Button>
          </div>
          {attributesQuery.isLoading ? <div className="py-10 text-center text-gray-400">Loading...</div>
            : attributes.length === 0 ? <div className="py-12 text-center text-gray-500 dark:text-gray-400">No custom attributes defined yet.</div>
              : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
                    <tr>{["Name", "Key", "Data Type", "Required", "Actions"].map(h => <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {attributes.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50">
                        <td className="p-4 font-medium text-gray-900 dark:text-white">{a.label}</td>
                        <td className="p-4 text-sm font-mono text-gray-500 dark:text-gray-400">{a.key}</td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{a.data_type}</td>
                        <td className="p-4">{a.is_required ? <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">Required</span> : <span className="text-sm text-gray-400 dark:text-gray-500">Optional</span>}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditAttr(a)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => { if (confirm("Delete this attribute? All customer values for it will be removed.")) attrDelete.mutate(a.id) }} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
        </div>
      )}

      {/* Detail Panel */}
      <SlidePanel isOpen={showDetailPanel} onClose={() => setShowDetailPanel(false)} title="Customer Details">
        {selectedCustomer && (
          <div>
            <div className="p-6 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedCustomer.first_name} {selectedCustomer.last_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedCustomer.email || "No email"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCustomer.phone || "No phone"}</p>
                </div>
                {(detail?.grade ?? selectedCustomer.grade) && <ColorBadge color={(detail?.grade ?? selectedCustomer.grade)!.color_hex}>{(detail?.grade ?? selectedCustomer.grade)!.name}</ColorBadge>}
              </div>
              <div className="flex gap-4 mt-4 flex-wrap">
                <div className="bg-white dark:bg-[#0F0F12] rounded-lg px-4 py-2 border border-gray-200 dark:border-[#1F1F23]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Points Balance</p>
                  <p className="font-bold text-gray-900 dark:text-white">{n(detail?.points_balance ?? selectedCustomer.points_balance).toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-[#0F0F12] rounded-lg px-4 py-2 border border-gray-200 dark:border-[#1F1F23]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
                  <p className="font-bold text-gray-900 dark:text-white">{detail?.stats ? `${n(detail.stats.total_spend).toLocaleString()} MAD` : "…"}</p>
                </div>
                <button onClick={() => { setPointsDelta(""); setPointsReason(""); setPointsError(null); setShowPointsModal(true) }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                  <Star className="w-3.5 h-3.5" />Adjust Points
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex">
                {[{ id: "points", label: "Points History", icon: History }, { id: "labels", label: "Labels", icon: TagIcon }, { id: "attributes", label: "Attributes", icon: Settings2 }].map(t => (
                  <button key={t.id} onClick={() => setDetailTab(t.id as typeof detailTab)}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${detailTab === t.id ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                    <t.icon className="w-4 h-4" />{t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {detailTab === "points" && (
                <div className="space-y-3">
                  {pointsHistoryQuery.isLoading ? <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Loading history...</p>
                    : (pointsHistoryQuery.data?.records.length ?? 0) > 0 ? pointsHistoryQuery.data!.records.map(e => (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{e.reason || e.source}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{e.created_at?.slice(0, 10)}</p>
                        </div>
                        <span className={`font-medium ${e.delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{e.delta >= 0 ? "+" : ""}{e.delta}</span>
                      </div>
                    )) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No points history yet.</p>}
                </div>
              )}

              {detailTab === "labels" && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click to add or remove labels:</p>
                  {labels.length === 0 ? <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No labels defined.</p>
                    : (
                      <div className="flex flex-wrap gap-2">
                        {labels.map(label => {
                          const has = (detail?.label_assignments ?? []).some(a => a.label.id === label.id)
                          return (
                            <button key={label.id} onClick={() => toggleLabelOnCustomer(label.id)} disabled={assignLabelsMutation.isPending || detailQuery.isLoading}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors disabled:opacity-50 ${has ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-400" : "bg-white dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                              {has && <Check className="w-3 h-3" />}{label.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                </div>
              )}

              {detailTab === "attributes" && (
                <div className="space-y-4">
                  {attributes.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No custom attributes defined. Add them in the Attributes tab.</p>
                    : (
                      <>
                        {attributes.map(attr => (
                          <div key={attr.id}>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{attr.label}{attr.is_required && <span className="text-red-500 ml-1">*</span>}</label>
                            {attr.data_type === "boolean" ? (
                              <input type="checkbox" checked={attrValues[attr.key] === "true"} onChange={(e) => setAttrValues(v => ({ ...v, [attr.key]: e.target.checked ? "true" : "false" }))} className="w-4 h-4 rounded" />
                            ) : (
                              <input type={attr.data_type === "number" ? "number" : attr.data_type === "date" ? "date" : "text"} value={attrValues[attr.key] ?? ""} onChange={(e) => setAttrValues(v => ({ ...v, [attr.key]: e.target.value }))}
                                className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300" placeholder={`Enter ${attr.label.toLowerCase()}`} />
                            )}
                          </div>
                        ))}
                        <Button variant="primary" className="w-full" disabled={setAttrValuesMutation.isPending} onClick={() => { if (selectedCustomer) setAttrValuesMutation.mutate({ id: selectedCustomer.id, values: attrValues }) }}>
                          {setAttrValuesMutation.isPending ? "Saving…" : "Save Attributes"}
                        </Button>
                        {setAttrValuesMutation.isError && <p className="text-sm text-red-500">{humanizeError(setAttrValuesMutation.error, "Failed to save.")}</p>}
                      </>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Add/Edit Customer Modal */}
      <Modal isOpen={showAddModal || showEditModal} onClose={() => { setShowAddModal(false); setShowEditModal(false) }} title={showEditModal ? "Edit Customer" : "Add Customer"} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Enter first name" />
            <Input label="Last Name *" value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Enter last name" />
          </div>
          <Input label="Phone *" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+212 6 XX XX XX XX" />
          <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="customer@example.com" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 w-full h-20 resize-none bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white" placeholder="Any additional notes..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Labels</label>
            <div className="flex flex-wrap gap-2">
              {labels.map(label => {
                const sel = form.labels.includes(label.id)
                return (
                  <button key={label.id} type="button" onClick={() => setForm(p => ({ ...p, labels: sel ? p.labels.filter(id => id !== label.id) : [...p.labels, label.id] }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${sel ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-400" : "bg-white dark:bg-[#0F0F12] border-gray-200 dark:border-[#1F1F23] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                    {sel && <Check className="w-3 h-3" />}{label.name}
                  </button>
                )
              })}
              {labels.length === 0 && <span className="text-xs text-gray-400">No labels defined yet.</span>}
            </div>
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowAddModal(false); setShowEditModal(false) }} disabled={savingCustomer}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={submitCustomer} disabled={savingCustomer}>{savingCustomer ? "Saving…" : showEditModal ? "Save Changes" : "Add Customer"}</Button>
          </div>
        </div>
      </Modal>

      {/* Grade Modal */}
      <Modal isOpen={showGradeModal} onClose={() => setShowGradeModal(false)} title={editingGrade ? "Edit Grade" : "Add Grade"} size="sm">
        <div className="space-y-4">
          <Input label="Grade Name *" value={gradeForm.name} onChange={(e) => setGradeForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Gold" />
          <Input label="Minimum Points" type="number" value={gradeForm.min_points} onChange={(e) => setGradeForm(p => ({ ...p, min_points: parseInt(e.target.value) || 0 }))} />
          <Input label="Points Multiplier" type="number" step="0.1" value={gradeForm.points_multiplier} onChange={(e) => setGradeForm(p => ({ ...p, points_multiplier: parseFloat(e.target.value) || 1 }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <select value={gradeForm.color} onChange={(e) => setGradeForm(p => ({ ...p, color: e.target.value }))} className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300">
              {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {subError && <p className="text-sm text-red-500">{subError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowGradeModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={saveGrade} disabled={gradeCreate.isPending || gradeUpdate.isPending}>{editingGrade ? "Save Changes" : "Add Grade"}</Button>
          </div>
        </div>
      </Modal>

      {/* Label Modal */}
      <Modal isOpen={showLabelModal} onClose={() => setShowLabelModal(false)} title={editingLabel ? "Edit Label" : "Add Label"} size="sm">
        <div className="space-y-4">
          <Input label="Label Name *" value={labelForm.name} onChange={(e) => setLabelForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. VIP" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <select value={labelForm.color} onChange={(e) => setLabelForm(p => ({ ...p, color: e.target.value }))} className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300">
              {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {subError && <p className="text-sm text-red-500">{subError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowLabelModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={saveLabel} disabled={labelCreate.isPending || labelUpdate.isPending}>{editingLabel ? "Save Changes" : "Add Label"}</Button>
          </div>
        </div>
      </Modal>

      {/* Attribute Modal */}
      <Modal isOpen={showAttrModal} onClose={() => setShowAttrModal(false)} title={editingAttr ? "Edit Attribute" : "Add Attribute"} size="sm">
        <div className="space-y-4">
          <Input label="Attribute Name *" value={attrForm.label} onChange={(e) => setAttrForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Company Size" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Type</label>
            {editingAttr ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#0F0F12] rounded-lg border border-gray-200 dark:border-[#1F1F23] text-sm text-gray-500 dark:text-gray-400 capitalize">
                {attrForm.data_type} <span className="text-xs ml-auto">Immutable</span>
              </div>
            ) : (
              <select value={attrForm.data_type} onChange={(e) => setAttrForm(p => ({ ...p, data_type: e.target.value as CustomerAttribute["data_type"] }))} className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300">
                {DATA_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={attrForm.is_required} onChange={(e) => setAttrForm(p => ({ ...p, is_required: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Required field</span>
          </label>
          {subError && <p className="text-sm text-red-500">{subError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAttrModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={saveAttr} disabled={attrCreate.isPending || attrUpdate.isPending}>{editingAttr ? "Save Changes" : "Add Attribute"}</Button>
          </div>
        </div>
      </Modal>

      {/* Points Adjustment Modal */}
      <Modal isOpen={showPointsModal} onClose={() => setShowPointsModal(false)} title="Adjust Points" size="sm">
        {selectedCustomer && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">Adjust points for <span className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.first_name} {selectedCustomer.last_name}</span>. Positive adds, negative deducts.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Points Delta</label>
              <input type="number" value={pointsDelta} onChange={(e) => setPointsDelta(e.target.value)} placeholder="e.g. 100 or -50" className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason <span className="text-xs text-gray-400">(min 10 characters)</span></label>
              <input type="text" value={pointsReason} onChange={(e) => setPointsReason(e.target.value)} placeholder="e.g. Birthday bonus reward" className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300" />
            </div>
            {pointsError && <p className="text-sm text-red-500">{pointsError}</p>}
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPointsModal(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={submitPoints} disabled={adjustPointsMutation.isPending}>{adjustPointsMutation.isPending ? "Applying…" : "Apply Adjustment"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
