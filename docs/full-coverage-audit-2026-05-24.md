# Full Two-Way Coverage Audit — 2026-05-24

> **Updated 2026-05-26** — Wiring session complete.
> 252/285 endpoints now wired (88%). 5 pending. 28 not needed.
> See `docs/IMPLEMENTATION_LOG_2.md` for the full entry list.
> Individual rows below retain original status markers (historical reference);
> current state is tracked in the log.

Methodology: 4 parallel subagents read all 59 components; grep signal analysis
(dialog count, form count, table count, button count, mock-data density, apiFetch count)
used for remaining components. All 36 backend controllers grep-extracted for routes.

---

## Table 1: Frontend Readiness (59 components)

Rating key:
- **READY** — Complete UI (table + modals + forms + action buttons). Just plug in API calls.
- **PARTIAL** — Some UI built but missing forms, modals, or key buttons.
- **SKELETON** — Read-only or stub; needs real UI before wiring makes sense.

| Component | Rating | Has | Missing UI |
|-----------|--------|-----|------------|
| `admin-announcements-page.tsx` | **READY** | List table, create/edit modals, delete confirm, title/body/priority/date fields | Not wired — 0 apiFetch calls |
| `announcements-page.tsx` | **PARTIAL** | GET+POST wired; list table, create modal, body/title/role/display_until fields | PATCH /:id modal, DELETE confirm, `for-me` view |
| `brands-page.tsx` | **READY** | List table, create/edit modal (name, description, logo_url), delete confirm | 0 apiFetch calls |
| `categories-page.tsx` | **READY** ✅ | Full CRUD wired — list, create/edit modal, delete; name/sort_order/parent/tva_rate fields | — |
| `chain-page.tsx` | **READY** | 950-line component; chain tree view, sync-config modal, rollout dialog, PO fulfill modal, 13 dialogs, 21 buttons | 0 apiFetch — entirely mock |
| `communications-page.tsx` | **PARTIAL** | 810 lines; sends history table (1 GET wired), 14 dialogs; SMS balance section, channel tabs | Channels load, send forms, platform-announcements all mock |
| `coupon-bulk-issue-page.tsx` | **PARTIAL** | List/select UI for coupon types, customer segment picker, progress bar | No form for new issuance, no dialog — 0 apiFetch |
| `coupons-page.tsx` | **READY** | 1064 lines, 26 dialogs; coupon-type list (GET wired), create/edit type modals, issue modal, void confirm, bulk-issue, reports tab | 12 endpoints not yet wired |
| `couriers-page.tsx` | **READY** | List table, link modal (courier selector), unlink confirm, courier name/phone/rate fields | 0 apiFetch — entirely mock |
| `custom-authority-page.tsx` | **PARTIAL** | Feature flag toggle table per business, save button | No edit modal — inline toggle only; 0 apiFetch |
| `customer-detail-page.tsx` | **SKELETON** | Read-only 5-tab view (info, orders, points, labels, attributes); mock data | No forms, no modals — 0 apiFetch |
| `customers-page.tsx` | **READY** | 1512 lines, 46 dialogs; list+search (GET wired), create/edit modals (PATCH/POST wired), grades tab, labels tab, attributes tab, points-history panel, points-adjust modal | DELETE, dashboard-summary, grades/labels CRUD not wired |
| `dining-areas-page.tsx` | **READY** ⚠️ | Full CRUD wired — list, create, edit, delete; name/sort_order fields | BUG: sends PUT instead of PATCH on update |
| `discrepancy-alerts-page.tsx` | **PARTIAL** | Alert table (product/batch/warehouse/qty/reason), Resolve button | Resolve button updates local state only — no modal, 0 apiFetch |
| `employees-page.tsx` | **READY** | 374-line component; list (GET wired), create modal (all fields incl. permissions JSONB), edit modal, clock-history panel, status toggle | POST/PUT/PATCH/clock-history not wired |
| `expiration-alerts-page.tsx` | **PARTIAL** | Alert table with urgency badges, Resolve button | Resolve local state only — no resolve modal, 0 apiFetch |
| `floor-plan-setup-page.tsx` | **PARTIAL** | Visual canvas with table bubbles, position inputs (X/Y), Save Position btn, unplaced sidebar | Drag is cosmetic; Save Position calls nothing; 0 apiFetch |
| `kds-page.tsx` | **READY** ✅ | Fully wired — KDS grid, status transitions, 10s polling, per-item bump | Settings panel (sound/timer) not persisted |
| `locations-page.tsx` | **READY** | GET+POST+PUT wired; list, create/edit modal, terminals sub-list | DELETE, terminal-assign not wired |
| `modifiers-page.tsx` | **READY** | Expandable groups list, create group modal (name/type/min/max), add modifier modal (name/price), link-products modal | 0 apiFetch — `is_required` field missing from form |
| `notification-channels-page.tsx` | **READY** | Channel cards (SMS/Email/WhatsApp), enable toggle, API key field (masked), test button, save button | 0 apiFetch — save/test call nothing |
| `notification-send-page.tsx` | **PARTIAL** | 2-step flow: template selector + segment picker (All/Grade/Label) | `specific` segment type missing; template load is mock; 0 apiFetch |
| `notification-templates-page.tsx` | **READY** | List table, create/edit modal (name/channel/subject/body), delete confirm, placeholder auto-extract | 0 apiFetch; no preview-with-real-data feature |
| `notifications-page.tsx` | **SKELETON** | In-app feed (intentionally mock by design — comment in code says so) | Not meant to call notifications/sends API |
| `platform-announcements-page.tsx` | **PARTIAL** | List+view modal, activate/deactivate toggle | No create/edit form — "New" button does nothing; 0 apiFetch |
| `points-exchange-page.tsx` | **PARTIAL** | 4-tab layout; reward cards (GET wired), add-reward modal, quick-redeem modal | Form fields don't match backend PEX schema (missing discount_value, daily/total_limit); transactions tab mock |
| `product-detail-page.tsx` | **PARTIAL** | 4-tab read-only view (Details/Variants/Modifiers/Stock), embedded in products-page | No edit forms, no add-variant modal, no API fetch |
| `products-page.tsx` | **READY** | GET list+categories wired; category sidebar, product table, create/edit modals, variant panel, modifier tab | POST/PUT/DELETE/upload not wired; create form missing brand/barcode/cost |
| `promotion-create-page.tsx` | **PARTIAL** | Inline form (name/type/value/dates/min-purchase/conditions) | No modal wrapper; no products/categories dynamic load; 0 apiFetch |
| `promotion-detail-page.tsx` | **SKELETON** | Read-only stats tables (usage, redemptions, applicable items) | No edit forms, no API fetch |
| `promotions-page.tsx` | **READY** | 1198 lines; list (GET wired), activate/pause/archive wired, create modal, 8 dialogs, stats panel | POST create, PATCH update, GET detail not wired |
| `purchase-order-create-page.tsx` | **PARTIAL** | Inline form (vendor, items table, expected delivery) | Vendor dropdown is mock; no product search; 0 apiFetch |
| `purchase-order-detail-page.tsx` | **SKELETON** | Read-only tables (PO header, line items, receive history) | No action buttons (send/confirm/receive/cancel); 0 apiFetch |
| `purchase-orders-page.tsx` | **READY** | 686 lines; list (GET wired), 15 dialogs, status badges, action dropdown | GET /:id, create, and all action endpoints not wired |
| `recommendation-items-page.tsx` | **PARTIAL** | 4-dialog item management; product search, add-to-template button | Limited form fields; PUT /:id/items not wired; 0 apiFetch |
| `recommendations-page.tsx` | **READY** | 995 lines; list (GET wired), 17 dialogs, create/edit modals (type/schedule/tier fields) | POST/PATCH/DELETE/PUT items/featured not wired |
| `reports-page.tsx` | **READY** ✅ | 2230 lines; fully wired to universal endpoint; all 26+ report types, date ranges, filters | — |
| `settings-page.tsx` | **READY** | 1054 lines; 20 form sections (business profile, TVA, settlement cutoff, password, notifications) | 0 apiFetch — all forms update local state only |
| `stock-adjustments-page.tsx` | **READY** | GET list wired; 546 lines, 11 dialogs; create modal, approve/reject/post workflow buttons | GET /:id, create, lifecycle actions not wired |
| `stock-batches-page.tsx` | **PARTIAL** | GET list wired; simple table display | No action modals (receive/adjust/dispose/transfer); 0 action buttons |
| `stock-movements-page.tsx` | **READY** ✅ | GET report wired; movement table with type/warehouse/product filters | Read-only by design |
| `stock-page.tsx` | **READY** ✅ | GET stock-position wired; summary cards, stock table, low-stock filter | Read-only by design |
| `stock-templates-page.tsx` | **READY** | Template list, create modal (name, items), generate-PO button | 0 apiFetch — save/generate calls nothing |
| `stock-transfers-page.tsx` | **READY** | GET list wired; 563 lines, 15 dialogs, create modal, post/cancel buttons | GET /:id, POST, post/cancel/delete not wired |
| `super-admin-page.tsx` | **READY** | 2714 lines, 26 dialogs, 21 forms; businesses/terminals/subscriptions/audit-log/business-types tabs | 0 apiFetch — largest mock component in codebase |
| `system-parameters-page.tsx` | **PARTIAL** | Inline key/value table with edit-in-place | No modal, save updates local state only; 0 apiFetch |
| `table-management-page.tsx` | **READY** | GET tables+areas wired; table grid, create/edit/delete modals, area filter, capacity/type fields | POST/PATCH/DELETE not wired |
| `table-types-page.tsx` | **READY** | GET+POST wired; list, create modal, PATCH/DELETE action buttons present | PATCH /:id, DELETE /:id not wired |
| `terminals-page.tsx` | **READY** | 843 lines; terminal list, health badges, assign-modal, add-terminal modal, 12 dialogs | 0 apiFetch — all mock |
| `trade-categories-page.tsx` | **READY** | Tree list with indentation, create/edit modal, delete confirm; name/parent/code fields | 0 apiFetch — all mock |
| `units-of-measure-page.tsx` | **READY** | List table, create/edit modal (name/abbreviation/type), delete confirm | 0 apiFetch — all mock |
| `vendor-detail-page.tsx` | **SKELETON** | Read-only multi-tab (info, check-details history, PO history, payments) | No forms, no modals, 0 apiFetch |
| `vendor-payments-page.tsx` | **READY** | GET+confirm+void wired; 886 lines, 18 dialogs, create modal, vendor/PO filters | GET /:id, POST create, outstanding/summary not wired |
| `vendors-page.tsx` | **READY** ⚠️ | GET wired (wrong URL); 781 lines, 23 dialogs, 18 forms — most complete mock UI | URL bug: `/inventory/vendors` → `/vendors`; POST/PATCH/DELETE not wired |
| `version-log-page.tsx` | **READY** | Menu tabs, entry list, create/edit entry modal (version/title/description fields) | 0 apiFetch — all mock |
| `warehouses-page.tsx` | **READY** ⚠️ | GET+POST wired (wrong URL); 1020 lines, 23 dialogs, linked-location selector | URL bug: `/inventory/warehouses` → `/warehouses`; PATCH/DELETE not wired |
| `terminal/app/page.tsx` | **PARTIAL** | Core POS (activate/clock-in/catalog/transactions) fully wired via terminalService | Restaurant section (floor-plan, table sessions, split-bill) entirely mock |
| `terminal/app/oss/page.tsx` | **READY** ✅ | GET /api/public/oss wired, 10s polling | — |

**Summary: READY=39 · PARTIAL=15 · SKELETON=5**

---

## Table 2: Backend Endpoints — All 285

Status key:
- ✅ **WIRED** — API call exists in frontend and uses correct path/method
- 🏠 **HAS HOME** — Component exists and is READY, just needs the API call added
- 🔧 **SMALL WORK** — Component exists but needs a modal/form/button added first
- 🆕 **NEW PAGE** — No frontend home exists; decision needed (create page or add to existing)
- ⚡ **NOT NEEDED** — Terminal-only, webhook, public, or infrastructure endpoint

---

### AUTH (`/api/auth/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| POST | /auth/login | `super-admin-page.tsx` (login form) | 🏠 HAS HOME |
| POST | /auth/super-admin/login | `super-admin-page.tsx` | 🏠 HAS HOME |
| POST | /auth/pin-login | `terminal/app/page.tsx` | ✅ WIRED |
| POST | /auth/refresh | Auto-refresh in `lib/api.ts` (not yet implemented) | 🆕 NEW PAGE → add to `lib/api.ts` as 401 interceptor |
| GET | /auth/me | `settings-page.tsx` (profile section) | 🏠 HAS HOME |
| PUT | /auth/change-password | `settings-page.tsx` (password section) | 🏠 HAS HOME |
| POST | /auth/logout | Dashboard nav header | 🆕 NEW PAGE → add to sidebar/header |
| GET | /auth/me/accessible-businesses | `chain-page.tsx` (business switcher) | 🏠 HAS HOME |
| POST | /auth/switch-business | `chain-page.tsx` (business switcher) | 🏠 HAS HOME |
| GET | /auth/trade-categories/tree | `trade-categories-page.tsx` | 🏠 HAS HOME |
| GET | /auth/version-log/menus | `version-log-page.tsx` | 🏠 HAS HOME |
| GET | /auth/version-log/entries | `version-log-page.tsx` | 🏠 HAS HOME |
| GET | /auth/regions/tree | `settings-page.tsx` (address section) | 🏠 HAS HOME |
| POST | /auth/regions/validate | `settings-page.tsx` (address validation) | 🏠 HAS HOME |

---

### BUSINESS — Categories, Products, Modifiers (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/categories | `categories-page.tsx`, `products-page.tsx` | ✅ WIRED |
| POST | /business/categories | `categories-page.tsx` | ✅ WIRED |
| PUT | /business/categories/:id | `categories-page.tsx` | ✅ WIRED |
| DELETE | /business/categories/:id | `categories-page.tsx` | ✅ WIRED |
| GET | /business/products | `products-page.tsx` | ✅ WIRED |
| POST | /business/products | `products-page.tsx` | 🏠 HAS HOME |
| PUT | /business/products/:id | `products-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/products/:id/sold-out | `products-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/products/:id | `products-page.tsx` | 🏠 HAS HOME |
| GET | /business/products/:id/variants | `product-detail-page.tsx` | 🔧 SMALL WORK — add API fetch in detail panel |
| POST | /business/products/:id/variants | `product-detail-page.tsx` | 🔧 SMALL WORK — add variant create modal |
| PUT | /business/variants/:id | `product-detail-page.tsx` | 🔧 SMALL WORK — add variant edit modal |
| GET | /business/modifier-groups | `modifiers-page.tsx` | 🏠 HAS HOME |
| POST | /business/modifier-groups | `modifiers-page.tsx` | 🏠 HAS HOME |
| PUT | /business/modifier-groups/:id | `modifiers-page.tsx` | 🏠 HAS HOME |
| POST | /business/modifier-groups/:id/modifiers | `modifiers-page.tsx` | 🏠 HAS HOME |
| POST | /business/products/:id/modifier-groups | `modifiers-page.tsx` | 🏠 HAS HOME |
| POST | /business/upload/product-image | `products-page.tsx` | 🏠 HAS HOME |

---

### BUSINESS — Employees & Locations

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/employees | `employees-page.tsx` | ✅ WIRED |
| POST | /business/employees | `employees-page.tsx` | 🏠 HAS HOME |
| PUT | /business/employees/:id | `employees-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/employees/:id/status | `employees-page.tsx` | 🏠 HAS HOME |
| GET | /business/employees/:id/clock-history | `employees-page.tsx` | 🏠 HAS HOME |
| GET | /business/locations | `locations-page.tsx` | ✅ WIRED |
| POST | /business/locations | `locations-page.tsx` | ✅ WIRED |
| PUT | /business/locations/:id | `locations-page.tsx` | ✅ WIRED |
| GET | /business/locations/:id/terminals | `locations-page.tsx` | 🏠 HAS HOME |

---

### BUSINESS — Legacy Reports & Transactions

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/reports/daily-sales | `reports-page.tsx` (universal) | ✅ WIRED via `:reportId` |
| GET | /business/reports/revenue-by-item | `reports-page.tsx` | ✅ WIRED via `:reportId` |
| GET | /business/reports/payment-methods | `reports-page.tsx` | ✅ WIRED via `:reportId` |
| GET | /business/reports/transactions | `reports-page.tsx` | ✅ WIRED via `:reportId` |
| GET | /business/reports/voids-refunds | `reports-page.tsx` | ✅ WIRED via `:reportId` |
| GET | /business/reports/clock-history | `reports-page.tsx` | ✅ WIRED via `:reportId` |
| GET | /business/reports/tva-declaration | `reports-page.tsx` | ✅ WIRED via `:reportId` |
| GET | /business/transactions/:id | No dedicated page | 🆕 NEW PAGE → add transaction detail modal to `reports-page.tsx` |
| POST | /business/transactions/:id/refund | No dedicated page | 🆕 NEW PAGE → add refund flow in transaction detail modal |
| POST | /business/upload/product-image | `products-page.tsx` | 🏠 HAS HOME |
| GET | /business/jobs/:id | Background job polling (used by bulk-issue) | 🏠 HAS HOME → `coupon-bulk-issue-page.tsx` |

---

### CUSTOMERS (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/customers | `customers-page.tsx` | ✅ WIRED |
| GET | /business/customers/dashboard-summary | `customers-page.tsx` (header KPIs) | 🏠 HAS HOME |
| GET | /business/customers/:id | `customer-detail-page.tsx` | 🔧 SMALL WORK — add useEffect fetch |
| POST | /business/customers | `customers-page.tsx` | ✅ WIRED |
| PATCH | /business/customers/:id | `customers-page.tsx` | ✅ WIRED |
| DELETE | /business/customers/:id | `customers-page.tsx` | 🏠 HAS HOME |
| GET | /business/customer-grades | `customers-page.tsx` (grades tab) | 🏠 HAS HOME |
| POST | /business/customer-grades | `customers-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/customer-grades/:id | `customers-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/customer-grades/:id | `customers-page.tsx` | 🏠 HAS HOME |
| GET | /business/customer-labels | `customers-page.tsx` (labels tab) | 🏠 HAS HOME |
| POST | /business/customer-labels | `customers-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/customer-labels/:id | `customers-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/customer-labels/:id | `customers-page.tsx` | 🏠 HAS HOME |
| PUT | /business/customers/:id/labels | `customers-page.tsx` | 🏠 HAS HOME |
| GET | /business/customer-attributes | `customers-page.tsx` (attrs tab) | 🏠 HAS HOME |
| POST | /business/customer-attributes | `customers-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/customer-attributes/:id | `customers-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/customer-attributes/:id | `customers-page.tsx` | 🏠 HAS HOME |
| GET | /business/customers/:id/attributes | `customer-detail-page.tsx` | 🔧 SMALL WORK |
| PUT | /business/customers/:id/attributes | `customer-detail-page.tsx` | 🔧 SMALL WORK — add edit form |
| GET | /business/customers/:id/points-history | `customers-page.tsx` / `customer-detail-page.tsx` | 🏠 HAS HOME |
| POST | /business/customers/:id/points-adjustment | `customers-page.tsx` | 🏠 HAS HOME |
| POST | /business/customers/import-grades | `customers-page.tsx` | 🆕 NEW PAGE → add import button + file upload to customers-page |

---

### PROMOTIONS (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/promotions | `promotions-page.tsx` | ✅ WIRED |
| GET | /business/promotions/:id | `promotions-page.tsx` (detail panel) | 🏠 HAS HOME |
| POST | /business/promotions | `promotions-page.tsx` / `promotion-create-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/promotions/:id | `promotions-page.tsx` / `promotion-detail-page.tsx` | 🏠 HAS HOME |
| POST | /business/promotions/:id/activate | `promotions-page.tsx` | ✅ WIRED |
| POST | /business/promotions/:id/pause | `promotions-page.tsx` | ✅ WIRED |
| POST | /business/promotions/:id/archive | `promotions-page.tsx` | ✅ WIRED |
| GET | /business/reports/promotions | `reports-page.tsx` | ✅ WIRED via `:reportId` |

---

### COUPONS (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/coupon-types | `coupons-page.tsx` | ✅ WIRED |
| GET | /business/coupon-types/:id | `coupons-page.tsx` (detail panel) | 🏠 HAS HOME |
| POST | /business/coupon-types | `coupons-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/coupon-types/:id | `coupons-page.tsx` | 🏠 HAS HOME |
| POST | /business/coupon-types/:id/clone | `coupons-page.tsx` | 🏠 HAS HOME |
| POST | /business/coupon-types/:id/deactivate | `coupons-page.tsx` | 🏠 HAS HOME |
| POST | /business/coupon-types/:id/issue | `coupons-page.tsx` | 🏠 HAS HOME |
| GET | /business/coupons/lookup | `coupons-page.tsx` | 🏠 HAS HOME |
| POST | /business/coupons/bulk-issue | `coupon-bulk-issue-page.tsx` | 🔧 SMALL WORK — needs form wiring |
| POST | /business/coupons/issue-to-segment | `coupon-bulk-issue-page.tsx` | 🔧 SMALL WORK |
| POST | /business/coupons/:id/void | `coupons-page.tsx` | 🏠 HAS HOME |
| GET | /business/reports/coupons | `reports-page.tsx` | ✅ WIRED via `:reportId` |
| GET | /business/reports/discount-write-offs | `reports-page.tsx` | ✅ WIRED via `:reportId` |

---

### POINTS EXCHANGE (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/points-exchange-rules | `points-exchange-page.tsx` | ✅ WIRED |
| GET | /business/points-exchange-rules/check-point-value | `points-exchange-page.tsx` (settings tab) | 🏠 HAS HOME |
| GET | /business/points-exchange-rules/redeemable-for-customer | Terminal-facing | ⚡ NOT NEEDED (admin) |
| GET | /business/points-exchange-rules/:id | `points-exchange-page.tsx` | 🏠 HAS HOME |
| POST | /business/points-exchange-rules | `points-exchange-page.tsx` | 🔧 SMALL WORK — fix form fields to match PEX schema |
| PATCH | /business/points-exchange-rules/:id | `points-exchange-page.tsx` | 🔧 SMALL WORK |
| DELETE | /business/points-exchange-rules/:id | `points-exchange-page.tsx` | 🏠 HAS HOME |
| POST | /business/points-exchange-rules/:id/redeem | Terminal / customer self-service | ⚡ NOT NEEDED (admin) |
| GET | /business/reports/points-exchange | `reports-page.tsx` | ✅ WIRED via `:reportId` |

---

### INVENTORY — Foundations (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/units-of-measure | `units-of-measure-page.tsx` | 🏠 HAS HOME |
| POST | /business/units-of-measure | `units-of-measure-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/units-of-measure/:id | `units-of-measure-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/units-of-measure/:id | `units-of-measure-page.tsx` | 🏠 HAS HOME |
| GET | /business/warehouses | `warehouses-page.tsx` | ⚠️ WIRED (wrong URL) |
| GET | /business/warehouses/:id | `warehouses-page.tsx` | 🏠 HAS HOME |
| POST | /business/warehouses | `warehouses-page.tsx` | ⚠️ WIRED (wrong URL) |
| PATCH | /business/warehouses/:id | `warehouses-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/warehouses/:id | `warehouses-page.tsx` | 🏠 HAS HOME |
| GET | /business/vendors | `vendors-page.tsx` | ⚠️ WIRED (wrong URL) |
| GET | /business/vendors/:id | `vendor-detail-page.tsx` | 🔧 SMALL WORK — add useEffect fetch |
| POST | /business/vendors | `vendors-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/vendors/:id | `vendors-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/vendors/:id | `vendors-page.tsx` | 🏠 HAS HOME |
| GET | /business/vendors/:id/check-details | `vendor-detail-page.tsx` | 🔧 SMALL WORK |
| POST | /business/vendors/:id/check-details | `vendor-detail-page.tsx` | 🔧 SMALL WORK — add form |
| GET | /business/brands | `brands-page.tsx` | 🏠 HAS HOME |
| POST | /business/brands | `brands-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/brands/:id | `brands-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/brands/:id | `brands-page.tsx` | 🏠 HAS HOME |
| GET | /business/products/:id/nutrition | `product-detail-page.tsx` (Stock/Nutrition tab) | 🔧 SMALL WORK — add nutrition tab fetch |
| PUT | /business/products/:id/nutrition | `product-detail-page.tsx` | 🔧 SMALL WORK — add nutrition edit form |
| GET | /business/nutrition-info | `product-detail-page.tsx` | 🔧 SMALL WORK |

---

### INVENTORY — Alerts (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/expiration-alerts | `expiration-alerts-page.tsx` | 🔧 SMALL WORK — add useEffect fetch |
| POST | /business/expiration-alerts/:id/resolve | `expiration-alerts-page.tsx` | 🔧 SMALL WORK — wire resolve button |
| GET | /business/stock-discrepancy-alerts | `discrepancy-alerts-page.tsx` | 🔧 SMALL WORK — add useEffect fetch |
| POST | /business/stock-discrepancy-alerts/:id/resolve | `discrepancy-alerts-page.tsx` | 🔧 SMALL WORK — wire resolve button |

---

### INVENTORY — Stock Engine (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/stock-batches | `stock-batches-page.tsx` | ✅ WIRED |
| POST | /business/stock-batches | `stock-batches-page.tsx` | 🔧 SMALL WORK — add receive batch modal |
| POST | /business/stock-batches/:id/adjust | `stock-batches-page.tsx` | 🔧 SMALL WORK — add adjust modal |
| POST | /business/stock-batches/:id/dispose | `stock-batches-page.tsx` | 🔧 SMALL WORK — add dispose modal |
| POST | /business/stock-batches/:id/transfer | `stock-batches-page.tsx` | 🔧 SMALL WORK — add transfer modal |
| GET | /business/stock-templates | `stock-templates-page.tsx` | 🏠 HAS HOME |
| GET | /business/stock-templates/:id | `stock-templates-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-templates | `stock-templates-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/stock-templates/:id | `stock-templates-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/stock-templates/:id | `stock-templates-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-templates/:id/create-purchase-order | `stock-templates-page.tsx` | 🏠 HAS HOME |

---

### PURCHASE ORDERS (`/api/business/purchase-orders/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/purchase-orders | `purchase-orders-page.tsx` | ✅ WIRED |
| GET | /business/purchase-orders/:id | `purchase-order-detail-page.tsx` | 🔧 SMALL WORK — add useEffect fetch |
| POST | /business/purchase-orders | `purchase-order-create-page.tsx` | 🔧 SMALL WORK — wire form submit + load vendors |
| PATCH | /business/purchase-orders/:id | `purchase-order-detail-page.tsx` | 🔧 SMALL WORK |
| POST | /business/purchase-orders/:id/send | `purchase-order-detail-page.tsx` | 🔧 SMALL WORK — wire action buttons |
| POST | /business/purchase-orders/:id/confirm | `purchase-order-detail-page.tsx` | 🔧 SMALL WORK |
| POST | /business/purchase-orders/:id/receive | `purchase-order-detail-page.tsx` | 🔧 SMALL WORK |
| POST | /business/purchase-orders/:id/cancel | `purchase-order-detail-page.tsx` | 🔧 SMALL WORK |

---

### STOCK ADJUSTMENTS (`/api/business/stock-adjustments/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/stock-adjustments | `stock-adjustments-page.tsx` | ✅ WIRED |
| GET | /business/stock-adjustments/:id | `stock-adjustments-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-adjustments | `stock-adjustments-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-adjustments/:id/submit | `stock-adjustments-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-adjustments/:id/approve | `stock-adjustments-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-adjustments/:id/post | `stock-adjustments-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-adjustments/:id/reject | `stock-adjustments-page.tsx` | 🏠 HAS HOME |

---

### STOCK TRANSFERS (`/api/business/stock-transfers/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/stock-transfers | `stock-transfers-page.tsx` | ✅ WIRED |
| GET | /business/stock-transfers/:id | `stock-transfers-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-transfers | `stock-transfers-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-transfers/:id/post | `stock-transfers-page.tsx` | 🏠 HAS HOME |
| POST | /business/stock-transfers/:id/cancel | `stock-transfers-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/stock-transfers/:id | `stock-transfers-page.tsx` | 🏠 HAS HOME |

---

### VENDOR PAYMENTS (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/vendor-payments | `vendor-payments-page.tsx` | ✅ WIRED |
| GET | /business/vendor-payments/:id | `vendor-payments-page.tsx` | 🏠 HAS HOME |
| POST | /business/vendor-payments | `vendor-payments-page.tsx` | 🏠 HAS HOME |
| POST | /business/vendor-payments/:id/confirm | `vendor-payments-page.tsx` | ✅ WIRED |
| POST | /business/vendor-payments/:id/void | `vendor-payments-page.tsx` | ✅ WIRED |
| GET | /business/vendors/:id/outstanding | `vendor-payments-page.tsx` / `vendor-detail-page.tsx` | 🔧 SMALL WORK |
| GET | /business/vendors/:id/payment-summary | `vendor-detail-page.tsx` | 🔧 SMALL WORK |

---

### UNIVERSAL REPORTS (`/api/business/reports/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/reports/:reportId | `reports-page.tsx` | ✅ WIRED (covers all 27 report IDs) |

---

### COMMUNICATIONS (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/platform-announcements | `platform-announcements-page.tsx` | 🔧 SMALL WORK — add useEffect fetch |
| POST | /business/platform-announcements/:id/dismiss | `platform-announcements-page.tsx` | 🏠 HAS HOME |
| GET | /business/announcements | `announcements-page.tsx` | ✅ WIRED |
| POST | /business/announcements | `announcements-page.tsx` | ✅ WIRED |
| GET | /business/announcements/for-me | `announcements-page.tsx` (for-me tab) | 🏠 HAS HOME |
| PATCH | /business/announcements/:id | `announcements-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/announcements/:id | `announcements-page.tsx` | 🏠 HAS HOME |
| GET | /business/notifications/channels | `notification-channels-page.tsx` | 🏠 HAS HOME |
| PUT | /business/notifications/channels | `notification-channels-page.tsx` | 🏠 HAS HOME |
| POST | /business/notifications/channels/test | `notification-channels-page.tsx` | 🏠 HAS HOME |
| POST | /business/notifications/sms/refresh-balance | `communications-page.tsx` | 🔧 SMALL WORK |
| GET | /business/notifications/sms/balance | `communications-page.tsx` | 🔧 SMALL WORK — add balance display |
| GET | /business/notifications/templates | `notification-templates-page.tsx` | 🏠 HAS HOME |
| POST | /business/notifications/templates | `notification-templates-page.tsx` | 🏠 HAS HOME |
| POST | /business/notifications/templates/:id/preview | `notification-templates-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/notifications/templates/:id | `notification-templates-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/notifications/templates/:id | `notification-templates-page.tsx` | 🏠 HAS HOME |
| POST | /business/notifications/send | `notification-send-page.tsx` | 🔧 SMALL WORK — wire send button |
| POST | /business/notifications/send-to-segment | `notification-send-page.tsx` | 🔧 SMALL WORK |
| GET | /business/notifications/sends | `communications-page.tsx` | ✅ WIRED |
| POST | /api/webhooks/notifications/:provider | No admin UI (provider callback) | ⚡ NOT NEEDED |
| POST | /api/public/notifications/opt-out | No admin UI (customer-facing) | ⚡ NOT NEEDED |

---

### RECOMMENDATIONS (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/recommendation-templates | `recommendations-page.tsx` | ✅ WIRED |
| GET | /business/recommendation-templates/featured | `recommendations-page.tsx` (featured tab) | 🏠 HAS HOME |
| POST | /business/recommendation-templates | `recommendations-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/recommendation-templates/:id | `recommendations-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/recommendation-templates/:id | `recommendations-page.tsx` | 🏠 HAS HOME |
| PUT | /business/recommendation-templates/:id/items | `recommendation-items-page.tsx` | 🔧 SMALL WORK — wire save button |

---

### RESTAURANT — Setup (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/dining-areas | `dining-areas-page.tsx`, `table-management-page.tsx` | ✅ WIRED |
| POST | /business/dining-areas | `dining-areas-page.tsx` | ✅ WIRED |
| PATCH | /business/dining-areas/:id | `dining-areas-page.tsx` | ⚠️ WIRED (sends PUT — bug) |
| DELETE | /business/dining-areas/:id | `dining-areas-page.tsx` | ✅ WIRED |
| GET | /business/table-types | `table-types-page.tsx` | ✅ WIRED |
| POST | /business/table-types | `table-types-page.tsx` | ✅ WIRED |
| PATCH | /business/table-types/:id | `table-types-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/table-types/:id | `table-types-page.tsx` | 🏠 HAS HOME |
| GET | /business/tables | `table-management-page.tsx` | ✅ WIRED |
| POST | /business/tables | `table-management-page.tsx` | 🏠 HAS HOME |
| PATCH | /business/tables/:id | `table-management-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/tables/:id | `table-management-page.tsx` | 🏠 HAS HOME |

---

### CHAIN OPERATIONS (`/api/business/` and `/api/super/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| POST | /business/users/:id/grant-business-access | `chain-page.tsx` | 🏠 HAS HOME |
| GET | /business/chain/sync-config | `chain-page.tsx` | 🏠 HAS HOME |
| PUT | /business/chain/sync-config | `chain-page.tsx` | 🏠 HAS HOME |
| POST | /business/chain/sync | `chain-page.tsx` | 🏠 HAS HOME |
| GET | /business/chain/sync-jobs/:id | `chain-page.tsx` | 🏠 HAS HOME |
| GET | /business/chain/unmapped-products | `chain-page.tsx` | 🏠 HAS HOME |
| POST | /business/chain/pull-product | `chain-page.tsx` | 🏠 HAS HOME |
| POST | /business/promotions/:id/validate-sub-stores | `chain-page.tsx` | 🏠 HAS HOME |
| POST | /business/promotions/:id/rollout-to-children | `chain-page.tsx` | 🏠 HAS HOME |
| GET | /business/chain/dashboard | `chain-page.tsx` | 🏠 HAS HOME |
| GET | /business/chain/transactions | `chain-page.tsx` | 🏠 HAS HOME |
| GET | /business/chain/parent-vendor-info | `chain-page.tsx` | 🏠 HAS HOME |
| GET | /business/chain/incoming-po-requests | `chain-page.tsx` | 🏠 HAS HOME |
| POST | /business/chain/incoming-po-requests/:id/fulfill | `chain-page.tsx` | 🏠 HAS HOME |
| GET | /super/businesses/chain-tree | `super-admin-page.tsx` | 🏠 HAS HOME |
| POST | /super/businesses/:id/promote-to-parent | `super-admin-page.tsx` | 🏠 HAS HOME |
| POST | /super/businesses/:child_id/link-parent | `super-admin-page.tsx` | 🏠 HAS HOME |
| POST | /super/businesses/:child_id/unlink-parent | `super-admin-page.tsx` | 🏠 HAS HOME |

---

### PLATFORM ADMIN — Super (`/api/super/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /super/trade-categories/tree | `trade-categories-page.tsx` | 🏠 HAS HOME |
| GET | /super/trade-categories/options | `trade-categories-page.tsx` | 🏠 HAS HOME |
| POST | /super/trade-categories | `trade-categories-page.tsx` | 🏠 HAS HOME |
| PATCH | /super/trade-categories/:id | `trade-categories-page.tsx` | 🏠 HAS HOME |
| DELETE | /super/trade-categories/:id | `trade-categories-page.tsx` | 🏠 HAS HOME |
| GET | /super/couriers | `couriers-page.tsx` (super view) | 🏠 HAS HOME |
| POST | /super/couriers | `couriers-page.tsx` | 🏠 HAS HOME |
| PATCH | /super/couriers/:id | `couriers-page.tsx` | 🏠 HAS HOME |
| DELETE | /super/couriers/:id | `couriers-page.tsx` | 🏠 HAS HOME |
| GET | /super/businesses/:id/custom-authority | `custom-authority-page.tsx` | 🔧 SMALL WORK — add fetch |
| PUT | /super/businesses/:id/custom-authority | `custom-authority-page.tsx` | 🔧 SMALL WORK — wire save |
| GET | /super/version-log/menus | `version-log-page.tsx` | 🏠 HAS HOME |
| POST | /super/version-log/entries | `version-log-page.tsx` | 🏠 HAS HOME |
| PATCH | /super/version-log/entries/:id | `version-log-page.tsx` | 🏠 HAS HOME |
| DELETE | /super/version-log/entries/:id | `version-log-page.tsx` | 🏠 HAS HOME |
| GET | /super/system-parameters | `system-parameters-page.tsx` | 🔧 SMALL WORK — add fetch |
| PATCH | /super/system-parameters/:id | `system-parameters-page.tsx` | 🔧 SMALL WORK — wire save |

---

### PLATFORM ADMIN — Business (`/api/business/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /business/couriers | `couriers-page.tsx` (business view) | 🏠 HAS HOME |
| POST | /business/couriers/link | `couriers-page.tsx` | 🏠 HAS HOME |
| DELETE | /business/couriers/:courier_id | `couriers-page.tsx` | 🏠 HAS HOME |
| GET | /business/settings/settlement-cutoff | `settings-page.tsx` | 🏠 HAS HOME |
| PUT | /business/settings/settlement-cutoff | `settings-page.tsx` | 🏠 HAS HOME |

---

### SUPER ADMIN (`/api/super/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /super/businesses | `super-admin-page.tsx` | 🏠 HAS HOME |
| POST | /super/businesses | `super-admin-page.tsx` | 🏠 HAS HOME |
| GET | /super/businesses/:id | `super-admin-page.tsx` | 🏠 HAS HOME |
| PUT | /super/businesses/:id | `super-admin-page.tsx` | 🏠 HAS HOME |
| PATCH | /super/businesses/:id/status | `super-admin-page.tsx` | 🏠 HAS HOME |
| GET | /super/business-types | `super-admin-page.tsx` | 🏠 HAS HOME |
| POST | /super/business-types | `super-admin-page.tsx` | 🏠 HAS HOME |
| PUT | /super/business-types/:id/features | `super-admin-page.tsx` | 🏠 HAS HOME |
| GET | /super/terminals | `terminals-page.tsx` | 🏠 HAS HOME |
| POST | /super/terminals | `terminals-page.tsx` | 🏠 HAS HOME |
| PATCH | /super/terminals/:id/assign | `terminals-page.tsx` | 🏠 HAS HOME |
| GET | /super/terminals/health | `terminals-page.tsx` | 🏠 HAS HOME |
| GET | /super/subscriptions | `super-admin-page.tsx` | 🏠 HAS HOME |
| POST | /super/subscriptions | `super-admin-page.tsx` | 🏠 HAS HOME |
| PUT | /super/subscriptions/:id | `super-admin-page.tsx` | 🏠 HAS HOME |
| GET | /super/dashboard/stats | `super-admin-page.tsx` | 🏠 HAS HOME |
| GET | /super/audit-logs | `super-admin-page.tsx` | 🏠 HAS HOME |
| GET | /super/announcements | `admin-announcements-page.tsx` | 🏠 HAS HOME |
| POST | /super/announcements | `admin-announcements-page.tsx` | 🏠 HAS HOME |
| PATCH | /super/announcements/:id | `admin-announcements-page.tsx` | 🏠 HAS HOME |
| DELETE | /super/announcements/:id | `admin-announcements-page.tsx` | 🏠 HAS HOME |

---

### TERMINAL (`/api/terminal/`) — Core POS

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| POST | /terminal/activate | `terminal/app/page.tsx` | ✅ WIRED |
| GET | /terminal/config | `terminal/app/page.tsx` | ⚡ NOT NEEDED (post-activate) |
| POST | /terminal/heartbeat | `terminal/app/page.tsx` | ✅ WIRED |
| POST | /terminal/clock-in | `terminal/app/page.tsx` | ✅ WIRED |
| POST | /terminal/clock-out | `terminal/app/page.tsx` | ✅ WIRED |
| GET | /terminal/active-employees | `terminal/app/page.tsx` | ⚡ NOT NEEDED (local state) |
| GET | /terminal/catalog | `terminal/app/page.tsx` | ✅ WIRED |
| GET | /terminal/customers/lookup | `terminal/app/page.tsx` | ✅ WIRED |
| POST | /terminal/customers/quick-add | `terminal/app/page.tsx` | ✅ WIRED |
| POST | /terminal/promotions/evaluate | `terminal/app/page.tsx` | ✅ WIRED |
| GET | /terminal/coupons/validate | `terminal/app/page.tsx` | ✅ WIRED |
| POST | /terminal/transactions | `terminal/app/page.tsx` | ✅ WIRED |
| POST | /terminal/transactions/:id/void | `terminal/app/page.tsx` | ✅ WIRED |
| GET | /terminal/transactions/today | `terminal/app/page.tsx` | ✅ WIRED |
| POST | /terminal/sync | `terminal/app/page.tsx` | 🔧 SMALL WORK — stub in service, needs real implementation |
| GET | /terminal/sync/status | `terminal/app/page.tsx` | 🔧 SMALL WORK — stub in service |

---

### TERMINAL — Table Sessions (`/api/terminal/`)

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /terminal/tables/floor-plan | `terminal/app/page.tsx` (restaurant section) | 🔧 SMALL WORK — replace mock data |
| POST | /terminal/tables/:id/open | `terminal/app/page.tsx` | 🔧 SMALL WORK |
| POST | /terminal/table-sessions/:id/items | `terminal/app/page.tsx` | 🔧 SMALL WORK |
| PATCH | /terminal/table-session-items/:id | `terminal/app/page.tsx` | 🔧 SMALL WORK |
| POST | /terminal/table-session-items/transfer | `terminal/app/page.tsx` | 🔧 SMALL WORK |
| DELETE | /terminal/table-session-items/:id | `terminal/app/page.tsx` | 🔧 SMALL WORK |
| POST | /terminal/table-sessions/:id/close | `terminal/app/page.tsx` | 🔧 SMALL WORK |
| POST | /terminal/table-sessions/:id/split | `terminal/app/page.tsx` | 🔧 SMALL WORK |
| POST | /terminal/table-sessions/:id/cancel | `terminal/app/page.tsx` | 🔧 SMALL WORK |

---

### TERMINAL — KDS & Recommendations

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /terminal/kds/items | `kds-page.tsx` | ✅ WIRED |
| POST | /terminal/kds/items/:id/status | `kds-page.tsx` | ✅ WIRED |
| GET | /terminal/recommendation-templates/:id/items | `terminal/app/page.tsx` (cross-sell section) | 🆕 NEW PAGE → add to terminal checkout flow |
| GET | /kds/orders | Legacy — superseded by `/terminal/kds/items` | ⚡ NOT NEEDED |
| PATCH | /kds/orders/:id/status | Legacy — superseded | ⚡ NOT NEEDED |

---

### PUBLIC & INFRASTRUCTURE

| Method | Path | Component | Status |
|--------|------|-----------|--------|
| GET | /api/public/oss | `terminal/oss/page.tsx` | ✅ WIRED |
| POST | /api/webhooks/notifications/:provider | No UI — provider webhook | ⚡ NOT NEEDED |
| POST | /api/public/notifications/opt-out | No UI — customer opt-out link | ⚡ NOT NEEDED |
| GET | /api/health | Infrastructure ping | ⚡ NOT NEEDED |

---

## Table 2 Summary

| Status | Count | % |
|--------|-------|---|
| ✅ WIRED (correct) | 42 | 15% |
| ⚠️ WIRED (bugs) | 3 | 1% |
| 🏠 HAS HOME | 160 | 56% |
| 🔧 SMALL WORK | 48 | 17% |
| 🆕 NEW PAGE | 5 | 2% |
| ⚡ NOT NEEDED | 28 | 10% |
| **Total** | **285** | |

**Post-wiring (2026-05-26):**

| Status | Count | % |
|--------|-------|---|
| ✅ WIRED | 252 | 88% |
| 🔧 STILL PENDING | 5 | 2% |
| ⚡ NOT NEEDED | 28 | 10% |
| **Total** | **285** | |

Pending items: `POST /terminal/sync`, `GET /terminal/sync/status`, `POST /terminal/table-session-items/transfer`, `GET /terminal/recommendation-templates/:id/items`, `GET /business/nutrition-info`

---

## Table 3: Action Plan

---

### 1. QUICK FIXES (fix today — 3 bugs, ~30 minutes total)

| File | Line | Fix |
|------|------|-----|
| `warehouses-page.tsx` | GET/POST calls | Change `/api/business/inventory/warehouses` → `/api/business/warehouses` |
| `vendors-page.tsx` | GET call | Change `/api/business/inventory/vendors` → `/api/business/vendors` |
| `dining-areas-page.tsx` | edit apiFetch | Change `method: "PUT"` → `method: "PATCH"` on the update call |

---

### 2. WIRE NOW (components are READY — just add apiFetch calls)

These have complete UI. The only work is writing the apiFetch call and wiring the handler.
Estimated: 1–4 hours per component.

**HIGH priority (core daily operations):**

| Component | Endpoints to wire | Est. |
|-----------|-------------------|------|
| `employees-page.tsx` | POST create, PUT edit, PATCH status, GET clock-history/:id | 2h |
| `products-page.tsx` | POST create, PUT edit, DELETE, PATCH sold-out, POST upload-image | 3h |
| `promotions-page.tsx` | POST create, PATCH update, GET /:id | 2h |
| `customers-page.tsx` | DELETE, GET dashboard-summary, grades CRUD (4), labels CRUD (4), PUT labels, points history, points adjust | 4h |
| `coupons-page.tsx` | GET /:id, POST type, PATCH type, clone, deactivate, issue, lookup, void | 3h |
| `purchase-orders-page.tsx` | GET /:id (detail panel trigger), POST create navigation | 2h |
| `stock-adjustments-page.tsx` | GET /:id, POST, submit, approve, post, reject | 2h |
| `stock-transfers-page.tsx` | GET /:id, POST, post, cancel, DELETE | 2h |
| `vendor-payments-page.tsx` | GET /:id, POST create, GET outstanding, GET summary | 2h |

**MEDIUM priority:**

| Component | Endpoints to wire | Est. |
|-----------|-------------------|------|
| `recommendations-page.tsx` | POST, PATCH /:id, DELETE /:id, GET featured | 2h |
| `table-management-page.tsx` | POST, PATCH /:id, DELETE /:id | 1h |
| `table-types-page.tsx` | PATCH /:id, DELETE /:id | 1h |
| `announcements-page.tsx` | PATCH /:id, DELETE /:id, GET for-me | 1h |
| `notification-channels-page.tsx` | GET channels, PUT channels, POST test | 1h |
| `notification-templates-page.tsx` | GET list, POST, PATCH, DELETE, POST preview | 2h |
| `points-exchange-page.tsx` | POST (after fixing schema), PATCH, DELETE | 2h |
| `stock-templates-page.tsx` | GET, POST, PATCH, DELETE, POST create-PO | 2h |
| `locations-page.tsx` | GET terminals/:id, DELETE, assign terminal | 1h |

**LOW priority (platform admin — less frequent use):**

| Component | Endpoints to wire | Est. |
|-----------|-------------------|------|
| `super-admin-page.tsx` | All 21 super admin endpoints | 6h |
| `admin-announcements-page.tsx` | GET/POST/PATCH/DELETE super announcements | 1h |
| `terminals-page.tsx` | GET/POST/PATCH super terminals | 2h |
| `chain-page.tsx` | All 14 chain endpoints | 4h |
| `brands-page.tsx` | GET/POST/PATCH/DELETE | 1h |
| `units-of-measure-page.tsx` | GET/POST/PATCH/DELETE | 1h |
| `couriers-page.tsx` | GET/POST/DELETE business couriers | 1h |
| `trade-categories-page.tsx` | GET tree, POST, PATCH, DELETE | 1h |
| `version-log-page.tsx` | GET menus, GET/POST/PATCH/DELETE entries | 1h |
| `settings-page.tsx` | GET/PUT settlement-cutoff, GET me, PUT change-password, GET regions/tree | 2h |
| `warehouses-page.tsx` | (after URL fix) PATCH /:id, DELETE /:id, GET /:id | 1h |
| `vendors-page.tsx` | (after URL fix) POST, PATCH, DELETE | 2h |

---

### 3. SMALL FRONTEND WORK (UI additions needed first, then wire)

These need a modal, form, or button added before the API call makes sense.
Estimated: 2–6 hours per component.

| Component | What to add | Endpoints unlocked |
|-----------|-------------|-------------------|
| `stock-batches-page.tsx` | Add receive modal + adjust/dispose/transfer action dialogs | POST, POST adjust, POST dispose, POST transfer |
| `purchase-order-detail-page.tsx` | Add Send/Confirm/Receive/Cancel action buttons + useEffect load | GET /:id, PATCH, send/confirm/receive/cancel |
| `purchase-order-create-page.tsx` | Wire vendor dropdown (GET vendors), product search, form submit | POST /purchase-orders |
| `promotion-create-page.tsx` | Add product/category dynamic loads to conditions section | POST /promotions (create with conditions) |
| `promotion-detail-page.tsx` | Add edit form panel + action buttons | PATCH, activate/pause/archive |
| `product-detail-page.tsx` | Add variant create/edit modals, nutrition edit form | POST/PUT variants, GET/PUT nutrition |
| `customer-detail-page.tsx` | Add useEffect fetch + attribute edit form | GET /:id, GET/PUT attributes |
| `vendor-detail-page.tsx` | Add useEffect fetch + check-detail form | GET /:id, GET/POST check-details |
| `platform-announcements-page.tsx` | Add create/edit form (title/body/dates/types) | GET list, POST/PUT dismiss |
| `discrepancy-alerts-page.tsx` | Add useEffect fetch + resolve action modal | GET alerts, POST resolve |
| `expiration-alerts-page.tsx` | Add useEffect fetch + resolve button wire | GET alerts, POST resolve |
| `custom-authority-page.tsx` | Add GET fetch + wire save button | GET/PUT custom-authority |
| `system-parameters-page.tsx` | Add GET fetch + wire inline save | GET/PATCH system-parameters |
| `notification-send-page.tsx` | Add `specific` segment type, wire GET templates, wire submit | POST send, POST send-to-segment |
| `coupon-bulk-issue-page.tsx` | Add form for segment + issue params, wire submit | POST bulk-issue, POST issue-to-segment |
| `recommendation-items-page.tsx` | Wire product search to GET products, wire save | PUT /:id/items |
| `communications-page.tsx` | Add SMS balance display, wire channel section | GET/PUT channels, GET balance |
| `floor-plan-setup-page.tsx` | Wire drag save to PATCH /business/tables/:id (position) | PATCH tables/:id |
| `terminal/app/page.tsx` (restaurant) | Replace ALL_MOCK in restaurant section with real API | 9 table session endpoints |

---

### 4. NEW PAGES NEEDED (no frontend home exists)

Only 5 endpoints need entirely new UI components. Proposal for each:

| Endpoint | Proposed solution | Effort |
|----------|-------------------|--------|
| `GET /business/transactions/:id` | Add transaction detail **slide panel** inside `reports-page.tsx` — clicking a row in the invoice-register report opens the detail panel | 3h |
| `POST /business/transactions/:id/refund` | Add **Refund** button inside the transaction detail panel above | 1h |
| `POST /business/customers/import-grades` | Add **Import CSV** button with file picker to `customers-page.tsx` grades tab | 2h |
| `POST /auth/refresh` | Add as **axios-style interceptor** in `lib/api.ts` — transparently retry on 401 with refresh token | 2h |
| `POST /auth/logout` | Add **Sign Out** button to sidebar/header component in `app/layout.tsx` | 1h |
| `GET /terminal/recommendation-templates/:id/items` | Add **cross-sell suggestions panel** at checkout step in `terminal/app/page.tsx` | 3h |

---

### 5. NOT NEEDED (no admin UI required)

These are terminal-only, public-facing, webhook, or infrastructure endpoints that correctly have no admin dashboard component:

- `GET /terminal/config` — loaded post-activate into local state
- `GET /terminal/active-employees` — managed in local Map
- `POST /terminal/sync` / `GET /terminal/sync/status` — background sync (needs service implementation, not UI)
- `GET /terminal/coupons/validate` — terminal POS only
- `POST /terminal/promotions/evaluate` — terminal POS only
- `GET /terminal/recommendation-templates/:id/items` — see NEW PAGES above for terminal-side
- `GET /terminal/tables/floor-plan` + all 8 table session endpoints — see SMALL WORK above (terminal page)
- `GET /kds/orders` + `PATCH /kds/orders/:id/status` — legacy, superseded by `/terminal/kds`
- `GET /api/public/oss` — OSS display screen, already wired
- `POST /api/webhooks/notifications/:provider` — server-to-server callback
- `POST /api/public/notifications/opt-out` — customer opt-out link (no admin UI needed)
- `GET /api/health` — infrastructure
- `GET /business/points-exchange-rules/redeemable-for-customer` — terminal/customer-facing
- `POST /business/points-exchange-rules/:id/redeem` — terminal-facing

---

## Effort Summary

| Category | Items | Total Est. |
|----------|-------|------------|
| Quick fixes (bugs) | 3 | 0.5 day |
| Wire now — HIGH priority | 9 components | ~4 days |
| Wire now — MEDIUM priority | 11 components | ~3 days |
| Wire now — LOW priority | 12 components | ~4 days |
| Small frontend work | 19 components | ~8 days |
| New pages (5 micro-features) | 5 endpoints | ~1.5 days |
| **Total** | | **~21 days** |
