import { useState } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import { Delete, LogIn } from 'lucide-react';

export default function PinLoginScreen() {
  const { config, loginWithPin } = useTerminal();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKey = (key: string) => {
    if (pin.length < 6) setPin((p) => p + key);
  };
  const handleClear = () => setPin('');
  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const handleLogin = async () => {
    if (pin.length < 4) return;
    setError(''); setLoading(true);
    try { await loginWithPin(pin); }
    catch (e: any) { setError(e.response?.data?.message || 'Invalid PIN'); setPin(''); }
    finally { setLoading(false); }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pos-bg">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-pos-blue rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-xl font-bold">P</span>
        </div>
        <h1 className="text-xl font-bold">{config?.business.name || 'POS Terminal'}</h1>
        <p className="text-gray-400 text-sm mt-1">{config?.location.name} — {config?.terminal.terminal_code}</p>
      </div>

      {/* PIN Display */}
      <div className="mb-6">
        <div className="flex gap-3 justify-center mb-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all ${i < pin.length ? 'bg-pos-blue border-pos-blue scale-110' : 'border-gray-500'}`} />
          ))}
        </div>
        {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-72">
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'CLR') handleClear();
              else if (key === 'DEL') handleDelete();
              else handleKey(key);
            }}
            className={`h-16 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
              key === 'CLR' ? 'bg-gray-700 text-gray-300 text-sm' :
              key === 'DEL' ? 'bg-gray-700 text-gray-300' :
              'bg-pos-card hover:bg-pos-accent text-white'
            }`}
          >
            {key === 'DEL' ? <Delete size={20} className="mx-auto" /> : key}
          </button>
        ))}
      </div>

      {/* Login Button */}
      <button
        onClick={handleLogin}
        disabled={pin.length < 4 || loading}
        className="mt-6 w-72 bg-pos-green text-white text-lg font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 disabled:opacity-30 disabled:hover:bg-pos-green transition"
      >
        <LogIn size={20} />
        {loading ? 'Logging in...' : 'Start Shift'}
      </button>

      <p className="text-gray-600 text-xs mt-4">PINs: 1234 (Owner) / 5678 (Employee)</p>
    </div>
  );
}
