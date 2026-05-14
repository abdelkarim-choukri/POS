# POS System — Backend Development

## What this project is

Multi-tenant POS system targeting Morocco's Finance Law 50-25 / TVA compliance.
Five business types: Retail, Restaurant/Café, Pharmacy, Salon/Spa, Hotel.

The repo is a monorepo (npm workspaces):

- `apps/backend/` — NestJS + TypeORM + PostgreSQL (this is what we work on here)
- `apps/dashboard-web/` — React + Vite (handled by frontend teammate)
- `apps/terminal-app/` — React kiosk for cashiers (handled by frontend teammate)
- `packages/shared/` — TypeScript types and DTOs shared between backend and frontend

Development environment runs in Docker via `docker compose up` from the repo root.
Postgres on `:5432`, Redis on `:6379`, backend on `:3000`. The frontend teammate
runs `apps/dashboard-web/` and `apps/terminal-app/` natively on his machine
(not in Docker) so Vite hot-reload works at full speed; both connect to the
backend at `http://localhost:3000`.

---

## My role on this project

I work ONLY on the backend (`apps/backend/`). My teammate handles the frontend
(`apps/dashboard-web/` and `apps/terminal-app/`). When working with me, Claude should:

- NOT modify files in `apps/dashboard-web/` or `apps/terminal-app/`
- NOT run frontend dev servers or build commands
- When a feature touches both backend and frontend, implement only the backend
  side and add a clear note in `packages/shared/` describing the API contract
  the frontend will need to use
- Tell me when something I'm asking for is actually frontend work, so I can
  send it to my teammate instead

The one exception: `packages/shared/` is shared territory. Adding DTOs and
types there is part of backend work, since the backend defines the contract.

---

## Authoritative specs — READ BEFORE PLANNING OR IMPLEMENTING

- **`docs/spec/POS_SRS_v1_0.docx`** — Software Requirements Specification v1.0.
  Defines TVA compliance, multi-tenant model, terminal sync, role hierarchy,
  payment integration. The base contract.

- **`docs/spec/POS_Extension_Spec_v1_1.md`** — Extension Features Spec v1.1.
  ~3400 lines. 19 sections. Defines all loyalty, promotions, coupons, points
  exchange, restaurant operations, inventory, chain, recommendations,
  communications, and platform admin features built on top of the SRS.

- **`docs/phase-10-reference.md`** — Phase 10 (Restaurant Operations) build
  reference. Contains all API contracts, migration SQL, WebSocket events,
  split-bill logic, KDS refactor rules, i18n foundation, and implementation
  traps. **Read this file FIRST for any Phase 10 work — it supersedes the
  extension spec §7 for implementation details.**

- **`docs/REPORTS_MODULE_REFERENCE.md`** — Reports Module build reference. Contains
  the universal response schema, all 26 report definitions with SQL sources,
  date range utility, i18n labels, and business-type gating rules.
  **Read this file FIRST for any reports work.**

  Key sections to know by number:
  - **§2** — Cross-cutting concerns (XCC-001 through XCC-062). Includes the
    discount pipeline (XCC-017), TVA-vs-cutoff temporal rule (XCC-018),
    background jobs (XCC-050+), permission keys (XCC-060+).
  - **§13** — Master schema list. Single source of truth for migrations.
    §13.1 = new tables, §13.2 = column additions, §13.3 = required indexes
    (the unique-constraint audit), §13.4 = ordered migration sequence.
  - **§14** — Implementation phases. Phase 5 (TVA) is a hard prerequisite for
    all extension work (Phases 6-15).
  - **§16** — Open questions and risks. Most are LEGAL items requiring
    counsel before go-live. Three were CLOSED with v1.1 decisions.
  - **§18** — Endpoint catalogue. Every URL with its requirement ID.

When implementing a feature, locate its requirement ID (e.g. `[CUST-051]`) in
the extension spec, read the FULL requirement including referenced MOD entries
and cross-cutting requirements (XCC-*), THEN start coding.

**If you cannot find a requirement ID in the spec, STOP and ask. Do not invent
requirements or assume what the spec might say.**

### Which spec to read

- Anything with prefix `XCC-`, `CUST-`, `PROM-`, `CPN-`, `PEX-`, `COM-`, `RST-`,
  `INV-`, `CHN-`, `REC-`, `ADM-` → Extension Spec v1.1
  (`docs/spec/POS_Extension_Spec_v1_1.md`)
- TVA compliance, terminal sync, role hierarchy, payment integration baseline,
  multi-tenancy foundation → SRS v1.0 (`docs/spec/POS_SRS_v1_0.docx`)
- When unsure, read SRS first (it's the contract); the Extension builds on it.

---

## How to run the project

Development uses Docker:

```bash
bash scripts/start-dev.sh   # Brings up Postgres + Redis + backend in Docker
bash scripts/stop-dev.sh    # Stops everything
```

Backend runs at `http://localhost:3000` with hot-reload via volume mount.
Database accessible at `localhost:5432`, Redis at `localhost:6379`.

Common commands inside the running backend container:

```bash
# Tail backend logs
docker compose logs -f backend

# Open a shell inside the backend container
docker exec -it pos-backend sh

# Open psql against the database
docker exec -it pos-postgres psql -U pos_user -d pos_db

# Generate a TypeORM migration
docker compose exec backend npm run migration:generate -- src/migrations/AddXyz --workspace=apps/backend

# Run migrations
docker compose exec backend npm run migration:run --workspace=apps/backend

# Run backend tests
docker compose exec backend npm test --workspace=apps/backend
```

---

## Testing

- **Unit tests** live next to the file being tested as `*.spec.ts`.
- **E2E tests** live in `apps/backend/test/*.e2e-spec.ts`.
- Run the full suite: `docker compose exec backend npm test --workspace=apps/backend`.
- **Every new feature must have a test covering the happy path.**
- **Every multi-tenant endpoint must have a cross-tenant access test** that
  expects a `404` response (not 403 — see Multi-tenancy rule below).

---

## Project conventions

### Backend stack

- NestJS modules in `apps/backend/src/modules/`
- TypeORM entities in `apps/backend/src/modules/<module>/entities/`
- DTOs in `apps/backend/src/modules/<module>/dto/`
- Migrations in `apps/backend/src/migrations/`. Naming: `<unix-timestamp-ms>-<PascalCaseName>.ts`
- All migrations reversible (working `up` AND `down` methods).
- Background jobs use BullMQ with Redis (added in `AddBackgroundJobInfrastructure` migration).

### Multi-tenancy (NON-NEGOTIABLE)

- Every new table has `business_id UUID NOT NULL` per [XCC-001].
- Every endpoint under `/api/business/` and `/api/terminal/` scopes by the
  JWT's `business_id` claim per [XCC-002]. Cross-tenant access returns 404,
  never 403 (avoids leaking existence).
- Every test suite must include a cross-tenant access attempt that confirms
  the 404 response.

### TVA compliance (NON-NEGOTIABLE)

- Per-line TTC stored is POST-discount (XCC-010).
- Order-level discounts distributed proportionally with banker's rounding
  to 2 decimals (XCC-011).
- Discount pipeline order is FIXED: grade → promotion → coupon (XCC-017).
- Points are NEVER a payment method, only a discount (XCC-014).
- Daily settlement cutoff applies to OPS reports only. TVA reports use
  calendar date because that is what DGI audits against (XCC-018).

### Money and dates

- MAD amounts: `NUMERIC(12,2)`, banker's rounding to 2 decimals.
- Per-line money: `NUMERIC(12,2)`. Per-unit cost: `NUMERIC(12,4)` (4 decimals
  for unit-level precision before quantity multiplication).
- Timestamps: `TIMESTAMPTZ` (with timezone). All API responses use ISO 8601 UTC.
- Calendar dates for TVA filings; cutoff-adjusted dates for daily ops only.

### Permissions

- Stored in `users.permissions JSONB` per [XCC-060].
- Use the `userHasPermission(user, key)` helper — never read the column
  directly in business logic.
- Canonical keys list in [XCC-062]. New keys can be added without migrations.

### Shared types

- Anything that crosses the backend/frontend boundary lives in
  `packages/shared/`.
- When you add a new DTO to the backend, also add it to
  `packages/shared/src/api/<module>.ts` with the same shape.
- The frontend imports from `@pos/shared` — type drift = build break = caught
  at compile time, not runtime.

### Commit messages

Format: `<phase>: <short description> (<requirement-id>)`

Examples:
- `phase-0: fix duplicated KdsService imports`
- `phase-5: add ICE/IF columns to businesses table (XCC-010)`
- `phase-6: implement customer grade endpoints (CUST-051, CUST-052)`

---

## Known issues to fix in Phase 0 (before any other work)

> **When fixing a known issue below, REMOVE it from this list as part of the
> same commit.** This list should always reflect what's still pending, not
> what's been done.

*(All known issues resolved.)*

## Build gotchas (do not revert)

- **tsbuildinfo stale cache**: The backend Dockerfile CMD must include
  `rm -f tsconfig.build.tsbuildinfo` before `npx nest start --watch`.
  Without this, Docker volume-mounted incremental builds skip emit on
  container restart, causing `Cannot find module dist/main`. Never commit
  `*.tsbuildinfo` files — they're in .gitignore.
- **Always use `npx nest build -p tsconfig.build.json`** for manual builds,
  never bare `tsc`. The tsconfig.build.json excludes spec files from output.
- **Curl test sequences**: When running multi-step curl tests, combine all
  steps into a single bash script. Login once, store the token, reuse it.
  Don't run separate bash commands for each step.
- **npm in China**: Always use `--registry=https://registry.npmmirror.com`
  when installing npm packages.
---

## How to ask Claude Code to do work

For each phase, give a focused prompt:

- **What spec section and requirement IDs to implement.**
- **What is OUT of scope** (so Claude doesn't drift into adjacent work).
- **What tests should pass.**
- End with: **"Plan first, then implement. Show me the plan before writing code."**

Claude will read the requirement IDs in full from the spec, propose a plan as
a checklist, wait for approval, then implement. It will not skip ahead.

---

## graphify (knowledge graph)

A graphify knowledge graph MAY exist at `graphify-out/GRAPH_REPORT.md`.

- If it exists: read it before searching files for architectural questions.
- If it does NOT exist: skip — no graph has been built yet. The repo is
  currently small enough that direct file reading is faster than building
  a graph. The graph will be built once the codebase reaches ~50+ files of
  meaningful code (around end of Phase 6 in the implementation plan).

---

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

### Phases 11-15 — see extension spec §14 (PENDING)

Order: 11+12 (INV) → 13 (CHN) → 14 (REC) → 15 (ADM).

## Planned cross-cutting features (post Phase 15)

These are NOT part of any current phase. They will be implemented as a
single pass after core modules are complete.

1. **Real-time dashboard** — WebSocket EventGateway foundation added in Phase 10.
   Remaining: emit events from all services (not just RST). Frontend: teammate.

2. **i18n (Arabic, French, English)** — Foundation added in Phase 10:
   users.language_preference column, receipt-labels.ts, error key pattern.
   Remaining: apply error keys to all existing endpoints. Frontend: react-i18next,
   RTL layout, translation files.