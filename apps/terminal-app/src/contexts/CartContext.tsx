import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { CartItem, Product, Variant, Modifier } from '../types';
import { v4 } from '../utils';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant?: Variant, modifiers?: Modifier[], qty?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
}

const CartContext = createContext<CartContextType>(null!);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, variant?: Variant, modifiers: Modifier[] = [], qty: number = 1) => {
    const unitPrice = variant?.price_override ?? product.price;
    const modTotal = modifiers.reduce((s, m) => s + m.price, 0);
    const lineTotal = (unitPrice + modTotal) * qty;
    setItems((prev) => [...prev, {
      id: v4(), product, variant, quantity: qty,
      selectedModifiers: modifiers, unitPrice: unitPrice + modTotal, lineTotal,
    }]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) return removeItem(id);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty, lineTotal: i.unitPrice * qty } : i));
  };

  const clearCart = () => setItems([]);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, total: subtotal }}>
      {children}
    </CartContext.Provider>
  );
}
