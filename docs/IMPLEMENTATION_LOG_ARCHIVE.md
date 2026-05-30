## Implementation status

Update this section at the end of each phase. Adding a "What's done" line
saves Claude context tokens in subsequent sessions.

### Phase 0 — Repo hygiene (DONE)

- [x] Fix `terminal.module.ts` duplicated `KdsModule` imports (was in module, not service)
- [x] Scaffold `packages/shared` workspace with TypeScript build setup
- [x] Add a `/api/health` endpoint that pings DB and Redis
- [x] Verify Docker dev environment (`docker compose up` brings everything up)
- [x] Confirm backend container starts and connects to Postgres + Redis

### Phase 5 — TVA Foundation (DONE)

All 9 deliverables complete. 69 tests passing.

- [x] `money.ts` — `bankersRound`, `distributeDiscount` (XCC-011)
- [x] `tva.ts` — `resolveTvaRate` priority chain (product override → category default)
- [x] `discount-pipeline.service.ts` — grade→promotion→coupon pipeline (XCC-017)
- [x] Migration `1714000000000-AddTvaCompliance` — ICE/IF/invoice_counter on businesses,
      total_ht/tva/ttc on transactions, tva_rate/item_ht/item_tva/item_ttc on transaction_items
- [x] Entities updated: Business, Category, Product, Transaction, TransactionItem
- [x] `TerminalService.createTransaction` wired: resolves TVA per item, runs pipeline,
      atomic invoice counter with year reset, populates all TVA fields;
      backward-compat: subtotal=HT, tax_amount=TVA, total=TTC (XCC-010, XCC-018)
- [x] `GET /api/business/reports/tva-declaration` — aggregates from transaction_items,
      groups by TVA rate band, uses calendar date per XCC-018 (TVA-030, TVA-031)
- [x] `SimplTvaService` stub — `submitInvoice` + `checkStatus`, wired into `CommonModule`
      (global), ready for DGI SIMPL-TVA integration (TVA-041, TVA-042)
- [x] `receipt-builder.ts` — `buildReceipt()` returns structured receipt with all SRS §3.6.2
      mandatory fields: ICE/IF, invoice_number, per-line TVA, TVA summary by rate band
- [x] JWT strategy fix: `terminal_id`/`location_id` from token payload now forwarded to `request.user`
- [x] `tsconfig.json` excludes `*.spec.ts` so `nest start --watch` compiles cleanly

### Phase 6 — Customers & Loyalty (DONE)

All 13 deliverables complete. 121 tests passing.

**Part A — DONE** (migrations 4+5 applied)

- [x] Migration 4: `MigrateUserPermissionsToJsonb` — `users.permissions JSONB` replaces `can_void`/`can_refund` booleans
- [x] `userHasPermission()` helper (`common/utils/permissions.ts`)
- [x] Migration 5: `AddCustomersAndLoyalty` — 7 new tables + column additions on transactions/businesses
- [x] 7 new entities: Customer, CustomerGrade, CustomerLabel, CustomerLabelAssignment, CustomerAttribute, CustomerAttributeValue, CustomerPointsHistory
- [x] Customer CRUD: CUST-001–005 (list, getDetail, create with auto-code, update, softDelete)
- [x] Grade CRUD: CUST-020–023 (list, create, update, deleteGrade with transactional demotion)

**Part B — DONE**

- [x] Label CRUD: CUST-030–034 (list, create, update, deleteLabel cascade, assignLabels replace-set)
- [x] Custom Attributes: CUST-040–045 (list, create, updateAttribute with data_type guard, delete cascade, getCustomerAttributes, setCustomerAttributes with per-field validation)
- [x] Points management: CUST-050–051 (getPointsHistory paginated+filtered, adjustPoints atomic UPDATE…RETURNING with 422 on negative balance)
- [x] Batch import stub: CUST-052 → 501 Not Implemented

**Part C — DONE**

- [x] `GET /api/terminal/customers/lookup?phone=...` — returns customer summary + grade + points_balance or 404 (CUST-100)
- [x] `POST /api/terminal/customers/quick-add` — phone/first_name/last_name, atomic customer_code counter, 409 on phone dupe (CUST-101)
- [x] `customer_id` field added to `CreateTransactionDto`; verified against business on transaction create; written to `transactions.customer_id` (CUST-102 simplified)
- [x] Points earning wired into `createTransaction`: `floor(ttc / points_earn_divisor) × grade.points_multiplier`, atomic UPDATE…RETURNING, `customer_points_history` row, grade promotion check (CUST-110)
- [x] `receipt-builder.ts` extended: optional `customer_phone`, `points_earned`, `points_balance` fields per spec §2.8

**Deferred (not backend concerns for Part C)**

- CUST-052 batch import — needs BullMQ (Phase 7 prerequisite)
- Offline SQLite cache (XCC-030/031) — terminal app state, not backend

### Phase 7 — Promotions & Coupons (DONE)

**Part A — DONE** (migrations 3+4 applied)

- [x] BullMQ + Redis infrastructure: `JobModule` (@Global), `JobService`, `RedisLockService` (XCC-050–XCC-055)
- [x] Migration `1714003000000-AddBackgroundJobInfrastructure` — `background_jobs` table + partial unique index (XCC-051, XCC-052)
- [x] Migration `1714004000000-AddPromotionsAndCoupons` — 6 new tables: promotions, promotion_redemptions, coupon_types, coupons, coupon_redemptions, discount_write_offs + all §13.3 indexes + businesses.promotion_stacking_mode (PROM-MOD-002)
- [x] 7 new entities: BackgroundJob, Promotion, PromotionRedemption, CouponType, Coupon, CouponRedemption, DiscountWriteOff
- [x] `GET /api/business/jobs/:id` — job status polling, scoped to business (XCC-055)
- [x] Promotion CRUD: PROM-001–007 (list+filter+is_currently_running, detail+stats, create, update with locked-fields guard, activate, pause, archive)
- [x] `PromotionEvaluatorService.evaluate()` — full 11-step filter chain including Moroccan holiday list (2026) and blackout periods; `evaluateWithStackingMode()` respects best_only vs stack (PROM-020, PROM-021)

**Part B — DONE**

- [x] CouponType CRUD: `CouponService` with create, update (locked-fields guard → 422 when coupons exist), clone (name gets "(Copy)", is_active=false), deactivate (CPN-001–006)
- [x] Issue coupon: 12-char uppercase alphanumeric code, collision-retried, linked to coupon_type + optional customer_id (CPN-010)
- [x] Lookup coupon: by code, 404 if not found, 410 if redeemed, status includes expiry (CPN-020)
- [x] `CouponController` — business dashboard endpoints under `/api/business/coupon-types/…` and `/api/business/coupons/lookup`
- [x] `createTransaction` wrapped in `QueryRunner` DB transaction — INSERT transaction, items, promotion_redemptions, coupon_redemptions, discount_write_offs, points all commit/rollback atomically
- [x] `CreateTransactionDto` extended with `promotion_ids?: string[]` and `coupon_codes?: string[]`
- [x] Discount pipeline order enforced: grade (skip, future) → promotion → coupon (XCC-017)
- [x] Atomic promotion claim: `UPDATE promotions SET current_uses + 1 WHERE max_uses = 0 OR current_uses < max_uses` — skips silently on race
- [x] Atomic coupon claim: `UPDATE coupons SET status='redeemed' WHERE id=$1 AND status='available'` — skips silently on race; free_item/bogo types returned as `unsupported_coupon_types` warning
- [x] `POST /api/terminal/promotions/evaluate` — cart evaluation endpoint returning applicable promotions with discounts (PROM-100)
- [x] `GET /api/terminal/coupons/validate?code=…` — coupon validity + discount preview at terminal (CPN-100)
- [x] `coupon.service.spec.ts` — 8 test cases covering all CouponService operations + cross-tenant 404
- [x] `terminal.service.spec.ts` updated — existing tests adapted to QueryRunner mock + 6 new tests (promo applied, coupon applied, combined, max_uses race, coupon race, TVA invariant)

### Phase 7 Part C — Promotions & Coupons Reports + Bulk Issuance (DONE)

All 6 deliverables complete. 211 tests passing.

- [x] `CouponService.voidCoupon` — `POST /api/business/coupons/:id/void`; 422 if not available; returns `voided_by_user_id` in response (CPN-033)
- [x] `CouponExtService.bulkIssueCoupons` — `POST /api/business/coupons/bulk-issue`; sync (≤100 customers) or BullMQ background job (>100) (CPN-021)
- [x] `CouponExtService.issueToSegment` — `POST /api/business/coupons/issue-to-segment`; always async; processor resolves all/grade/label segments (CPN-022)
- [x] `PromotionService.promotionReport` — `GET /api/business/reports/promotions`; per-promotion + grand totals from `promotion_redemptions` JOIN `transactions` (PROM-050)
- [x] `CouponExtService.couponReport` — `GET /api/business/reports/coupons`; per-coupon-type breakdown: issued/redeemed/expired/voided/discount_given/redemption_rate (CPN-040)
- [x] `CouponExtService.discountWriteOffReport` — `GET /api/business/reports/discount-write-offs`; per-terminal breakdown + grand totals (XCC-040)
- [x] `CouponBulkIssueProcessor` — BullMQ `@Processor('coupon-bulk-issue')`; per-item error isolation; tracks `{ issued, failed, total, errors }` in `result_json`
- [x] `PromotionModule` updated — `CouponExtService`, `CouponBulkIssueProcessor`, `BullModule.registerQueue`, `CouponRedemption`, `DiscountWriteOff` entities added
- [x] 18 new tests across 3 spec files: `coupon-void.spec.ts`, `coupon-ext.spec.ts`, `promotion-report.spec.ts`

### Phase 8 — Points Exchange (DONE)

All 9 deliverables complete.

- [x] Migration `1714005000000-AddPointsExchange` — `points_exchange_rules`, `points_exchange_rule_details`, `points_exchange_redemptions` + §13.3 indexes
- [x] 3 entities: `PointsExchangeRule`, `PointsExchangeRuleDetail`, `PointsExchangeRedemption`
- [x] `CouponService.issueCouponInQr()` — issues coupon inside an existing QueryRunner transaction (used by PEX-011)
- [x] `PointsExchangeService` — list/getDetail/checkPointValue/create (atomic QR)/update (point_value immutable once used)/deactivate/listRedeemableForCustomer/redeem (full atomic QueryRunner flow)/report (PEX-001–PEX-020)
- [x] PEX-011 atomic flow: `SELECT FOR UPDATE` customer, check points + per-customer/daily/total limits, `UPDATE points_exchange_rules ... RETURNING id` (concurrent race guard), decrement points, insert history, create ephemeral CouponType for `free_product`/`discount` rule types, issue coupon via `issueCouponInQr`, insert redemption — all in one transaction
- [x] `PointsExchangeController` — 9 endpoints under `/api/business/points-exchange-rules/…` and `/api/business/reports/points-exchange`; `check-point-value` and `redeemable-for-customer` routes declared before `/:id`; `can_redeem_points` guard on PEX-011
- [x] `PromotionModule` updated — PEX entities, service, controller registered
- [x] `pex.service.spec.ts` — 10 test cases covering all PEX operations + cross-tenant 404

### Phase 9 — Communications (DONE)

All deliverables complete. 262 tests passing (22 suites).

**Part A — Announcements + Channels**

- [x] Migration `1714006000000-AddCommunications` — 6 tables: `platform_announcements`, `user_announcement_dismissals`, `business_announcements`, `notification_channels` (composite PK `business_id+channel`), `notification_templates`, `notification_sends` + §13.3 indexes
- [x] 6 new entities: `PlatformAnnouncement`, `UserAnnouncementDismissal`, `BusinessAnnouncement`, `NotificationChannel`, `NotificationTemplate`, `NotificationSend`
- [x] Super admin platform announcement CRUD — `GET/POST/PATCH/DELETE /api/super/announcements[/:id]` (COM-001–004)
- [x] `CommunicationsModule` — new module at `src/modules/communications/`
- [x] `GET /api/business/platform-announcements` — active announcements filtered by business type + ID, excludes dismissed (COM-005)
- [x] `POST /api/business/platform-announcements/:id/dismiss` — idempotent per-user dismissal (COM-006)
- [x] Business announcements CRUD — `GET/POST/PATCH/DELETE /api/business/announcements[/:id]` (COM-010)
- [x] `GET /api/business/announcements/for-me` — filters by role + active + display_until (COM-011)
- [x] `GET /api/business/notifications/channels` — credentials fully redacted in response (COM-020)
- [x] `PUT /api/business/notifications/channels` — upsert on composite PK (COM-021)
- [x] Channel test stub (COM-022); SMS balance refresh stub (COM-030); cached balance read (COM-031)
- [x] 23 tests: `communications.service.spec.ts`, `super-admin-announcements.spec.ts`

**Part B — Templates + Sending + Opt-out**

- [x] Migration `1714007000000-AddNotificationOptOutToken` — `opt_out_token VARCHAR(64) UNIQUE` + partial index on `notification_sends`
- [x] `NotificationProviderService` — stub `send()` abstraction; real provider = implement this service only, no other changes needed
- [x] Template CRUD — `GET/POST/PATCH/DELETE /api/business/notifications/templates[/:id]`; delete blocked if template has sends (COM-040–043)
- [x] `POST /api/business/notifications/templates/:id/preview` — renders `{{ placeholder }}` with real customer data or sample fallback (COM-044)
- [x] `POST /api/business/notifications/send` — consent + SMS balance guards; generates `opt_out_token` for marketing sends; provider call + status update (COM-050)
- [x] `POST /api/business/notifications/send-to-segment` — BullMQ campaign job; returns `{ job_id, estimated_recipients, estimated_cost }` (COM-051)
- [x] `GET /api/business/notifications/sends` — paginated history with channel/status/date/customer/template filters (COM-052)
- [x] `POST /api/webhooks/notifications/:provider` — public; updates status/delivered_at/read_at by provider_message_id; TODO signature verification (COM-053)
- [x] `POST /api/public/notifications/opt-out` — public; sets `consent_marketing = false`; writes Law 09-08 audit log row (COM-060)
- [x] `NotificationCampaignProcessor` — resolves all/grade/label/specific segments; filters by `consent_marketing = true`; per-item error isolation; SMS balance decremented in-memory, flushed to DB every 25 sends, halts campaign on exhaustion; tracks `{ sent, skipped_no_consent, failed, total }` (COM-051)
- [x] 28 new tests: `notifications-send.service.spec.ts` (22 cases), `notification-campaign.processor.spec.ts` (6 cases)

### Phase 10 — Restaurant Operations (DONE). 333 tests passing (28 suites).

See `docs/PHASE_10_RST_REFERENCE.md` for complete build reference.
Implementation split into 4 parts:

**Part A — DONE** (migration 8 applied). 274 tests passing (23 suites).

- [x] Migration `1714008000000-AddRestaurantOperations` — 5 tables: dining_areas, table_types,
      tables, table_sessions, table_session_items; table_session_id on transactions;
      language_preference on users; all §13.3 indexes; reversible down method
- [x] 5 new entities: DiningArea, TableType, RestaurantTable, TableSession, TableSessionItem
      (in `src/common/entities/`; all exported from index barrel)
- [x] Transaction entity updated with nullable `table_session_id`
- [x] User entity updated with `language_preference VARCHAR(5) DEFAULT 'fr'`
- [x] `RestaurantModule` at `src/modules/restaurant/` — registered in AppModule
- [x] Dining area CRUD (RST-001–004): list (with table_count via single GROUP BY JOIN),
      create (409 on duplicate name), update, delete (422 if active tables exist)
- [x] Table type CRUD (RST-010–013): list, create, update, delete
- [x] Table CRUD (RST-020–023): list (with optional `with_session_status` via single LEFT JOIN
      on table_sessions), create (409 on duplicate table_number), update, delete (422 if open session)
- [x] 12 unit tests: happy paths + 409/422 guards + cross-tenant 404

**Part B — DONE**. 299 tests passing (24 suites).

- [x] `TableSessionService` + `TableSessionController` at `src/modules/restaurant/`
- [x] Floor plan view (RST-030): `GET /api/terminal/tables/floor-plan` — single raw query with
      LEFT JOIN on active session + SUM of non-cancelled items; NULLIF/TRIM for customer/server names
- [x] Open table (RST-031): `POST /api/terminal/tables/:id/open` — 409 if active session exists;
      permission guard: `can_open_table_session` OR owner/manager
- [x] Add items (RST-032): `POST /api/terminal/table-sessions/:id/items` — batch-fetches products
      and variants; locks `unit_price_ttc` at add-time; defaults item `customer_id` to session's
- [x] Modify item (RST-033): `PATCH /api/terminal/table-session-items/:id` — field-specific guard:
      quantity/notes blocked when `kds_status IN ('preparing','ready','served')`; customer_id ALWAYS
      modifiable regardless of kds_status (TRAP 3)
- [x] Remove item (RST-034): `DELETE /api/terminal/table-session-items/:id` — 422 if in kitchen
      without `can_void`; with `can_void` → soft-delete (sets `kds_status='cancelled'`) + audit log
- [x] Transfer items (RST-037): `POST /api/terminal/table-session-items/transfer` — both sessions
      must be `status='open'` + same business; permission: `can_transfer_table_items` or owner/manager
- [x] Cancel session (RST-038): `POST /api/terminal/table-sessions/:id/cancel` — two branches:
      open→cancelled (bulk-cancels all items); awaiting_payment+force_close_partial→paid+partial_payment=true
- [x] 25 unit tests: all happy paths + 409/422/403/404 guards + cross-tenant 404

**Part C — DONE**. 309 tests passing (27 suites).

- [x] `EventGateway` — `@WebSocketGateway({ namespace: '/events' })` in `src/common/gateways/event.gateway.ts`;
      `emitToRoom(room, event, payload)` method; room-join on connect via handshake query + `join` message;
      wired into `CommonModule` (@Global) — available to all modules without explicit import
- [x] KDS refactor (RST-MOD-001): `getKdsItems(businessId, query)` — merges `table_session_items`
      (QueryBuilder with JOINs to products/tables/users) + direct transaction items (backward compat);
      `order_source: 'table_session' | 'direct_transaction'` field distinguishes sources;
      `GET /api/terminal/kds/items` via new `KdsItemsController` (`@Controller('terminal/kds')`)
- [x] KDS status update (RST-MOD-001): `POST /api/terminal/kds/items/:id/status` — validates transitions
      (new→preparing, preparing→ready, ready→served); 422 on invalid transition;
      emits `kds:item_status_changed` + `floor:item_ready` (when ready) + `oss:order_updated` (to OSS room)
- [x] Existing KDS endpoints (`GET /api/kds/orders`, `PATCH /api/kds/orders/:id/status`,
      `KdsGateway` namespace `/kds`) **preserved untouched** — backward compat for non-restaurant businesses
- [x] WebSocket events wired into `TableSessionService`:
      RST-031 → `floor:table_opened`; RST-032 → `kds:items_added`;
      RST-034 (cancel) → `kds:item_cancelled`; RST-037 → `kds:items_transferred`;
      RST-038 → `floor:table_closed`
- [x] `OssService` + `OssController` — `GET /api/public/oss?location_id=` (no auth);
      preparing[] = sessions with any item in 'preparing' + direct txns in 'preparing';
      ready[] = sessions where all non-cancelled items are 'ready' + direct txns in 'ready'
- [x] 10 new unit tests across 3 spec files: `kds-items.spec.ts` (8 tests),
      `oss.service.spec.ts` (1 test), `event.gateway.spec.ts` (1 test)
- [x] `table-session.service.spec.ts` updated — EventGateway mock added; all 25 existing tests pass

**Part D — DONE**. 333 tests passing (28 suites).

- [x] `CheckoutService` at `src/modules/restaurant/checkout.service.ts`
- [x] Close table (RST-035): `POST /api/terminal/table-sessions/:id/close` — transitions `open→awaiting_payment`,
      sets `expected_split_count=1`, evaluates promotions, emits `floor:table_closed`,
      returns single `checkout_payload` with all non-cancelled items
- [x] Split bill (RST-036): `POST /api/terminal/table-sessions/:id/split` — three split types:
      `by_item` (groups items by `customer_id`), `even` (divides unit prices across N splits,
      split 0 absorbs rounding remainder to guarantee sum = original, TRAP 2 compliant),
      `custom` (validates no orphans, no duplicates per item_id);
      returns `checkout_payloads[]` with N entries
- [x] `table_session_id` added to `CreateTransactionDto`; wired into `createTransaction()`:
      pre-check validates session status before QR; inside QR: `SELECT FOR UPDATE` on session,
      count completed transactions (including current), conditionally `UPDATE status='paid'`
      — all inside the QueryRunner before commit to prevent concurrent split race (TRAP 4)
- [x] `dashboard:transaction_created` emitted post-commit for every transaction (table + direct)
- [x] `floor:session_paid` emitted post-commit when session transitions to paid
- [x] `EventGateway` injected into `TerminalService` (global via CommonModule, no module import needed)
- [x] `src/common/i18n/receipt-labels.ts` — label maps for fr/ar/en (subtotal, tax, total, invoice, etc.)
- [x] `receipt-builder.ts` updated: optional `language` param (default `'fr'`), `labels: ReceiptLabelSet`
      added to `ReceiptData` output
- [x] Error keys pattern applied to all new RST endpoints (e.g. `RST_SESSION_NOT_OPEN`,
      `RST_ORPHAN_ITEM_IN_SPLIT`, `RST_DUPLICATE_ITEM_IN_SPLIT`)
- [x] 24 new tests: `checkout.service.spec.ts` (20 cases across 5 describe blocks),
      4 new cases added to `terminal.service.spec.ts` (table session auto-transition, 2-way split,
      `dashboard:transaction_created`, `floor:session_paid`)

**Deferred items (documented, not blocking):**
- QR-code customer self-ordering — `table.qr_code` column exists, no endpoints (spec §14 out of scope)
- `audit_logs` table — currently `console.log` stubs; replace with DB writes in a cross-cutting pass

### Phase 10 — Restaurant Operations (DONE). 333 tests passing (28 suites).

### Reports Module (DONE). 378 tests passing.

See `docs/REPORTS_MODULE_REFERENCE.md` for complete build reference.
26 reports via single parametric endpoint, universal response schema.
- [x] Part A: Infrastructure + Sales reports (7 reports) — 350 tests passing (29 suites)
  - `src/common/utils/date-range.ts` — resolveDateRange (today/yesterday/last_7days/this_month/last_month/this_year/custom)
  - `src/common/i18n/report-labels.ts` — fr/ar/en label sets for all report columns and KPIs
  - `src/modules/reports/dto/report-query.dto.ts` — ReportQueryDto + UniversalReportResponse types
  - `src/modules/reports/reports.module.ts` + `reports.controller.ts` — `GET /api/business/reports/:reportId`
  - `src/modules/reports/reports.service.ts` — dispatcher: validates reportId, business-type gating, resolves date range
  - `src/modules/reports/generators/sales.generator.ts` — all 7 sales reports (sales-summary, sales-by-hour, sales-by-day, sales-by-month, sales-by-category, sales-by-product, sales-by-table)
  - `src/modules/reports/reports.service.spec.ts` — 17 tests: date-range resolution, business-type gating, schema shape, KPIs, i18n
- [x] Part B: Payments + Customers + Operations reports (11 reports) — 363 tests passing (29 suites)
  - `UniversalReportResponse` updated: `generated_at` + `meta` fields added; all Part A reports emit both
  - Business-type gating fixed: `sales-by-table` + `table-turnover` → restaurant+hotel; `kitchen-performance` → restaurant only
  - `salesByTable` avg_per_session fixed: subquery correctly sums split-bill transactions per session
  - `src/modules/reports/generators/payments.generator.ts` — payment-summary, cash-report, card-report
  - `src/modules/reports/generators/customers.generator.ts` — customer-summary, top-customers, customer-grades, loyalty-summary
  - `src/modules/reports/generators/operations.generator.ts` — employee-performance, kitchen-performance, table-turnover, voids-cancellations
  - 13 new tests: TRAP 5 empty-period, non-date-filtered cards (total_customers, outstanding_balance), business-type gating (kitchen/table-turnover), split-bill revenue_per_cover, voids by voided_by user, top-50 cap, restaurant-only cancelled-sessions table
- [x] Part C: TVA/Accounting + existing report wrappers + closeout (8 reports) — 378 tests passing (29 suites)
  - `report-query.dto.ts` — `page` + `limit` optional params (with @Max(500) guard)
  - `src/common/i18n/report-labels.ts` — extended with all Part C labels (fr/ar/en)
  - `src/modules/reports/generators/accounting.generator.ts` — tva-declaration, daily-close, invoice-register (paginated), tva-by-rate
  - `src/modules/reports/generators/existing-wrappers.generator.ts` — promotion-report, coupon-report, discount-write-offs, points-exchange-report (all call existing service methods)
  - `reports.service.ts` — all 26 report IDs wired in dispatcher, none returns REPORT_NOT_IMPLEMENTED
  - `reports.module.ts` — AccountingGenerator + ExistingWrappersGenerator registered; PromotionModule imported
  - 15 new tests in `reports.service.spec.ts` (Part C TVA & Accounting + Existing Wrappers suites)

### Phase 11A — Inventory Foundations (DONE). 421 tests passing (29 suites).

See extension spec §12 (INV-*) for requirement IDs.

- [x] Migration `1714009000000-AddInventoryFoundations` — 6 tables: unit_of_measures, warehouses,
      vendors, vendor_check_details, brands, nutrition_info + §13.3 indexes
- [x] 6 new entities: UnitOfMeasure, Warehouse, Vendor, VendorCheckDetail, Brand, NutritionInfo
- [x] `InventoryService` — 23 endpoints across: UoM CRUD (INV-001-004), Warehouse CRUD (INV-010-014),
      Vendor CRUD (INV-020-027, with VendorCheckDetail create/list), Brand CRUD (INV-030-033),
      NutritionInfo CRUD (INV-035-036), Product enrichment: getInventoryProduct/update (INV-037-038)
- [x] `InventoryController` — all endpoints under `/api/business/inventory/*`
- [x] `InventoryModule` registered in AppModule
- [x] 43 unit tests across all service methods

### Phase 12A — Stock Engine (DONE). 497 tests passing (37 suites).

See extension spec §12 (INV-040–INV-096) for requirement IDs.

**Migration + Entities:**
- [x] Migration `1714010000000-AddStockEngine` — 8 tables:
      stock_batches, stock_movements, purchase_orders, purchase_order_items,
      stock_templates, stock_template_items, expiration_alerts, stock_discrepancy_alerts;
      businesses.expiration_alert_lead_days INT DEFAULT 7; FIFO index on stock_batches;
      deferred FK: stock_batches.purchase_order_id added via ALTER TABLE after purchase_orders created
- [x] 8 new entities: StockBatch, StockMovement, PurchaseOrder, PurchaseOrderItem,
      StockTemplate, StockTemplateItem, ExpirationAlert, StockDiscrepancyAlert

**Services + Controllers:**
- [x] `StockBatchService` + `StockBatchController` — INV-040-044:
      listBatches (paginated+filtered), receiveBatch (atomic QR: batch + receive movement),
      adjustBatch (raw SQL UPDATE + adjustment movement), disposeBatch (422 guard + movement),
      transferBatch (atomic QR: decrement source, new target batch, two movements)
- [x] `StockTemplateService` + `StockTemplateController` — INV-060-065:
      full template CRUD + generatePurchaseOrder (from template → draft PO with items)
- [x] `PurchaseOrderService` + `PurchaseOrderController` — INV-070-077:
      listPurchaseOrders (paginated+filtered), getPurchaseOrder, createPurchaseOrder (PO# generated:
      PO-YYYY-NNNN), updatePurchaseOrder (draft only, replace-set items), sendPurchaseOrder (→sent),
      confirmPurchaseOrder (sent/draft→confirmed), receivePurchaseOrder (create batches+movements,
      auto-transition to partially_received/received), cancelPurchaseOrder (422 if items received)
- [x] `AlertService` + `AlertController` — INV-081-082, INV-094-096:
      listExpirationAlerts/resolveExpirationAlert (422 if already resolved),
      listDiscrepancyAlerts/resolveDiscrepancyAlert (3 action types: manual_recount, accept_loss, adjust_batch)

**FIFO + Background Jobs:**
- [x] `StockConsumptionService` (SEPARATE service, NOT inline in TerminalService) — INV-050:
      consumeForTransaction(qr, businessId, locationId, transactionId, items, productMap, sourceOrigin):
      warehouse lookup via linked_location_id, skips gracefully if no warehouse, skips if !track_stock,
      FIFO walk (expires_at ASC NULLS LAST, received_at ASC), discrepancy alert on shortfall;
      helpers: findExpiringBatches, findNegativeBatches, findRecentOfflineSyncBatches (for processors)
- [x] FIFO hook in `TerminalService.createTransaction()`: inside QR try block, inner try-catch wraps
      the consumeForTransaction call — FIFO errors are SWALLOWED and NEVER block a sale (INV-050)
- [x] `ExpirationScanProcessor` (BullMQ `@Processor('inventory-expiration-scan')`) — INV-080:
      daily scan, creates expires_soon/expired alerts per batch, idempotent (skips existing unresolved)
- [x] `ReconciliationProcessor` (BullMQ `@Processor('inventory-reconciliation')`) — INV-095:
      daily scan, creates discrepancy alerts for negative batches (system_detected) and
      offline_sync movements that caused negative stock (offline_sync); idempotent
- [x] `StockSchedulerService` (`OnModuleInit`): schedules both queues via BullMQ repeat.pattern
      (expiration: '0 1 * * *', reconciliation: '0 2 * * *')

**Inventory Reports (wired into existing ReportsModule):**
- [x] `InventoryReportsGenerator` — 4 new reports in `reports.service.ts` dispatcher:
      stock-position (INV-090): current qty+value by product, low_stock_only filter;
      stock-movements (INV-091): paginated movement history with movement_type/warehouse/product filters;
      vendor-purchases (INV-092): spend per vendor from purchase_orders (cancelled excluded);
      input-tva (INV-093): TVA grouped by rate from purchase_order_items (XCC-018: calendar dates)
- [x] `report-query.dto.ts` extended with optional inventory params: warehouse_id, product_id,
      category_id, vendor_id, movement_type, low_stock_only

### Phase 12B — Transfer Documents & Adjustment Approvals (DONE). 527 tests passing (39 suites).

See extension spec §12 (EXT-INV-010–025) for requirement IDs.

- [x] Migration `1714011000000-AddStockTransfersAndAdjustments` — 4 tables:
      stock_adjustments, stock_adjustment_items, stock_transfers, stock_transfer_items;
      `stock_adjustment_approval` feature flag inserted (disabled) for all business types
- [x] 4 new entities: StockAdjustment, StockAdjustmentItem, StockTransfer, StockTransferItem
- [x] `StockBatchService` extended: `applyBatchAdjustmentInQr` and `executeBatchTransferInQr`
      (shared atomic batch-manipulation logic used by both new services)
- [x] `adjustBatch()` gated by `stock_adjustment_approval` feature flag (EXT-INV-015)
- [x] `StockAdjustmentService` + `StockAdjustmentController` — 7 operations (EXT-INV-010–016):
      listAdjustments, getAdjustment, createAdjustment (draft + items with quantity snapshot),
      submitAdjustment (draft→pending_approval), approveAdjustment (pending_approval→approved),
      postAdjustment (approved→posted, applies deltas atomically with SELECT FOR UPDATE),
      rejectAdjustment (pending_approval→rejected with reason)
- [x] `StockTransferService` + `StockTransferController` — 6 operations (EXT-INV-020–025):
      listTransfers, getTransfer, createTransfer (draft + item batch validation per source WH),
      postTransfer (draft→posted with SELECT FOR UPDATE, immutable after),
      cancelTransfer (draft→cancelled), deleteTransfer (hard-delete draft only)
- [x] `InventoryModule` updated: 4 new entities in TypeOrmModule.forFeature, 2 new services,
      2 new controllers registered
- [x] 15 tests for StockAdjustmentService (stock-adjustment.service.spec.ts)
- [x] 15 tests for StockTransferService (stock-transfer.service.spec.ts)

### Phase 12C — Vendor Payments (DONE). 545 tests passing (40 suites).

See extension spec §12 (EXT-INV-030–036) for requirement IDs.

- [x] Migration `1714012000000-AddVendorPayments` — 1 table: vendor_payments;
      4 indexes including unique (business_id, payment_number)
- [x] `VendorPayment` entity — 15 spec columns; no updated_at (payments immutable after void)
- [x] `VendorPaymentService` — 7 methods:
      listPayments (paginated + filterable by vendor/PO/status/date),
      getPayment (cross-tenant 404),
      createPayment (validates vendor + PO ownership, atomic QR for VP-YYYY-NNNNN numbering),
      confirmPayment (pending→confirmed, sets confirmed_by + confirmed_at),
      voidPayment (any non-voided→voided, audit console.log stub),
      getVendorOutstanding (raw SQL subquery, balance_due > 0, ordered by expected_delivery_date ASC NULLS LAST),
      getVendorPaymentSummary (3 raw queries: total_paid, total_outstanding, avg_days_to_pay)
- [x] `VendorPaymentController` — @Controller('business'), 7 routes under vendor-payments/ and vendors/:vendorId/
- [x] `getPurchaseOrder` enriched with computed `amount_paid` + `balance_due` via try/catch-guarded dataSource.query
      (degrades gracefully to 0/total_ttc when mock lacks query — preserves all existing tests)
- [x] `InventoryModule` updated — VendorPayment entity, VendorPaymentService, VendorPaymentController registered
- [x] 18 new tests: 16 in vendor-payment.service.spec.ts + 2 PO enrichment tests in purchase-order.service.spec.ts

### Phase 12D — COGS, Vendor Balance & Bill Aging Reports (DONE). 549 tests passing (40 suites).

- [x] `as_of_date` optional param added to `ReportQueryDto` (YYYY-MM-DD format; used by vendor-balance and bill-aging)
- [x] `InventoryReportsGenerator.cogs()` — 2-query approach: stock_movements JOIN batches for cost, transaction_items for revenue; merged in TypeScript; By Product + By Category tables; summary: total COGS, revenue, gross profit, margin %
- [x] `InventoryReportsGenerator.vendorBalance()` — single raw SQL with aggregated LEFT JOINs to purchase_orders and vendor_payments; supports as_of_date; HAVING balance_due > 0 filters fully-paid vendors
- [x] `InventoryReportsGenerator.billAging()` — single raw SQL; GREATEST(0,...) for days_overdue; 4 aging buckets (0-30, 31-60, 61-90, 90+) via SQL CASE WHEN; COALESCE(payment_terms_days, 30) default; bucket totals aggregated in TypeScript
- [x] 3 new IDs registered in `ALL_REPORT_IDS` and dispatcher: 'cogs', 'vendor-balance', 'bill-aging'
- [x] 4 new tests in `reports.service.spec.ts` (1 per report + smoke test for all 3 new IDs)

### Phase 13 — Chain & Franchise (DONE). 575 tests passing (42 suites).

See extension spec §9 (CHN-001–052) for requirement IDs.

- [x] Migration `1714013000000-AddChainOperations`: `user_business_roles` (composite PK + FK constraints), `chain_sync_configs` (FK to businesses);
      `businesses.{parent_business_id, chain_role}`; `users.accessible_business_ids`;
      `synced_from_parent_id` on categories, products, product_variants, modifier_groups, modifiers, promotions;
      partial unique indexes for ON CONFLICT upserts (products, categories, product_variants)
- [x] 2 new entities: `UserBusinessRole`, `ChainSyncConfig`; 7 existing entities updated; `Promotion` entity gets `synced_from_parent_id`
- [x] `ChainService` — 17 methods covering all CHN endpoints:
      getChainTree, promoteToParent, linkChild, unlinkChild (CHN-001–004);
      getAccessibleBusinesses, switchBusiness (re-issues JWT, super_admin bypass), grantBusinessAccess (CHN-010–012);
      getSyncConfig, setSyncConfig, triggerSync (BullMQ enqueue), getSyncJobStatus, getUnmappedProducts, pullProduct (CHN-020–024);
      rolloutPromotion with validateSubStores (PROM-040 TVA mismatch check, CHN-030);
      getChainDashboard, getChainTransactions (CHN-040–041);
      getParentVendorInfo, getIncomingPoRequests, fulfillChildPo (CHN-050–052)
- [x] `ChainSyncProcessor` (BullMQ `chain-sync` queue): upserts categories/products to children; sets `tva_rate=NULL` per CHN-MOD-006; per-child error isolation
- [x] `ChainSuperController` — 4 routes under /api/super/businesses/* (super_admin only: CHN-001–004)
- [x] `ChainAuthController` — 2 routes under /api/auth/* (CHN-010–011)
- [x] `ChainController` — 13 routes under /api/business/* (CHN-012, CHN-020–052, PROM-040)
- [x] `chain.service.spec.ts` — 22 unit tests; `chain-sync.processor.spec.ts` — 4 processor tests
- Known gaps (deferred): token revocation list for CHN-011; modifier sync in pullProduct; internal TVA invoice for CHN-052

 