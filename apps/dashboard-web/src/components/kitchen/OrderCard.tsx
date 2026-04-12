import { Clock, ChefHat, CheckCircle, ArrowRight } from 'lucide-react';

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
  order_status: 'new' | 'preparing' | 'ready' | 'served';
  items: OrderItem[];
  user?: { first_name: string; last_name: string };
  created_at: string;
  notes?: string;
}

const statusConfig = {
  new: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', label: 'NEW', icon: Clock, next: 'preparing' as const },
  preparing: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', label: 'PREPARING', icon: ChefHat, next: 'ready' as const },
  ready: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', label: 'READY', icon: CheckCircle, next: 'served' as const },
  served: { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-400', label: 'SERVED', icon: CheckCircle, next: null },
};

const nextLabel: Record<string, string> = { new: 'Start Preparing', preparing: 'Mark Ready', ready: 'Mark Served' };

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function OrderCard({ order, onAdvance }: { order: Order; onAdvance: (id: string, next: string) => void }) {
  const cfg = statusConfig[order.order_status];
  const Icon = cfg.icon;

  return (
    <div className={`${cfg.bg} border-2 ${cfg.border} rounded-2xl overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Icon size={18} className={cfg.text} />
          <span className="font-bold text-lg">{order.transaction_number.split('-').pop()}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded ${cfg.text} ${cfg.bg}`}>{cfg.label}</span>
          <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-3 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="bg-white/10 text-white text-xs font-bold w-6 h-6 rounded flex items-center justify-center flex-shrink-0">
              {item.quantity}
            </span>
            <div>
              <p className="text-sm font-medium">{item.product_name}</p>
              {item.variant_name && <p className="text-xs text-gray-400">{item.variant_name}</p>}
              {item.modifiers_json?.modifiers && item.modifiers_json.modifiers.length > 0 && (
                <p className="text-xs text-blue-400">+ {item.modifiers_json.modifiers.map((m) => m.name).join(', ')}</p>
              )}
            </div>
          </div>
        ))}
        {order.notes && (
          <div className="bg-yellow-500/10 text-yellow-300 text-xs px-3 py-2 rounded-lg mt-2">
            Note: {order.notes}
          </div>
        )}
      </div>

      {/* Footer — employee + advance button */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {order.user ? `${order.user.first_name}` : ''}
        </span>
        {cfg.next && (
          <button
            onClick={() => onAdvance(order.id, cfg.next!)}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95
              ${order.order_status === 'new' ? 'bg-yellow-500 text-black hover:bg-yellow-400' : ''}
              ${order.order_status === 'preparing' ? 'bg-green-500 text-white hover:bg-green-400' : ''}
              ${order.order_status === 'ready' ? 'bg-blue-500 text-white hover:bg-blue-400' : ''}
            `}
          >
            {nextLabel[order.order_status]} <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
