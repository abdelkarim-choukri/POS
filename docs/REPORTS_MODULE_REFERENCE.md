# Reports Module — Complete Build Reference

**For Claude Code. Read this entire file before planning.**

This document defines a unified reports engine for the multi-business POS system. It uses a universal response schema so the frontend renders all reports with a single renderer. Reports cover all 5 business types (Retail, Restaurant, Pharmacy, Salon, Hotel).

---

## 1. ARCHITECTURE DECISION: SINGLE PARAMETRIC ENDPOINT

Instead of one endpoint per report (like the existing 5 reports), all NEW reports go through a single endpoint:

```
GET /api/business/reports/:reportId?type=today&from=&to=
```

This means:
- ONE controller, ONE service dispatcher, ONE response shape
- Frontend builds ONE renderer that handles any report
- Adding a new report = adding one service method, zero controller/route changes
- Export (PDF/Excel) is client-side using the universal schema — zero backend work

### Backward compatibility

The existing 5 report endpoints stay as-is (don't break them):
- `GET /api/business/reports/tva-declaration`
- `GET /api/business/reports/promotions`
- `GET /api/business/reports/coupons`
- `GET /api/business/reports/discount-write-offs`
- `GET /api/business/reports/points-exchange`

They also become accessible via the new universal endpoint using their report IDs (`tva-declaration`, `promotion-report`, `coupon-report`, `discount-write-offs`, `points-exchange-report`). The universal endpoint wraps their existing output into the universal schema.

---

## 2. UNIVERSAL RESPONSE SCHEMA

Every report returns this exact shape:

```json
{
  "title": "Sales Summary",
  "currency": "MAD",
  "language": "fr",
  "business_type": "restaurant",
  "generated_at": "2026-05-11T14:32:00Z",
  "period": {
    "type": "today",
    "from": "2026-05-11",
    "to": "2026-05-11"
  },
  "summary": [
    { "label": "Chiffre d'affaires TTC", "value": 12450.50, "type": "money" },
    { "label": "Commandes",              "value": 184,      "type": "number" },
    { "label": "Panier moyen",           "value": 67.66,    "type": "money" }
  ],
  "tables": [
    {
      "title": "Ventes par jour",
      "columns": [
        { "key": "date",      "label": "Date",      "type": "date" },
        { "key": "orders",    "label": "Commandes",  "type": "number" },
        { "key": "total_ttc", "label": "Total TTC",  "type": "money" },
        { "key": "total_tva", "label": "TVA",        "type": "money" }
      ],
      "rows": [
        { "date": "2026-05-01", "orders": 42, "total_ttc": 1820.00, "total_tva": 91.00 }
      ]
    }
  ],
  "meta": null
}
```

### Field definitions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | Report display title (i18n-aware using receipt-labels.ts pattern) |
| `currency` | string | yes | Always `"MAD"` for Moroccan businesses |
| `language` | string | yes | `"fr"`, `"ar"`, or `"en"` — from user's `language_preference` |
| `business_type` | string | yes | The business's type — lets frontend show/hide type-specific columns |
| `generated_at` | string | yes | ISO 8601 UTC timestamp of when the report was generated. Frontend can show "Report generated at 14:32" and use this for cache invalidation. |
| `period` | object | yes | Echoes back the resolved date range |
| `summary` | array | yes | KPI cards shown above tables (3-7 items) |
| `summary[].label` | string | yes | Card heading |
| `summary[].value` | number or string | yes | Card value |
| `summary[].type` | string | yes | `"money"`, `"number"`, `"text"`, `"percentage"` |
| `tables` | array | yes | One or more data tables (may be empty) |
| `tables[].title` | string | yes | Table heading |
| `tables[].columns` | array | yes | Column definitions |
| `tables[].columns[].key` | string | yes | Field name on row objects |
| `tables[].columns[].label` | string | yes | Display header (i18n-aware) |
| `tables[].columns[].type` | string | yes | `"money"`, `"number"`, `"date"`, `"datetime"`, `"text"`, `"percentage"`, `"quantity"` |
| `tables[].rows` | array | yes | Data rows keyed by `columns[].key` |
| `meta` | object or null | yes | Pagination info for large-table reports (e.g. `invoice-register`). Shape: `{ "total_rows": 1200, "page": 1, "limit": 500 }`. Null for non-paginated reports. Frontend: if `meta` is non-null, show pagination controls. |

### Cell type formatting (frontend reference)

| Type | Backend value | Frontend renders |
|------|--------------|-----------------|
| `money` | `1234.50` | `1 234,50 MAD` |
| `number` | `184` | `184` |
| `quantity` | `2.345` | `2,345` (up to 4 decimals) |
| `percentage` | `20.00` | `20,00%` |
| `date` | `"2026-05-01"` | locale-aware date |
| `datetime` | `"2026-05-01T13:42:00Z"` | locale-aware datetime |
| `text` | `"Cash"` | `Cash` |

---

## 3. DATE FILTER

### Query parameters

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | enum | yes | Date preset (see below) |
| `from` | date string | only for `custom` | `YYYY-MM-DD` |
| `to` | date string | only for `custom` | `YYYY-MM-DD` |

### Type enum

| Value | Range (inclusive, Africa/Casablanca timezone) |
|-------|-----------------------------------------------|
| `today` | Start of today → end of today |
| `yesterday` | Start of yesterday → end of yesterday |
| `last_7days` | Start of (today - 6 days) → end of today |
| `this_month` | Start of current month → end of today |
| `last_month` | Start of previous month → end of previous month |
| `this_year` | Start of current year → end of today |
| `custom` | `from` → `to` (both required) |

### Date resolution service

Create `src/common/utils/date-range.ts`:

```typescript
export function resolveDateRange(
  type: string,
  from?: string,
  to?: string,
  timezone = 'Africa/Casablanca'
): { from: Date; to: Date; fromStr: string; toStr: string }
```

**CRITICAL (XCC-018):** This date range is used for OPERATIONAL reports (sales, payments, operations). TVA reports use calendar dates directly — they have their own date handling already built. Do NOT change the existing TVA declaration report's date logic.

**NOTE on cutoff dates:** The `daily_settlement_cutoff_time` from [ADM-061] is a Phase 15 feature and does NOT exist yet. Currently "operational dates" are simply timezone-converted calendar dates (`AT TIME ZONE 'Africa/Casablanca'`). The TRAP 2 distinction between TVA-calendar and operational dates matters once the cutoff feature ships — the code should be structured so swapping in cutoff-adjusted dates later is trivial, but do NOT implement cutoff logic now.

---

## 4. THE SINGLE ENDPOINT

### API contract

```
GET /api/business/reports/:reportId?type=today&from=&to=
Authorization: Bearer <JWT>
Roles: owner, manager
Scoped: business_id from JWT
```

### Response

`200 OK` — universal schema from section 2.

### Errors

| Status | When |
|--------|------|
| `400` | Invalid `type`, missing `from`/`to` for `custom`, `from > to` |
| `404` | Unknown `reportId` or report not available for this `business_type` |

---

## 5. ALL 26 REPORTS

### Column naming convention for `transaction_items` queries

When aggregating from `transaction_items`, always use:
- `SUM(ti.item_ttc)` — the **post-discount** final TTC per line. Alias as `total_ttc` in results.
- `SUM(ti.item_ht)` — post-discount HT. Alias as `total_ht`.
- `SUM(ti.item_tva)` — post-discount TVA. Alias as `total_tva`.

**NEVER use `ti.line_total`** — that is the legacy pre-discount column (`quantity × unit_price`) and will not reconcile with transaction-level totals.

---

### 5.1 Sales (7 reports) — ALL business types

#### `sales-summary` — Core
KPI overview. The most important report.

**Summary cards:**
- Total TTC (sum of `transactions.total_ttc`)
- Total HT (sum of `transactions.total_ht`)
- Total TVA (sum of `transactions.total_tva`)
- Orders count
- Average order value (total_ttc / orders)
- Customers served (COUNT DISTINCT `transactions.customer_id` WHERE NOT NULL)
- Total discounts (sum of `transactions.discount_total`)

**Table 1: "Sales by Day"**
```
columns: date, orders, total_ttc, total_ht, total_tva, avg_order_value, discount_total
source: transactions GROUP BY DATE(created_at AT TIME ZONE 'Africa/Casablanca')
filter: business_id, status = 'completed', date range
```

**Table 2: "Top Products"** (top 10)
```
columns: product_name, category_name, quantity_sold, total_ttc
source: transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        JOIN products p ON p.id = ti.product_id
        JOIN categories c ON c.id = p.category_id
        WHERE t.business_id = $1 AND t.status = 'completed' AND date range
        GROUP BY ti.product_id, p.name, c.name
        ORDER BY SUM(ti.item_ttc) DESC LIMIT 10
  NOTE: Use SUM(ti.item_ttc) for total_ttc — NOT ti.line_total (legacy pre-discount).
        SUM(ti.quantity) for quantity_sold.
```

---

#### `sales-by-hour` — High
Rush hour analysis.

**Summary cards:**
- Peak hour (hour with highest revenue)
- Peak revenue (that hour's total_ttc)
- Quietest hour
- Orders in period

**Table: "Hourly Breakdown"**
```
columns: hour (0-23), orders, total_ttc, avg_order_value
source: transactions GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Africa/Casablanca')
        ORDER BY hour ASC
```

---

#### `sales-by-day` — High
Daily trend with day-of-week pattern.

**Summary cards:**
- Total TTC, Orders, Avg order value, Best day (by revenue)

**Table: "Daily Sales"**
```
columns: date, day_of_week, orders, total_ttc, total_ht, total_tva, avg_order_value
source: transactions GROUP BY DATE(created_at AT TIME ZONE 'Africa/Casablanca')
```

---

#### `sales-by-month` — High
Monthly trend for owner review.

**Summary cards:**
- Total TTC, Orders, Avg monthly revenue

**Table: "Monthly Sales"**
```
columns: month (YYYY-MM), orders, total_ttc, total_ht, total_tva, avg_order_value
source: transactions GROUP BY TO_CHAR(created_at AT TIME ZONE 'Africa/Casablanca', 'YYYY-MM')
```

---

#### `sales-by-category` — Core
Category performance.

**Summary cards:**
- Total TTC, Categories with sales, Top category

**Table: "Category Performance"**
```
columns: category_name, items_sold, total_ttc, percentage_of_total
source: transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        JOIN products p ON p.id = ti.product_id
        JOIN categories c ON c.id = p.category_id
        WHERE t.business_id = $1 AND t.status = 'completed' AND date range
        GROUP BY p.category_id, c.name
        ORDER BY SUM(ti.item_ttc) DESC
  NOTE: Use SUM(ti.item_ttc) for total_ttc, SUM(ti.quantity) for items_sold.
        percentage_of_total = bankersRound(category_ttc / grand_total * 100).
```

---

#### `sales-by-product` — Core
Product-level detail.

**Summary cards:**
- Total products sold, Total TTC, Unique products

**Table: "Product Sales"**
```
columns: product_name, category_name, quantity_sold, total_ttc, avg_unit_price
source: transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        JOIN products p ON p.id = ti.product_id
        JOIN categories c ON c.id = p.category_id
        WHERE t.business_id = $1 AND t.status = 'completed' AND date range
        GROUP BY ti.product_id, p.name, c.name
        ORDER BY SUM(ti.item_ttc) DESC
  NOTE: Use SUM(ti.item_ttc) for total_ttc.
        avg_unit_price = bankersRound(AVG(ti.unit_price)) — this is the pre-discount
        menu price, which is the useful metric for product-level analysis. Do NOT use
        item_ttc / quantity (that would be post-discount average).
```

---

#### `sales-by-table` — High (Restaurant + Hotel ONLY)
Table revenue analysis. Return 404 for non-restaurant/hotel businesses.

**Summary cards:**
- Total table revenue, Total sessions, Avg revenue per table, Avg session duration

**Table: "Table Performance"**
```
columns: table_number, area_name, sessions_count, total_ttc, avg_per_session, avg_duration_minutes
source: transactions t
        JOIN table_sessions ts ON t.table_session_id = ts.id
        JOIN tables tbl ON ts.table_id = tbl.id
        JOIN dining_areas da ON tbl.area_id = da.id
        WHERE t.business_id = $1 AND t.status = 'completed'
          AND t.table_session_id IS NOT NULL AND date range
        GROUP BY tbl.id, tbl.table_number, da.name
  NOTE: total_ttc comes from SUM(t.total_ttc) on transactions, NOT from table_sessions
        (which has no money columns). For split bills, multiple transactions share one
        table_session_id — this query correctly sums all splits.
        avg_duration_minutes: requires a subquery or CTE on table_sessions to get
        AVG(EXTRACT(EPOCH FROM (ts.closed_at - ts.opened_at)) / 60) per table.
```

**NOTE on Hotel:** Hotel businesses are assumed to have dining_areas/tables configured if they use table service. If none exist, query returns empty rows (fine per TRAP 5).

---

### 5.2 Payments (3 reports) — ALL business types

#### `payment-summary` — Core
Revenue by payment method.

**Summary cards:**
- Total collected, Transaction count, Payment methods used

**Table: "By Payment Method"**
```
columns: payment_method, transaction_count, total_ttc, percentage_of_total
source: transactions GROUP BY payment_method ORDER BY total_ttc DESC
```

---

#### `cash-report` — High
Cash-only daily breakdown.

**Summary cards:**
- Cash total, Cash transactions, Cash share of total (%)

**Table: "Cash by Date"**
```
columns: date, total_ttc, transaction_count
source: transactions WHERE payment_method = 'cash'
        GROUP BY DATE(created_at AT TIME ZONE 'Africa/Casablanca')
```

---

#### `card-report` — High
Card-only daily breakdown.

**Summary cards:**
- Card total, Card transactions, Card share of total (%)

**Table: "Card by Date"**
```
columns: date, total_ttc, transaction_count
source: transactions WHERE payment_method IN ('card_cmi', 'card_payzone')
        GROUP BY DATE(created_at AT TIME ZONE 'Africa/Casablanca')
```

---

### 5.3 Customers & Loyalty (4 reports) — ALL business types

#### `customer-summary` — Core
Customer overview.

**Summary cards:**
- Total customers (active): `COUNT(*) FROM customers WHERE business_id = $1 AND is_active = true` (NOT date-filtered)
- New in period: customers with `created_at` in date range
- Returning in period: customers with ≥2 transactions in the date range (requires subquery)
- Total points issued: `SUM(delta) FROM customer_points_history WHERE delta > 0` in date range

**Table: "Customer Activity"**
```
columns: date, new_customers, transactions_with_customer, points_earned
source:
  new_customers: COUNT(*) FROM customers WHERE DATE(created_at AT TIME ZONE 'Africa/Casablanca') = date
  transactions_with_customer: COUNT(*) FROM transactions WHERE customer_id IS NOT NULL AND date match
  points_earned: SUM(delta) FROM customer_points_history WHERE delta > 0 AND date match
  GROUP BY DATE(... AT TIME ZONE 'Africa/Casablanca')
  NOTE: "transactions_with_customer" is the count of transactions that had a customer attached
        for that day — this is different from the "returning" summary card (which is a period aggregate).
```

---

#### `top-customers` — High
Best customers by spend.

**Summary cards:**
- Total customer revenue, Avg spend per customer

**Table: "Top 50 Customers"**
```
columns: customer_code, name, phone, grade_name, visit_count, total_spent, avg_per_visit, points_balance
source: transactions JOIN customers LEFT JOIN customer_grades
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id ORDER BY total_spent DESC LIMIT 50
```

---

#### `customer-grades` — Medium
Grade distribution and performance.

**Summary cards:**
- Total graded customers, Ungraded customers, Avg spend per grade

**Table: "Grade Performance"**
```
columns: grade_name, customer_count, total_spent, avg_per_customer, avg_points_balance
source: customers LEFT JOIN customer_grades LEFT JOIN (transactions GROUP BY customer_id)
        GROUP BY grade_id
```

---

#### `loyalty-summary` — Medium
Points economy overview.

**Summary cards:**
- Total points issued (period): `SUM(delta) FROM customer_points_history WHERE delta > 0` in date range
- Total points redeemed (period): `SUM(ABS(delta)) FROM customer_points_history WHERE delta < 0 AND source IN ('sale', 'coupon_purchase')` in date range
- Net points issued: issued − redeemed
- Total outstanding balance: `SUM(points_balance) FROM customers WHERE business_id = $1 AND is_active = true` — **this is a live snapshot, NOT date-filtered** (it always shows the current total liability regardless of the selected period)

**Table: "Points Activity by Day"**
```
columns: date, points_earned, points_redeemed, points_adjusted, net_change
source: customer_points_history GROUP BY DATE(created_at AT TIME ZONE 'Africa/Casablanca')
  points_earned: SUM(delta) WHERE delta > 0 AND source = 'sale'
  points_redeemed: SUM(ABS(delta)) WHERE delta < 0 AND source IN ('sale', 'coupon_purchase')
  points_adjusted: SUM(delta) WHERE source = 'manual_adjustment'
  net_change: SUM(delta) (all sources)
```

---

### 5.4 Operations (4 reports)

#### `employee-performance` — High (ALL business types)
Staff sales performance.

**Summary cards:**
- Total employees active, Top performer, Orders processed

**Table: "Employee Sales"**
```
columns: employee_name, transactions_count, total_ttc, avg_order_value, voids_count
source: transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN (
          SELECT voided_by, COUNT(*) AS void_count
          FROM voids
          WHERE voided_at BETWEEN $2 AND $3
          GROUP BY voided_by
        ) v ON v.voided_by = u.id
        WHERE t.business_id = $1 AND t.status = 'completed' AND date range
        GROUP BY u.id, u.name
        ORDER BY SUM(t.total_ttc) DESC
  NOTE: voids_count comes from the voids table via voided_by (the user who performed the void),
        NOT from the transaction's user_id. A void may be performed by a different user (manager)
        than the one who created the original transaction.
```

---

#### `kitchen-performance` — High (Restaurant ONLY)
KDS metrics. Return 404 for non-restaurant.

**Summary cards:**
- Items prepared, Items cancelled, Avg prep time (if trackable)

**Table: "Kitchen Items by Status"**
```
columns: date, items_new, items_preparing, items_ready, items_served, items_cancelled
source: table_session_items tsi
        WHERE tsi.business_id = $1 AND date range
        GROUP BY DATE(tsi.added_at AT TIME ZONE 'Africa/Casablanca')
  NOTE: Filter by tsi.business_id (not via JOIN to transactions — table_session_items
        is a pre-payment table and may not have a linked transaction yet).
        Use conditional aggregation:
          SUM(CASE WHEN kds_status = 'new' THEN quantity ELSE 0 END) AS items_new
          SUM(CASE WHEN kds_status = 'cancelled' THEN quantity ELSE 0 END) AS items_cancelled
          etc.
```

---

#### `table-turnover` — Medium (Restaurant ONLY)
Table utilization. Return 404 for non-restaurant.

**Summary cards:**
- Total sessions, Avg duration, Avg covers, Revenue per cover

**Table: "Table Utilization"**
```
columns: table_number, area_name, sessions_count, avg_duration_minutes, avg_guest_count, total_ttc, revenue_per_cover
source: table_sessions ts
        JOIN tables tbl ON ts.table_id = tbl.id
        JOIN dining_areas da ON tbl.area_id = da.id
        LEFT JOIN (
          SELECT table_session_id, SUM(total_ttc) AS session_ttc
          FROM transactions
          WHERE business_id = $1 AND status = 'completed'
          GROUP BY table_session_id
        ) txn ON txn.table_session_id = ts.id
        WHERE ts.business_id = $1 AND ts.status = 'paid' AND date range
        GROUP BY tbl.id, tbl.table_number, da.name
  NOTE: total_ttc comes from SUM(txn.session_ttc) — table_sessions has NO money columns.
        For split bills, the subquery already aggregates all transactions per session.
        avg_duration_minutes = AVG(EXTRACT(EPOCH FROM (ts.closed_at - ts.opened_at)) / 60).
        revenue_per_cover = bankersRound(total_ttc / NULLIF(SUM(ts.guest_count), 0)).
```

---

#### `voids-cancellations` — High (ALL business types)
Track waste and losses.

**Summary cards:**
- Total voided transactions, Voided amount, Cancelled table sessions (restaurant only)

**Table 1: "Voided Transactions"**
```
columns: date, transaction_number, employee_name, total_ttc, reason
source: voids v
        JOIN transactions t ON v.transaction_id = t.id
        JOIN users u ON v.voided_by = u.id
        WHERE t.business_id = $1 AND date range on v.voided_at
  NOTE: employee_name is the user who voided (v.voided_by), not who created the transaction.
```

**Table 2: "Cancelled Table Sessions"** (restaurant only, omit for other types)
```
columns: date, table_number, opened_by_name, items_count
source: table_sessions ts
        JOIN tables tbl ON ts.table_id = tbl.id
        JOIN users u ON ts.opened_by_user_id = u.id
        WHERE ts.business_id = $1 AND ts.status = 'cancelled' AND date range on ts.closed_at
  NOTE: The cancel reason is logged to audit_logs (not stored on table_sessions).
        opened_by_name is the server who opened the table, not necessarily who cancelled it.
        To show the canceller, join audit_logs WHERE action = 'table_session_cancel'.
        items_count = (SELECT COUNT(*) FROM table_session_items WHERE table_session_id = ts.id).
        If audit_logs is not yet implemented (currently stub), omit the reason column for now
        and add it when audit_logs are wired to DB.
```

---

### 5.5 TVA & Accounting (4 reports) — ALL business types

#### `tva-declaration` — Core (ALREADY EXISTS)
**Wraps the existing `business.service.ts → getTvaDeclaration()` output into universal schema.**

**Summary cards:**
- Total HT, Total TVA, Total TTC, Transaction count

**Table: "TVA by Rate Band"**
```
columns: tva_rate, total_ht, total_tva, total_ttc, transaction_count
source: EXISTING query from business.service.ts (aggregates transaction_items, calendar date per XCC-018)
```

**IMPORTANT:** Do NOT change the existing date logic. TVA uses calendar dates (XCC-018), not operational cutoff dates. The wrapper just reformats the existing output.

---

#### `daily-close` — Core
End-of-day snapshot. The Z-report equivalent.

**Summary cards:**
- Day's total TTC, Day's total TVA, Transaction count, Cash collected, Card collected

**Table: "Day Summary"**
```
columns: metric, value
rows (fixed structure, all from transactions WHERE business_id = $1 AND status = 'completed'
      AND DATE(created_at AT TIME ZONE 'Africa/Casablanca') = target_day):

  - Gross TTC:       SUM(t.total_ttc) + SUM(t.discount_total)
                      (reconstructed pre-discount total using already-rounded pipeline outputs)
  - Total discounts:  SUM(t.discount_total)
  - Net TTC:          SUM(t.total_ttc)
  - Total HT:         SUM(t.total_ht)
  - Total TVA:        SUM(t.total_tva)
  - Cash payments:    SUM(t.total_ttc) WHERE payment_method = 'cash'
  - Card payments:    SUM(t.total_ttc) WHERE payment_method IN ('card_cmi', 'card_payzone')
  - Transaction count: COUNT(*)
  - Void count:       COUNT(*) FROM voids v JOIN transactions t2 ON v.transaction_id = t2.id
                      WHERE t2.business_id = $1 AND DATE(v.voided_at AT TIME ZONE ...) = target_day
  - Points earned:    SUM(t.points_earned)     (from transactions, not customer_points_history)
  - Points redeemed:  SUM(t.points_redeemed)   (from transactions, not customer_points_history)
  - Coupons redeemed: COUNT(*) FROM coupon_redemptions cr
                      JOIN transactions t3 ON cr.transaction_id = t3.id
                      WHERE t3.business_id = $1
                        AND DATE(cr.redeemed_at AT TIME ZONE 'Africa/Casablanca') = target_day
```
This is NOT a date-range report — it always runs for a single day. When `type=today`, show today. When `type=yesterday`, show yesterday. For `custom`, use `from` date only (ignore `to`).

---

#### `invoice-register` — Core
Chronological invoice list for accounting.

**Summary cards:**
- Total invoices, Total TTC, Total TVA

**Table: "Invoice Register"**
```
columns: invoice_number, date, customer_name, payment_method, total_ht, total_tva, total_ttc, employee_name
source: transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        JOIN users u ON t.user_id = u.id
        WHERE t.business_id = $1 AND t.status = 'completed' AND date range
        ORDER BY t.created_at ASC
```

**NOTE:** This table can be large. Paginate server-side: max 500 rows. Add `page` and `limit` query params. Return pagination info in the `meta` field of the universal schema: `"meta": { "total_rows": 1200, "page": 1, "limit": 500 }`. For all other reports, `meta` is `null`.

---

#### `tva-by-rate` — Medium
TVA analysis broken down by rate over time.

**Summary cards:**
- Total TVA collected, Weighted average TVA rate

**Table: "TVA by Rate and Day"**
```
columns: date, tva_rate_20_ht, tva_rate_20_tva, tva_rate_10_ht, tva_rate_10_tva, tva_rate_7_ht, tva_rate_7_tva, tva_rate_0_ht
source: transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        WHERE t.business_id = $1 AND t.status = 'completed' AND calendar date range
        GROUP BY DATE(t.created_at AT TIME ZONE 'Africa/Casablanca')
        PIVOT by ti.tva_rate using conditional aggregation:
          SUM(CASE WHEN ti.tva_rate = 20 THEN ti.item_ht ELSE 0 END) AS tva_rate_20_ht
          SUM(CASE WHEN ti.tva_rate = 20 THEN ti.item_tva ELSE 0 END) AS tva_rate_20_tva
          etc.

  CRITICAL: Uses calendar date per XCC-018 — same as tva-declaration.
            Date comes from t.created_at (transactions table), NOT ti.created_at
            (transaction_items uses plain TIMESTAMP without timezone).
            This ensures tva-by-rate and tva-declaration agree on which day
            each transaction falls in — a DGI audit requirement.
```

---

### 5.6 Promotions & Discounts (4 reports — ALL ALREADY EXIST)

These wrap existing report outputs into the universal schema. The existing endpoints remain unchanged.

#### `promotion-report` — Core (wraps existing)
**Source:** `promotionService.promotionReport()`

**Summary cards:**
- Total promotions active, Total redemptions, Total discount given

**Table: "Promotion Performance"**
```
columns: promotion_name, type, redemption_count, total_discount_given, avg_discount_per_use
source: existing promotion report query
```

---

#### `coupon-report` — Core (wraps existing)
**Source:** `couponExtService.couponReport()`

**Summary cards:**
- Total issued, Total redeemed, Redemption rate, Total discount given

**Table: "Coupon Type Breakdown"**
```
columns: coupon_type_name, issued, redeemed, expired, voided, discount_given, redemption_rate
source: existing coupon report query
```

---

#### `discount-write-offs` — Medium (wraps existing)
**Source:** `couponExtService.discountWriteOffReport()`

**Summary cards:**
- Total write-offs, Total amount

**Table: "Write-offs by Terminal"**
```
columns: terminal_id, count, total_written_off_amount
source: existing write-off report query
```

---

#### `points-exchange-report` — Medium (wraps existing)
**Source:** `pointsExchangeService.report()`

**Summary cards:**
- Total redemptions, Total points spent, Unique customers

**Table: "Exchange Activity"**
```
columns: rule_name, redemption_count, points_spent, items_issued
source: existing points exchange report query
```

---

## 6. REPORT AVAILABILITY BY BUSINESS TYPE

| Report ID | Retail | Restaurant | Pharmacy | Salon | Hotel |
|-----------|--------|------------|----------|-------|-------|
| `sales-summary` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sales-by-hour` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sales-by-day` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sales-by-month` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sales-by-category` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sales-by-product` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sales-by-table` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `payment-summary` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `cash-report` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `card-report` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `customer-summary` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `top-customers` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `customer-grades` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `loyalty-summary` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `employee-performance` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `kitchen-performance` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `table-turnover` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `voids-cancellations` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tva-declaration` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `daily-close` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `invoice-register` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tva-by-rate` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `promotion-report` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `coupon-report` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `discount-write-offs` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `points-exchange-report` | ✅ | ✅ | ✅ | ✅ | ✅ |

If a report is ❌ for a business type and is requested, return 404 with `{ "error": "REPORT_NOT_AVAILABLE", "message": "This report is not available for your business type" }`.

**NOTE on Hotel + table reports:** Hotel businesses may or may not have dining areas and tables configured. If none exist, `sales-by-table` and `table-turnover` return empty rows with zero-value summary cards (per TRAP 5) — NOT a 404.

---

## 7. i18n FOR REPORT LABELS

Extend the existing `src/common/i18n/receipt-labels.ts` with report labels:

```typescript
export const REPORT_LABELS = {
  fr: {
    total_ttc: 'Total TTC',
    total_ht: 'Total HT',
    total_tva: 'TVA',
    orders: 'Commandes',
    avg_order_value: 'Panier moyen',
    customers: 'Clients',
    date: 'Date',
    product_name: 'Produit',
    category_name: 'Catégorie',
    quantity_sold: 'Qté vendue',
    payment_method: 'Mode de paiement',
    transaction_count: 'Transactions',
    employee_name: 'Employé',
    invoice_number: 'N° facture',
    discount_total: 'Remises',
    points_earned: 'Points gagnés',
    points_redeemed: 'Points utilisés',
    // ... extend as needed
  },
  ar: {
    total_ttc: 'المجموع الكلي',
    total_ht: 'المجموع قبل الضريبة',
    total_tva: 'الضريبة',
    orders: 'الطلبات',
    avg_order_value: 'متوسط الطلب',
    customers: 'العملاء',
    date: 'التاريخ',
    product_name: 'المنتج',
    category_name: 'الفئة',
    quantity_sold: 'الكمية المباعة',
    payment_method: 'طريقة الدفع',
    transaction_count: 'المعاملات',
    employee_name: 'الموظف',
    invoice_number: 'رقم الفاتورة',
    discount_total: 'الخصومات',
    points_earned: 'النقاط المكتسبة',
    points_redeemed: 'النقاط المستخدمة',
  },
  en: {
    total_ttc: 'Total (incl. tax)',
    total_ht: 'Total (excl. tax)',
    total_tva: 'VAT',
    orders: 'Orders',
    avg_order_value: 'Avg Order Value',
    customers: 'Customers',
    date: 'Date',
    product_name: 'Product',
    category_name: 'Category',
    quantity_sold: 'Qty Sold',
    payment_method: 'Payment Method',
    transaction_count: 'Transactions',
    employee_name: 'Employee',
    invoice_number: 'Invoice #',
    discount_total: 'Discounts',
    points_earned: 'Points Earned',
    points_redeemed: 'Points Redeemed',
  }
};
```

The report service reads `user.language_preference` from JWT and uses the appropriate label set for all `label` fields in summary and table columns.

---

## 8. IMPLEMENTATION PLAN

### Part A — Infrastructure + Sales Reports (reports 1-7)
- `src/modules/reports/reports.module.ts`
- `src/modules/reports/reports.controller.ts` — single `GET :reportId` route
- `src/modules/reports/reports.service.ts` — dispatcher: validates reportId, resolves date range, calls per-report method
- `src/modules/reports/dto/report-query.dto.ts` — type, from, to validation
- `src/common/utils/date-range.ts` — resolveDateRange utility
- `src/common/i18n/report-labels.ts` — labels for fr/ar/en
- `src/modules/reports/generators/sales.generator.ts` — 7 sales report methods
- Register in `app.module.ts`
- Unit tests: sales-summary happy path, date range resolution, business-type gating (sales-by-table 404 for retail)

### Part B — Payments + Customers + Operations Reports (reports 8-18)
- `src/modules/reports/generators/payments.generator.ts` — 3 payment reports
- `src/modules/reports/generators/customers.generator.ts` — 4 customer reports
- `src/modules/reports/generators/operations.generator.ts` — 4 operations reports
- Unit tests: payment-summary, top-customers, kitchen-performance 404 for retail

### Part C — TVA/Accounting + Existing Report Wrappers + Closeout (reports 19-26)
- `src/modules/reports/generators/accounting.generator.ts` — 4 accounting reports
- `src/modules/reports/generators/existing-wrappers.generator.ts` — wraps 4 existing reports
- Daily-close report (special: single-day, not range)
- Invoice-register pagination (page/limit params)
- Update CLAUDE.md
- Curl test: hit universal endpoint for 3 different reportIds, verify schema

---

## 9. FILES TO CREATE

```
src/common/utils/date-range.ts
src/common/i18n/report-labels.ts
src/modules/reports/reports.module.ts
src/modules/reports/reports.controller.ts
src/modules/reports/reports.service.ts
src/modules/reports/dto/report-query.dto.ts
src/modules/reports/generators/sales.generator.ts
src/modules/reports/generators/payments.generator.ts
src/modules/reports/generators/customers.generator.ts
src/modules/reports/generators/operations.generator.ts
src/modules/reports/generators/accounting.generator.ts
src/modules/reports/generators/existing-wrappers.generator.ts
src/modules/reports/reports.service.spec.ts
```

---

## 10. TRAPS AND RULES

### TRAP 1: Don't break existing report endpoints
The 5 existing reports at `/api/business/reports/*` MUST continue to work with their current response shape. The universal endpoint wraps them — it doesn't replace them.

### TRAP 2: TVA date handling
TVA reports (`tva-declaration`, `tva-by-rate`) use **calendar dates** per XCC-018: `DATE(t.created_at AT TIME ZONE 'Africa/Casablanca')`. All other reports also currently use timezone-converted calendar dates, but the distinction matters once `daily_settlement_cutoff_time` (ADM-061, Phase 15) is implemented — operational reports will then use cutoff-adjusted dates while TVA reports stay on calendar dates. Structure code so the date source is injectable per report.

### TRAP 3: Business type gating
Restaurant-only reports (sales-by-table, kitchen-performance, table-turnover) must return 404 for non-restaurant businesses (and non-hotel where applicable). Fetch `business.type` from the JWT or DB and gate.

### TRAP 4: Money precision
All money values are `NUMERIC(12,2)` with banker's rounding. Use `bankersRound()` from `money.ts` for any computed values (percentages, averages).

### TRAP 5: Empty data
Reports for periods with no transactions should return the universal schema with empty `rows` arrays and zero-value summary cards — NOT a 404 or empty response.

### TRAP 6: Daily-close is not a range report
It's always a single day. Ignore `to` date. When `type=this_month`, show today's close. The owner uses date-range reports for trends and daily-close for end-of-day reconciliation.

### TRAP 7: transaction_items column naming
The money columns on `transaction_items` are: `item_ht`, `item_tva`, `item_ttc` (post-discount), `discount_amount`, and `unit_price` (pre-discount per unit). The legacy `line_total` column (`quantity × unit_price`, pre-discount) must NEVER be used for reports — it will not reconcile with transaction-level totals. Always use `item_ttc`.

### TRAP 8: tva-by-rate must use transactions.created_at for dates
`transaction_items.created_at` is a plain `TIMESTAMP` (no timezone), while `transactions.created_at` is also plain TIMESTAMP but the existing TVA declaration query uses `t.created_at AT TIME ZONE 'Africa/Casablanca'`. The `tva-by-rate` report MUST join to transactions and use `t.created_at` for its date grouping — never `ti.created_at` — to ensure it agrees with `tva-declaration` for the same period.

### RULE 1: Multi-tenancy
Every query scopes by `business_id` from JWT. Cross-tenant = 404.

### RULE 2: Currency is always MAD
Hard-code `"MAD"` in the response. Morocco only. If multi-currency is needed later, it's a one-line change per report.

### RULE 3: All money values use bankersRound
Any computed money value (avg_order_value, percentage_of_total) must use `bankersRound()` to 2 decimals.

### RULE 4: No export endpoints
Exports are client-side (frontend reads the universal schema and builds PDF/Excel). Zero backend work for exports.

---

## 11. WHAT IS OUT OF SCOPE

- Inventory reports (Phase 11+12 — no inventory data yet)
- Reservation reports (no reservation system)
- Feedback reports (no feedback system)
- QR order reports (QR ordering deferred)
- Service charge reports (not in the data model)
- Superadmin cross-tenant analytics (Phase 15)
- Server-side PDF/Excel export (client-side only)
