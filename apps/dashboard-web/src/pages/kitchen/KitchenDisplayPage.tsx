import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChefHat, Clock, CheckCircle, Truck, Bell, Volume2, VolumeX } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:3000';

interface OrderItem {
  id: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  modifiers_json?: { modifiers?: { name: string }[] };
}

interface Order {
  id: string;
  transaction_number: string;
  order_status: string;
  items: OrderItem[];
  user?: { first_name: string; last_name: string };
  notes?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; icon: any; next: string | null }> = {
  new:       { label: 'NEW',       bg: 'bg-red-500/20',    border: 'border-red-500',    icon: Bell,        next: 'preparing' },
  preparing: { label: 'PREPARING', bg: 'bg-yellow-500/20', border: 'border-yellow-500', icon: ChefHat,     next: 'ready' },
  ready:     { label: 'READY',     bg: 'bg-green-500/20',  border: 'border-green-500',  icon: CheckCircle, next: 'served' },
  served:    { label: 'SERVED',    bg: 'bg-gray-500/20',   border: 'border-gray-500',   icon: Truck,       next: null },
};

function getElapsedMinutes(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get location_id from URL params
  const params = new URLSearchParams(window.location.search);
  const locationId = params.get('location_id') || '';

  const playAlert = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        osc2.connect(gain);
        osc2.frequency.value = 1000;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.2);
      }, 250);
    } catch (e) {}
  }, [soundEnabled]);

  // Fetch active orders
  const fetchOrders = useCallback(async () => {
    if (!locationId) return;
    try {
      const res = await fetch(`${API_BASE}/api/kds/orders?location_id=${locationId}`);
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  // WebSocket connection
  useEffect(() => {
    if (!locationId) return;
    fetchOrders();

    const socket = io(`${API_BASE}/kds`, {
      query: { location_id: locationId },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('new_order', (order: Order) => {
      setOrders((prev) => {
        if (prev.find((o) => o.id === order.id)) return prev;
        return [...prev, order];
      });
      playAlert();
    });

    socket.on('order_updated', (update: { id: string; order_status: string }) => {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === update.id ? { ...o, order_status: update.order_status } : o))
          .filter((o) => o.order_status !== 'served'),
      );
    });

    socketRef.current = socket;

    // Poll fallback every 30s
    const interval = setInterval(fetchOrders, 30000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [locationId, fetchOrders, playAlert]);

  // Update order status
  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`${API_BASE}/api/kds/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: newStatus }),
      });
      // Optimistic update
      setOrders((prev) =>
        prev
          .map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
          .filter((o) => o.order_status !== 'served'),
      );
    } catch (e) {
      console.error('Failed to update order:', e);
    }
  };

  if (!locationId) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <ChefHat size={64} className="mx-auto mb-4 text-orange-400" />
          <h1 className="text-2xl font-bold mb-2">Kitchen Display System</h1>
          <p className="text-gray-400 mb-4">Add ?location_id=YOUR_LOCATION_ID to the URL</p>
          <p className="text-gray-500 text-sm">Get your location ID from the Super Admin dashboard</p>
        </div>
      </div>
    );
  }

  const newOrders = orders.filter((o) => o.order_status === 'new');
  const preparingOrders = orders.filter((o) => o.order_status === 'preparing');
  const readyOrders = orders.filter((o) => o.order_status === 'ready');

  return (
    <div className="h-screen bg-gray-950 flex flex-col text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-white/10">
        <div className="flex items-center gap-3">
          <ChefHat size={24} className="text-orange-400" />
          <span className="text-lg font-bold">Kitchen Display</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-red-400 font-bold">{newOrders.length}</span>
            <span className="text-gray-500">New</span>
            <span className="text-yellow-400 font-bold ml-2">{preparingOrders.length}</span>
            <span className="text-gray-500">Prep</span>
            <span className="text-green-400 font-bold ml-2">{readyOrders.length}</span>
            <span className="text-gray-500">Ready</span>
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-gray-500" />}
          </button>
          <button onClick={fetchOrders}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
            Refresh
          </button>
        </div>
      </div>

      {/* Order Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <ChefHat size={64} className="mb-4" />
            <p className="text-xl">No active orders</p>
            <p className="text-sm mt-1">Orders will appear here when placed</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onUpdateStatus }: { order: Order; onUpdateStatus: (id: string, s: string) => void }) {
  const config = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.new;
  const Icon = config.icon;
  const elapsed = getElapsedMinutes(order.created_at);
  const isUrgent = order.order_status === 'new' && elapsed > 5;

  return (
    <div className={`rounded-xl border-2 ${config.border} ${config.bg} flex flex-col overflow-hidden ${isUrgent ? 'animate-pulse' : ''}`}>
      {/* Card Header */}
      <div className={`px-4 py-2 flex items-center justify-between border-b ${config.border}`}>
        <div className="flex items-center gap-2">
          <Icon size={16} />
          <span className="font-bold text-sm">{order.transaction_number}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={12} />
          <span className={elapsed > 10 ? 'text-red-400 font-bold' : ''}>{elapsed}m</span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-3 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="font-bold text-lg leading-none text-orange-400">{item.quantity}×</span>
            <div>
              <p className="text-sm font-medium leading-tight">{item.product_name}</p>
              {item.variant_name && <p className="text-xs text-gray-400">{item.variant_name}</p>}
              {item.modifiers_json?.modifiers?.map((m, i) => (
                <p key={i} className="text-xs text-blue-400">+ {m.name}</p>
              ))}
            </div>
          </div>
        ))}
        {order.notes && (
          <div className="mt-2 p-2 bg-yellow-500/10 rounded text-xs text-yellow-300 border border-yellow-500/30">
            📝 {order.notes}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {order.user ? `${order.user.first_name}` : ''}
        </span>
        {config.next && (
          <button
            onClick={() => onUpdateStatus(order.id, config.next!)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition active:scale-95 ${
              order.order_status === 'new'
                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                : order.order_status === 'preparing'
                ? 'bg-green-500 text-black hover:bg-green-400'
                : 'bg-blue-500 text-white hover:bg-blue-400'
            }`}
          >
            {order.order_status === 'new' ? 'Start' : order.order_status === 'preparing' ? 'Ready' : 'Served'}
          </button>
        )}
      </div>
    </div>
  );
}
