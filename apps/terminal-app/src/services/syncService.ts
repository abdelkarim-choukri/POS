import api from '../api/client';
import {
  getSyncQueue, removeSyncItem, updateSyncItem,
  getSyncQueueCount, SyncQueueItem,
} from './offlineStore';

const MAX_RETRIES = 5;

export async function processSync(): Promise<{ synced: number; failed: number }> {
  const queue = await getSyncQueue();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      switch (item.operation_type) {
        case 'transaction':
          await api.post('/terminal/transactions', item.payload);
          break;
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
      await removeSyncItem(item.id!);
      synced++;
    } catch (error: any) {
      failed++;
      if (item.attempts >= MAX_RETRIES) {
        // Mark as permanently failed but keep in queue for manual review
        await updateSyncItem({
          ...item,
          attempts: item.attempts + 1,
          last_error: error.response?.data?.message || error.message || 'Unknown error',
        });
      } else {
        await updateSyncItem({
          ...item,
          attempts: item.attempts + 1,
          last_error: error.response?.data?.message || error.message || 'Unknown error',
        });
      }
    }
  }

  return { synced, failed };
}

export async function getPendingCount(): Promise<number> {
  return getSyncQueueCount();
}

// Auto-sync: runs every 30 seconds when online
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(onSync?: (result: { synced: number; failed: number }) => void) {
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    if (!navigator.onLine) return;
    const count = await getPendingCount();
    if (count === 0) return;

    console.log(`[Sync] Processing ${count} pending items...`);
    const result = await processSync();
    console.log(`[Sync] Done: ${result.synced} synced, ${result.failed} failed`);
    if (onSync) onSync(result);
  }, 30000);

  // Also sync immediately when coming back online
  window.addEventListener('online', async () => {
    console.log('[Sync] Back online — syncing...');
    const result = await processSync();
    if (onSync) onSync(result);
  });
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
