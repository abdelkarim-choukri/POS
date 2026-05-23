"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Eye,
  Package,
  Tag,
  Layers,
  MoreHorizontal,
  GripVertical,
  AlertCircle,
  Check,
  Upload,
} from "lucide-react"

// ============== TYPES ==============
interface Category {
  id: string
  name: string
  description?: string
  product_count: number
  is_active: boolean
  sort_order: number
}

interface Variant {
  id: string
  name: string
  price_delta: number
  is_available: boolean
  sku?: string
}

interface ModifierGroup {
  id: string
  name: string
  selection_type: "single" | "multiple"
  min_selections: number
  max_selections: number
}

interface Product {
  id: string
  name: string
  category_id: string
  category_name: string
  price: number
  sku: string
  description?: string
  tva_rate: number
  is_sold_out: boolean
  is_active: boolean
  track_stock: boolean
  image_url?: string
  variants: Variant[]
  modifier_groups: ModifierGroup[]
  brand?: string
  unit_of_measure?: string
  wholesale_price_1?: number
  wholesale_price_2?: number
  wholesale_price_3?: number
  wholesale_price_4?: number
}

// ============== MOCK DATA ==============
const mockCategories: Category[] = [
  { id: "cat-1", name: "Beverages", product_count: 24, is_active: true, sort_order: 1 },
  { id: "cat-2", name: "Food", product_count: 18, is_active: true, sort_order: 2 },
  { id: "cat-3", name: "Desserts", product_count: 12, is_active: true, sort_order: 3 },
  { id: "cat-4", name: "Snacks", product_count: 8, is_active: true, sort_order: 4 },
  { id: "cat-5", name: "Seasonal", product_count: 5, is_active: false, sort_order: 5 },
]

const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Cappuccino",
    category_id: "cat-1",
    category_name: "Beverages",
    price: 28.00,
    sku: "BEV-001",
    description: "Classic Italian espresso with steamed milk foam",
    tva_rate: 20,
    is_sold_out: false,
    is_active: true,
    track_stock: false,
    variants: [
      { id: "var-1", name: "Small", price_delta: -5, is_available: true },
      { id: "var-2", name: "Medium", price_delta: 0, is_available: true },
      { id: "var-3", name: "Large", price_delta: 8, is_available: true },
    ],
    modifier_groups: [
      { id: "mod-1", name: "Milk Options", selection_type: "single", min_selections: 1, max_selections: 1 },
      { id: "mod-2", name: "Extra Shots", selection_type: "multiple", min_selections: 0, max_selections: 3 },
    ],
    brand: "House Blend",
    unit_of_measure: "cup",
  },
  {
    id: "prod-2",
    name: "Croissant",
    category_id: "cat-2",
    category_name: "Food",
    price: 18.00,
    sku: "FOD-001",
    description: "Fresh buttery French croissant",
    tva_rate: 10,
    is_sold_out: false,
    is_active: true,
    track_stock: true,
    variants: [],
    modifier_groups: [],
    brand: "La Boulangerie",
    unit_of_measure: "piece",
  },
  {
    id: "prod-3",
    name: "Chocolate Cake",
    category_id: "cat-3",
    category_name: "Desserts",
    price: 45.00,
    sku: "DES-001",
    description: "Rich Belgian chocolate layer cake",
    tva_rate: 20,
    is_sold_out: true,
    is_active: true,
    track_stock: true,
    variants: [
      { id: "var-4", name: "Slice", price_delta: 0, is_available: true },
      { id: "var-5", name: "Whole Cake", price_delta: 150, is_available: false },
    ],
    modifier_groups: [
      { id: "mod-3", name: "Toppings", selection_type: "multiple", min_selections: 0, max_selections: 5 },
    ],
  },
  {
    id: "prod-4",
    name: "Espresso",
    category_id: "cat-1",
    category_name: "Beverages",
    price: 15.00,
    sku: "BEV-002",
    tva_rate: 20,
    is_sold_out: false,
    is_active: true,
    track_stock: false,
    variants: [
      { id: "var-6", name: "Single", price_delta: 0, is_available: true },
      { id: "var-7", name: "Double", price_delta: 8, is_available: true },
    ],
    modifier_groups: [],
  },
  {
    id: "prod-5",
    name: "Caesar Salad",
    category_id: "cat-2",
    category_name: "Food",
    price: 55.00,
    sku: "FOD-002",
    description: "Fresh romaine with house-made Caesar dressing",
    tva_rate: 10,
    is_sold_out: false,
    is_active: true,
    track_stock: true,
    variants: [],
    modifier_groups: [
      { id: "mod-4", name: "Add Protein", selection_type: "single", min_selections: 0, max_selections: 1 },
    ],
    wholesale_price_1: 48.00,
    wholesale_price_2: 45.00,
    wholesale_price_3: 42.00,
    wholesale_price_4: 40.00,
  },
  {
    id: "prod-6",
    name: "Mint Tea",
    category_id: "cat-1",
    category_name: "Beverages",
    price: 20.00,
    sku: "BEV-003",
    description: "Traditional Moroccan mint tea",
    tva_rate: 20,
    is_sold_out: false,
    is_active: false,
    track_stock: false,
    variants: [],
    modifier_groups: [],
  },
]

// ============== REUSABLE COMPONENTS ==============
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "yellow" | "blue" | "gray" | "indigo" }) {
  const colors = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-[#0F0F12] dark:text-gray-400",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
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

// ============== MAIN PAGE COMPONENT ==============
export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories)
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [soldOutFilter, setSoldOutFilter] = useState<"all" | "available" | "sold_out">("all")
  
  // Modals
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showEditProduct, setShowEditProduct] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showEditCategory, setShowEditCategory] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedCategoryEdit, setSelectedCategoryEdit] = useState<Category | null>(null)
  const [showProductDetail, setShowProductDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<"variants" | "modifiers" | "inventory" | "wholesale">("variants")

  // Form state
  const [productForm, setProductForm] = useState({
    name: "",
    category_id: "",
    price: "",
    sku: "",
    description: "",
    tva_rate: "20",
    track_stock: false,
  })
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" })

  // Fetch categories on mount
  useEffect(() => {
    apiFetch<{ data: any[] }>("/api/business/categories")
      .then(res => {
        const mapped: Category[] = res.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          product_count: c.product_count ?? 0,
          is_active: c.is_active ?? true,
          sort_order: c.sort_order ?? 0,
        }))
        setCategories(mapped)
      })
      .catch(() => {})
  }, [])

  // Fetch products with debounced search and category filter
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: "1", limit: "50" })
        if (searchQuery) params.set("search", searchQuery)
        if (selectedCategory) params.set("category_id", selectedCategory)
        const res = await apiFetch<{ data: any[]; total: number }>(
          `/api/business/products?${params}`
        )
        const mapped: Product[] = res.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          category_id: p.category_id,
          category_name: p.category?.name ?? "",
          price: Number(p.price ?? 0),
          sku: p.sku ?? "",
          description: p.description,
          tva_rate: Number(p.tva_rate ?? 20),
          is_sold_out: p.is_sold_out ?? false,
          is_active: p.is_active ?? true,
          track_stock: p.track_stock ?? false,
          image_url: p.image_url,
          variants: [],
          modifier_groups: [],
          brand: undefined,
          unit_of_measure: undefined,
        }))
        setProducts(mapped)
      } catch (e: any) {
        setError(e.message ?? "Failed to load products")
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory])

  // Filtered products
  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.category_id !== selectedCategory) return false
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.sku.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (soldOutFilter === "available" && p.is_sold_out) return false
    if (soldOutFilter === "sold_out" && !p.is_sold_out) return false
    return true
  })

  const handleAddProduct = () => {
    setProductForm({ name: "", category_id: categories[0]?.id || "", price: "", sku: "", description: "", tva_rate: "20", track_stock: false })
    setShowAddProduct(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setProductForm({
      name: product.name,
      category_id: product.category_id,
      price: product.price.toString(),
      sku: product.sku,
      description: product.description || "",
      tva_rate: product.tva_rate.toString(),
      track_stock: product.track_stock,
    })
    setShowEditProduct(true)
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setDetailTab("variants")
    setShowProductDetail(true)
  }

  const handleToggleSoldOut = (productId: string) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_sold_out: !p.is_sold_out } : p))
  }

  const handleToggleActive = (productId: string) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_active: !p.is_active } : p))
  }

  const handleToggleCategoryActive = (categoryId: string) => {
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, is_active: !c.is_active } : c))
  }

  const handleAddCategory = () => {
    setCategoryForm({ name: "", description: "" })
    setShowAddCategory(true)
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategoryEdit(category)
    setCategoryForm({ name: category.name, description: category.description || "" })
    setShowEditCategory(true)
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel: Categories */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-[#1F1F23]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Categories</h3>
              <Button variant="ghost" size="sm" onClick={handleAddCategory}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === null 
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a20]"
              }`}
            >
              All Products ({products.length})
            </button>
          </div>
          <div className="p-2 max-h-[500px] overflow-y-auto scrollbar-hide">
            {categories.map(category => (
              <div
                key={category.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg mb-1 cursor-pointer transition-colors ${
                  selectedCategory === category.id
                    ? "bg-indigo-50 dark:bg-indigo-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-[#1a1a20]"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${
                      selectedCategory === category.id
                        ? "text-indigo-600 dark:text-indigo-400"
                        : category.is_active
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-400 dark:text-gray-500"
                    }`}>
                      {category.name}
                    </span>
                    {!category.is_active && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">(inactive)</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{category.product_count} products</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleCategoryActive(category.id) }}
                    className={`p-1.5 rounded-lg ${category.is_active ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]'}`}
                    title={category.is_active ? "Deactivate" : "Activate"}
                  >
                    {category.is_active ? <Eye className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditCategory(category) }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Panel: Products */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <Button variant="primary" onClick={handleAddProduct}>
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
              />
            </div>
            <Select
              options={[
                { value: "all", label: "All Status" },
                { value: "available", label: "Available" },
                { value: "sold_out", label: "Sold Out" },
              ]}
              value={soldOutFilter}
              onChange={(e) => setSoldOutFilter(e.target.value as typeof soldOutFilter)}
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          {loading && <div className="py-10 text-center text-gray-400">Loading...</div>}
          {!loading && <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0F0F12]/50 border-b border-gray-200 dark:border-[#1F1F23]">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
                <th className="text-center p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sold Out</th>
                <th className="text-center p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredProducts.map((product) => (
                <tr key={product.id} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a20]/50 ${product.is_sold_out ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-[#0F0F12] rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                          {product.is_sold_out && (
                            <Badge color="red">SOLD OUT</Badge>
                          )}
                        </div>
                        {product.variants.length > 0 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">{product.variants.length} variants</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge color="gray">{product.category_name}</Badge>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-gray-900 dark:text-white">{product.price.toFixed(2)} MAD</span>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{product.sku}</span>
                  </td>
                  <td className="p-4 text-center">
                    <Toggle checked={product.is_sold_out} onChange={() => handleToggleSoldOut(product.id)} />
                  </td>
                  <td className="p-4 text-center">
                    <Toggle checked={product.is_active} onChange={() => handleToggleActive(product.id)} />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewProduct(product)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search or filters</p>
              <Button variant="primary" onClick={handleAddProduct}>
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} title="Add Product" size="lg">
        <div className="space-y-4">
          <Input label="Product Name" placeholder="e.g. Cappuccino" value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} />
          <Select label="Category" options={categories.map(c => ({ value: c.id, label: c.name }))} value={productForm.category_id} onChange={(e) => setProductForm(p => ({ ...p, category_id: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (MAD)" type="number" placeholder="0.00" value={productForm.price} onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))} />
            <Input label="SKU" placeholder="PRD-001" value={productForm.sku} onChange={(e) => setProductForm(p => ({ ...p, sku: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full h-20 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
              placeholder="Product description..."
              value={productForm.description}
              onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <Select label="TVA Rate (%)" options={[{ value: "0", label: "0%" }, { value: "7", label: "7%" }, { value: "10", label: "10%" }, { value: "14", label: "14%" }, { value: "20", label: "20%" }]} value={productForm.tva_rate} onChange={(e) => setProductForm(p => ({ ...p, tva_rate: e.target.value }))} />
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Track Stock</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enable inventory tracking for this product</p>
            </div>
            <Toggle checked={productForm.track_stock} onChange={(checked) => setProductForm(p => ({ ...p, track_stock: checked }))} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddProduct(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAddProduct(false)}>Add Product</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={showEditProduct} onClose={() => setShowEditProduct(false)} title="Edit Product" size="lg">
        <div className="space-y-4">
          <Input label="Product Name" placeholder="e.g. Cappuccino" value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} />
          <Select label="Category" options={categories.map(c => ({ value: c.id, label: c.name }))} value={productForm.category_id} onChange={(e) => setProductForm(p => ({ ...p, category_id: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (MAD)" type="number" placeholder="0.00" value={productForm.price} onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))} />
            <Input label="SKU" placeholder="PRD-001" value={productForm.sku} onChange={(e) => setProductForm(p => ({ ...p, sku: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full h-20 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
              placeholder="Product description..."
              value={productForm.description}
              onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <Select label="TVA Rate (%)" options={[{ value: "0", label: "0%" }, { value: "7", label: "7%" }, { value: "10", label: "10%" }, { value: "14", label: "14%" }, { value: "20", label: "20%" }]} value={productForm.tva_rate} onChange={(e) => setProductForm(p => ({ ...p, tva_rate: e.target.value }))} />
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Track Stock</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enable inventory tracking for this product</p>
            </div>
            <Toggle checked={productForm.track_stock} onChange={(checked) => setProductForm(p => ({ ...p, track_stock: checked }))} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditProduct(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowEditProduct(false)}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} title="Add Category" size="sm">
        <div className="space-y-4">
          <Input label="Category Name" placeholder="e.g. Beverages" value={categoryForm.name} onChange={(e) => setCategoryForm(p => ({ ...p, name: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
            <textarea
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full h-16 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
              placeholder="Category description..."
              value={categoryForm.description}
              onChange={(e) => setCategoryForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddCategory(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAddCategory(false)}>Add Category</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Category Modal */}
      <Modal isOpen={showEditCategory} onClose={() => setShowEditCategory(false)} title="Edit Category" size="sm">
        <div className="space-y-4">
          <Input label="Category Name" placeholder="e.g. Beverages" value={categoryForm.name} onChange={(e) => setCategoryForm(p => ({ ...p, name: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
            <textarea
              className="border border-gray-300 dark:border-[#1F1F23] rounded-lg px-3 py-2 text-sm w-full h-16 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white resize-none"
              placeholder="Category description..."
              value={categoryForm.description}
              onChange={(e) => setCategoryForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditCategory(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowEditCategory(false)}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Product Detail Slide Panel */}
      <SlidePanel isOpen={showProductDetail} onClose={() => setShowProductDetail(false)} title={selectedProduct?.name || "Product Details"} width="xl">
        {selectedProduct && (
          <div>
            {/* Product Header */}
            <div className="p-5 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/50">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 dark:bg-[#1F1F23] rounded-xl flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProduct.name}</h3>
                    {selectedProduct.is_sold_out && <Badge color="red">SOLD OUT</Badge>}
                    {!selectedProduct.is_active && <Badge color="gray">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedProduct.description || "No description"}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">{selectedProduct.price.toFixed(2)} MAD</span>
                    <Badge color="gray">{selectedProduct.category_name}</Badge>
                    <span className="text-xs text-gray-400 dark:text-gray-500">SKU: {selectedProduct.sku}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex">
                {[
                  { id: "variants", label: "Variants", icon: Layers },
                  { id: "modifiers", label: "Modifiers", icon: Tag },
                  { id: "inventory", label: "Inventory", icon: Package },
                  { id: "wholesale", label: "Wholesale", icon: Tag },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as typeof detailTab)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      detailTab === tab.id
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {detailTab === "variants" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Product Variants</h4>
                    <Button variant="secondary" size="sm">
                      <Plus className="w-4 h-4" />
                      Add Variant
                    </Button>
                  </div>
                  {selectedProduct.variants.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProduct.variants.map(variant => (
                        <div key={variant.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{variant.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {variant.price_delta >= 0 ? "+" : ""}{variant.price_delta.toFixed(2)} MAD
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Toggle checked={variant.is_available} onChange={() => {}} />
                            <button className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"><Pencil className="w-4 h-4" /></button>
                            <button className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Layers className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No variants defined</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "modifiers" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Linked Modifier Groups</h4>
                    <Button variant="secondary" size="sm">
                      <Plus className="w-4 h-4" />
                      Link Group
                    </Button>
                  </div>
                  {selectedProduct.modifier_groups.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProduct.modifier_groups.map(group => (
                        <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">{group.name}</p>
                              <Badge color={group.selection_type === "single" ? "blue" : "indigo"}>
                                {group.selection_type}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Select {group.min_selections}-{group.max_selections} options
                            </p>
                          </div>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded" title="Unlink">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Tag className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No modifier groups linked</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "inventory" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Brand</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedProduct.brand || "-"}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Unit of Measure</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedProduct.unit_of_measure || "-"}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Stock Tracking</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedProduct.track_stock ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                      <Badge color={selectedProduct.track_stock ? "green" : "gray"}>
                        {selectedProduct.track_stock ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">TVA Rate</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedProduct.tva_rate}%</p>
                  </div>
                </div>
              )}

              {detailTab === "wholesale" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Wholesale pricing tiers for bulk purchases
                  </p>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(tier => {
                      const price = selectedProduct[`wholesale_price_${tier}` as keyof Product] as number | undefined
                      return (
                        <div key={tier} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Tier {tier}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Wholesale level {tier}</p>
                          </div>
                          {price ? (
                            <span className="font-mono font-medium text-gray-900 dark:text-white">{price.toFixed(2)} MAD</span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">Not set</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  )
}



