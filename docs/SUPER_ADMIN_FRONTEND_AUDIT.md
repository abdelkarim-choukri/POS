# Super Admin Console — Frontend Architecture Audit & Refactor Plan

**Date:** 2026-06-01
**Scope:** `apps/frontend/admin-dashboard-ui-v3` (Next.js 16 App Router, React 19)
**Author:** Claude Code
**Cross-referenced:** `docs/spec/POS_Extension_Spec_v1_1.md` (ADM-001–ADM-071),
`docs/superpowers/plans/2026-05-19-phase-15-platform-admin.md`,
`docs/FRONTEND_QUICKSTART.md`, `docs/ERROR_CODES.md`

---

## 0. Executive Summary

The Super Admin console **already renders as a self-contained component**
(`super-admin-page.tsx`, 11 tabs) but is **not structurally isolated**:

1. **File nesting** — all 8 super-admin components live in the shared
   `components/` folder beside ~50 merchant components.
2. **Navigation leak** — the *merchant* layout's sidebar mounts 7 super-only
   pages (an entire "ADMIN" group + "Terminals" + a "Super Admin" link +
   "Platform Notices"). A business user can navigate into platform-admin
   screens; only the backend's 401/403 stops the data calls.
3. **Auth is cosmetic** — `isSuperAdmin` is derived from *which login button was
   clicked*, not from the JWT or `/api/auth/me`. It is **not persisted**, so a
   super admin who refreshes the page is dropped into the *merchant* dashboard.
4. **No TanStack Query** — `@tanstack/react-query@5.100` is installed but never
   imported. Every screen hand-rolls `useState`/`useEffect` + raw `apiFetch`.
5. **No real routing** — the whole app is one 1,911-line `app/page.tsx` that
   switches "pages" via a `useState` string. There is no routing table to
   update; isolation means *introducing* App Router segments.

The decided remediation (confirmed with stakeholder): **carve out a real Next.js
route segment `app/super-admin/`** with its own layout, QueryClient provider, and
auth guard; move the 8 super components into `components/super-admin/`; and
migrate data fetching to TanStack Query with `recharts` (already installed) for
high-density graphs.

---

## 1. Current State Analysis

### 1.1 Data fetching

- **Single primitive:** `lib/api.ts` exports `apiFetch<T>(path, init)` — a thin
  `fetch` wrapper. It is the *only* data-access layer; there is no client cache,
  no request dedup, no background refetch, no `staleTime`.
- **Pattern per screen:** every component (including all super tabs) repeats:
  ```
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  useEffect(() => { setLoading(true); apiFetch(...).then(setData).catch(...).finally(...) }, [])
  ```
  In `super-admin-page.tsx` this appears ~11 times (one per tab) plus again
  inside `ConfigTab` (4 sub-sections) and `SubscriptionsTab`.
- **Mutations** are inline `apiFetch(url, { method: 'POST'|'PATCH'|'DELETE' })`
  calls followed by manual re-fetch of the list. No optimistic updates, no
  cache invalidation, frequent "refetch the whole list after one edit".
- **Consequence:** switching away from and back to a tab re-hits the network
  every time; no data is shared between the merchant SPA and the super console.

### 1.2 Authentication tokens

- `lib/api.ts` holds a **module-singleton** `token` mirrored into
  `localStorage` under `dash_token` / `dash_refresh_token`.
- `apiFetch` lazy-loads the token from `localStorage`, attaches
  `Authorization: Bearer`, and on **401** performs a **single-flight refresh**
  against `POST /api/auth/refresh`, then retries the original request once. On
  refresh failure it clears tokens and throws `ApiError(401, ...)`.
- **Storage choice:** `localStorage` (readable by any script → XSS-exposable).
  Acceptable for an internal dashboard but worth a documented decision.
- There is **no central 401→redirect-to-login**; each caller catches the thrown
  `ApiError`. The SPA only returns to the login screen on explicit sign-out or
  initial "no token" check.

### 1.3 State management

- **No global store** (no Redux/Zustand/Context for app data). Theme is the only
  context (`next-themes` via `ThemeProvider` in `app/layout.tsx`).
- App-level state lives in `app/page.tsx::App()`:
  `page`, `selectedId`, `isAuthenticated`, `isSuperAdmin`, `authChecked`.
- The super console keeps **all its state local** to `super-admin-page.tsx`
  (`activeTab` + per-tab data/loading/error). It is genuinely standalone at
  runtime — `App()` short-circuits to `<SuperAdminPage/>` and never mounts the
  merchant `MainLayout`.

### 1.4 Where the Super Admin code physically lives (the flaw)

| Component | Endpoints | Layer | Reachable from merchant nav? |
|---|---|---|---|
| `super-admin-page.tsx` (+ `ConfigTab`, `SubscriptionsTab`) | `/api/super/dashboard/stats`, `/businesses`, `/terminals`, `/audit-logs`, `/announcements`, `/subscriptions`, `/business-types`, `/trade-categories`, `/couriers`, `/system-parameters`, `/version-log` | **SUPER** | via "Super Admin" link (`super-dashboard`) |
| `terminals-page.tsx` | `/api/super/terminals`, `/terminals/health`, `/terminals/:id/assign` | **SUPER** | ⚠️ wired as merchant "Terminals" |
| `trade-categories-page.tsx` | `/api/super/trade-categories*` | **SUPER** | ⚠️ ADMIN group |
| `couriers-page.tsx` | `/api/super/couriers*` | **SUPER** | ⚠️ ADMIN group |
| `system-parameters-page.tsx` | `/api/super/system-parameters*` | **SUPER** | ⚠️ ADMIN group |
| `version-log-page.tsx` | `/api/super/version-log/*` | **SUPER** | ⚠️ ADMIN group |
| `custom-authority-page.tsx` | `/api/super/businesses/:id/custom-authority` | **SUPER** | ⚠️ ADMIN group |
| `admin-announcements-page.tsx` | `/api/super/announcements*` | **SUPER** | ⚠️ ADMIN group ("Admin Notices") |
| `platform-announcements-page.tsx` | `/api/business/platform-announcements*` | **MERCHANT** (view/dismiss) | ✅ correct |
| `chain-page.tsx` | mostly `/api/business/chain/*` **+** `/api/super/businesses/*` (promote/link/unlink/chain-tree) | **MIXED** ⚠️ | merchant "Chain" |

**Two real defects surfaced by the table:**
- **`terminals-page.tsx`** uses `/api/super/*` yet is the merchant "Terminals"
  screen → a business user's terminal page calls platform endpoints and will
  fail with 401/403. The merchant terminal view and the platform fleet monitor
  have been conflated.
- **`chain-page.tsx`** (a merchant/parent-business screen) calls four
  `/api/super/businesses/*` endpoints. Promote/link/unlink are platform-admin
  operations; calling them from the business layer will 403 for non-super users.
  (Matches the known memory note that `/super/businesses/chain-tree` is also
  route-shadowed on the backend.)

---

## 2. Database Schema & Backend Alignment

Backend source of truth: Phase 15 migration `1714015000000-AddPlatformAdminEnhancements`
and `PlatformAdminModule` (3 controllers: `super` / `business` / `auth`).

| Backend entity / table | Key columns | Frontend interface (in `super-admin-page.tsx`) | Alignment |
|---|---|---|---|
| `businesses` | `id`, `name`, `status`, `chain_role`, `parent_business_id`, `trade_category_id`, `daily_settlement_cutoff_time` | `interface Business` | OK; FE should surface `trade_category_id` + cutoff (currently partial) |
| `trade_categories` | `id`, `parent_id`, `name`, `code`, `default_business_type_id`, `is_active`, `sort_order` | `interface TradeCategory` (`name_fr`, `name_ar`, `icon_name`, `sort_order`) | ⚠️ **drift**: FE expects `name_fr`/`name_ar`/`icon_name`; backend table has `name`/`code`. Verify the `/trade-categories/tree` response shape vs FE. |
| `couriers` | `id`, `name`, `code`, `logo_url`, `api_endpoint`, `tracking_url_template`, `supports_cash_on_delivery`, `is_active` | `interface Courier` (`phone`, `email`, `website`, `notes`) | ⚠️ **drift**: FE form fields (`phone/email/website/notes`) don't match backend columns (`code/logo_url/api_endpoint/...`). Reconcile DTO. |
| `business_courier_links` | composite PK `(business_id, courier_id)` | — | not surfaced in console yet |
| `business_custom_authority` | `business_id` PK, `feature_overrides_json`, `permission_overrides_json` | `custom-authority-page.tsx` | OK (per-business override editor) |
| `system_parameters` | key/value | `interface SystemParameter` | OK |
| `version_log_menus` / `version_log_entries` | changelog | `version-log-page.tsx` | OK |
| `morocco_regions` | `id`/`parent_id` VARCHAR(50), 3 levels | login "validate region" tool | OK (uses `/api/auth/regions/validate`) |
| **Capital report** | `capital-detail` generator in **ReportsModule**, **business-scoped** (`/api/business/reports`), accepts `as_of_date` | — | ❗ **Gap**: capital-detail is a *merchant* report, not a super endpoint. It is **not surfaced anywhere in the UI yet**. Belongs on the merchant Reports page, not the super console. |
| `subscriptions` | `/api/super/subscriptions*` (FE assumes) | `SubscriptionsTab` | ❗ **Verify**: confirm backend actually exposes `/api/super/subscriptions`. If not implemented, this tab is calling a non-existent endpoint. |

**Action items from alignment:**
- A1. Reconcile `TradeCategory` and `Courier` FE interfaces against the real
  backend response shapes (likely the largest source of runtime bugs).
- A2. Confirm `/api/super/subscriptions` exists; if not, either implement
  backend or gate the Billing tab.
- A3. Wire `capital-detail` into the **merchant** Reports page (not super).

---

## 3. Authentication & Authorization Guarding

### 3.1 How a platform-operator session is established today

1. Login screen has a **Business / Super Admin** toggle (`loginType`).
2. Submitting calls `/api/auth/super-admin/login` (super) or `/api/auth/login`
   (business). Both return `{ access_token, refresh_token }`.
3. On success: `onLoginSuccess(loginType === 'super')` sets
   `isSuperAdmin = true`.
4. `App()` gate: `if (isSuperAdmin || page === 'super-dashboard') return <SuperAdminPage/>`.

### 3.2 Weaknesses (all client-side; real enforcement is backend-only)

- **G1 — Role not derived from identity.** `isSuperAdmin` reflects which button
  was pressed, never the JWT claim or `/api/auth/me`. A token's actual authority
  is never read on the client.
- **G2 — Refresh drops super role.** On reload, `loadToken()` sets
  `isAuthenticated = true` but `isSuperAdmin` resets to `false` → **a logged-in
  super admin is silently dropped into the merchant dashboard.** Critical UX bug.
- **G3 — Merchant→super leak via `|| page === 'super-dashboard'`.** Any
  authenticated business user clicking the "Super Admin" sidebar item renders
  the entire super console shell. Data calls 401/403, but the platform UI is
  exposed (information disclosure of the admin surface).
- **G4 — Super-only pages in merchant nav.** The 7 components in §1.4 are
  reachable from the merchant sidebar.
- **G5 — No route guard / middleware.** Because there is no router, there is no
  `middleware.ts`, no per-route protection, no redirect-on-401. Protection is a
  single boolean.
- **G6 — Token in `localStorage`.** XSS-exposable (documented tradeoff).

### 3.3 Target guarding model (post-isolation)

- Introduce `app/super-admin/layout.tsx` as a **server-aware guard boundary**:
  read role from the JWT (decode `access_token` claims client-side **and** verify
  via `/api/auth/me` on mount), redirect non-super sessions to `/` (merchant) and
  unauthenticated sessions to `/login`.
- Persist a derived `auth` snapshot (`{ isSuperAdmin, businessId, role }`) in a
  small context/store hydrated from `/api/auth/me`, so refresh preserves role
  (fixes **G2**).
- Remove all 7 super items from the merchant sidebar (fixes **G3/G4**); link to
  `/super-admin` only when `role === super_admin`.

---

## 4. TanStack Query & Graphy (recharts) Integration Plan

> "Graphy" = the graphing layer. **`recharts@2.15` is already installed** and is
> the pragmatic choice (composable, SSR-friendly, already a dependency). No new
> charting lib needed unless higher density is required later (then consider
> `visx`/`@nivo`).

### Phase A — Foundations (no behavior change)
1. **A1.** Create `components/providers/query-provider.tsx` — a `"use client"`
   wrapper exporting a `QueryClientProvider` with a singleton `QueryClient`
   (`defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } }`).
2. **A2.** Wrap the super segment (and later the whole app) in it via
   `app/super-admin/layout.tsx`.
3. **A3.** Add an `auth` query: `useMe()` → `GET /api/auth/me`, the single source
   of `isSuperAdmin`/`role`/`businessId`. Fixes G1/G2.

### Phase B — Typed API + query-key factory
4. **B1.** `lib/super-admin/api.ts` — typed functions over `apiFetch` for every
   `/api/super/*` endpoint (return real DTOs; fix the §2 drift here).
5. **B2.** `lib/super-admin/query-keys.ts` — hierarchical keys, e.g.
   `superKeys.businesses.list(filters)`, `superKeys.terminals.health()`,
   `superKeys.config.couriers()`.

### Phase C — Convert the super console tab-by-tab
For each of the 11 tabs (start with the smallest, e.g. `couriers`):
6. **C1.** Replace `useState/useEffect/apiFetch` with `useQuery({ queryKey, queryFn })`.
7. **C2.** Replace inline POST/PATCH/DELETE + manual refetch with `useMutation`
   + `queryClient.invalidateQueries({ queryKey })` (optimistic where safe).
8. **C3.** Delete the now-dead local loading/error state; use `isPending`/`error`.
9. **C4.** Verify each converted tab against `docs/ERROR_CODES.md` — surface the
   structured `{ error: 'CODE' }` body (the `ApiError.message` already prefers
   `j.error`), mapped to human strings.

### Phase D — Graphs (recharts) on data-dense tabs
10. **D1.** **Overview tab** — replace stat cards-only view with:
    `ResponsiveContainer` + `AreaChart` (businesses/terminals growth from
    `/dashboard/stats` time series) and `BarChart` (terminals by health status).
11. **D2.** **Billing tab** — `LineChart` of MRR / subscription status mix
    (`PieChart`) from `/subscriptions`.
12. **D3.** **Analytics tab** — high-density combined chart; lazy-load with
    `next/dynamic(() => import(...), { ssr: false })` to keep first paint fast.
13. **D4.** Extract a reusable `components/super-admin/charts/` set
    (`StatAreaChart`, `StatusBarChart`, `DonutChart`) styled to the dark theme.

### Phase E — Hardening
14. **E1.** Central 401 handling: a query cache `onError` that, on `ApiError 401`,
    clears tokens and routes to `/login`.
15. **E2.** Add React Query Devtools in dev only.
16. **E3.** Smoke-test: super login → each tab loads via Query → mutate a courier
    → list invalidates → chart re-renders. Then merchant login → confirm **no**
    super nav items appear and `/super-admin` redirects away.

---

## 5. Proposed Isolation Structure (Step 1 execution target)

```
app/
  layout.tsx                      # root: ThemeProvider (unchanged)
  page.tsx                        # merchant SPA — strip super gate + super nav
  login/page.tsx                  # (optional) extract LoginScreen to a route
  super-admin/
    layout.tsx                    # QueryClientProvider + super auth guard
    page.tsx                      # super shell (was super-admin-page.tsx body)
components/
  super-admin/
    super-admin-page.tsx
    config-tab.tsx                # (extracted from super-admin-page.tsx)
    subscriptions-tab.tsx         # (extracted)
    terminals-page.tsx            # the SUPER fleet monitor (renamed/clarified)
    trade-categories-page.tsx
    couriers-page.tsx
    system-parameters-page.tsx
    version-log-page.tsx
    custom-authority-page.tsx
    admin-announcements-page.tsx
    charts/                       # recharts wrappers (Phase D)
lib/
  super-admin/
    api.ts
    query-keys.ts
  api.ts                          # shared apiFetch (unchanged)
components/providers/
  query-provider.tsx
```

**Merchant cleanup in `app/page.tsx`:** remove the entire "ADMIN" sidebar group,
the "Super Admin" SYSTEM link, the merchant-side "Terminals" entry (it was the
super monitor), and the corresponding `renderContent()` switch cases + imports.
Provide a real merchant terminals screen only if a `/api/business/terminals`
endpoint exists (verify; otherwise drop the merchant terminals nav entirely).

---

## 6. Risks & Sequencing

- **R1 (import churn):** moving 8 files updates imports in `app/page.tsx` and any
  cross-references. Mitigated by `@/` path alias — most imports are
  `@/components/<file>` and only the path segment changes.
- **R2 (`page.tsx` split):** extracting `ConfigTab`/`SubscriptionsTab` from the
  3,008-line `super-admin-page.tsx` is mechanical but large; do it as its own
  commit, compile-check between each extraction.
- **R3 (chain-page / terminals-page leakage):** these need a product decision
  (merchant vs super) before final placement — flagged, not auto-moved.
- **Recommended order:** (1) move files + create segment + fix imports →
  compile clean; (2) auth guard + `useMe`; (3) TanStack migration tab-by-tab;
  (4) recharts; (5) merchant nav cleanup. Each a separate commit.

---

## 7. Open Questions for Stakeholder

- Q1. Is there a **merchant** terminals endpoint (`/api/business/terminals`)?
  If not, the merchant "Terminals" nav should be removed, not re-pointed.
- Q2. Should `chain-page` promote/link/unlink stay on the business layer (needs
  a business-scoped backend endpoint) or move into the super console?
- Q3. Confirm `/api/super/subscriptions` is implemented (Billing tab depends on it).
- Q4. Extract `LoginScreen` to its own `/login` route, or keep it inline in the
  merchant `page.tsx`?

---

## 8. Implementation Progress

### ✅ Done — Step 1: Isolation (2026-06-01)
8 super components → `components/super-admin/`; real route segment
`app/super-admin/{layout,page}.tsx`; merchant `page.tsx` stripped of super nav /
cases / imports; super login routes to `/super-admin`. tsc: 29 errors before = 29
after (zero new).

### ✅ Done — Step 2: Backend DTO discovery
Verified against backend source (not guessed). Captured in
`lib/super-admin/types.ts`:
- **Courier** = `{ id, name, code, logo_url, api_endpoint, tracking_url_template,
  supports_cash_on_delivery, is_active }`. `code` is IMMUTABLE (not in
  UpdateCourierDto). List = raw `Courier[]`; delete → `{ deleted: true }`;
  404 → `ADM_COURIER_NOT_FOUND`.
- **TradeCategory** = `{ id, parent_id, name, code, default_business_type_id,
  default_settings_json, is_active, sort_order, children }`. Only `/tree` and
  `/options` GETs exist (no plain list).
- **Subscriptions** CONFIRMED: `GET/POST /api/super/subscriptions`, `PUT /:id`.
- **/api/auth/me** discriminates by `type`; super operators get
  `{ ..., type: 'super_admin' }`. `RolesGuard` authorizes on
  `user.type === 'super_admin' || user.role === 'super_admin'`.

### ✅ Done — Auth hardening (G1/G2/G3 resolved)
`useMe()` (`lib/super-admin/use-me.ts`) reads `/api/auth/me`; `SuperAdminGuard`
(inside the segment's QueryProvider) renders only for platform operators,
redirects merchants/anon to `/`, and survives refresh (role re-derived from the
backend, not a button click).

### ✅ Done — Couriers pilot (TanStack Query baseline)
`couriers-page.tsx` rewritten with `useQuery` + `useMutation` +
`invalidateQueries(superKeys.couriers.all)`, typed to the real DTOs, errors via
`humanizeError`. Wired into the live console by replacing `ConfigTab`'s inline
couriers UI (which also fixed the same DTO drift there); dead courier code in
`ConfigTab` removed. The misplaced "My Business Couriers" tab (called
business-scoped `/api/business/couriers`) was dropped — courier↔business linking
belongs in the merchant app.

Foundations now in place for remaining tabs: `lib/super-admin/{types,api,
query-keys,errors,use-me}.ts`, `components/providers/query-provider.tsx`.

### ⏳ Not started
Other 10 tabs (overview, businesses, terminals, billing, support, analytics,
audit, config sub-sections, versions, announcements, system); recharts graphs;
TradeCategory/Courier consumers beyond couriers; capital-detail on merchant
Reports. **Verification note:** validated via `tsc --noEmit` (baseline-equal);
a full `next build` and runtime click-through have not been run.
