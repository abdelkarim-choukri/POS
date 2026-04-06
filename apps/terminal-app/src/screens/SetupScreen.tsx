import { useState } from 'react';
import { useTerminal } from '../contexts/TerminalContext';
import { Monitor } from 'lucide-react';

export default function SetupScreen() {
  const { activateTerminal } = useTerminal();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!code) return;
    setError(''); setLoading(true);
    try { await activateTerminal(code); }
    catch (e: any) { setError(e.response?.data?.message || 'Activation failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pos-bg">
      <div className="bg-pos-card rounded-2xl p-10 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-pos-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Monitor size={32} />
          </div>
          <h1 className="text-2xl font-bold">Terminal Setup</h1>
          <p className="text-gray-400 mt-2 text-sm">Enter the terminal code to activate</p>
        </div>
        {error && <div className="bg-red-500/20 text-red-300 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
        <input
          value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. T-001"
          className="w-full bg-pos-accent text-white text-center text-2xl font-mono px-4 py-4 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-pos-blue"
        />
        <button onClick={handleActivate} disabled={!code || loading}
          className="w-full bg-pos-blue text-white text-lg font-semibold py-4 rounded-xl hover:bg-blue-600 disabled:opacity-50 transition">
          {loading ? 'Activating...' : 'Activate Terminal'}
        </button>
        <p className="text-gray-500 text-xs text-center mt-4">Demo: T-001</p>
      </div>
    </div>
  );
}
