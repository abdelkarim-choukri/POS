import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { X, Minus, Plus } from 'lucide-react';
import { formatMAD } from '../utils';
import type { Product, Variant, Modifier } from '../types';

interface Props { product: Product; onClose: () => void; }

export default function ProductDetailModal({ product, onClose }: Props) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<Variant | undefined>(
    product.variants?.[0]
  );
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [quantity, setQuantity] = useState(1);

  const toggleModifier = (mod: Modifier) => {
    setSelectedModifiers((prev) =>
      prev.find((m) => m.id === mod.id)
        ? prev.filter((m) => m.id !== mod.id)
        : [...prev, mod]
    );
  };

  const basePrice = selectedVariant?.price_override ?? product.price;
  const modTotal = selectedModifiers.reduce((s, m) => s + m.price, 0);
  const totalPrice = (basePrice + modTotal) * quantity;

  const handleAdd = () => {
    addItem(product, selectedVariant, selectedModifiers, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-pos-card rounded-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold">{product.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-pos-accent rounded-lg"><X size={20} /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Size / Variant</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.filter((v) => !v.is_sold_out).map((v) => (
                  <button key={v.id} onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition ${
                      selectedVariant?.id === v.id ? 'bg-pos-blue text-white' : 'bg-pos-accent text-gray-300 hover:bg-gray-600'
                    }`}>
                    {v.name} {v.price_override != null && <span className="ml-1 opacity-70">{formatMAD(v.price_override)}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modifiers */}
          {product.product_modifier_groups?.map((pmg) => (
            <div key={pmg.modifier_group.id}>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">
                {pmg.modifier_group.name}
                {pmg.modifier_group.is_required && <span className="text-pos-red ml-1">*</span>}
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                {pmg.modifier_group.max_selections > 0 ? `Max ${pmg.modifier_group.max_selections}` : 'Select any'}
              </p>
              <div className="flex flex-wrap gap-2">
                {pmg.modifier_group.modifiers.map((mod) => {
                  const isSelected = selectedModifiers.some((m) => m.id === mod.id);
                  return (
                    <button key={mod.id} onClick={() => toggleModifier(mod)}
                      className={`px-4 py-3 rounded-xl text-sm transition ${
                        isSelected ? 'bg-pos-blue text-white' : 'bg-pos-accent text-gray-300 hover:bg-gray-600'
                      }`}>
                      {mod.name} {mod.price > 0 && <span className="opacity-70">+{formatMAD(mod.price)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Quantity</h3>
            <div className="flex items-center gap-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 bg-pos-accent rounded-xl flex items-center justify-center hover:bg-gray-600 transition">
                <Minus size={20} />
              </button>
              <span className="text-2xl font-bold w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 bg-pos-accent rounded-xl flex items-center justify-center hover:bg-gray-600 transition">
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 bg-pos-accent text-gray-300 py-4 rounded-xl font-semibold hover:bg-gray-600 transition">
            Cancel
          </button>
          <button onClick={handleAdd} className="flex-[2] bg-pos-green text-white py-4 rounded-xl font-bold hover:bg-green-600 transition active:scale-[0.98]">
            Add — {formatMAD(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}
