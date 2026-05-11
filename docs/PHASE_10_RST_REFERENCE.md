# Phase 10 — Restaurant Operations (RST) — Complete Build Reference

**For Claude Code. Read this entire file before planning.**

This document contains everything needed to implement Phase 10. It consolidates the spec requirements, API contracts, data models, traps to avoid, and implementation order. Cross-reference with `docs/spec/POS_Extension_Spec_v1_1.md` §7 and §13 for canonical definitions.

---

## 1. WHAT ALREADY EXISTS (do not rebuild)

Before writing any code, read these existing files:

- `apps/backend/src/modules/kds/kds.module.ts` — existing KDS module
- `apps/backend/src/modules/kds/kds.gateway.ts` — existing WebSocket gateway
- `apps/backend/src/modules/kds/kds.service.ts` — existing KDS service
- `apps/backend/src/modules/terminal/terminal.service.ts` — createTransaction()
- `apps/backend/src/modules/terminal/terminal.controller.ts`
- `apps/backend/src/common/utils/money.ts` — bankersRound, distributeDiscount
- `apps/backend/src/common/utils/tva.ts` — resolveTvaRate
- `apps/backend/src/modules/promotion/` — PromotionEvaluatorService, DiscountPipelineService

The existing KDS fires AFTER a transaction is saved. Restaurant flow fires items to kitchen BEFORE payment. Both flows must coexist.

---

## 2. SCREENS THIS PHASE SERVES (4 total)

| # | Screen | Who uses it | Data flow |
|---|--------|-------------|-----------|
| 1 | **Terminal (POS)** | Cashier | Already built. Phase 10 adds table-service mode: select table → view session → checkout/split → payment |
| 2 | **Waiter tablet** | Server/waiter | Same terminal app, different view. Opens tables, adds items, sends to kitchen. Uses `/api/terminal/*` endpoints |
| 3 | **KDS (Kitchen Display)** | Chef | Already has basic version. Phase 10 refactors to consume `table_session_items` in addition to direct transactions |
| 4 | **OSS (Order Status Screen)** | Customers (public TV) | NEW. Read-only display showing "Preparing" / "Ready" orders. No auth needed. Public endpoint |

Screen 2 (waiter) and Screen 1 (terminal) are the SAME app in the architecture. The frontend teammate builds a "table service" view inside the existing terminal app. No separate waiter backend module — just new `/api/terminal/*` endpoints.

---

## 3. FOUR-PART IMPLEMENTATION ORDER

### Part A — Migration + Entities + Setup CRUD
- Migration `AddRestaurantOperations` (spec §13.4 migration 9)
- 5 new entities (DiningArea, TableType, Table, TableSession, TableSessionItem)
- Transaction entity update (add `table_session_id`)
- Dining area CRUD (RST-001 to RST-004)
- Table type CRUD (RST-010 to RST-013)
- Table CRUD (RST-020 to RST-023)
- New permission keys registered

### Part B — Table Session Flow (core restaurant logic)
- Floor plan view (RST-030)
- Open table (RST-031)
- Add items to table (RST-032)
- Modify item (RST-033)
- Remove item (RST-034)
- Transfer items between tables (RST-037)
- Cancel session (RST-038)

### Part C — KDS Refactor + WebSocket + OSS
- Refactor KDS to consume from `table_session_items` (RST-MOD-001)
- Maintain backward compat for non-table orders (retail POS, takeaway)
- WebSocket event gateway for real-time updates
- OSS public endpoint (new, not in spec)
- KDS status update endpoints for table_session_items

### Part D — Checkout + Split Bill + createTransaction integration
- Close table → checkout payload (RST-035)
- Split bill (RST-036) — the hardest deliverable
- Wire `table_session_id` into createTransaction()
- Auto-transition session to `paid` when all splits complete
- i18n foundation (language_preference column, receipt language support)
- EventGateway for dashboard real-time events
- Phase closeout + CLAUDE.md update

---

## 4. MIGRATION: AddRestaurantOperations

**Migration file:** `src/migrations/1714008000000-AddRestaurantOperations.ts`

### New tables

#### `dining_areas`
```sql
CREATE TABLE "dining_areas" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "business_id" UUID NOT NULL REFERENCES "businesses"("id"),
  "location_id" UUID NOT NULL REFERENCES "locations"("id"),
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "sort_order" INT NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `table_types`
```sql
CREATE TABLE "table_types" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "business_id" UUID NOT NULL REFERENCES "businesses"("id"),
  "name" VARCHAR(100) NOT NULL,  -- "Standard", "Booth", "Bar Stool", "Private Room"
  "default_capacity" INT NOT NULL DEFAULT 4,
  "is_active" BOOLEAN NOT NULL DEFAULT true
);
```

#### `tables`
```sql
CREATE TABLE "tables" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "business_id" UUID NOT NULL REFERENCES "businesses"("id"),
  "location_id" UUID NOT NULL REFERENCES "locations"("id"),
  "area_id" UUID NOT NULL REFERENCES "dining_areas"("id"),
  "table_type_id" UUID REFERENCES "table_types"("id"),
  "table_number" VARCHAR(20) NOT NULL,  -- "T-12", "B3"
  "capacity" INT NOT NULL DEFAULT 4,
  "position_x" INT,  -- floor plan UI coordinate
  "position_y" INT,
  "qr_code" VARCHAR(100),  -- deferred feature
  "is_active" BOOLEAN NOT NULL DEFAULT true
);
```

#### `table_sessions`
```sql
CREATE TABLE "table_sessions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "business_id" UUID NOT NULL REFERENCES "businesses"("id"),
  "location_id" UUID NOT NULL REFERENCES "locations"("id"),
  "table_id" UUID NOT NULL REFERENCES "tables"("id"),
  "opened_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "opened_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
  "closed_at" TIMESTAMPTZ,
  "closed_in_transaction_id" UUID REFERENCES "transactions"("id"),
  "customer_id" UUID REFERENCES "customers"("id"),
  "guest_count" INT,
  "expected_split_count" INT NOT NULL DEFAULT 1,
  "partial_payment" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'open'
    -- valid: 'open', 'awaiting_payment', 'paid', 'cancelled'
);
```

#### `table_session_items`
```sql
CREATE TABLE "table_session_items" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "business_id" UUID NOT NULL REFERENCES "businesses"("id"),
  "table_session_id" UUID NOT NULL REFERENCES "table_sessions"("id"),
  "product_id" UUID NOT NULL REFERENCES "products"("id"),
  "variant_id" UUID REFERENCES "product_variants"("id"),
  "customer_id" UUID REFERENCES "customers"("id"),
  "quantity" INT NOT NULL DEFAULT 1,
  "unit_price_ttc" NUMERIC(12,2) NOT NULL,
  "modifiers_json" JSONB DEFAULT '{}',
  "notes" VARCHAR(500),
  "added_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "added_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
  "kds_status" VARCHAR(20) NOT NULL DEFAULT 'new'
    -- valid: 'new', 'preparing', 'ready', 'served', 'cancelled'
);
```

### Column additions to existing tables

```sql
ALTER TABLE "transactions"
  ADD COLUMN "table_session_id" UUID REFERENCES "table_sessions"("id");
```

### Required indexes (from spec §13.3)

```sql
-- tables
CREATE UNIQUE INDEX "UQ_tables_business_number"
  ON "tables"("business_id", "table_number");
CREATE INDEX "IDX_tables_location_area"
  ON "tables"("location_id", "area_id", "is_active");

-- table_sessions
CREATE INDEX "IDX_sessions_table_status"
  ON "table_sessions"("table_id", "status")
  WHERE status IN ('open', 'awaiting_payment');
CREATE INDEX "IDX_sessions_business_status"
  ON "table_sessions"("business_id", "status", "opened_at" DESC);

-- table_session_items
CREATE INDEX "IDX_session_items_session"
  ON "table_session_items"("table_session_id", "kds_status");
CREATE INDEX "IDX_session_items_business"
  ON "table_session_items"("business_id");
```

### Migration MUST be reversible (working `down` method)

---

## 5. NEW PERMISSION KEYS

Add these to the JSONB permissions system (no migration needed — keys are added at write time):

| Key | Purpose | Default holders |
|-----|---------|-----------------|
| `can_open_table_session` | Open a table | owner, manager, employee |
| `can_close_table_session` | Close table for payment | owner, manager, employee |
| `can_close_table_session_partial` | Force-close with unpaid splits (RST-038) | owner, manager |
| `can_transfer_table_items` | Move items between tables | owner, manager, employee |

Existing keys reused:
- `can_void` — required to remove items where `kds_status >= preparing` (kitchen waste)

---

## 6. ALL API ENDPOINTS — FULL DETAIL

### 6.1 Dashboard CRUD endpoints (business-scoped)

---

#### `[RST-001]` List dining areas
```
GET /api/business/dining-areas
Query: location_id (optional), is_active (optional, default true)
Roles: owner, manager
Scoped: business_id from JWT

Response 200:
{
  "records": [
    {
      "id": "uuid",
      "location_id": "uuid",
      "name": "Indoor",
      "description": "Main dining hall",
      "sort_order": 1,
      "is_active": true,
      "table_count": 12
    }
  ]
}
```

#### `[RST-002]` Create dining area
```
POST /api/business/dining-areas
Roles: owner, manager

Input:
{
  "location_id": "uuid",    // required
  "name": "Terrace",        // required, unique within business
  "description": "Outdoor",
  "sort_order": 2
}

Response 201: created dining area object
Response 409: name already exists for this business
```

#### `[RST-003]` Update dining area
```
PATCH /api/business/dining-areas/:id
Roles: owner, manager

Input: { "name": "...", "description": "...", "sort_order": N, "is_active": bool }
Response 200: updated object
```

#### `[RST-004]` Delete dining area
```
DELETE /api/business/dining-areas/:id
Roles: owner

Response 200: deleted
Response 422: cannot delete — active tables assigned to this area
```

---

#### `[RST-010]` List table types
```
GET /api/business/table-types
Roles: owner, manager
Response 200: [{ "id", "name", "default_capacity", "is_active" }]
```

#### `[RST-011]` Create table type
```
POST /api/business/table-types
Input: { "name": "Booth", "default_capacity": 4 }
Response 201: created object
```

#### `[RST-012]` Update table type
```
PATCH /api/business/table-types/:id
Input: { "name": "...", "default_capacity": N, "is_active": bool }
Response 200: updated object
```

#### `[RST-013]` Delete table type
```
DELETE /api/business/table-types/:id
Response 200: deleted
```

---

#### `[RST-020]` List tables
```
GET /api/business/tables
Query: location_id, area_id, table_type_id, is_active (default true),
       with_session_status (boolean — when true, includes computed field)
Roles: owner, manager

Response 200:
{
  "records": [
    {
      "id": "uuid",
      "table_number": "T-12",
      "capacity": 4,
      "area": { "id": "uuid", "name": "Indoor" },
      "table_type": { "id": "uuid", "name": "Standard" },
      "position_x": 100,
      "position_y": 200,
      "is_active": true,
      "session_status": "available"  // only if with_session_status=true
        // values: "available", "occupied", "awaiting_payment"
    }
  ]
}
```

#### `[RST-021]` Create table
```
POST /api/business/tables
Input:
{
  "location_id": "uuid",      // required
  "area_id": "uuid",          // required
  "table_type_id": "uuid",    // optional
  "table_number": "T-15",     // required, unique within business
  "capacity": 6,
  "position_x": 100,
  "position_y": 200
}
Response 201: created object
Response 409: table_number already exists for this business
```

#### `[RST-022]` Update table
```
PATCH /api/business/tables/:id
Input: { "table_number", "capacity", "area_id", "table_type_id", "position_x", "position_y", "is_active" }
Response 200: updated object
```

#### `[RST-023]` Delete table
```
DELETE /api/business/tables/:id
Response 200: deleted
Response 422: cannot delete — open table_session exists
```

---

### 6.2 Terminal endpoints (waiter + cashier)

---

#### `[RST-030]` Floor plan view
```
GET /api/terminal/tables/floor-plan
Query: location_id (optional), area_id (optional)
Roles: any authenticated terminal user

Response 200:
{
  "tables": [
    {
      "id": "uuid",
      "table_number": "T-12",
      "capacity": 4,
      "area_id": "uuid",
      "area_name": "Indoor",
      "position_x": 100,
      "position_y": 200,
      "session_status": "available",  // "available" | "occupied" | "awaiting_payment"
      "current_session": null | {
        "id": "uuid",
        "opened_at": "2026-05-10T18:30:00Z",
        "guest_count": 4,
        "customer_name": "Amina El Idrissi",
        "item_count": 7,
        "current_total_ttc": 185.00,
        "server_name": "Youssef"
      }
    }
  ]
}
```
**Implementation note:** `current_total_ttc` is `SUM(quantity * unit_price_ttc)` from `table_session_items` where `kds_status != 'cancelled'`. This is a pre-discount estimate for display only.

---

#### `[RST-031]` Open table
```
POST /api/terminal/tables/:id/open
Roles: employee with can_open_table_session (or owner/manager)

Input:
{
  "guest_count": 4,           // optional
  "customer_id": "uuid|null"  // optional — attach loyalty customer
}

Response 201:
{
  "id": "session-uuid",
  "table_id": "uuid",
  "table_number": "T-12",
  "status": "open",
  "opened_at": "2026-05-10T18:30:00Z",
  "guest_count": 4,
  "customer_id": "uuid|null",
  "items": []
}

Response 409: table already has an open session
Response 404: table not found or wrong business
```

---

#### `[RST-032]` Add items to open table
```
POST /api/terminal/table-sessions/:id/items
Roles: any authenticated terminal user

Input:
{
  "items": [
    {
      "product_id": "uuid",         // required
      "variant_id": "uuid|null",    // optional
      "quantity": 2,                 // required, > 0
      "modifiers": [],               // optional
      "notes": "no salt",            // optional, max 500 chars
      "customer_id": "uuid|null"     // optional — per-item guest attribution
    }
  ]
}

Response 201:
{
  "added_items": [
    {
      "id": "item-uuid",
      "product_id": "uuid",
      "product_name": "Tajine Poulet",
      "quantity": 2,
      "unit_price_ttc": 65.00,
      "kds_status": "new",
      "notes": "no salt"
    }
  ],
  "session_total_ttc": 315.00
}

Response 404: session not found or wrong business
Response 422: session is not in 'open' status
```

**CRITICAL BEHAVIOUR:**
1. Lock `unit_price_ttc` from the product's current price at add-time
2. If `customer_id` is omitted, default to the table session's own `customer_id` (or null)
3. **Emit WebSocket event to KDS** — `kds:items_added` with the new items
4. Each item starts with `kds_status = 'new'`

---

#### `[RST-033]` Modify table item
```
PATCH /api/terminal/table-session-items/:id
Roles: any authenticated terminal user

Input:
{
  "quantity": 3,                // optional
  "notes": "extra spicy",       // optional
  "customer_id": "uuid|null"    // optional — always allowed even if kds_status >= preparing
}

Response 200: updated item object
Response 404: item not found or wrong business
Response 422: cannot modify — kds_status is 'preparing' or beyond
  EXCEPTION: customer_id can ALWAYS be changed (billing concern, not kitchen)
```

**TRAP:** The constraint is NOT a blanket "can't touch items in preparing." The rule is:
- `quantity` and `notes` — blocked when `kds_status IN ('preparing', 'ready', 'served')`
- `customer_id` — always allowed regardless of kds_status

---

#### `[RST-034]` Remove table item
```
DELETE /api/terminal/table-session-items/:id
Roles: any authenticated terminal user

Response 200: deleted
Response 404: item not found or wrong business
Response 422: cannot delete — kds_status is 'preparing' or beyond
  OVERRIDE: if user has 'can_void' permission, allow deletion of preparing+ items
    (this is kitchen waste — log to audit_logs)
```

**When overriding:** Set `kds_status = 'cancelled'` instead of hard-deleting. Emit `kds:item_cancelled` WebSocket event.

---

#### `[RST-035]` Close table → checkout (single bill)
```
POST /api/terminal/table-sessions/:id/close
Roles: employee with can_close_table_session (or owner/manager)

Input: (none)

Response 200:
{
  "checkout_payload": {
    "items": [
      {
        "product_id": "uuid",
        "variant_id": "uuid|null",
        "quantity": 2,
        "unit_price_ttc": 65.00,
        "modifiers_json": {},
        "notes": "no salt",
        "source_table_session_item_id": "uuid"
      }
    ],
    "customer_id": "uuid|null",
    "location_id": "uuid",
    "terminal_id": "uuid",     // from JWT
    "table_session_id": "uuid",
    "guest_count": 4,
    "split_label": null,
    "suggested_promotions": []  // evaluated at close time
  }
}

Response 404: session not found
Response 422: session is not in 'open' status, or has no items
```

**BEHAVIOUR:**
1. Transition `status` from `open` → `awaiting_payment`
2. Set `expected_split_count = 1`
3. Evaluate promotions against the full item list using `PromotionEvaluatorService`
4. Return checkout_payload — terminal feeds this into the standard payment flow
5. The standard flow calls `createTransaction()` which must now accept `table_session_id`
6. After transaction creation: check if `COUNT(transactions WHERE table_session_id = :id) >= expected_split_count`. If yes → transition session to `paid`, set `closed_at` and `closed_in_transaction_id`

---

#### `[RST-036]` Split bill
```
POST /api/terminal/table-sessions/:id/split
Roles: employee with can_close_table_session (or owner/manager)

Input:
{
  "split_type": "by_item",  // "by_item" | "even" | "custom"
  "splits": [                // required for "custom", ignored for "by_item"
    { "label": "Guest 1", "item_ids": ["uuid", "uuid"] },
    { "label": "Guest 2", "item_ids": ["uuid"] }
  ],
  "customer_split_index": 0  // optional, 0-based — which split gets the loyalty customer
}

Response 200:
{
  "checkout_payloads": [
    { /* checkout_payload for split 1 */ },
    { /* checkout_payload for split 2 */ }
  ]
}

Response 404: session not found
Response 422: session not in 'open' status, no items, or invalid split config
```

**SPLIT TYPE LOGIC:**

**`by_item`** — Group items by their `customer_id` field:
- Each unique `customer_id` becomes one split, customer attached
- Items with `customer_id = NULL` grouped as one anonymous split
- `splits` and `customer_split_index` parameters IGNORED
- The per-item `customer_id` is the source of truth

**`even`** — Divide total evenly:
- All items go into every split (each split = full list at 1/N price)
- Actually: each split gets a checkout_payload with all items, BUT `unit_price_ttc` on each item is divided by N splits, with rounding remainder distributed via `distributeDiscount()` to ensure sum = original total
- `customer_split_index` determines which split gets the loyalty customer

**`custom`** — Manual item assignment:
- Cashier assigns items to named splits via `splits[].item_ids`
- Every item must appear in exactly one split (validate: no orphans, no duplicates)
- `customer_split_index` determines which split gets the loyalty customer
- Per-item `customer_id` values are stored but NOT used for grouping — cashier's assignment wins

**TVA COMPLIANCE (CRITICAL):**
- Each split is its own legal receipt with its own invoice number per [TVA-020]
- Sum of all splits' TTC MUST equal session total TTC to the cent
- Use `distributeDiscount()` from `money.ts` for rounding remainder across splits
- Each split runs through the full TVA pipeline independently (resolveTvaRate per item, DiscountPipelineService per split)

**BEHAVIOUR:**
1. Transition `status` from `open` → `awaiting_payment`
2. Set `expected_split_count = splits.length`
3. Evaluate promotions per split
4. Return array of checkout_payloads
5. Terminal processes each split independently through the standard payment flow
6. Session → `paid` only when all `expected_split_count` transactions exist

---

#### `[RST-037]` Transfer items to another table
```
POST /api/terminal/table-session-items/transfer
Roles: any employee with can_transfer_table_items (or owner/manager)

Input:
{
  "item_ids": ["uuid", "uuid"],
  "target_table_session_id": "uuid"
}

Response 200: { "transferred": 2, "source_session_id": "uuid", "target_session_id": "uuid" }
Response 404: item or target session not found
Response 422: source or target session not in 'open' status
```

**BEHAVIOUR:**
- Update `table_session_id` on each item
- Emit `kds:items_transferred` WebSocket event
- Both source and target must be `status = 'open'`
- Both must belong to the same business

---

#### `[RST-038]` Cancel or partially close session
```
POST /api/terminal/table-sessions/:id/cancel
Roles: owner, manager; or employee with can_close_table_session_partial

Input:
{
  "reason": "Customer walked out",  // required, min 10 chars
  "force_close_partial": false       // see below
}

Response 200: { "status": "cancelled" | "paid", "partial_payment": bool }
Response 404: session not found
Response 422: invalid state transition
```

**TWO BEHAVIOURS:**

**When `status = 'open'` (no payment attempted):**
- Set `status = 'cancelled'`, `closed_at = NOW()`
- Set all items' `kds_status = 'cancelled'`
- Log to audit_logs with reason
- No transaction created
- Used for: walkouts, complaints, errors

**When `status = 'awaiting_payment'` AND `force_close_partial = true`:**
- Some splits already paid, others not
- Set `status = 'paid'`, `partial_payment = true`, `closed_at = NOW()`
- Log unpaid split details to audit_logs as "session shortfall"
- Requires `can_close_table_session_partial` permission
- Already-completed transactions are NOT affected
- Used for: one guest walks out after a split

---

### 6.3 KDS endpoints (chef)

These modify `kds_status` on `table_session_items`:

#### KDS — Update item status
```
POST /api/terminal/kds/items/:id/status
Roles: any authenticated terminal user (chef role implied)

Input:
{ "status": "preparing" }  // "preparing" | "ready" | "served"

Response 200: updated item with new kds_status

Valid transitions:
  new → preparing (chef accepts)
  preparing → ready (chef plates)
  ready → served (server collects)
```

**Emit WebSocket events:**
- `kds:item_status_changed` — to all KDS clients for this business
- `floor:item_ready` — to terminal/waiter clients when status becomes `ready` (server notification)

#### KDS — Get active items for kitchen
```
GET /api/terminal/kds/items
Query: location_id (optional), status (optional — filter by kds_status)
Roles: any authenticated terminal user

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "table_number": "T-12",
      "table_session_id": "uuid",
      "product_name": "Tajine Poulet",
      "variant_name": null,
      "quantity": 2,
      "notes": "no salt",
      "modifiers_json": {},
      "kds_status": "new",
      "added_at": "2026-05-10T18:35:00Z",
      "added_by": "Youssef",
      "order_source": "table_session"  // "table_session" | "direct_transaction"
    }
  ]
}
```

**BACKWARD COMPAT (CRITICAL):** This endpoint must ALSO return items from direct transactions (non-table POS/takeaway orders) that the existing KDS already shows. The `order_source` field distinguishes them. For direct transactions, use the existing `kds.service.ts` data. For table sessions, query `table_session_items WHERE kds_status IN ('new', 'preparing', 'ready')`.

---

### 6.4 OSS endpoint (public, no auth)

#### OSS — Order Status Screen
```
GET /api/public/oss
Query: location_id (required)

Response 200:
{
  "preparing": [
    {
      "display_number": "T-12",    // table_number for dine-in, txn_number for takeaway
      "order_type": "dine_in",     // "dine_in" | "takeaway" | "pos"
      "item_count": 3,
      "started_at": "2026-05-10T18:40:00Z"
    }
  ],
  "ready": [
    {
      "display_number": "T-05",
      "order_type": "dine_in",
      "item_count": 2,
      "ready_at": "2026-05-10T18:45:00Z"
    }
  ]
}
```

**Sources:**
- "preparing": table sessions with any item `kds_status = 'preparing'`, plus direct transactions in "preparing" status
- "ready": table sessions with all items `kds_status = 'ready'` (none still preparing), plus direct transactions in "ready" status

**WebSocket channel:** `oss:{location_id}` — pushes updates when any order transitions. The OSS TV screen subscribes and re-renders.

---

## 7. WEBSOCKET EVENTS

### Event naming convention
```
{domain}:{action}
```

### Events to emit

| Event | Payload | Emitted by | Listeners |
|-------|---------|------------|-----------|
| `kds:items_added` | `{ session_id, table_number, items[] }` | RST-032 (add items) | KDS screen |
| `kds:item_status_changed` | `{ item_id, session_id, table_number, old_status, new_status }` | KDS status update | KDS, floor plan, OSS |
| `kds:item_cancelled` | `{ item_id, session_id, table_number }` | RST-034 (remove item) | KDS screen |
| `kds:items_transferred` | `{ item_ids[], source_session, target_session }` | RST-037 (transfer) | KDS, floor plan |
| `floor:table_opened` | `{ table_id, session_id, table_number }` | RST-031 (open table) | Floor plan view |
| `floor:table_closed` | `{ table_id, session_id, status }` | RST-035/038 | Floor plan view |
| `floor:session_paid` | `{ table_id, session_id }` | createTransaction completion | Floor plan view |
| `oss:order_updated` | `{ location_id, preparing[], ready[] }` | Any status change | OSS TV screen |
| `dashboard:transaction_created` | `{ transaction_id, total_ttc }` | createTransaction | Dashboard |
| `dashboard:customer_created` | `{ customer_id }` | Customer CRUD | Dashboard |

### WebSocket rooms
```
kds:{business_id}          — KDS screen joins this room
floor:{business_id}        — Floor plan/terminal joins this room
oss:{location_id}          — OSS TV screen joins this room (public, no auth)
dashboard:{business_id}    — Dashboard joins this room
```

---

## 8. createTransaction() CHANGES

The existing `createTransaction()` in `terminal.service.ts` needs these additions:

### New field in CreateTransactionDto:
```typescript
table_session_id?: string;  // optional UUID
```

### Logic after transaction save (add to end of createTransaction):
```
IF table_session_id is provided:
  1. Verify session exists, belongs to same business, status = 'awaiting_payment'
  2. Set transaction.table_session_id = table_session_id
  3. Count completed = COUNT(transactions WHERE table_session_id = :id)
  4. IF completed >= session.expected_split_count:
     - Set session.status = 'paid'
     - Set session.closed_at = NOW()
     - IF expected_split_count == 1:
       Set session.closed_in_transaction_id = transaction.id
  5. Emit 'floor:session_paid' WebSocket event
```

**DO NOT modify any existing createTransaction logic.** This is purely additive — add the table_session_id handling after all existing transaction/item/points logic.

---

## 9. i18n FOUNDATION (backend-light)

### Migration addition (add to AddRestaurantOperations or separate small migration):
```sql
ALTER TABLE "users"
  ADD COLUMN "language_preference" VARCHAR(5) NOT NULL DEFAULT 'fr';
  -- valid: 'ar', 'fr', 'en'
```

### What to build:
1. Add `language_preference` column to User entity
2. Update `receipt-builder.ts` to accept a `language` parameter
3. Create `src/common/i18n/receipt-labels.ts` with label maps:
```typescript
export const RECEIPT_LABELS = {
  fr: { subtotal: 'Sous-total', tax: 'TVA', total: 'Total TTC', ... },
  ar: { subtotal: 'المجموع الفرعي', tax: 'الضريبة', total: 'المجموع الكلي', ... },
  en: { subtotal: 'Subtotal', tax: 'VAT', total: 'Total', ... }
};
```
4. Return error message keys (not hardcoded strings) from new RST endpoints. Pattern: `{ "error": "RST_TABLE_ALREADY_OPEN", "message": "Table already has an open session" }` — the `error` key is machine-readable for frontend i18n, the `message` is a human-readable English fallback.

### What NOT to build:
- No full i18n framework (no nestjs-i18n package)
- No translated error messages server-side — just return keys
- No RTL handling — that's frontend
- No language detection — frontend sends preference, backend stores it

---

## 10. EventGateway FOR REAL-TIME DASHBOARD

### New file: `src/common/gateways/event.gateway.ts`
```
@WebSocketGateway({ namespace: '/events', cors: true })
export class EventGateway {
  emitToRoom(room: string, event: string, payload: any)
  // Used by: createTransaction, customer CRUD, table operations
}
```

### Wire into CommonModule (already @Global)

### Emit from services:
- `terminal.service.ts` → `dashboard:transaction_created` after transaction save
- `customer.service.ts` → `dashboard:customer_created` after customer create
- `restaurant.service.ts` → all `floor:*` and `kds:*` events

---

## 11. TRAPS AND RULES

### TRAP 1: KDS backward compatibility
The existing KDS works with direct transactions. After refactoring, it MUST still work for non-restaurant businesses (retail, pharmacy, salon). The KDS items endpoint returns items from BOTH sources with an `order_source` field to distinguish them. Never remove the existing transaction-based KDS flow.

### TRAP 2: Split bill TVA rounding
Each split is a separate legal invoice. The sum of all splits' TTC must equal the session total to the cent. Use `distributeDiscount()` to handle the rounding remainder. Test with an odd total split 3 ways (e.g., 100.00 MAD → 33.34 + 33.33 + 33.33).

### TRAP 3: Item modification guard is NOT a blanket block
`quantity` and `notes` are blocked when `kds_status >= preparing`. But `customer_id` is ALWAYS modifiable regardless of kds_status. If Claude Code implements a single `if (item.kds_status >= 'preparing') throw 422`, that's a bug.

### TRAP 4: Session auto-transition timing
The session transitions to `paid` inside `createTransaction()`, not in the close/split endpoint. The close endpoint only sets `awaiting_payment`. This is important because the terminal processes each split asynchronously — the server doesn't know when all splits will be paid.

### TRAP 5: Even-split math
"Even split" doesn't duplicate items — it divides the total. For 3 items totalling 100 MAD split 2 ways: each split gets a checkout_payload with all 3 items but unit prices halved. The rounding remainder goes to the last split via `distributeDiscount()`.

### TRAP 6: checkout_payload is the contract
The terminal treats table checkout_payload exactly like a self-built cart. The promotion engine, coupon engine, and payment flow never need to know about tables. `table_session_id` is just a back-reference. Don't leak table logic into createTransaction beyond the session auto-transition.

### TRAP 7: Don't hard-delete cancelled items
When RST-034 removes an item with `can_void` override, set `kds_status = 'cancelled'` — don't DELETE the row. The kitchen needs to see what was cancelled. The close/split endpoints filter out cancelled items when building checkout_payloads.

### TRAP 8: Transfer validation
Both source and target sessions must be `status = 'open'` and same business. Items being transferred keep their `kds_status` — if an item is already `ready`, the chef already made it; transferring just changes which table gets the bill.

### RULE 1: Multi-tenancy
Every new table has `business_id`. Every endpoint scopes by JWT `business_id`. Cross-tenant = 404.

### RULE 2: Test every endpoint
At minimum: happy path + cross-tenant 404 + key constraint (e.g., 409 on duplicate table_number).

### RULE 3: Curl test at end of each part
Combine all steps into a single bash script. Login once, reuse the token.

---

## 12. TEST SCENARIOS FOR SPLIT BILL (Part D)

These MUST pass:

1. **Single close (no split):** Open table → add 3 items → close → pay → session becomes `paid`
2. **Custom split:** Open table → 4 items → split custom 2 ways → pay split 1 → session still `awaiting_payment` → pay split 2 → session becomes `paid`
3. **Even split:** 100 MAD total → split 3 ways → verify 33.34 + 33.33 + 33.33 = 100.00
4. **By-item split:** 3 items, 2 with customer_id A, 1 with customer_id B → split by_item → 2 payloads, one with A's items + customer_id A, one with B's item + customer_id B
5. **Partial close:** 3-way split, 2 paid, manager force-closes with `partial_payment = true`
6. **TVA invariant:** For any split: sum of all splits' total_ttc = sum of all items' (quantity × unit_price_ttc) before discounts. After discounts: sum of all splits' total_ht + total_tva = sum of all splits' total_ttc.

---

## 13. FILES TO CREATE (estimated)

### Part A
- `src/migrations/1714008000000-AddRestaurantOperations.ts`
- `src/common/entities/dining-area.entity.ts`
- `src/common/entities/table-type.entity.ts`
- `src/common/entities/table.entity.ts`
- `src/common/entities/table-session.entity.ts`
- `src/common/entities/table-session-item.entity.ts`
- `src/modules/restaurant/restaurant.module.ts`
- `src/modules/restaurant/restaurant.service.ts`
- `src/modules/restaurant/restaurant.controller.ts`
- `src/modules/restaurant/dto/restaurant.dto.ts`
- `src/modules/restaurant/restaurant.service.spec.ts`

### Part B
- `src/modules/restaurant/table-session.service.ts`
- `src/modules/restaurant/table-session.controller.ts` (terminal routes)
- `src/modules/restaurant/dto/table-session.dto.ts`
- `src/modules/restaurant/table-session.service.spec.ts`

### Part C
- Modify: `src/modules/kds/kds.service.ts` (add table_session_items source)
- Modify: `src/modules/kds/kds.gateway.ts` (add new events)
- `src/common/gateways/event.gateway.ts`
- `src/modules/restaurant/oss.controller.ts`
- `src/modules/kds/kds.service.spec.ts`

### Part D
- `src/modules/restaurant/checkout.service.ts` (checkout_payload builder + split logic)
- `src/common/i18n/receipt-labels.ts`
- Modify: `src/modules/terminal/terminal.service.ts` (add table_session_id handling)
- Modify: `src/common/utils/receipt-builder.ts` (add language parameter)
- `src/modules/restaurant/checkout.service.spec.ts`
- Modify: `CLAUDE.md` (mark Phase 10 DONE)

---

## 14. WHAT IS OUT OF SCOPE

- QR-code customer self-ordering (deferred — table.qr_code column exists but no endpoints)
- Delivery management, delivery boy assignment
- Online ordering
- Kiosk machines
- Reservation system
- Frontend implementation (that's the teammate's job)
- Full i18n framework (just foundation: column + receipt labels + error keys)
