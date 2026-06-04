"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getToken } from "@/lib/api"
import { categoriesApi, productsApi, variantsApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type {
  Category,
  CreateProductInput,
  Product,
  ProductVariant,
  UpdateProductInput,
} from "@/lib/merchant/types"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  Package,
  Tag,
  Layers,
  GripVertical,
  Upload,
} from "lucide-react"

// NUMERIC columns arrive as strings over JSON — coerce before math/format.
function n(v: unknown): number {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(x) ? x : 0
}

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
      disabled={disabled}
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

const TVA_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "7", label: "7%" },
  { value: "10", label: "10%" },
  { value: "14", label: "14%" },
  { value: "20", label: "20%" },
]

type ProductForm = {
  name: string
  category_id: string
  price: string
  sku: string
  description: string
  tva_rate: string
  track_stock: boolean
  cost_price: string
}
const EMPTY_PRODUCT_FORM: ProductForm = {
  name: "", category_id: "", price: "", sku: "", description: "", tva_rate: "20", track_stock: false, cost_price: "",
}

// ============== MAIN PAGE COMPONENT ==============
export default function ProductsPage() {
  const queryClient = useQueryClient()

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

  // Forms
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM)
  const [productImageUrl, setProductImageUrl] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [productFormError, setProductFormError] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: "" })
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null)

  // Variant forms
  const [showAddVariant, setShowAddVariant] = useState(false)
  const [showEditVariant, setShowEditVariant] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [variantForm, setVariantForm] = useState({ name: "", price_override: "", sku: "" })
  const [variantFormError, setVariantFormError] = useState<string | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────
  // Fetch ALL products (server ignores search/page anyway); filter client-side.
  const productsQuery = useQuery({
    queryKey: merchantKeys.products.list(null),
    queryFn: () => productsApi.list(),
  })
  const categoriesQuery = useQuery({
    queryKey: merchantKeys.categories.list(),
    queryFn: () => categoriesApi.list(),
  })
  const products = productsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  const variantsQuery = useQuery({
    queryKey: merchantKeys.products.variants(selectedProduct?.id ?? ""),
    queryFn: () => variantsApi.list(selectedProduct!.id),
    enabled: showProductDetail && !!selectedProduct,
  })
  const variants = variantsQuery.data ?? []

  // ── Mutations ──────────────────────────────────────────────────────────
  const invalidateProducts = () => queryClient.invalidateQueries({ queryKey: merchantKeys.products.all })
  const invalidateCategories = () => queryClient.invalidateQueries({ queryKey: merchantKeys.categories.all })

  const createProductMutation = useMutation({
    mutationFn: (input: CreateProductInput) => productsApi.create(input),
    onSuccess: () => { invalidateProducts(); setShowAddProduct(false) },
    onError: (e) => setProductFormError(humanizeError(e, "Failed to add product.")),
  })
  const updateProductMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => productsApi.update(id, input),
    onSuccess: () => { invalidateProducts(); setShowEditProduct(false) },
    onError: (e) => setProductFormError(humanizeError(e, "Failed to update product.")),
  })
  // Inline list mutations (no form error surface — push to nothing, rely on refetch)
  const patchProductMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => productsApi.update(id, input),
    onSuccess: invalidateProducts,
  })
  const soldOutMutation = useMutation({
    mutationFn: (id: string) => productsApi.toggleSoldOut(id),
    onSuccess: invalidateProducts,
  })
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: invalidateProducts,
  })

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => categoriesApi.create({ name }),
    onSuccess: () => { invalidateCategories(); setShowAddCategory(false) },
    onError: (e) => setCategoryFormError(humanizeError(e, "Failed to add category.")),
  })
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; is_active?: boolean } }) => categoriesApi.update(id, input),
    onSuccess: () => { invalidateCategories(); setShowEditCategory(false) },
    onError: (e) => setCategoryFormError(humanizeError(e, "Failed to update category.")),
  })
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => { invalidateCategories(); invalidateProducts() },
  })

  const invalidateVariants = () => {
    if (selectedProduct) queryClient.invalidateQueries({ queryKey: merchantKeys.products.variants(selectedProduct.id) })
  }
  const createVariantMutation = useMutation({
    mutationFn: (input: { name: string; price_override?: number; sku?: string }) => variantsApi.create(selectedProduct!.id, input),
    onSuccess: () => { invalidateVariants(); setShowAddVariant(false) },
    onError: (e) => setVariantFormError(humanizeError(e, "Failed to add variant.")),
  })
  const updateVariantMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; price_override?: number; sku?: string; is_active?: boolean } }) => variantsApi.update(id, input),
    onSuccess: () => { invalidateVariants(); setShowEditVariant(false); setSelectedVariant(null) },
    onError: (e) => setVariantFormError(humanizeError(e, "Failed to update variant.")),
  })

  // ── Derived ────────────────────────────────────────────────────────────
  const categoryName = (catId: string) =>
    categories.find(c => c.id === catId)?.name ?? ""
  const countForCategory = (catId: string) => products.filter(p => p.category_id === catId).length

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return products.filter(p => {
      if (selectedCategory && p.category_id !== selectedCategory) return false
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? "").toLowerCase().includes(q)) return false
      if (soldOutFilter === "available" && p.is_sold_out) return false
      if (soldOutFilter === "sold_out" && !p.is_sold_out) return false
      return true
    })
  }, [products, selectedCategory, searchQuery, soldOutFilter])

  const listError =
    (productsQuery.isError && humanizeError(productsQuery.error, "Failed to load products.")) ||
    (categoriesQuery.isError && humanizeError(categoriesQuery.error, "Failed to load categories.")) ||
    null

  // ── Handlers ───────────────────────────────────────────────────────────
  const openAddProduct = () => {
    setProductForm({ ...EMPTY_PRODUCT_FORM, category_id: selectedCategory ?? categories[0]?.id ?? "" })
    setProductImageUrl("")
    setProductFormError(null)
    setShowAddProduct(true)
  }
  const openEditProduct = (p: Product) => {
    setSelectedProduct(p)
    setProductForm({
      name: p.name,
      category_id: p.category_id,
      price: n(p.price).toString(),
      sku: p.sku ?? "",
      description: p.description ?? "",
      tva_rate: p.tva_rate != null ? n(p.tva_rate).toString() : "20",
      track_stock: p.track_stock,
      cost_price: p.cost_price != null ? n(p.cost_price).toString() : "",
    })
    setProductImageUrl(p.image_url ?? "")
    setProductFormError(null)
    setShowEditProduct(true)
  }

  const buildProductPayload = (): CreateProductInput => ({
    name: productForm.name.trim(),
    price: n(productForm.price),
    category_id: productForm.category_id,
    description: productForm.description.trim() || undefined,
    sku: productForm.sku.trim() || undefined,
    cost_price: productForm.cost_price ? n(productForm.cost_price) : undefined,
    tva_rate: productForm.tva_rate !== "" ? n(productForm.tva_rate) : undefined,
    track_stock: productForm.track_stock,
    image_url: productImageUrl || undefined,
  })

  const submitAddProduct = () => {
    setProductFormError(null)
    if (!productForm.name.trim()) { setProductFormError("Product name is required."); return }
    if (!productForm.category_id) { setProductFormError("Please select a category."); return }
    if (productForm.price === "" || n(productForm.price) < 0) { setProductFormError("A valid price is required."); return }
    createProductMutation.mutate(buildProductPayload())
  }
  const submitEditProduct = () => {
    if (!selectedProduct) return
    setProductFormError(null)
    if (!productForm.name.trim()) { setProductFormError("Product name is required."); return }
    if (!productForm.category_id) { setProductFormError("Please select a category."); return }
    updateProductMutation.mutate({ id: selectedProduct.id, input: buildProductPayload() })
  }

  const handleViewProduct = (p: Product) => {
    setSelectedProduct(p)
    setDetailTab("variants")
    setShowProductDetail(true)
  }

  const handleDeleteProduct = (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This deactivates the product.`)) return
    deleteProductMutation.mutate(p.id)
  }

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    setProductFormError(null)
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
      const tok = getToken()
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`${BASE}/api/business/upload/product-image`, {
        method: "POST",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        body: formData,
      })
      if (!res.ok) {
        let msg = res.statusText
        try { const j = await res.json(); msg = j.message ?? j.error ?? msg } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      setProductImageUrl(data.url ?? "")
    } catch (e) {
      setProductFormError(humanizeError(e, "Failed to upload image."))
    } finally {
      setUploadingImage(false)
    }
  }

  const openAddCategory = () => { setCategoryForm({ name: "" }); setCategoryFormError(null); setShowAddCategory(true) }
  const openEditCategory = (c: Category) => { setSelectedCategoryEdit(c); setCategoryForm({ name: c.name }); setCategoryFormError(null); setShowEditCategory(true) }

  const submitAddVariant = () => {
    setVariantFormError(null)
    if (!variantForm.name.trim()) { setVariantFormError("Variant name is required."); return }
    createVariantMutation.mutate({
      name: variantForm.name.trim(),
      price_override: variantForm.price_override !== "" ? n(variantForm.price_override) : undefined,
      sku: variantForm.sku.trim() || undefined,
    })
  }
  const submitEditVariant = () => {
    if (!selectedVariant) return
    setVariantFormError(null)
    if (!variantForm.name.trim()) { setVariantFormError("Variant name is required."); return }
    updateVariantMutation.mutate({
      id: selectedVariant.id,
      input: {
        name: variantForm.name.trim(),
        price_override: variantForm.price_override !== "" ? n(variantForm.price_override) : undefined,
        sku: variantForm.sku.trim() || undefined,
      },
    })
  }

  const noCategories = !categoriesQuery.isLoading && categories.length === 0
  const savingProduct = createProductMutation.isPending || updateProductMutation.isPending

  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel: Categories */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-[#1F1F23]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Categories</h3>
              <Button variant="ghost" size="sm" onClick={openAddCategory}>
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
            {categoriesQuery.isLoading && <div className="px-3 py-4 text-sm text-gray-400">Loading…</div>}
            {categories.map(category => (
              <div
                key={category.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg mb-1 cursor-pointer transition-colors ${
                  selectedCategory === category.id ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-gray-50 dark:hover:bg-[#1a1a20]"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${
                      selectedCategory === category.id ? "text-indigo-600 dark:text-indigo-400"
                        : category.is_active ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"
                    }`}>
                      {category.name}
                    </span>
                    {!category.is_active && <span className="text-xs text-gray-400 dark:text-gray-500">(inactive)</span>}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{countForCategory(category.id)} products</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); updateCategoryMutation.mutate({ id: category.id, input: { is_active: !category.is_active } }) }}
                    className={`p-1.5 rounded-lg ${category.is_active ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a20]'}`}
                    title={category.is_active ? "Deactivate" : "Activate"}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditCategory(category) }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {!categoriesQuery.isLoading && categories.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400">No categories yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Panel: Products */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <Button variant="primary" onClick={openAddProduct} disabled={noCategories} title={noCategories ? "Create a category first" : undefined}>
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

        {listError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
            {listError}
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          {productsQuery.isLoading && <div className="py-10 text-center text-gray-400">Loading...</div>}
          {!productsQuery.isLoading && (
            <table className="w-full">
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
                        <div className="w-10 h-10 bg-gray-100 dark:bg-[#0F0F12] rounded-lg flex items-center justify-center overflow-hidden">
                          {product.image_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            : <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                            {product.is_sold_out && <Badge color="red">SOLD OUT</Badge>}
                          </div>
                          {(product.variants?.length ?? 0) > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{product.variants!.length} variants</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Badge color="gray">{product.category?.name ?? categoryName(product.category_id)}</Badge></td>
                    <td className="p-4"><span className="font-mono text-gray-900 dark:text-white">{n(product.price).toFixed(2)} MAD</span></td>
                    <td className="p-4"><span className="font-mono text-xs text-gray-500 dark:text-gray-400">{product.sku ?? "—"}</span></td>
                    <td className="p-4 text-center">
                      <Toggle checked={product.is_sold_out} onChange={() => soldOutMutation.mutate(product.id)} disabled={soldOutMutation.isPending} />
                    </td>
                    <td className="p-4 text-center">
                      <Toggle checked={product.is_active} onChange={() => patchProductMutation.mutate({ id: product.id, input: { is_active: !product.is_active } })} disabled={patchProductMutation.isPending} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleViewProduct(product)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="View Details"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEditProduct(product)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteProduct(product)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!productsQuery.isLoading && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{noCategories ? "Create a category first, then add products." : "Try adjusting your search or filters"}</p>
              {!noCategories && (
                <Button variant="primary" onClick={openAddProduct}><Plus className="w-4 h-4" />Add Product</Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      <Modal isOpen={showAddProduct || showEditProduct} onClose={() => { setShowAddProduct(false); setShowEditProduct(false); setProductFormError(null) }} title={showEditProduct ? "Edit Product" : "Add Product"} size="lg">
        <div className="space-y-4">
          <Input label="Product Name *" placeholder="e.g. Cappuccino" value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} />
          <Select label="Category *" options={categories.map(c => ({ value: c.id, label: c.name }))} value={productForm.category_id} onChange={(e) => setProductForm(p => ({ ...p, category_id: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (MAD) *" type="number" placeholder="0.00" value={productForm.price} onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))} />
            <Input label="SKU" placeholder="PRD-001" value={productForm.sku} onChange={(e) => setProductForm(p => ({ ...p, sku: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost Price (MAD)" type="number" placeholder="0.00" value={productForm.cost_price} onChange={(e) => setProductForm(p => ({ ...p, cost_price: e.target.value }))} />
            <Select label="TVA Rate (%)" options={TVA_OPTIONS} value={productForm.tva_rate} onChange={(e) => setProductForm(p => ({ ...p, tva_rate: e.target.value }))} />
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Image</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-[#1F1F23] rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a20] cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                {uploadingImage ? "Uploading..." : "Choose image"}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
              </label>
              {productImageUrl && (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-[#1F1F23]" />
                  <button onClick={() => setProductImageUrl("")} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12] rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Track Stock</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enable inventory tracking for this product</p>
            </div>
            <Toggle checked={productForm.track_stock} onChange={(checked) => setProductForm(p => ({ ...p, track_stock: checked }))} />
          </div>
          {productFormError && <p className="text-sm text-red-500">{productFormError}</p>}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowAddProduct(false); setShowEditProduct(false); setProductFormError(null) }} disabled={savingProduct}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={showEditProduct ? submitEditProduct : submitAddProduct} disabled={savingProduct || uploadingImage}>
              {savingProduct ? "Saving..." : showEditProduct ? "Save Changes" : "Add Product"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} title="Add Category" size="sm">
        <div className="space-y-4">
          <Input label="Category Name *" placeholder="e.g. Beverages" value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} />
          {categoryFormError && <p className="text-sm text-red-500">{categoryFormError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddCategory(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={createCategoryMutation.isPending} onClick={() => { if (!categoryForm.name.trim()) { setCategoryFormError("Name is required."); return } createCategoryMutation.mutate(categoryForm.name.trim()) }}>
              {createCategoryMutation.isPending ? "Saving..." : "Add Category"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Category Modal */}
      <Modal isOpen={showEditCategory} onClose={() => setShowEditCategory(false)} title="Edit Category" size="sm">
        <div className="space-y-4">
          <Input label="Category Name *" placeholder="e.g. Beverages" value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} />
          {categoryFormError && <p className="text-sm text-red-500">{categoryFormError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditCategory(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={updateCategoryMutation.isPending} onClick={() => { if (!selectedCategoryEdit) return; if (!categoryForm.name.trim()) { setCategoryFormError("Name is required."); return } updateCategoryMutation.mutate({ id: selectedCategoryEdit.id, input: { name: categoryForm.name.trim() } }) }}>
              {updateCategoryMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
          {selectedCategoryEdit && (
            <button
              onClick={() => { if (window.confirm(`Deactivate category "${selectedCategoryEdit.name}"?`)) { deleteCategoryMutation.mutate(selectedCategoryEdit.id); setShowEditCategory(false) } }}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Delete category
            </button>
          )}
        </div>
      </Modal>

      {/* Product Detail Slide Panel */}
      <SlidePanel isOpen={showProductDetail} onClose={() => setShowProductDetail(false)} title={selectedProduct?.name || "Product Details"} width="xl">
        {selectedProduct && (
          <div>
            <div className="p-5 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#0F0F12]/50">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 dark:bg-[#1F1F23] rounded-xl flex items-center justify-center overflow-hidden">
                  {selectedProduct.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    : <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProduct.name}</h3>
                    {selectedProduct.is_sold_out && <Badge color="red">SOLD OUT</Badge>}
                    {!selectedProduct.is_active && <Badge color="gray">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedProduct.description || "No description"}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">{n(selectedProduct.price).toFixed(2)} MAD</span>
                    <Badge color="gray">{selectedProduct.category?.name ?? categoryName(selectedProduct.category_id)}</Badge>
                    <span className="text-xs text-gray-400 dark:text-gray-500">SKU: {selectedProduct.sku ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 dark:border-[#1F1F23]">
              <div className="flex">
                {[
                  { id: "variants", label: "Variants", icon: Layers },
                  { id: "inventory", label: "Inventory", icon: Package },
                  { id: "wholesale", label: "Wholesale", icon: Tag },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as typeof detailTab)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      detailTab === tab.id ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {detailTab === "variants" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Product Variants</h4>
                    <Button variant="secondary" size="sm" onClick={() => { setVariantForm({ name: "", price_override: "", sku: "" }); setVariantFormError(null); setShowAddVariant(true) }}>
                      <Plus className="w-4 h-4" />Add Variant
                    </Button>
                  </div>
                  {variantsQuery.isLoading && <div className="py-6 text-center text-gray-400 text-sm">Loading variants...</div>}
                  {!variantsQuery.isLoading && variants.length > 0 ? (
                    <div className="space-y-2">
                      {variants.map(variant => (
                        <div key={variant.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{variant.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {variant.price_override != null ? `${n(variant.price_override).toFixed(2)} MAD` : "Base price"}
                                {variant.sku ? ` · ${variant.sku}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Toggle
                              checked={variant.is_active}
                              disabled={updateVariantMutation.isPending}
                              onChange={() => updateVariantMutation.mutate({ id: variant.id, input: { is_active: !variant.is_active } })}
                            />
                            <button
                              onClick={() => { setSelectedVariant(variant); setVariantForm({ name: variant.name, price_override: variant.price_override != null ? n(variant.price_override).toString() : "", sku: variant.sku ?? "" }); setVariantFormError(null); setShowEditVariant(true) }}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !variantsQuery.isLoading && (
                      <div className="text-center py-8">
                        <Layers className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No variants defined</p>
                      </div>
                    )
                  )}
                </div>
              )}

              {detailTab === "inventory" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Brand</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedProduct.brand?.name || "—"}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Unit of Measure</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedProduct.unit_of_measure || "—"}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Stock Tracking</p>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedProduct.track_stock ? "Enabled" : "Disabled"}</p>
                      </div>
                      <Badge color={selectedProduct.track_stock ? "green" : "gray"}>{selectedProduct.track_stock ? "Active" : "Inactive"}</Badge>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">TVA Rate</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedProduct.tva_rate != null ? `${n(selectedProduct.tva_rate)}%` : "Not set"}</p>
                  </div>
                </div>
              )}

              {detailTab === "wholesale" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Wholesale pricing tiers for bulk purchases</p>
                  <div className="space-y-3">
                    {([1, 2, 3, 4] as const).map(tier => {
                      const raw = selectedProduct[`whole_price_${tier}` as keyof Product] as string | null
                      return (
                        <div key={tier} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0F0F12]/50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Tier {tier}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Wholesale level {tier}</p>
                          </div>
                          {raw != null
                            ? <span className="font-mono font-medium text-gray-900 dark:text-white">{n(raw).toFixed(2)} MAD</span>
                            : <span className="text-sm text-gray-400 dark:text-gray-500">Not set</span>}
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

      {/* Add Variant Modal */}
      <Modal isOpen={showAddVariant} onClose={() => setShowAddVariant(false)} title="Add Variant" size="sm">
        <div className="space-y-4">
          <Input label="Variant Name *" placeholder="e.g. Large" value={variantForm.name} onChange={(e) => setVariantForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Price Override (MAD)" type="number" placeholder="leave blank for base price" value={variantForm.price_override} onChange={(e) => setVariantForm(p => ({ ...p, price_override: e.target.value }))} />
          <Input label="SKU (optional)" placeholder="VAR-001" value={variantForm.sku} onChange={(e) => setVariantForm(p => ({ ...p, sku: e.target.value }))} />
          {variantFormError && <p className="text-sm text-red-500">{variantFormError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddVariant(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={createVariantMutation.isPending} onClick={submitAddVariant}>{createVariantMutation.isPending ? "Saving..." : "Add Variant"}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Variant Modal */}
      <Modal isOpen={showEditVariant} onClose={() => setShowEditVariant(false)} title="Edit Variant" size="sm">
        <div className="space-y-4">
          <Input label="Variant Name *" placeholder="e.g. Large" value={variantForm.name} onChange={(e) => setVariantForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Price Override (MAD)" type="number" placeholder="leave blank for base price" value={variantForm.price_override} onChange={(e) => setVariantForm(p => ({ ...p, price_override: e.target.value }))} />
          <Input label="SKU (optional)" placeholder="VAR-001" value={variantForm.sku} onChange={(e) => setVariantForm(p => ({ ...p, sku: e.target.value }))} />
          {variantFormError && <p className="text-sm text-red-500">{variantFormError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditVariant(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={updateVariantMutation.isPending} onClick={submitEditVariant}>{updateVariantMutation.isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
