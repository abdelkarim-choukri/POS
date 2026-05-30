"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  LogOut,
  LogIn,
  Delete,
  CheckCircle,
  AlertTriangle,
  Printer,
  ArrowRight,
  Banknote,
  CreditCard,
  WifiOff,
  X,
  ChevronLeft,
  Monitor,
  Bell,
  Coffee,
  Wine,
  UtensilsCrossed,
  Salad,
  Cake,
  Grid3X3,
  UserPlus,
  Search,
  Star,
  Gift,
  LayoutGrid,
  Users,
  Clock,
  ChefHat,
  ArrowLeft,
  Scale,
  List,
  Sliders,
  Pencil,
  Flame,
  Truck,
  MoveRight,
  ArrowRightLeft,
  Smartphone,
  Box,
  Eye,
} from "lucide-react";
import { terminalService } from '../lib/services/terminal.service';
import type {
  FloorPlanTable,
  OpenedSession,
  SessionItem,
} from '../lib/services/terminal.service';

// ============================================================
// MOCK DATA
// ============================================================

// ============================================================
// PHASE 10 - RESTAURANT OPERATIONS (types only; no mock data)
// ============================================================

type KdsStatus = 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';

const MOCK_CUSTOMERS = [
  { id: "1", name: "Ahmed Hassan", phone: "0612345678", grade: "Gold", points: 2450, color: "bg-yellow-500" },
  { id: "2", name: "Fatima Zahra", phone: "0698765432", grade: "Silver", points: 1200, color: "bg-gray-400" },
  { id: "3", name: "Mohammed Ali", phone: "0654321098", grade: "Bronze", points: 450, color: "bg-orange-600" },
  { id: "4", name: "Salma Bennani", phone: "0676543210", grade: "Gold", points: 3100, color: "bg-yellow-500" },
  { id: "5", name: "Youssef Amrani", phone: "0687654321", grade: "Silver", points: 890, color: "bg-gray-400" },
];

const MOCK_MAIN_CATEGORIES = [
  { id: "coffee", name: "Coffee", icon: Coffee },
  { id: "beverages", name: "Beverages", icon: Wine },
  { id: "food", name: "Food", icon: UtensilsCrossed },
  { id: "appetizer", name: "Appetizer", icon: Salad },
  { id: "bakeries", name: "Bakeries", icon: Cake },
  { id: "table", name: "Table", icon: Grid3X3 },
];

const MOCK_SUB_CATEGORIES = [
  { id: "all", name: "All" },
  { id: "ice-coffee", name: "Ice Coffee" },
  { id: "american", name: "American" },
  { id: "cafe-noir", name: "Café Noir" },
  { id: "brewed-coffee", name: "Brewed Coffee" },
  { id: "iced-coffee", name: "Iced Coffee" },
  { id: "flavored-coffee", name: "Flavored Coffee" },
];

const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Cortado",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "2",
    name: "Frappé Mocha",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
    variants: [
      { id: "v1", name: "Small", price_override: 6.50 },
      { id: "v2", name: "Medium", price_override: 8.50 },
      { id: "v3", name: "Large", price_override: 10.50 },
    ],
    product_modifier_groups: [
      {
        modifier_group: {
          id: "mg1",
          name: "Extras",
          is_required: false,
          modifiers: [
            { id: "m1", name: "Whipped cream", price: 1.00 },
            { id: "m2", name: "Extra shot", price: 1.50 },
          ],
        },
      },
    ],
  },
  {
    id: "3",
    name: "Cappuccino",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "4",
    name: "Mocha Cortado",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "5",
    name: "Americano",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1521302080334-4bebac2763a6?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "6",
    name: "Flat White",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "7",
    name: "Mocha",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "8",
    name: "Flat Black",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1497636577773-f1231844b336?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "9",
    name: "Ice Coffee",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "10",
    name: "Frappé Mocha",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1592663527359-cf6642f54cff?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "11",
    name: "Espresso",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
  {
    id: "12",
    name: "Cortado",
    price: 8.50,
    image_url: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=200&h=200&fit=crop",
    is_sold_out: false,
    category_id: "coffee",
  },
];

const MOCK_CART_ITEMS = [
  {
    id: "c1",
    productId: "1",
    name: "Poached Egg",
    originalPrice: 20,
    quantity: 2,
    unitPrice: 40,
    lineTotal: 40,
    size: "large",
    image: "https://images.unsplash.com/photo-1482049016gy-2c3b16db88c7?w=100&h=100&fit=crop",
    modifiers: [],
  },
  {
    id: "c2",
    productId: "2",
    name: "Cortado",
    originalPrice: 8.50,
    quantity: 2,
    unitPrice: 17,
    lineTotal: 17,
    size: "large",
    image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=100&h=100&fit=crop",
    modifiers: [],
  },
  {
    id: "c3",
    productId: "3",
    name: "Coronation",
    originalPrice: 10,
    quantity: 2,
    unitPrice: 20,
    lineTotal: 20,
    size: "large",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100&h=100&fit=crop",
    modifiers: [],
  },
];

const MOCK_EMPLOYEE = {
  first_name: "Ahmed",
  last_name: "Benali",
  role: "Owner",
  can_void: true,
};

const MOCK_TRANSACTION = {
  transaction_number: "OFL-1715530000-4821",
  total: 145,
  is_offline: true,
};

// ============================================================
// SETUP SCREEN
// ============================================================

function SetupScreen({ onNext }: { onNext: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleActivate = () => {
    setLoading(true);
    setError(false);
    setTimeout(() => {
      setLoading(false);
      if (code.toUpperCase() === "T-001") {
        onNext();
      } else {
        setError(true);
      }
    }, 1500);
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-10 shadow-xl max-w-sm w-full mx-4 border border-gray-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
            <Monitor className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">POS Terminal</h1>
          <p className="text-gray-500 text-sm mb-8">
            Enter your terminal activation code to get started
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 10))}
            placeholder="e.g. T-001"
            className="w-full bg-gray-50 text-gray-900 font-mono text-center text-lg uppercase tracking-wider rounded-xl px-4 py-4 mb-4 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-200"
            maxLength={10}
          />
          <button
            onClick={handleActivate}
            disabled={loading || !code}
            className="w-full bg-orange-500 text-white font-semibold py-4 rounded-xl h-14 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 active:scale-[0.98] transition"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Activating...
              </>
            ) : (
              "Activate Terminal"
            )}
          </button>
          {error && (
            <p className="text-red-500 text-sm mt-4">
              Terminal code not found. Check with your manager.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PIN LOGIN SCREEN
// ============================================================

function PinLoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleLogin = async () => {
    if (pin.length !== 4) return;
    setIsLoading(true);
    try {
      const result = await terminalService.clockIn('', pin);
      if (!result.success) throw new Error(result.error ?? 'Invalid PIN');
      onLogin();
    } catch {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setPin(''), 300);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col items-center justify-center relative">
      <p className="text-gray-500 text-sm mb-2">Easy POS</p>
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Enter your PIN</h1>

      <div className={`flex gap-4 mb-4 ${shake ? "animate-shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-colors ${
              i < pin.length
                ? "bg-orange-500 border-orange-500"
                : "border-gray-300 bg-transparent"
            }`}
          />
        ))}
      </div>

      <div className="h-8 mb-6">
        {pin.length === 4 ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span>Ahmed Benali — Owner</span>
          </div>
        ) : pin.length > 0 ? (
          <span className="text-gray-400">Ahmed B...</span>
        ) : null}
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4">Incorrect PIN. Try again.</p>
      )}

      <div className="grid grid-cols-3 gap-3 max-w-xs">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            disabled={isLoading}
            className="w-[72px] h-[72px] bg-white border border-gray-200 text-gray-900 text-2xl font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition shadow-sm"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="w-[72px] h-[72px] bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center active:scale-95 transition"
        >
          <Delete className="w-6 h-6" />
        </button>
        <button
          onClick={() => handleDigit("0")}
          disabled={isLoading}
          className="w-[72px] h-[72px] bg-white border border-gray-200 text-gray-900 text-2xl font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition shadow-sm"
        >
          0
        </button>
        <button
          onClick={handleLogin}
          disabled={pin.length !== 4 || isLoading}
          className={`w-[72px] h-[72px] rounded-xl flex items-center justify-center active:scale-95 transition font-semibold ${
            pin.length === 4
              ? "bg-green-500 text-white"
              : "bg-orange-500 text-white opacity-40"
          }`}
        >
          <LogIn className="w-5 h-5" />
        </button>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// PRODUCT DETAIL MODAL
// ============================================================

interface ProductDetailModalProps {
  product: (typeof MOCK_PRODUCTS)[1];
  onClose: () => void;
  onAdd: () => void;
}

function ProductDetailModal({ product, onClose, onAdd }: ProductDetailModalProps) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants?.[0]?.id || null
  );
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  const basePrice =
    product.variants?.find((v) => v.id === selectedVariant)?.price_override ||
    product.price;

  const modifierTotal = selectedModifiers.reduce((sum, modId) => {
    const mod = product.product_modifier_groups
      ?.flatMap((g) => g.modifier_group.modifiers)
      .find((m) => m.id === modId);
    return sum + (mod?.price || 0);
  }, 0);

  const totalPrice = basePrice + modifierTotal;

  const toggleModifier = (modId: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const hasRequiredModifier = product.product_modifier_groups?.some(
    (g) => g.modifier_group.is_required
  );
  const requiredGroupsSatisfied =
    !hasRequiredModifier ||
    product.product_modifier_groups?.every(
      (g) =>
        !g.modifier_group.is_required ||
        g.modifier_group.modifiers.some((m) => selectedModifiers.includes(m.id))
    );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="h-40 rounded-xl mb-4 overflow-hidden bg-gray-100">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          )}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          <span className="font-semibold text-orange-500 text-lg">
            ${totalPrice.toFixed(2)}
          </span>
        </div>

        {product.variants && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Choose size
            </h3>
            <div className="flex gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    selectedVariant === variant.id
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {product.product_modifier_groups?.map((group) => (
          <div key={group.modifier_group.id} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {group.modifier_group.name}
              </h3>
              {group.modifier_group.is_required && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
                  Required
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {group.modifier_group.modifiers.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => toggleModifier(mod.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition ${
                    selectedModifiers.includes(mod.id)
                      ? "bg-orange-50 border-orange-500"
                      : "bg-gray-50 border-transparent hover:border-gray-200"
                  }`}
                >
                  <span className="text-gray-900">{mod.name}</span>
                  <span className="text-orange-500 font-medium">
                    +${mod.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={onAdd}
          disabled={!requiredGroupsSatisfied}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl h-14 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 active:scale-[0.98] transition"
        >
          Add to Order — ${totalPrice.toFixed(2)}
        </button>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SALES SCREEN - Matching the exact design
// ============================================================

function SalesScreen({
  onCheckout,
  screen,
  setScreen,
}: {
  onCheckout: () => void;
  screen: Screen;
  setScreen: (screen: Screen) => void;
}) {
  const [activeMainCategory, setActiveMainCategory] = useState("coffee");
  const [activeSubCategory, setActiveSubCategory] = useState("all");
  const [cart, setCart] = useState(MOCK_CART_ITEMS);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({
    "1": 2,
    "7": 2,
  });
  const [detailProduct, setDetailProduct] = useState<(typeof MOCK_PRODUCTS)[1] | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<(typeof MOCK_CUSTOMERS)[0] | null>(null);

  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const pointsEarned = Math.floor(cartTotal * 10); // 10 points per $1

  const filteredCustomers = MOCK_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone.includes(customerSearchQuery)
  );
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  const updateProductQuantity = (productId: string, delta: number) => {
    setProductQuantities((prev) => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: Math.max(1, item.quantity + delta),
                lineTotal: (Math.max(1, item.quantity + delta)) * item.unitPrice / item.quantity * Math.max(1, item.quantity + delta),
              }
            : item
        )
    );
  };

  const removeCartItem = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
        <div className="flex items-center">
          <img 
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fb86e0c2490745d8e8a2f8e3d4dfef68-CmoeMPYULNHBwFTGDqb6DJ4IIax4oc.png" 
            alt="RITS Solutions" 
            className="h-8 w-auto"
          />
        </div>

        <nav className="flex items-center gap-1 ml-8">
          {screens.map((s) => (
            <button
              key={s.id}
              onClick={() => setScreen(s.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                screen === s.id
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            New Order
          </button>
          <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
            <Bell className="w-5 h-5" />
          </button>
          <button className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-white font-medium text-sm">
            A
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Category Sidebar */}
        <aside className="w-20 bg-white border-r border-gray-200 flex flex-col py-4">
          {MOCK_MAIN_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeMainCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveMainCategory(cat.id)}
                className={`flex flex-col items-center justify-center py-3 px-2 mx-2 mb-1 rounded-xl transition ${
                  isActive
                    ? "bg-orange-500 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">{cat.name}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-category Pills */}
          <div className="px-6 py-4 flex items-center gap-2 flex-wrap">
            {MOCK_SUB_CATEGORIES.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveSubCategory(sub.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  activeSubCategory === sub.id
                    ? "bg-orange-500 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-4 gap-4">
              {MOCK_PRODUCTS.map((product) => {
                const qty = productQuantities[product.id] || 0;
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg p-2 shadow-sm border border-gray-100"
                  >
                    <div
                      className="aspect-square w-full mb-2 rounded-md overflow-hidden bg-gray-50 cursor-pointer"
                      onClick={() => product.variants && setDetailProduct(product as (typeof MOCK_PRODUCTS)[1])}
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <h3 className="font-medium text-gray-900 text-xs mb-0.5 truncate">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-gray-400">Price</p>
                        <p className="text-orange-500 font-bold text-xs">$ {product.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() => updateProductQuantity(product.id, -1)}
                              className="w-5 h-5 bg-orange-500 text-white rounded flex items-center justify-center hover:bg-orange-600"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-6 h-5 bg-orange-500 text-white rounded flex items-center justify-center text-[10px] font-medium">
                              {qty}
                            </span>
                            <button
                              onClick={() => updateProductQuantity(product.id, 1)}
                              className="w-5 h-5 bg-orange-500 text-white rounded flex items-center justify-center hover:bg-orange-600"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="w-5 h-5 bg-gray-100 text-gray-600 rounded flex items-center justify-center text-[10px] font-medium">
                              {qty || 1}
                            </span>
                            <button
                              onClick={() => updateProductQuantity(product.id, 1)}
                              className="w-5 h-5 bg-gray-100 text-gray-600 rounded flex items-center justify-center hover:bg-gray-200"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right Order Panel */}
        <aside className="w-[480px] bg-white border-l border-gray-200 flex flex-col">
          {/* Invoice Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 mb-2">Invoice No: 123454 23/01/2024 | 14:00:23</p>
            <div className="flex items-center gap-2 mb-3">
              <img 
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fb86e0c2490745d8e8a2f8e3d4dfef68-CmoeMPYULNHBwFTGDqb6DJ4IIax4oc.png" 
                alt="RITS Solutions" 
                className="h-6 w-auto"
              />
              <div>
                <p className="font-bold text-gray-900 text-sm">RITS POS</p>
                <p className="text-[10px] text-gray-400">rits@solutions.com</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-orange-500 font-medium text-sm">Table 04</span>
              <span className="text-gray-600 text-sm">Order: #0029</span>
            </div>
          </div>

          {/* Customer Section */}
          <div className="px-4 py-3 border-b border-gray-100">
            {selectedCustomer ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-xs">
                    {selectedCustomer.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{selectedCustomer.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full text-white ${selectedCustomer.color}`}>
                        {selectedCustomer.grade}
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {selectedCustomer.points} pts
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-400 hover:text-orange-500 transition text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Add Customer
              </button>
            )}
          </div>

          {/* Order Items */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-xs leading-tight">{item.name}</h4>
                  <p className="text-orange-500 text-[10px]">${item.originalPrice}</p>
                  <p className="text-gray-400 text-[9px]">Size: {item.size}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCartQuantity(item.id, -1)}
                    className="w-5 h-5 border border-gray-200 rounded text-gray-500 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="w-6 h-5 border border-gray-200 rounded flex items-center justify-center text-[10px]">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(item.id, 1)}
                    className="w-5 h-5 border border-gray-200 rounded text-gray-500 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="text-right flex-shrink-0 w-12">
                  <p className="font-bold text-orange-500 text-xs">${item.lineTotal}</p>
                </div>
                <button
                  onClick={() => removeCartItem(item.id)}
                  className="w-5 h-5 text-gray-300 hover:text-red-500 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Total & Actions */}
          <div className="border-t border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-900 font-semibold">Total</span>
              <span className="text-orange-500 font-bold text-xl">${cartTotal}</span>
            </div>
            <p className="text-gray-400 text-xs mb-2">Items: {cart.length}, Quantity : {cartQuantity}</p>
            
            {selectedCustomer && (
              <div className="bg-orange-50 rounded-lg px-3 py-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-orange-700 text-xs flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Points earned this order:
                  </span>
                  <span className="text-orange-600 font-bold text-sm">+{pointsEarned} pts</span>
                </div>
              </div>
            )}
            
            <button className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg mb-2 hover:bg-gray-50 transition text-sm">
              Print Invoice
            </button>
            
            {selectedCustomer && selectedCustomer.points >= 500 && (
              <button className="w-full border border-orange-200 bg-orange-50 text-orange-600 font-medium py-2.5 rounded-lg mb-2 hover:bg-orange-100 transition text-sm flex items-center justify-center gap-2">
                <Gift className="w-4 h-4" />
                Redeem Points ({selectedCustomer.points} available)
              </button>
            )}
            
            <button
              onClick={onCheckout}
              disabled={cart.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Payments
            </button>
          </div>
        </aside>
      </div>

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAdd={() => setDetailProduct(null)}
        />
      )}

      {/* Customer Search Overlay */}
      {showCustomerSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
            {/* Search Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900 text-lg">Find Customer</h2>
                <button
                  onClick={() => {
                    setShowCustomerSearch(false);
                    setCustomerSearchQuery("");
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by phone or name..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerSearch(false);
                      setCustomerSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                      {customer.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 text-sm">{customer.name}</p>
                      <p className="text-gray-500 text-xs">{customer.phone}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${customer.color}`}>
                        {customer.grade}
                      </span>
                      <p className="text-gray-600 text-xs mt-1 flex items-center justify-end gap-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {customer.points} pts
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-gray-400 text-sm">No customers found</p>
                </div>
              )}
            </div>

            {/* New Customer Option */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => {
                  // Placeholder for new customer creation
                  setShowCustomerSearch(false);
                  setCustomerSearchQuery("");
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Create New Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAYMENT SCREEN
// ============================================================

function PaymentScreen({
  onCash,
  onCard,
  onBack,
}: {
  onCash: () => void;
  onCard: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [cashAmount, setCashAmount] = useState("0");
  const total = 77;
  const enteredAmount = parseFloat(cashAmount) || 0;
  const change = enteredAmount - total;

  const methods = [
    { id: "cash", icon: Banknote, label: "Cash", desc: "Pay with cash" },
    { id: "card", icon: CreditCard, label: "Card", desc: "Tap or insert" },
    { id: "mobile", icon: Smartphone, label: "Mobile", desc: "Scan QR code" },
  ];

  const handleDigit = (digit: string) => {
    if (cashAmount === "0" && digit !== ".") {
      setCashAmount(digit);
    } else if (digit === "." && cashAmount.includes(".")) {
      return;
    } else if (cashAmount.length < 10) {
      setCashAmount(cashAmount + digit);
    }
  };

  const handleDelete = () => {
    setCashAmount(cashAmount.length > 1 ? cashAmount.slice(0, -1) : "0");
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-900 flex flex-col items-center justify-center">
      {/* Large Total Amount */}
      <div className="mb-10 text-center">
        <p className="text-gray-400 text-sm mb-2">Amount Due</p>
        <p className="text-6xl font-bold font-mono text-white">{total.toFixed(2)} MAD</p>
      </div>

      {/* Payment Method Cards */}
      <div className="flex gap-4 mb-8">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => setSelected(method.id)}
            className={`w-36 h-36 rounded-2xl border-2 transition flex flex-col items-center justify-center gap-3 active:scale-95 ${
              selected === method.id
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 bg-gray-800 hover:border-gray-600"
            }`}
          >
            <method.icon className={`w-10 h-10 ${selected === method.id ? "text-blue-400" : "text-gray-400"}`} />
            <span className={`font-semibold ${selected === method.id ? "text-blue-400" : "text-white"}`}>{method.label}</span>
            <span className="text-xs text-gray-500">{method.desc}</span>
          </button>
        ))}
      </div>

      {/* Cash Flow - Numpad */}
      {selected === "cash" && (
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm mb-6">
          <p className="text-gray-400 text-sm text-center mb-2">Enter amount tendered</p>
          <div className="bg-gray-900 rounded-xl px-6 py-4 text-center mb-4">
            <span className="text-3xl font-bold font-mono text-white">
              {parseFloat(cashAmount).toFixed(2)} MAD
            </span>
          </div>
          
          {change >= 0 && enteredAmount >= total && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 mb-4 text-center">
              <span className="text-green-400 font-bold">Change: {change.toFixed(2)} MAD</span>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2">
            {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0"].map((digit) => (
              <button
                key={digit}
                onClick={() => handleDigit(digit)}
                className="bg-gray-700 hover:bg-gray-600 rounded-xl h-14 text-xl font-semibold text-white transition active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleDelete}
              className="bg-gray-600 rounded-xl h-14 flex items-center justify-center hover:bg-gray-500 transition active:scale-95"
            >
              <Delete className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Card Flow */}
      {selected === "card" && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm mb-6 text-center">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-10 h-10 text-blue-400 animate-pulse" />
          </div>
          <p className="text-white font-semibold mb-1">Present card to terminal</p>
          <p className="text-gray-400 text-sm">Tap, insert or swipe your card</p>
        </div>
      )}

      {/* Mobile Flow */}
      {selected === "mobile" && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm mb-6 text-center">
          <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-xs">QR Code</span>
            </div>
          </div>
          <p className="text-white font-semibold mb-1">Scan QR Code</p>
          <p className="text-gray-400 text-sm">Use your mobile payment app</p>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to order
      </button>

      {/* Process Payment Button */}
      <button
        onClick={() => {
          if (selected === "cash" && enteredAmount >= total) {
            onCash();
          } else if (selected === "card" || selected === "mobile") {
            onCard();
          }
        }}
        disabled={!selected || (selected === "cash" && enteredAmount < total)}
        className="w-full max-w-md bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl h-14 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition"
      >
        Process Payment
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ============================================================
// CASH NUMPAD SCREEN
// ============================================================

function CashNumpad({
  onConfirm,
  onBack,
}: {
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [cashAmount, setCashAmount] = useState("0");
  const total = 77;
  const enteredAmount = parseFloat(cashAmount) || 0;
  const change = enteredAmount - total;

  const handleDigit = (digit: string) => {
    if (cashAmount === "0" && digit !== ".") {
      setCashAmount(digit);
    } else if (digit === "." && cashAmount.includes(".")) {
      return;
    } else if (cashAmount.length < 10) {
      setCashAmount(cashAmount + digit);
    }
  };

  const handleDelete = () => {
    setCashAmount(cashAmount.length > 1 ? cashAmount.slice(0, -1) : "0");
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center px-6">
      <p className="text-gray-400 text-sm mb-2">Amount Due</p>
      <p className="text-5xl font-bold font-mono text-white mb-8">{total.toFixed(2)} MAD</p>

      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm mb-6">
        <p className="text-gray-400 text-sm text-center mb-2">Enter amount tendered</p>
        <div className="bg-gray-900 rounded-xl px-6 py-4 text-center mb-4">
          <span className="text-3xl font-bold font-mono text-white">
            {parseFloat(cashAmount).toFixed(2)} MAD
          </span>
        </div>

        {change >= 0 && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 mb-4 text-center">
            <span className="text-green-400 font-bold">Change: {change.toFixed(2)} MAD</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0"].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="bg-gray-700 hover:bg-gray-600 rounded-xl h-14 text-xl font-semibold text-white transition active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="bg-gray-600 rounded-xl h-14 flex items-center justify-center hover:bg-gray-500 transition active:scale-95"
          >
            <Delete className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <button
        onClick={onBack}
        className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
      >
        <ChevronLeft className="w-5 h-5" />
        Back
      </button>

      <button
        onClick={onConfirm}
        disabled={enteredAmount < total}
        className="w-full max-w-sm bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition"
      >
        Confirm Payment
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ============================================================
// SUCCESS SCREEN
// ============================================================

function SuccessScreen({
  onVoid,
  onNewSale,
}: {
  onVoid: () => void;
  onNewSale: () => void;
}) {
  const [countdown, setCountdown] = useState(30);
  const [voidCountdown] = useState(59);
  const transaction = { ...MOCK_TRANSACTION, total: 77 };

  // Auto countdown
  useState(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          onNewSale();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  });

  return (
    <div className="h-screen overflow-hidden bg-green-500 flex flex-col items-center justify-center relative">
      {/* Animated checkmark */}
      <div className="relative mb-8">
        <svg className="w-32 h-32" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="4"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeDasharray="283"
            strokeDashoffset="0"
            className="animate-draw-circle"
            style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
          />
          <path
            d="M30 50 L45 65 L70 35"
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-check"
          />
        </svg>
      </div>

      <h1 className="text-4xl font-bold text-white mb-2">Payment Complete</h1>
      <p className="font-mono text-white/80 mb-6">{transaction.transaction_number}</p>

      <p className="text-6xl font-bold font-mono text-white mb-8">
        {transaction.total.toFixed(2)} MAD
      </p>

      {transaction.is_offline && (
        <div className="bg-white/20 backdrop-blur text-white text-sm px-4 py-2 rounded-full inline-flex items-center gap-2 mb-6">
          <WifiOff className="w-4 h-4" />
          Offline — will sync when reconnected
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex flex-col items-center justify-center gap-2 text-white hover:bg-white/30 transition active:scale-95">
          <Printer className="w-7 h-7" />
          <span className="text-xs">Print</span>
        </button>
        <button className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex flex-col items-center justify-center gap-2 text-white hover:bg-white/30 transition active:scale-95">
          <Box className="w-7 h-7" />
          <span className="text-xs">Drawer</span>
        </button>
        <button className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex flex-col items-center justify-center gap-2 text-white hover:bg-white/30 transition active:scale-95">
          <Eye className="w-7 h-7" />
          <span className="text-xs">Details</span>
        </button>
      </div>

      {/* New Sale Button */}
      <button
        onClick={onNewSale}
        className="bg-white text-green-600 font-bold py-4 px-12 rounded-2xl flex items-center gap-2 hover:bg-green-50 active:scale-[0.98] transition mb-6"
      >
        New Sale
        <ArrowRight className="w-5 h-5" />
      </button>

      {voidCountdown > 0 && (
        <button
          onClick={onVoid}
          className="text-white/70 hover:text-white underline text-sm mb-6"
        >
          Void transaction ({voidCountdown}s)
        </button>
      )}

      {/* Auto-return progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-white transition-all duration-1000 ease-linear"
          style={{ width: `${(countdown / 30) * 100}%` }}
        />
      </div>

      <style jsx>{`
        @keyframes draw-circle {
          from { stroke-dashoffset: 283; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes draw-check {
          0% { stroke-dasharray: 0 100; }
          100% { stroke-dasharray: 100 0; }
        }
        .animate-draw-circle {
          animation: draw-circle 0.6s ease-out forwards;
        }
        .animate-draw-check {
          stroke-dasharray: 0 100;
          animation: draw-check 0.4s ease-out 0.4s forwards;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// VOID SCREEN
// ============================================================

function VoidScreen({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [foundTransaction, setFoundTransaction] = useState<typeof MOCK_TRANSACTION | null>(MOCK_TRANSACTION);
  const [reason, setReason] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const employee = { ...MOCK_EMPLOYEE, can_void: false };

  const reasons = [
    "Customer changed mind",
    "Item unavailable",
    "Wrong item added",
    "Price error",
    "Other",
  ];

  const handleSearch = () => {
    // Mock search - in real app would search transactions
    if (searchQuery.includes("OFL") || searchQuery.includes("1715")) {
      setFoundTransaction(MOCK_TRANSACTION);
    } else {
      setFoundTransaction(null);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleConfirmVoid = () => {
    if (employee.can_void) {
      onConfirm();
    } else {
      setShowPinModal(true);
    }
  };

  const canConfirm = reason && foundTransaction;

  return (
    <div className="h-screen overflow-hidden bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 mr-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Void Transaction</h1>
          <p className="text-gray-500 text-sm">Search and void a previous sale</p>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left - Search */}
        <div className="w-1/2 p-6 border-r border-gray-200 bg-white">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by transaction number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch();
              }}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Transaction Card Preview */}
          {foundTransaction && (
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-sm text-gray-500">Transaction Found</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  foundTransaction.is_offline ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                }`}>
                  {foundTransaction.is_offline ? "Offline" : "Synced"}
                </span>
              </div>
              <p className="font-mono font-bold text-lg text-gray-900 mb-2">
                {foundTransaction.transaction_number}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">Jan 23, 2024 14:32</p>
                </div>
                <div>
                  <p className="text-gray-500">Cashier</p>
                  <p className="font-medium text-gray-900">Ahmed Benali</p>
                </div>
                <div>
                  <p className="text-gray-500">Items</p>
                  <p className="font-medium text-gray-900">3 items</p>
                </div>
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-bold text-red-500 text-lg">{foundTransaction.total.toFixed(2)} MAD</p>
                </div>
              </div>
            </div>
          )}

          {searchQuery && !foundTransaction && (
            <div className="text-center py-12">
              <p className="text-gray-400">No transaction found</p>
            </div>
          )}
        </div>

        {/* Right - Void Reason */}
        <div className="w-1/2 p-6 flex flex-col">
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">This action cannot be undone.</p>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Select void reason
            </h2>
            <div className="space-y-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full py-4 rounded-2xl text-left px-4 transition border-2 active:scale-[0.98] ${
                    reason === r
                      ? "bg-red-500 text-white border-red-500 font-semibold"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Additional notes (optional)
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              className="w-full h-24 p-4 bg-white border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="mt-auto flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-4 rounded-2xl hover:bg-gray-50 active:scale-[0.98] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmVoid}
              disabled={!canConfirm}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition"
            >
              Confirm Void
            </button>
          </div>
        </div>
      </div>

      {/* Manager PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Manager Override</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Enter manager PIN to void</p>
            
            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    i < pin.length
                      ? "bg-red-500 border-red-500"
                      : "border-gray-300 bg-transparent"
                  }`}
                />
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-6">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDigit(digit)}
                  className="bg-gray-100 hover:bg-gray-200 rounded-xl h-14 text-xl font-semibold transition active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleDelete}
                className="bg-gray-200 rounded-xl h-14 flex items-center justify-center hover:bg-gray-300 transition active:scale-95"
              >
                <Delete className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={() => handleDigit("0")}
                className="bg-gray-100 hover:bg-gray-200 rounded-xl h-14 text-xl font-semibold transition active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => {
                  if (pin.length === 4) {
                    onConfirm();
                  }
                }}
                disabled={pin.length !== 4}
                className={`rounded-xl h-14 flex items-center justify-center transition active:scale-95 ${
                  pin.length === 4 ? "bg-red-500 text-white" : "bg-gray-300 text-gray-500"
                }`}
              >
                <CheckCircle className="w-6 h-6" />
              </button>
            </div>
            
            <button
              onClick={() => {
                setShowPinModal(false);
                setPin("");
              }}
              className="w-full text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FLOOR PLAN SCREEN (Phase 10) — real API
// ============================================================

function FloorPlanScreen({
  onSelectTable,
  onBack,
}: {
  onSelectTable: (tableId: string, session: OpenedSession | null) => void;
  onBack: () => void;
}) {
  const [tables, setTables] = useState<FloorPlanTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [openTableModal, setOpenTableModal] = useState<FloorPlanTable | null>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [openingTable, setOpeningTable] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  // Derive unique areas from the table list
  const areas = Array.from(
    new Map(tables.map((t) => [t.area_id, t.area_name])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredTables = selectedArea === "all"
    ? tables
    : tables.filter((t) => t.area_id === selectedArea);

  const getElapsedTime = (isoString?: string | null) => {
    if (!isoString) return "";
    const diff = Date.now() - new Date(isoString).getTime();
    return Math.floor(diff / 60000) + "m";
  };

  const getStatusLabel = (status: FloorPlanTable["session_status"]) => {
    switch (status) {
      case "available": return { text: "Available", dot: "bg-green-500", label: "text-green-600" };
      case "occupied": return { text: "Occupied", dot: "bg-orange-500", label: "text-orange-600" };
      case "awaiting_payment": return { text: "Awaiting Payment", dot: "bg-red-500", label: "text-red-600" };
    }
  };

  const getBorderClass = (status: FloorPlanTable["session_status"]) => {
    switch (status) {
      case "available": return "border-green-500";
      case "occupied": return "border-orange-500";
      case "awaiting_payment": return "border-red-500 animate-pulse";
    }
  };

  // Fetch floor plan on mount
  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    terminalService.getFloorPlan()
      .then((res) => setTables(res.tables))
      .catch((err) => setFetchError(err instanceof Error ? err.message : "Failed to load floor plan"))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenTable = async () => {
    if (!openTableModal) return;
    setOpeningTable(true);
    setOpenError(null);
    const result = await terminalService.openTable(openTableModal.id, guestCount);
    setOpeningTable(false);
    if (!result.success || !result.session) {
      setOpenError(result.error ?? "Failed to open table");
      return;
    }
    setOpenTableModal(null);
    onSelectTable(openTableModal.id, result.session);
  };

  const handleTableClick = (table: FloorPlanTable) => {
    if (table.session_status === "available") {
      setOpenTableModal(table);
      setGuestCount(Math.min(2, table.capacity));
      setOpenError(null);
    } else {
      // Navigate to session view — no full session detail from floor plan, pass null
      onSelectTable(table.id, null);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
        <div className="flex items-center gap-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fb86e0c2490745d8e8a2f8e3d4dfef68-CmoeMPYULNHBwFTGDqb6DJ4IIax4oc.png"
            alt="RITS Solutions"
            className="h-8 w-auto"
          />
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white">
              AH
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Ahmed</p>
              <p className="text-[10px] text-gray-500">Server</p>
            </div>
          </div>
        </div>

        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-gray-900">Floor Plan</h1>
          <p className="text-xs text-gray-500">Cafe Atlas - Main Branch</p>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </header>

      {/* Area Tabs */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedArea("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              selectedArea === "all"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Areas
          </button>
          {areas.map((area) => (
            <button
              key={area.id}
              onClick={() => setSelectedArea(area.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedArea === area.id
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        )}
        {fetchError && (
          <p className="text-red-500 text-sm text-center mt-8">{fetchError}</p>
        )}
        {!loading && !fetchError && (
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTables.map((table) => {
              const statusInfo = getStatusLabel(table.session_status);
              const sess = table.current_session;
              return (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={`bg-white rounded-2xl border-2 p-4 min-h-[140px] flex flex-col transition hover:shadow-lg hover:scale-[1.02] ${getBorderClass(table.session_status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg text-gray-900">{table.table_number}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                      <span className={`text-xs font-medium ${statusInfo.label}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <Users className="w-3 h-3" />
                    <span>{table.capacity} seats</span>
                  </div>

                  {sess && (
                    <div className="mt-auto space-y-1">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-3 h-3" />
                          {getElapsedTime(sess.opened_at)}
                        </span>
                        {sess.guest_count != null && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Users className="w-3 h-3" />
                            {sess.guest_count} guests
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-sm font-bold text-orange-500">
                        {sess.current_total_ttc.toFixed(2)} MAD
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Open Table Modal */}
      {openTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Open Table {openTableModal.table_number}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {openTableModal.capacity} seats
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Guests</label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-3xl font-bold text-gray-900 w-16 text-center">{guestCount}</span>
                <button
                  onClick={() => setGuestCount(Math.min(openTableModal.capacity, guestCount + 1))}
                  className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {openError && (
              <p className="text-red-500 text-sm mb-4">{openError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setOpenTableModal(null); setOpenError(null); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
                disabled={openingTable}
              >
                Cancel
              </button>
              <button
                onClick={handleOpenTable}
                disabled={openingTable}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {openingTable ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Opening...</>
                ) : "Open Table"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TABLE SESSION SCREEN (Phase 10) — real API
// ============================================================

function TableSessionScreen({
  tableId,
  initialSession,
  onBack,
  onPay,
  onSplit,
}: {
  tableId: string;
  initialSession: OpenedSession | null;
  onBack: () => void;
  onPay: (sessionId: string) => void;
  onSplit: (session: LiveSession) => void;
}) {
  // Live session state — built from openTable response or floor-plan data
  const [session, setSession] = useState<LiveSession | null>(() =>
    initialSession
      ? {
          id: initialSession.id,
          table_id: initialSession.table_id,
          table_number: initialSession.table_number,
          area_name: "",
          status: initialSession.status,
          guest_count: initialSession.guest_count ?? 0,
          opened_at: initialSession.opened_at,
          items: initialSession.items,
          session_total: initialSession.items.reduce(
            (s, i) => s + i.quantity * i.unit_price_ttc, 0
          ),
        }
      : null
  );

  const [quickAddCategory, setQuickAddCategory] = useState("Coffee");
  const [actionError, setActionError] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [closingTable, setClosingTable] = useState(false);
  const [cancellingTable, setCancellingTable] = useState(false);
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  // Transfer dialog state
  const [transferDialogItemId, setTransferDialogItemId] = useState<string | null>(null);
  const [transferTargetSessionId, setTransferTargetSessionId] = useState("");
  const [transferableSessions, setTransferableSessions] = useState<{ session_id: string; table_number: string }[]>([]);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Quick-add products derived from catalog (static placeholder list
  // — replace with terminalService.getCatalog() if catalog endpoint is wired)
  const quickAddProducts = [
    { id: "q1", name: "Espresso", price: 30, category: "Coffee" },
    { id: "q2", name: "Café Latte", price: 40, category: "Coffee" },
    { id: "q3", name: "Cappuccino", price: 35, category: "Coffee" },
    { id: "q4", name: "Americano", price: 28, category: "Coffee" },
    { id: "q5", name: "Croissant", price: 30, category: "Pastries" },
    { id: "q6", name: "Pain au Chocolat", price: 35, category: "Pastries" },
    { id: "q7", name: "Orange Juice", price: 30, category: "Drinks" },
    { id: "q8", name: "Mint Tea", price: 25, category: "Drinks" },
  ];
  const filteredQuickProducts = quickAddProducts.filter((p) => p.category === quickAddCategory);

  const getElapsedTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    return Math.floor(diff / 60000) + "m";
  };

  const getKdsStatusStyle = (status: KdsStatus) => {
    switch (status) {
      case "new": return { bg: "bg-red-500", text: "New", icon: Flame };
      case "preparing": return { bg: "bg-yellow-500", text: "Preparing", icon: Clock };
      case "ready": return { bg: "bg-green-500", text: "Ready", icon: CheckCircle };
      case "served": return { bg: "bg-gray-500", text: "Served", icon: Truck };
      case "cancelled": return { bg: "bg-gray-300", text: "Cancelled", icon: X };
    }
  };

  const visibleItems = session?.items.filter((i) => i.kds_status !== "cancelled") ?? [];
  const kdsCounts = {
    new: visibleItems.filter((i) => i.kds_status === "new").length,
    preparing: visibleItems.filter((i) => i.kds_status === "preparing").length,
    ready: visibleItems.filter((i) => i.kds_status === "ready").length,
    served: visibleItems.filter((i) => i.kds_status === "served").length,
  };
  const readyItems = visibleItems.filter((i) => i.kds_status === "ready");
  const hasBlockingItems = visibleItems.some((i) => i.kds_status === "new" || i.kds_status === "preparing");

  // Add a single product via quick-add (uses product id as product_id)
  const handleQuickAdd = async (product: typeof quickAddProducts[0]) => {
    if (!session) return;
    setAddingItemId(product.id);
    setActionError(null);
    const result = await terminalService.addSessionItems(session.id, [
      { product_id: product.id, quantity: 1 },
    ]);
    setAddingItemId(null);
    if (!result.success) {
      setActionError(result.error ?? "Failed to add item");
      return;
    }
    // Merge new items into local state
    setSession((prev) => {
      if (!prev) return prev;
      const newItems: SessionItem[] = (result.data?.added_items ?? []).map((ai) => ({
        id: ai.id,
        product_id: ai.product_id,
        product_name: ai.product_name,
        quantity: ai.quantity,
        unit_price_ttc: ai.unit_price_ttc,
        kds_status: ai.kds_status,
        notes: ai.notes,
      }));
      return {
        ...prev,
        items: [...prev.items, ...newItems],
        session_total: result.data?.session_total_ttc ?? prev.session_total,
      };
    });
  };

  // Remove an item (soft-delete → kds_status becomes 'cancelled')
  const handleRemoveItem = async (itemId: string) => {
    if (!session) return;
    setRemovingItemId(itemId);
    setActionError(null);
    const result = await terminalService.removeSessionItem(itemId);
    setRemovingItemId(null);
    if (!result.success) {
      setActionError(result.error ?? "Failed to remove item");
      return;
    }
    // Mark item cancelled locally
    setSession((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((i) =>
        i.id === itemId ? { ...i, kds_status: "cancelled" as KdsStatus } : i
      );
      const newTotal = updatedItems
        .filter((i) => i.kds_status !== "cancelled")
        .reduce((s, i) => s + i.quantity * i.unit_price_ttc, 0);
      return { ...prev, items: updatedItems, session_total: newTotal };
    });
  };

  // Close table → transition to payment
  const handleClosePay = async () => {
    if (!session) return;
    setClosingTable(true);
    setActionError(null);
    const result = await terminalService.closeTable(session.id);
    setClosingTable(false);
    if (!result.success) {
      setActionError(result.error ?? "Failed to close table");
      return;
    }
    onPay(session.id);
  };

  // Cancel session
  const handleCancel = async () => {
    if (!session) return;
    setCancellingTable(true);
    setActionError(null);
    const result = await terminalService.cancelSession(session.id, "Cancelled by server");
    setCancellingTable(false);
    if (!result.success) {
      setActionError(result.error ?? "Failed to cancel session");
      return;
    }
    onBack();
  };

  // Open transfer dialog: load occupied tables (excluding current) as targets
  const openTransferDialog = async (itemId: string) => {
    setTransferDialogItemId(itemId);
    setTransferTargetSessionId("");
    setTransferError(null);
    try {
      const fp = await terminalService.getFloorPlan();
      const targets = fp.tables
        .filter((t) => t.current_session && t.id !== tableId)
        .map((t) => ({ session_id: t.current_session!.id, table_number: t.table_number }));
      setTransferableSessions(targets);
    } catch {
      setTransferableSessions([]);
    }
  };

  const handleTransferItem = async () => {
    if (!transferDialogItemId || !transferTargetSessionId) return;
    setTransferring(true);
    setTransferError(null);
    const result = await terminalService.transferSessionItems([transferDialogItemId], transferTargetSessionId);
    setTransferring(false);
    if (!result.success) {
      setTransferError(result.error ?? "Transfer failed");
      return;
    }
    // Remove item from local state after successful transfer
    setSession((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.filter((i) => i.id !== transferDialogItemId);
      const newTotal = updatedItems
        .filter((i) => i.kds_status !== "cancelled")
        .reduce((s, i) => s + i.quantity * i.unit_price_ttc, 0);
      return { ...prev, items: updatedItems, session_total: newTotal };
    });
    setTransferDialogItemId(null);
  };

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No session data available.</p>
          <button onClick={onBack} className="text-orange-500 underline text-sm">Back to floor plan</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* Left Column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sub Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-900">{session.table_number}</span>
                  {session.area_name && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-medium">
                      {session.area_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {session.guest_count > 0 && (
                <span className="flex items-center gap-1 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  {session.guest_count} guests
                </span>
              )}
              <span className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {getElapsedTime(session.opened_at)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                session.status === "open" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}>
                {session.status === "open" ? "Open" : "Awaiting Payment"}
              </span>
            </div>
          </div>
        </div>

        {/* KDS Status Bar */}
        <div className="bg-gray-100 border-b border-gray-200 px-6 py-2">
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-red-600">{kdsCounts.new} new</span>
            <span className="text-yellow-600">{kdsCounts.preparing} preparing</span>
            <span className="text-green-600">{kdsCounts.ready} ready</span>
            <span className="text-gray-500">{kdsCounts.served} served</span>
          </div>
        </div>

        {/* Inline action error */}
        {actionError && (
          <div className="mx-6 mt-3 px-4 py-2 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm">{actionError}</span>
            <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {visibleItems.map((item) => {
            const kdsStyle = getKdsStatusStyle(item.kds_status);
            const KdsIcon = kdsStyle.icon;
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl p-4 flex items-start gap-3 shadow-sm border border-gray-100"
              >
                <span className={`px-2 py-1 rounded-lg text-[10px] font-medium text-white flex items-center gap-1 ${kdsStyle.bg}`}>
                  <KdsIcon className="w-3 h-3" />
                  {kdsStyle.text}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{item.product_name}</p>
                  {item.modifiers_json?.modifiers && item.modifiers_json.modifiers.length > 0 && (
                    <p className="text-xs text-gray-500">
                      + {item.modifiers_json.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs italic text-orange-600 mt-1">"{item.notes}"</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-mono text-sm text-gray-600">
                    {item.quantity} x {item.unit_price_ttc.toFixed(2)}
                  </p>
                  <p className="font-mono font-bold text-gray-900">
                    {(item.quantity * item.unit_price_ttc).toFixed(2)} MAD
                  </p>
                </div>

                {item.kds_status === "new" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openTransferDialog(item.id)}
                      title="Transfer to another table"
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 flex items-center justify-center transition"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removingItemId === item.id}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 disabled:opacity-40 flex items-center justify-center transition"
                    >
                      {removingItemId === item.id
                        ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ready Banner */}
        {readyItems.length > 0 && (
          <div className="mx-6 mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 text-sm">
              {readyItems.length} items ready — {readyItems.map((i) => `${i.product_name} x${i.quantity}`).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Right Column */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Session Summary */}
        <div className="px-4 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Session Total</p>
          <p className="font-mono text-2xl font-bold text-gray-900">{session.session_total.toFixed(2)} MAD</p>
          <p className="text-xs text-gray-500 mt-1">{visibleItems.length} items</p>
          <p className="text-xs text-gray-500">Opened {getElapsedTime(session.opened_at)} ago</p>
        </div>

        {/* Quick Add Products */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Quick Add</p>
          <div className="flex gap-1 mb-3 overflow-x-auto">
            {["Coffee", "Pastries", "Drinks"].map((cat) => (
              <button
                key={cat}
                onClick={() => setQuickAddCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition ${
                  quickAddCategory === cat
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {filteredQuickProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleQuickAdd(product)}
                disabled={addingItemId === product.id}
                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3 text-left transition disabled:opacity-50 relative"
              >
                {addingItemId === product.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                    <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                )}
                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                <p className="font-mono text-xs text-orange-500">{product.price.toFixed(2)} MAD</p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-gray-200 space-y-2">
          <button
            onClick={handleClosePay}
            disabled={hasBlockingItems || closingTable}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            title={hasBlockingItems ? "Wait for all items to be ready" : ""}
          >
            {closingTable
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Closing...</>
              : "Close & Pay"}
          </button>
          <button
            onClick={() => onSplit(session)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
          >
            Split Bill
          </button>
          <button
            onClick={handleCancel}
            disabled={cancellingTable}
            className="w-full text-red-500 hover:text-red-600 disabled:opacity-40 text-sm font-medium py-1"
          >
            {cancellingTable ? "Cancelling..." : "Cancel Table"}
          </button>
        </div>
      </div>

      {/* Transfer Item Dialog */}
      {transferDialogItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">Transfer Item</h3>
              <button onClick={() => setTransferDialogItemId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {transferError && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{transferError}</div>
            )}
            {transferableSessions.length === 0 ? (
              <p className="text-sm text-gray-500">No other open tables available for transfer.</p>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Move to table</label>
                <select
                  value={transferTargetSessionId}
                  onChange={(e) => setTransferTargetSessionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Select table…</option>
                  {transferableSessions.map((s) => (
                    <option key={s.session_id} value={s.session_id}>Table {s.table_number}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setTransferDialogItemId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferItem}
                disabled={!transferTargetSessionId || transferring}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 transition"
              >
                {transferring ? "Moving…" : "Move Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Local type for the live session state used by TableSessionScreen and SplitBillScreen
interface LiveSession {
  id: string;
  table_id: string;
  table_number: string;
  area_name: string;
  status: 'open' | 'awaiting_payment';
  guest_count: number;
  opened_at: string;
  items: SessionItem[];
  session_total: number;
}

// ============================================================
// SPLIT BILL SCREEN (Phase 10) — real API
// ============================================================

function SplitBillScreen({
  session,
  onConfirm,
  onBack,
}: {
  session: LiveSession;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [splitMode, setSplitMode] = useState<"even" | "by_item" | "custom">("by_item");
  const [splitCount, setSplitCount] = useState(Math.max(2, session.guest_count || 2));
  const [itemAssignments, setItemAssignments] = useState<Record<string, string>>({});
  const [customSplits, setCustomSplits] = useState<{ id: string; amount: number }[]>([
    { id: "1", amount: 0 },
    { id: "2", amount: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);

  const visibleItems = session.items.filter((i) => i.kds_status !== "cancelled");
  const guests = Array.from({ length: splitCount }, (_, i) => `Guest ${i + 1}`);
  const evenAmount = session.session_total / splitCount;
  const remainder = session.session_total - Math.floor(evenAmount * 100) / 100 * splitCount;

  const guestTotals = guests.reduce((acc, guest) => {
    const total = visibleItems
      .filter((item) => itemAssignments[item.id] === guest)
      .reduce((sum, item) => sum + item.quantity * item.unit_price_ttc, 0);
    acc[guest] = total;
    return acc;
  }, {} as Record<string, number>);

  const unassignedItems = visibleItems.filter((item) => !itemAssignments[item.id]);
  const unassignedTotal = unassignedItems.reduce((sum, item) => sum + item.quantity * item.unit_price_ttc, 0);

  const customTotal = customSplits.reduce((sum, s) => sum + s.amount, 0);
  const customRemainder = session.session_total - customTotal;

  const isBalanced =
    splitMode === "even" ||
    (splitMode === "by_item" && unassignedItems.length === 0) ||
    (splitMode === "custom" && Math.abs(customRemainder) < 0.01);

  const handleConfirm = async () => {
    setSubmitting(true);
    setSplitError(null);

    let result;
    if (splitMode === "even") {
      result = await terminalService.splitBill(session.id, "even", splitCount);
    } else if (splitMode === "by_item") {
      const splits = guests.map((g) => ({
        label: g,
        item_ids: visibleItems.filter((i) => itemAssignments[i.id] === g).map((i) => i.id),
      }));
      result = await terminalService.splitBill(session.id, "by_item", undefined, splits);
    } else {
      // custom — not directly supported by the backend split endpoint;
      // fall back to even split with the configured count
      result = await terminalService.splitBill(session.id, "even", customSplits.length);
    }

    setSubmitting(false);
    if (!result.success) {
      setSplitError(result.error ?? "Failed to split bill");
      return;
    }
    onConfirm();
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-white flex flex-col">
      {/* Top Bar */}
      <header className="h-14 bg-gray-800 border-b border-white/10 flex items-center px-6">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition mr-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Split Bill - {session.table_number}</h1>
        <div className="ml-auto font-mono text-lg">
          Total: <span className="font-bold">{session.session_total.toFixed(2)} MAD</span>
        </div>
      </header>

      {/* Split Method Selector */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "even" as const, icon: Scale, label: "Even Split", subtitle: "Divide equally" },
            { id: "by_item" as const, icon: List, label: "By Item", subtitle: "Assign items to guests" },
            { id: "custom" as const, icon: Sliders, label: "Custom", subtitle: "Set amounts manually" },
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => setSplitMode(method.id)}
              className={`rounded-2xl border-2 p-5 text-center transition ${
                splitMode === method.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <method.icon className="w-6 h-6 mx-auto mb-2" />
              <p className="font-medium">{method.label}</p>
              <p className="text-xs text-gray-400">{method.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Split Count Selector */}
      {(splitMode === "even" || splitMode === "custom") && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-center gap-4">
          <span className="text-sm">Number of ways to split:</span>
          <button
            onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
            className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-2xl font-bold w-10 text-center">{splitCount}</span>
          <button
            onClick={() => setSplitCount(Math.min(8, splitCount + 1))}
            className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Even Split Mode */}
        {splitMode === "even" && (
          <div className="bg-gray-800 rounded-2xl p-5">
            <h3 className="font-bold mb-4">{splitCount}-way split</h3>
            <div className="space-y-3">
              {guests.map((guest, i) => (
                <div key={guest} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <span>{guest}</span>
                  <span className="font-mono font-bold">
                    {(evenAmount + (i === guests.length - 1 ? remainder : 0)).toFixed(2)} MAD
                  </span>
                </div>
              ))}
            </div>
            {remainder > 0.001 && (
              <p className="text-xs text-gray-400 mt-3">
                Remainder of {remainder.toFixed(2)} MAD added to last split
              </p>
            )}
          </div>
        )}

        {/* By Item Mode */}
        {splitMode === "by_item" && (
          <div className="flex gap-4">
            {/* Items to assign */}
            <div className="flex-1 bg-gray-800 rounded-xl p-4">
              <h3 className="font-bold mb-3">Items to Assign</h3>
              <div className="space-y-2">
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg flex items-center justify-between ${
                      itemAssignments[item.id] ? "bg-green-900/30" : "bg-gray-700"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="font-mono text-xs text-gray-400">
                        {item.quantity} × {(item.quantity * item.unit_price_ttc).toFixed(2)} MAD
                      </p>
                    </div>
                    <select
                      value={itemAssignments[item.id] || ""}
                      onChange={(e) =>
                        setItemAssignments((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="bg-gray-600 rounded-lg px-3 py-2 text-sm min-w-[120px]"
                    >
                      <option value="">Assign to...</option>
                      {guests.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Summary */}
            <div className="w-64 space-y-3">
              {guests.map((guest) => (
                <div key={guest} className="bg-gray-800 rounded-xl p-4">
                  <h4 className="font-medium mb-2">{guest}</h4>
                  <div className="space-y-1 text-xs text-gray-400">
                    {visibleItems
                      .filter((item) => itemAssignments[item.id] === guest)
                      .map((item) => (
                        <p key={item.id}>{item.product_name}</p>
                      ))}
                  </div>
                  <p className="font-mono font-bold mt-2">
                    {guestTotals[guest]?.toFixed(2) || "0.00"} MAD
                  </p>
                </div>
              ))}
              {unassignedItems.length > 0 && (
                <div className="bg-gray-700 rounded-xl p-4 border border-yellow-500/30">
                  <h4 className="font-medium mb-2 text-yellow-400">Unassigned</h4>
                  <p className="font-mono font-bold">{unassignedTotal.toFixed(2)} MAD</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Mode */}
        {splitMode === "custom" && (
          <div className="bg-gray-800 rounded-2xl p-5">
            <div className="space-y-3">
              {customSplits.map((split, i) => (
                <div key={split.id} className="flex items-center gap-3">
                  <span className="w-20">Split {i + 1}</span>
                  <input
                    type="number"
                    value={split.amount}
                    onChange={(e) => {
                      const newSplits = [...customSplits];
                      newSplits[i] = { ...newSplits[i], amount: parseFloat(e.target.value) || 0 };
                      setCustomSplits(newSplits);
                    }}
                    className="flex-1 bg-gray-700 rounded-lg px-4 py-2 font-mono"
                  />
                  <span className="text-gray-400">MAD</span>
                  <button
                    onClick={() => setCustomSplits(customSplits.filter((_, j) => j !== i))}
                    className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCustomSplits([...customSplits, { id: Date.now().toString(), amount: 0 }])}
              className="mt-4 w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition"
            >
              + Add Split
            </button>
            <div className={`mt-4 p-3 rounded-lg ${
              Math.abs(customRemainder) < 0.01 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
            }`}>
              <span>Remainder: </span>
              <span className="font-mono font-bold">{customRemainder.toFixed(2)} MAD</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-white/10 px-4 py-4">
        {splitError && (
          <p className="text-red-400 text-sm text-center mb-2">{splitError}</p>
        )}
        <p className="text-sm text-gray-400 mb-3 text-center">
          Splitting {session.session_total.toFixed(2)} MAD into {splitCount} payments
        </p>
        <button
          onClick={handleConfirm}
          disabled={!isBalanced || submitting}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold py-4 rounded-xl transition flex items-center justify-center gap-2"
        >
          {submitting
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
            : "Confirm & Proceed to Payment"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

type Screen = "setup" | "login" | "sales" | "payment" | "cash" | "success" | "void" | "floor-plan" | "table-session" | "split-bill";

export default function App() {
  const [screen, setScreen] = useState<Screen>("sales");
  // Restaurant session state threaded through screens
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<OpenedSession | null>(null);
  const [splitSession, setSplitSession] = useState<LiveSession | null>(null);

  return (
    <>
      <div>
        {screen === "setup" && <SetupScreen onNext={() => setScreen("login")} />}
        {screen === "login" && <PinLoginScreen onLogin={() => setScreen("sales")} />}
        {screen === "sales" && (
          <SalesScreen
            onCheckout={() => setScreen("payment")}
            screen={screen}
            setScreen={setScreen}
          />
        )}
        {screen === "payment" && (
          <PaymentScreen
            onCash={() => setScreen("cash")}
            onCard={() => setScreen("success")}
            onBack={() => setScreen("sales")}
          />
        )}
        {screen === "cash" && (
          <CashNumpad
            onConfirm={() => setScreen("success")}
            onBack={() => setScreen("payment")}
          />
        )}
        {screen === "success" && (
          <SuccessScreen
            onVoid={() => setScreen("void")}
            onNewSale={() => setScreen("sales")}
          />
        )}
        {screen === "void" && (
          <VoidScreen
            onConfirm={() => setScreen("sales")}
            onCancel={() => setScreen("success")}
          />
        )}
        {screen === "floor-plan" && (
          <FloorPlanScreen
            onSelectTable={(tableId, session) => {
              setActiveTableId(tableId);
              setActiveSession(session);
              setScreen("table-session");
            }}
            onBack={() => setScreen("sales")}
          />
        )}
        {screen === "table-session" && activeTableId && (
          <TableSessionScreen
            tableId={activeTableId}
            initialSession={activeSession}
            onBack={() => setScreen("floor-plan")}
            onPay={(_sessionId) => setScreen("payment")}
            onSplit={(sess) => {
              setSplitSession(sess);
              setScreen("split-bill");
            }}
          />
        )}
        {screen === "split-bill" && splitSession && (
          <SplitBillScreen
            session={splitSession}
            onConfirm={() => setScreen("payment")}
            onBack={() => setScreen("table-session")}
          />
        )}
      </div>
    </>
  );
}
