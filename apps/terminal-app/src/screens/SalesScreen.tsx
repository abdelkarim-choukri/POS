import { useState, useCallback } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import { useCart } from '../contexts/CartContext';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { ShoppingCart, Minus, Plus, Trash2, LogOut, ScanBarcode } from 'lucide-react';
import { formatMAD } from '../utils';
import ProductDetailModal from './ProductDetailModal';
import NetworkStatus from '../components/NetworkStatus';
import type { Product } from '../types';

export default function SalesScreen() {
  const { categories, products, employee, logout, setScreen } = useTerminal();
  const { items, addItem, removeItem, updateQuantity, clearCart, total } = useCart();
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  const handleScan = useCallback((code: string) => {
    const match = products.find(
      (p) => !p.is_sold_out && (p.sku === code || p.sku === code.toUpperCase()),
    );
    if (match) {
      const hasExtras = (match.variants?.length ?? 0) > 0 || (match.product_modifier_groups?.length ?? 0) > 0;
      if (hasExtras) setDetailProduct(match);
      else addItem(match);
      setScanFeedback({ text: `✓ ${match.name}`, ok: true });
    } else {
      setScanFeedback({ text: `SKU "${code}" not found`, ok: false });
    }
    setTimeout(() => setScanFeedback(null), 2000);
  }, [products, addItem]);

  useBarcodeScanner({ onScan: handleScan });

  const filteredProducts = selectedCat
    ? products.filter((p) => p.category_id === selectedCat && !p.is_sold_out)
    : products.filter((p) => !p.is_sold_out);

  return (
    <div className="h-screen flex flex-col bg-pos-bg">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-pos-card border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{employee?.first_name} {employee?.last_name}</span>
          <span className="text-xs text-gray-400 bg-pos-accent px-2 py-0.5 rounded capitalize">{employee?.role}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-gray-500 text-xs"><ScanBarcode size={14} /> Scanner ready</div>
          <NetworkStatus />
          <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition">
            <LogOut size={16} /> Clock Out
          </button>
        </div>
      </div>

      {/* Scan feedback toast */}
      {scanFeedback && (
        <div className={`mx-auto mt-2 px-4 py-2 rounded-lg text-sm font-medium animate-pulse ${scanFeedback.ok ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {scanFeedback.text}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Categories */}
        <div className="w-28 bg-pos-card border-r border-white/10 overflow-y-auto">
          <button onClick={() => setSelectedCat('')}
            className={`w-full px-2 py-4 text-xs font-medium text-center border-b border-white/5 transition ${!selectedCat ? 'bg-pos-blue text-white' : 'text-gray-400 hover:bg-pos-accent'}`}>
            All
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setSelectedCat(c.id)}
              className={`w-full px-2 py-4 text-xs font-medium text-center border-b border-white/5 transition ${selectedCat === c.id ? 'bg-pos-blue text-white' : 'text-gray-400 hover:bg-pos-accent'}`}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Center: Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} onTap={setDetailProduct} />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">No products available</div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="w-80 bg-pos-card border-l border-white/10 flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} />
              <span className="font-semibold text-sm">Current Order</span>
              <span className="bg-pos-blue text-xs px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            {items.length > 0 && (
              <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-400 transition">Clear</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">Empty cart</div>
            ) : (
              <div className="divide-y divide-white/5">
                {items.map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product.name}</p>
                        {item.variant && <p className="text-xs text-gray-400">{item.variant.name}</p>}
                        {item.selectedModifiers.length > 0 && (
                          <p className="text-xs text-pos-blue">{item.selectedModifiers.map((m) => m.name).join(', ')}</p>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-gray-500 hover:text-red-400 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 bg-pos-accent rounded-lg flex items-center justify-center hover:bg-gray-600"><Minus size={14} /></button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 bg-pos-accent rounded-lg flex items-center justify-center hover:bg-gray-600"><Plus size={14} /></button>
                      </div>
                      <span className="text-sm font-semibold">{formatMAD(item.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">Total</span>
              <span className="text-2xl font-bold">{formatMAD(total)}</span>
            </div>
            <button onClick={() => setScreen('payment')} disabled={items.length === 0}
              className="w-full bg-pos-green text-white text-lg font-bold py-4 rounded-xl disabled:opacity-30 hover:bg-green-600 transition active:scale-[0.98]">
              Pay {items.length > 0 ? formatMAD(total) : ''}
            </button>
          </div>
        </div>
      </div>

      {detailProduct && <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} />}
    </div>
  );
}

function ProductCard({ product, onTap }: { product: Product; onTap: (p: Product) => void }) {
  const { addItem } = useCart();
  const handleTap = () => {
    const hasExtras = (product.variants && product.variants.length > 0) ||
      (product.product_modifier_groups && product.product_modifier_groups.length > 0);
    if (hasExtras) onTap(product);
    else addItem(product);
  };

  return (
    <button onClick={handleTap}
      className="bg-pos-accent rounded-xl p-4 text-left hover:bg-pos-accent/80 transition active:scale-[0.97] flex flex-col">
      <p className="text-sm font-semibold mb-auto line-clamp-2">{product.name}</p>
      {product.sku && <p className="text-[10px] text-gray-500 mt-1">{product.sku}</p>}
      <p className="text-pos-blue font-bold mt-2">{formatMAD(product.price)}</p>
    </button>
  );
}
