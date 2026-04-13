import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, AlertTriangle, Trash2 } from 'lucide-react';
import { getSyncStats, processSync, clearFailedItems } from '../services/syncService';

export default function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshStats = useCallback(() => {
    getSyncStats()
      .then(({ pending: p, failed: f }) => { setPending(p); setFailed(f); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const goOnline  = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 10_000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  const handleManualSync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      await processSync();
      refreshStats();
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  const handleClearFailed = async () => {
    const cleared = await clearFailedItems();
    if (cleared > 0) console.log(`[Sync] Cleared ${cleared} permanently failed items`);
    refreshStats();
  };

  // ── All clear ──────────────────────────────────────────────────────────────
  if (online && pending === 0 && failed === 0) {
    return (
      <div className="flex items-center gap-1.5 text-pos-green text-xs">
        <Wifi size={12} />
        <span>Online</span>
      </div>
    );
  }

  // ── Offline ────────────────────────────────────────────────────────────────
  if (!online) {
    return (
      <div className="flex items-center gap-1.5 text-pos-orange text-xs">
        <WifiOff size={12} />
        <span>Offline</span>
        {(pending + failed) > 0 && (
          <span className="bg-pos-orange/20 px-1.5 py-0.5 rounded text-[10px]">
            {pending + failed} queued
          </span>
        )}
      </div>
    );
  }

  // ── Online with pending and/or failed items ────────────────────────────────
  return (
    <div className="flex items-center gap-2 text-xs">

      {/* Pending (retryable) */}
      {pending > 0 && (
        <div className="flex items-center gap-1.5 text-pos-blue">
          <CloudOff size={12} />
          <span>{pending} pending</span>
          <button onClick={handleManualSync} disabled={syncing}
            className="p-0.5 hover:bg-pos-accent rounded transition"
            title="Sync now"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          </button>
        </div>
      )}

      {/* Failed (permanently — hit MAX_RETRIES) */}
      {failed > 0 && (
        <div className="flex items-center gap-1.5 text-red-400">
          <AlertTriangle size={12} />
          <span>{failed} failed</span>
          <button onClick={handleClearFailed}
            className="p-0.5 hover:bg-red-400/20 rounded transition"
            title="Clear failed items"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Edge case: no pending, no failed but we're in this branch (shouldn't happen, safety) */}
      {pending === 0 && failed === 0 && (
        <div className="flex items-center gap-1.5 text-pos-green">
          <Wifi size={12} />
          <span>Online</span>
        </div>
      )}
    </div>
  );
}