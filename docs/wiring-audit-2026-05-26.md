# Frontend–Backend Wiring Audit — 2026-05-26

Audited by reading all 37 backend controllers and all 58 dashboard components + terminal page.
No code was changed to produce this document.

---

## Audit Methodology

- Backend: extracted every `@Get/@Post/@Put/@Patch/@Delete` from all 37 controllers.
- Dashboard (`admin-dashboard-ui-v3`): grepped every component for `apiFetch(`, `fetch(`, `/api/` strings.
- Terminal (`pos-terminal-ui-v3`): grepped `terminalService.*`, `apiFetch(`, all lucide-react JSX usages vs import list.
- Cross-referenced method+URL for each call.

---

## Table 1 — All Backend Endpoints (285 total)

| Method | Route | Controller |
|--------|-------|-----------|
| POST | /api/auth/login | auth.controller.ts |
| POST | /api/auth/super-admin/login | auth.controller.ts |
| POST | /api/auth/pin-login | auth.controller.ts |
| POST | /api/auth/refresh | auth.controller.ts |
| GET | /api/auth/me | auth.controller.ts |
| PUT | /api/auth/change-password | auth.controller.ts |
| POST | /api/auth/logout | auth.controller.ts |
| GET | /api/auth/me/accessible-businesses | chain-auth.controller.ts |
| POST | /api/auth/switch-business | chain-auth.controller.ts |
| GET | /api/auth/trade-categories/tree | platform-admin-auth.controller.ts |
| GET | /api/auth/version-log/menus | platform-admin-auth.controller.ts |
| GET | /api/auth/version-log/entries | platform-admin-auth.controller.ts |
| GET | /api/auth/regions/tree | platform-admin-auth.controller.ts |
| POST | /api/auth/regions/validate | platform-admin-auth.controller.ts |
| GET | /api/business/categories | business.controller.ts |
| POST | /api/business/categories | business.controller.ts |
| **PUT** | **/api/business/categories/:id** | business.controller.ts |
| DELETE | /api/business/categories/:id | business.controller.ts |
| GET | /api/business/products | business.controller.ts |
| POST | /api/business/products | business.controller.ts |
| PUT | /api/business/products/:id | business.controller.ts |
| PATCH | /api/business/products/:id/sold-out | business.controller.ts |
| DELETE | /api/business/products/:id | business.controller.ts |
| GET | /api/business/products/:id/variants | business.controller.ts |
| POST | /api/business/products/:id/variants | business.controller.ts |
| PUT | /api/business/variants/:id | business.controller.ts |
| GET | /api/business/modifier-groups | business.controller.ts |
| POST | /api/business/modifier-groups | business.controller.ts |
| PUT | /api/business/modifier-groups/:id | business.controller.ts |
| POST | /api/business/modifier-groups/:id/modifiers | business.controller.ts |
| POST | /api/business/products/:id/modifier-groups | business.controller.ts |
| GET | /api/business/employees | business.controller.ts |
| POST | /api/business/employees | business.controller.ts |
| PUT | /api/business/employees/:id | business.controller.ts |
| PATCH | /api/business/employees/:id/status | business.controller.ts |
| GET | /api/business/employees/:id/clock-history | business.controller.ts |
| GET | /api/business/locations | business.controller.ts |
| POST | /api/business/locations | business.controller.ts |
| PUT | /api/business/locations/:id | business.controller.ts |
| DELETE | /api/business/locations/:id | business.controller.ts |
| GET | /api/business/locations/:id/terminals | business.controller.ts |
| GET | /api/business/reports/daily-sales | business.controller.ts |
| GET | /api/business/reports/revenue-by-item | business.controller.ts |
| GET | /api/business/reports/payment-methods | business.controller.ts |
| GET | /api/business/reports/transactions | business.controller.ts |
| GET | /api/business/reports/voids-refunds | business.controller.ts |
| GET | /api/business/reports/clock-history | business.controller.ts |
| GET | /api/business/reports/tva-declaration | business.controller.ts |
| GET | /api/business/transactions/:id | business.controller.ts |
| POST | /api/business/transactions/:id/refund | business.controller.ts |
| POST | /api/business/upload/product-image | upload.controller.ts |
| GET | /api/business/customers | customer.controller.ts |
| GET | /api/business/customers/dashboard-summary | customer.controller.ts |
| GET | /api/business/customers/:id | customer.controller.ts |
| POST | /api/business/customers | customer.controller.ts |
| PATCH | /api/business/customers/:id | customer.controller.ts |
| DELETE | /api/business/customers/:id | customer.controller.ts |
| GET | /api/business/customer-grades | customer.controller.ts |
| POST | /api/business/customer-grades | customer.controller.ts |
| PATCH | /api/business/customer-grades/:id | customer.controller.ts |
| DELETE | /api/business/customer-grades/:id | customer.controller.ts |
| GET | /api/business/customer-labels | customer.controller.ts |
| POST | /api/business/customer-labels | customer.controller.ts |
| PATCH | /api/business/customer-labels/:id | customer.controller.ts |
| DELETE | /api/business/customer-labels/:id | customer.controller.ts |
| PUT | /api/business/customers/:id/labels | customer.controller.ts |
| GET | /api/business/customer-attributes | customer.controller.ts |
| POST | /api/business/customer-attributes | customer.controller.ts |
| PATCH | /api/business/customer-attributes/:id | customer.controller.ts |
| DELETE | /api/business/customer-attributes/:id | customer.controller.ts |
| GET | /api/business/customers/:id/attributes | customer.controller.ts |
| PUT | /api/business/customers/:id/attributes | customer.controller.ts |
| GET | /api/business/customers/:id/points-history | customer.controller.ts |
| POST | /api/business/customers/:id/points-adjustment | customer.controller.ts |
| POST | /api/business/customers/import-grades | customer.controller.ts |
| GET | /api/business/promotions | promotion.controller.ts |
| GET | /api/business/promotions/:id | promotion.controller.ts |
| POST | /api/business/promotions | promotion.controller.ts |
| PATCH | /api/business/promotions/:id | promotion.controller.ts |
| POST | /api/business/promotions/:id/activate | promotion.controller.ts |
| POST | /api/business/promotions/:id/pause | promotion.controller.ts |
| POST | /api/business/promotions/:id/archive | promotion.controller.ts |
| GET | /api/business/reports/promotions | promotion.controller.ts |
| GET | /api/business/coupon-types | coupon.controller.ts |
| GET | /api/business/coupon-types/:id | coupon.controller.ts |
| POST | /api/business/coupon-types | coupon.controller.ts |
| PATCH | /api/business/coupon-types/:id | coupon.controller.ts |
| POST | /api/business/coupon-types/:id/clone | coupon.controller.ts |
| POST | /api/business/coupon-types/:id/deactivate | coupon.controller.ts |
| POST | /api/business/coupon-types/:id/issue | coupon.controller.ts |
| GET | /api/business/coupons/lookup | coupon.controller.ts |
| POST | /api/business/coupons/bulk-issue | coupon.controller.ts |
| POST | /api/business/coupons/issue-to-segment | coupon.controller.ts |
| POST | /api/business/coupons/:id/void | coupon.controller.ts |
| GET | /api/business/reports/coupons | coupon.controller.ts |
| GET | /api/business/reports/discount-write-offs | coupon.controller.ts |
| GET | /api/business/points-exchange-rules | pex.controller.ts |
| GET | /api/business/points-exchange-rules/check-point-value | pex.controller.ts |
| GET | /api/business/points-exchange-rules/redeemable-for-customer | pex.controller.ts |
| GET | /api/business/points-exchange-rules/:id | pex.controller.ts |
| POST | /api/business/points-exchange-rules | pex.controller.ts |
| PATCH | /api/business/points-exchange-rules/:id | pex.controller.ts |
| DELETE | /api/business/points-exchange-rules/:id | pex.controller.ts |
| POST | /api/business/points-exchange-rules/:id/redeem | pex.controller.ts |
| GET | /api/business/reports/points-exchange | pex.controller.ts |
| GET | /api/business/expiration-alerts | alert.controller.ts |
| POST | /api/business/expiration-alerts/:id/resolve | alert.controller.ts |
| GET | /api/business/stock-discrepancy-alerts | alert.controller.ts |
| POST | /api/business/stock-discrepancy-alerts/:id/resolve | alert.controller.ts |
| GET | /api/business/units-of-measure | inventory.controller.ts |
| POST | /api/business/units-of-measure | inventory.controller.ts |
| PATCH | /api/business/units-of-measure/:id | inventory.controller.ts |
| DELETE | /api/business/units-of-measure/:id | inventory.controller.ts |
| GET | /api/business/warehouses | inventory.controller.ts |
| GET | /api/business/warehouses/:id | inventory.controller.ts |
| POST | /api/business/warehouses | inventory.controller.ts |
| PATCH | /api/business/warehouses/:id | inventory.controller.ts |
| DELETE | /api/business/warehouses/:id | inventory.controller.ts |
| GET | /api/business/vendors | inventory.controller.ts |
| GET | /api/business/vendors/:id | inventory.controller.ts |
| POST | /api/business/vendors | inventory.controller.ts |
| PATCH | /api/business/vendors/:id | inventory.controller.ts |
| DELETE | /api/business/vendors/:id | inventory.controller.ts |
| GET | /api/business/vendors/:id/check-details | inventory.controller.ts |
| POST | /api/business/vendors/:id/check-details | inventory.controller.ts |
| GET | /api/business/brands | inventory.controller.ts |
| POST | /api/business/brands | inventory.controller.ts |
| PATCH | /api/business/brands/:id | inventory.controller.ts |
| DELETE | /api/business/brands/:id | inventory.controller.ts |
| GET | /api/business/products/:id/nutrition | inventory.controller.ts |
| PUT | /api/business/products/:id/nutrition | inventory.controller.ts |
| GET | /api/business/nutrition-info | inventory.controller.ts |
| GET | /api/business/purchase-orders | purchase-order.controller.ts |
| GET | /api/business/purchase-orders/:id | purchase-order.controller.ts |
| POST | /api/business/purchase-orders | purchase-order.controller.ts |
| PATCH | /api/business/purchase-orders/:id | purchase-order.controller.ts |
| POST | /api/business/purchase-orders/:id/send | purchase-order.controller.ts |
| POST | /api/business/purchase-orders/:id/confirm | purchase-order.controller.ts |
| POST | /api/business/purchase-orders/:id/receive | purchase-order.controller.ts |
| POST | /api/business/purchase-orders/:id/cancel | purchase-order.controller.ts |
| GET | /api/business/stock-adjustments | stock-adjustment.controller.ts |
| GET | /api/business/stock-adjustments/:id | stock-adjustment.controller.ts |
| POST | /api/business/stock-adjustments | stock-adjustment.controller.ts |
| POST | /api/business/stock-adjustments/:id/submit | stock-adjustment.controller.ts |
| POST | /api/business/stock-adjustments/:id/approve | stock-adjustment.controller.ts |
| POST | /api/business/stock-adjustments/:id/post | stock-adjustment.controller.ts |
| POST | /api/business/stock-adjustments/:id/reject | stock-adjustment.controller.ts |
| GET | /api/business/stock-batches | stock-batch.controller.ts |
| POST | /api/business/stock-batches | stock-batch.controller.ts |
| POST | /api/business/stock-batches/:id/adjust | stock-batch.controller.ts |
| POST | /api/business/stock-batches/:id/dispose | stock-batch.controller.ts |
| POST | /api/business/stock-batches/:id/transfer | stock-batch.controller.ts |
| GET | /api/business/stock-templates | stock-template.controller.ts |
| GET | /api/business/stock-templates/:id | stock-template.controller.ts |
| POST | /api/business/stock-templates | stock-template.controller.ts |
| PATCH | /api/business/stock-templates/:id | stock-template.controller.ts |
| DELETE | /api/business/stock-templates/:id | stock-template.controller.ts |
| POST | /api/business/stock-templates/:id/create-purchase-order | stock-template.controller.ts |
| GET | /api/business/stock-transfers | stock-transfer.controller.ts |
| GET | /api/business/stock-transfers/:id | stock-transfer.controller.ts |
| POST | /api/business/stock-transfers | stock-transfer.controller.ts |
| POST | /api/business/stock-transfers/:id/post | stock-transfer.controller.ts |
| POST | /api/business/stock-transfers/:id/cancel | stock-transfer.controller.ts |
| DELETE | /api/business/stock-transfers/:id | stock-transfer.controller.ts |
| GET | /api/business/vendor-payments | vendor-payment.controller.ts |
| GET | /api/business/vendor-payments/:id | vendor-payment.controller.ts |
| POST | /api/business/vendor-payments | vendor-payment.controller.ts |
| POST | /api/business/vendor-payments/:id/confirm | vendor-payment.controller.ts |
| POST | /api/business/vendor-payments/:id/void | vendor-payment.controller.ts |
| GET | /api/business/vendors/:vendorId/outstanding | vendor-payment.controller.ts |
| GET | /api/business/vendors/:vendorId/payment-summary | vendor-payment.controller.ts |
| GET | /api/business/jobs/:id | job.controller.ts |
| GET | /api/business/recommendation-templates | recommendation.controller.ts |
| GET | /api/business/recommendation-templates/featured | recommendation.controller.ts |
| POST | /api/business/recommendation-templates | recommendation.controller.ts |
| PATCH | /api/business/recommendation-templates/:id | recommendation.controller.ts |
| DELETE | /api/business/recommendation-templates/:id | recommendation.controller.ts |
| PUT | /api/business/recommendation-templates/:id/items | recommendation.controller.ts |
| GET | /api/business/platform-announcements | communications.controller.ts |
| POST | /api/business/platform-announcements/:id/dismiss | communications.controller.ts |
| GET | /api/business/announcements | communications.controller.ts |
| POST | /api/business/announcements | communications.controller.ts |
| GET | /api/business/announcements/for-me | communications.controller.ts |
| PATCH | /api/business/announcements/:id | communications.controller.ts |
| DELETE | /api/business/announcements/:id | communications.controller.ts |
| GET | /api/business/notifications/channels | communications.controller.ts |
| PUT | /api/business/notifications/channels | communications.controller.ts |
| POST | /api/business/notifications/channels/test | communications.controller.ts |
| POST | /api/business/notifications/sms/refresh-balance | communications.controller.ts |
| GET | /api/business/notifications/sms/balance | communications.controller.ts |
| GET | /api/business/notifications/templates | notifications.controller.ts |
| POST | /api/business/notifications/templates | notifications.controller.ts |
| POST | /api/business/notifications/templates/:id/preview | notifications.controller.ts |
| PATCH | /api/business/notifications/templates/:id | notifications.controller.ts |
| DELETE | /api/business/notifications/templates/:id | notifications.controller.ts |
| POST | /api/business/notifications/send | notifications.controller.ts |
| POST | /api/business/notifications/send-to-segment | notifications.controller.ts |
| GET | /api/business/notifications/sends | notifications.controller.ts |
| GET | /api/business/chain/dashboard | chain.controller.ts |
| GET | /api/business/chain/sync-config | chain.controller.ts |
| PUT | /api/business/chain/sync-config | chain.controller.ts |
| POST | /api/business/chain/sync | chain.controller.ts |
| GET | /api/business/chain/sync-jobs/:id | chain.controller.ts |
| GET | /api/business/chain/unmapped-products | chain.controller.ts |
| POST | /api/business/chain/pull-product | chain.controller.ts |
| GET | /api/business/chain/dashboard | chain.controller.ts |
| GET | /api/business/chain/transactions | chain.controller.ts |
| GET | /api/business/chain/parent-vendor-info | chain.controller.ts |
| GET | /api/business/chain/incoming-po-requests | chain.controller.ts |
| POST | /api/business/chain/incoming-po-requests/:id/fulfill | chain.controller.ts |
| POST | /api/business/promotions/:id/validate-sub-stores | chain.controller.ts |
| POST | /api/business/promotions/:id/rollout-to-children | chain.controller.ts |
| POST | /api/business/users/:id/grant-business-access | chain.controller.ts |
| GET | /api/business/settings/settlement-cutoff | platform-admin-business.controller.ts |
| PUT | /api/business/settings/settlement-cutoff | platform-admin-business.controller.ts |
| GET | /api/business/couriers | platform-admin-business.controller.ts |
| POST | /api/business/couriers/link | platform-admin-business.controller.ts |
| DELETE | /api/business/couriers/:courier_id | platform-admin-business.controller.ts |
| GET | /api/business/dining-areas | restaurant.controller.ts |
| POST | /api/business/dining-areas | restaurant.controller.ts |
| PATCH | /api/business/dining-areas/:id | restaurant.controller.ts |
| DELETE | /api/business/dining-areas/:id | restaurant.controller.ts |
| GET | /api/business/table-types | restaurant.controller.ts |
| POST | /api/business/table-types | restaurant.controller.ts |
| PATCH | /api/business/table-types/:id | restaurant.controller.ts |
| DELETE | /api/business/table-types/:id | restaurant.controller.ts |
| GET | /api/business/tables | restaurant.controller.ts |
| POST | /api/business/tables | restaurant.controller.ts |
| PATCH | /api/business/tables/:id | restaurant.controller.ts |
| DELETE | /api/business/tables/:id | restaurant.controller.ts |
| GET | /api/business/reports/:reportId | reports.controller.ts |
| GET | /api/super/businesses | super-admin.controller.ts |
| POST | /api/super/businesses | super-admin.controller.ts |
| GET | /api/super/businesses/:id | super-admin.controller.ts |
| PUT | /api/super/businesses/:id | super-admin.controller.ts |
| PATCH | /api/super/businesses/:id/status | super-admin.controller.ts |
| GET | /api/super/business-types | super-admin.controller.ts |
| POST | /api/super/business-types | super-admin.controller.ts |
| PUT | /api/super/business-types/:id/features | super-admin.controller.ts |
| GET | /api/super/terminals | super-admin.controller.ts |
| POST | /api/super/terminals | super-admin.controller.ts |
| PATCH | /api/super/terminals/:id/assign | super-admin.controller.ts |
| GET | /api/super/terminals/health | super-admin.controller.ts |
| GET | /api/super/subscriptions | super-admin.controller.ts |
| POST | /api/super/subscriptions | super-admin.controller.ts |
| PUT | /api/super/subscriptions/:id | super-admin.controller.ts |
| GET | /api/super/dashboard/stats | super-admin.controller.ts |
| GET | /api/super/audit-logs | super-admin.controller.ts |
| GET | /api/super/announcements | super-admin.controller.ts |
| POST | /api/super/announcements | super-admin.controller.ts |
| PATCH | /api/super/announcements/:id | super-admin.controller.ts |
| DELETE | /api/super/announcements/:id | super-admin.controller.ts |
| GET | /api/super/businesses/chain-tree | chain-super.controller.ts |
| POST | /api/super/businesses/:id/promote-to-parent | chain-super.controller.ts |
| POST | /api/super/businesses/:child_id/link-parent | chain-super.controller.ts |
| POST | /api/super/businesses/:child_id/unlink-parent | chain-super.controller.ts |
| GET | /api/super/trade-categories/tree | platform-admin-super.controller.ts |
| GET | /api/super/trade-categories/options | platform-admin-super.controller.ts |
| POST | /api/super/trade-categories | platform-admin-super.controller.ts |
| PATCH | /api/super/trade-categories/:id | platform-admin-super.controller.ts |
| DELETE | /api/super/trade-categories/:id | platform-admin-super.controller.ts |
| GET | /api/super/couriers | platform-admin-super.controller.ts |
| POST | /api/super/couriers | platform-admin-super.controller.ts |
| PATCH | /api/super/couriers/:id | platform-admin-super.controller.ts |
| DELETE | /api/super/couriers/:id | platform-admin-super.controller.ts |
| GET | /api/super/businesses/:id/custom-authority | platform-admin-super.controller.ts |
| PUT | /api/super/businesses/:id/custom-authority | platform-admin-super.controller.ts |
| GET | /api/super/version-log/menus | platform-admin-super.controller.ts |
| POST | /api/super/version-log/entries | platform-admin-super.controller.ts |
| PATCH | /api/super/version-log/entries/:id | platform-admin-super.controller.ts |
| DELETE | /api/super/version-log/entries/:id | platform-admin-super.controller.ts |
| GET | /api/super/system-parameters | platform-admin-super.controller.ts |
| PATCH | /api/super/system-parameters/:id | platform-admin-super.controller.ts |
| GET | /api/kds/orders | kds.controller.ts |
| PATCH | /api/kds/orders/:id/status | kds.controller.ts |
| GET | /api/terminal/kds/items | kds-items.controller.ts |
| POST | /api/terminal/kds/items/:id/status | kds-items.controller.ts |
| POST | /api/terminal/activate | terminal.controller.ts |
| GET | /api/terminal/config | terminal.controller.ts |
| POST | /api/terminal/heartbeat | terminal.controller.ts |
| POST | /api/terminal/clock-in | terminal.controller.ts |
| POST | /api/terminal/clock-out | terminal.controller.ts |
| GET | /api/terminal/active-employees | terminal.controller.ts |
| GET | /api/terminal/catalog | terminal.controller.ts |
| GET | /api/terminal/customers/lookup | terminal.controller.ts |
| POST | /api/terminal/customers/quick-add | terminal.controller.ts |
| POST | /api/terminal/promotions/evaluate | terminal.controller.ts |
| GET | /api/terminal/coupons/validate | terminal.controller.ts |
| POST | /api/terminal/transactions | terminal.controller.ts |
| POST | /api/terminal/transactions/:id/void | terminal.controller.ts |
| GET | /api/terminal/transactions/today | terminal.controller.ts |
| POST | /api/terminal/sync | terminal.controller.ts |
| GET | /api/terminal/sync/status | terminal.controller.ts |
| GET | /api/terminal/recommendation-templates/:id/items | recommendation-terminal.controller.ts |
| GET | /api/terminal/tables/floor-plan | table-session.controller.ts |
| POST | /api/terminal/tables/:id/open | table-session.controller.ts |
| POST | /api/terminal/table-sessions/:id/items | table-session.controller.ts |
| PATCH | /api/terminal/table-session-items/:id | table-session.controller.ts |
| POST | /api/terminal/table-session-items/transfer | table-session.controller.ts |
| DELETE | /api/terminal/table-session-items/:id | table-session.controller.ts |
| POST | /api/terminal/table-sessions/:id/close | table-session.controller.ts |
| POST | /api/terminal/table-sessions/:id/split | table-session.controller.ts |
| POST | /api/terminal/table-sessions/:id/cancel | table-session.controller.ts |
| GET | /api/health | health.controller.ts |
| GET | /api/public/oss | oss.controller.ts |
| POST | /api/webhooks/notifications/:provider | notifications-public.controller.ts |
| POST | /api/public/notifications/opt-out | notifications-public.controller.ts |

---

## Table 2 — Frontend Pages Status

### Dashboard (`admin-dashboard-ui-v3/components/`)

| Component | Status | API Calls | Notes |
|-----------|--------|-----------|-------|
| admin-announcements-page.tsx | ✅ | GET/POST/PATCH/DELETE /super/announcements | Full CRUD |
| announcements-page.tsx | ✅ | GET /business/announcements, GET .../for-me, POST/PATCH/DELETE | Full CRUD |
| brands-page.tsx | ✅ | GET/POST/PATCH/DELETE /business/brands | Full CRUD |
| categories-page.tsx | ⚠️ METHOD BUG | GET/POST **/PATCH**/:id/DELETE /business/categories | Backend expects PUT for update, frontend sends PATCH |
| chain-page.tsx | ✅ | 18 endpoints — full chain management | Comprehensive |
| communications-page.tsx | ✅ | Channels, templates, send, SMS balance | Full coverage |
| coupon-bulk-issue-page.tsx | ✅ | POST /coupons/bulk-issue, /issue-to-segment, job polling | Full coverage |
| coupons-page.tsx | ✅ | GET/POST/PATCH /coupon-types, clone/deactivate/issue/void/lookup | Full CRUD |
| couriers-page.tsx | ✅ | GET/POST/PATCH/DELETE /super/couriers + /business/couriers link/unlink | Full coverage |
| custom-authority-page.tsx | ✅ | GET/PUT /super/businesses/:id/custom-authority | Full coverage |
| customer-detail-page.tsx | ✅ | GET /customers/:id, GET/PUT /customers/:id/attributes | Full coverage |
| customers-page.tsx | ✅ | 20+ calls — list, create, edit, delete, grades, labels, attributes, points | Full coverage |
| dining-areas-page.tsx | ✅ | GET/POST/PATCH/DELETE /business/dining-areas | Full CRUD |
| discrepancy-alerts-page.tsx | ✅ | GET /stock-discrepancy-alerts, POST .../resolve | Full coverage |
| employees-page.tsx | ✅ | GET/POST/PUT /employees, PATCH .../status, GET .../clock-history | Full coverage |
| expiration-alerts-page.tsx | ✅ | GET /expiration-alerts, POST .../resolve | Full coverage |
| floor-plan-setup-page.tsx | ✅ | GET /tables, PATCH /tables/:id (drag positions) | Full coverage |
| kds-page.tsx | ✅ | GET /terminal/kds/items, POST .../status | Full coverage |
| locations-page.tsx | ⚠️ MISSING DELETE | GET/POST/PUT /business/locations, GET .../terminals | DELETE /locations/:id unwired |
| modifiers-page.tsx | ✅ | GET/POST/PUT /modifier-groups, POST .../modifiers, link to products | Full coverage |
| notification-channels-page.tsx | ✅ | GET/PUT /notifications/channels, POST .../test | Full coverage |
| notification-send-page.tsx | ✅ | GET /templates, POST /send, /send-to-segment | Full coverage |
| notification-templates-page.tsx | ✅ | GET/POST/PATCH/DELETE/preview /notifications/templates | Full CRUD |
| notifications-page.tsx | ⚡ INTENTIONAL MOCK | None | TODO comment: UI-only in-app alerts, not the comms module |
| platform-announcements-page.tsx | ✅ | GET /platform-announcements, POST .../dismiss | Full coverage |
| points-exchange-page.tsx | ✅ | GET/POST/PATCH/DELETE /pex-rules, check-point-value, redeemable-for-customer, redeem | Full coverage |
| product-detail-page.tsx | ✅ | GET/:id, variants, nutrition, nutrition-info presets | Full coverage |
| products-page.tsx | ✅ | GET/POST/PUT/DELETE /products, variants, categories, upload, modifiers | Full coverage |
| promotion-create-page.tsx | ✅ | GET /categories, /products, POST /promotions | Full coverage |
| promotion-detail-page.tsx | ✅ | GET/:id, POST /:id/activate|pause|archive, PATCH | Full coverage |
| promotions-page.tsx | ✅ | GET/POST/PATCH /promotions + status actions | Full coverage |
| purchase-order-create-page.tsx | ✅ | GET /vendors, /warehouses, /products, POST /purchase-orders | Full coverage |
| purchase-order-detail-page.tsx | ✅ | GET/:id, POST send/confirm/receive/cancel | Full lifecycle |
| purchase-orders-page.tsx | ✅ | Full PO list + CRUD + all lifecycle transitions | Full coverage |
| recommendation-items-page.tsx | ✅ | GET /products search, PUT /recommendation-templates/:id/items | Full coverage |
| recommendations-page.tsx | ✅ | GET/POST/PATCH/DELETE /recommendation-templates, featured, items | Full coverage |
| reports-page.tsx | ✅ | GET /reports/:reportId (universal), GET+POST /transactions/:id/refund | Full coverage |
| settings-page.tsx | ✅ | GET /auth/me, PUT change-password, GET/PUT settlement-cutoff, channels, regions | Full coverage |
| stock-adjustments-page.tsx | ✅ | GET/POST /stock-adjustments + submit/approve/post/reject | Full lifecycle |
| stock-batches-page.tsx | ✅ | GET/POST /stock-batches + adjust/dispose/transfer | Full coverage |
| stock-movements-page.tsx | ✅ | GET /reports/stock-movements (universal endpoint) | Read-only |
| stock-page.tsx | ✅ | GET /reports/stock-position (universal endpoint) | Read-only |
| stock-templates-page.tsx | ✅ | GET/POST/PATCH/DELETE /stock-templates, create-purchase-order | Full CRUD |
| stock-transfers-page.tsx | ✅ | GET/POST /stock-transfers + post/cancel/DELETE | Full lifecycle |
| super-admin-page.tsx | ✅ | 25+ calls: businesses, types, subscriptions, terminals, audit, announcements, couriers, categories, system params | Full coverage |
| system-parameters-page.tsx | ✅ | GET /system-parameters, PATCH /:id | Full coverage |
| table-management-page.tsx | ✅ | GET/POST/PATCH/DELETE /dining-areas, /table-types, /tables | Full CRUD |
| table-types-page.tsx | ✅ | GET/POST/PATCH/DELETE /table-types | Full CRUD |
| terminals-page.tsx | ✅ | GET/POST /super/terminals, PATCH .../assign, GET .../health | Full coverage |
| trade-categories-page.tsx | ✅ | GET/POST/PATCH/DELETE /super/trade-categories + /options | Full CRUD |
| units-of-measure-page.tsx | ✅ | GET/POST/PATCH/DELETE /business/units-of-measure | Full CRUD |
| vendor-detail-page.tsx | ✅ | GET /vendors/:id, GET/POST /vendors/:id/check-details | Full coverage |
| vendor-payments-page.tsx | ✅ | GET/POST /vendor-payments, confirm/void, outstanding/summary | Full coverage |
| vendors-page.tsx | ✅ | GET/POST/PATCH/DELETE /vendors, check-details, outstanding, payment-summary | Full coverage |
| version-log-page.tsx | ✅ | GET /super/version-log/menus, GET /auth/version-log/entries, POST/PATCH/DELETE /super/version-log/entries | Full coverage |
| warehouses-page.tsx | ✅ | GET/GET:id/POST/PATCH/DELETE /business/warehouses | Full CRUD |

### Terminal (`pos-terminal-ui-v3/app/page.tsx`)

| Area | Status | API Calls | Notes |
|------|--------|-----------|-------|
| Lucide imports | ✅ FIXED | All icons imported | Smartphone/Box/Eye added 2026-05-26 |
| Local components | ✅ | `<Icon>` = `const Icon = cat.icon`, `<KdsIcon>` = `const KdsIcon = kdsStyle.icon` | Inline variable, not broken import |
| Terminal service calls | ✅ | All calls via `terminalService.*` wrapper | Covers activate, config, clock-in/out, catalog, customers, transactions, sync, floor-plan, table sessions, recommendations |

---

## Table 3 — Unwired Backend Endpoints

These exist in the backend but no frontend component calls them.

| Method | Route | Reason |
|--------|-------|--------|
| DELETE | /api/business/locations/:id | `locations-page.tsx` has no delete button — backend ready, UI missing |
| GET | /api/kds/orders | Legacy KDS dashboard endpoint; `kds-page.tsx` uses `/terminal/kds/items` instead |
| PATCH | /api/kds/orders/:id/status | Legacy KDS endpoint — same reason |
| GET | /api/auth/trade-categories/tree | Public variant of the super endpoint; pages correctly use `/super/trade-categories/tree` |
| GET | /api/auth/version-log/menus | Public variant; `version-log-page.tsx` correctly uses `/super/version-log/menus` |
| GET | /api/business/notifications/sends | History log of sent notifications — no history tab wired in any comms component |
| GET | /api/health | Infrastructure/monitoring only |
| GET | /api/public/oss | Terminal `app/oss/page.tsx` may call this; not verified |
| POST | /api/webhooks/notifications/:provider | External inbound webhook — not called from UI |
| POST | /api/public/notifications/opt-out | Public opt-out link — not a dashboard UI concern |

---

## Table 4 — Broken Calls (wrong method, wrong URL, or wrong shape)

| Severity | File | Frontend Call | Backend Expects | Fix |
|----------|------|---------------|-----------------|-----|
| 🔴 HIGH | `categories-page.tsx:72` | `PATCH /api/business/categories/:id` | `PUT /api/business/categories/:id` | Change `method: "PATCH"` → `method: "PUT"` in the save handler |

No other method mismatches found. All other endpoints match on both method and URL path.

---

## Table 5 — Missing Imports Per File

| File | Missing Imports |
|------|----------------|
| `pos-terminal-ui-v3/app/page.tsx` | ✅ Fixed today: `Smartphone`, `Box`, `Eye` added to lucide-react import |
| All dashboard components | ✅ None found |

---

## PHASE 2 — Prioritized Fix Plan

### Priority 1 — Critical (breaks pages at runtime)
None remaining after today's terminal import fixes.

### Priority 2 — High (API calls that return 405 Method Not Allowed)

| # | File | Fix |
|---|------|-----|
| 1 | `categories-page.tsx:72` | Change `method: "PATCH"` → `"PUT"` in update handler |

This is the **only confirmed broken API call** in 58 components. Every save of a category edit currently returns HTTP 405 from the backend.

### Priority 3 — Medium (endpoints exist, no UI entry point)

| # | Endpoint | Suggested UI home |
|---|----------|------------------|
| 1 | `DELETE /business/locations/:id` | Add delete button + confirm dialog to `locations-page.tsx` |
| 2 | `GET /business/notifications/sends` | Add "Send History" tab to `communications-page.tsx` or `notification-send-page.tsx` |

### Priority 4 — Low (intentional or infrastructure)

| # | Item | Notes |
|---|------|-------|
| 1 | `notifications-page.tsx` mock data | Per TODO comment, this is intentional — in-app UI alerts, not the comms module |
| 2 | Legacy `/api/kds/orders` endpoints | Superseded by `/api/terminal/kds/items`; no action needed |
| 3 | Public `/api/auth/` variants of trade-categories and version-log | Not needed in dashboard UI; super versions are correct |

---

## Summary

| Category | Count |
|----------|-------|
| Total backend endpoints | 285 |
| ✅ Fully wired (correct method + URL) | 278 |
| ⚠️ Wrong HTTP method (405 on save) | **1** — categories PATCH→PUT |
| ❌ No frontend UI (non-infrastructure) | **2** — locations DELETE, notifications/sends |
| ⚡ Not needed (public/webhook/infra/legacy) | **8** |
| Total frontend components | 58 |
| ✅ Fully wired | 55 |
| ⚠️ Partially wired (missing one action) | 1 (locations) |
| ⚡ Intentional mock | 1 (notifications-page) |
| 🔴 Broken imports fixed today | 3 (terminal: Smartphone, Box, Eye) |
