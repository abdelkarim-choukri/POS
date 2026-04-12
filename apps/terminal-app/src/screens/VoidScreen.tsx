import { useState } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import { terminalApi } from '../api/terminal';
import { ArrowLeft, AlertTriangle, Delete } from 'lucide-react';
import { formatMAD } from '../utils';

const REASONS = ['Customer changed mind', 'Wrong items', 'Employee error', 'Other'];

export default function VoidScreen() {
  const { setScreen, lastTransaction, employee } = useTerminal();
  const [reason, setReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [showPinPad, setShowPinPad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const needsManager = !employee?.can_void;

  const handleVoid = async () => {
    if (!reason) return;
    if (needsManager && managerPin.length < 4) { setShowPinPad(true); return; }

    setLoading(true); setError('');
    try {
      await terminalApi.voidTransaction(lastTransaction.id, {
        reason,
        manager_pin: needsManager ? managerPin : undefined,
      });
      setScreen('sales');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Void failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePinKey = (key: string) => {
    if (key === 'CLR') setManagerPin('');
    else if (key === 'DEL') setManagerPin((p) => p.slice(0, -1));
    else if (managerPin.length < 6) setManagerPin((p) => p + key);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-pos-bg">
      <div className="bg-pos-card rounded-2xl p-8 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setScreen('success')} className="p-2 hover:bg-pos-accent rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <AlertTriangle size={24} className="text-pos-orange" />
          <h1 className="text-lg font-bold">Void Transaction</h1>
        </div>

        {/* Transaction Info */}
        {lastTransaction && (
          <div className="bg-pos-accent rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-400">{lastTransaction.transaction_number}</p>
            <p className="text-xl font-bold">{formatMAD(parseFloat(lastTransaction.total))}</p>
          </div>
        )}

        {error && <div className="bg-red-500/20 text-red-300 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

        {/* Reason Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Reason for Void</h3>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition ${
                  reason === r ? 'bg-pos-orange text-white' : 'bg-pos-accent text-gray-300 hover:bg-gray-600'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Manager PIN (if needed) */}
        {needsManager && showPinPad && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Manager PIN Required</h3>
            <div className="flex gap-2 justify-center mb-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < managerPin.length ? 'bg-pos-orange border-pos-orange' : 'border-gray-500'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((key) => (
                <button key={key} onClick={() => handlePinKey(key)}
                  className={`h-12 rounded-xl text-sm font-semibold transition active:scale-95 ${
                    key === 'CLR' || key === 'DEL' ? 'bg-gray-700 text-gray-300 text-xs' : 'bg-pos-accent text-white hover:bg-gray-600'
                  }`}>
                  {key === 'DEL' ? <Delete size={16} className="mx-auto" /> : key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setScreen('success')}
            className="flex-1 bg-pos-accent text-gray-300 py-4 rounded-xl font-semibold hover:bg-gray-600 transition">
            Cancel
          </button>
          <button onClick={handleVoid} disabled={!reason || loading}
            className="flex-1 bg-pos-red text-white py-4 rounded-xl font-bold hover:bg-red-600 disabled:opacity-30 transition active:scale-[0.98]">
            {loading ? 'Voiding...' : needsManager && !showPinPad ? 'Enter Manager PIN' : 'Confirm Void'}
          </button>
        </div>
      </div>
    </div>
  );
}
