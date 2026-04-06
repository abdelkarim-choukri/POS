import { useTerminal } from '../contexts/TerminalContext';
import { useCart } from '../contexts/CartContext';
import { ArrowLeft, Banknote, CreditCard } from 'lucide-react';
import { formatMAD } from '../utils';

export default function PaymentScreen() {
  const { setScreen } = useTerminal();
  const { items, total } = useCart();

  const selectPayment = (method: string) => {
    localStorage.setItem('selected_payment', method);
    setScreen('confirm');
  };

  return (
    <div className="h-screen flex flex-col bg-pos-bg">
      <div className="flex items-center px-6 py-4 bg-pos-card border-b border-white/10">
        <button onClick={() => setScreen('sales')} className="mr-4 p-2 hover:bg-pos-accent rounded-lg transition">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Payment</h1>
      </div>

      <div className="flex-1 flex">
        {/* Order Summary */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Order Summary</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-start bg-pos-card rounded-xl p-4">
                <div>
                  <p className="font-medium">{item.product.name}</p>
                  {item.variant && <p className="text-xs text-gray-400">{item.variant.name}</p>}
                  {item.selectedModifiers.length > 0 && (
                    <p className="text-xs text-pos-blue mt-0.5">{item.selectedModifiers.map((m) => m.name).join(', ')}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity} × {formatMAD(item.unitPrice)}</p>
                </div>
                <span className="font-bold">{formatMAD(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-xl text-gray-400">Total</span>
            <span className="text-3xl font-bold">{formatMAD(total)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="w-80 bg-pos-card border-l border-white/10 p-6 flex flex-col gap-4 justify-center">
          <h2 className="text-sm font-semibold text-gray-400 text-center mb-2">Select Payment Method</h2>

          <button onClick={() => selectPayment('cash')}
            className="bg-pos-green hover:bg-green-600 text-white py-6 rounded-2xl flex items-center justify-center gap-3 text-xl font-bold transition active:scale-[0.97]">
            <Banknote size={28} /> Cash
          </button>

          <button onClick={() => selectPayment('card_cmi')}
            className="bg-pos-blue hover:bg-blue-600 text-white py-6 rounded-2xl flex items-center justify-center gap-3 text-xl font-bold transition active:scale-[0.97]">
            <CreditCard size={28} /> Card (CMI)
          </button>

          <button onClick={() => selectPayment('card_payzone')}
            className="bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-2xl flex items-center justify-center gap-3 text-xl font-bold transition active:scale-[0.97]">
            <CreditCard size={28} /> Card (Payzone)
          </button>
        </div>
      </div>
    </div>
  );
}
