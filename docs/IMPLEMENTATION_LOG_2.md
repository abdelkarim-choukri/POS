# Implementation Log 2 — Frontend API Wiring Session

## Wiring Pass — 2026-05-26 (55 files, 252/285 endpoints)

All work is in `apps/frontend/admin-dashboard-ui-v3/` and `apps/frontend/pos-terminal-ui v3/`.
No backend changes. No new pages created outside existing components.

### Scope

Full two-way wiring of the POS admin dashboard and terminal app against the live backend.
Source of truth: `docs/full-coverage-audit-2026-05-24.md`.

Starting state: 42 endpoints wired (15%), 3 active URL/method bugs.
Ending state: 252 endpoints wired (88%), 0 active bugs, 5 endpoints still pending.

---

### Bug Fixes (3)

- [x] `warehouses-page.tsx` — corrected `/api/business/inventory/warehouses` → `/api/business/warehouses` (was returning 404 on every page load)
- [x] `vendors-page.tsx` — corrected `/api/business/inventory/vendors` → `/api/business/vendors`
- [x] `dining-areas-page.tsx` — corrected `method: "PUT"` → `method: "PATCH"` on update call (backend uses `@Patch`)

---

### lib/api.ts — Auth Refresh Interceptor

- [x] `POST /api/auth/refresh` — 401 interceptor in `apiFetch`: detects 401, calls `/api/auth/refresh` with stored `dash_refresh_token`, retries original request with new token; singleton `refreshPromise` prevents parallel refresh storms; clears tokens and throws `ApiError(401)` on refresh failure

---

### Auth & Navigation (app/page.tsx)

- [x] `POST /api/auth/login` — email/password login form wired; stores token + refresh token
- [x] `POST /api/auth/super-admin/login` — super-admin login branch wired
- [x] `GET /api/auth/me/accessible-businesses` — fetched after login for chain users; populates business switcher
- [x] `POST /api/auth/switch-business` — business switcher; re-issues JWT with new `business_id` claim
- [x] `POST /api/auth/logout` — called on sign-out button; clears local tokens regardless of response
- [x] `GET /api/auth/regions/tree` — Morocco address hierarchy for registration/settings forms
- [x] `POST /api/auth/regions/validate` — address validation on settings save

---

### settings-page.tsx

- [x] `GET /api/auth/me` — loads profile section (name, email, role) on mount
- [x] `PUT /api/auth/change-password` — password change form wired
- [x] `GET /api/business/settings/settlement-cutoff` — loads current cutoff time
- [x] `PUT /api/business/settings/settlement-cutoff` — saves cutoff time change
- [x] `GET /api/business/notifications/channels` — loads channel config (SMS/Email/WhatsApp)
- [x] `GET /api/auth/regions/tree` — populates address dropdowns in profile section

---

### employees-page.tsx

- [x] `POST /api/business/employees` — create employee modal wired (all fields + permissions JSONB)
- [x] `PUT /api/business/employees/:id` — edit employee modal wired
- [x] `PATCH /api/business/employees/:id/status` — status toggle (active/inactive) wired
- [x] `GET /api/business/employees/:id/clock-history` — clock-history panel wired with date range params

---

### products-page.tsx

- [x] `POST /api/business/products` — create product modal wired (all fields incl. brand/barcode/cost)
- [x] `PUT /api/business/products/:id` — edit product modal wired
- [x] `DELETE /api/business/products/:id` — delete confirm wired
- [x] `PATCH /api/business/products/:id/sold-out` — sold-out toggle wired
- [x] `GET /api/business/products/:id/variants` — variant list loaded in variant panel
- [x] `POST /api/business/products/:id/variants` — add variant modal wired
- [x] `PUT /api/business/variants/:id` — edit variant modal wired
- [x] `POST /api/business/upload/product-image` — image upload wired (raw fetch with Bearer token, multipart/form-data)
- [x] `GET /api/business/modifier-groups` — modifier groups loaded in modifier tab
- [x] `POST /api/business/modifier-groups` — create modifier group wired
- [x] `PUT /api/business/modifier-groups/:id` — edit modifier group wired
- [x] `POST /api/business/modifier-groups/:id/modifiers` — add modifier item wired
- [x] `POST /api/business/products/:id/modifier-groups` — link modifier group to product wired

---

### product-detail-page.tsx

- [x] `GET /api/business/products/:id` — detail load on mount
- [x] `GET /api/business/products/:id/variants` — variants tab fetch
- [x] `GET /api/business/products/:id/nutrition` — nutrition tab fetch
- [x] `PUT /api/business/products/:id/nutrition` — nutrition edit form save

---

### customers-page.tsx

- [x] `GET /api/business/customers/dashboard-summary` — header KPI cards (total, new this month, active)
- [x] `DELETE /api/business/customers/:id` — delete confirm wired
- [x] `GET /api/business/customer-grades` + POST/PATCH/:id/DELETE/:id — full CRUD in grades tab
- [x] `GET /api/business/customer-labels` + POST/PATCH/:id/DELETE/:id — full CRUD in labels tab
- [x] `PUT /api/business/customers/:id/labels` — assign labels to customer wired
- [x] `GET /api/business/customer-attributes` + POST/PATCH/:id/DELETE/:id — full CRUD in attrs tab
- [x] `GET /api/business/customers/:id/points-history` — points history panel wired
- [x] `POST /api/business/customers/:id/points-adjustment` — manual points adjust modal wired
- [x] `POST /api/business/customers/import-grades` — CSV import button wired (raw fetch, multipart); previously NEW PAGE → added to grades tab

---

### customer-detail-page.tsx

- [x] `GET /api/business/customers/:id` — detail load on mount
- [x] `GET /api/business/customers/:id/attributes` — attributes tab fetch
- [x] `PUT /api/business/customers/:id/attributes` — attribute edit form save

---

### locations-page.tsx

- [x] `GET /api/business/locations/:id/terminals` — terminals sub-list wired (expands on row click)

---

### promotions-page.tsx + promotion-create-page.tsx + promotion-detail-page.tsx

- [x] `GET /api/business/promotions/:id` — detail panel loaded on row select
- [x] `POST /api/business/promotions` — create modal wired (all fields + conditions); both promotions-page and promotion-create-page route through same handler
- [x] `PATCH /api/business/promotions/:id` — edit modal wired in promotion-detail-page

---

### coupons-page.tsx + coupon-bulk-issue-page.tsx

- [x] `GET /api/business/coupon-types/:id` — detail panel on row select
- [x] `POST /api/business/coupon-types` — create type modal wired
- [x] `PATCH /api/business/coupon-types/:id` — edit type modal wired
- [x] `POST /api/business/coupon-types/:id/clone` — clone button wired
- [x] `POST /api/business/coupon-types/:id/deactivate` — deactivate button wired
- [x] `POST /api/business/coupon-types/:id/issue` — issue-to-customer modal wired
- [x] `GET /api/business/coupons/lookup` — coupon lookup by code wired
- [x] `POST /api/business/coupons/:id/void` — void confirm wired
- [x] `POST /api/business/coupons/bulk-issue` — bulk-issue form wired (segment + count params)
- [x] `POST /api/business/coupons/issue-to-segment` — issue-to-segment form wired
- [x] `GET /api/business/jobs/:id` — job status polling wired in coupon-bulk-issue-page (polls until job complete)

---

### points-exchange-page.tsx

- [x] `GET /api/business/points-exchange-rules/check-point-value` — settings tab KPI wired
- [x] `GET /api/business/points-exchange-rules/:id` — detail load on rule select
- [x] `POST /api/business/points-exchange-rules` — create rule modal wired (fixed fields: discount_value, daily/total limits)
- [x] `PATCH /api/business/points-exchange-rules/:id` — edit rule modal wired
- [x] `DELETE /api/business/points-exchange-rules/:id` — delete confirm wired

---

### units-of-measure-page.tsx

- [x] `GET /api/business/units-of-measure` + POST/PATCH/:id/DELETE/:id — full CRUD wired

---

### warehouses-page.tsx (+ URL bug fixed)

- [x] `GET /api/business/warehouses` — list (fixed URL)
- [x] `POST /api/business/warehouses` — create modal wired (fixed URL)
- [x] `GET /api/business/warehouses/:id` — detail panel on row select
- [x] `PATCH /api/business/warehouses/:id` — edit modal wired
- [x] `DELETE /api/business/warehouses/:id` — delete confirm wired

---

### vendors-page.tsx (+ URL bug fixed)

- [x] `GET /api/business/vendors` — list (fixed URL)
- [x] `POST /api/business/vendors` — create modal wired
- [x] `PATCH /api/business/vendors/:id` — edit modal wired
- [x] `DELETE /api/business/vendors/:id` — delete confirm wired

---

### vendor-detail-page.tsx

- [x] `GET /api/business/vendors/:id` — detail load on mount
- [x] `GET /api/business/vendors/:id/check-details` — check-details history tab
- [x] `POST /api/business/vendors/:id/check-details` — add check-detail form wired
- [x] `GET /api/business/vendors/:id/outstanding` — outstanding invoices section
- [x] `GET /api/business/vendors/:id/payment-summary` — payment summary KPIs

---

### brands-page.tsx

- [x] `GET /api/business/brands` + POST/PATCH/:id/DELETE/:id — full CRUD wired

---

### expiration-alerts-page.tsx

- [x] `GET /api/business/expiration-alerts` — alert list on mount
- [x] `POST /api/business/expiration-alerts/:id/resolve` — resolve button wired

---

### discrepancy-alerts-page.tsx

- [x] `GET /api/business/stock-discrepancy-alerts` — alert list on mount
- [x] `POST /api/business/stock-discrepancy-alerts/:id/resolve` — resolve button wired

---

### stock-batches-page.tsx

- [x] `POST /api/business/stock-batches` — receive-batch modal wired
- [x] `POST /api/business/stock-batches/:id/adjust` — adjust modal wired
- [x] `POST /api/business/stock-batches/:id/dispose` — dispose modal wired
- [x] `POST /api/business/stock-batches/:id/transfer` — transfer modal wired

---

### stock-templates-page.tsx

- [x] `GET /api/business/stock-templates` + GET/:id/POST/PATCH/:id/DELETE/:id — full CRUD wired
- [x] `POST /api/business/stock-templates/:id/create-purchase-order` — generate PO button wired

---

### purchase-orders-page.tsx + purchase-order-create-page.tsx + purchase-order-detail-page.tsx

- [x] `GET /api/business/purchase-orders/:id` — detail panel on row select
- [x] `POST /api/business/purchase-orders` — create form wired (vendor dropdown loads from /vendors, product search, warehouse selector)
- [x] `PATCH /api/business/purchase-orders/:id` — edit form wired in detail page
- [x] `POST /api/business/purchase-orders/:id/send` — Send to Vendor button wired
- [x] `POST /api/business/purchase-orders/:id/confirm` — Confirm button wired
- [x] `POST /api/business/purchase-orders/:id/receive` — Receive button wired
- [x] `POST /api/business/purchase-orders/:id/cancel` — Cancel button wired

---

### stock-adjustments-page.tsx

- [x] `GET /api/business/stock-adjustments/:id` + POST/submit/:id/approve/:id/post/:id/reject/:id — full lifecycle wired

---

### stock-transfers-page.tsx

- [x] `GET /api/business/stock-transfers/:id` + POST/post/:id/cancel/:id/DELETE/:id — full lifecycle wired

---

### vendor-payments-page.tsx

- [x] `GET /api/business/vendor-payments/:id` — detail panel on row select
- [x] `POST /api/business/vendor-payments` — create payment modal wired

---

### communications-page.tsx + notification-channels-page.tsx + notification-templates-page.tsx + notification-send-page.tsx + platform-announcements-page.tsx + announcements-page.tsx

- [x] `GET /api/business/platform-announcements` — list on mount; dismiss button wired
- [x] `POST /api/business/platform-announcements/:id/dismiss` — dismiss confirm wired
- [x] `GET /api/business/announcements/for-me` — "for me" tab wired
- [x] `PATCH /api/business/announcements/:id` — edit modal wired
- [x] `DELETE /api/business/announcements/:id` — delete confirm wired
- [x] `GET /api/business/notifications/channels` + PUT — load and save channel config
- [x] `POST /api/business/notifications/channels/test` — test button sends test notification
- [x] `GET /api/business/notifications/sms/balance` — SMS balance display
- [x] `POST /api/business/notifications/sms/refresh-balance` — refresh balance button
- [x] `GET /api/business/notifications/templates` + POST/PATCH/:id/DELETE/:id — full CRUD
- [x] `POST /api/business/notifications/templates/:id/preview` — preview button wired
- [x] `POST /api/business/notifications/send` — send-to-all form wired
- [x] `POST /api/business/notifications/send-to-segment` — send-to-segment form wired (All/Grade/Label/Specific)

---

### recommendations-page.tsx + recommendation-items-page.tsx

- [x] `GET /api/business/recommendation-templates/featured` — featured tab wired
- [x] `POST /api/business/recommendation-templates` — create modal wired
- [x] `PATCH /api/business/recommendation-templates/:id` — edit modal wired
- [x] `DELETE /api/business/recommendation-templates/:id` — delete confirm wired
- [x] `PUT /api/business/recommendation-templates/:id/items` — item save wired in recommendation-items-page

---

### table-management-page.tsx + table-types-page.tsx + dining-areas-page.tsx (+ bug fix)

- [x] `PATCH /api/business/dining-areas/:id` — fixed method from PUT → PATCH
- [x] `PATCH /api/business/table-types/:id` — edit modal wired
- [x] `DELETE /api/business/table-types/:id` — delete confirm wired
- [x] `POST /api/business/tables` — create table modal wired
- [x] `PATCH /api/business/tables/:id` — edit table modal wired
- [x] `DELETE /api/business/tables/:id` — delete confirm wired

---

### reports-page.tsx

- [x] `GET /api/business/transactions/:id` — transaction detail slide panel added; opens on row click in invoice-register report
- [x] `POST /api/business/transactions/:id/refund` — Refund button inside transaction detail panel wired

---

### chain-page.tsx

- [x] `GET /api/auth/me/accessible-businesses` — business switcher populated
- [x] `POST /api/auth/switch-business` — switch business wired
- [x] `GET /api/business/chain/dashboard` — chain dashboard KPIs
- [x] `GET /api/business/chain/sync-config` + `PUT` — sync config modal load/save
- [x] `POST /api/business/chain/sync` — trigger sync wired
- [x] `GET /api/business/chain/sync-jobs/:id` — job status polling after sync trigger
- [x] `GET /api/business/chain/unmapped-products` — unmapped products panel
- [x] `POST /api/business/chain/pull-product` — pull product from parent wired
- [x] `GET /api/business/chain/parent-vendor-info` — parent vendor info tab
- [x] `GET /api/business/chain/incoming-po-requests` — incoming PO requests tab
- [x] `POST /api/business/chain/incoming-po-requests/:id/fulfill` — fulfill PO modal wired
- [x] `GET /api/business/chain/transactions` — chain transactions tab with pagination
- [x] `POST /api/business/promotions/:id/validate-sub-stores` — validate rollout modal wired
- [x] `POST /api/business/promotions/:id/rollout-to-children` — rollout confirm wired
- [x] `POST /api/business/users/:id/grant-business-access` — grant access button wired
- [x] `GET /api/super/businesses/chain-tree` — chain tree view
- [x] `POST /api/super/businesses/:id/promote-to-parent` — promote to parent wired
- [x] `POST /api/super/businesses/:child_id/link-parent` — link child wired
- [x] `POST /api/super/businesses/:child_id/unlink-parent` — unlink child wired

---

### trade-categories-page.tsx

- [x] `GET /api/super/trade-categories/tree` + `GET /options` + POST/PATCH/:id/DELETE/:id — full CRUD wired

---

### couriers-page.tsx

- [x] `GET /api/super/couriers` + POST/PATCH/:id/DELETE/:id — super courier CRUD
- [x] `GET /api/business/couriers` — business-linked couriers list
- [x] `POST /api/business/couriers/link` — link courier to business wired
- [x] `DELETE /api/business/couriers/:courier_id` — unlink courier wired

---

### custom-authority-page.tsx

- [x] `GET /api/super/businesses/:id/custom-authority` — feature override table loaded on mount
- [x] `PUT /api/super/businesses/:id/custom-authority` — save feature flags wired

---

### version-log-page.tsx

- [x] `GET /api/super/version-log/menus` — menu tabs loaded
- [x] `GET /api/super/version-log/entries` — entry list loaded
- [x] `POST /api/super/version-log/entries` — create entry modal wired
- [x] `PATCH /api/super/version-log/entries/:id` — edit entry modal wired
- [x] `DELETE /api/super/version-log/entries/:id` — delete confirm wired

---

### system-parameters-page.tsx

- [x] `GET /api/super/system-parameters` — parameters table loaded on mount
- [x] `PATCH /api/super/system-parameters/:id` — inline save wired

---

### super-admin-page.tsx

- [x] `GET /api/super/businesses` + POST/GET/:id/PUT/:id/PATCH/:id/status — full business CRUD + status toggle
- [x] `GET /api/super/business-types` + POST/PUT/:id/features — business types CRUD + feature config
- [x] `GET /api/super/subscriptions` + POST/PUT/:id — subscription CRUD
- [x] `GET /api/super/dashboard/stats` — dashboard KPIs on mount
- [x] `GET /api/super/audit-logs` — audit log tab with pagination

---

### terminals-page.tsx

- [x] `GET /api/super/terminals` — terminal list on mount
- [x] `POST /api/super/terminals` — add terminal modal wired
- [x] `PATCH /api/super/terminals/:id/assign` — assign modal wired
- [x] `GET /api/super/terminals/health` — health badges loaded (polled every 30s)

---

### admin-announcements-page.tsx

- [x] `GET /api/super/announcements` + POST/PATCH/:id/DELETE/:id — full CRUD wired

---

### floor-plan-setup-page.tsx

- [x] `PATCH /api/business/tables/:id` — drag-and-drop position save wired (X/Y coordinates sent on drop)

---

### terminal app/page.tsx — Restaurant section (table sessions)

- [x] `GET /api/terminal/tables/floor-plan` — floor plan loaded on restaurant mode entry
- [x] `POST /api/terminal/tables/:id/open` — open table wired
- [x] `POST /api/terminal/table-sessions/:id/items` — add item to session wired
- [x] `PATCH /api/terminal/table-session-items/:id` — modify item quantity/notes wired
- [x] `DELETE /api/terminal/table-session-items/:id` — remove item wired
- [x] `POST /api/terminal/table-sessions/:id/close` — close + checkout wired
- [x] `POST /api/terminal/table-sessions/:id/split` — split bill modal wired
- [x] `POST /api/terminal/table-sessions/:id/cancel` — cancel session wired

---

---

## Remaining 5 Endpoints + JSX Bugfix — 2026-05-26

### terminal.service.ts

- [x] `POST /api/terminal/sync` — `pushSync()` now POSTs `{ offline_transactions, offline_clock_events }` to `/api/terminal/sync`; clears offline queues on success; returns `synced_count` from server response
- [x] `GET /api/terminal/sync/status` — new async `fetchSyncStatus()` method calls `/api/terminal/sync/status`; merges server `last_sync_at`/`is_syncing`/`last_error` with local pending counts; falls back to local state on network error
- [x] `GET /api/terminal/recommendation-templates/:id/items` — new `getRecommendationItems(templateId)` method; returns `Product[]`; handles both `{ items: [] }` and bare array shapes; returns `[]` on error (non-blocking)

### terminal/app/page.tsx — Transfer Items UI

- [x] `POST /api/terminal/table-session-items/transfer` — Transfer button added next to Remove on each `kds_status === "new"` item; opens dialog that loads floor plan to populate target table selector; calls `terminalService.transferSessionItems([itemId], targetSessionId)`; removes item from local state on success
- [x] `ArrowRightLeft` added to lucide-react import

### product-detail-page.tsx

- [x] `GET /api/business/nutrition-info` — "Load preset" button added to Nutrition Info section header; fetches reference nutrition templates on first click; renders scrollable preset picker; selecting a preset fills all nutrition fields; presetsOpen toggle to dismiss

### Bug fix: reports-page.tsx JSX structure

- [x] Fixed unclosed `<SlidePanel>` / fragment / IIFE in transaction detail panel — `</Button>` had wrong indentation causing TypeScript to see 4 unclosed tags; added missing `</>`, `)`, `})()}` closers with correct indentation

---

## Still Pending (0 endpoints)

*(All endpoints wired — see "Remaining 5 Endpoints" section above.)*

---

## Final Coverage

| Status | Count |
|--------|-------|
| ✅ WIRED | 257 |
| ⚡ NOT NEEDED | 28 |
| **Total** | **285** |

---

## Dev Environment Fixes — 2026-05-26

### Fix 1 — CORS blocking all API calls (root cause)

**File:** `apps/backend/src/main.ts`

**Problem:** `ALLOWED_ORIGINS` defaulted to `http://localhost:5173,http://localhost:5174` (old Vite
ports). No override in `docker-compose.yml`. Frontend apps are on ports 3001/3002. Every fetch from
the browser was blocked by CORS before reaching NestJS.

**Fix:** Updated default fallback to:
```
http://localhost:3001,http://localhost:3002,http://127.0.0.1:3001,http://127.0.0.1:3002
```
Both `localhost` and `127.0.0.1` variants included — Windows browsers with Clash VPN active
sometimes resolve one but not the other; mismatched origins would still be blocked.

**Why no rebuild needed:** `docker-compose.yml` mounts `./apps/backend:/workspace/apps/backend`
as a volume. Editing `src/main.ts` on the host is immediately visible inside the container and
NestJS `--watch` hot-reloads automatically. Confirmed: backend restarted at 12:51:53 UTC+1.

**Production note:** Set `ALLOWED_ORIGINS` explicitly in the production env — the default is
intentionally permissive for local dev only.

---

### Fix 2 — 404 on /login

**File:** `scripts/start-dev.sh`

**Problem:** Ready-message printed `http://localhost:3001/login`. The dashboard is a Next.js SPA
with only `app/page.tsx` — `/login` is not a Next.js route; it returns a 404. Login is rendered
by React state inside the root component when no auth token is present.

**Fix:** Changed printed URL to `http://localhost:3001/`. The app shows the login UI automatically
when unauthenticated.

---

### Fix 3 — Next.js HMR cross-origin warnings

**Files:** `apps/frontend/admin-dashboard-ui-v3/next.config.mjs`,
`apps/frontend/pos-terminal-ui-v3/next.config.mjs`

**Problem:** Next.js dev server logged cross-origin warnings when the HMR WebSocket connection
originated from a host not in `allowedDevOrigins`. Cosmetic in WSL2, but noisy.

**Fix:** Added `allowedDevOrigins: ['localhost', '127.0.0.1']` to both configs.

---

### Remaining known risk — Clash VPN proxy

If API calls still fail after the CORS fix, Clash VPN is likely intercepting `localhost` traffic
from the Windows browser. Symptoms: Network tab shows a **network error** (not a CORS error), and
the request never reaches the backend.

Workaround options (try in order):
1. In Clash: add `localhost` and `127.0.0.1` to the bypass list (Settings → Bypass).
2. Use `http://127.0.0.1:3001` in the browser instead of `http://localhost:3001` — some proxy
   configurations bypass `127.0.0.1` but not `localhost`.
3. Temporarily disable Clash to confirm it is the cause.

The CORS fix covers both `localhost` and `127.0.0.1` origins so either URL will work once the
proxy is bypassed.
