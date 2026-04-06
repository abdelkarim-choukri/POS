import { useState, useEffect, useMemo } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import { CheckCircle, Printer, AlertTriangle, Eye, WifiOff } from 'lucide-react';
import { formatMAD } from '../utils';
import { buildReceiptData, printReceipt } from '../services/receiptService';
import ReceiptPreview from '../components/ReceiptPreview';

export default function SuccessScreen() {
  const { config, employee, setScreen, lastTransaction } = useTerminal();
  const [showVoid, setShowVoid] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [showReceipt, setShowReceipt] = useState(false);
  const [printing, setPrinting] = useState(false);

  const receiptData = useMemo(() => {
    if (!lastTransaction) return null;
    return buildReceiptData(
      config,
      employee,
      lastTransaction,
      lastTransaction.items || [],
      localStorage.getItem('selected_payment') || 'cash',
    );
  }, [config, employee, lastTransaction]);

  // Auto-print receipt
  useEffect(() => {
    if (receiptData && !lastTransaction?.is_offline) {
      handlePrint();
    }
  }, [receiptData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { setScreen('sales'); return 0; } return c - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [setScreen]);

  useEffect(() => {
    const t = setTimeout(() => setShowVoid(false), 60000);
    return () => clearTimeout(t);
  }, []);

  const handlePrint = async () => {
    if (!receiptData || printing) return;
    setPrinting(true);
    try { await printReceipt(receiptData); } catch {}
    finally { setPrinting(false); }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-pos-bg">
      <div className="text-center">
        <div className="w-24 h-24 bg-pos-green/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle size={56} className="text-pos-green" />
        </div>

        <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>

        {lastTransaction?.is_offline && (
          <div className="flex items-center justify-center gap-2 text-pos-orange text-sm mt-2 mb-2">
            <WifiOff size={14} />
            <span>Saved offline — will sync when connected</span>
          </div>
        )}

        {lastTransaction && (
          <div className="mt-4 mb-6">
            <p className="text-gray-400 text-lg">{lastTransaction.transaction_number}</p>
            <p className="text-2xl font-bold mt-2">{formatMAD(parseFloat(lastTransaction.total))}</p>
          </div>
        )}

        <div className="flex justify-center gap-3 mb-6">
          <button onClick={handlePrint} disabled={printing}
            className="flex items-center gap-2 bg-pos-accent text-gray-300 px-5 py-3 rounded-xl hover:bg-gray-600 transition text-sm">
            <Printer size={16} />
            {printing ? 'Printing...' : 'Print Receipt'}
          </button>
          <button onClick={() => setShowReceipt(true)}
            className="flex items-center gap-2 bg-pos-accent text-gray-300 px-5 py-3 rounded-xl hover:bg-gray-600 transition text-sm">
            <Eye size={16} />
            View Receipt
          </button>
        </div>

        <button onClick={() => setScreen('sales')}
          className="bg-pos-blue text-white text-lg font-bold px-12 py-4 rounded-xl hover:bg-blue-600 transition active:scale-[0.98] mb-4">
          New Order ({countdown}s)
        </button>

        {showVoid && lastTransaction && !lastTransaction.is_offline && (
          <button onClick={() => setScreen('void')}
            className="block mx-auto mt-4 text-sm text-gray-500 hover:text-red-400 transition flex items-center gap-1 justify-center">
            <AlertTriangle size={14} /> Void This Transaction
          </button>
        )}
      </div>

      {showReceipt && receiptData && (
        <ReceiptPreview data={receiptData} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}
