# API Wiring Audit — 2026-05-24

## Context

This audit covers two frontends and one backend. The old `apps/dashboard-web` and
`apps/terminal-app` directories have been **replaced** by:

- `apps/frontend/admin-dashboard-ui-v3/` — Next.js admin dashboard (57 page components)
- `apps/frontend/pos-terminal-ui v3/` — Next.js POS terminal (2 pages + terminal service)

The backend lives at `apps/backend/` (NestJS, ~285 endpoints across 36 controllers).
All API paths are prefixed with `/api/`.

---

## ⚠️ CRITICAL BUGS FOUND FIRST

Three active wiring bugs cause silent 404/405 failures right now:

| # | Component | Bug | Correct path/method |
|---|-----------|-----|---------------------|
| 1 | `warehouses-page.tsx` | Calls `/api/business/inventory/warehouses` | `/api/business/warehouses` |
| 2 | `vendors-page.tsx` | Calls `/api/business/inventory/vendors` | `/api/business/vendors` |
| 3 | `dining-areas-page.tsx` | Sends `PUT` to `dining-areas/:id` | Backend expects `PATCH` |

These need to be fixed before anything else — they affect live functionality.

---

## Section 1: FULLY WIRED Components

Components where all expected API operations for the page's purpose are connected.

### 1. `reports-page.tsx`
**Endpoints called:**
- `GET /api/business/reports/:reportId` (universal — covers all 26+ report types via query params)

All 26 report IDs route through the single parametric endpoint. The page builds the query string
(`date_range`, `page`, `limit`, `warehouse_id`, etc.) and passes it through. Fully covered.

---

### 2. `kds-page.tsx`
**Endpoints called:**
- `GET /api/terminal/kds/items` — fetches active KDS items
- `POST /api/terminal/kds/items/:id/status` — updates item status (new→preparing→ready→served)

Both operations the KDS page needs are wired.

---

### 3. `categories-page.tsx`
**Endpoints called:**
- `GET /api/business/categories`
- `POST /api/business/categories`
- `PUT /api/business/categories/:id`
- `DELETE /api/business/categories/:id`

Full CRUD. Backend uses `@Put` for category updates — matches the frontend's `PUT`.

---

### 4. `stock-page.tsx`
**Endpoints called:**
- `GET /api/business/reports/stock-position?date_range=today`

This is a read-only summary page. Single report endpoint is the correct interface.

---

### 5. `stock-movements-page.tsx`
**Endpoints called:**
- `GET /api/business/reports/stock-movements?date_range=last_7days`

Read-only movement history. Report endpoint is the correct interface.

---

### 6. `dining-areas-page.tsx` *(fully wired — pending bug fix)*
**Endpoints called:**
- `GET /api/business/dining-areas`
- `POST /api/business/dining-areas`
- `PUT /api/business/dining-areas/:id` ← **BUG: must be PATCH**
- `DELETE /api/business/dining-areas/:id`

All four CRUD operations are present. Only the HTTP method on update is wrong.

---

### 7. `oss/page.tsx` (terminal app — OSS display screen)
**Endpoints called:**
- `GET /api/public/oss?location_id=` (polls every 10 seconds)

This public order-status screen is correctly and completely wired.

---

## Section 2: PARTIALLY WIRED Components

Components that have at least one real API call but are missing key operations.

---

### 1. `customers-page.tsx`
**Priority: HIGH**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/customers` (list) | `DELETE /api/business/customers/:id` |
| `PATCH /api/business/customers/:id` | `GET /api/business/customers/:id` (detail) |
| `POST /api/business/customers` | `GET /api/business/customers/dashboard-summary` |
| | `GET /api/business/customer-grades` (full CRUD) |
| | `GET /api/business/customer-labels` (full CRUD) |
| | `GET /api/business/customer-attributes` (full CRUD) |
| | `GET /api/business/customers/:id/points-history` |
| | `POST /api/business/customers/:id/points-adjustment` |
| | `PUT /api/business/customers/:id/labels` |

---

### 2. `employees-page.tsx`
**Priority: HIGH**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/employees` (list) | `POST /api/business/employees` |
| | `PUT /api/business/employees/:id` |
| | `PATCH /api/business/employees/:id/status` |
| | `GET /api/business/employees/:id/clock-history` |

List loads but no create/edit/toggle-status functionality connected.

---

### 3. `products-page.tsx`
**Priority: HIGH**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/categories` (for filter dropdown) | `POST /api/business/products` |
| `GET /api/business/products` (list) | `PUT /api/business/products/:id` |
| | `DELETE /api/business/products/:id` |
| | `PATCH /api/business/products/:id/sold-out` |
| | `GET /api/business/products/:id/variants` |
| | `POST /api/business/products/:id/variants` |
| | `PUT /api/business/variants/:id` |
| | `GET /api/business/modifier-groups` |
| | `POST /api/business/upload/product-image` |

Products read-only. Cannot create, edit, delete, or manage variants/modifiers from this page.

---

### 4. `promotions-page.tsx`
**Priority: HIGH**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/promotions` (list) | `POST /api/business/promotions` (create) |
| `POST /api/business/promotions/:id/activate` | `PATCH /api/business/promotions/:id` (update) |
| `POST /api/business/promotions/:id/pause` | `GET /api/business/promotions/:id` (detail) |
| `POST /api/business/promotions/:id/archive` | `GET /api/business/reports/promotions` |

Can activate/pause/archive but cannot create or edit promotions.

---

### 5. `coupons-page.tsx`
**Priority: HIGH**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/coupon-types` (list) | `POST /api/business/coupon-types` |
| | `PATCH /api/business/coupon-types/:id` |
| | `POST /api/business/coupon-types/:id/clone` |
| | `POST /api/business/coupon-types/:id/deactivate` |
| | `POST /api/business/coupon-types/:id/issue` |
| | `GET /api/business/coupons/lookup` |
| | `POST /api/business/coupons/:id/void` |
| | `GET /api/business/reports/coupons` |
| | `GET /api/business/reports/discount-write-offs` |

Read-only list only.

---

### 6. `purchase-orders-page.tsx`
**Priority: HIGH**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/purchase-orders` (list) | `GET /api/business/purchase-orders/:id` |
| | `POST /api/business/purchase-orders` |
| | `PATCH /api/business/purchase-orders/:id` |
| | `POST /api/business/purchase-orders/:id/send` |
| | `POST /api/business/purchase-orders/:id/confirm` |
| | `POST /api/business/purchase-orders/:id/receive` |
| | `POST /api/business/purchase-orders/:id/cancel` |

Cannot create or action POs from this page.

---

### 7. `announcements-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/announcements` | `PATCH /api/business/announcements/:id` |
| `POST /api/business/announcements` | `DELETE /api/business/announcements/:id` |
| | `GET /api/business/announcements/for-me` |

---

### 8. `locations-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/locations` | `GET /api/business/locations/:id/terminals` |
| `POST /api/business/locations` | |
| `PUT /api/business/locations/:id` | |

Core CRUD wired. Only missing terminal sub-list per location.

---

### 9. `points-exchange-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/points-exchange-rules` | `POST /api/business/points-exchange-rules` |
| | `PATCH /api/business/points-exchange-rules/:id` |
| | `DELETE /api/business/points-exchange-rules/:id` |
| | `GET /api/business/reports/points-exchange` |
| | `GET /api/business/points-exchange-rules/redeemable-for-customer` |

---

### 10. `recommendations-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/recommendation-templates` | `POST /api/business/recommendation-templates` |
| | `PATCH /api/business/recommendation-templates/:id` |
| | `DELETE /api/business/recommendation-templates/:id` |
| | `GET /api/business/recommendation-templates/featured` |
| | `PUT /api/business/recommendation-templates/:id/items` |

---

### 11. `table-management-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/tables` | `POST /api/business/tables` |
| `GET /api/business/dining-areas` | `PATCH /api/business/tables/:id` |
| | `DELETE /api/business/tables/:id` |

---

### 12. `table-types-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/table-types` | `PATCH /api/business/table-types/:id` |
| `POST /api/business/table-types` | `DELETE /api/business/table-types/:id` |

---

### 13. `stock-batches-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/stock-batches` | `POST /api/business/stock-batches` (receive batch) |
| | `POST /api/business/stock-batches/:id/adjust` |
| | `POST /api/business/stock-batches/:id/dispose` |
| | `POST /api/business/stock-batches/:id/transfer` |

---

### 14. `stock-adjustments-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/stock-adjustments` | `GET /api/business/stock-adjustments/:id` |
| | `POST /api/business/stock-adjustments` |
| | `POST /api/business/stock-adjustments/:id/submit` |
| | `POST /api/business/stock-adjustments/:id/approve` |
| | `POST /api/business/stock-adjustments/:id/post` |
| | `POST /api/business/stock-adjustments/:id/reject` |

---

### 15. `stock-transfers-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/stock-transfers` | `GET /api/business/stock-transfers/:id` |
| | `POST /api/business/stock-transfers` |
| | `POST /api/business/stock-transfers/:id/post` |
| | `POST /api/business/stock-transfers/:id/cancel` |
| | `DELETE /api/business/stock-transfers/:id` |

---

### 16. `vendor-payments-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/vendor-payments` (list) | `GET /api/business/vendor-payments/:id` |
| `POST /api/business/vendor-payments/:id/confirm` | `POST /api/business/vendor-payments` (create) |
| `POST /api/business/vendor-payments/:id/void` | `GET /api/business/vendors/:id/outstanding` |
| | `GET /api/business/vendors/:id/payment-summary` |

---

### 17. `vendors-page.tsx` *(has URL bug)*
**Priority: HIGH** (broken right now)

| IS wired | BUG / MISSING |
|----------|---------------|
| `GET /api/business/inventory/vendors` | ❌ Wrong path — returns 404 |
| | Correct: `GET /api/business/vendors` |
| | `POST /api/business/vendors` |
| | `PATCH /api/business/vendors/:id` |
| | `DELETE /api/business/vendors/:id` |
| | `GET /api/business/vendors/:id/check-details` |

---

### 18. `warehouses-page.tsx` *(has URL bug)*
**Priority: HIGH** (broken right now)

| IS wired | BUG / MISSING |
|----------|---------------|
| `GET /api/business/inventory/warehouses` | ❌ Wrong path — returns 404 |
| `POST /api/business/inventory/warehouses` | ❌ Wrong path — returns 404 |
| | Correct base: `/api/business/warehouses` |
| | `PATCH /api/business/warehouses/:id` |
| | `DELETE /api/business/warehouses/:id` |
| | `GET /api/business/warehouses/:id` |

---

### 19. `communications-page.tsx`
**Priority: MEDIUM**

| IS wired | MISSING |
|----------|---------|
| `GET /api/business/notifications/sends` | `GET /api/business/notifications/channels` |
| | `PUT /api/business/notifications/channels` |
| | `POST /api/business/notifications/channels/test` |
| | `POST /api/business/notifications/sms/refresh-balance` |
| | `GET /api/business/notifications/sms/balance` |
| | `POST /api/business/notifications/send` |
| | `POST /api/business/notifications/send-to-segment` |
| | `GET /api/business/platform-announcements` |
| | `POST /api/business/platform-announcements/:id/dismiss` |

---

### 20. `pos-terminal-ui v3/app/page.tsx`
**Priority: HIGH**

The terminal service (`terminal.service.ts`) has **full real API wiring** for core POS operations:

| IS wired (via terminalService) | MISSING / MOCK |
|-------------------------------|-----------------|
| `POST /api/terminal/activate` | Floor plan (`GET /api/terminal/tables/floor-plan`) — **MOCK** |
| `POST /api/auth/pin-login` | Table session operations (open, add items, modify, close, split) — **MOCK** |
| `POST /api/terminal/clock-in` | `GET /api/terminal/sync/status` — stub only |
| `POST /api/terminal/clock-out` | `POST /api/terminal/sync` — stub only |
| `GET /api/terminal/catalog` | `GET /api/terminal/recommendation-templates/:id/items` |
| `GET /api/terminal/customers/lookup` | `GET /api/terminal/active-employees` |
| `POST /api/terminal/customers/quick-add` | `GET /api/terminal/config` |
| `POST /api/terminal/promotions/evaluate` | |
| `GET /api/terminal/coupons/validate` | |
| `POST /api/terminal/transactions` | |
| `POST /api/terminal/transactions/:id/void` | |
| `GET /api/terminal/transactions/today` | |
| `POST /api/terminal/heartbeat` | |

The entire Phase 10 restaurant section in `page.tsx` (floor plan view, table opening,
item management, KDS status, split bill) uses inline mock data and never calls the backend.

---

## Section 3: ZERO WIRING Components (pure mock/static)

31 components with no real API calls.

| Component | Backend endpoints needed | Priority |
|-----------|--------------------------|----------|
| `admin-announcements-page.tsx` | `GET/POST/PATCH/DELETE /api/super/announcements` | HIGH |
| `super-admin-page.tsx` | `GET /api/super/businesses`, `GET /api/super/terminals`, `GET /api/super/subscriptions`, `GET /api/super/dashboard/stats`, `GET /api/super/audit-logs`, business-types CRUD | HIGH |
| `terminals-page.tsx` | `GET/POST /api/super/terminals`, `PATCH /api/super/terminals/:id/assign`, `GET /api/super/terminals/health` | HIGH |
| `product-detail-page.tsx` | `GET /api/business/products/:id`, variants CRUD, modifier group assignment, `PUT /api/business/products/:id/nutrition`, `POST /api/business/upload/product-image` | HIGH |
| `promotion-create-page.tsx` | `POST /api/business/promotions`, `GET /api/business/categories`, `GET /api/business/products` | HIGH |
| `promotion-detail-page.tsx` | `GET /api/business/promotions/:id`, `PATCH /api/business/promotions/:id`, action endpoints | HIGH |
| `purchase-order-create-page.tsx` | `POST /api/business/purchase-orders`, `GET /api/business/vendors`, `GET /api/business/products`, `GET /api/business/warehouses` | HIGH |
| `purchase-order-detail-page.tsx` | `GET /api/business/purchase-orders/:id`, action endpoints (send/confirm/receive/cancel) | HIGH |
| `brands-page.tsx` | `GET/POST/PATCH/DELETE /api/business/brands` | MEDIUM |
| `chain-page.tsx` | All 14 chain business endpoints + 4 super chain endpoints | MEDIUM |
| `coupon-bulk-issue-page.tsx` | `POST /api/business/coupons/bulk-issue`, `POST /api/business/coupons/issue-to-segment`, `GET /api/business/jobs/:id` | MEDIUM |
| `couriers-page.tsx` | `GET/POST /api/business/couriers`, `DELETE /api/business/couriers/:id` | MEDIUM |
| `custom-authority-page.tsx` | `GET/PUT /api/super/businesses/:id/custom-authority` | MEDIUM |
| `customer-detail-page.tsx` | `GET /api/business/customers/:id`, labels, attributes, points history, points adjustment | HIGH |
| `discrepancy-alerts-page.tsx` | `GET /api/business/stock-discrepancy-alerts`, `POST /:id/resolve` | MEDIUM |
| `expiration-alerts-page.tsx` | `GET /api/business/expiration-alerts`, `POST /:id/resolve` | MEDIUM |
| `floor-plan-setup-page.tsx` | All restaurant setup: dining-areas, table-types, tables CRUD | MEDIUM |
| `modifiers-page.tsx` | `GET/POST/PUT /api/business/modifier-groups`, `POST /modifier-groups/:id/modifiers` | HIGH |
| `notification-channels-page.tsx` | `GET/PUT /api/business/notifications/channels`, `POST /channels/test` | MEDIUM |
| `notification-send-page.tsx` | `POST /api/business/notifications/send`, `POST /send-to-segment`, `GET /customers`, `GET /customer-grades`, `GET /customer-labels` | MEDIUM |
| `notification-templates-page.tsx` | `GET/POST/PATCH/DELETE /api/business/notifications/templates`, `POST /:id/preview` | MEDIUM |
| `notifications-page.tsx` | `GET /api/business/notifications/sends` (duplicate of communications-page) | LOW |
| `platform-announcements-page.tsx` | `GET /api/business/platform-announcements`, `POST /:id/dismiss` | LOW |
| `recommendation-items-page.tsx` | `PUT /api/business/recommendation-templates/:id/items`, `GET /api/business/products` | MEDIUM |
| `settings-page.tsx` | `GET/PUT /api/business/settings/settlement-cutoff`, `GET /api/auth/me`, `PUT /api/auth/change-password` | MEDIUM |
| `stock-templates-page.tsx` | `GET/POST/PATCH/DELETE /api/business/stock-templates`, `POST /:id/create-purchase-order` | MEDIUM |
| `system-parameters-page.tsx` | `GET /api/super/system-parameters`, `PATCH /api/super/system-parameters/:id` | LOW |
| `trade-categories-page.tsx` | `GET/POST/PATCH/DELETE /api/super/trade-categories`, `GET /api/auth/trade-categories/tree` | LOW |
| `units-of-measure-page.tsx` | `GET/POST/PATCH/DELETE /api/business/units-of-measure` | MEDIUM |
| `vendor-detail-page.tsx` | `GET /api/business/vendors/:id`, `GET/POST /api/business/vendors/:id/check-details`, outstanding/payment-summary | MEDIUM |
| `version-log-page.tsx` | `GET /api/auth/version-log/menus`, `GET/POST/PATCH/DELETE /api/super/version-log/entries` | LOW |

---

## Section 4: ORPHAN Backend Endpoints

Backend endpoints with **no corresponding frontend component** in either dashboard.

### Terminal-only (correctly handled by `terminal.service.ts` — not admin dashboard)
- `POST /api/terminal/activate`
- `GET /api/terminal/config`
- `POST /api/terminal/heartbeat`
- `POST /api/terminal/clock-in` / `clock-out`
- `GET /api/terminal/active-employees`
- `GET /api/terminal/catalog`
- `GET /api/terminal/customers/lookup` / `quick-add`
- `POST /api/terminal/promotions/evaluate`
- `GET /api/terminal/coupons/validate`
- `POST /api/terminal/transactions` / `/:id/void`
- `GET /api/terminal/transactions/today`

### Table sessions — completely orphaned (no real calls anywhere)
- `GET /api/terminal/tables/floor-plan`
- `POST /api/terminal/tables/:id/open`
- `POST /api/terminal/table-sessions/:id/items`
- `PATCH /api/terminal/table-session-items/:id`
- `POST /api/terminal/table-session-items/transfer`
- `DELETE /api/terminal/table-session-items/:id`
- `POST /api/terminal/table-sessions/:id/close`
- `POST /api/terminal/table-sessions/:id/split`
- `POST /api/terminal/table-sessions/:id/cancel`

### Terminal sync — stub only (no real server-side call in service)
- `POST /api/terminal/sync`
- `GET /api/terminal/sync/status`

### Terminal recommendations
- `GET /api/terminal/recommendation-templates/:id/items`

### Legacy KDS (superseded by `/terminal/kds`)
- `GET /api/kds/orders`
- `PATCH /api/kds/orders/:id/status`

### Auth utilities — no frontend UI
- `POST /api/auth/refresh`
- `PUT /api/auth/change-password` (no settings page wired)
- `POST /api/auth/logout`

### Chain operations — no frontend yet
- All 14 `/api/business/chain/*` endpoints
- All 4 `/api/super/businesses/chain-*` endpoints
- `POST /api/auth/switch-business`
- `GET /api/auth/me/accessible-businesses`

### Platform admin — no frontend yet
- `GET/POST/PATCH/DELETE /api/super/trade-categories/*`
- `GET/POST/PATCH/DELETE /api/super/couriers/*`
- `GET/PUT /api/super/businesses/:id/custom-authority`
- `GET/POST/PATCH/DELETE /api/super/version-log/*`
- `GET/PATCH /api/super/system-parameters/*`
- `GET/POST/DELETE /api/business/couriers/*`
- `GET/PUT /api/business/settings/settlement-cutoff`

### Inventory foundations — no frontend yet
- `GET/POST/PATCH/DELETE /api/business/units-of-measure`
- `GET /api/business/brands` + CRUD
- `GET /api/business/products/:id/nutrition` / `PUT`
- `GET /api/business/nutrition-info`
- `GET/POST /api/business/vendors/:id/check-details`
- `GET /api/business/vendors/:id/outstanding`
- `GET /api/business/vendors/:id/payment-summary`
- `POST /api/business/stock-templates/:id/create-purchase-order`

### Subscriptions — no frontend
- `GET/POST /api/super/subscriptions`
- `PUT /api/super/subscriptions/:id`

### Reports (old controller — superseded by universal endpoint)
- `GET /api/business/reports/daily-sales`
- `GET /api/business/reports/revenue-by-item`
- `GET /api/business/reports/payment-methods`
- `GET /api/business/reports/transactions`
- `GET /api/business/reports/voids-refunds`
- `GET /api/business/reports/clock-history`
- `GET /api/business/reports/tva-declaration` *(still useful for TVA filing page)*

### Public/webhook — no frontend needed
- `POST /api/webhooks/notifications/:provider`
- `POST /api/public/notifications/opt-out`
- `GET /api/health`

### Refund and transaction detail
- `GET /api/business/transactions/:id`
- `POST /api/business/transactions/:id/refund`

---

## Final Summary

| Metric | Count |
|--------|-------|
| Total backend endpoints | **~285** |
| Total frontend components | **59** (57 admin dashboard + 2 terminal) |
| Components with zero API wiring | **31** (53%) |
| Components with partial wiring | **20** (34%) |
| Components fully wired | **8** (13%) |
| Unique endpoint calls in frontend | **~58** |
| Endpoints with frontend coverage | **~58 / 285 = ~20%** |
| Active URL bugs (silent 404) | **3** |

---

## Changes vs Previous Audit Baseline

| Area | Previous | Now | Delta |
|------|----------|-----|-------|
| Frontend architecture | `apps/dashboard-web` (React/Vite) | `apps/frontend/admin-dashboard-ui-v3` + `pos-terminal-ui v3` (Next.js) | **Full replacement** |
| Total page components | ~30 | 59 | +29 new pages |
| Zero-wiring components | 30 | 31 | +1 (more pages added) |
| Partial wiring components | 14 | 20 | +6 improved |
| Backend endpoint count | ~305 | ~285 | -20 (more precise count) |
| apiFetch calls | ~50 | ~58 | +8 |
| Endpoints with zero frontend usage | ~250+ | ~227 | Improved |
| **NEW: Active URL path bugs** | 0 | **3** | Regressions introduced |
| Restaurant table sessions wired | 0% | 0% | No change — still all mock |
| Terminal service wiring | partial | **complete for core POS** | Significant improvement |
| OSS page | not present | **fully wired** | New |
| KDS page | not present | **fully wired** | New |

**Key structural change:** The old 30-page `dashboard-web` was entirely replaced with a 57-component
`admin-dashboard-ui-v3`. The new frontend has more coverage depth (real apiFetch vs all-mock),
but also introduced 3 breaking URL bugs and 31 components that are still zero-wired.

---

## Top 10 Priority Items (Ordered by Business Impact)

| Rank | Item | What to do | Impact |
|------|------|-----------|--------|
| 1 | **Fix `/inventory/warehouses` URL bug** in `warehouses-page.tsx` | Change `/api/business/inventory/warehouses` → `/api/business/warehouses` | Warehouse management broken |
| 2 | **Fix `/inventory/vendors` URL bug** in `vendors-page.tsx` | Change `/api/business/inventory/vendors` → `/api/business/vendors` | Vendor management broken |
| 3 | **Fix `PUT→PATCH` bug** in `dining-areas-page.tsx` | Change `method: "PUT"` → `method: "PATCH"` on update | Dining area edit fails silently |
| 4 | **Wire `products-page.tsx` mutations** | Add POST create, PUT update, DELETE, sold-out toggle, image upload | Can't create/edit products |
| 5 | **Wire `employees-page.tsx` mutations** | Add POST, PUT, PATCH status, GET clock-history | Can't add/edit employees |
| 6 | **Wire `promotion-create-page.tsx`** | POST /promotions + seed categories/products | Can't create promotions |
| 7 | **Wire `purchase-order-create-page.tsx`** | POST /purchase-orders + fetch vendors/products/warehouses | Can't create POs |
| 8 | **Wire `customers-page.tsx` delete + customer-detail** | DELETE /:id, GET dashboard-summary, grades/labels/points | Incomplete CRM |
| 9 | **Wire `notification-templates-page.tsx`** | Full CRUD + preview | Can't set up notification campaigns |
| 10 | **Wire `modifiers-page.tsx`** | GET/POST/PUT modifier groups + add modifiers | Can't manage product modifiers |

---

## Suggested Sprint Plan

### Sprint 1 — Bug fixes + Core commerce (5 items)
1. Fix 3 URL/method bugs (warehouses, vendors, dining-areas) — 1 day
2. Wire `products-page.tsx` mutations (create, edit, delete, image upload, sold-out) — 2 days
3. Wire `employees-page.tsx` mutations (create, edit, status toggle) — 1 day

### Sprint 2 — Promotions & Ordering (6 items)
4. Wire `promotion-create-page.tsx` + `promotion-detail-page.tsx` — 2 days
5. Wire `coupons-page.tsx` (create type, issue, void, reports) — 2 days
6. Wire `purchase-order-create-page.tsx` + `purchase-order-detail-page.tsx` — 2 days

### Sprint 3 — Customers & Communications (7 items)
7. Wire `customer-detail-page.tsx` (points, labels, attributes) — 1.5 days
8. Wire `notification-templates-page.tsx` (CRUD + preview) — 1 day
9. Wire `notification-send-page.tsx` (send + send-to-segment) — 1 day
10. Wire `notification-channels-page.tsx` (channels + test) — 0.5 day
11. Wire `modifiers-page.tsx` — 1 day

### Sprint 4 — Inventory completions (6 items)
12. Wire `stock-batches-page.tsx` actions (receive, adjust, dispose, transfer) — 1.5 days
13. Wire `stock-adjustments-page.tsx` full lifecycle — 1.5 days
14. Wire `stock-transfers-page.tsx` full lifecycle — 1 day
15. Wire `stock-templates-page.tsx` + create-PO action — 1 day
16. Wire `brands-page.tsx` + `units-of-measure-page.tsx` — 1 day

### Sprint 5 — Restaurant & Restaurant terminal (5 items)
17. Wire `pos-terminal-ui v3/app/page.tsx` restaurant section — replace mock with real table session API calls — 3 days
18. Wire `table-management-page.tsx` mutations (create, edit, delete tables) — 1 day
19. Wire `floor-plan-setup-page.tsx` — 1 day

### Sprint 6 — Platform admin & Chain (5 items)
20. Wire `super-admin-page.tsx` (businesses, terminals, subscriptions, audit-log) — 2 days
21. Wire `chain-page.tsx` (chain tree, sync, rollout) — 2 days
22. Wire `trade-categories-page.tsx`, `system-parameters-page.tsx`, `version-log-page.tsx` — 1.5 days
