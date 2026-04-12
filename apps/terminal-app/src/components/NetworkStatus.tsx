import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { getPendingCount, processSync } from '../services/syncService';

export default function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  useEffect(() => {
    const check = () => getPendingCount().then(setPending).catch(() => {});
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      const result = await processSync();
      const newCount = await getPendingCount();
      setPending(newCount);
      if (result.synced > 0) {
        console.log(`[Manual Sync] ${result.synced} items synced`);
      }
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  if (online && pending === 0) {
    return (
      <div className="flex items-center gap-1.5 text-pos-green text-xs">
        <Wifi size={12} />
        <span>Online</span>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="flex items-center gap-1.5 text-pos-orange text-xs">
        <WifiOff size={12} />
        <span>Offline</span>
        {pending > 0 && (
          <span className="bg-pos-orange/20 px-1.5 py-0.5 rounded text-[10px]">{pending} pending</span>
        )}
      </div>
    );
  }

  // Online but has pending items
  return (
    <div className="flex items-center gap-1.5 text-pos-blue text-xs">
      <CloudOff size={12} />
      <span>{pending} pending</span>
      <button onClick={handleManualSync} disabled={syncing}
        className="p-0.5 hover:bg-pos-accent rounded transition">
        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}
