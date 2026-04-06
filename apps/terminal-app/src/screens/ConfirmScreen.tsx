import { useState } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import { useCart } from '../contexts/CartContext';
import { terminalApi } from '../api/terminal';
import { addToSyncQueue, saveLocalTransaction } from '../services/offlineStore';
import { ArrowLeft, CheckCircle, Banknote, CreditCard, WifiOff } from 'lucide-react';
import { formatMAD } from '../utils';

const methodIcons: Record<string, any> = { cash: Banknote, card_cmi: CreditCard, card_payzone: CreditCard };
const methodLabels: Record<string, string> = { cash: 'Cash', card_cmi: 'Card (CMI)', card_payzone: 'Card (Payzone)' };

export default function ConfirmScreen() {
  const { config, employee, setScreen, setLastTransaction, isOffline } = useTerminal();
  const { items, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const method = localStorage.getItem('selected_payment') || 'cash';
  const Icon = methodIcons[method] || Banknote;

  const buildPayload = () => ({
    items: items.map((i) => ({
      product_id: i.product.id,
      variant_id: i.variant?.id || null,
      product_name: i.product.name,
      variant_name: i.variant?.name || null,
      quantity: i.quantity,
      unit_price: Number(i.unitPrice),
      modifiers_json: i.selectedModifiers.length > 0 ? { modifiers: i.selectedModifiers } : null,
      line_total: Number(i.lineTotal),
    })),
    subtotal: Number(total),
    total: Number(total),
    payment_method: method,
    terminal_id: config?.terminal.id,
    location_id: config?.location.id,
  });

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    const payload = buildPayload();

    if (isOffline || !navigator.onLine) {
      // OFFLINE MODE — save locally and queue for sync
      const offlineTxn = {
        id: `offline-${Date.now()}`,
        transaction_number: `OFL-${Date.now().toString(36).toUpperCase()}`,
        ...payload,
        status: 'completed',
        is_offline: true,
        created_at: new Date().toISOString(),
      };

      await saveLocalTransaction(offlineTxn);
      await addToSyncQueue({
        operation_type: 'transaction',
        payload,
        created_at: new Date().toISOString(),
        attempts: 0,
      });

      setLastTransaction(offlineTxn);
      clearCart();
      setLoading(false);
      setScreen('success');
      return;
    }

    // ONLINE MODE — send to server
    try {
      const res = await terminalApi.createTransaction(payload);
      setLastTransaction(res.data);
      clearCart();
      setScreen('success');
    } catch (e: any) {
      // If server fails, fall back to offline mode
      const offlineTxn = {
        id: `offline-${Date.now()}`,
        transaction_number: `OFL-${Date.now().toString(36).toUpperCase()}`,
        ...payload,
        status: 'completed',
        is_offline: true,
        created_at: new Date().toISOString(),
      };
      await saveLocalTransaction(offlineTxn);
      await addToSyncQueue({
        operation_type: 'transaction',
        payload,
        created_at: new Date().toISOString(),
        attempts: 0,
      });
      setLastTransaction(offlineTxn);
      clearCart();
      setScreen('success');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-pos-bg">
      <div className="bg-pos-card rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
        <div className="w-16 h-16 bg-pos-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon size={32} />
        </div>
        <h1 className="text-xl font-bold mb-2">Confirm Payment</h1>
        <p className="text-gray-400 mb-2">{methodLabels[method]}</p>

        {isOffline && (
          <div className="flex items-center justify-center gap-2 text-pos-orange text-sm mb-4">
            <WifiOff size={14} />
            <span>Offline — transaction will sync later</span>
          </div>
        )}

        <div className="bg-pos-accent rounded-xl p-6 mb-6">
          <p className="text-gray-400 text-sm">Amount Due</p>
          <p className="text-4xl font-bold mt-1">{formatMAD(total)}</p>
        </div>

        {error && <div className="bg-red-500/20 text-red-300 text-sm px-4 py-3 rounded-xl mb-4 text-left">{error}</div>}

        <button onClick={handleConfirm} disabled={loading}
          className="w-full bg-pos-green text-white text-xl font-bold py-5 rounded-xl hover:bg-green-600 disabled:opacity-50 transition active:scale-[0.98] flex items-center justify-center gap-2 mb-3">
          <CheckCircle size={24} />
          {loading ? 'Processing...' : 'Confirm Payment'}
        </button>
        <button onClick={() => setScreen('payment')}
          className="w-full bg-pos-accent text-gray-300 py-3 rounded-xl hover:bg-gray-600 transition flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    </div>
  );
}
