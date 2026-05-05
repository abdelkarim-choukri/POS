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

### Phase 7 — Promotions & Coupons (IN PROGRESS — Part A done)

**Part A — DONE** (migrations 3+4 applied)

- [x] BullMQ + Redis infrastructure: `JobModule` (@Global), `JobService`, `RedisLockService` (XCC-050–XCC-055)
- [x] Migration `1714003000000-AddBackgroundJobInfrastructure` — `background_jobs` table + partial unique index (XCC-051, XCC-052)
- [x] Migration `1714004000000-AddPromotionsAndCoupons` — 6 new tables: promotions, promotion_redemptions, coupon_types, coupons, coupon_redemptions, discount_write_offs + all §13.3 indexes + businesses.promotion_stacking_mode (PROM-MOD-002)
- [x] 7 new entities: BackgroundJob, Promotion, PromotionRedemption, CouponType, Coupon, CouponRedemption, DiscountWriteOff
- [x] `GET /api/business/jobs/:id` — job status polling, scoped to business (XCC-055)
- [x] Promotion CRUD: PROM-001–007 (list+filter+is_currently_running, detail+stats, create, update with locked-fields guard, activate, pause, archive)
- [x] `PromotionEvaluatorService.evaluate()` — full 11-step filter chain including Moroccan holiday list (2026) and blackout periods; `evaluateWithStackingMode()` respects best_only vs stack (PROM-020, PROM-021)

**Part B — PENDING** (coupon CRUD, createTransaction integration, terminal endpoints)

### Phases 8-15 — see extension spec §14 (PENDING)

Order: 8 (PEX) → 9 (COM) → 10 (RST) → 11+12 (INV) → 13 (CHN) → 14 (REC) → 15 (ADM).

## Planned cross-cutting features (post Phase 15)

These are NOT part of any current phase. They will be implemented as a
single pass after core modules are complete.

1. **Real-time dashboard** — WebSocket event gateway emitting events
   (transaction:created, customer:created, etc.) from all services.
   Dashboard subscribes and updates live. Backend: ~1 session. Frontend: teammate.

2. **i18n (Arabic, French, English)** — Backend: add users.language_preference
   column, refactor error messages to translation keys. Frontend: react-i18next,
   RTL layout for Arabic, translation files. Backend: ~1 session. Frontend: significant.