// apps/terminal-app/src/services/syncService.ts
import api from '../api/client';
import {
  getSyncQueue, removeSyncItem, updateSyncItem,
  getSyncQueueCount, updateLocalTransaction, SyncQueueItem,
} from './offlineStore';

const MAX_RETRIES = 5;

// ── Exponential backoff helper ───────────────────────────────────────────────
// After N failures, wait 2^N * 10 seconds before the next retry.
// attempt 1 → 20s, attempt 2 → 40s, attempt 3 → 80s, attempt 4 → 160s, attempt 5 → dead
function shouldRetryNow(item: SyncQueueItem): boolean {
  if (!item.last_error) return true;                        // never failed yet
  if (item.attempts >= MAX_RETRIES) return false;           // permanently failed
  const backoffMs = Math.pow(2, item.attempts) * 10_000;    // exponential
  const lastAttempt = new Date(item.last_attempt_at || item.created_at).getTime();
  return Date.now() - lastAttempt >= backoffMs;
}

export async function processSync(): Promise<{ synced: number; failed: number; dead: number }> {
  const queue = await getSyncQueue();
  let synced = 0;
  let failed = 0;
  let dead = 0;

  for (const item of queue) {
    // Skip permanently failed items
    if (item.attempts >= MAX_RETRIES) {
      dead++;
      continue;
    }

    // Skip items still in backoff cooldown
    if (!shouldRetryNow(item)) {
      continue;
    }

    try {
      switch (item.operation_type) {

        case 'transaction': {
          // Strip _offline_id — backend DTO rejects unknown properties
          const { _offline_id, ...cleanPayload } = item.payload;
          const res = await api.post('/terminal/transactions', cleanPayload);

          // Bug #2 fix — stamp server TXN number onto local record
          if (item.offline_ref && res.data?.transaction_number) {
            const serverTxn: string = res.data.transaction_number;
            const offlineId: string = _offline_id;
            if (offlineId) {
              await updateLocalTransaction(offlineId, {
                server_transaction_number: serverTxn,
                synced_at: new Date().toISOString(),
              });
            }
            console.log(`[Sync] ${item.offline_ref} → ${serverTxn}`);
          }
          break;
        }

        case 'clock_in':
          await api.post('/terminal/clock-in', item.payload);
          break;

        case 'clock_out':
          await api.post('/terminal/clock-out', item.payload);
          break;

        case 'void':
          await api.post(`/terminal/transactions/${item.payload.transaction_id}/void`, item.payload);
          break;
      }

      // ✅ Success — remove from queue
      await removeSyncItem(item.id!);
      synced++;

    } catch (error: any) {
      // ✗ Failure — increment attempts, record error + timestamp
      const newAttempts = item.attempts + 1;
      await updateSyncItem({
        ...item,
        attempts       : newAttempts,
        last_error     : error.response?.data?.message || error.message || 'Unknown error',
        last_attempt_at: new Date().toISOString(),
      });

      if (newAttempts >= MAX_RETRIES) {
        console.warn(`[Sync] Item ${item.id} permanently failed after ${MAX_RETRIES} attempts: ${item.last_error}`);
        dead++;
      } else {
        failed++;
      }
    }
  }

  return { synced, failed, dead };
}

// ── Stats for UI ─────────────────────────────────────────────────────────────

export async function getSyncStats(): Promise<{ pending: number; failed: number }> {
  const queue = await getSyncQueue();
  let pending = 0;
  let failed = 0;
  for (const item of queue) {
    if (item.attempts >= MAX_RETRIES) failed++;
    else pending++;
  }
  return { pending, failed };
}

export async function getPendingCount(): Promise<number> {
  return getSyncQueueCount();
}

export async function clearFailedItems(): Promise<number> {
  const queue = await getSyncQueue();
  let cleared = 0;
  for (const item of queue) {
    if (item.attempts >= MAX_RETRIES) {
      await removeSyncItem(item.id!);
      cleared++;
    }
  }
  return cleared;
}

// ── Auto-sync with proper cleanup ────────────────────────────────────────────

let syncInterval: ReturnType<typeof setInterval> | null = null;
let onlineHandler: (() => void) | null = null;

export function startAutoSync(onSync?: (result: { synced: number; failed: number; dead: number }) => void) {
  // Idempotent — clean up first if already running
  stopAutoSync();

  syncInterval = setInterval(async () => {
    if (!navigator.onLine) return;
    const { pending } = await getSyncStats();
    if (pending === 0) return;

    console.log(`[Sync] Processing ${pending} pending items...`);
    const result = await processSync();
    console.log(`[Sync] Done: ${result.synced} synced, ${result.failed} retryable, ${result.dead} dead`);
    if (onSync) onSync(result);
  }, 30_000);

  // Register online listener exactly once, store reference for cleanup
  onlineHandler = async () => {
    console.log('[Sync] Back online — syncing...');
    const result = await processSync();
    if (onSync) onSync(result);
  };
  window.addEventListener('online', onlineHandler);
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
}