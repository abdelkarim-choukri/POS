# WebSocket Events Reference

This document describes all real-time events emitted by the POS backend over Socket.io.

---

## Connection

**Namespace:** `http://localhost:3000/events`

Authentication is required. Pass the JWT Bearer token as a Socket.io handshake auth param:

```javascript
const socket = io('http://localhost:3000/events', {
  auth: { token: 'Bearer <jwt>' },
});
```

After connecting, subscribe to one or more rooms by emitting a `join` message:

```javascript
socket.emit('join', 'floor:BUSINESS_ID');
socket.emit('join', 'kds:BUSINESS_ID');
socket.emit('join', 'dashboard:BUSINESS_ID');
socket.emit('join', 'oss:LOCATION_ID');
```

**Room name pattern:** `prefix:id`

| Prefix | ID type | Purpose |
|--------|---------|---------|
| `floor` | `businessId` (UUID) | Front-of-house floor plan updates |
| `kds` | `businessId` (UUID) | Kitchen Display System updates |
| `dashboard` | `businessId` (UUID) | Back-office dashboard updates (transactions, inventory alerts) |
| `oss` | `locationId` (UUID) | Order Status Screen updates for a specific location |

---

## Events

### Floor Events

These events are emitted to the `floor:{businessId}` room.

#### `floor:table_opened`

Emitted when a table is opened via `POST /api/terminal/tables/:id/open`.

**Emitted by:** `TableSessionService`

**Payload:**
```typescript
{
  table_id: string;    // UUID of the table
  session_id: string;  // UUID of the new table session
  table_number: string;
}
```

---

#### `floor:table_closed`

Emitted when a table transitions out of the `open` state — either to `awaiting_payment` (normal close), `cancelled`, or `paid` (force-close with partial payment).

**Emitted by:** `TableSessionService` (cancel/force-close), `CheckoutService` (normal close)

**Payload:**
```typescript
{
  table_id: string;
  session_id: string;
  status: 'awaiting_payment' | 'cancelled' | 'paid';
}
```

---

#### `floor:session_paid`

Emitted when all split transactions for a table session are completed and the session transitions to `paid`.

**Emitted by:** `TerminalService`

**Payload:**
```typescript
{
  table_id: string;
  session_id: string;
}
```

---

#### `floor:item_ready`

Emitted when a KDS item's status is set to `ready`, signalling the front-of-house that a dish is ready to be served.

**Emitted by:** `KdsService`

**Payload:**
```typescript
{
  item_id: string;      // UUID of the table_session_item
  session_id: string;
  table_number: string;
}
```

---

### KDS Events

These events are emitted to the `kds:{businessId}` room.

#### `kds:items_added`

Emitted when one or more items are added to a table session via `POST /api/terminal/table-sessions/:id/items`.

**Emitted by:** `TableSessionService`

**Payload:**
```typescript
{
  session_id: string;
  table_number: string;
  items: Array<{
    id: string;           // UUID of the table_session_item
    product_name: string;
    quantity: number;
    kds_status: string;   // always 'new' at add time
    notes: string | null;
  }>;
}
```

---

#### `kds:item_status_changed`

Emitted when a KDS item's status is updated via `POST /api/terminal/kds/items/:id/status`.

Valid transitions: `new` → `preparing` → `ready` → `served`.

**Emitted by:** `KdsService`

**Payload:**
```typescript
{
  item_id: string;
  session_id: string;
  table_number: string;
  old_status: string;
  new_status: string;
}
```

---

#### `kds:item_cancelled`

Emitted when an item is voided or removed from a table session via `DELETE /api/terminal/table-session-items/:id`.

**Emitted by:** `TableSessionService`

**Payload:**
```typescript
{
  item_id: string;
  session_id: string;
  table_number: string;
}
```

---

#### `kds:items_transferred`

Emitted when items are transferred between tables via `POST /api/terminal/table-session-items/transfer`.

**Emitted by:** `TableSessionService`

**Payload:**
```typescript
{
  item_ids: string[];       // UUIDs of transferred table_session_items
  source_session: string;   // UUID of the source table session
  target_session: string;   // UUID of the destination table session
}
```

---

### Dashboard Events

These events are emitted to the `dashboard:{businessId}` room.

#### `dashboard:transaction_created`

Emitted whenever a transaction is completed — both table-based and direct (walk-in) transactions.

**Emitted by:** `TerminalService`

**Payload:**
```typescript
{
  transaction_id: string;
  total_ttc: number;   // MAD, 2-decimal NUMERIC
}
```

---

#### `inventory:expiration_alert`

Emitted by the daily expiration scan job (`inventory-expiration-scan` BullMQ queue, scheduled at 01:00) when a new alert is created for a batch that is expiring soon or already expired. Not emitted when an existing unresolved alert already exists for the same batch (idempotent).

**Emitted by:** `ExpirationScanProcessor`

**Payload:**
```typescript
{
  alert_id: string;
  batch_id: string;
  product_id: string;
  warehouse_id: string;
  severity: 'expires_soon' | 'expired';
}
```

---

#### `inventory:discrepancy_alert`

Emitted by the daily reconciliation job (`inventory-reconciliation` BullMQ queue, scheduled at 02:00) when a new stock discrepancy alert is created. Not emitted when an existing unresolved alert already exists (idempotent).

**Emitted by:** `ReconciliationProcessor`

**Payload:**
```typescript
{
  alert_id: string;
  batch_id: string;
  product_id: string;
  warehouse_id: string;
  source: 'system_detected' | 'offline_sync';
  discrepancy_quantity: number;
}
```

---

### OSS Events

These events are emitted to the `oss:{locationId}` room.

#### `oss:order_updated`

Emitted whenever any KDS item changes status. The Order Status Screen client should react by re-fetching `GET /api/public/oss?location_id=...` to get the current preparing/ready lists.

**Emitted by:** `KdsService`

**Payload:**
```typescript
{
  location_id: string;
}
```

---

## Events Summary Table

| Event | Room | Emitted By | When |
|-------|------|------------|------|
| `floor:table_opened` | `floor:{businessId}` | `TableSessionService` | `POST /terminal/tables/:id/open` |
| `floor:table_closed` | `floor:{businessId}` | `TableSessionService` / `CheckoutService` | Table closed, cancelled, or force-closed |
| `floor:session_paid` | `floor:{businessId}` | `TerminalService` | All split transactions done, session → paid |
| `floor:item_ready` | `floor:{businessId}` | `KdsService` | KDS item status set to `ready` |
| `kds:items_added` | `kds:{businessId}` | `TableSessionService` | Items added to a table session |
| `kds:item_status_changed` | `kds:{businessId}` | `KdsService` | `POST /terminal/kds/items/:id/status` |
| `kds:item_cancelled` | `kds:{businessId}` | `TableSessionService` | Item voided/removed from session |
| `kds:items_transferred` | `kds:{businessId}` | `TableSessionService` | Items transferred between tables |
| `dashboard:transaction_created` | `dashboard:{businessId}` | `TerminalService` | Any transaction completed |
| `inventory:expiration_alert` | `dashboard:{businessId}` | `ExpirationScanProcessor` | Daily job finds expiring/expired batch |
| `inventory:discrepancy_alert` | `dashboard:{businessId}` | `ReconciliationProcessor` | Daily job finds stock discrepancy |
| `oss:order_updated` | `oss:{locationId}` | `KdsService` | Any KDS item status change |

---

## React/TypeScript Usage Example

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
  auth: { token: `Bearer ${accessToken}` },
});

socket.on('connect', () => {
  socket.emit('join', `dashboard:${businessId}`);
  socket.emit('join', `floor:${businessId}`);
  socket.emit('join', `kds:${businessId}`);
});

socket.on('dashboard:transaction_created', (payload) => {
  // payload: { transaction_id: string; total_ttc: number }
  console.log('New transaction', payload);
});

socket.on('floor:table_opened', (payload) => {
  // payload: { table_id: string; session_id: string; table_number: string }
  updateFloorPlan(payload);
});

socket.on('floor:table_closed', (payload) => {
  // payload: { table_id: string; session_id: string; status: 'awaiting_payment' | 'cancelled' | 'paid' }
  updateFloorPlan(payload);
});

socket.on('floor:session_paid', (payload) => {
  // payload: { table_id: string; session_id: string }
  markTableFree(payload.table_id);
});

socket.on('floor:item_ready', (payload) => {
  // payload: { item_id: string; session_id: string; table_number: string }
  notifyServer(payload);
});

socket.on('kds:items_added', (payload) => {
  // payload: { session_id: string; table_number: string; items: [...] }
  addItemsToKdsScreen(payload);
});

socket.on('kds:item_status_changed', (payload) => {
  // payload: { item_id: string; session_id: string; table_number: string; old_status: string; new_status: string }
  updateKdsItem(payload);
});

socket.on('kds:item_cancelled', (payload) => {
  // payload: { item_id: string; session_id: string; table_number: string }
  removeFromKdsScreen(payload.item_id);
});

socket.on('kds:items_transferred', (payload) => {
  // payload: { item_ids: string[]; source_session: string; target_session: string }
  refreshSessions([payload.source_session, payload.target_session]);
});

socket.on('inventory:expiration_alert', (payload) => {
  // payload: { alert_id: string; batch_id: string; product_id: string; warehouse_id: string; severity: 'expires_soon' | 'expired' }
  showInventoryAlert(payload);
});

socket.on('inventory:discrepancy_alert', (payload) => {
  // payload: { alert_id: string; batch_id: string; product_id: string; warehouse_id: string; source: string; discrepancy_quantity: number }
  showDiscrepancyAlert(payload);
});

// OSS screen — subscribe to a specific location
const ossSocket = io('http://localhost:3000/events', {
  auth: { token: `Bearer ${accessToken}` },
});
ossSocket.on('connect', () => {
  ossSocket.emit('join', `oss:${locationId}`);
});
ossSocket.on('oss:order_updated', async (payload) => {
  // payload: { location_id: string }
  const orders = await fetch(`/api/public/oss?location_id=${payload.location_id}`).then(r => r.json());
  renderOssScreen(orders);
});
```

---

## Implementation Notes

- The `EventGateway` (`src/common/gateways/event.gateway.ts`) is registered in `CommonModule` which is `@Global()`. Any service can inject `EventGateway` without importing `CommonModule` explicitly.
- The `emitToRoom(room: string, event: string, payload: unknown)` method is the single emission point. All events in this document are emitted via this method.
- The `oss` room uses `locationId` (not `businessId`) because an OSS screen is scoped to a single terminal location, not the whole business.
- BullMQ processor events (`inventory:expiration_alert`, `inventory:discrepancy_alert`) are emitted after the alert row is persisted to the database, so the `alert_id` in the payload is always a valid DB record at the time the client receives the event.
