// apps/terminal-app/src/screens/SalesScreen.tsx
import { useState } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import { useCart } from '../contexts/CartContext';
import { Minus, Plus, Trash2, ShoppingCart, LogOut } from 'lucide-react';
import { formatMAD } from '../utils';
import NetworkStatus from '../components/NetworkStatus';
import ProductDetailModal from './ProductDetailModal';
import type { Product } from '../types';

export default function SalesScreen() {
  const { categories, products, employee, logout, setScreen } = useTerminal();
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory && p.is_active)
    : products.filter((p) => p.is_active);

  return (
    <div className="h-screen flex flex-col bg-pos-bg text-white overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-pos-card border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">
            {employee?.first_name} {employee?.last_name}
          </span>
          <span className="text-xs text-gray-500 capitalize bg-pos-accent px-2 py-0.5 rounded">
            {employee?.role}
          </span>
        </div>
        <NetworkStatus />
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition p-1"
        >
          <LogOut size={14} />
          <span>Log out</span>
        </button>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Category sidebar ──────────────────────────────────────────── */}
        <div className="w-40 bg-pos-card border-r border-white/10 flex flex-col overflow-y-auto shrink-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`text-left px-4 py-3 text-sm font-medium transition border-b border-white/5 ${
              selectedCategory === null
                ? 'bg-pos-blue text-white'
                : 'text-gray-400 hover:bg-pos-accent hover:text-white'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-left px-4 py-3 text-sm font-medium transition border-b border-white/5 ${
                selectedCategory === cat.id
                  ? 'bg-pos-blue text-white'
                  : 'text-gray-400 hover:bg-pos-accent hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ── Product grid ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-sm">No products in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onTap={(p) => setDetailProduct(p)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Order panel ───────────────────────────────────────────────── */}
        <div className="w-72 bg-pos-card border-l border-white/10 flex flex-col shrink-0">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-gray-400" />
              <span className="text-sm font-semibold">Order</span>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-gray-500 hover:text-red-400 transition flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart size={32} className="text-gray-600 mb-2" />
                <p className="text-xs text-gray-500">Tap a product to add it</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-pos-accent rounded-xl p-3">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-[10px] text-gray-400">{item.variant.name}</p>
                      )}
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-[10px] text-pos-blue">
                          {item.selectedModifiers.map((m) => m.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-600 hover:text-red-400 transition shrink-0 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-md bg-pos-bg flex items-center justify-center hover:bg-gray-600 transition"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-md bg-pos-bg flex items-center justify-center hover:bg-gray-600 transition"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-pos-blue">{formatMAD(item.lineTotal)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: subtotal + pay */}
          <div className="px-4 py-3 border-t border-white/10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-400">Subtotal</span>
              <span className="text-lg font-bold">{formatMAD(total)}</span>
            </div>
            <button
              onClick={() => setScreen('payment')}
              disabled={items.length === 0}
              className="w-full bg-pos-blue text-white font-bold py-3 rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.98]"
            >
              Pay {items.length > 0 ? formatMAD(total) : ''}
            </button>
          </div>
        </div>
      </div>

      {detailProduct && (
        <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} />
      )}
    </div>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({ product, onTap }: { product: Product; onTap: (p: Product) => void }) {
  const { addItem } = useCart();

  const handleTap = () => {
    const hasExtras =
      (product.variants && product.variants.length > 0) ||
      (product.product_modifier_groups && product.product_modifier_groups.length > 0);
    if (hasExtras) onTap(product);
    else addItem(product);
  };

  const isSoldOut = product.is_sold_out;

  return (
    <button
      onClick={handleTap}
      disabled={isSoldOut}
      className={`rounded-xl text-left transition flex flex-col overflow-hidden ${
        isSoldOut
          ? 'opacity-40 cursor-not-allowed bg-pos-accent'
          : 'bg-pos-accent hover:bg-pos-accent/80 active:scale-[0.97]'
      }`}
    >
      {/* Image area */}
      {product.image_url ? (
        <div className="w-full aspect-square overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) parent.classList.add('hidden');
            }}
          />
        </div>
      ) : (
        <div className="w-full aspect-square bg-pos-card/60 flex items-center justify-center">
          <span className="text-2xl select-none opacity-40">🛒</span>
        </div>
      )}

      {/* Text area */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold line-clamp-2 mb-auto">{product.name}</p>
        {product.sku && <p className="text-[10px] text-gray-500 mt-1">{product.sku}</p>}
        {isSoldOut ? (
          <p className="text-[10px] text-red-400 font-medium mt-2">Sold out</p>
        ) : (
          <p className="text-pos-blue font-bold mt-2">{formatMAD(product.price)}</p>
        )}
      </div>
    </button>
  );
}