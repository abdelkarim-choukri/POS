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

1. `apps/backend/src/modules/terminal/terminal.service.ts` has the
   `KdsService` import duplicated ~12 times. Will not compile. Fix first.
2. SRS §3.7 TVA columns are NOT yet in the schema (ICE, IF, invoice_counter,
   total_ht/tva/ttc on transactions, tva_rate on transaction_items, etc.).
   The `AddTvaCompliance` migration must land before any extension work.
3. `packages/shared` workspace is referenced in the README but doesn't exist.
   Scaffold it during Phase 0 / 5.
4. No background job infrastructure exists yet. BullMQ + Redis must land
   in Phase 5 (per [XCC-050]) since Phase 6 onward depends on it.

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

### Phase 0 — Repo hygiene (PENDING)

- [ ] Fix `terminal.service.ts` duplicated `KdsService` imports
- [ ] Scaffold `packages/shared` workspace with TypeScript build setup
- [ ] Verify Docker dev environment (`docker compose up` brings everything up)
- [ ] Confirm backend container starts and connects to Postgres + Redis
- [ ] Add a `/api/health` endpoint that pings DB and Redis

### Phase 5 — TVA Foundation (PENDING — prerequisite for all extension work)

See extension spec §14, Phase 5.

### Phases 6-15 — see extension spec §14 (PENDING)

Order: 6 (CUST) → 7 (PROM+CPN) → 8 (PEX) → 9 (COM) → 10 (RST) → 11+12 (INV) → 13 (CHN) → 14 (REC) → 15 (ADM).