# POS System — Extension Features Specification

**Version:** 1.1 (Draft)
**Date:** April 2026
**Status:** Planning — for review before Phase 5 development
**Companion document:** Software Requirements Specification v1.0 (April 2026)
**Purpose:** Define every loyalty, promotion, restaurant-operations, inventory, and chain-store feature to be added on top of the SRS v1.0 baseline, organised so no function is lost during implementation.

---

## Revision History

| Version | Date | Description | Author |
|---|---|---|---|
| 1.0 | April 2026 | Initial extension spec covering loyalty, promotions, coupons, points exchange, restaurant operations, inventory, chain/franchise, recommendations, communications, and platform admin enhancements | Project Team |
| 1.1 | April 2026 | Resolved 13 review issues: discount stacking pipeline (XCC-017), TVA-vs-cutoff temporal rule (XCC-018), offline coupon write-off model, void/refund points reversal, table-session checkout_payload contract, partial-split escape hatch, stored value deferred, customer portal password deferred, UUID arrays replaced with join tables, permissions consolidated to JSONB, notification_channels normalized, input TVA per-transaction removed, FIFO offline reconciliation, chain TVA rate exclusion, background job infrastructure with concurrency locks | Project Team |

---

## How to Read This Document

This document **extends** the SRS v1.0 and assumes the reader is familiar with it. The SRS defines:

- Multi-tenant architecture with `businesses`, `locations`, `terminals`
- Three security groups: `/api/super/`, `/api/business/`, `/api/terminal/`
- Role hierarchy: `super_admin`, `owner`, `manager`, `employee`
- Morocco TVA compliance (Finance Law 50-25, 0/7/10/20% rates, ICE/IF, gap-free invoice numbers, SIMPL-TVA preparation)
- Business-type feature toggles via `business_type_features.feature_key`
- Offline-first terminal with SQLite sync queue

Every requirement below is identified as `[MOD-NNN]` where `MOD` is a new module code (CUST, PROM, CPN, PEX, RST, INV, CHN, REC, COM, ADM). Requirements use **shall** for mandatory and **should** for recommended-but-optional features. **`shall`** items must be implemented before a module is considered complete; **`should`** items can be deferred.

Scope boundaries:

- This document does NOT change anything in SRS §3.7 (TVA compliance) — TVA rules remain authoritative, and §2.3 of this document defines exactly how loyalty discounts and coupons interact with TVA without breaking compliance.
- This document does NOT modify the receipt format defined in SRS §3.6.2 — only adds optional lines (loyalty card number, points earned, discount applied) to the existing layout.
- All new endpoints follow the same JWT + RBAC model as the SRS.

---

# 1. Introduction

## 1.1 Goal

Add the engagement, retention, and operational depth needed for a competitive multi-business POS platform: customer loyalty programmes, targeted promotions, coupons, points-for-rewards exchange, table service for restaurants, batch-tracked inventory with vendors and purchase orders, chain-store coordination for franchises, dish recommendations, and announcement/notification infrastructure.

## 1.2 Design Principles

1. **Every feature is gateable per business type.** A pharmacy does not need table management. A salon does not need batch-stock with expiry. New `business_type_features.feature_key` values are introduced for each module so the Super Admin can switch features on or off per business type without code changes.

2. **Every entity carries `business_id`.** Multi-tenant isolation rules from SRS §4.3 (NFR-S04) extend to all new tables. No new endpoint shall return data belonging to a different business than the caller's session token.

3. **TVA compliance is sacred.** Discounts, points redemption, and coupon redemption are all modelled as adjustments **before** the TVA-bearing line totals. The HT/TVA/TTC math defined in SRS §3.7.2 still produces the legally required figures on every receipt and TVA declaration line.

4. **Offline-first stays.** Terminal-side features (looking up a customer by phone, applying a coupon, redeeming points, opening a table) shall work in offline mode and sync via the existing queue defined in SRS §3.8.

5. **Additive over destructive.** New columns on existing tables (`transactions`, `products`, `businesses`) are nullable and default to backwards-compatible values. No existing migration is rewritten; new migrations stack on top.

## 1.3 Modules Added by This Specification

| Code | Module | One-line summary | Primary user |
|---|---|---|---|
| CUST | Customers & Loyalty | Customer records, grades, labels, points wallet | Manager, Marketing |
| PROM | Promotions & Campaigns | Targeted offers with date/time/audience rules | Marketing |
| CPN | Coupons | Issuable, collectable, redeemable discount codes | Customer / Cashier |
| PEX | Points Exchange | Rules to redeem points for coupons or items | Customer / Manager |
| RST | Restaurant Operations | Dining areas, tables, table-service flow | Restaurant business type only |
| INV | Inventory & Stock | Warehouses, batches, vendors, purchase orders, nutrition | Retail / Restaurant / Pharmacy |
| CHN | Chain & Franchise | Parent-business model, cloud catalogue sync, sub-store rollups | Owner / Super Admin |
| REC | Smart Recommendations | Curated and template-driven dish/product suggestions | Manager |
| COM | Communications | Announcements, notices, SMS/Email/WhatsApp campaigns | Marketing |
| ADM | Platform Admin Extras | Trade categories, couriers, custom permissions, changelog, settlement cutoff | Super Admin |

## 1.4 What Is NOT in This Document

These items from the AiBao Cloud reference are intentionally excluded:

- **WeChat / Mini Program integration** — irrelevant to Morocco; replaced with SMS + Email + WhatsApp Business in Module COM.
- **Chinese-domestic delivery platforms** (Meituan, Ele.me) — replaced with a generic delivery-platform connector that will be implemented for Glovo and Yassir in a later phase.
- **AiBao Pay payment proxy** — superseded by the existing CMI / Payzone integration in SRS §3.5.4.
- **Multi-region / multi-zone deployment** — Morocco is a single deployment region; no zone-routing is required.

These items have been **deferred to a future spec** following review:

- **Stored value / pre-paid wallet** — needs separate legal review for Moroccan pre-paid liability accounting; not specifying half a financial feature in this version.
- **Customer-facing self-service portal login** — no auth flow, session management, or customer API surface is in scope; the `password_hash` column is omitted to avoid an unused security audit surface.
- **Multi-provider failover for notification channels** — table is normalized to support it, but failover flags (`is_primary` / `is_fallback`) are not included until a real customer asks; one provider per channel for v1.

---

# 2. Cross-Cutting Concerns

## 2.1 New `business_type_features.feature_key` Values

The Super Admin shall be able to toggle each of these per business type via the existing UI defined in SRS §3.2.1. Default values shown for the five SRS-defined business types.

| `feature_key` | Description | Retail | Restaurant | Pharmacy | Salon | Hotel |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `customer_loyalty` | Enables Module CUST (customers, grades, labels, points) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `promotions` | Enables Module PROM | ✓ | ✓ | ✓ | ✓ | ✓ |
| `coupons` | Enables Module CPN | ✓ | ✓ | ✓ | ✓ | ✓ |
| `points_exchange` | Enables Module PEX (requires `customer_loyalty`) | ✓ | ✓ | — | ✓ | — |
| `tables` | Enables Module RST (dining areas, tables, table-service) | — | ✓ | — | — | — |
| `warehouses` | Enables Module INV warehouses + batches | ✓ | ✓ | ✓ | — | ✓ |
| `vendors` | Enables Module INV vendors + purchase orders | ✓ | ✓ | ✓ | ✓ | ✓ |
| `nutrition_info` | Enables nutrition fields on products | — | ✓ | — | — | — |
| `brands` | Enables product brand catalogue | ✓ | ✓ | ✓ | — | ✓ |
| `expiration_alerts` | Daily check for expiring batches | ✓ | ✓ | ✓ | — | — |
| `recommendations` | Enables Module REC | ✓ | ✓ | — | ✓ | — |
| `chain_features` | Enables Module CHN parent/child operations | optional | optional | optional | optional | optional |
| `sms_campaigns` | Send SMS campaigns from Module COM | ✓ | ✓ | ✓ | ✓ | ✓ |
| `email_campaigns` | Send email campaigns from Module COM | ✓ | ✓ | ✓ | ✓ | ✓ |
| `whatsapp_campaigns` | Send WhatsApp Business messages | optional | optional | optional | optional | optional |

`✓` = enabled by default. `—` = disabled by default. `optional` = disabled, owner can request activation. Owners cannot enable features marked `—` for their business type without a Super Admin override.

## 2.2 Multi-Tenancy Enforcement

**[XCC-001]** Every new table introduced by this specification **shall** include a `business_id UUID NOT NULL` column with an FK to `businesses(id)`, indexed.

**[XCC-002]** Every new endpoint under `/api/business/` and `/api/terminal/` **shall** scope all reads and writes to the `business_id` claim in the JWT. Cross-tenant access shall return 404 (not 403, to avoid leaking existence).

**[XCC-003]** Endpoints under `/api/super/` may operate cross-tenant but **shall** record the impersonated `business_id` in the audit log per SRS NFR-S03.

## 2.3 TVA Interaction with Discounts, Points, and Coupons (CRITICAL)

This is the most consequential design decision in this document. Every transaction with a discount must still produce a Morocco-compliant receipt with correct HT/TVA/TTC amounts. The model is:

> A loyalty discount, a coupon redemption, or a points-redeemed-as-cash adjustment is treated as a **price reduction on the affected line items**, applied before TVA decomposition. The reduced TTC is what gets recorded in `transaction_items.item_ttc`, and HT/TVA are derived from the reduced TTC using the SRS §3.7.2 formulas.

**[XCC-010]** Every `transaction_item` **shall** carry a new `discount_amount` column (default 0) representing the per-item TTC reduction applied. The `item_ttc` stored is the post-discount TTC, and `item_ht`/`item_tva` are computed from this post-discount value.

**[XCC-011]** Where a discount applies to the whole order rather than a line item (e.g. "10% off the entire bill"), the discount **shall** be distributed across line items in proportion to each line's pre-discount TTC. Rounding shall use banker's rounding to 2 decimals; the rounding remainder (max 0.01 MAD) shall be applied to the largest line to keep the total exact.

**[XCC-012]** When a coupon is redeemed for a fixed monetary value (e.g. "10 MAD off"), the discount distribution from XCC-011 applies. When a coupon is redeemed for a free item, the free item is added to the order with a 100% discount (its `item_ttc` becomes 0, `item_ht` and `item_tva` both become 0). Free items shall still appear on the receipt with the original price struck through and "GRATUIT (coupon CPN-XXXX)" annotation.

**[XCC-013]** When points are redeemed as a cash-equivalent discount (e.g. "100 points = 5 MAD off"), the redemption **shall** be recorded in a new `transaction.points_redeemed` column and the cash-equivalent value treated as an XCC-011 distributed discount.

**[XCC-014]** Points are NEVER a payment method. The `payment_method` column on `transactions` shall remain one of `cash`, `card_cmi`, `card_payzone`. Points redemption is a discount, not a payment. Card payment processors and TVA reports must not see "points" as a settlement type.

**[XCC-015]** The TVA Declaration Report defined in SRS §3.7.4 **shall** report HT, TVA, and TTC totals **after** all discounts, points redemption, and coupon redemption — i.e. matching what was actually charged to the customer. No "gross before discount" line is required by Finance Law 50-25; the post-discount totals are what DGI files on.

**[XCC-016]** The receipt **shall** show, for every line where a discount was applied, the original price, the discount amount, and the final price. A summary footer line **shall** show total discounts applied (sum of all line discounts) before the HT/TVA/Total TTC block already required by SRS §3.6.2.

**[XCC-017] Discount Resolution Pipeline.** When grade discounts, promotions, and coupons all apply to the same transaction, they **shall** be resolved in this strict deterministic order, with each step's output forming the base for the next:

1. **Grade discount** (passive, always-on): `customer.grade.discount_percent` reduces the per-line TTC base for every applicable line. This produces TTC₁.
2. **Promotions** (auto-applied, per [PROM-021] stacking rules among themselves): operate on TTC₁ and produce TTC₂. The `promotion_stacking_mode` (`stack` or `best_only`) ONLY governs promotion-vs-promotion competition — never grade-vs-promotion or coupon-vs-promotion.
3. **Coupons** (explicit customer action, applied last): operate on TTC₂ and produce the final TTC.

Each step distributes its discount across line items per the XCC-011 proportional rule. The final TTC per line is what is written to `transaction_items.item_ttc`; HT and TVA are derived from this final TTC.

**Worked example.** Cart total before any discounts: 100.00 MAD TTC across 4 items at 25.00 MAD each. Customer is Gold grade with 5% discount. A "10% off all bakery" promotion applies to 2 of the 4 items. Customer presents a "20 MAD off order" coupon.

| Step | Input | Operation | Output |
|---|---|---|---|
| 0 (start) | All 4 items @ 25.00 | — | TTC₀ = 100.00 |
| 1 (grade) | All 4 items @ 25.00 | −5% on every line → 23.75 each | TTC₁ = 95.00 |
| 2 (promotion) | Items 1+2 @ 23.75 (bakery), Items 3+4 @ 23.75 | −10% on bakery only → 21.375 each | TTC₂ = 90.25 |
| 3 (coupon) | TTC₂ = 90.25 | −20.00 distributed proportionally across all 4 lines | TTC = 70.25 |

The 20.00 MAD coupon distributes proportionally: items 1+2 each get `20.00 × (21.375 / 90.25) ≈ 4.736` off → final 16.639. Items 3+4 each get `20.00 × (23.75 / 90.25) ≈ 5.264` off → final 18.486. Sum: 16.639 × 2 + 18.486 × 2 = 70.25 ✓. Banker's rounding to 2 decimals applied per XCC-011.

**[XCC-018] TVA Reports Use Calendar Date, Not Settlement Cutoff.** The `daily_settlement_cutoff_time` defined in [ADM-061] applies **only** to operational reports: Daily Sales Summary, Z-Report equivalent, cash drawer reconciliation, daily comparisons. The TVA Declaration Report (SRS §3.7.4) and the Input TVA Report ([INV-093]) **shall** use the actual transaction timestamp's calendar date — never cutoff-adjusted dates — because DGI audits against calendar dates. Concretely: a 01:30 sale on April 28 with a 02:00 cutoff appears in the **April 27** daily ops report AND in the **April** TVA declaration. This separation prevents the operational-vs-fiscal date mismatch that would otherwise make daily ops reports irreconcilable with monthly DGI filings.

**Open question for legal review (see Section 16):** confirm with a Moroccan tax lawyer that "post-discount HT" is the correct base for TVA reporting and not "pre-discount HT." The current design assumes post-discount because that is the amount actually invoiced; if DGI requires pre-discount declaration with a separate "remise" line, the only change required is in the report-generation layer, not the schema.

## 2.4 Audit Log Coverage

**[XCC-020]** The following new actions **shall** be recorded in `audit_logs` per SRS NFR-S03: customer creation/deletion, manual points adjustment, promotion creation/edit, coupon issuance, points exchange rule save, table assignment, batch stock adjustment, vendor creation, purchase order approval, parent-child business link, sub-store cloud-goods sync, and any send of an SMS/Email/WhatsApp campaign with recipient count.

## 2.5 Offline Support for Customer Lookup and Loyalty

**[XCC-030]** The terminal **shall** cache the business's customer directory (id, phone, name, grade, points balance) locally in SQLite and refresh it on the same differential schedule as the product catalogue (SRS [TRM-004]).

**[XCC-031]** Points adjustments made in offline mode (earning from a sale, redemption against a sale) **shall** be queued as `customer_points_delta` operations in the existing `sync_queue` table. Conflicts (e.g. the customer's online balance moved between offline-start and sync) shall be resolved server-side by replaying queued deltas in chronological order — the server is the source of truth for the absolute balance, but client-side deltas are never lost.

**[XCC-032] Offline Coupon Redemption Failure — Write-Off Model.** Coupon redemptions performed in offline mode **shall** be queued and validated server-side at sync time. If a coupon was already redeemed elsewhere (multi-terminal race), the queued redemption fails. The recovery model is:

1. **The transaction stands as written.** Receipt has been printed, customer has left, `transaction_items.item_ttc` already reflects the discount that was given. The transaction is NOT voided or re-rung.
2. **A `discount_write_offs` row is inserted** (new table, see §13.1) capturing the unrecoverable amount: `(business_id, transaction_id, terminal_id, coupon_id, written_off_amount, reason, created_at)`. The `terminal_id` is recorded so the business owner can identify terminals generating the most write-offs (signal of poor connectivity or cashier abuse).
3. **No TVA impact.** The customer genuinely paid the discounted price, so output TVA on `transactions.total_tva` correctly reflects the cash collected. The write-off is a P&L loss, not a tax adjustment.
4. **A "coupon redemption rejected" entry surfaces in the terminal's failed-sync UI** per SRS [OFF-008] for the cashier's awareness, but no cash collection or void action is required.
5. **A "Discount Write-Off Report"** ([XCC-040]) is available to the business owner for monthly review of write-off losses.

#### `[XCC-040]` Discount Write-Off Report

- **Method:** `GET` `/api/business/reports/discount-write-offs`
- **Roles:** `owner`, `manager`
- **Query:** `from_date`, `to_date`, `terminal_id`, `coupon_id`
- **Output:** Per-period total write-off amount (MAD), per-terminal breakdown, per-cashier breakdown, list of write-off events with linked transaction and coupon for forensic review.

## 2.6 Background Job Infrastructure

**[XCC-050] Background Job Stack.** The system **shall** use BullMQ + Redis as the background job runner. All asynchronous work (bulk imports, bulk coupon issuance, bulk notification dispatch, chain catalogue sync, expiration scans, daily reconciliation) goes through this single infrastructure. Direct database polling and ad-hoc cron jobs outside this system are not permitted.

**[XCC-051] `background_jobs` Table.** Job state is persisted in a new table:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK, nullable for super-admin / cross-tenant jobs |
| `job_type` | varchar(60) | e.g. `bulk_coupon_issue`, `chain_sync`, `expiration_scan`, `bulk_campaign_send` |
| `unique_lock_key` | varchar(200) | Nullable; prevents concurrent execution of conflicting jobs |
| `status` | varchar(20) | `queued`, `running`, `completed`, `failed`, `dead_letter` |
| `payload_json` | jsonb | Input parameters |
| `result_json` | jsonb | Output / progress |
| `error_message` | text | Last error |
| `retry_count` | int | Default 0 |
| `max_retries` | int | Default 3 |
| `created_at` / `started_at` / `completed_at` | timestamp | |

**[XCC-052] Concurrency Locks.** A partial unique index enforces single-instance execution for jobs sharing a `unique_lock_key`:

```sql
CREATE UNIQUE INDEX background_jobs_active_lock_idx
ON background_jobs (unique_lock_key)
WHERE status IN ('queued', 'running') AND unique_lock_key IS NOT NULL;
```

When a job is enqueued with a `unique_lock_key` that already has an active job, the insert fails. The enqueueing endpoint **shall** catch this, return HTTP 409 with the existing job's ID, and the client polls the existing job rather than getting a duplicate.

**Standard lock key conventions:**

| Job type | Lock key format | Reason |
|---|---|---|
| Chain sync | `chain_sync:{parent_business_id}:{child_business_id}` | Prevents duplicate syncs creating ghost products |
| Expiration scan | `expiration_scan:{business_id}` | One scan per business per day |
| Bulk campaign | `bulk_campaign:{template_id}` | Prevents accidental double-send |
| Bulk coupon issue | `bulk_coupon_issue:{coupon_type_id}:{user_id}:{request_token}` | The `request_token` from the client allows intentional repeats while blocking double-clicks |
| Daily reconciliation | `daily_reconciliation:{business_id}:{YYYY-MM-DD}` | One reconciliation per business per day |

**[XCC-053] Retry Policy.** Failed jobs retry with exponential backoff: 30s → 5min → 30min, up to `max_retries` (default 3). Beyond retries, status transitions to `dead_letter`.

**[XCC-054] Job Polling Endpoints.**

#### `[XCC-055]` Get job status

- **Method:** `GET` `/api/business/jobs/:id`
- **Output:** `{ id, job_type, status, payload_json, result_json, error_message, retry_count, created_at, started_at, completed_at }`

#### `[XCC-056]` List dead-letter jobs (super admin)

- **Method:** `GET` `/api/super/jobs/dead-letter`
- **Roles:** `super_admin`
- **Query:** `page`, `limit`, `job_type`, `business_id`
- **Output:** Paginated list of jobs requiring ops review.

#### `[XCC-057]` Retry a dead-letter job

- **Method:** `POST` `/api/super/jobs/:id/retry`
- **Roles:** `super_admin`
- **Behaviour:** Resets `status = queued`, `retry_count = 0`, optionally clears `unique_lock_key` if the original lock has expired naturally.

## 2.7 Employee Permission Keys

**[XCC-060] JSONB Permissions.** Employee permissions **shall** be stored in a single JSONB column `users.permissions` rather than as flat boolean columns. This includes the existing SRS-defined permissions (`can_void`, `can_refund`) which are migrated in the `AddCustomersAndLoyalty` migration as a prerequisite for new permission keys.

**Migration (one-time):**

```sql
-- Migrate existing booleans into JSONB
UPDATE users
SET permissions = jsonb_build_object(
  'can_void', can_void,
  'can_refund', can_refund
)
WHERE can_void = true OR can_refund = true;

-- Drop legacy columns
ALTER TABLE users
  DROP COLUMN can_void,
  DROP COLUMN can_refund;

-- Initialise new column with default empty object for all other users
UPDATE users SET permissions = '{}'::jsonb WHERE permissions IS NULL;
```

**[XCC-061] Permission Helper.** A server-side helper `userHasPermission(user, key)` reads `user.permissions->>key` (string `'true'`/`'false'`) and returns boolean. All endpoint role checks reference this helper.

**[XCC-062] Canonical Permission Keys.** New keys may be added at any time without a schema change. The current set:

| Key | Description | Source |
|---|---|---|
| `can_void` | Can void completed transactions | SRS (migrated) |
| `can_refund` | Can issue refunds | SRS (migrated) |
| `can_adjust_points` | Can manually adjust customer points balance | [CUST-051] |
| `can_redeem_points` | Can redeem points for a coupon via [PEX-011] | [PEX-011] |
| `can_approve_po` | Can transition purchase orders to `sent` | [INV-074] |
| `can_issue_coupons` | Can issue coupons via [CPN-020] | [CPN-020] |
| `can_close_table_session_partial` | Can close a table session with unpaid splits as a manager escape hatch | [RST-038] |
| `can_resolve_stock_discrepancy` | Can resolve stock discrepancy alerts via [INV-095] | [INV-095] |

Reserved key prefix `_system.*` is for system-managed permissions (e.g. `_system.granted_at`); user-modifiable keys do not use this prefix.

## 2.8 Receipt Additions

The mandatory receipt fields from SRS §3.6.2 remain unchanged. The following optional lines **shall** be added when applicable:

- Customer card number / phone (if a customer was attached to the sale)
- Per-line: original price, discount amount, final price (when discount > 0)
- Footer: "Remise totale" (total discount) before the HT/TVA block
- Footer: "Points gagnés" / "Points utilisés" (points earned and redeemed in this sale)
- Footer: "Solde points: NNN" (remaining customer points balance) — printed only if customer attached

These additions do not change the legal-compliance positioning of any existing field; ICE, IF, invoice number, and the HT/TVA/TTC block remain in their SRS-defined positions.

---

# 3. Module CUST — Customers & Loyalty

## 3.1 Overview

Adds first-class customer records (distinct from `users`, which holds owners/managers/employees). A customer represents an end-consumer enrolled in the business's loyalty programme. Each customer has a points wallet, optional grade (loyalty tier), zero or more labels (free-form tags), and zero or more custom attributes.

## 3.2 New Entities

### 3.2.1 `customers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK → businesses |
| `customer_code` | varchar(50) | Auto-generated, unique within business (e.g. `C-000001`) |
| `phone` | varchar(20) | Unique within business if present |
| `email` | varchar(255) | Optional |
| `first_name` | varchar(100) | |
| `last_name` | varchar(100) | |
| `birthday` | date | Optional, used for birthday campaigns |
| `gender` | varchar(10) | Optional, enum: `male`, `female`, `unspecified` |
| `address` | text | Optional |
| `grade_id` | UUID | FK → customer_grades (nullable) |
| `points_balance` | int | Current points, default 0 |
| `lifetime_points` | int | Cumulative points ever earned, default 0 |
| `is_active` | boolean | Soft-delete flag, default true |
| `consent_marketing` | boolean | GDPR-style opt-in for marketing, default false |
| `notes` | text | Free-form internal notes |
| `created_at` / `updated_at` | timestamp | |

### 3.2.2 `customer_grades` (loyalty tiers)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `name` | varchar(100) | e.g. "Bronze", "Silver", "Gold", "VIP" |
| `min_points` | int | Threshold to enter this grade |
| `discount_percent` | numeric(5,2) | Default discount applied to all sales for this grade, 0–100 |
| `points_multiplier` | numeric(4,2) | E.g. 1.5 = 1.5× points earned per MAD spent |
| `color_hex` | varchar(7) | UI badge colour, e.g. `#FFD700` |
| `sort_order` | int | Display order |
| `is_active` | boolean | |

### 3.2.3 `customer_labels`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `name` | varchar(100) | e.g. "Birthday This Month", "Lapsed", "Allergy: Nuts" |
| `color_hex` | varchar(7) | |
| `is_active` | boolean | |

### 3.2.4 `customer_label_assignments` (M:N join)

| Column | Type | Notes |
|---|---|---|
| `customer_id` | UUID | FK, composite PK |
| `label_id` | UUID | FK, composite PK |
| `assigned_at` | timestamp | |

### 3.2.5 `customer_attributes` (definitions)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `key` | varchar(100) | e.g. `corporate_employer`, `dietary_pref` |
| `label` | varchar(200) | Human-readable label |
| `data_type` | varchar(20) | `string` / `number` / `date` / `boolean` / `enum` |
| `enum_options` | jsonb | If `data_type = enum`, the allowed values |
| `is_required` | boolean | Whether new customers must fill this field |

### 3.2.6 `customer_attribute_values` (per-customer)

| Column | Type | Notes |
|---|---|---|
| `customer_id` | UUID | FK, composite PK |
| `attribute_id` | UUID | FK, composite PK |
| `value` | text | Stored as text, parsed per `data_type` |

### 3.2.7 `customer_points_history`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `customer_id` | UUID | FK |
| `delta` | int | Positive (earned) or negative (redeemed/adjusted) |
| `balance_after` | int | Snapshot for audit |
| `source` | varchar(40) | `sale` / `manual_adjustment` / `expiry` / `coupon_purchase` / `birthday_bonus` |
| `transaction_id` | UUID | FK → transactions, nullable |
| `adjusted_by_user_id` | UUID | FK → users, nullable (who made the manual adjustment) |
| `reason` | text | Mandatory for manual adjustments |
| `created_at` | timestamp | |

## 3.3 Modifications to Existing Entities

**[CUST-MOD-001]** Add to `transactions`: `customer_id UUID NULL`, `points_earned INT NOT NULL DEFAULT 0`, `points_redeemed INT NOT NULL DEFAULT 0`, `discount_total NUMERIC(12,2) NOT NULL DEFAULT 0`. The discount_total is the sum of all line `discount_amount` values per XCC-011.

**[CUST-MOD-002]** Add to `transaction_items`: `discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0`. The `item_ttc` stored is post-discount; HT and TVA are derived from the post-discount TTC per XCC-010.

## 3.4 Functional Requirements

### 3.4.1 Customer CRUD

#### `[CUST-001]` List customers (paginated, filterable)

- **Method:** `GET`
- **Path:** `/api/business/customers`
- **Roles:** `owner`, `manager`, `employee` (employee read-only at terminal — see [CUST-100])
- **Query params:**

| Param | Type | Required | Notes |
|---|---|:-:|---|
| `page` | int | — | default 1 |
| `limit` | int | — | default 20, max 100 |
| `search` | string | — | matches name, phone, email, customer_code |
| `grade_id` | UUID | — | filter by grade |
| `label_ids` | string | — | comma-separated label UUIDs (AND match) |
| `is_active` | boolean | — | default true |
| `created_from` | date | — | inclusive |
| `created_to` | date | — | inclusive |
| `birthday_from` | date | — | for birthday campaigns |
| `birthday_to` | date | — | |
| `points_op` | string | — | `gt`, `lt`, `eq` |
| `points_value` | int | — | used with `points_op` |

- **Output:**

```json
{
  "records": [
    {
      "id": "uuid",
      "customer_code": "C-000123",
      "phone": "+212600000000",
      "first_name": "Amina",
      "last_name": "El Idrissi",
      "grade": { "id": "uuid", "name": "Gold", "color_hex": "#FFD700" },
      "labels": [ { "id": "uuid", "name": "VIP" } ],
      "points_balance": 1250,
      "is_active": true,
      "created_at": "2026-04-01T10:00:00Z"
    }
  ],
  "total": 1834,
  "page": 1,
  "limit": 20
}
```

#### `[CUST-002]` Get customer detail

- **Method:** `GET`
- **Path:** `/api/business/customers/:id`
- **Roles:** `owner`, `manager`
- **Output:** Full customer object including grade, labels, attribute values, recent transactions count, lifetime stats (total spend, visit count, last visit date).

#### `[CUST-003]` Create customer

- **Method:** `POST`
- **Path:** `/api/business/customers`
- **Roles:** `owner`, `manager`, `employee` (cashier can quick-add at terminal — see [CUST-100])
- **Input (JSON body):**

| Field | Type | Required | Notes |
|---|---|:-:|---|
| `phone` | string | ✓ | E.164 format preferred; unique per business |
| `email` | string | — | |
| `first_name` | string | ✓ | |
| `last_name` | string | ✓ | |
| `birthday` | date | — | |
| `gender` | string | — | enum |
| `address` | string | — | |
| `grade_id` | UUID | — | defaults to lowest grade if `customer_loyalty` enabled |
| `label_ids` | UUID[] | — | |
| `attributes` | object | — | `{ attribute_key: value }` |
| `consent_marketing` | boolean | — | default false |
| `notes` | string | — | |

- **Output:** Created customer object; `customer_code` auto-generated (`C-` + 6-digit padded sequence per business). Returns `409` if phone already exists for this business.

#### `[CUST-004]` Update customer

- **Method:** `PATCH`
- **Path:** `/api/business/customers/:id`
- **Roles:** `owner`, `manager`
- **Input:** Any subset of the create-customer fields. Phone change requires re-verification via SMS code (deferred to Phase 6).

#### `[CUST-005]` Soft-delete customer

- **Method:** `DELETE`
- **Path:** `/api/business/customers/:id`
- **Roles:** `owner` only
- **Behaviour:** Sets `is_active = false`. Preserves all transaction history and points history (data retention per SRS NFR-D01). For GDPR-style hard delete (anonymise), see [CUST-006].

#### `[CUST-006]` Anonymise customer (GDPR right-to-be-forgotten)

- **Method:** `POST`
- **Path:** `/api/business/customers/:id/anonymise`
- **Roles:** `owner` only
- **Behaviour:** Replaces phone, email, name, address, attributes, and notes with `[ANONYMISED]` placeholders. Preserves customer_code, transaction links, and points history (financial records must be retained 10 years per NFR-D01). Logs to audit_logs with the requesting user, timestamp, and reason.
- **Input:** `{ "reason": "string" }`

### 3.4.2 Customer Dashboard Summary

#### `[CUST-010]` Loyalty dashboard summary

- **Method:** `GET`
- **Path:** `/api/business/customers/dashboard-summary`
- **Roles:** `owner`, `manager`
- **Output:**

```json
{
  "customer_total": 1834,
  "active_last_30_days": 612,
  "points_total": 2350000,
  "new_signups_last_30_days": 87,
  "by_grade": [
    { "grade_name": "Bronze", "count": 1200 },
    { "grade_name": "Silver", "count": 450 },
    { "grade_name": "Gold", "count": 184 }
  ]
}
```

### 3.4.3 Customer Grades

#### `[CUST-020]` List grades

- **Method:** `GET`
- **Path:** `/api/business/customer-grades`
- **Roles:** `owner`, `manager`, `employee` (read for grade display at terminal)

#### `[CUST-021]` Create grade

- **Method:** `POST`
- **Path:** `/api/business/customer-grades`
- **Roles:** `owner`, `manager`
- **Input:** `name`, `min_points`, `discount_percent`, `points_multiplier`, `color_hex`, `sort_order`

#### `[CUST-022]` Update grade

- **Method:** `PATCH`
- **Path:** `/api/business/customer-grades/:id`
- **Roles:** `owner`, `manager`
- **Note:** Changing `discount_percent` or `points_multiplier` does NOT retroactively alter past transactions (locked-in rule consistent with SRS [TVA-003]).

#### `[CUST-023]` Soft-delete grade

- **Method:** `DELETE`
- **Path:** `/api/business/customer-grades/:id`
- **Roles:** `owner`
- **Behaviour:** Customers currently on this grade are demoted to the lowest active grade.

### 3.4.4 Customer Labels

#### `[CUST-030]` List labels

- **Method:** `GET` `/api/business/customer-labels`

#### `[CUST-031]` Create label

- **Method:** `POST` `/api/business/customer-labels`
- **Input:** `name`, `color_hex`

#### `[CUST-032]` Update label

- **Method:** `PATCH` `/api/business/customer-labels/:id`

#### `[CUST-033]` Delete label

- **Method:** `DELETE` `/api/business/customer-labels/:id`
- **Behaviour:** Cascades removal of all `customer_label_assignments` for this label.

#### `[CUST-034]` Assign labels to a customer (replace set)

- **Method:** `PUT` `/api/business/customers/:id/labels`
- **Input:** `{ "label_ids": [ "uuid", "uuid" ] }`

### 3.4.5 Customer Custom Attributes

#### `[CUST-040]` List attribute definitions

- **Method:** `GET` `/api/business/customer-attributes`

#### `[CUST-041]` Create attribute definition

- **Method:** `POST` `/api/business/customer-attributes`
- **Input:** `key`, `label`, `data_type`, `enum_options` (if applicable), `is_required`

#### `[CUST-042]` Update attribute definition

- **Method:** `PATCH` `/api/business/customer-attributes/:id`
- **Constraint:** Changing `data_type` is not allowed once any customer has values for this attribute. Workaround: create a new attribute, migrate values, delete the old one.

#### `[CUST-043]` Delete attribute definition

- **Method:** `DELETE` `/api/business/customer-attributes/:id`
- **Behaviour:** Cascades deletion of all `customer_attribute_values` for this definition.

#### `[CUST-044]` Get a customer's attribute values

- **Method:** `GET` `/api/business/customers/:id/attributes`

#### `[CUST-045]` Set a customer's attribute values

- **Method:** `PUT` `/api/business/customers/:id/attributes`
- **Input:** `{ "values": { "attribute_key_1": "value", "attribute_key_2": "value" } }`
- **Behaviour:** Validates each value against the attribute's `data_type`. Returns 400 with detailed errors per field if validation fails.

### 3.4.6 Points Management

#### `[CUST-050]` Get points history

- **Method:** `GET` `/api/business/customers/:id/points-history`
- **Query:** `page`, `limit`, `from_date`, `to_date`, `source`
- **Output:** Paginated list of `customer_points_history` entries with running balance.

#### `[CUST-051]` Manual points adjustment

- **Method:** `POST` `/api/business/customers/:id/points-adjustment`
- **Roles:** `owner`, `manager` (employee `can_adjust_points` permission flag — see [CUST-MOD-003])
- **Input:**

| Field | Type | Required | Notes |
|---|---|:-:|---|
| `delta` | int | ✓ | Positive or negative |
| `reason` | string | ✓ | Min 10 chars; logged to audit |

- **Behaviour:** Atomic update of `customers.points_balance` and append to `customer_points_history` with `source = manual_adjustment`. Returns 422 if the adjustment would make balance negative.

#### `[CUST-052]` Batch import grades

- **Method:** `POST` `/api/business/customers/import-grades`
- **Roles:** `owner`, `manager`
- **Input (multipart/form-data):** CSV file with columns `customer_phone`, `grade_name`. Max 10,000 rows per upload.
- **Output:**

```json
{
  "processed": 9876,
  "succeeded": 9842,
  "failed": 34,
  "errors": [
    { "row": 12, "phone": "+212...", "error": "Customer not found" }
  ]
}
```

- **Behaviour:** Runs as background job for files > 1000 rows; returns a `job_id` and the client polls `/api/business/jobs/:id`. Logs each grade change to audit_logs.

**[CUST-MOD-003]** Permission `can_adjust_points` lives in `users.permissions` JSONB column per [XCC-060]. The column itself is added by the `AddCustomersAndLoyalty` migration (which also performs the one-time migration of legacy `can_void` / `can_refund` columns). New permission keys do not require schema changes.

### 3.4.7 Terminal-Side Customer Operations

#### `[CUST-100]` Look up customer by phone (terminal)

- **Method:** `GET` `/api/terminal/customers/lookup`
- **Query:** `phone` (string)
- **Behaviour:** Returns the customer (id, name, grade, points_balance) or 404. Works in offline mode against the local SQLite cache. Updates `last_seen_at` on the customer when sale completes.

#### `[CUST-101]` Quick-add customer at terminal

- **Method:** `POST` `/api/terminal/customers/quick-add`
- **Input:** `phone`, `first_name`, `last_name` (other fields optional, set later via dashboard). In offline mode this creates a temporary client-side ID and queues a sync operation.

#### `[CUST-102]` Attach customer to active sale (terminal)

- **Method:** `POST` `/api/terminal/sales/:cart_id/attach-customer`
- **Input:** `{ "customer_id": "uuid" }`
- **Behaviour:** The cart-side state holds the customer reference; on payment confirmation this is written to `transactions.customer_id` and points-earning rules apply per [CUST-110].

#### `[CUST-110]` Earn points on completed sale (server-side, automatic)

- **Trigger:** `transactions` insert with non-null `customer_id`
- **Logic:**
  1. Compute base points: `base = floor(transaction.total_ttc / business.points_earn_divisor)`. **Critical:** `transaction.total_ttc` is the **final post-discount, post-points-redemption, post-coupon TTC** — i.e. the amount actually charged to the customer per XCC-010 / XCC-017. No points are earned on amounts funded by points redemption, on grade discounts, on promotions, or on coupon redemptions. This prevents the circular value-leak where a 100-point redemption (worth 5 MAD off) would otherwise still earn ~100 points back, making redemption free.
  2. Apply grade multiplier: `points = floor(base × customer.grade.points_multiplier)`.
  3. Atomic update: `customers.points_balance += points`, `customers.lifetime_points += points`.
  4. Insert `customer_points_history` row with `source = sale`, `transaction_id = txn.id`.
  5. Re-evaluate grade: if `lifetime_points` crosses the next grade's `min_points` threshold, promote.
  6. Update `transactions.points_earned = points` (for receipt display).

**Void and refund reversal.** When a transaction with `points_earned > 0` is **voided** (per SRS void flow), or when a refund is issued that brings the net transaction value to zero, the system **shall** atomically:

1. Insert a `customer_points_history` row with `source = void_reversal` (or `refund_reversal`) and `delta = -points_earned`.
2. Decrement `customers.points_balance` by `points_earned`. If the customer's current balance is below `points_earned` (they already spent the points on a subsequent purchase), the balance is set to 0 and the shortfall is logged as a separate history row with `source = points_write_off`.
3. The customer's `lifetime_points` is **NOT** decremented — lifetime is a permanent record used for grade-tier evaluation, and grade demotion via reversal would create an unstable customer experience.

For partial refunds, `points_earned` is reversed proportionally: `points_to_reverse = floor(points_earned × (refund_amount_ttc / original_total_ttc))`. Likewise, any `points_redeemed` on the original transaction is restored proportionally (refunding a sale where 100 points were spent restores the corresponding fraction of those points to the customer's balance).

**[CUST-MOD-004]** Add to `businesses`: `points_earn_divisor NUMERIC(8,2) NOT NULL DEFAULT 1.00`. The amount of total_ttc (in MAD) that earns 1 base point.

#### `[CUST-111]` Redeem points against active sale (terminal)

- **Method:** `POST` `/api/terminal/sales/:cart_id/redeem-points`
- **Input:** `{ "points": 100 }`
- **Behaviour:**
  - Validates `points <= customer.points_balance` (offline: against cached balance; conflicts surface at sync per XCC-031).
  - Computes cash-equivalent: `discount = points × business.points_redeem_value` (new business config field, default 0.05 — meaning 100 points = 5 MAD).
  - Applies discount per XCC-013 (distributed across line items) and slots into the discount pipeline at the coupon step per XCC-017 (operates on TTC₂ produced after grade and promotions).
  - Records intent in cart state; on payment confirmation, writes `transactions.points_redeemed = points`, decrements `customers.points_balance`, appends to `customer_points_history` with `source = redemption`.

**[CUST-MOD-005]** Add to `businesses`: `points_redeem_value NUMERIC(8,4) NOT NULL DEFAULT 0.05`. MAD value of 1 redeemed point.


---

# 4. Module PROM — Promotions & Campaigns

## 4.1 Overview

A promotion is a configured offer that automatically applies (or is selectable) for qualifying transactions during a defined date/time window, optionally limited to specific customer segments, locations, and stock budgets. Promotions are richer than coupons: a promotion can fire automatically based on cart contents (e.g. "10% off all bakery items on Tuesdays") whereas a coupon (Module CPN) is a user-presented code.

## 4.2 New Entities

### 4.2.1 `promotions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `code` | varchar(40) | Unique within business; auto or manual |
| `name` | varchar(200) | Display name |
| `description` | text | Internal description |
| `promotion_type` | varchar(40) | `percent_off_order`, `percent_off_category`, `percent_off_product`, `fixed_off_order`, `fixed_off_product`, `bogo` (buy-one-get-one), `bundle`, `points_multiplier` |
| `value` | numeric(12,2) | Percentage (0–100) or fixed MAD amount, depending on type |
| `target_category_id` | UUID | FK → categories (when type targets a category) |
| `target_product_id` | UUID | FK → products (when type targets a product) |
| `min_order_total_ttc` | numeric(12,2) | Minimum order total (TTC) to qualify, default 0 |
| `start_date` | date | Inclusive |
| `end_date` | date | Inclusive |
| `valid_date_type` | varchar(1) | `D` daily, `W` weekly, `M` monthly |
| `valid_dates` | varchar(100) | Comma-separated days (1-7 for week, 1-31 for month) |
| `day_type` | varchar(1) | `A` all day, `T` time-period |
| `time_periods` | jsonb | `[{ "start": "HH:mm", "end": "HH:mm" }]` |
| `adjust_for_holidays` | boolean | Pause on Moroccan public holidays |
| `invalid_date_periods` | jsonb | `[{ "start": "yyyy-MM-dd", "end": "yyyy-MM-dd" }]` blackout dates |
| `target_audience` | varchar(20) | `all`, `grade`, `label`, `specific_customers` |
| `target_grade_ids` | UUID[] | Used when `target_audience = grade` |
| `target_label_ids` | UUID[] | Used when `target_audience = label` |
| `target_customer_ids` | UUID[] | Used when `target_audience = specific_customers` |
| `applicable_location_ids` | UUID[] | Empty = all locations |
| `max_total_uses` | int | 0 = unlimited |
| `max_uses_per_day` | int | 0 = unlimited |
| `max_uses_per_customer` | int | 0 = unlimited |
| `max_uses_per_customer_day` | int | 0 = unlimited |
| `current_uses` | int | Atomic counter, default 0 |
| `notify_sms` | boolean | Send SMS to eligible customers when activated |
| `notify_email` | boolean | |
| `notify_whatsapp` | boolean | |
| `advance_notify_days` | int | Days before start_date to send notifications |
| `share_enabled` | boolean | Allow social share |
| `share_main_title` | varchar(200) | |
| `share_subtitle` | varchar(200) | |
| `share_poster_url` | varchar(500) | Image path |
| `share_landing_url` | varchar(500) | H5 / mini-app link |
| `status` | varchar(20) | `draft`, `active`, `paused`, `expired`, `archived` |
| `remark` | text | |
| `created_by_user_id` | UUID | FK → users |
| `created_at` / `updated_at` | timestamp | |

### 4.2.2 `promotion_redemptions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `promotion_id` | UUID | FK |
| `transaction_id` | UUID | FK → transactions |
| `customer_id` | UUID | FK → customers, nullable |
| `discount_applied` | numeric(12,2) | Actual MAD discount given |
| `redeemed_at` | timestamp | |

## 4.3 Modifications to Existing Entities

**[PROM-MOD-001]** *(removed in v1.1 — `applied_promotion_ids UUID[]` was replaced by the `promotion_redemptions` join table, which already records every (promotion, transaction) pair with proper FK integrity. No new column on `transactions` is needed for promotion tracking. Queries that need to find "all transactions that used promotion X" join through `promotion_redemptions` directly.)*

## 4.4 Functional Requirements

### 4.4.1 Promotion CRUD

#### `[PROM-001]` List promotions

- **Method:** `GET` `/api/business/promotions`
- **Query:** `page`, `limit`, `status`, `promotion_type`, `active_now` (boolean filter), `search`
- **Output:** Paginated promotions with `current_uses` and a computed `is_currently_running` flag.

#### `[PROM-002]` Get promotion detail

- **Method:** `GET` `/api/business/promotions/:id`
- **Output:** Full promotion plus aggregate stats (total redemptions, total discount given, unique customers).

#### `[PROM-003]` Create promotion

- **Method:** `POST` `/api/business/promotions`
- **Roles:** `owner`, `manager`
- **Input:** All `promotions` fields except auto-managed ones (`current_uses`, `created_by_user_id`, timestamps). Validates that `start_date <= end_date`, percentage values are 0–100, all referenced category/product/grade/label/customer/location IDs belong to the same business.
- **Output:** Created promotion. Status defaults to `draft`. Use [PROM-005] to activate.

#### `[PROM-004]` Update promotion

- **Method:** `PATCH` `/api/business/promotions/:id`
- **Constraint:** Once a promotion has `current_uses > 0`, the `value`, `promotion_type`, `target_*`, `start_date`, and `end_date` fields become immutable. Other fields (notification toggles, share copy, max_uses_*) remain editable. Returns 422 with the list of locked fields if violated.

#### `[PROM-005]` Activate promotion

- **Method:** `POST` `/api/business/promotions/:id/activate`
- **Behaviour:** Sets `status = active`. Triggers notification fan-out per [PROM-030] if any `notify_*` flag is true.

#### `[PROM-006]` Pause promotion

- **Method:** `POST` `/api/business/promotions/:id/pause`
- **Behaviour:** Sets `status = paused`. Active redemptions in flight are unaffected; new redemptions are rejected.

#### `[PROM-007]` Archive promotion

- **Method:** `POST` `/api/business/promotions/:id/archive`
- **Behaviour:** Sets `status = archived`. Cannot be reactivated. Use only for end-of-life cleanup.

### 4.4.2 Promotion Evaluation at Terminal

#### `[PROM-020]` Evaluate applicable promotions for current cart

- **Method:** `POST` `/api/terminal/sales/:cart_id/evaluate-promotions`
- **Input:**

```json
{
  "items": [
    { "product_id": "uuid", "variant_id": "uuid", "quantity": 2, "unit_price_ttc": 25.00 }
  ],
  "customer_id": "uuid|null",
  "location_id": "uuid",
  "current_time": "2026-04-27T14:30:00Z"
}
```

- **Output:**

```json
{
  "applicable_promotions": [
    {
      "promotion_id": "uuid",
      "name": "10% off bakery on Tuesdays",
      "promotion_type": "percent_off_category",
      "auto_apply": true,
      "computed_discount": 4.50,
      "affected_line_indexes": [0, 2]
    }
  ],
  "stackable": true
}
```

- **Behaviour:** Server-side filter applies these conditions in order: status = active, current time in valid window, valid_dates includes today, time_periods includes now, customer matches target_audience, location_id in applicable_location_ids (or empty), min_order_total_ttc met, max_uses_* limits not exceeded. Works in offline mode against cached promotion data; final validation on server at sync.

#### `[PROM-021]` Stacking rules

**[PROM-021]** When multiple promotions are applicable, the terminal **shall** apply them in this order: (1) product-level discounts first, (2) category-level discounts second, (3) order-level discounts last. The `business.promotion_stacking_mode` setting controls whether all applicable auto-promotions stack (`stack`) or only the highest-discount one applies (`best_only`); default is `best_only`.

**[PROM-MOD-002]** Add to `businesses`: `promotion_stacking_mode VARCHAR(20) NOT NULL DEFAULT 'best_only'` (enum: `stack`, `best_only`).

#### `[PROM-022]` Apply promotion to cart

- **Method:** `POST` `/api/terminal/sales/:cart_id/apply-promotion`
- **Input:** `{ "promotion_id": "uuid" }`
- **Behaviour:** Adds the promotion to the cart-side applied list. On payment confirmation, the server: (1) re-validates the promotion is still active and applicable, (2) atomically increments `current_uses` (rejected if it would exceed max_total_uses, max_uses_per_day, max_uses_per_customer, or max_uses_per_customer_day), (3) inserts a `promotion_redemptions` row linking the promotion to the new transaction. The `promotion_redemptions` row is the source of truth — there is no array column on `transactions` to maintain. If atomic increment fails, the transaction completes WITHOUT the promotion and the cashier is alerted.

### 4.4.3 Sub-Store Promotion Validation (Chain)

#### `[PROM-040]` Validate promotion against sub-store configurations

- **Method:** `POST` `/api/business/promotions/:id/validate-sub-stores`
- **Roles:** `owner` (parent business only)
- **Behaviour:** For each child business in the chain (Module CHN), checks: (1) the targeted category/product exists in the child's catalogue, (2) the targeted customer grades exist, (3) the child's TVA rates and pricing yield sensible discount math (per CHN-MOD-006, synced products may have unconfigured TVA rates that fall back to the child's category default — flagged here), (4) the child has the `promotions` feature flag enabled. Returns a per-store report.
- **Output:**

```json
{
  "results": [
    {
      "child_business_id": "uuid",
      "store_name": "Casablanca Centre",
      "is_valid": true,
      "errors": [],
      "warnings": [],
      "tva_rate_mismatch_warnings": []
    },
    {
      "child_business_id": "uuid",
      "store_name": "Rabat Agdal",
      "is_valid": false,
      "errors": ["Category 'Pâtisserie' not in catalogue"],
      "warnings": [],
      "tva_rate_mismatch_warnings": [
        {
          "product_name": "Croissant",
          "parent_tva_rate": 10.00,
          "child_effective_tva_rate": 20.00,
          "note": "Synced product uses child category default; review manually"
        }
      ]
    }
  ]
}
```

### 4.4.4 Promotion Notifications

#### `[PROM-030]` Send promotion notifications

- **Trigger:** Promotion activation or `advance_notify_days` reached
- **Behaviour:** Background job enumerates eligible customers (per `target_audience`) who have `consent_marketing = true` AND have a phone (for SMS) / email / WhatsApp number. Dispatches to Module COM for delivery. Records send count in audit_logs.

### 4.4.5 Promotion Reports

#### `[PROM-050]` Promotion performance report

- **Method:** `GET` `/api/business/reports/promotions`
- **Query:** `from_date`, `to_date`, `promotion_id` (optional)
- **Output:** Per-promotion: redemption count, total discount given, unique customers, attributable revenue (sum of total_ttc on transactions where this promotion was applied), redemption-to-targeted ratio (if notifications were sent).

---

# 5. Module CPN — Coupons

## 5.1 Overview

Coupons are presentable codes (or QR codes) that a customer redeems at the point of sale to receive a discount or a free item. Distinct from promotions in that coupons are **explicit** (the customer presents one) rather than **implicit** (auto-applied). Coupons can be issued: (a) automatically on a customer joining a grade, (b) as the reward of a points exchange (Module PEX), (c) as a gift via a marketing campaign, (d) bulk-printed for handouts.

## 5.2 New Entities

### 5.2.1 `coupon_types`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `code` | varchar(40) | Unique within business |
| `name` | varchar(200) | Display name e.g. "10% off any drink" |
| `description` | text | |
| `discount_type` | varchar(20) | `percent`, `fixed_amount`, `free_item` |
| `discount_value` | numeric(12,2) | % or MAD; ignored for `free_item` |
| `free_item_product_id` | UUID | FK → products (when `discount_type = free_item`) |
| `free_item_variant_id` | UUID | FK → product_variants, nullable |
| `min_order_total_ttc` | numeric(12,2) | Default 0 |
| `applicable_category_ids` | UUID[] | Empty = all categories |
| `applicable_product_ids` | UUID[] | Empty = all products |
| `validity_days_from_issue` | int | Default 30 |
| `share_case` | varchar(1) | `Y` shareable, `N` not |
| `is_active` | boolean | |
| `created_at` / `updated_at` | timestamp | |

### 5.2.2 `coupons` (issued instances)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `coupon_type_id` | UUID | FK |
| `coupon_code` | varchar(50) | Unique within business; printable, e.g. `CPN-XXXX-YYYY` |
| `customer_id` | UUID | FK → customers, nullable (anonymous coupons allowed) |
| `issued_at` | timestamp | |
| `issued_by_user_id` | UUID | FK → users, nullable (system-issued) |
| `issue_source` | varchar(40) | `manual`, `points_exchange`, `promotion`, `grade_grant`, `bulk_print`, `birthday_bonus` |
| `expires_at` | timestamp | Computed from `issued_at + coupon_type.validity_days_from_issue` |
| `redeemed_at` | timestamp | Null until redeemed |
| `redeemed_in_transaction_id` | UUID | FK → transactions, nullable |
| `redeemed_by_terminal_id` | UUID | FK → terminals, nullable |
| `status` | varchar(20) | `available`, `redeemed`, `expired`, `voided` |

## 5.3 Functional Requirements

### 5.3.1 Coupon Type CRUD

#### `[CPN-001]` List coupon types

- **Method:** `GET` `/api/business/coupon-types`
- **Query:** `page`, `limit`, `is_active`, `discount_type`, `share_case`

#### `[CPN-002]` Create coupon type

- **Method:** `POST` `/api/business/coupon-types`
- **Roles:** `owner`, `manager`

#### `[CPN-003]` Update coupon type

- **Method:** `PATCH` `/api/business/coupon-types/:id`
- **Constraint:** Cannot change `discount_type`, `discount_value`, `free_item_product_id` once any coupons of this type have been issued. Use [CPN-004] to clone if changes are needed.

#### `[CPN-004]` Clone coupon type

- **Method:** `POST` `/api/business/coupon-types/:id/clone`
- **Output:** New coupon type with name suffixed " (Copy)" and `is_active = false`.

#### `[CPN-005]` Deactivate coupon type

- **Method:** `DELETE` `/api/business/coupon-types/:id`
- **Behaviour:** Sets `is_active = false`. Existing issued coupons remain valid until expiry.

### 5.3.2 Available Coupons (Customer-Facing Listing)

#### `[CPN-010]` List collectable coupon types for a customer

- **Method:** `GET` `/api/business/coupons/collectable`
- **Query:** `customer_id` (optional), `share_case` (filter), `applicable_to_product_id`
- **Behaviour:** Returns coupon types the given customer is eligible to collect (e.g. shareable types they don't already hold an unredeemed instance of).
- **Output:** Array of coupon types with computed eligibility flag per customer.

### 5.3.3 Coupon Issuance

#### `[CPN-020]` Issue coupon (manual)

- **Method:** `POST` `/api/business/coupons/issue`
- **Roles:** `owner`, `manager`, `employee` (with `can_issue_coupons` permission)
- **Input:**

| Field | Type | Required | Notes |
|---|---|:-:|---|
| `coupon_type_id` | UUID | ✓ | |
| `customer_id` | UUID | — | Null = anonymous bearer coupon |
| `quantity` | int | — | Default 1; max 1000 per call (use [CPN-021] for bulk) |
| `expires_at` | timestamp | — | Override default expiry |
| `note` | string | — | Audit reason |

- **Output:** Array of created `coupons` with `coupon_code`. Coupon codes are 12-char alphanumeric (excluding 0/O, 1/I/L) with checksum digit for OCR-friendly print.

#### `[CPN-021]` Bulk issue coupons (background job)

- **Method:** `POST` `/api/business/coupons/bulk-issue`
- **Input:** Same as [CPN-020] but `quantity` up to 100,000. Returns `job_id`.
- **Output:** PDF download of all coupon codes (each with QR + human-readable code) once job completes.

#### `[CPN-022]` Issue coupons to a customer segment

- **Method:** `POST` `/api/business/coupons/issue-to-segment`
- **Input:** `coupon_type_id`, `target_audience` (mirrors promotion targeting), `target_grade_ids`/`target_label_ids`/`target_customer_ids`, `notify_sms`/`notify_email`/`notify_whatsapp`
- **Behaviour:** Background job. Issues one coupon per matched customer. Sends notification with the coupon code.

### 5.3.4 Coupon Redemption (Terminal)

#### `[CPN-030]` Look up coupon by code

- **Method:** `GET` `/api/terminal/coupons/lookup`
- **Query:** `code`
- **Output:** Coupon with computed flags: `is_redeemable_now`, `applicable_to_cart` (after server cross-checks current cart contents and rules).
- **Errors:** 404 if code not found, 410 if expired/redeemed/voided.

#### `[CPN-031]` Apply coupon to cart

- **Method:** `POST` `/api/terminal/sales/:cart_id/apply-coupon`
- **Input:** `{ "coupon_code": "string" }`
- **Behaviour:** Server-side validates: status = available, not expired, customer match (if coupon is bound), min_order_total_ttc met, applicable categories/products match cart contents. Computes the actual discount or free item line. Adds coupon to cart-side applied list. Final atomic redemption happens on payment confirmation per [CPN-032].

#### `[CPN-032]` Finalise coupon redemption

- **Trigger:** Server-side on `transactions` insert
- **Behaviour:** For each coupon in the cart's applied list: atomic `UPDATE coupons SET status='redeemed', redeemed_at=NOW(), redeemed_in_transaction_id=:txn_id, redeemed_by_terminal_id=:term_id WHERE id=:coupon_id AND status='available'`. If 0 rows updated (race lost), the transaction completes WITHOUT this coupon's discount and a "coupon already redeemed" line surfaces in the failed-sync UI. On success, also inserts a `coupon_redemptions` row (new table — see §13.1) capturing `(business_id, coupon_id, transaction_id, customer_id, discount_applied, redeemed_at)` for performant per-coupon usage queries. The discount math on `transaction_items` is fixed at the moment of payment confirmation per XCC-012.

**[CPN-MOD-001]** *(removed in v1.1 — `applied_coupon_ids UUID[]` was replaced by the new `coupon_redemptions` join table, which mirrors `promotion_redemptions` with proper FKs and indexable queries. The `coupons.redeemed_in_transaction_id` foreign key already provides the inverse lookup; the `coupon_redemptions` table is added for symmetry with promotions and to support multi-coupon transactions cleanly.)*

#### `[CPN-033]` Void coupon (manager action)

- **Method:** `POST` `/api/business/coupons/:id/void`
- **Roles:** `owner`, `manager`
- **Input:** `{ "reason": "string" }`
- **Behaviour:** Sets `status = voided`. Used for fraud, expired-batch cleanup, or customer service goodwill (after refunding original issuance). Cannot void already-redeemed coupons.

### 5.3.5 Coupon Reports

#### `[CPN-040]` Coupon usage report

- **Method:** `GET` `/api/business/reports/coupons`
- **Query:** `from_date`, `to_date`, `coupon_type_id`, `issue_source`
- **Output:** Per-coupon-type: total issued, total redeemed, total expired, redemption rate %, total discount given (MAD).

---

# 6. Module PEX — Points Exchange Rules

## 6.1 Overview

Defines the catalogue of "you can exchange N points for X" rules. When a customer requests an exchange (at the dashboard or terminal), the rule's reward (a coupon, a free product, or a discount) is granted in exchange for the points being deducted from the customer's wallet.

## 6.2 New Entities

### 6.2.1 `points_exchange_rules`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `name` | varchar(200) | Display name |
| `point_value` | int | Points required to redeem |
| `rule_type` | varchar(20) | `coupon`, `free_product`, `discount` |
| `validity_date_type` | varchar(1) | `D` daily, `W` weekly, `M` monthly |
| `validity_days` | int | Granted item validity days from redemption |
| `rule_start_date` | date | When this rule is active |
| `rule_end_date` | date | |
| `applicable_location_ids` | UUID[] | Empty = all locations |
| `total_redemptions_limit` | int | 0 = unlimited |
| `per_customer_limit` | int | 0 = unlimited |
| `per_customer_per_day_limit` | int | 0 = unlimited |
| `current_redemptions` | int | Atomic counter |
| `remark` | text | |
| `is_active` | boolean | |
| `created_at` / `updated_at` | timestamp | |

### 6.2.2 `points_exchange_rule_details`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `rule_id` | UUID | FK |
| `coupon_type_id` | UUID | FK → coupon_types, nullable (when `rule_type = coupon`) |
| `product_id` | UUID | FK → products, nullable (when `rule_type = free_product`) |
| `variant_id` | UUID | FK → product_variants, nullable |
| `quantity_per_redemption` | int | Default 1 |
| `discount_amount_mad` | numeric(12,2) | Used when `rule_type = discount` |

### 6.2.3 `points_exchange_redemptions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `rule_id` | UUID | FK |
| `customer_id` | UUID | FK |
| `points_spent` | int | Snapshot of `rule.point_value` at redemption time |
| `granted_coupon_id` | UUID | FK → coupons (when rule_type = coupon) |
| `granted_in_transaction_id` | UUID | FK → transactions (when redeemed mid-sale) |
| `redeemed_at` | timestamp | |

## 6.3 Functional Requirements

### 6.3.1 Rule CRUD

#### `[PEX-001]` List points exchange rules

- **Method:** `GET` `/api/business/points-exchange-rules`
- **Query:** `page`, `limit`, `is_active`, `rule_type`, `currently_valid` (filter)

#### `[PEX-002]` Get rule detail

- **Method:** `GET` `/api/business/points-exchange-rules/:id`
- **Output:** Rule plus all `points_exchange_rule_details` and a `total_redemptions` count.

#### `[PEX-003]` Check for duplicate point value

- **Method:** `GET` `/api/business/points-exchange-rules/check-point-value`
- **Query:** `point_value` (int), `rule_type` (string), `exclude_rule_id` (UUID, when editing)
- **Output:** `{ "count": 0 }` — non-zero indicates a conflicting rule exists. Used by the UI to warn before save.

#### `[PEX-004]` Create rule with details

- **Method:** `POST` `/api/business/points-exchange-rules`
- **Roles:** `owner`, `manager`
- **Input (mirrors AiBao's `saveRuleAndRuleDetail` shape):**

```json
{
  "rule": {
    "name": "100 points → 10 MAD coupon",
    "point_value": 100,
    "rule_type": "coupon",
    "validity_date_type": "D",
    "validity_days": 30,
    "rule_start_date": "2026-05-01",
    "rule_end_date": "2026-12-31",
    "applicable_location_ids": [],
    "total_redemptions_limit": 0,
    "per_customer_limit": 5,
    "per_customer_per_day_limit": 1,
    "remark": "Standard tier reward"
  },
  "details": [
    {
      "coupon_type_id": "uuid",
      "quantity_per_redemption": 1
    }
  ]
}
```

- **Behaviour:** Pre-flight calls [PEX-003] internally; returns 409 with conflict info if a duplicate exists. Writes rule + details in a single transaction.

#### `[PEX-005]` Update rule

- **Method:** `PATCH` `/api/business/points-exchange-rules/:id`
- **Constraint:** `point_value` and `rule_type` are immutable once `current_redemptions > 0`. Other fields editable.

#### `[PEX-006]` Deactivate rule

- **Method:** `DELETE` `/api/business/points-exchange-rules/:id`
- **Behaviour:** Sets `is_active = false`. Existing redemptions and granted coupons remain valid.

### 6.3.2 Rule Redemption

#### `[PEX-010]` List rules redeemable by a customer right now

- **Method:** `GET` `/api/business/points-exchange-rules/redeemable-for-customer`
- **Query:** `customer_id`
- **Output:** Rules where: rule active, current date in rule_start/end_date window, customer has enough points, per-customer limits not exceeded, total_redemptions_limit not exceeded.

#### `[PEX-011]` Redeem a rule for a customer

- **Method:** `POST` `/api/business/points-exchange-rules/:id/redeem`
- **Roles:** `owner`, `manager`, `employee` (with `can_redeem_points`)
- **Input:** `{ "customer_id": "uuid" }`
- **Behaviour (server-side, atomic transaction):**
  1. Lock customer row, verify `points_balance >= rule.point_value`.
  2. Validate per-customer/total limits (atomic increment with check).
  3. Decrement `customers.points_balance`, append `customer_points_history` row with `source = points_exchange`.
  4. Per `rule_type`:
     - `coupon`: issue a new `coupons` row of the linked coupon_type, with `customer_id` set, `issue_source = points_exchange`. Return the issued coupon.
     - `free_product`: issue a coupon of an internally-managed coupon type (`free_item` discount type) referencing the rule's `product_id`. Return the issued coupon.
     - `discount`: issue a coupon (`fixed_amount` discount type) for `discount_amount_mad`. Return the issued coupon.
  5. Insert `points_exchange_redemptions` row.
  6. Return `{ redemption: {...}, granted_coupon: {...} }`.

**Note:** All three rule types funnel through a coupon issuance, keeping a single redemption flow at the terminal (always a coupon code). This avoids duplicate cart-discount machinery.

**[PEX-MOD-001]** Permission `can_redeem_points` lives in `users.permissions` JSONB column per [XCC-060].

### 6.3.3 Reports

#### `[PEX-020]` Points exchange report

- **Method:** `GET` `/api/business/reports/points-exchange`
- **Query:** `from_date`, `to_date`, `rule_id`
- **Output:** Per-rule: total redemptions, points-spent total, customers reached, granted coupon redemption rate (% of granted coupons that were actually used).


---

# 7. Module RST — Restaurant Operations

## 7.1 Overview

Adds dining-area zoning, table management, and table-service ordering flow. Gated by `business_type_features.feature_key = 'tables'`, which defaults to enabled only for the Restaurant business type. The feature is dormant for Retail, Pharmacy, Salon, and Hotel.

## 7.2 New Entities

### 7.2.1 `dining_areas` (zones)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `location_id` | UUID | FK → locations |
| `name` | varchar(100) | e.g. "Indoor Seating", "Terrace" |
| `description` | text | |
| `sort_order` | int | Display order |
| `is_active` | boolean | |

### 7.2.2 `table_types`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `name` | varchar(100) | e.g. "Standard", "Booth", "Bar Stool", "Private Room" |
| `default_capacity` | int | Default seats |
| `is_active` | boolean | |

### 7.2.3 `tables`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `location_id` | UUID | FK |
| `area_id` | UUID | FK → dining_areas |
| `table_type_id` | UUID | FK → table_types |
| `table_number` | varchar(20) | Display label e.g. "T-12", "B3" |
| `capacity` | int | Seats |
| `position_x` | int | Optional X coordinate for floor-plan UI |
| `position_y` | int | Optional Y coordinate |
| `qr_code` | varchar(100) | Unique QR for customer self-service ordering (deferred) |
| `is_active` | boolean | |

### 7.2.4 `table_sessions` (open table = unpaid order session)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `location_id` | UUID | FK |
| `table_id` | UUID | FK |
| `opened_at` | timestamp | |
| `opened_by_user_id` | UUID | FK → users |
| `closed_at` | timestamp | Null while open |
| `closed_in_transaction_id` | UUID | FK → transactions, set when paid as a single transaction (no split). Null for split sessions — query `transactions WHERE table_session_id = :id` for the linked transactions. |
| `customer_id` | UUID | FK, nullable |
| `guest_count` | int | Number of guests, optional |
| `expected_split_count` | int | Default 1; number of splits requested at close time. Session remains in `awaiting_payment` until this many `transactions` rows are linked back via `table_session_id`, OR a manager closes the partial state via [RST-038]. |
| `partial_payment` | boolean | Default false; set true when [RST-038] closes a session with unpaid splits remaining. |
| `notes` | text | Server notes for kitchen |
| `status` | varchar(20) | `open`, `awaiting_payment`, `paid`, `cancelled` |

### 7.2.5 `table_session_items` (cart contents while open)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK | _added in v1.1 per XCC-001_ |
| `table_session_id` | UUID | FK |
| `product_id` | UUID | FK |
| `variant_id` | UUID | FK, nullable |
| `customer_id` | UUID | FK, nullable | _added in v1.1; the per-item "this item belongs to guest X" attribution used for split-bill grouping_ |
| `quantity` | int | |
| `unit_price_ttc` | numeric(12,2) | Locked at add-time |
| `modifiers_json` | jsonb | Selected modifier choices |
| `notes` | varchar(500) | Per-item kitchen note (e.g. "no onions") |
| `added_at` | timestamp | |
| `added_by_user_id` | UUID | FK → users |
| `kds_status` | varchar(20) | `new`, `preparing`, `ready`, `served` (drives KDS) |

**Note on `transactions.table_session_id`:** The existing `transactions` table gains a new nullable `table_session_id UUID NULL` column (FK → table_sessions) so split-bill transactions can all link back to their parent session for completion tracking. See §13.2.

## 7.3 Functional Requirements

### 7.3.1 Dining Areas

#### `[RST-001]` List dining areas

- **Method:** `GET` `/api/business/dining-areas`
- **Query:** `location_id`, `is_active`

#### `[RST-002]` Create dining area

- **Method:** `POST` `/api/business/dining-areas`
- **Roles:** `owner`, `manager`

#### `[RST-003]` Update dining area

- **Method:** `PATCH` `/api/business/dining-areas/:id`

#### `[RST-004]` Delete dining area

- **Method:** `DELETE` `/api/business/dining-areas/:id`
- **Constraint:** Cannot delete if any active tables are assigned to this area; reassign tables first.

### 7.3.2 Table Types

#### `[RST-010]` List table types

- **Method:** `GET` `/api/business/table-types`

#### `[RST-011]` Create / [RST-012] Update / [RST-013] Delete table type

- **Method:** `POST` / `PATCH` / `DELETE` `/api/business/table-types[/`:id`]`

### 7.3.3 Tables

#### `[RST-020]` List tables

- **Method:** `GET` `/api/business/tables`
- **Query:** `location_id`, `area_id`, `table_type_id`, `is_active`, `with_session_status` (boolean — when true, includes computed current `session_status`: `available`, `occupied`, `awaiting_payment`)

#### `[RST-021]` Create / [RST-022] Update / [RST-023] Delete table

- **Method:** `POST` / `PATCH` / `DELETE`
- **Constraint on delete:** Cannot delete if there is an open `table_session`.

### 7.3.4 Table Service Flow (Terminal)

#### `[RST-030]` Floor plan view

- **Method:** `GET` `/api/terminal/tables/floor-plan`
- **Query:** `location_id`, `area_id`
- **Output:** Tables with current session status (`available` / `occupied` / `awaiting_payment`), open since (timestamp if occupied), guest count, current order total. Used by terminal "select table" screen.

#### `[RST-031]` Open table

- **Method:** `POST` `/api/terminal/tables/:id/open`
- **Input:** `{ "guest_count": 4, "customer_id": "uuid|null" }`
- **Behaviour:** Creates a new `table_session` with `status = open`. Returns 409 if table already has an open session.

#### `[RST-032]` Add items to open table

- **Method:** `POST` `/api/terminal/table-sessions/:id/items`
- **Input:**

```json
{
  "items": [
    {
      "product_id": "uuid",
      "variant_id": "uuid",
      "quantity": 2,
      "modifiers": [],
      "notes": "no salt",
      "customer_id": "uuid (optional)"
    }
  ]
}
```

- **Behaviour:** Inserts `table_session_items` rows with locked unit prices. The optional per-item `customer_id` enables per-guest attribution in multi-customer table sessions; if omitted, defaults to the table session's own `customer_id` (or null for an anonymous table). Notifies KDS via the existing `kds.gateway` for restaurant kitchens.

#### `[RST-033]` Modify table item (before service)

- **Method:** `PATCH` `/api/terminal/table-session-items/:id`
- **Input:** `{ "quantity": 3, "notes": "...", "customer_id": "uuid (optional)" }`
- **Constraint:** Cannot modify items where `kds_status` is `preparing` or beyond (kitchen has started cooking). The `customer_id` may still be reassigned even after kitchen has started — it has no kitchen impact, only billing impact.

#### `[RST-034]` Remove table item

- **Method:** `DELETE` `/api/terminal/table-session-items/:id`
- **Constraint:** Same as [RST-033]. If `kds_status >= preparing`, requires `permissions.can_void` per [XCC-062] to override (kitchen waste).

#### `[RST-035]` Close table → checkout

- **Method:** `POST` `/api/terminal/table-sessions/:id/close`
- **Behaviour:** Transitions `table_session.status` to `awaiting_payment` and sets `expected_split_count = 1`. Returns a `checkout_payload` (single object) per [RST-MOD-002] that the terminal feeds into the standard SRS §3.5.4 payment flow. The standard flow creates a `transactions` record with `table_session_id` set; when the row count of `transactions WHERE table_session_id = :id` reaches `expected_split_count`, the session transitions to `paid` and `closed_in_transaction_id` is set to the (single) transaction.

#### `[RST-036]` Split bill

- **Method:** `POST` `/api/terminal/table-sessions/:id/split`
- **Input:**

```json
{
  "split_type": "by_item | even | custom",
  "splits": [
    { "label": "Guest 1", "item_ids": ["uuid", "uuid"] },
    { "label": "Guest 2", "item_ids": ["uuid"] }
  ],
  "customer_split_index": 0
}
```

- **Behaviour:** Transitions `status` to `awaiting_payment`, sets `expected_split_count = splits.length`, and returns an array of `checkout_payload` objects per [RST-MOD-002] — one per split. The terminal feeds each one independently into the standard payment flow. Each completed payment creates a `transactions` row with `table_session_id` set; the session transitions to `paid` only when all `expected_split_count` transactions exist (or when a manager closes the partial state via [RST-038]).

- **Customer attribution precedence** (resolves Issue 13e + custom-split conflict):
  1. **`split_type = "by_item"`:** Items are first grouped by `table_session_items.customer_id` value. Each customer's items become one split with that customer attached. Items with `customer_id = NULL` are grouped together as an anonymous split. The `splits` and `customer_split_index` parameters are **ignored** in this mode — the per-item `customer_id` is the source of truth.
  2. **`split_type = "even"` or `"custom"`:** The cashier's manual grouping wins. Per-item `customer_id` values are still stored on `table_session_items` for historical reference but are NOT used for grouping. The `customer_split_index` parameter (0-based) names which one of the resulting splits inherits the table session's `customer_id` for loyalty/points attribution; all other splits are anonymous transactions. If `customer_split_index` is omitted, all splits are anonymous.

- **TVA note:** Each split is its own legal receipt with its own invoice number per SRS [TVA-020]. The sum of all splits' TTC equals the parent session total to the cent (rounding remainders distributed per XCC-011).

#### `[RST-037]` Transfer items to another table

- **Method:** `POST` `/api/terminal/table-session-items/transfer`
- **Input:** `{ "item_ids": ["uuid"], "target_table_session_id": "uuid" }`
- **Roles:** `owner`, `manager`, `employee` (any logged-in employee)

#### `[RST-038]` Cancel or partially close table session

- **Method:** `POST` `/api/terminal/table-sessions/:id/cancel`
- **Roles:** `owner`, `manager`; or employee with `permissions.can_close_table_session_partial` per [XCC-062]
- **Input:** `{ "reason": "string", "force_close_partial": false }`
- **Behaviour:**
  - **For `status = open` sessions (no payment attempted yet):** Sets status to `cancelled`. Logs to audit. KDS items are flagged as cancelled. NO `transactions` record is created. Used for walkouts at the table, complaints, errors before any payment.
  - **For `status = awaiting_payment` sessions where some splits have been paid and others have not** (e.g. a 4-way split where 3 guests paid and the 4th walked out): if `force_close_partial = true`, the session transitions to `paid` with `partial_payment = true` and `closed_at = NOW()`. Any pending split's expected transaction is logged as a session shortfall in audit_logs. Already-completed transactions remain valid and are not affected. KDS items already prepared remain in their current status. This requires the `can_close_table_session_partial` permission.

### 7.3.5 KDS Integration

The existing `kds` module (already in the repo) consumes `table_session_items` events via its WebSocket gateway. Each item shows on the kitchen screen with status transitions: `new` → `preparing` (chef accepts) → `ready` (chef plates) → `served` (server collects). The terminal presents `ready` items with a notification to the relevant server.

**[RST-MOD-001]** Refactor existing `kds` module to consume from `table_session_items` instead of (or in addition to) the current direct-from-transactions flow. This decouples KDS from "must be a finalised transaction" and aligns with how restaurants actually work — fire to kitchen as soon as ordered, charge later.

**[RST-MOD-002] Checkout Payload Contract.** When [RST-035] (close) or [RST-036] (split) transitions a table session toward payment, the server **shall** return one or more `checkout_payload` objects that the terminal feeds into the existing `/api/terminal/sales/*` flow (cart → promotion evaluation → coupon application → payment → transaction insert). The `checkout_payload` shape is the formal contract between server-originated and terminal-originated cart sessions:

```json
{
  "checkout_payload": {
    "items": [
      {
        "product_id": "uuid",
        "variant_id": "uuid|null",
        "quantity": 2,
        "unit_price_ttc": 25.00,
        "modifiers_json": {},
        "notes": "no salt",
        "source_table_session_item_id": "uuid"
      }
    ],
    "customer_id": "uuid|null",
    "location_id": "uuid",
    "terminal_id": "uuid",
    "table_session_id": "uuid",
    "guest_count": 4,
    "split_label": "Guest 1",
    "suggested_promotions": [
      {
        "promotion_id": "uuid",
        "computed_discount": 4.50,
        "affected_item_indexes": [0, 2]
      }
    ]
  }
}
```

Why this matters architecturally:

- Table sessions stay in their own domain (restaurant operations). They are not "carts."
- The promotion engine, coupon engine, and payment engine never need to know about tables.
- `/api/terminal/sales/*` endpoints are unchanged. The terminal gets a payload and processes it normally.
- For non-table sales (quick-sale at a retail terminal), the terminal builds the `checkout_payload` itself from cart state. Same shape, same downstream code path.
- `table_session_id` in the payload is a back-reference: when the standard flow creates the final `transactions` record, it copies `table_session_id` into the new `transactions.table_session_id` column so [RST-035] / [RST-036] completion tracking works.
- `suggested_promotions` is computed by the server at close time per RST-035 (single-payment) or RST-036 (per-split). Threshold-based promotions ("spend 200 MAD get 10% off") are evaluated against the final session totals at close time, not incrementally as items are added. Coupons are applied by the cashier in the standard cart flow, not here.

---

# 8. Module INV — Inventory & Stock Management

## 8.1 Overview

Extends the catalogue with vendor sourcing, multi-warehouse stock tracking, batch-level tracking with expiry dates (FIFO), purchase orders, vendor-check / audit history, nutrition information, and brand cataloguing.

Gated by feature flags:
- `warehouses` → enables warehouses + batch tracking (default off for Salon)
- `vendors` → enables vendor + purchase-order management (default on for all)
- `nutrition_info` → enables nutrition fields (default on only for Restaurant)
- `brands` → enables brand catalogue (default off for Salon)
- `expiration_alerts` → enables daily expiry-check job (default off for Salon, Hotel)

## 8.2 New Entities

### 8.2.1 `warehouses`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `name` | varchar(200) | |
| `code` | varchar(50) | Unique within business |
| `address` | text | |
| `manager_user_id` | UUID | FK → users, nullable |
| `is_central` | boolean | True for HQ central kitchen / main warehouse |
| `linked_location_id` | UUID | FK → locations, nullable (when warehouse is at a specific store) |
| `is_active` | boolean | |

### 8.2.2 `vendors`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `code` | varchar(50) | Unique within business |
| `name` | varchar(200) | |
| `contact_name` | varchar(200) | |
| `contact_phone` | varchar(20) | |
| `contact_email` | varchar(255) | |
| `address` | text | |
| `ice_number` | varchar(15) | Vendor's ICE (for purchase invoice TVA reclaim) |
| `if_number` | varchar(50) | |
| `payment_terms_days` | int | Net-N payment terms, default 30 |
| `notes` | text | |
| `is_active` | boolean | |

### 8.2.3 `vendor_check_details` (audit history)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `vendor_id` | UUID | FK |
| `check_date` | date | |
| `checked_by_user_id` | UUID | FK |
| `quality_score` | int | 1–10 |
| `delivery_score` | int | 1–10 |
| `price_score` | int | 1–10 |
| `notes` | text | |
| `attachments_json` | jsonb | Array of file paths |

### 8.2.4 `brands`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `name` | varchar(200) | |
| `code` | varchar(50) | |
| `logo_url` | varchar(500) | |
| `description` | text | |
| `is_active` | boolean | |

### 8.2.5 `nutrition_info`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `product_id` | UUID | FK → products, unique (1:1) |
| `serving_size_g` | numeric(8,2) | |
| `calories_kcal` | numeric(8,2) | Per serving |
| `protein_g` | numeric(8,2) | |
| `carbs_g` | numeric(8,2) | |
| `sugar_g` | numeric(8,2) | |
| `fat_g` | numeric(8,2) | |
| `saturated_fat_g` | numeric(8,2) | |
| `fiber_g` | numeric(8,2) | |
| `sodium_mg` | numeric(8,2) | |
| `allergens` | varchar(500) | Comma-separated codes (gluten, dairy, nuts, eggs, soy, fish, shellfish, sesame) |
| `is_vegetarian` | boolean | |
| `is_vegan` | boolean | |
| `is_halal` | boolean | |

### 8.2.6 `stock_batches` (per-warehouse, per-product batch lot)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `warehouse_id` | UUID | FK |
| `product_id` | UUID | FK |
| `variant_id` | UUID | FK, nullable |
| `batch_code` | varchar(100) | Vendor's lot number or auto-generated |
| `quantity_initial` | numeric(12,3) | Original received quantity |
| `quantity_remaining` | numeric(12,3) | Current quantity in stock |
| `unit_cost` | numeric(12,4) | Per-unit cost in MAD (HT, before TVA) |
| `unit_cost_tva_rate` | numeric(5,2) | TVA rate paid on purchase (for input TVA tracking) |
| `unit_of_measure` | varchar(20) | `unit`, `kg`, `g`, `l`, `ml` |
| `received_at` | timestamp | |
| `expires_at` | date | Nullable for non-perishables |
| `vendor_id` | UUID | FK → vendors, nullable |
| `purchase_order_id` | UUID | FK → purchase_orders, nullable |
| `is_active` | boolean | |

### 8.2.7 `stock_movements`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `batch_id` | UUID | FK |
| `movement_type` | varchar(40) | `receive`, `sale`, `transfer_out`, `transfer_in`, `adjustment`, `waste`, `expiry_disposal` |
| `quantity` | numeric(12,3) | Positive for in, negative for out |
| `reference_type` | varchar(40) | `transaction`, `purchase_order`, `transfer`, `manual` |
| `reference_id` | UUID | The referenced record's ID |
| `source_origin` | varchar(20) | `realtime`, `offline_sync`, `system_reconciliation`. _Added in v1.1._ Distinguishes movements applied at sale time from those applied retroactively when an offline transaction synced; surfaced in the discrepancy alert workflow per [INV-095]. |
| `performed_by_user_id` | UUID | FK |
| `notes` | text | |
| `created_at` | timestamp | |

### 8.2.8 `purchase_orders`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `po_number` | varchar(50) | Unique per business; format `PO-YYYY-NNNNN` |
| `vendor_id` | UUID | FK |
| `warehouse_id` | UUID | FK (destination) |
| `parent_business_id` | UUID | FK → businesses, nullable (when ordering from chain HQ — see Module CHN) |
| `status` | varchar(20) | `draft`, `sent`, `confirmed`, `partially_received`, `received`, `cancelled` |
| `order_date` | date | |
| `expected_delivery_date` | date | |
| `subtotal_ht` | numeric(12,2) | Calculated from line items |
| `total_tva` | numeric(12,2) | |
| `total_ttc` | numeric(12,2) | |
| `created_by_user_id` | UUID | FK |
| `approved_by_user_id` | UUID | FK, nullable |
| `notes` | text | |
| `created_at` / `updated_at` | timestamp | |

### 8.2.9 `purchase_order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `purchase_order_id` | UUID | FK |
| `product_id` | UUID | FK |
| `variant_id` | UUID | FK, nullable |
| `quantity_ordered` | numeric(12,3) | |
| `quantity_received` | numeric(12,3) | Updated as deliveries arrive |
| `unit_of_measure` | varchar(20) | |
| `unit_cost_ht` | numeric(12,4) | Negotiated price excluding TVA |
| `tva_rate` | numeric(5,2) | TVA the vendor will charge |
| `line_total_ht` | numeric(12,2) | Computed |
| `line_total_tva` | numeric(12,2) | |
| `line_total_ttc` | numeric(12,2) | |
| `notes` | varchar(500) | |

### 8.2.10 `stock_templates` (saved reorder templates)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `name` | varchar(200) | e.g. "Weekly bakery reorder" |
| `default_vendor_id` | UUID | FK |
| `default_warehouse_id` | UUID | FK |
| `is_active` | boolean | |

### 8.2.11 `stock_template_items`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `template_id` | UUID | FK |
| `product_id` | UUID | FK |
| `variant_id` | UUID | FK, nullable |
| `default_quantity` | numeric(12,3) | |

### 8.2.12 `stock_discrepancy_alerts`

_Added in v1.1 to track stock state mismatches detected after offline sync, manual count, or system reconciliation. Kept separate from `expiration_alerts` (which is purely about time-based expiry) to keep the domain model honest._

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `batch_id` | UUID | FK |
| `warehouse_id` | UUID | FK |
| `product_id` | UUID | FK |
| `expected_remaining` | numeric(12,3) | What the system thought was there |
| `actual_remaining` | numeric(12,3) | What was actually there after sync/count |
| `discrepancy_quantity` | numeric(12,3) | Computed: `actual - expected`. Negative = shortfall. |
| `source` | varchar(20) | `offline_sync`, `manual_count`, `system_detected` |
| `resolved_at` | timestamp | Null until resolved |
| `resolved_by_user_id` | UUID | FK, nullable |
| `resolution_notes` | text | |
| `created_at` | timestamp | |

## 8.3 Modifications to Existing Entities

**[INV-MOD-001]** Add to `products`: `brand_id UUID NULL` (FK → brands), `default_vendor_id UUID NULL` (FK → vendors), `unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'unit'`, `track_stock BOOLEAN NOT NULL DEFAULT false` (when true, sales decrement batches; when false, free-form stock like services/digital).

**[INV-MOD-002]** *(removed in v1.1 — `transactions.total_ht_input_tva` was a per-transaction column trying to encode a period-level accounting concept. Input TVA reclaim is computed from purchase invoices during the filing period regardless of which batch fed which sale; tying it to individual sales created phantom precision and inconsistencies (two identical sales would show different input TVA depending on whether the consumed batch came from a TVA-registered or exempt vendor). Input TVA is now reported via [INV-093] querying `purchase_order_items` directly.)*

## 8.4 Functional Requirements

### 8.4.1 Warehouses

#### `[INV-001]` List / [INV-002] Get / [INV-003] Create / [INV-004] Update / [INV-005] Delete

- **Method:** Standard REST on `/api/business/warehouses[/:id]`
- **Roles:** `owner`, `manager` for write; `employee` read-only

### 8.4.2 Vendors

#### `[INV-010]` List vendors

- **Method:** `GET` `/api/business/vendors`
- **Query:** `page`, `limit`, `search`, `is_active`, `for_select` (boolean — when true, returns lightweight `{id, name, code}` only for dropdowns)

#### `[INV-011]` Get / [INV-012] Create / [INV-013] Update / [INV-014] Delete

- **Method:** `GET` / `POST` / `PATCH` / `DELETE` `/api/business/vendors[/:id]`

#### `[INV-015]` Vendor check log

- **Method:** `GET` / `POST` `/api/business/vendors/:id/check-details`

### 8.4.3 Brands

#### `[INV-020]` List / [INV-021] Create / [INV-022] Update / [INV-023] Delete

- **Method:** REST on `/api/business/brands[/:id]`

### 8.4.4 Nutrition

#### `[INV-030]` Get nutrition for product

- **Method:** `GET` `/api/business/products/:id/nutrition`

#### `[INV-031]` Set nutrition for product

- **Method:** `PUT` `/api/business/products/:id/nutrition`
- **Behaviour:** Upsert (creates if missing, updates if exists).

#### `[INV-032]` List products with nutrition data

- **Method:** `GET` `/api/business/nutrition-info`
- **Query:** `page`, `limit`, `allergen_excludes` (comma-separated), `is_vegan`, `is_halal`

### 8.4.5 Stock Batches

#### `[INV-040]` List batches

- **Method:** `GET` `/api/business/stock-batches`
- **Query:** `page`, `limit`, `warehouse_id`, `product_id`, `expires_before` (date filter), `min_quantity` (default `0.001` to filter out depleted), `is_active`

#### `[INV-041]` Receive new batch (manual entry)

- **Method:** `POST` `/api/business/stock-batches`
- **Behaviour:** Creates the batch and a `stock_movements` row with `movement_type = receive`. Increments `quantity_remaining = quantity_initial`.

#### `[INV-042]` Adjust batch quantity (correction)

- **Method:** `POST` `/api/business/stock-batches/:id/adjust`
- **Input:** `{ "delta": -2.5, "reason": "string" }`
- **Roles:** `owner`, `manager`
- **Behaviour:** Atomic update of `quantity_remaining`, append `stock_movements` row with `movement_type = adjustment`. Logs to audit.

#### `[INV-043]` Mark batch as wasted/disposed

- **Method:** `POST` `/api/business/stock-batches/:id/dispose`
- **Input:** `{ "quantity": 1.5, "reason": "expired|damaged|other", "notes": "string" }`
- **Behaviour:** Decrements `quantity_remaining`, appends `stock_movements` with `movement_type = waste` or `expiry_disposal`.

#### `[INV-044]` Transfer batch between warehouses

- **Method:** `POST` `/api/business/stock-batches/:id/transfer`
- **Input:** `{ "target_warehouse_id": "uuid", "quantity": 5.0, "notes": "string" }`
- **Behaviour:** Decrements source batch, creates a new batch at target warehouse with same `batch_code`, `expires_at`, `unit_cost`, `unit_cost_tva_rate`. Two `stock_movements` rows: `transfer_out` and `transfer_in`.

### 8.4.6 Sale-Triggered Stock Decrement (Server-Side, Automatic)

#### `[INV-050]` FIFO consumption on sale

- **Trigger:** `transactions` insert — for each `transaction_item` where `product.track_stock = true`
- **Logic:**
  1. Determine the `warehouse_id` for this terminal's `location_id` (a location → warehouse mapping; default to the location's primary warehouse).
  2. Query active batches: `WHERE product_id = :pid AND warehouse_id = :wid AND quantity_remaining > 0 AND is_active = true ORDER BY expires_at ASC NULLS LAST, received_at ASC` (FIFO with expiry priority).
  3. Consume the required quantity from oldest batches first. May span multiple batches.
  4. For each batch consumed, decrement `quantity_remaining` and append a `stock_movements` row with `movement_type = sale`, `reference_id = txn.id`. The `stock_movements.source_origin` is set to `realtime` for online sales and to `offline_sync` for sales synced from an offline terminal.
  5. If insufficient stock, the sale STILL completes (selling unrecorded stock is preferable to blocking sales). The shortfall is recorded by allowing `quantity_remaining` to go negative; a `stock_discrepancy_alerts` row is queued for the next daily reconciliation pass per [INV-095].

**Offline-mode caveat.** Offline terminals do not have visibility into batch quantities (the offline cache contains catalogue + customer data only — see XCC-030). When an offline transaction syncs and triggers FIFO consumption, the batch state may have changed since the offline session started. The `source_origin = offline_sync` marker on the resulting `stock_movements` rows lets the daily reconciliation job ([INV-095]) distinguish "real-time decrement" from "delayed batch retroactive" and surface batches that went negative as discrepancy alerts.

### 8.4.7 Stock Templates

#### `[INV-060]` List / [INV-061] Get / [INV-062] Create / [INV-063] Update / [INV-064] Delete

- **Method:** REST on `/api/business/stock-templates[/:id]`

#### `[INV-065]` Generate purchase order from template

- **Method:** `POST` `/api/business/stock-templates/:id/create-purchase-order`
- **Input:** `{ "vendor_id": "uuid|null" (default = template.default_vendor_id), "warehouse_id": "uuid|null", "expected_delivery_date": "date" }`
- **Output:** Newly created `purchase_orders` record in `draft` status, populated with `purchase_order_items` from the template.

### 8.4.8 Purchase Orders

#### `[INV-070]` List POs

- **Method:** `GET` `/api/business/purchase-orders`
- **Query:** `page`, `limit`, `status`, `vendor_id`, `warehouse_id`, `from_date`, `to_date`, `search` (po_number)

#### `[INV-071]` Get PO

- **Method:** `GET` `/api/business/purchase-orders/:id`
- **Output:** PO with all line items, vendor, warehouse, computed totals.

#### `[INV-072]` Create PO

- **Method:** `POST` `/api/business/purchase-orders`
- **Input:** Vendor, warehouse, expected delivery date, line items (`product_id`, `variant_id`, `quantity_ordered`, `unit_cost_ht`, `tva_rate`).
- **Behaviour:** Auto-generates `po_number`. Computes line_total_ht/tva/ttc and order totals. Status defaults to `draft`.

#### `[INV-073]` Update PO

- **Method:** `PATCH` `/api/business/purchase-orders/:id`
- **Constraint:** Only editable while `status = draft`.

#### `[INV-074]` Send PO to vendor (status transition)

- **Method:** `POST` `/api/business/purchase-orders/:id/send`
- **Roles:** `owner`, `manager` (with optional `can_approve_po` flag — see [INV-MOD-003])
- **Behaviour:** Transitions to `sent`. Emails the PO PDF to vendor's email (if present). Logs to audit.

#### `[INV-075]` Confirm PO (vendor acceptance)

- **Method:** `POST` `/api/business/purchase-orders/:id/confirm`
- **Behaviour:** Transitions to `confirmed`. Optional in workflow — many businesses go straight from `sent` to `partially_received`.

#### `[INV-076]` Receive PO items

- **Method:** `POST` `/api/business/purchase-orders/:id/receive`
- **Input:**

```json
{
  "received_items": [
    {
      "po_item_id": "uuid",
      "quantity_received": 50.0,
      "batch_code": "BATCH-2026-04-27-01",
      "expires_at": "2026-10-27"
    }
  ]
}
```

- **Behaviour:** For each received line: increments `purchase_order_items.quantity_received`, creates `stock_batches` row at the destination warehouse, creates `stock_movements` row with `movement_type = receive`. Transitions PO status to `partially_received` or `received` based on whether all lines are complete.

#### `[INV-077]` Cancel PO

- **Method:** `POST` `/api/business/purchase-orders/:id/cancel`
- **Constraint:** Cannot cancel if any items are received. Refund handled outside the system.

**[INV-MOD-003]** Permission `can_approve_po` lives in `users.permissions` JSONB column per [XCC-060].

### 8.4.9 Expiration Alerts

#### `[INV-080]` Daily expiration scan (background job)

- **Trigger:** Scheduled cron, configurable per-business `expiration_alert_lead_days` (default 7)
- **Behaviour:** Queries `stock_batches WHERE expires_at <= TODAY + lead_days AND quantity_remaining > 0 AND is_active = true`. For each finding: insert into a new `expiration_alerts` table; trigger an in-app notification to the warehouse manager.

#### `[INV-081]` List expiration alerts

- **Method:** `GET` `/api/business/expiration-alerts`
- **Query:** `is_resolved` (default false), `severity` (`expired`, `expires_soon`)

#### `[INV-082]` Resolve alert

- **Method:** `POST` `/api/business/expiration-alerts/:id/resolve`
- **Input:** `{ "action": "disposed|sold|extended|other", "notes": "string" }`

### 8.4.10 Stock Reports

#### `[INV-090]` Current stock position

- **Method:** `GET` `/api/business/reports/stock-position`
- **Query:** `warehouse_id`, `category_id`, `low_stock_only` (boolean)
- **Output:** Per product/variant: total quantity across batches, oldest expiry, total value (sum of `quantity * unit_cost`), reorder warning if below threshold.

#### `[INV-091]` Stock movement history

- **Method:** `GET` `/api/business/reports/stock-movements`
- **Query:** `page`, `limit`, `warehouse_id`, `product_id`, `movement_type`, `from_date`, `to_date`

#### `[INV-092]` Vendor purchase report

- **Method:** `GET` `/api/business/reports/vendor-purchases`
- **Query:** `vendor_id`, `from_date`, `to_date`
- **Output:** Total spend per vendor, line-item breakdown, on-time delivery rate, average vendor check scores.

#### `[INV-093]` Input TVA reclaim report

- **Method:** `GET` `/api/business/reports/input-tva`
- **Query:** `from_date`, `to_date` (both inclusive; per XCC-018 these are calendar dates, not cutoff-adjusted)
- **Output:** Sum of TVA paid on purchase invoices received in the period, grouped by TVA rate band (0%, 7%, 10%, 20%). Sourced from `purchase_order_items.tva_rate` and `purchase_order_items.line_total_tva` directly — NOT from stock-consumption-time computations. Reclaim is computed on purchase invoices regardless of when the stock is consumed in sales, matching DGI methodology and standard accounting practice for input TVA recovery.
- **Output shape:**

```json
{
  "from_date": "2026-04-01",
  "to_date": "2026-04-30",
  "by_rate": [
    { "tva_rate": 20.00, "total_ht": 45230.50, "total_tva": 9046.10 },
    { "tva_rate": 10.00, "total_ht": 12500.00, "total_tva": 1250.00 },
    { "tva_rate": 7.00,  "total_ht": 3200.00,  "total_tva": 224.00 },
    { "tva_rate": 0.00,  "total_ht": 1800.00,  "total_tva": 0.00 }
  ],
  "total_input_tva": 10520.10,
  "linked_purchase_orders": 47
}
```

The TVA Declaration Report (SRS §3.7.4) cross-references this report to compute net TVA owed: `net_tva = output_tva − input_tva`.

#### `[INV-094]` List stock discrepancy alerts

- **Method:** `GET` `/api/business/stock-discrepancy-alerts`
- **Query:** `is_resolved` (default false), `source` (`offline_sync`, `manual_count`, `system_detected`), `warehouse_id`, `product_id`
- **Output:** Paginated list from `stock_discrepancy_alerts` table.

#### `[INV-095]` Daily reconciliation job

- **Trigger:** Scheduled daily background job, gated by [XCC-052] lock key `daily_reconciliation:{business_id}:{YYYY-MM-DD}` to prevent duplicate runs.
- **Logic:**
  1. Find all `stock_batches WHERE quantity_remaining < 0 AND is_active = true`. For each, insert a `stock_discrepancy_alerts` row with `source = system_detected`, `expected_remaining = 0`, `actual_remaining = quantity_remaining`, `discrepancy_quantity = quantity_remaining` (negative).
  2. Find all `stock_movements WHERE source_origin = 'offline_sync' AND created_at >= NOW() - INTERVAL '24 hours'` whose batch's resulting `quantity_remaining` went negative. Insert a discrepancy alert linking the offending offline-synced movement.
  3. Surface alerts as in-app notifications to the warehouse manager and on the dashboard.

#### `[INV-096]` Resolve discrepancy alert

- **Method:** `POST` `/api/business/stock-discrepancy-alerts/:id/resolve`
- **Roles:** `owner`, `manager`; or employee with `permissions.can_resolve_stock_discrepancy` per [XCC-062]
- **Input:** `{ "action": "manual_recount | accept_loss | adjust_batch", "adjustment_quantity": 0.00, "notes": "string" }`
- **Behaviour:**
  - `manual_recount`: cashier recounted, batch was correct as-is — alert resolved with no movement.
  - `accept_loss`: discrepancy is real shrinkage. A `stock_movements` row is inserted with `movement_type = waste`, `source_origin = system_reconciliation` covering the discrepancy. Batch quantity is NOT changed (it was already negative; movement just makes it auditable).
  - `adjust_batch`: cashier sets the actual quantity. Batch `quantity_remaining` is updated; matching `stock_movements` row inserted with `movement_type = adjustment`.
  - Sets `resolved_at`, `resolved_by_user_id`, `resolution_notes` on the alert. Logs to audit.


---

# 9. Module CHN — Chain & Franchise Operations

## 9.1 Overview

Models multi-business hierarchies: a parent business (HQ) with one or more child businesses (sub-stores or franchisees). Enables centralised catalogue management, chain-wide promotions, sub-store data rollup, and parent-routed purchasing. Gated by `chain_features` feature flag.

This is conceptually distinct from **multi-location**: a single business has many locations (managed via SRS [SAD-011]), all under one TVA registration / one ICE / one IF. A chain has many businesses (each with its own ICE/IF), linked by parent-child relationship.

## 9.2 Modifications to Existing Entities

**[CHN-MOD-001]** Add to `businesses`: `parent_business_id UUID NULL` (FK → businesses, self-referencing). Defines the chain hierarchy. Two-level only (a parent's parent is null) — no nested chains in the initial release.

**[CHN-MOD-002]** Add to `businesses`: `chain_role VARCHAR(20) NOT NULL DEFAULT 'standalone'` — enum: `standalone`, `parent`, `child`.

**[CHN-MOD-003]** Add to `users`: `accessible_business_ids UUID[]` — for users who manage multiple businesses (HQ staff overseeing a chain). Standard tenant scoping (XCC-002) is replaced for these users by an "any of accessible_business_ids" check.

## 9.3 Functional Requirements

### 9.3.1 Chain Setup (Super Admin)

#### `[CHN-001]` List businesses with chain hierarchy

- **Method:** `GET` `/api/super/businesses/chain-tree`
- **Output:** Nested tree showing parent businesses with their children. Each node includes total terminals, locations, and active subscription status.

#### `[CHN-002]` Promote business to chain parent

- **Method:** `POST` `/api/super/businesses/:id/promote-to-parent`
- **Roles:** `super_admin`
- **Behaviour:** Sets `chain_role = parent`. Required before child businesses can be linked.

#### `[CHN-003]` Link child to parent

- **Method:** `POST` `/api/super/businesses/:child_id/link-parent`
- **Input:** `{ "parent_business_id": "uuid" }`
- **Roles:** `super_admin`
- **Constraints:** Parent must have `chain_role = parent` or be promoted first. Child must have `chain_role = standalone` or `child`. Prevents cycles. Logs to audit.

#### `[CHN-004]` Unlink child from parent

- **Method:** `POST` `/api/super/businesses/:child_id/unlink-parent`
- **Roles:** `super_admin`
- **Behaviour:** Sets child's `parent_business_id = null`, `chain_role = standalone`. Cancels any pending cloud-goods sync jobs.

### 9.3.2 Multi-Business Login

The SRS already covers a user logging into one business. CHN extends this for HQ users.

#### `[CHN-010]` List businesses accessible to current user

- **Method:** `GET` `/api/auth/me/accessible-businesses`
- **Output:** Array of `{ business_id, name, role }` for each business this user can act in. Used by the dashboard's business-switcher dropdown.

#### `[CHN-011]` Switch active business in session

- **Method:** `POST` `/api/auth/switch-business`
- **Input:** `{ "business_id": "uuid" }`
- **Behaviour:** Re-issues a new JWT with `business_id` claim set to the target. The user must have the target in `accessible_business_ids` or be a super_admin. Old token is added to a server-side revocation list.

#### `[CHN-012]` Grant a user multi-business access

- **Method:** `POST` `/api/business/users/:id/grant-business-access`
- **Roles:** `owner` of the parent business; `super_admin`
- **Input:** `{ "business_ids": ["uuid"], "role_per_business": { "uuid": "manager" } }`
- **Behaviour:** Updates `users.accessible_business_ids` and creates `user_business_role` join entries (a new table — see [CHN-MOD-004]).

**[CHN-MOD-004]** New table `user_business_roles`: composite PK `(user_id, business_id)`, columns `role VARCHAR(20)`, `granted_by_user_id UUID`, `granted_at TIMESTAMP`. This supersedes the single-business `users.role` for chain users — when this table has entries for a user, those override the base role for the corresponding business.

### 9.3.3 Cloud Goods Sync (Catalogue from Parent → Children)

#### `[CHN-020]` Configure sync rules

- **Method:** `PUT` `/api/business/chain/sync-config`
- **Roles:** `owner` of parent business
- **Input:**

```json
{
  "sync_categories": true,
  "sync_products": true,
  "sync_variants": true,
  "sync_modifiers": true,
  "sync_prices": false,
  "auto_sync_on_change": true,
  "child_business_ids": ["uuid"]
}
```

- **Behaviour:** Saves config to a new `chain_sync_configs` table. When `auto_sync_on_change = true`, every catalogue change at the parent triggers a sync to listed children.

#### `[CHN-021]` Manual sync trigger

- **Method:** `POST` `/api/business/chain/sync`
- **Roles:** `owner` of parent
- **Input:** `{ "child_business_ids": ["uuid"], "sync_what": ["categories", "products", "variants", "modifiers"] }`
- **Output:** `{ "job_id": "uuid" }` — runs as background job.

#### `[CHN-022]` Sync job status

- **Method:** `GET` `/api/business/chain/sync-jobs/:id`
- **Output:** Per-child progress, error details, items synced count.

#### `[CHN-023]` View unmapped items at child

- **Method:** `GET` `/api/business/chain/unmapped-products`
- **Roles:** `owner` of child
- **Output:** Products defined at parent that don't yet exist at child (used by the child to selectively pull).

#### `[CHN-024]` Pull specific item from parent

- **Method:** `POST` `/api/business/chain/pull-product`
- **Input:** `{ "parent_product_id": "uuid" }`
- **Behaviour:** Copies the product (and dependencies — category, variants, modifiers) into the child's catalogue. Marks with `synced_from_parent_id` for tracking.

**[CHN-MOD-005]** Add to `categories`, `products`, `product_variants`, `modifier_groups`, `modifiers`: `synced_from_parent_id UUID NULL`. References the corresponding row in the parent's catalogue. Used to keep child rows updated when parent edits.

**[CHN-MOD-006] TVA Rate Sync Exclusion.** TVA rates are a legal obligation tied to the child business's own registration with DGI, not a property of the product in isolation. During cloud goods sync ([CHN-021] through [CHN-024]):

- The child's product copy **shall always** have `tva_rate = NULL` immediately after sync. The child falls back to its own `categories.default_tva_rate` until the child's owner explicitly configures a rate via the standard product form.
- The child's product copy **shall always** have `tva_exempt = false` immediately after sync. Genuine legal exemption (bread, milk, water, prescription pharmaceuticals, and so on) is configured at the child level by the child's owner.
- This rule is unconditional: there is no `sync_tva_rates` toggle, no `legally_exempt` shortcut column, and no parent-side override. Tax law moves (the 2026 Finance Law itself just restructured the rates); encoding any of it in the schema or in sync defaults creates legal risk.
- The [PROM-040] sub-store promotion validation report **shall** include a `tva_rate_mismatch_warnings` field listing any synced products at child stores where the unconfigured TVA rate would produce a discount math result that differs materially from the parent's intent.

### 9.3.4 Chain-Wide Promotions

The Promotion validation flow defined in [PROM-040] is the relevant entry point. Chain owners can create a promotion at the parent level and roll it out to children.

#### `[CHN-030]` Roll out parent promotion to children

- **Method:** `POST` `/api/business/promotions/:id/rollout-to-children`
- **Roles:** `owner` of parent
- **Input:** `{ "child_business_ids": ["uuid"], "skip_validation": false }`
- **Behaviour:** Copies the promotion to each target child as a new `promotions` row (children retain editing autonomy if `skip_validation = false`). Sets `synced_from_parent_id` for tracking. The original parent promotion is unaffected.

### 9.3.5 Chain Reporting (Parent View)

#### `[CHN-040]` Consolidated dashboard

- **Method:** `GET` `/api/business/chain/dashboard`
- **Roles:** `owner` of parent
- **Query:** `from_date`, `to_date`
- **Output:** Per-child rollup: revenue, transaction count, top products, customer count, points outstanding. Aggregated chain totals at the top.

#### `[CHN-041]` Chain transaction list (read-only)

- **Method:** `GET` `/api/business/chain/transactions`
- **Roles:** `owner` of parent
- **Query:** Same filters as the per-business transaction report, plus `child_business_id` for filtering to one child.

### 9.3.6 Parent-Routed Purchase Orders

The INV [INV-072] purchase order flow accepts `parent_business_id` for chain businesses.

#### `[CHN-050]` Get parent business as vendor proxy

- **Method:** `GET` `/api/business/chain/parent-vendor-info`
- **Roles:** `owner` or `manager` of child
- **Output:** Parent's name, ICE, IF, and a virtual vendor record that can be used as the `vendor_id` for a PO. The child raises the PO; the parent receives it as a "child purchase request" and can ship from its central warehouse.

#### `[CHN-051]` List incoming child purchase requests

- **Method:** `GET` `/api/business/chain/incoming-po-requests`
- **Roles:** `owner` or `manager` of parent
- **Output:** All `purchase_orders` from child businesses where `parent_business_id = this_business.id`.

#### `[CHN-052]` Fulfill child PO

- **Method:** `POST` `/api/business/chain/incoming-po-requests/:id/fulfill`
- **Behaviour:** Records a parent → child stock transfer. Decrements parent's central warehouse stock, creates batches at child's warehouse, marks the PO as `received`. Generates an internal invoice (TVA-correct) between parent and child for accounting.

---

# 10. Module REC — Smart Recommendations

## 10.1 Overview

Allows managers to define "recommendation templates" — curated lists of products driven by static rules (manager-picked) or dynamic queries (top-N by sales in last 7 days, top-N by margin, popular at this time of day). Templates are consumed by:
- The terminal sales screen as a "Recommended" tab
- Future digital ordering kiosks
- Future customer-facing menu apps

Gated by `recommendations` feature flag.

## 10.2 New Entities

### 10.2.1 `recommendation_templates`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `name` | varchar(200) | e.g. "Lunch Specials", "High Margin Add-ons" |
| `template_type` | varchar(40) | `manual`, `top_seller`, `high_margin`, `time_of_day`, `customer_grade_targeted`, `seasonal` |
| `time_window_start` | time | Used by `time_of_day` |
| `time_window_end` | time | |
| `applicable_days_of_week` | int[] | 1–7, Mon–Sun |
| `target_grade_ids` | UUID[] | Used by `customer_grade_targeted` |
| `min_recommendations` | int | Default 3 |
| `max_recommendations` | int | Default 10 |
| `whole_price_tier` | int | 1–4: which price tier to display (matches AiBao `wholePriceType`) |
| `applicable_location_ids` | UUID[] | Empty = all |
| `is_active` | boolean | |
| `display_order` | int | |

### 10.2.2 `recommendation_template_items` (manual mode)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `template_id` | UUID | FK |
| `product_id` | UUID | FK |
| `variant_id` | UUID | FK, nullable |
| `priority` | int | Lower = higher priority |
| `is_active` | boolean | |

## 10.3 Modifications to Existing Entities

**[REC-MOD-001]** Add to `products`: `whole_price_1 NUMERIC(12,2) NULL`, `whole_price_2 NUMERIC(12,2) NULL`, `whole_price_3 NUMERIC(12,2) NULL`, `whole_price_4 NUMERIC(12,2) NULL` — alternative price tiers for B2B / wholesale / VIP scenarios. Standard retail price remains in `products.price`. The active tier is selected at sale-time via the customer's grade or the recommendation template's `whole_price_tier`.

## 10.4 Functional Requirements

### 10.4.1 Template CRUD

#### `[REC-001]` List templates

- **Method:** `GET` `/api/business/recommendation-templates`
- **Query:** `template_type`, `is_active`, `for_terminal_now` (boolean — when true, returns only templates active for current time/day, used by terminal cache)

#### `[REC-002]` Create / [REC-003] Update / [REC-004] Delete

- **Method:** REST on `/api/business/recommendation-templates[/:id]`

#### `[REC-005]` Set template items (manual templates only)

- **Method:** `PUT` `/api/business/recommendation-templates/:id/items`
- **Input:** `{ "items": [ { "product_id": "uuid", "variant_id": "uuid", "priority": 1 } ] }`
- **Behaviour:** Replaces full item set. Returns 422 if template_type is not `manual`.

### 10.4.2 Template Resolution (Terminal-Side)

#### `[REC-010]` Get items for template

- **Method:** `GET` `/api/terminal/recommendation-templates/:id/items`
- **Query:** `customer_id` (optional, for grade-targeted), `location_id`, `current_time`
- **Output:**

```json
{
  "items": [
    {
      "product_id": "uuid",
      "variant_id": "uuid|null",
      "name": "...",
      "price": 25.00,
      "priority": 1,
      "image_url": "..."
    }
  ],
  "template_name": "...",
  "template_type": "..."
}
```

- **Behaviour:** For `manual` templates, returns the configured items. For dynamic templates, executes the query at request time. Results are cached client-side for 5 minutes (offline mode uses last cached results).

#### `[REC-020]` Featured items list

- **Method:** `GET` `/api/business/recommendation-templates/featured`
- **Output:** A flattened list of items appearing in any "always-on" featured templates. Used for homepage highlights / kiosk landing screens.

---

# 11. Module COM — Communications

## 11.1 Overview

Centralises in-app announcements (Super Admin → businesses) and outbound customer notifications (SMS, email, WhatsApp Business). All notification channels share a unified send/log infrastructure. Gated by per-channel feature flags (`sms_campaigns`, `email_campaigns`, `whatsapp_campaigns`).

## 11.2 New Entities

### 11.2.1 `platform_announcements` (Super Admin → businesses)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `title` | varchar(200) | |
| `body` | text | Markdown allowed |
| `severity` | varchar(20) | `info`, `warning`, `critical` |
| `target_business_type_ids` | UUID[] | Empty = all business types |
| `target_business_ids` | UUID[] | Empty = all matching by type |
| `display_on_homepage` | boolean | Show on dashboard homepage |
| `display_until` | timestamp | Auto-dismiss after this date |
| `created_by_user_id` | UUID | FK → super_admins |
| `created_at` | timestamp | |

### 11.2.2 `business_announcements` (Business owner → staff)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `title` | varchar(200) | |
| `body` | text | |
| `target_role` | varchar(20) | `all`, `manager`, `employee` |
| `display_until` | timestamp | |
| `created_by_user_id` | UUID | FK |
| `created_at` | timestamp | |

### 11.2.3 `notification_channels` (per-business, per-channel config)

_Normalized in v1.1: one row per `(business_id, channel)` pair instead of one wide row per business. Trade-offs: (a) adding a fourth channel like push notifications becomes a row insert, not a schema change; (b) selecting credentials for one channel doesn't load credentials for the others; (c) future failover support (multiple providers per channel) is a flag-flip away. v1.1 enforces exactly one provider per channel — failover columns deliberately deferred per §1.4._

| Column | Type | Notes |
|---|---|---|
| `business_id` | UUID | Composite PK |
| `channel` | varchar(20) | Composite PK; `sms`, `email`, `whatsapp` (`push` reserved for future) |
| `provider` | varchar(40) | Channel-specific provider key, e.g. `infobip` / `twilio` / `aws_sns` / `local_morocco_provider` for SMS; `sendgrid` / `aws_ses` / `resend` for email; `meta_cloud_api` / `twilio_whatsapp` for WhatsApp |
| `provider_config_json` | jsonb | Encrypted provider-specific credentials (API keys, tokens, region) |
| `default_sender_id` | varchar(100) | Channel-specific: SMS sender ID, email "from" address, WhatsApp phone number ID |
| `default_sender_name` | varchar(100) | E.g. for email "from name" |
| `balance_cached` | int | Used by SMS only; nullable for other channels |
| `balance_refreshed_at` | timestamp | Last refresh time for `balance_cached` |
| `is_active` | boolean | Whether sends through this channel are enabled |
| `created_at` / `updated_at` | timestamp | |

### 11.2.4 `notification_templates`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `channel` | varchar(20) | `sms`, `email`, `whatsapp` |
| `name` | varchar(200) | |
| `subject` | varchar(200) | Email only |
| `body` | text | Supports `{{ customer.first_name }}` Mustache-style placeholders |
| `whatsapp_template_id` | varchar(100) | Pre-approved Meta template ID |
| `is_transactional` | boolean | `true` = transactional (receipt, OTP), no consent required; `false` = marketing |
| `is_active` | boolean | |

### 11.2.5 `notification_sends`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK |
| `channel` | varchar(20) | |
| `template_id` | UUID | FK, nullable (ad-hoc sends have no template) |
| `recipient_customer_id` | UUID | FK, nullable (system recipients e.g. staff alerts have null) |
| `recipient_address` | varchar(255) | Phone or email or whatsapp number actually used |
| `subject` | varchar(200) | Snapshot for email |
| `body_rendered` | text | Snapshot of the rendered message |
| `provider_message_id` | varchar(200) | Returned by SMS/email/WhatsApp gateway |
| `status` | varchar(20) | `queued`, `sent`, `delivered`, `failed`, `bounced`, `read` (whatsapp) |
| `error_message` | text | If failed |
| `sent_at` | timestamp | |
| `delivered_at` | timestamp | |
| `read_at` | timestamp | WhatsApp only |
| `linked_promotion_id` | UUID | FK, nullable |
| `linked_coupon_id` | UUID | FK, nullable |

## 11.3 Functional Requirements

### 11.3.1 Platform Announcements (Super Admin)

#### `[COM-001]` List / [COM-002] Create / [COM-003] Update / [COM-004] Delete

- **Method:** REST on `/api/super/announcements[/:id]`

#### `[COM-005]` Read announcements (any user)

- **Method:** `GET` `/api/business/platform-announcements`
- **Output:** Active announcements targeted at the user's business type / business, with `display_on_homepage` and `display_until` filters applied. Used by the dashboard homepage banner.

#### `[COM-006]` Mark announcement read

- **Method:** `POST` `/api/business/platform-announcements/:id/dismiss`
- **Behaviour:** Per-user dismissal — stored in a new `user_announcement_dismissals` table. Doesn't delete the announcement.

### 11.3.2 Business Announcements (Owner → Staff)

#### `[COM-010]` Standard CRUD

- **Method:** REST on `/api/business/announcements[/:id]`

#### `[COM-011]` Read for current user

- **Method:** `GET` `/api/business/announcements/for-me`
- **Output:** Active announcements where `target_role` matches user's role.

### 11.3.3 Notification Channel Setup

#### `[COM-020]` Get channel config

- **Method:** `GET` `/api/business/notifications/channels`
- **Roles:** `owner`
- **Behaviour:** Returns channel config with credentials redacted.

#### `[COM-021]` Update channel config

- **Method:** `PUT` `/api/business/notifications/channels`
- **Roles:** `owner`
- **Input:** Channel-specific fields. Credentials are encrypted at rest using a per-business key.

#### `[COM-022]` Test channel

- **Method:** `POST` `/api/business/notifications/channels/test`
- **Input:** `{ "channel": "sms", "to": "+212...", "test_message": "..." }`
- **Behaviour:** Sends a test message. Returns provider response.

### 11.3.4 SMS Balance

#### `[COM-030]` Refresh SMS balance

- **Method:** `POST` `/api/business/notifications/sms/refresh-balance`
- **Behaviour:** Calls the SMS provider's balance API, updates `notification_channels.balance_cached` and `balance_refreshed_at` for the row where `(business_id, channel) = (:bid, 'sms')`. Called daily via cron and on-demand from UI.

#### `[COM-031]` Get current SMS balance

- **Method:** `GET` `/api/business/notifications/sms/balance`
- **Output:** `{ "balance": 1250, "last_refreshed_at": "..." }`

### 11.3.5 Templates

#### `[COM-040]` List / [COM-041] Create / [COM-042] Update / [COM-043] Delete

- **Method:** REST on `/api/business/notifications/templates[/:id]`

#### `[COM-044]` Render template preview

- **Method:** `POST` `/api/business/notifications/templates/:id/preview`
- **Input:** `{ "customer_id": "uuid" }` — optional, used to substitute real placeholder values
- **Output:** Rendered subject + body without sending.

### 11.3.6 Sending Notifications

#### `[COM-050]` Send to single recipient (ad-hoc)

- **Method:** `POST` `/api/business/notifications/send`
- **Input:**

```json
{
  "channel": "sms|email|whatsapp",
  "template_id": "uuid (optional)",
  "to_customer_id": "uuid",
  "to_address": "string (overrides customer's address)",
  "subject": "string (email only)",
  "body": "string (used if no template_id)",
  "linked_promotion_id": "uuid (optional)",
  "linked_coupon_id": "uuid (optional)"
}
```

- **Behaviour:** Validates: customer's `consent_marketing = true` for marketing sends (template's `is_transactional = false`); SMS balance > 0 for SMS; channel configured. Inserts `notification_sends` row, dispatches to provider, updates status from provider webhook.

#### `[COM-051]` Send to segment (bulk campaign)

- **Method:** `POST` `/api/business/notifications/send-to-segment`
- **Roles:** `owner`, `manager`
- **Input:**

```json
{
  "channel": "sms|email|whatsapp",
  "template_id": "uuid",
  "target_audience": "all|grade|label|specific_customers",
  "target_grade_ids": [],
  "target_label_ids": [],
  "target_customer_ids": [],
  "schedule_at": "2026-04-30T09:00:00Z (optional)",
  "linked_promotion_id": "uuid (optional)",
  "linked_coupon_id": "uuid (optional)"
}
```

- **Output:** `{ "job_id": "uuid", "estimated_recipients": 1500, "estimated_cost": "1500 SMS credits" }`
- **Behaviour:** Background job. Filters target customers by consent, channel availability, opt-out lists. For SMS, halts if balance becomes insufficient mid-campaign and surfaces an alert.

#### `[COM-052]` Get send history

- **Method:** `GET` `/api/business/notifications/sends`
- **Query:** `page`, `limit`, `channel`, `status`, `from_date`, `to_date`, `customer_id`, `template_id`

#### `[COM-053]` Provider webhook receiver (status updates)

- **Method:** `POST` `/api/webhooks/notifications/:provider`
- **Note:** Public endpoint — verifies provider signature for security. Updates `notification_sends.status`, `delivered_at`, `read_at`.

### 11.3.7 Customer Opt-Out

#### `[COM-060]` Opt out (customer-facing link)

- **Method:** `POST` `/api/public/notifications/opt-out`
- **Input:** `{ "token": "string" }` — opt-out tokens are unique per customer per send, embedded in marketing emails/SMS as a one-click link.
- **Behaviour:** Sets `customers.consent_marketing = false`. Logs to audit.

---

# 12. Module ADM — Platform Admin Enhancements

## 12.1 Overview

Smaller features that round out the Super Admin and Business Admin layers: industry classification at signup, courier registry, capital/financial detail, fine-grained per-business permission overrides, in-app changelog, system parameters, and configurable daily settlement cutoff time.

## 12.2 New Entities

### 12.2.1 `trade_categories`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `parent_id` | UUID | FK → trade_categories, nullable (for tree) |
| `name` | varchar(200) | e.g. "Restaurant", "Café", "Bakery", "Pharmacy", "Salon", "Hotel" |
| `code` | varchar(50) | |
| `default_business_type_id` | UUID | FK → business_types — when registering a business with this trade, suggest this default business type |
| `default_settings_json` | jsonb | Default business config to seed (TVA rate presets, currency, etc.) |
| `is_active` | boolean | |
| `sort_order` | int | |

### 12.2.2 `couriers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(200) | e.g. "Glovo", "Yassir", "Local Courier" |
| `code` | varchar(50) | |
| `logo_url` | varchar(500) | |
| `api_endpoint` | varchar(500) | |
| `tracking_url_template` | varchar(500) | e.g. `https://glovo.com/track/{tracking_number}` |
| `supports_cash_on_delivery` | boolean | |
| `is_active` | boolean | |

### 12.2.3 `business_courier_links`

| Column | Type | Notes |
|---|---|---|
| `business_id` | UUID | FK, composite PK |
| `courier_id` | UUID | FK, composite PK |
| `account_credentials_json` | jsonb | Encrypted |
| `is_default` | boolean | One default per business |

### 12.2.4 `business_custom_authority` (per-business permission overrides)

| Column | Type | Notes |
|---|---|---|
| `business_id` | UUID | FK, PK |
| `feature_overrides_json` | jsonb | `{ feature_key: bool }` overrides on top of business_type_features defaults |
| `permission_overrides_json` | jsonb | `{ "permission_key": [role1, role2] }` |
| `set_by_super_admin_id` | UUID | FK |
| `notes` | text | |

### 12.2.5 `version_log_menus` (changelog categories)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | varchar(100) | e.g. "Backend", "Terminal", "Dashboard" |
| `sort_order` | int | |

### 12.2.6 `version_log_entries`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `menu_id` | UUID | FK |
| `version` | varchar(20) | e.g. `1.4.2` |
| `description` | text | Markdown / HTML, line breaks via `\n` or `<br/>` |
| `published_at` | timestamp | |
| `expires_at` | timestamp | Hide after this date, default null = never |

### 12.2.7 `system_parameters` (platform-wide settings)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `key` | varchar(100) | Unique, e.g. `default_tva_rate`, `max_invoice_counter_per_year` |
| `param_type` | varchar(40) | Categorisation |
| `value` | text | |
| `description` | text | |
| `is_overridable_per_business` | boolean | |

## 12.3 Modifications to Existing Entities

**[ADM-MOD-001]** Add to `businesses`: `trade_category_id UUID NULL` (FK → trade_categories), `daily_settlement_cutoff_time TIME NOT NULL DEFAULT '02:00'` (time of day when "today" rolls over for reports — useful for businesses operating past midnight).

## 12.4 Functional Requirements

### 12.4.1 Trade Categories

#### `[ADM-001]` List trade categories (tree)

- **Method:** `GET` `/api/super/trade-categories/tree`
- **Method:** `GET` `/api/auth/trade-categories/tree` (public — used during business registration)

#### `[ADM-002]` Create / [ADM-003] Update / [ADM-004] Delete

- **Method:** REST on `/api/super/trade-categories[/:id]`
- **Roles:** `super_admin` only

#### `[ADM-005]` Get category options (for dropdowns)

- **Method:** `GET` `/api/super/trade-categories/options`
- **Output:** Flattened tree with full path names, e.g. `"Food Service > Restaurant > Café"`.

### 12.4.2 Couriers

#### `[ADM-010]` List couriers (super admin)

- **Method:** `GET` `/api/super/couriers`

#### `[ADM-011]` Create / [ADM-012] Update / [ADM-013] Delete courier

- **Method:** REST on `/api/super/couriers[/:id]`

#### `[ADM-014]` List business's linked couriers

- **Method:** `GET` `/api/business/couriers`

#### `[ADM-015]` Link courier to business

- **Method:** `POST` `/api/business/couriers/link`
- **Input:** `{ "courier_id": "uuid", "credentials": {...}, "is_default": false }`

#### `[ADM-016]` Unlink courier

- **Method:** `DELETE` `/api/business/couriers/:courier_id`

### 12.4.3 Custom Permissions Per Business

#### `[ADM-020]` Get business permission overrides

- **Method:** `GET` `/api/super/businesses/:id/custom-authority`

#### `[ADM-021]` Set business permission overrides

- **Method:** `PUT` `/api/super/businesses/:id/custom-authority`
- **Roles:** `super_admin`
- **Input:** `{ "feature_overrides": {...}, "permission_overrides": {...}, "notes": "..." }`
- **Behaviour:** Used to grant a specific business access to a feature normally disabled for its business type, or to take away a feature for a non-paying client.

#### `[ADM-022]` Effective permissions resolution (server-side, cached)

- **Logic:** When checking a feature flag for a business: (1) load `business_type_features` defaults, (2) overlay `business_custom_authority.feature_overrides_json`. The overlay wins. Cached for 5 minutes per business.

### 12.4.4 Capital / Financial Detail

#### `[ADM-030]` Capital detail report

- **Method:** `GET` `/api/business/reports/capital-detail`
- **Roles:** `owner`
- **Query:** `from_date`, `to_date`
- **Output:** Per-day breakdown: revenue (TTC), TVA collected, TVA paid (input), refunds issued, cash deposited, card deposits, points liability change, stored value liability change. A running cash position.

### 12.4.5 Version Log / Changelog

#### `[ADM-040]` List menu categories

- **Method:** `GET` `/api/super/version-log/menus` (super admin write)
- **Method:** `GET` `/api/auth/version-log/menus` (any logged-in user — read-only)

#### `[ADM-041]` List entries (paginated)

- **Method:** `GET` `/api/auth/version-log/entries`
- **Query:** `menu_id`, `page`, `limit`
- **Output:** Paginated list with description, version, published_at; auto-filters out entries where `expires_at < now()`.

#### `[ADM-042]` Create / [ADM-043] Update / [ADM-044] Delete entry

- **Method:** REST on `/api/super/version-log/entries[/:id]`
- **Roles:** `super_admin`

### 12.4.6 System Parameters

#### `[ADM-050]` List system parameters

- **Method:** `GET` `/api/super/system-parameters`
- **Query:** `param_type`, `page`, `limit`

#### `[ADM-051]` Update system parameter

- **Method:** `PATCH` `/api/super/system-parameters/:id`
- **Roles:** `super_admin`
- **Behaviour:** Logs change to audit. If `is_overridable_per_business = true`, businesses with overrides keep theirs.

### 12.4.7 Daily Settlement Cutoff

#### `[ADM-060]` Get business cutoff time

- **Method:** `GET` `/api/business/settings/settlement-cutoff`

#### `[ADM-061]` Update business cutoff time

- **Method:** `PUT` `/api/business/settings/settlement-cutoff`
- **Roles:** `owner`
- **Input:** `{ "cutoff_time": "02:00" }` (24h format)
- **Behaviour:** Updates `businesses.daily_settlement_cutoff_time`. All "daily" reports (Daily Sales Summary, TVA daily totals) henceforth use this cutoff to define a "day" — a sale at 01:30 on April 28 with cutoff `02:00` is reported as April 27.

### 12.4.8 Address Picker

#### `[ADM-070]` Morocco region/city/district tree

- **Method:** `GET` `/api/auth/regions/tree`
- **Output:** Pre-loaded Morocco administrative tree (Régions → Préfectures → Communes). Static data seeded into the database; no DGI integration required.

#### `[ADM-071]` Validate address

- **Method:** `POST` `/api/auth/regions/validate`
- **Input:** `{ "region_code": "...", "prefecture_code": "...", "commune_code": "..." }`
- **Output:** `{ "valid": true, "full_path": "Casablanca-Settat / Casablanca / Sidi Bernoussi" }`


---

# 13. Database Schema Additions — Master List

This section consolidates every new table and every column added to existing tables. Use it as the migration checklist.

## 13.1 New Tables (in suggested creation order)

| # | Table | Module | PK | Key FKs |
|--:|---|---|---|---|
| 1 | `customers` | CUST | `id` | `business_id`, `grade_id` |
| 2 | `customer_grades` | CUST | `id` | `business_id` |
| 3 | `customer_labels` | CUST | `id` | `business_id` |
| 4 | `customer_label_assignments` | CUST | `(customer_id, label_id)` | both FKs |
| 5 | `customer_attributes` | CUST | `id` | `business_id` |
| 6 | `customer_attribute_values` | CUST | `(customer_id, attribute_id)` | both FKs |
| 7 | `customer_points_history` | CUST | `id` | `business_id`, `customer_id`, `transaction_id` |
| 8 | `promotions` | PROM | `id` | `business_id`, `target_category_id`, `target_product_id` |
| 9 | `promotion_redemptions` | PROM | `id` | `promotion_id`, `transaction_id`, `customer_id` |
| 10 | `coupon_types` | CPN | `id` | `business_id`, `free_item_product_id` |
| 11 | `coupons` | CPN | `id` | `business_id`, `coupon_type_id`, `customer_id`, `redeemed_in_transaction_id` |
| 12 | `coupon_redemptions` | CPN | `id` | `coupon_id`, `transaction_id`, `customer_id` _(added in v1.1; mirrors promotion_redemptions, replaces the dropped applied_coupon_ids array)_ |
| 13 | `discount_write_offs` | XCC | `id` | `business_id`, `transaction_id`, `terminal_id`, `coupon_id` _(added in v1.1; tracks unrecoverable offline-coupon discount losses per XCC-032)_ |
| 14 | `points_exchange_rules` | PEX | `id` | `business_id` |
| 15 | `points_exchange_rule_details` | PEX | `id` | `rule_id`, `coupon_type_id`, `product_id` |
| 16 | `points_exchange_redemptions` | PEX | `id` | `rule_id`, `customer_id`, `granted_coupon_id` |
| 17 | `dining_areas` | RST | `id` | `business_id`, `location_id` |
| 18 | `table_types` | RST | `id` | `business_id` |
| 19 | `tables` | RST | `id` | `business_id`, `area_id`, `table_type_id` |
| 20 | `table_sessions` | RST | `id` | `business_id`, `table_id`, `customer_id`, `closed_in_transaction_id` |
| 21 | `table_session_items` | RST | `id` | `business_id` _(added v1.1)_, `table_session_id`, `product_id`, `customer_id` _(added v1.1)_ |
| 22 | `warehouses` | INV | `id` | `business_id`, `linked_location_id` |
| 23 | `vendors` | INV | `id` | `business_id` |
| 24 | `vendor_check_details` | INV | `id` | `vendor_id` |
| 25 | `brands` | INV | `id` | `business_id` |
| 26 | `nutrition_info` | INV | `id` | `business_id`, `product_id` (UNIQUE) |
| 27 | `stock_batches` | INV | `id` | `business_id`, `warehouse_id`, `product_id`, `vendor_id`, `purchase_order_id` |
| 28 | `stock_movements` | INV | `id` | `batch_id` |
| 29 | `purchase_orders` | INV | `id` | `business_id`, `vendor_id`, `warehouse_id`, `parent_business_id` |
| 30 | `purchase_order_items` | INV | `id` | `purchase_order_id`, `product_id` |
| 31 | `stock_templates` | INV | `id` | `business_id`, `default_vendor_id`, `default_warehouse_id` |
| 32 | `stock_template_items` | INV | `id` | `template_id`, `product_id` |
| 33 | `expiration_alerts` | INV | `id` | `batch_id` |
| 34 | `stock_discrepancy_alerts` | INV | `id` | `business_id`, `batch_id`, `warehouse_id`, `product_id` _(added v1.1; tracks offline-sync and reconciliation mismatches per [INV-095])_ |
| 35 | `chain_sync_configs` | CHN | `business_id` (PK) | self |
| 36 | `chain_sync_jobs` | CHN | `id` | `parent_business_id` |
| 37 | `user_business_roles` | CHN | `(user_id, business_id)` | both FKs |
| 38 | `recommendation_templates` | REC | `id` | `business_id` |
| 39 | `recommendation_template_items` | REC | `id` | `template_id`, `product_id` |
| 40 | `platform_announcements` | COM | `id` | `created_by_user_id` |
| 41 | `business_announcements` | COM | `id` | `business_id` |
| 42 | `notification_channels` | COM | `(business_id, channel)` | _normalised in v1.1; was a single PK on `business_id` — now one row per channel per business_ |
| 43 | `notification_templates` | COM | `id` | `business_id` |
| 44 | `notification_sends` | COM | `id` | `business_id`, `template_id`, `recipient_customer_id`, `linked_promotion_id`, `linked_coupon_id` |
| 45 | `user_announcement_dismissals` | COM | `(user_id, announcement_id)` | both FKs |
| 46 | `trade_categories` | ADM | `id` | `parent_id`, `default_business_type_id` |
| 47 | `couriers` | ADM | `id` | — |
| 48 | `business_courier_links` | ADM | `(business_id, courier_id)` | both FKs |
| 49 | `business_custom_authority` | ADM | `business_id` (PK) | `set_by_super_admin_id` |
| 50 | `version_log_menus` | ADM | `id` | — |
| 51 | `version_log_entries` | ADM | `id` | `menu_id` |
| 52 | `system_parameters` | ADM | `id` | — |
| 53 | `morocco_regions` | ADM | `id` | `parent_id` (self-FK for region/prefecture/commune tree) |
| 54 | `background_jobs` | XCC | `id` | `business_id` _(added v1.1; centralised async-job state per [XCC-051])_ |

## 13.2 Columns Added to Existing Tables

| Existing table | New column | Type | Default | Source req |
|---|---|---|---|---|
| `transactions` | `customer_id` | UUID NULL | — | CUST-MOD-001 |
| `transactions` | `points_earned` | INT NOT NULL | 0 | CUST-MOD-001 |
| `transactions` | `points_redeemed` | INT NOT NULL | 0 | CUST-MOD-001 |
| `transactions` | `discount_total` | NUMERIC(12,2) NOT NULL | 0 | CUST-MOD-001 |
| `transactions` | `table_session_id` | UUID NULL | — | RST-MOD-002 _(v1.1; back-reference for split-bill completion)_ |
| `transaction_items` | `discount_amount` | NUMERIC(12,2) NOT NULL | 0 | XCC-010 |
| `users` | `permissions` | JSONB NOT NULL | `'{}'::jsonb` | XCC-060 _(v1.1; replaces 6 boolean columns including pre-existing `can_void`/`can_refund`)_ |
| `users` | `accessible_business_ids` | UUID[] | `'{}'::uuid[]` | CHN-MOD-003 |
| `businesses` | `points_earn_divisor` | NUMERIC(8,2) NOT NULL | 1.00 | CUST-MOD-004 |
| `businesses` | `points_redeem_value` | NUMERIC(8,4) NOT NULL | 0.0500 | CUST-MOD-005 |
| `businesses` | `promotion_stacking_mode` | VARCHAR(20) NOT NULL | `'best_only'` | PROM-MOD-002 |
| `businesses` | `parent_business_id` | UUID NULL | — | CHN-MOD-001 |
| `businesses` | `chain_role` | VARCHAR(20) NOT NULL | `'standalone'` | CHN-MOD-002 |
| `businesses` | `trade_category_id` | UUID NULL | — | ADM-MOD-001 |
| `businesses` | `daily_settlement_cutoff_time` | TIME NOT NULL | `'02:00'` | ADM-MOD-001 |
| `businesses` | `expiration_alert_lead_days` | INT NOT NULL | 7 | INV-080 |
| `products` | `brand_id` | UUID NULL | — | INV-MOD-001 |
| `products` | `default_vendor_id` | UUID NULL | — | INV-MOD-001 |
| `products` | `unit_of_measure` | VARCHAR(20) NOT NULL | `'unit'` | INV-MOD-001 |
| `products` | `track_stock` | BOOLEAN NOT NULL | false | INV-MOD-001 |
| `products` | `whole_price_1` | NUMERIC(12,2) NULL | — | REC-MOD-001 |
| `products` | `whole_price_2` | NUMERIC(12,2) NULL | — | REC-MOD-001 |
| `products` | `whole_price_3` | NUMERIC(12,2) NULL | — | REC-MOD-001 |
| `products` | `whole_price_4` | NUMERIC(12,2) NULL | — | REC-MOD-001 |
| `products` | `synced_from_parent_id` | UUID NULL | — | CHN-MOD-005 |
| `categories` | `synced_from_parent_id` | UUID NULL | — | CHN-MOD-005 |
| `product_variants` | `synced_from_parent_id` | UUID NULL | — | CHN-MOD-005 |
| `modifier_groups` | `synced_from_parent_id` | UUID NULL | — | CHN-MOD-005 |
| `modifiers` | `synced_from_parent_id` | UUID NULL | — | CHN-MOD-005 |
| `stock_movements` | `source_origin` | VARCHAR(20) NOT NULL | `'realtime'` | INV-050 _(v1.1; distinguishes realtime / offline_sync / system_reconciliation movements)_ |
| `table_sessions` | `expected_split_count` | INT NOT NULL | 1 | RST-035 _(v1.1; split-bill completion tracking)_ |
| `table_sessions` | `partial_payment` | BOOLEAN NOT NULL | false | RST-038 _(v1.1; flag for sessions closed by escape hatch)_ |

### Columns dropped from previous v1.0 plan (not in production yet)

These were specified in v1.0 but removed before any code shipped, per the v1.1 review pass:

| Table | Column | Reason |
|---|---|---|
| `customers` | `stored_value_balance` | Stored-value feature deferred to a future spec (legal review on Moroccan pre-paid liability accounting required) |
| `customers` | `total_recharge` | Same |
| `customers` | `password_hash` | Customer-portal login deferred; no auth flow specified |
| `transactions` | `applied_promotion_ids UUID[]` | Replaced by the `promotion_redemptions` join table (proper FK integrity, indexable queries) |
| `transactions` | `applied_coupon_ids UUID[]` | Replaced by the new `coupon_redemptions` join table |
| `transactions` | `total_ht_input_tva` | Per-transaction input TVA was a phantom-precision design; reclaim is now a period-level query against `purchase_order_items` per [INV-093] |
| `users` | `can_adjust_points` BOOL | Folded into `users.permissions` JSONB |
| `users` | `can_redeem_points` BOOL | Folded into `users.permissions` JSONB |
| `users` | `can_approve_po` BOOL | Folded into `users.permissions` JSONB |
| `users` | `can_issue_coupons` BOOL | Folded into `users.permissions` JSONB |
| `users` | `can_void` BOOL (pre-existing from SRS) | Folded into `users.permissions` JSONB at the same time, see migration in §13.4 |
| `users` | `can_refund` BOOL (pre-existing from SRS) | Folded into `users.permissions` JSONB at the same time |

## 13.3 Required Indexes (beyond PK/FK)

This is the canonical "unique within business" audit pass. Every claim of business-scoped uniqueness in this spec must have a partial unique index in this list, otherwise the claim is documentation, not enforcement.

| Table | Index | Reason |
|---|---|---|
| `customers` | `(business_id, phone)` UNIQUE WHERE phone IS NOT NULL | enforce phone uniqueness per business |
| `customers` | `(business_id, customer_code)` UNIQUE | code uniqueness within business |
| `customers` | `(business_id, is_active)` | filtered queries |
| `customer_grades` | `(business_id, name)` UNIQUE | grade name uniqueness within business |
| `customer_labels` | `(business_id, name)` UNIQUE | label name uniqueness within business |
| `customer_attributes` | `(business_id, key)` UNIQUE | attribute key uniqueness within business |
| `customer_points_history` | `(customer_id, created_at DESC)` | history paging |
| `promotions` | `(business_id, code)` UNIQUE | promotion code uniqueness within business |
| `promotions` | `(business_id, status, start_date, end_date)` | active-promotion filter |
| `promotion_redemptions` | `(promotion_id, redeemed_at DESC)` | per-promotion usage report ([PROM-050]) |
| `promotion_redemptions` | `(transaction_id)` | reverse lookup from transaction to promotions |
| `coupon_types` | `(business_id, code)` UNIQUE | coupon-type code uniqueness within business |
| `coupons` | `(business_id, coupon_code)` UNIQUE | terminal lookup |
| `coupons` | `(customer_id, status)` | per-customer redemption checks |
| `coupon_redemptions` | `(coupon_id)` UNIQUE | one redemption per coupon (DB-level enforcement of single-use) |
| `coupon_redemptions` | `(transaction_id)` | reverse lookup from transaction to coupons |
| `discount_write_offs` | `(business_id, created_at DESC)` | write-off report paging |
| `discount_write_offs` | `(terminal_id, created_at DESC)` | per-terminal forensics |
| `tables` | `(location_id, area_id, is_active)` | floor plan |
| `tables` | `(business_id, table_number)` UNIQUE | table number uniqueness within business |
| `table_sessions` | `(table_id, status)` partial WHERE status IN ('open','awaiting_payment') | open-table lookup; also enforces "max 1 active session per table" if combined with a partial UNIQUE |
| `table_sessions` | `(business_id, status, opened_at DESC)` | manager view of recent sessions |
| `warehouses` | `(business_id, code)` UNIQUE | warehouse code uniqueness within business |
| `vendors` | `(business_id, code)` UNIQUE | vendor code uniqueness within business |
| `brands` | `(business_id, name)` UNIQUE | brand name uniqueness within business |
| `stock_batches` | `(warehouse_id, product_id, expires_at, received_at) WHERE quantity_remaining > 0 AND is_active = true` | FIFO consumption (the workhorse index) |
| `stock_movements` | `(batch_id, created_at DESC)` | batch history |
| `stock_movements` | `(business_id, source_origin, created_at DESC) WHERE source_origin = 'offline_sync'` | reconciliation sweep ([INV-095]) |
| `stock_discrepancy_alerts` | `(business_id, resolved_at) WHERE resolved_at IS NULL` | open-alert dashboard |
| `purchase_orders` | `(business_id, po_number)` UNIQUE | PO number uniqueness within business |
| `purchase_orders` | `(business_id, status, order_date DESC)` | dashboard listing |
| `notification_channels` | `(business_id, channel)` PRIMARY KEY (composite) | enforces single provider per channel per business in v1.1 |
| `notification_sends` | `(business_id, sent_at DESC)` | history paging |
| `notification_sends` | `(recipient_customer_id, channel, status)` | per-customer audit |
| `trade_categories` | `(parent_id, code)` UNIQUE | code uniqueness within parent (tree position) |
| `couriers` | `(code)` UNIQUE | global courier code uniqueness (super-admin scope) |
| `version_log_entries` | `(menu_id, version)` UNIQUE | one entry per (menu, version) |
| `system_parameters` | `(key)` UNIQUE | platform-wide param key uniqueness |
| `background_jobs` | `(unique_lock_key)` UNIQUE WHERE status IN ('queued','running') AND unique_lock_key IS NOT NULL | concurrency-lock enforcement per [XCC-052] |
| `background_jobs` | `(business_id, status, created_at DESC)` | job listing per business |

## 13.4 New Migrations Required

The repo currently has two migrations: `1712050000000-InitialSchema.ts` and `1712060000000-AddOrderStatus.ts`. This spec implies the following ordered migrations on top:

1. **`AddTvaCompliance`** — adds the missing TVA columns from SRS §3.7 (`businesses.ice_number`, `businesses.if_number`, `businesses.address`, `businesses.invoice_counter`, `categories.default_tva_rate`, `products.tva_rate`, `products.tva_exempt`, `transactions.invoice_number`, `transactions.total_ht`, `transactions.total_tva`, `transactions.total_ttc`, `transactions.simpl_tva_status`, `transactions.simpl_tva_reference`, `transactions.simpl_tva_sent_at`, `transaction_items.tva_rate`, `transaction_items.item_ht`, `transaction_items.item_tva`, `transaction_items.item_ttc`). **Must land before any of the migrations below** because customer/promotion/coupon logic interacts with these columns.

2. **`FixTerminalServiceImports`** — pure code fix (the duplicated `KdsService` imports in `terminal.service.ts`). No DB change. Listed here for ordering visibility.

3. **`AddBackgroundJobInfrastructure`** — new in v1.1. Creates `background_jobs` table and the partial unique index for `unique_lock_key`. Must land before any of the bulk-job-using migrations below since they reference the job-polling endpoints.

4. **`MigrateUserPermissionsToJsonb`** — new in v1.1. The single most disruptive change; placed early so all downstream migrations reference the new column shape. Operations:
    ```sql
    ALTER TABLE users ADD COLUMN permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

    UPDATE users
    SET permissions = jsonb_build_object(
      'can_void', can_void,
      'can_refund', can_refund
    )
    WHERE can_void = true OR can_refund = true;

    ALTER TABLE users
      DROP COLUMN can_void,
      DROP COLUMN can_refund;
    ```
    The `down` migration restores the boolean columns and copies values back from the JSONB.

5. **`AddCustomersAndLoyalty`** — Module CUST tables + transaction column additions (no `users` permission columns; those go through migration 4). Includes the JSONB unique index audit for `customers`, `customer_grades`, `customer_labels`, `customer_attributes`.

6. **`AddPromotionsAndCoupons`** — Modules PROM + CPN tables, including the new `coupon_redemptions` join table. **Does NOT add `transactions.applied_promotion_ids` or `transactions.applied_coupon_ids` UUID arrays** — those were specified in v1.0 and dropped in v1.1.

7. **`AddDiscountWriteOffs`** — new in v1.1. Creates the `discount_write_offs` table and indexes for the report endpoint [XCC-040].

8. **`AddPointsExchange`** — Module PEX tables. The `users` permission key is added to `permissions` JSONB at write time, no schema change.

9. **`AddRestaurantOperations`** — Module RST tables, including v1.1 additions: `table_sessions.expected_split_count`, `table_sessions.partial_payment`, `table_session_items.business_id`, `table_session_items.customer_id`, `transactions.table_session_id`.

10. **`AddInventoryFoundations`** — Module INV tables (warehouses, vendors, brands, nutrition_info), products column additions.

11. **`AddStockBatchesAndPurchaseOrders`** — remaining INV tables (stock_batches, stock_movements with `source_origin` column included, purchase_orders, purchase_order_items, stock_templates, stock_template_items, expiration_alerts, **stock_discrepancy_alerts**). **Does NOT add `transactions.total_ht_input_tva`** — dropped in v1.1.

12. **`AddChainOperations`** — Module CHN tables + businesses/users/products column additions.

13. **`AddRecommendations`** — Module REC tables + products price-tier columns.

14. **`AddCommunications`** — Module COM tables. The `notification_channels` table is created with the composite `(business_id, channel)` PK from day one (no v1.0 → v1.1 transition needed since this is brand-new in v1.1).

15. **`AddPlatformAdminEnhancements`** — Module ADM tables + remaining businesses column additions + Morocco region seed.

Each migration shall be reversible (a working `down` method) per existing repo conventions.


---

# 14. Implementation Phases

The SRS already defines Phases 1–4. This spec extends with **Phase 5 onwards** in priority order. Each phase is independently shippable.

## Phase 5 — TVA Foundation (PREREQUISITE for all loyalty work)

**Goal:** Close all SRS §3.7 gaps so the system is legally compliant and discounts can build on top.
**Duration:** 2–3 weeks
**Scope:**
- Migration `AddTvaCompliance` (column additions to businesses, categories, products, transactions, transaction_items)
- Atomic invoice-counter implementation per SRS [TVA-021]
- TVA calculation engine in transaction creation per [TVA-010] / [TVA-011] / [TVA-012] (online + offline)
- Receipt template overhaul per SRS §3.6.2
- TVA Declaration Report per [TVA-030] / [TVA-031] / [TVA-032]
- SimplTvaService stub per [TVA-041] / [TVA-042]
- Fix to `terminal.service.ts` import duplication (the `KdsService` import bug noted in companion review)

**Acceptance:** SRS §9.1 critical functional gates and §9.2 legal compliance gate all pass.

## Phase 6 — Customers & Loyalty Core (CUST)

**Goal:** Customer records, grades, labels, points wallet, terminal-side lookup, sale-attached customer.
**Duration:** 3–4 weeks
**Scope:** All CUST requirements; the discount-distribution math for points-redemption per XCC-013.
**Acceptance:** A customer can be added at terminal, attached to a sale, earn points based on grade multiplier, redeem points as discount on a subsequent sale, and the receipt prints correctly with points lines.

## Phase 7 — Promotions & Coupons (PROM + CPN)

**Goal:** Promotion engine, coupon issuance and redemption, basic stacking rules.
**Duration:** 4–5 weeks
**Scope:** All PROM and CPN requirements except sub-store promotion validation (deferred to Phase 13). Plus [PROM-030] notification dispatch using the COM module's basic SMS/email (Phase 9 adds full COM).
**Acceptance:** Manager can create a "10% off bakery on Tuesdays" promotion, it auto-applies on qualifying carts, the discount distributes across line items, and the TVA receipt math is correct. Manager can issue a coupon, customer redeems it at terminal, status updates correctly under concurrent-redemption stress test.

## Phase 8 — Points Exchange (PEX)

**Goal:** Point-for-coupon redemption rules.
**Duration:** 1–2 weeks
**Scope:** All PEX requirements. Builds on CPN.
**Acceptance:** Customer with sufficient points can redeem for a coupon via dashboard or terminal, points decrement, coupon is issued and usable.

## Phase 9 — Communications (COM)

**Goal:** Bulk SMS/email/WhatsApp campaigns, transactional sends, opt-out tracking.
**Duration:** 3–4 weeks
**Scope:** All COM requirements. Critical: integrates with PROM and CPN for campaign rollout.
**Acceptance:** Owner can send a 1000-recipient SMS campaign tied to a coupon, opt-out link works, send history is auditable.

## Phase 10 — Restaurant Operations (RST)

**Goal:** Table management and table-service flow for restaurants.
**Duration:** 4–5 weeks
**Scope:** All RST requirements. Refactors existing `kds` module to consume from `table_session_items`.
**Acceptance:** Server can open a table, add items (which appear on KDS), modify before kitchen starts, close and pay including split bill, with separate TVA-compliant invoices for each split.

## Phase 11 — Inventory Foundations (INV — vendors, warehouses, brands, nutrition)

**Goal:** Vendor catalogue, warehouse setup, brand management, nutrition info.
**Duration:** 3–4 weeks
**Scope:** INV requirements §8.4.1–§8.4.4. Excludes batch tracking and POs.
**Acceptance:** Catalogue products can be linked to brand and default vendor; nutrition info can be added per product and shows on customer-facing menu (deferred surface).

## Phase 12 — Stock Batches & Purchase Orders (INV — full)

**Goal:** Batch-level stock tracking with FIFO consumption, full PO lifecycle, expiration alerts.
**Duration:** 4–5 weeks
**Scope:** Remaining INV requirements §8.4.5–§8.4.10. Includes input TVA reclaim feeding into the TVA Declaration Report.
**Acceptance:** Sale automatically decrements oldest batch first, expiry alerts surface 7 days ahead of expiry, PO can be raised, sent, partially received, and closed with batches created at warehouse.

## Phase 13 — Chain & Franchise (CHN)

**Goal:** Parent/child business hierarchy, cloud goods sync, multi-business user access.
**Duration:** 4–6 weeks
**Scope:** All CHN requirements + [PROM-040] sub-store promotion validation deferred from Phase 7.
**Acceptance:** Super Admin links 3 child businesses to a parent; HQ user logs in once and switches between them; parent owner edits a product and the change syncs to all 3 children.

## Phase 14 — Recommendations (REC)

**Goal:** Recommendation templates and featured items.
**Duration:** 2 weeks
**Scope:** All REC requirements.
**Acceptance:** "Top sellers this week" template auto-populates and renders on terminal sales screen.

## Phase 15 — Platform Admin Enhancements (ADM)

**Goal:** Trade categories at signup, courier registry, custom permissions, changelog, system parameters, settlement cutoff, address picker.
**Duration:** 2–3 weeks
**Scope:** All ADM requirements. Some sub-features (couriers) overlap with future delivery-platform integration not in this spec.
**Acceptance:** New business signup flow uses trade-category picker; super admin can override a feature flag for one business; daily reports honour custom cutoff time.

**Total estimated duration for Phases 5–15:** 32–45 weeks (~8–11 months) at one full-time team. Can be parallelised: Phase 6 CUST + Phase 10 RST can run in parallel after Phase 5 lands. INV (Phases 11–12) is largely independent and could run in parallel with PROM/CPN.

---

# 15. Acceptance Criteria — Cross-Cutting

In addition to per-phase acceptance criteria above, the following must hold across all extension features:

## 15.1 Compliance

- [ACC-C01] Every transaction with any combination of discount, points redemption, and coupon redemption produces a receipt where ICE, IF, invoice number, per-line TVA rate, total HT, TVA by rate, and total TTC are correct per Finance Law 50-25.
- [ACC-C02] The TVA Declaration Report sum across a date range equals the sum of `transactions.total_tva` (post-discount) for that range, to the cent.
- [ACC-C03] Sum of `customer_points_history.delta` equals `customers.points_balance` for every customer (eventual consistency: max 30s lag during sync).
- [ACC-C04] No `coupon` is in `redeemed` status without a non-null `redeemed_in_transaction_id` AND a corresponding `coupon_redemptions` row referencing that transaction.
- [ACC-C05] Every `promotion_redemptions` row references a valid `promotion` and a valid `transaction` (FK enforced); the `current_uses` counter on each promotion equals `COUNT(*) FROM promotion_redemptions WHERE promotion_id = :id` to within one row of write skew.

## 15.2 Performance

- [ACC-P01] Customer lookup by phone at terminal returns within 200 ms online, within 50 ms offline (against local SQLite).
- [ACC-P02] Promotion evaluation for a 20-line cart returns within 500 ms (1000 ms in offline mode).
- [ACC-P03] Coupon redemption atomic update succeeds for ≥ 99.9% of valid attempts under 100 concurrent redemption requests for the same coupon (the remaining 0.1% being legitimate races where the coupon was just used elsewhere).
- [ACC-P04] FIFO stock consumption for a 20-line sale completes within 300 ms even when each line spans 3+ batches.

## 15.3 Multi-Tenancy

- [ACC-M01] Every endpoint added by this spec passes the existing automated multi-tenancy test suite (no cross-tenant leakage).
- [ACC-M02] Chain `accessible_business_ids` access logic adds < 50 ms to JWT validation overhead.

## 15.4 Offline

- [ACC-O01] Terminal in offline mode for 4 hours processing 100 sales (with customer attached, points earned, points redeemed, and coupon redemption mixed in) syncs cleanly without data loss when reconnected.
- [ACC-O02] Concurrent coupon redemption from two offline terminals correctly marks one as failed at sync time and surfaces the error per SRS [OFF-008].

---

# 16. Open Questions and Risks

The following items require resolution before the relevant phase begins. They are NOT blockers for design or initial scaffolding but ARE blockers for legal go-live or pilot deployment.

## 16.1 Legal — Tax Treatment of Discounts (HIGH)

**Question:** Does Morocco DGI accept "post-discount HT" as the basis for TVA reporting (current XCC-015 design), or does it require pre-discount HT with a separate "remise" line and a TVA adjustment?
**Owner:** Legal/tax counsel
**Resolution required by:** Start of Phase 7 (Promotions/Coupons)
**Impact if changed:** Schema unchanged; only the report-generation layer (TVA Declaration export) needs adjustment. ~1 week of work.

## 16.2 Legal — Loyalty Liability Recognition (MEDIUM)

**Question:** Does Morocco's accounting standard treat issued-but-unredeemed loyalty points as a deferred revenue liability on the books? If so, the system needs to expose a "points liability MAD value" at any moment for the business's accountant.
**Owner:** Accounting consultation
**Resolution required by:** Phase 6
**Impact if confirmed:** Add a `points_liability_value` computed field on the dashboard. Already supported by existing schema; reporting addition only.

## 16.3 Legal — Customer Data Retention (MEDIUM)

**Question:** Does Morocco's data protection law (Law No. 09-08) require explicit consent for storing customer phone+name+points data, and is the existing `consent_marketing` flag sufficient or is a separate `consent_data_storage` required?
**Owner:** Legal/privacy counsel
**Resolution required by:** Phase 6
**Impact if changed:** Add a second consent flag and a "minimum-retention" purge job for non-consenting customers.

## 16.4 Technical — SMS Provider for Morocco (MEDIUM)

**Question:** Which SMS provider (Infobip, Twilio, AWS SNS, or a Moroccan local provider such as a Maroc Telecom / Inwi / Orange Maroc gateway) gives best deliverability and price for Morocco mobile numbers? WhatsApp Business API: Meta Cloud direct vs. via Twilio?
**Owner:** Engineering + commercial
**Resolution required by:** Start of Phase 9
**Impact:** Provider abstraction is built into Module COM (`notification_channels.sms_provider`); switching is a config change, not code.

## 16.5 Technical — Coupon Code Format and Anti-Forgery (MEDIUM)

**Question:** Are 12-char alphanumeric coupon codes (per [CPN-020]) sufficient, or do we need cryptographically signed codes (HMAC) to prevent forgery?
**Owner:** Security
**Resolution required by:** Phase 7
**Impact if changed:** Code generator complexity increases slightly; lookup endpoint does HMAC verification before DB lookup.

## 16.6 Architectural — Chain Hierarchy Depth (LOW)

**Question:** Is two-level chain hierarchy (parent/child) sufficient, or do we need to support nested chains (HQ → regional HQ → store)?
**Owner:** Product
**Resolution required by:** Phase 13
**Impact if changed:** Schema accommodates (parent_business_id is self-FK), but `accessible_business_ids` resolution and aggregation queries become tree traversals.

## 16.7 Operational — Background Job Infrastructure ~~(HIGH)~~ — **CLOSED in v1.1**

~~**Question:** What background job system are we using?~~

**Resolution:** BullMQ + Redis is the standard stack. Job state is persisted in the new `background_jobs` table with concurrency locks via `unique_lock_key` (see [XCC-050] through [XCC-057] in §2.6). All bulk operations route through this single infrastructure. Direct database polling and ad-hoc cron jobs outside this system are not permitted. This question is closed; implementation proceeds against the spec'd contract.

## 16.8 UX — Offline Coupon Redemption Conflicts ~~(MEDIUM)~~ — **CLOSED in v1.1**

~~**Question:** When a coupon redemption fails at sync, what's the manual recovery path?~~

**Resolution:** Adopted Option A from the v1.1 review: the transaction stands as written, the business eats the discount as a P&L loss, and a `discount_write_offs` row tracks the unrecoverable amount with `terminal_id` for forensic traceability. There is NO TVA impact (the customer paid the discounted price, output TVA on `transactions.total_tva` reflects what was actually collected). The cashier sees a "failed sync" entry per SRS [OFF-008] for awareness only — no cash collection or void action is needed. See [XCC-032] in §2.5 for the full mechanism and [XCC-040] for the monthly write-off report. This question is closed.

## 16.9 Compliance — Promotional SMS Content (LOW)

**Question:** Does Morocco's HACA telecoms regulator require specific content (sender ID, opt-out instruction, business name) on every promotional SMS?
**Owner:** Legal
**Resolution required by:** Phase 9
**Impact if confirmed:** Enforce template content rules; add automatic footer inclusion in [COM-051].

---

# 17. Glossary (additions to SRS §1.3)

| Term | Definition |
|---|---|
| Customer | An end-consumer enrolled in the business's loyalty programme. Distinct from `users` (staff). |
| Grade | Customer loyalty tier (e.g. Bronze, Silver, Gold) carrying default discount and points multiplier. |
| Label | Free-form tag attached to a customer for segmentation (e.g. "Birthday This Month"). |
| Promotion | Auto-applying offer with eligibility rules; not requiring a customer-presented code. |
| Coupon Type | A reusable definition of a discount (e.g. "10% off any drink"). |
| Coupon | An issued instance of a coupon type with a unique redeemable code. |
| Points Wallet | A customer's accumulated, redeemable, and lifetime points balances. |
| Points Exchange Rule | A rule mapping a points spend to a coupon, free product, or fixed discount. |
| Table Session | An open, unpaid order on a restaurant table; closes when paid. |
| Batch | A discrete lot of stock with a vendor lot number, expiry date, unit cost; FIFO-consumed on sale. |
| Stock Movement | A single recorded change to a batch's quantity (receive, sale, adjust, transfer, waste). |
| Purchase Order | A vendor order with line items, status workflow (draft → sent → received), and TVA-aware pricing. |
| Chain | A parent-child relationship between businesses, used by franchises and multi-brand operators. |
| Cloud Goods Sync | The process of replicating the parent business's catalogue into child businesses. |
| Recommendation Template | A static or dynamic curated list of products presented as suggestions on terminal/kiosk surfaces. |
| Trade Category | A classification of business industry (Restaurant, Café, Pharmacy, etc.) seeded with sensible defaults. |
| Settlement Cutoff | The configurable time-of-day when a business's "operational day" rolls over for daily reports. |
| Discount Distribution | The XCC-011 algorithm that proportionally allocates an order-level discount across line items so per-line TVA math remains correct. |
| Input TVA | TVA paid by the business on its purchases (from purchase orders), reclaimable against output TVA on sales. |
| Output TVA | TVA collected by the business from customers on sales. |

---

# 18. Endpoint Catalogue — Quick Reference

A flat list of every new endpoint introduced by this spec, grouped by API surface, for quick navigation.

## 18.1 `/api/super/*`

```
GET    /api/super/businesses/chain-tree                                 [CHN-001]
POST   /api/super/businesses/:id/promote-to-parent                      [CHN-002]
POST   /api/super/businesses/:child_id/link-parent                      [CHN-003]
POST   /api/super/businesses/:child_id/unlink-parent                    [CHN-004]
GET    /api/super/businesses/:id/custom-authority                       [ADM-020]
PUT    /api/super/businesses/:id/custom-authority                       [ADM-021]
GET    /api/super/announcements                                         [COM-001]
POST   /api/super/announcements                                         [COM-002]
PATCH  /api/super/announcements/:id                                     [COM-003]
DELETE /api/super/announcements/:id                                     [COM-004]
GET    /api/super/trade-categories/tree                                 [ADM-001]
POST   /api/super/trade-categories                                      [ADM-002]
PATCH  /api/super/trade-categories/:id                                  [ADM-003]
DELETE /api/super/trade-categories/:id                                  [ADM-004]
GET    /api/super/trade-categories/options                              [ADM-005]
GET    /api/super/couriers                                              [ADM-010]
POST   /api/super/couriers                                              [ADM-011]
PATCH  /api/super/couriers/:id                                          [ADM-012]
DELETE /api/super/couriers/:id                                          [ADM-013]
GET    /api/super/version-log/menus                                     [ADM-040]
POST   /api/super/version-log/entries                                   [ADM-042]
PATCH  /api/super/version-log/entries/:id                               [ADM-043]
DELETE /api/super/version-log/entries/:id                               [ADM-044]
GET    /api/super/system-parameters                                     [ADM-050]
PATCH  /api/super/system-parameters/:id                                 [ADM-051]
GET    /api/super/jobs/dead-letter                                      [XCC-056]   # v1.1
POST   /api/super/jobs/:id/retry                                        [XCC-057]   # v1.1
```

## 18.2 `/api/business/*` — Customers & Loyalty

```
GET    /api/business/customers                                          [CUST-001]
GET    /api/business/customers/:id                                      [CUST-002]
POST   /api/business/customers                                          [CUST-003]
PATCH  /api/business/customers/:id                                      [CUST-004]
DELETE /api/business/customers/:id                                      [CUST-005]
POST   /api/business/customers/:id/anonymise                            [CUST-006]
GET    /api/business/customers/dashboard-summary                        [CUST-010]
GET    /api/business/customer-grades                                    [CUST-020]
POST   /api/business/customer-grades                                    [CUST-021]
PATCH  /api/business/customer-grades/:id                                [CUST-022]
DELETE /api/business/customer-grades/:id                                [CUST-023]
GET    /api/business/customer-labels                                    [CUST-030]
POST   /api/business/customer-labels                                    [CUST-031]
PATCH  /api/business/customer-labels/:id                                [CUST-032]
DELETE /api/business/customer-labels/:id                                [CUST-033]
PUT    /api/business/customers/:id/labels                               [CUST-034]
GET    /api/business/customer-attributes                                [CUST-040]
POST   /api/business/customer-attributes                                [CUST-041]
PATCH  /api/business/customer-attributes/:id                            [CUST-042]
DELETE /api/business/customer-attributes/:id                            [CUST-043]
GET    /api/business/customers/:id/attributes                           [CUST-044]
PUT    /api/business/customers/:id/attributes                           [CUST-045]
GET    /api/business/customers/:id/points-history                       [CUST-050]
POST   /api/business/customers/:id/points-adjustment                    [CUST-051]
POST   /api/business/customers/import-grades                            [CUST-052]
GET    /api/business/jobs/:id                                           [XCC-055]   # v1.1
GET    /api/business/reports/discount-write-offs                        [XCC-040]   # v1.1
```

## 18.3 `/api/business/*` — Promotions & Coupons & Points Exchange

```
GET    /api/business/promotions                                         [PROM-001]
GET    /api/business/promotions/:id                                     [PROM-002]
POST   /api/business/promotions                                         [PROM-003]
PATCH  /api/business/promotions/:id                                     [PROM-004]
POST   /api/business/promotions/:id/activate                            [PROM-005]
POST   /api/business/promotions/:id/pause                               [PROM-006]
POST   /api/business/promotions/:id/archive                             [PROM-007]
POST   /api/business/promotions/:id/validate-sub-stores                 [PROM-040]
POST   /api/business/promotions/:id/rollout-to-children                 [CHN-030]
GET    /api/business/reports/promotions                                 [PROM-050]

GET    /api/business/coupon-types                                       [CPN-001]
POST   /api/business/coupon-types                                       [CPN-002]
PATCH  /api/business/coupon-types/:id                                   [CPN-003]
POST   /api/business/coupon-types/:id/clone                             [CPN-004]
DELETE /api/business/coupon-types/:id                                   [CPN-005]
GET    /api/business/coupons/collectable                                [CPN-010]
POST   /api/business/coupons/issue                                      [CPN-020]
POST   /api/business/coupons/bulk-issue                                 [CPN-021]
POST   /api/business/coupons/issue-to-segment                           [CPN-022]
POST   /api/business/coupons/:id/void                                   [CPN-033]
GET    /api/business/reports/coupons                                    [CPN-040]

GET    /api/business/points-exchange-rules                              [PEX-001]
GET    /api/business/points-exchange-rules/:id                          [PEX-002]
GET    /api/business/points-exchange-rules/check-point-value            [PEX-003]
POST   /api/business/points-exchange-rules                              [PEX-004]
PATCH  /api/business/points-exchange-rules/:id                          [PEX-005]
DELETE /api/business/points-exchange-rules/:id                          [PEX-006]
GET    /api/business/points-exchange-rules/redeemable-for-customer      [PEX-010]
POST   /api/business/points-exchange-rules/:id/redeem                   [PEX-011]
GET    /api/business/reports/points-exchange                            [PEX-020]
```

## 18.4 `/api/business/*` — Restaurant Operations

```
GET    /api/business/dining-areas                                       [RST-001]
POST   /api/business/dining-areas                                       [RST-002]
PATCH  /api/business/dining-areas/:id                                   [RST-003]
DELETE /api/business/dining-areas/:id                                   [RST-004]
GET    /api/business/table-types                                        [RST-010]
POST   /api/business/table-types                                        [RST-011]
PATCH  /api/business/table-types/:id                                    [RST-012]
DELETE /api/business/table-types/:id                                    [RST-013]
GET    /api/business/tables                                             [RST-020]
POST   /api/business/tables                                             [RST-021]
PATCH  /api/business/tables/:id                                         [RST-022]
DELETE /api/business/tables/:id                                         [RST-023]
```

## 18.5 `/api/business/*` — Inventory

```
GET    /api/business/warehouses                                         [INV-001]
GET    /api/business/warehouses/:id                                     [INV-002]
POST   /api/business/warehouses                                         [INV-003]
PATCH  /api/business/warehouses/:id                                     [INV-004]
DELETE /api/business/warehouses/:id                                     [INV-005]
GET    /api/business/vendors                                            [INV-010]
GET    /api/business/vendors/:id                                        [INV-011]
POST   /api/business/vendors                                            [INV-012]
PATCH  /api/business/vendors/:id                                        [INV-013]
DELETE /api/business/vendors/:id                                        [INV-014]
GET    /api/business/vendors/:id/check-details                          [INV-015]
POST   /api/business/vendors/:id/check-details                          [INV-015]
GET    /api/business/brands                                             [INV-020]
POST   /api/business/brands                                             [INV-021]
PATCH  /api/business/brands/:id                                         [INV-022]
DELETE /api/business/brands/:id                                         [INV-023]
GET    /api/business/products/:id/nutrition                             [INV-030]
PUT    /api/business/products/:id/nutrition                             [INV-031]
GET    /api/business/nutrition-info                                     [INV-032]
GET    /api/business/stock-batches                                      [INV-040]
POST   /api/business/stock-batches                                      [INV-041]
POST   /api/business/stock-batches/:id/adjust                           [INV-042]
POST   /api/business/stock-batches/:id/dispose                          [INV-043]
POST   /api/business/stock-batches/:id/transfer                         [INV-044]
GET    /api/business/stock-templates                                    [INV-060]
POST   /api/business/stock-templates                                    [INV-062]
PATCH  /api/business/stock-templates/:id                                [INV-063]
DELETE /api/business/stock-templates/:id                                [INV-064]
POST   /api/business/stock-templates/:id/create-purchase-order          [INV-065]
GET    /api/business/purchase-orders                                    [INV-070]
GET    /api/business/purchase-orders/:id                                [INV-071]
POST   /api/business/purchase-orders                                    [INV-072]
PATCH  /api/business/purchase-orders/:id                                [INV-073]
POST   /api/business/purchase-orders/:id/send                           [INV-074]
POST   /api/business/purchase-orders/:id/confirm                        [INV-075]
POST   /api/business/purchase-orders/:id/receive                        [INV-076]
POST   /api/business/purchase-orders/:id/cancel                         [INV-077]
GET    /api/business/expiration-alerts                                  [INV-081]
POST   /api/business/expiration-alerts/:id/resolve                      [INV-082]
GET    /api/business/reports/stock-position                             [INV-090]
GET    /api/business/reports/stock-movements                            [INV-091]
GET    /api/business/reports/vendor-purchases                           [INV-092]
GET    /api/business/reports/input-tva                                  [INV-093]
GET    /api/business/stock-discrepancy-alerts                           [INV-094]   # v1.1
POST   /api/business/stock-discrepancy-alerts/:id/resolve               [INV-096]   # v1.1
```

## 18.6 `/api/business/*` — Chain, Recommendations, Communications, Admin

```
GET    /api/business/chain/sync-config                                  [CHN-020]
PUT    /api/business/chain/sync-config                                  [CHN-020]
POST   /api/business/chain/sync                                         [CHN-021]
GET    /api/business/chain/sync-jobs/:id                                [CHN-022]
GET    /api/business/chain/unmapped-products                            [CHN-023]
POST   /api/business/chain/pull-product                                 [CHN-024]
GET    /api/business/chain/dashboard                                    [CHN-040]
GET    /api/business/chain/transactions                                 [CHN-041]
GET    /api/business/chain/parent-vendor-info                           [CHN-050]
GET    /api/business/chain/incoming-po-requests                         [CHN-051]
POST   /api/business/chain/incoming-po-requests/:id/fulfill             [CHN-052]
POST   /api/business/users/:id/grant-business-access                    [CHN-012]

GET    /api/business/recommendation-templates                           [REC-001]
POST   /api/business/recommendation-templates                           [REC-002]
PATCH  /api/business/recommendation-templates/:id                       [REC-003]
DELETE /api/business/recommendation-templates/:id                       [REC-004]
PUT    /api/business/recommendation-templates/:id/items                 [REC-005]
GET    /api/business/recommendation-templates/featured                  [REC-020]

GET    /api/business/platform-announcements                             [COM-005]
POST   /api/business/platform-announcements/:id/dismiss                 [COM-006]
GET    /api/business/announcements                                      [COM-010]
POST   /api/business/announcements                                      [COM-010]
PATCH  /api/business/announcements/:id                                  [COM-010]
DELETE /api/business/announcements/:id                                  [COM-010]
GET    /api/business/announcements/for-me                               [COM-011]
GET    /api/business/notifications/channels                             [COM-020]
PUT    /api/business/notifications/channels                             [COM-021]
POST   /api/business/notifications/channels/test                        [COM-022]
POST   /api/business/notifications/sms/refresh-balance                  [COM-030]
GET    /api/business/notifications/sms/balance                          [COM-031]
GET    /api/business/notifications/templates                            [COM-040]
POST   /api/business/notifications/templates                            [COM-041]
PATCH  /api/business/notifications/templates/:id                        [COM-042]
DELETE /api/business/notifications/templates/:id                        [COM-043]
POST   /api/business/notifications/templates/:id/preview                [COM-044]
POST   /api/business/notifications/send                                 [COM-050]
POST   /api/business/notifications/send-to-segment                      [COM-051]
GET    /api/business/notifications/sends                                [COM-052]

GET    /api/business/couriers                                           [ADM-014]
POST   /api/business/couriers/link                                      [ADM-015]
DELETE /api/business/couriers/:courier_id                               [ADM-016]
GET    /api/business/reports/capital-detail                             [ADM-030]
GET    /api/business/settings/settlement-cutoff                         [ADM-060]
PUT    /api/business/settings/settlement-cutoff                         [ADM-061]
```

## 18.7 `/api/terminal/*`

```
GET    /api/terminal/customers/lookup                                   [CUST-100]
POST   /api/terminal/customers/quick-add                                [CUST-101]
POST   /api/terminal/sales/:cart_id/attach-customer                     [CUST-102]
POST   /api/terminal/sales/:cart_id/redeem-points                       [CUST-111]
POST   /api/terminal/sales/:cart_id/evaluate-promotions                 [PROM-020]
POST   /api/terminal/sales/:cart_id/apply-promotion                     [PROM-022]
GET    /api/terminal/coupons/lookup                                     [CPN-030]
POST   /api/terminal/sales/:cart_id/apply-coupon                        [CPN-031]
GET    /api/terminal/tables/floor-plan                                  [RST-030]
POST   /api/terminal/tables/:id/open                                    [RST-031]
POST   /api/terminal/table-sessions/:id/items                           [RST-032]
PATCH  /api/terminal/table-session-items/:id                            [RST-033]
DELETE /api/terminal/table-session-items/:id                            [RST-034]
POST   /api/terminal/table-sessions/:id/close                           [RST-035]
POST   /api/terminal/table-sessions/:id/split                           [RST-036]
POST   /api/terminal/table-session-items/transfer                       [RST-037]
POST   /api/terminal/table-sessions/:id/cancel                          [RST-038]
GET    /api/terminal/recommendation-templates/:id/items                 [REC-010]
```

## 18.8 `/api/auth/*` and `/api/public/*`

```
GET    /api/auth/me/accessible-businesses                               [CHN-010]
POST   /api/auth/switch-business                                        [CHN-011]
GET    /api/auth/trade-categories/tree                                  [ADM-001]
GET    /api/auth/regions/tree                                           [ADM-070]
POST   /api/auth/regions/validate                                       [ADM-071]
GET    /api/auth/version-log/menus                                      [ADM-040]
GET    /api/auth/version-log/entries                                    [ADM-041]

POST   /api/public/notifications/opt-out                                [COM-060]
POST   /api/webhooks/notifications/:provider                            [COM-053]
```

**Total new endpoints:** ~160 across all API surfaces (v1.1 net +5: removed `[CUST-007]` reset-password; added `[XCC-040]` discount-write-off report, `[XCC-055]` job status, `[XCC-056]` dead-letter list, `[XCC-057]` job retry, `[INV-094]` discrepancy alerts list, `[INV-095]` reconciliation job, `[INV-096]` discrepancy alert resolve).

---

# 19. Document Status

This is a **planning specification**, not an implementation guide. It defines:
- Every feature to be added (organised into 10 modules, 150+ requirements)
- Every endpoint with method, path, roles, input, and output
- Every new database table and every column added to existing tables
- The order in which to build (Phases 5–15)
- The legal and technical questions that block go-live

Items deliberately left for the implementation stage:
- Exact NestJS module/service/controller class names
- DTO and validation pipe definitions
- TypeORM entity class definitions (the column lists in Section 13 are the source of truth)
- Frontend page wireframes and component structure
- Test plans (per-phase acceptance criteria are the input to test plans)

**Next step recommendations:**
1. Review this document with stakeholders (legal, ops, marketing) and resolve as many Section 16 open questions as possible.
2. Lock down Phase 5 (TVA Foundation) scope with the engineering team — this is the prerequisite that gates everything else.
3. Start Phase 5 development immediately; it does not depend on any decision in Section 16 because TVA compliance is mandatory regardless of loyalty design.
4. Use the Section 13 schema additions as the migration backlog; one migration per phase, each reversible.
5. Use the Section 18 endpoint catalogue as the API contract for parallel frontend work.

— END OF SPECIFICATION —
