// Offline storage using IndexedDB for robust persistence

const DB_NAME = 'pos_terminal';
const DB_VERSION = 1;
const STORES = {
  syncQueue: 'sync_queue',
  catalog: 'catalog',
  transactions: 'local_transactions',
  settings: 'settings',
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.catalog)) {
        db.createObjectStore(STORES.catalog, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.transactions)) {
        db.createObjectStore(STORES.transactions, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' });
      }
    };
  });
}

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly') {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

// ===== SYNC QUEUE =====

export interface SyncQueueItem {
  id?: number;
  operation_type: 'transaction' | 'clock_in' | 'clock_out' | 'void';
  payload: any;
  created_at: string;
  attempts: number;
  last_error?: string;
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  const store = await getStore(STORES.syncQueue, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.add(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const store = await getStore(STORES.syncQueue);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeSyncItem(id: number): Promise<void> {
  const store = await getStore(STORES.syncQueue, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateSyncItem(item: SyncQueueItem): Promise<void> {
  const store = await getStore(STORES.syncQueue, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSyncQueueCount(): Promise<number> {
  const store = await getStore(STORES.syncQueue);
  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ===== CATALOG CACHE =====

export async function cacheCatalog(categories: any[], products: any[]): Promise<void> {
  const store = await getStore(STORES.catalog, 'readwrite');
  return new Promise((resolve, reject) => {
    store.put({ key: 'categories', data: categories, cached_at: new Date().toISOString() });
    const req = store.put({ key: 'products', data: products, cached_at: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedCatalog(): Promise<{ categories: any[]; products: any[] } | null> {
  const store = await getStore(STORES.catalog);
  return new Promise((resolve, reject) => {
    const catReq = store.get('categories');
    catReq.onsuccess = () => {
      const prodReq = store.get('products');
      prodReq.onsuccess = () => {
        if (catReq.result && prodReq.result) {
          resolve({ categories: catReq.result.data, products: prodReq.result.data });
        } else {
          resolve(null);
        }
      };
      prodReq.onerror = () => reject(prodReq.error);
    };
    catReq.onerror = () => reject(catReq.error);
  });
}

// ===== LOCAL TRANSACTIONS =====

export async function saveLocalTransaction(txn: any): Promise<void> {
  const store = await getStore(STORES.transactions, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(txn);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getLocalTransactions(): Promise<any[]> {
  const store = await getStore(STORES.transactions);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearLocalTransactions(): Promise<void> {
  const store = await getStore(STORES.transactions, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
