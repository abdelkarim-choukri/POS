"use client"
import { useState } from "react"
import { ArrowLeft, Package, Plus, Trash2, Search } from "lucide-react"

interface RecommendationItem {
  id: string
  product_id: string
  product_name: string
  category: string
  price_ttc: number
  stock_qty: number
  sort_order: number
}

const mockItems: RecommendationItem[] = [
  { id: "ri-1", product_id: "p-1", product_name: "Café Espresso", category: "Boissons", price_ttc: 12.00, stock_qty: 999, sort_order: 1 },
  { id: "ri-2", product_id: "p-2", product_name: "Croissant Beurre", category: "Viennoiseries", price_ttc: 8.50, stock_qty: 24, sort_order: 2 },
  { id: "ri-3", product_id: "p-3", product_name: "Jus d'Orange", category: "Boissons", price_ttc: 18.00, stock_qty: 15, sort_order: 3 },
  { id: "ri-4", product_id: "p-4", product_name: "Pain au Chocolat", category: "Viennoiseries", price_ttc: 9.00, stock_qty: 0, sort_order: 4 },
  { id: "ri-5", product_id: "p-5", product_name: "Thé à la Menthe", category: "Boissons", price_ttc: 10.00, stock_qty: 999, sort_order: 5 },
]

const allProducts = [
  { id: "p-6", name: "Sandwich Club", category: "Snacks", price_ttc: 35.00, stock_qty: 12 },
  { id: "p-7", name: "Eau Minérale", category: "Boissons", price_ttc: 5.00, stock_qty: 48 },
  { id: "p-8", name: "Brownie", category: "Pâtisseries", price_ttc: 12.00, stock_qty: 8 },
]

interface Props {
  id?: string
  onBack?: () => void
}

export default function RecommendationItemsPage({ id, onBack }: Props) {
  const [items, setItems] = useState(mockItems)
  const [search, setSearch] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = items.filter(i =>
    i.product_name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  )

  const addProduct = (product: typeof allProducts[0]) => {
    const newItem: RecommendationItem = {
      id: `ri-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price_ttc: product.price_ttc,
      stock_qty: product.stock_qty,
      sort_order: items.length + 1,
    }
    setItems(prev => [...prev, newItem])
    setShowAddModal(false)
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    setConfirmDelete(null)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newItems = [...filtered]
    ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
    setItems(newItems.map((item, i) => ({ ...item, sort_order: i + 1 })))
  }

  const moveDown = (index: number) => {
    if (index === filtered.length - 1) return
    const newItems = [...filtered]
    ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
    setItems(newItems.map((item, i) => ({ ...item, sort_order: i + 1 })))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Template Items</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Template ID: {id ?? "rt-1"} · {items.length} items</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#1a1a20]">
            <tr>
              {["#", "Product", "Category", "Price (TTC)", "Stock", "Order", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {filtered.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                <td className="px-4 py-3 text-gray-400 dark:text-gray-600 font-mono text-xs">{item.sort_order}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{item.product_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.category}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{item.price_ttc.toFixed(2)} MAD</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    item.stock_qty === 0
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : item.stock_qty < 10
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}>
                    {item.stock_qty === 999 ? "∞" : item.stock_qty}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => moveUp(index)} disabled={index === 0}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 rounded border border-gray-200 dark:border-[#1F1F23]">↑</button>
                    <button onClick={() => moveDown(index)} disabled={index === filtered.length - 1}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 rounded border border-gray-200 dark:border-[#1F1F23]">↓</button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {confirmDelete === item.id ? (
                    <div className="flex gap-1 items-center">
                      <button onClick={() => removeItem(item.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">Yes</button>
                      <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(item.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No items found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Product to Template</h3>
            <div className="space-y-2">
              {allProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-[#1F1F23] hover:bg-gray-50 dark:hover:bg-[#1a1a20] transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{product.category} · {product.price_ttc.toFixed(2)} MAD</p>
                  </div>
                  <button onClick={() => addProduct(product)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
                    Add
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
