# POS System — Implementation Plan for Claude Code

**Date:** May 2026
**Input:** `POS_Master_Spec_Consolidated.md` (the master spec)
**Rule:** Every phase is independently deployable. No phase breaks anything built before it.

---

## Dependency Map

```
Phase 11A ─── Phase 11B ─── Phase 12A ─── Phase 12B ─── Phase 12C
(warehouse,    (vendor        (batches,     (transfers,   (COGS report)
 vendor,       payments)      POs, FIFO)    adjustments)
 brand,
 nutrition,
 units)
                                                │
                                                ▼
                                          Phase 12D
                                          (vendor balance +
                                           aging reports)

Phase 13 ──── (Chain & Franchise) ─── independent of INV
Phase 14 ──── (Recommendations)   ─── independent
Phase 15 ──── (Platform Admin)    ─── independent
```

Phases 13, 14, 15 can run in parallel with or after 12. They do NOT depend on each other or on the Part B additions.

---

## Why This Order

1. **Phase 11A first** because warehouses, vendors, brands, and nutrition are the foundation tables that everything else FKs into. Units of measure (EXT-INV-001) goes here because it's a reference table with no dependencies.

2. **Phase 11B immediately after** because vendor payments (EXT-INV-030) only need the `vendors` and `purchase_orders` tables. But POs don't exist until Phase 12A. **Decision: split vendor payments.** Create the table and entity in 11B (ready for when POs land), but the PO-linked features (`balance_due`, `outstanding` endpoint) activate in 12D after POs exist.

   Actually, rethinking — vendor payments reference `purchase_orders` which doesn't exist until Phase 12. So vendor payments should go after 12A. Let me restructure.

3. **Phase 12A** creates batches, POs, FIFO — the core stock engine. This is the heaviest phase.

4. **Phase 12B** adds transfer documents and adjustment approvals — both need `stock_batches` from 12A.

5. **Phase 12C** adds vendor payments — needs both `vendors` (Phase 11A) and `purchase_orders` (Phase 12A).

6. **Phase 12D** adds the three new reports — needs everything above.

---

## Phase 11A — Inventory Foundations

**Goal:** Vendor catalogue, warehouse setup, brand management, nutrition info, units of measure.
**Estimated effort:** 3–4 days
**Dependencies:** None (builds on existing `products`, `categories`, `businesses`)
**Existing spec:** INV §8.4.1–§8.4.4 + EXT-INV-001

### Migration: `AddInventoryFoundations`

Creates these tables in order:

| # | Table | Source |
|---|---|---|
| 1 | `units_of_measure` | EXT-INV-001 (NEW) |
| 2 | `warehouses` | INV §8.2.1 |
| 3 | `vendors` | INV §8.2.2 |
| 4 | `vendor_check_details` | INV §8.2.3 |
| 5 | `brands` | INV §8.2.4 |
| 6 | `nutrition_info` | INV §8.2.5 |

Column additions to existing tables:

| Table | Columns | Source |
|---|---|---|
| `products` | `brand_id`, `default_vendor_id`, `unit_of_measure` (VARCHAR), `unit_of_measure_id` (UUID FK), `track_stock` | INV-MOD-001 + EXT-INV-001 |

Seed data:

- 5 system units of measure (`unit`, `kg`, `g`, `l`, `ml`) with `is_system = true`

### Deliverables

| # | What | Spec Ref | Tests |
|---|---|---|---|
| 1 | `UnitsOfMeasure` entity + CRUD (4 endpoints) | EXT-INV-001 | List, create, update, delete (422 if system/in-use), cross-tenant 404 |
| 2 | `Warehouse` entity + CRUD (5 endpoints) | INV-001–005 | Standard CRUD + cross-tenant 404 |
| 3 | `Vendor` entity + CRUD (5 endpoints) | INV-010–014 | Standard CRUD + `for_select` lightweight mode + cross-tenant 404 |
| 4 | `VendorCheckDetail` entity + list/create (2 endpoints) | INV-015 | Create check, list checks for vendor |
| 5 | `Brand` entity + CRUD (4 endpoints) | INV-020–023 | Standard CRUD + cross-tenant 404 |
| 6 | `NutritionInfo` entity + get/set/list (3 endpoints) | INV-030–032 | Upsert, allergen filtering, cross-tenant 404 |
| 7 | `Product` entity updated with new columns | INV-MOD-001 | Verify products accept `brand_id`, `default_vendor_id`, `track_stock` |

### What NOT to build in this phase

- Stock batches, stock movements, FIFO (Phase 12A)
- Purchase orders (Phase 12A)
- Vendor payments (Phase 12C)
- Stock templates (Phase 12A)
- Expiration alerts (Phase 12A)

### Prompt for Claude Code

```
Read docs/spec/POS_Extension_Spec_v1_1.md §8.2.1–§8.2.5, §8.4.1–§8.4.4,
and POS_Master_Spec_Consolidated.md §B.1 (Units of Measure).

Implement Phase 11A: Inventory Foundations.

Scope:
- Migration: AddInventoryFoundations (6 new tables + product column additions + UoM seed data)
- 6 new entities
- InventoryModule at src/modules/inventory/
- 23 endpoints total (see deliverables list)
- Register in AppModule

OUT OF SCOPE: stock_batches, stock_movements, purchase_orders, stock_templates,
expiration_alerts, vendor_payments, FIFO consumption. These come in Phase 12.

Plan first, then implement. Show me the plan before writing code.
```

---

## Phase 12A — Stock Engine (Batches, POs, FIFO)

**Goal:** Batch-level stock tracking, purchase order lifecycle, FIFO sale consumption, expiration alerts, stock templates.
**Estimated effort:** 5–7 days
**Dependencies:** Phase 11A (warehouses, vendors, products.track_stock)
**Existing spec:** INV §8.4.5–§8.4.10

### Migration: `AddStockEngine`

Creates these tables:

| # | Table | Source |
|---|---|---|
| 1 | `stock_batches` | INV §8.2.6 |
| 2 | `stock_movements` | INV §8.2.7 |
| 3 | `purchase_orders` | INV §8.2.8 |
| 4 | `purchase_order_items` | INV §8.2.9 |
| 5 | `stock_templates` | INV §8.2.10 |
| 6 | `stock_template_items` | INV §8.2.11 |
| 7 | `stock_discrepancy_alerts` | INV §8.2.12 |

Indexes per §13.3 (batch expiry, movement type, PO status, etc.).

### Deliverables

| # | What | Spec Ref | Tests |
|---|---|---|---|
| 1 | `StockBatch` entity + list/create/adjust/dispose/transfer (5 endpoints) | INV-040–044 | Create batch, adjust with audit, dispose, transfer (source decrement + target create), cross-tenant 404 |
| 2 | FIFO consumption on sale — hook into `createTransaction()` | INV-050 | Sale with `track_stock=true` product decrements oldest batch first; multi-batch spanning; insufficient stock → negative quantity allowed + discrepancy queued; `source_origin` set correctly for online vs offline |
| 3 | `StockTemplate` entity + CRUD + generate-PO (6 endpoints) | INV-060–065 | Template creates draft PO with correct line items |
| 4 | `PurchaseOrder` entity + full lifecycle (8 endpoints) | INV-070–077 | Draft→sent→confirmed→partially_received→received; line-item TVA math; cancel guard (no received items); email PO PDF stub |
| 5 | PO receive → batch creation | INV-076 | Receiving creates `stock_batches` + `stock_movements` at destination warehouse |
| 6 | Expiration alert daily scan (background job) | INV-080 | BullMQ cron job, configurable lead days, alert creation, in-app notification |
| 7 | Expiration alert list + resolve (2 endpoints) | INV-081–082 | Filter by resolved/severity, resolve with action |
| 8 | Stock discrepancy alert list + resolve (2 endpoints) | INV-094, INV-096 | Filter, resolve with action (manual_recount/accept_loss/adjust_batch) |
| 9 | Daily reconciliation job | INV-095 | BullMQ cron, finds negative batches + offline-sync mismatches, creates alerts |
| 10 | Stock reports: position, movements, vendor purchases, input TVA (4 endpoints) | INV-090–093 | Each report with correct filters and aggregations |

### Critical integration point

The FIFO hook into `createTransaction()` is the riskiest change in this phase. It touches the existing terminal service which currently has 378 tests passing. Rules:

1. The FIFO logic **shall** be a separate service (`StockConsumptionService`) injected into `TerminalService`, not inline code.
2. It **shall** only fire when `product.track_stock = true` — products without this flag are completely unaffected.
3. It **shall** be wrapped in a try-catch: stock errors must NEVER block a sale (INV-050 rule: "selling unrecorded stock is preferable to blocking sales").
4. All existing terminal tests must pass without modification.

### Prompt for Claude Code

```
Read docs/spec/POS_Extension_Spec_v1_1.md §8.2.6–§8.2.12, §8.4.5–§8.4.10.

Implement Phase 12A: Stock Engine.

Scope:
- Migration: AddStockEngine (7 new tables + indexes)
- 7 new entities
- StockConsumptionService (FIFO) — separate service, injected into TerminalService
- 27 endpoints total
- 2 background jobs (expiration scan, daily reconciliation)

CRITICAL: FIFO hook into createTransaction must be:
  - In a separate StockConsumptionService, not inline
  - Gated by product.track_stock = true
  - Wrapped in try-catch (never blocks a sale)
  - All 378 existing tests must still pass

OUT OF SCOPE: stock_adjustments (approval workflow), stock_transfers (documents),
vendor_payments, COGS report. These come in 12B/12C/12D.

Plan first, then implement. Show me the plan before writing code.
```

---

## Phase 12B — Transfer Documents & Adjustment Approvals

**Goal:** First-class transfer documents and optional stock adjustment approval workflow.
**Estimated effort:** 2–3 days
**Dependencies:** Phase 12A (stock_batches, stock_movements exist)
**Spec:** EXT-INV-010–016, EXT-INV-020–025

### Migration: `AddStockTransfersAndAdjustments`

Creates these tables:

| # | Table | Source |
|---|---|---|
| 1 | `stock_transfers` | EXT-INV-020 |
| 2 | `stock_transfer_items` | EXT-INV-020 |
| 3 | `stock_adjustments` | EXT-INV-010 |
| 4 | `stock_adjustment_items` | EXT-INV-010 |

Adds feature flag:

| feature_key | default |
|---|---|
| `stock_adjustment_approval` | disabled (all business types) |

Adds permission keys (no migration needed — JSONB):

| Key | Default roles |
|---|---|
| `can_propose_stock_adjustment` | owner, manager, employee |
| `can_approve_stock_adjustment` | owner, manager |

### Deliverables

| # | What | Spec Ref | Tests |
|---|---|---|---|
| 1 | `StockTransfer` + `StockTransferItem` entities | EXT-INV-020 | — |
| 2 | Transfer document CRUD (list, detail, create draft) | EXT-INV-020–022 | Create with multi-item, source≠target validation, cross-tenant 404 |
| 3 | Post transfer (atomically calls INV-044 logic per item) | EXT-INV-023 | Multi-item transfer creates correct batches + movements; immutable after post |
| 4 | Cancel + delete transfer (draft only) | EXT-INV-024–025 | 422 if not draft |
| 5 | `StockAdjustment` + `StockAdjustmentItem` entities | EXT-INV-010 | — |
| 6 | Adjustment proposal CRUD (list, detail, create, submit) | EXT-INV-010–013 | Create with items, submit transitions to pending_approval |
| 7 | Approve + post adjustment (atomically applies deltas) | EXT-INV-014–015 | Post creates stock_movements, updates batch quantities |
| 8 | Reject adjustment | EXT-INV-016 | Sets status + reason, no inventory change |
| 9 | Feature flag gate on INV-042 | EXT-INV-015 note | When `stock_adjustment_approval` enabled, INV-042 returns 422 |

### Key architectural decision

Extract the batch-quantity-update logic from INV-042 into a shared private method (e.g., `applyBatchAdjustment(queryRunner, batchId, delta, movementMeta)`) that both INV-042 and EXT-INV-015 call. This avoids code duplication.

Similarly, the INV-044 transfer logic should be callable by EXT-INV-023 per-item. If it isn't already factored into a method, extract it.

### Prompt for Claude Code

```
Read POS_Master_Spec_Consolidated.md §B.2 (Stock Adjustment Approval)
and §B.3 (Stock Transfer Documents).

Implement Phase 12B: Transfer Documents & Adjustment Approvals.

Scope:
- Migration: AddStockTransfersAndAdjustments (4 new tables + feature flag row)
- 4 new entities
- 13 endpoints total
- Extract shared batch-update and batch-transfer methods from existing
  INV-042 and INV-044 logic so both old and new flows use the same code

CRITICAL:
  - INV-042 must still work when stock_adjustment_approval is disabled
  - INV-044 must still work for ad-hoc single-batch transfers
  - All existing tests must pass without modification

Plan first, then implement. Show me the plan before writing code.
```

---

## Phase 12C — Vendor Payments

**Goal:** Track payments to vendors, link to POs, outstanding balance tracking.
**Estimated effort:** 2 days
**Dependencies:** Phase 11A (vendors) + Phase 12A (purchase_orders)
**Spec:** EXT-INV-030–037

### Migration: `AddVendorPayments`

Creates:

| # | Table | Source |
|---|---|---|
| 1 | `vendor_payments` | EXT-INV-030 |

Adds permission key (JSONB, no migration):

| Key | Default roles |
|---|---|
| `can_manage_vendor_payments` | owner, manager |

### Deliverables

| # | What | Spec Ref | Tests |
|---|---|---|---|
| 1 | `VendorPayment` entity | EXT-INV-030 | — |
| 2 | Payment CRUD (list, detail, create) | EXT-INV-030–032 | Create with/without PO link, validate vendor exists, auto payment_number, cross-tenant 404 |
| 3 | Confirm payment | EXT-INV-033 | Sets confirmed_by + confirmed_at |
| 4 | Void payment | EXT-INV-034 | Requires reason, logs to audit |
| 5 | Vendor outstanding POs | EXT-INV-035 | Returns POs with balance_due > 0 |
| 6 | Vendor payment summary | EXT-INV-036 | Aggregate stats |
| 7 | PO detail enrichment (computed `amount_paid`, `balance_due`) | EXT-INV-030 §B.4.2 | Verify PO GET response includes new fields |

### Integration point

The PO detail endpoint (INV-071, `GET /api/business/purchase-orders/:id`) must be modified to include `amount_paid` and `balance_due` as computed fields. This is a LEFT JOIN + SUM aggregate added to the existing query — not a schema change.

### Prompt for Claude Code

```
Read POS_Master_Spec_Consolidated.md §B.4 (Vendor Payment Tracking).

Implement Phase 12C: Vendor Payments.

Scope:
- Migration: AddVendorPayments (1 new table)
- 1 new entity
- 7 new endpoints
- Modify GET /api/business/purchase-orders/:id to include computed
  amount_paid and balance_due (LEFT JOIN aggregate, not schema change)

OUT OF SCOPE: vendor balance report, bill aging report (Phase 12D).

Plan first, then implement. Show me the plan before writing code.
```

---

## Phase 12D — New Reports (COGS, Vendor Balance, Bill Aging)

**Goal:** Three new analytical reports.
**Estimated effort:** 1 day
**Dependencies:** Phase 12A (stock_movements for COGS) + Phase 12C (vendor_payments for balance/aging)
**Spec:** EXT-RPT-001–003

### No migration needed

All data sources already exist from prior phases.

### Deliverables

| # | What | Spec Ref | Tests |
|---|---|---|---|
| 1 | COGS report generator method | EXT-RPT-001 | Summary + by_product + by_category; date range filter; warehouse filter |
| 2 | Vendor balance report generator method | EXT-RPT-002 | Per-vendor totals + grand totals; as_of_date filter |
| 3 | Bill aging report generator method | EXT-RPT-003 | 4 aging buckets; per-vendor breakdown; uses `payment_terms_days` for due date calc |
| 4 | Register 3 new report IDs in ReportsModule dispatcher | — | All three return data, not REPORT_NOT_IMPLEMENTED |

### Integration point

These go into the existing `ReportsModule` following the generator pattern established in Phase 10.5. Create a new `InventoryReportsGenerator` class (or add to an existing generator if one was created in 12A for INV-090–093).

### Prompt for Claude Code

```
Read POS_Master_Spec_Consolidated.md §B.5 (New Reports).

Implement Phase 12D: COGS, Vendor Balance, and Bill Aging reports.

Scope:
- No migration
- 3 new report generator methods
- Register 'cogs', 'vendor-balance', 'bill-aging' in the ReportsModule dispatcher
- Follow the existing generator pattern from Phase 10.5

Plan first, then implement. Show me the plan before writing code.
```

---

## Phase 13 — Chain & Franchise

**Goal:** Parent/child business hierarchy, cloud goods sync, multi-business login, chain reporting, parent-routed POs.
**Estimated effort:** 5–7 days
**Dependencies:** Core platform (Phase 1). INV (Phases 11–12) for parent-routed purchasing but that's an optional sub-feature.
**Existing spec:** CHN §9, all requirements

### Migration: `AddChainOperations`

Per Extension Spec §13.4 migration 12.

### Deliverables

Per Extension Spec §9.3: chain setup (CHN-001–004), multi-business login (CHN-010–012), cloud goods sync (CHN-020–024), chain promotions (CHN-030), chain reporting (CHN-040–041), parent-routed POs (CHN-050–052), plus PROM-040 sub-store validation.

~15 endpoints.

### Prompt for Claude Code

```
Read docs/spec/POS_Extension_Spec_v1_1.md §9 (Module CHN) and §13.4 migration 12.

Implement Phase 13: Chain & Franchise.

Scope: All CHN requirements (CHN-001 through CHN-052) + PROM-040.
Create ChainModule at src/modules/chain/.

Plan first, then implement. Show me the plan before writing code.
```

---

## Phase 14 — Recommendations

**Goal:** Recommendation templates and featured items.
**Estimated effort:** 2 days
**Dependencies:** Core platform only.
**Existing spec:** REC §10, all requirements

### Migration: `AddRecommendations`

Per Extension Spec §13.4 migration 13. Includes `whole_price_1`–`whole_price_4` on products.

### Deliverables

Per Extension Spec §10.3–10.4: template CRUD (REC-001–005), terminal resolution (REC-010), featured items (REC-020).

~8 endpoints.

### Prompt for Claude Code

```
Read docs/spec/POS_Extension_Spec_v1_1.md §10 (Module REC) and §13.4 migration 13.

Implement Phase 14: Recommendations.

Scope: All REC requirements (REC-001 through REC-020).
Add to existing modules or create RecommendationModule.

Plan first, then implement. Show me the plan before writing code.
```

---

## Phase 15 — Platform Admin Enhancements

**Goal:** Trade categories, couriers, custom permissions, changelog, system params, settlement cutoff, address picker.
**Estimated effort:** 2–3 days
**Dependencies:** Core platform only.
**Existing spec:** ADM §12, all requirements

### Migration: `AddPlatformAdminEnhancements`

Per Extension Spec §13.4 migration 15. Includes Morocco region seed data.

### Deliverables

Per Extension Spec §12.4: trade categories (ADM-001–005), couriers (ADM-010–016), custom permissions (ADM-020–022), capital report (ADM-030), changelog (ADM-040–044), system params (ADM-050–051), settlement cutoff (ADM-060–061), address picker (ADM-070–071).

~20 endpoints.

### Prompt for Claude Code

```
Read docs/spec/POS_Extension_Spec_v1_1.md §12 (Module ADM) and §13.4 migration 15.

Implement Phase 15: Platform Admin Enhancements.

Scope: All ADM requirements (ADM-001 through ADM-071).
Most endpoints go in SuperAdminModule or BusinessModule.

Plan first, then implement. Show me the plan before writing code.
```

---

## Execution Summary

| Phase | Name | Effort | New Tables | New Endpoints | Depends On |
|---|---|---|---|---|---|
| **11A** | Inventory Foundations | 3–4 days | 6 | 23 | — |
| **12A** | Stock Engine | 5–7 days | 7 | 27 + 2 jobs | 11A |
| **12B** | Transfers & Adjustments | 2–3 days | 4 | 13 | 12A |
| **12C** | Vendor Payments | 2 days | 1 | 7 | 11A + 12A |
| **12D** | New Reports | 1 day | 0 | 3 | 12A + 12C |
| **13** | Chain & Franchise | 5–7 days | 2+ | ~15 | Core |
| **14** | Recommendations | 2 days | 2 | ~8 | Core |
| **15** | Platform Admin | 2–3 days | 7 | ~20 | Core |

**Total: ~24–31 days, 18+ new tables, ~116 new endpoints**

### Parallelization opportunities

- **13 + 14 + 15 can run in parallel** — they don't depend on each other or on INV.
- **13 + 14 + 15 can start as soon as 11A is done** if a second developer is available, while the primary developer continues 12A→12D.
- **12B and 12C can run in parallel** after 12A — transfers don't need payments, payments don't need transfers.

### Risk hotspots

| Risk | Phase | Mitigation |
|---|---|---|
| FIFO hook breaks `createTransaction()` | 12A | Separate service, try-catch wrapper, `track_stock` gate, full regression suite |
| Feature-flag gate on INV-042 | 12B | Default disabled; only changes behavior when explicitly enabled |
| PO detail query change for `amount_paid`/`balance_due` | 12C | LEFT JOIN aggregate only; no schema change; existing PO tests must still pass |
| Chain sync touching catalogue entities | 13 | `synced_from_parent_id` is nullable; existing products unaffected |

### Test expectations per phase

| Phase | Starting Tests | Expected New Tests | Ending Tests |
|---|---|---|---|
| 11A | 378 | ~25 | ~403 |
| 12A | ~403 | ~40 | ~443 |
| 12B | ~443 | ~20 | ~463 |
| 12C | ~463 | ~12 | ~475 |
| 12D | ~475 | ~8 | ~483 |
| 13 | ~483 | ~20 | ~503 |
| 14 | ~503 | ~10 | ~513 |
| 15 | ~513 | ~20 | ~533 |

---

**— END OF IMPLEMENTATION PLAN —**
