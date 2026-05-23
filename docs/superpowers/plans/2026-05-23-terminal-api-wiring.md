# Terminal API Wiring + OSS Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 14 stub methods in `terminal.service.ts` with real `fetch()` calls to the backend, add a base API helper with token management, and build the missing `/oss` page.

**Architecture:** A thin `lib/api.ts` module owns the base URL, token read/write, and a generic `apiFetch` wrapper. `terminal.service.ts` calls `apiFetch` for all network operations. The OSS page is a standalone Next.js route at `app/oss/page.tsx` — no auth, no service layer, direct `fetch` with auto-refresh polling.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, native `fetch` (no extra HTTP library needed)

---

## Env/Runtime Correction (READ FIRST)

The brief asked for `import.meta.env.VITE_API_URL` — **this does not work in Next.js**.
Next.js uses `process.env.NEXT_PUBLIC_*` and `.env.local`. The plan uses the correct Next.js
convention throughout. The `.env.local` file name is intentional — Next.js reads it automatically
in dev and it is git-ignored by default.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/frontend/pos-terminal-ui v3/.env.local` | **Create** | API base URL config |
| `apps/frontend/pos-terminal-ui v3/lib/api.ts` | **Create** | Base URL, token storage, `apiFetch` wrapper |
| `apps/frontend/pos-terminal-ui v3/lib/services/terminal.service.ts` | **Modify** | Replace 14 stubs with real `apiFetch` calls; keep `pushSync`/`getSyncStatus` as stubs |
| `apps/frontend/pos-terminal-ui v3/app/oss/page.tsx` | **Create** | Public OSS display — two-column Preparing/Ready, polls backend every 10s |

---

## Task 1: Create `.env.local` and `lib/api.ts`

**Files:**
- Create: `apps/frontend/pos-terminal-ui v3/.env.local`
- Create: `apps/frontend/pos-terminal-ui v3/lib/api.ts`

- [ ] **Step 1: Create `.env.local`**

```
# apps/frontend/pos-terminal-ui v3/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 2: Create `lib/api.ts`**

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const TOKEN_KEY = 'terminal_jwt';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = res.statusText;
    try {
      const body = await res.json();
      code = body.error ?? code;
      message = body.message ?? message;
    } catch {
      // non-JSON error body — keep defaults
    }
    throw new ApiError(res.status, code, message);
  }

  // 204 No Content — return empty object cast to T
  if (res.status === 204) return {} as T;

  return res.json() as Promise<T>;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

The app has `typescript.ignoreBuildErrors: true` in `next.config.mjs` so this is a type sanity check only, not a hard gate. Proceed regardless.

- [ ] **Step 4: Commit**

```bash
git add "apps/frontend/pos-terminal-ui v3/.env.local" "apps/frontend/pos-terminal-ui v3/lib/api.ts"
git commit -m "phase-frontend: add API base helper and env config (terminal)"
```

---

## Task 2: Replace stubs in `terminal.service.ts`

**Files:**
- Modify: `apps/frontend/pos-terminal-ui v3/lib/services/terminal.service.ts`

Read the whole file before editing. The class has 16 methods. Replace 14 of them as specified below. `pushSync` and `getSyncStatus` stay as stubs.

### Method mapping

#### `activate(activationCode: string)`

Backend: `POST /api/terminal/activate` — public endpoint (no auth needed for bootstrap).
Request body: `{ terminal_code: activationCode }`
Response shape: `{ terminal_id, terminal_code, business_id, business_name, location_id, location_name, ... }` — maps directly to `TerminalConfig`.

```typescript
async activate(activationCode: string): Promise<{ success: boolean; config?: TerminalConfig; error?: string }> {
  try {
    const data = await apiFetch<TerminalConfig>('/api/terminal/activate', {
      method: 'POST',
      body: JSON.stringify({ terminal_code: activationCode }),
    });
    this.config = data;
    return { success: true, config: data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Activation failed';
    return { success: false, error: message };
  }
}
```

#### `heartbeat()`

Backend: `POST /api/terminal/heartbeat` — requires auth; JWT contains `terminal_id`.

```typescript
async heartbeat(): Promise<HeartbeatResponse> {
  try {
    const data = await apiFetch<HeartbeatResponse>('/api/terminal/heartbeat', { method: 'POST' });
    this.isOnline = true;
    return data;
  } catch {
    this.isOnline = false;
    return { online: false, server_time: new Date().toISOString(), pending_updates: false };
  }
}
```

#### `clockIn(employeeId: string, pin: string)`

Two sequential calls:
1. `POST /api/auth/pin-login` with `{ pin, terminal_code }` — gets JWT, store it.
2. `POST /api/terminal/clock-in` with stored JWT.

Backend response for clock-in: `{ employee: { id, first_name, last_name, role, can_void, can_discount, can_refund, is_active }, session_id, clock_in_time }`.

```typescript
async clockIn(employeeId: string, pin: string): Promise<{ success: boolean; employee?: ActiveEmployee; error?: string }> {
  try {
    if (!this.config) {
      return { success: false, error: 'Terminal not configured' };
    }

    // Step 1: PIN login → get JWT
    const auth = await apiFetch<{ token: string }>('/api/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({ pin, terminal_code: this.config.terminal_code }),
    });
    setToken(auth.token);

    // Step 2: Register shift clock-in
    const data = await apiFetch<{ employee: Employee; session_id: string; clock_in_time: string }>(
      '/api/terminal/clock-in',
      { method: 'POST' },
    );

    const active: ActiveEmployee = {
      ...data.employee,
      pin_hash: '',
      clock_in_time: data.clock_in_time,
      session_id: data.session_id,
    };
    this.activeEmployees.set(active.id, active);
    return { success: true, employee: active };
  } catch (err) {
    clearToken();
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return { success: false, error: message };
  }
}
```

#### `clockOut(employeeId: string)`

Backend: `POST /api/terminal/clock-out`

```typescript
async clockOut(employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch('/api/terminal/clock-out', { method: 'POST' });
    this.activeEmployees.delete(employeeId);
    clearToken();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Clock out failed';
    return { success: false, error: message };
  }
}
```

#### `getCatalog(forceRefresh: boolean = false)`

Backend: `GET /api/terminal/catalog`
Response shape: `{ categories: Category[], products: Product[], last_updated: string }`

```typescript
async getCatalog(forceRefresh: boolean = false): Promise<CatalogData> {
  if (this.catalogCache && !forceRefresh) {
    return this.catalogCache;
  }
  try {
    const data = await apiFetch<CatalogData>('/api/terminal/catalog');
    this.catalogCache = data;
    return data;
  } catch {
    if (this.catalogCache) return this.catalogCache;
    throw new Error('Unable to load catalog');
  }
}
```

#### `lookupCustomer(query: string)`

Backend: `GET /api/terminal/customers/lookup?phone={query}`
**Note:** The backend endpoint only supports phone lookup. Name search is not available via this endpoint.
Response shape: a single customer object (not an array) or 404.
Wrap in array to preserve the existing return type signature.

```typescript
async lookupCustomer(query: string): Promise<Customer[]> {
  try {
    const encoded = encodeURIComponent(query);
    const data = await apiFetch<Customer>(`/api/terminal/customers/lookup?phone=${encoded}`);
    return [data];
  } catch {
    return [];
  }
}
```

#### `quickAddCustomer(name: string, phone: string)`

Backend: `POST /api/terminal/customers/quick-add`
Body: `{ first_name, last_name, phone }` — split name on first space for first/last.

```typescript
async quickAddCustomer(name: string, phone: string): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const [first_name, ...rest] = name.trim().split(' ');
    const last_name = rest.join(' ') || first_name;
    const data = await apiFetch<Customer>('/api/terminal/customers/quick-add', {
      method: 'POST',
      body: JSON.stringify({ first_name, last_name, phone }),
    });
    return { success: true, customer: data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create customer';
    return { success: false, error: message };
  }
}
```

#### `evaluatePromotions(items: TransactionItem[], subtotal: number)`

Backend: `POST /api/terminal/promotions/evaluate`
Body shape (from quickstart): `{ items: [...], customer_id?: string }`
Response: `{ applicable_promotions: [{ promotion_id, name, discount_amount }] }`

```typescript
async evaluatePromotions(items: TransactionItem[], subtotal: number): Promise<AppliedPromotion[]> {
  try {
    const data = await apiFetch<{ applicable_promotions: AppliedPromotion[] }>(
      '/api/terminal/promotions/evaluate',
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      },
    );
    return data.applicable_promotions ?? [];
  } catch {
    return [];
  }
}
```

#### `validateCoupon(code: string, items: TransactionItem[], subtotal: number)`

Backend: `GET /api/terminal/coupons/validate?code={code}`
Response: `{ valid: boolean, coupon: {...}, discount_amount: number }` or 404/410 on invalid.

```typescript
async validateCoupon(code: string, items: TransactionItem[], subtotal: number): Promise<CouponValidation> {
  try {
    const encoded = encodeURIComponent(code);
    const data = await apiFetch<{ valid: boolean; coupon: Coupon; discount_amount: number }>(
      `/api/terminal/coupons/validate?code=${encoded}`,
    );
    return { valid: true, coupon: data.coupon, discount_amount: data.discount_amount };
  } catch (err) {
    if (err instanceof ApiError && err.status === 410) {
      return { valid: false, error: 'Coupon already redeemed' };
    }
    const message = err instanceof Error ? err.message : 'Failed to validate coupon';
    return { valid: false, error: message };
  }
}
```

#### `createTransaction(...)`

Backend: `POST /api/terminal/transactions`
Body shape (from quickstart):
```json
{
  "items": [{ "product_id": "...", "product_name": "...", "quantity": 2, "unit_price": 12, "line_total": 24 }],
  "subtotal": 24,
  "total": 28.8,
  "payment_method": "cash",
  "customer_id": "...",
  "promotion_ids": ["..."],
  "coupon_codes": ["CAFEOFF"]
}
```

```typescript
async createTransaction(
  employeeId: string,
  items: TransactionItem[],
  paymentMethod: Transaction['payment_method'],
  paymentDetails?: Transaction['payment_details'],
  customerId?: string,
  appliedPromotions?: AppliedPromotion[],
  appliedCoupon?: string,
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    if (!this.config) return { success: false, error: 'Terminal not configured' };

    const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
    const promotionDiscount = appliedPromotions?.reduce((s, p) => s + p.discount_amount, 0) ?? 0;
    const total = subtotal - promotionDiscount; // backend computes TVA; use backend response total

    const body: Record<string, unknown> = {
      items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total,
        ...(i.variant_id ? { variant_id: i.variant_id } : {}),
        ...(i.notes ? { notes: i.notes } : {}),
      })),
      subtotal,
      total,
      payment_method: paymentMethod,
      ...(paymentDetails ? { payment_details: paymentDetails } : {}),
      ...(customerId ? { customer_id: customerId } : {}),
      ...(appliedPromotions?.length
        ? { promotion_ids: appliedPromotions.map((p) => p.promotion_id) }
        : {}),
      ...(appliedCoupon ? { coupon_codes: [appliedCoupon] } : {}),
    };

    const data = await apiFetch<Transaction>('/api/terminal/transactions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { success: true, transaction: { ...data, is_offline: false } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create transaction';
    return { success: false, error: message };
  }
}
```

#### `voidTransaction(transactionId: string, reason: string, managerPin?: string)`

Backend: `POST /api/terminal/transactions/:id/void`
The backend validates manager permission via JWT permissions. Body: `{ reason }`.
The local `managerPin` check is removed — permission is backend-enforced.

```typescript
async voidTransaction(
  transactionId: string,
  reason: string,
  managerPin?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch(`/api/terminal/transactions/${transactionId}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to void transaction';
    return { success: false, error: message };
  }
}
```

#### `getTodayTransactions()`

Backend: `GET /api/terminal/transactions/today`
Response: paginated `{ data: Transaction[], total, page, limit, totalPages }` or flat array.
Merge with any locally queued offline transactions.

```typescript
async getTodayTransactions(): Promise<Transaction[]> {
  try {
    const data = await apiFetch<{ data: Transaction[] } | Transaction[]>(
      '/api/terminal/transactions/today',
    );
    const serverTxns = Array.isArray(data) ? data : data.data;
    return [...serverTxns, ...this.offlineTransactions];
  } catch {
    return this.offlineTransactions;
  }
}
```

### Imports to add at top of file

Add this import at the very top of `terminal.service.ts` (before the type definitions):

```typescript
import { apiFetch, setToken, clearToken, ApiError } from '../api';
```

Remove the `simulateNetworkDelay` private method — it is no longer used.

### Full replacement procedure

- [ ] **Step 1: Read the full current file**

Confirm current line count and method locations before editing.

- [ ] **Step 2: Add the import line at the top of the file**

Insert after the JSDoc comment block (line 2, before `export interface TerminalConfig`):
```typescript
import { apiFetch, setToken, clearToken, ApiError } from '../api';
```

- [ ] **Step 3: Replace `activate` method**

Replace lines 238–267 (the `activate` method body) with the real implementation shown above.

- [ ] **Step 4: Replace `heartbeat` method**

Replace lines 283–301 with the real implementation.

- [ ] **Step 5: Replace `clockIn` method**

Replace lines 310–348 with the real implementation.
This is the most complex change: pin-login + clock-in in sequence. Take care to preserve the method signature exactly.

- [ ] **Step 6: Replace `clockOut` method**

Replace lines 353–377 with the real implementation.

- [ ] **Step 7: Replace `getCatalog` method**

Replace lines 393–433 with the real implementation.

- [ ] **Step 8: Replace `lookupCustomer` method**

Replace lines 442–464 with the real implementation.
Note the behavioral change: name search is dropped; backend only supports phone.

- [ ] **Step 9: Replace `quickAddCustomer` method**

Replace lines 469–492 with the real implementation.

- [ ] **Step 10: Replace `evaluatePromotions` method**

Replace lines 501–536 with the real implementation.

- [ ] **Step 11: Replace `validateCoupon` method**

Replace lines 541–597 with the real implementation.

- [ ] **Step 12: Replace `createTransaction` method**

Replace lines 606–662 with the real implementation.

- [ ] **Step 13: Replace `voidTransaction` method**

Replace lines 667–686 with the real implementation.

- [ ] **Step 14: Replace `getTodayTransactions` method**

Replace lines 691–743 with the real implementation.

- [ ] **Step 15: Delete `simulateNetworkDelay` private method**

Remove lines 788–790 (the private `simulateNetworkDelay` method) — it is no longer used.

- [ ] **Step 16: Keep `pushSync` and `getSyncStatus` as-is**

These two methods (lines 752–782) are explicitly deferred per spec. Leave them unchanged.

- [ ] **Step 17: Commit**

```bash
git add "apps/frontend/pos-terminal-ui v3/lib/services/terminal.service.ts"
git commit -m "phase-frontend: wire terminal.service.ts to real backend endpoints"
```

---

## Task 3: Build the OSS Page

**Files:**
- Create: `apps/frontend/pos-terminal-ui v3/app/oss/page.tsx`

The OSS screen is a **public TV display** — no auth, no sidebar, no navigation. It:
- Reads `location_id` from the URL query string (`?location_id=xxx`)
- Calls `GET /api/public/oss?location_id={id}` every 10 seconds
- Displays two columns: **Preparing** (orange) and **Ready** (green)
- Each card shows: order number, type badge (Dine In / Takeaway), item count, elapsed time

Backend response shape (from `oss.service.ts`):
```typescript
{
  preparing: [{ display_number: string, order_type: 'dine_in'|'takeaway', item_count: number, started_at: string }],
  ready:     [{ display_number: string, order_type: 'dine_in'|'takeaway', item_count: number, ready_at: string }],
}
```

- [ ] **Step 1: Create `app/oss/page.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';

interface OssOrder {
  display_number: string;
  order_type: 'dine_in' | 'takeaway';
  item_count: number;
  started_at?: string;
  ready_at?: string;
}

interface OssData {
  preparing: OssOrder[];
  ready: OssOrder[];
}

function elapsedMinutes(isoString?: string): string {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  return diff < 1 ? 'just now' : `${diff}m ago`;
}

function OrderCard({ order, isReady }: { order: OssOrder; isReady: boolean }) {
  return (
    <div
      className={`rounded-2xl border-2 p-6 flex flex-col gap-2 shadow-md ${
        isReady
          ? 'border-green-400 bg-green-50'
          : 'border-orange-400 bg-orange-50'
      }`}
    >
      <span
        className={`text-4xl font-bold tracking-tight ${
          isReady ? 'text-green-700' : 'text-orange-700'
        }`}
      >
        {order.display_number}
      </span>
      <span className="text-sm text-gray-500">
        {order.order_type === 'dine_in' ? 'Dine In' : 'Takeaway'} · {order.item_count} item
        {order.item_count !== 1 ? 's' : ''}
      </span>
      <span className="text-xs text-gray-400">
        {isReady
          ? `Ready ${elapsedMinutes(order.ready_at)}`
          : `Preparing ${elapsedMinutes(order.started_at)}`}
      </span>
    </div>
  );
}

export default function OssPage() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [data, setData] = useState<OssData>({ preparing: [], ready: [] });
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Read location_id from query string on mount (client-side only)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLocationId(params.get('location_id'));
  }, []);

  const fetchData = useCallback(async () => {
    if (!locationId) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/public/oss?location_id=${locationId}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: OssData = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error');
    }
  }, [locationId]);

  // Initial fetch + 10-second polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!locationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl">Missing <code>?location_id=</code> in URL</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Order Status</h1>
        <span className="text-sm text-gray-400">
          {error ? (
            <span className="text-red-400">⚠ {error}</span>
          ) : (
            `Updated ${lastUpdated}`
          )}
        </span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-8 h-full">
        {/* Preparing column */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-4 h-4 rounded-full bg-orange-400 animate-pulse" />
            <h2 className="text-xl font-semibold text-orange-300">
              Preparing ({data.preparing.length})
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {data.preparing.length === 0 ? (
              <p className="text-gray-500 text-sm">No orders preparing</p>
            ) : (
              data.preparing.map((order) => (
                <OrderCard key={order.display_number} order={order} isReady={false} />
              ))
            )}
          </div>
        </div>

        {/* Ready column */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-4 h-4 rounded-full bg-green-400" />
            <h2 className="text-xl font-semibold text-green-300">
              Ready ({data.ready.length})
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {data.ready.length === 0 ? (
              <p className="text-gray-500 text-sm">No orders ready</p>
            ) : (
              data.ready.map((order) => (
                <OrderCard key={order.display_number} order={order} isReady={true} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the route loads**

Start the terminal dev server:
```bash
cd "apps/frontend/pos-terminal-ui v3"
npm run dev
```

Open `http://localhost:3001/oss?location_id=test` (or whatever port Next.js picks).
Expected: dark screen with "Order Status" heading, two columns (both empty since `test` is not a real ID), no crash.

- [ ] **Step 3: Commit**

```bash
git add "apps/frontend/pos-terminal-ui v3/app/oss/page.tsx"
git commit -m "phase-frontend: add OSS public display page (/oss)"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `activate` → `POST /api/terminal/activate` ✓
- [x] `heartbeat` → `POST /api/terminal/heartbeat` ✓
- [x] `clockIn` → `POST /api/auth/pin-login` (get token) + `POST /api/terminal/clock-in` ✓
- [x] `clockOut` → `POST /api/terminal/clock-out` ✓
- [x] `getCatalog` → `GET /api/terminal/catalog` ✓
- [x] `lookupCustomer` → `GET /api/terminal/customers/lookup?phone=` ✓
- [x] `quickAddCustomer` → `POST /api/terminal/customers/quick-add` ✓
- [x] `evaluatePromotions` → `POST /api/terminal/promotions/evaluate` ✓
- [x] `validateCoupon` → `GET /api/terminal/coupons/validate?code=` ✓
- [x] `createTransaction` → `POST /api/terminal/transactions` ✓
- [x] `voidTransaction` → `POST /api/terminal/transactions/:id/void` ✓
- [x] `getTodayTransactions` → `GET /api/terminal/transactions/today` ✓
- [x] `pushSync` → KEPT AS STUB ✓
- [x] `getSyncStatus` → KEPT AS STUB ✓
- [x] JWT token stored from pin-login, sent as Bearer on all requests ✓
- [x] OSS page at `/oss` — two columns, auto-refresh, no auth ✓
- [x] `.env.local` with `NEXT_PUBLIC_API_URL` ✓
- [x] `lib/api.ts` base helper ✓

**Known behavioral changes (not bugs):**
- `lookupCustomer` no longer searches by name — backend only supports `?phone=`
- `voidTransaction` no longer checks `managerPin` locally — backend enforces via JWT permissions
- `quickAddCustomer` splits `name` on first space to produce `first_name`/`last_name`
- `getTodayTransactions` endpoint is `/today` not `?date=today` (matched to actual controller)
