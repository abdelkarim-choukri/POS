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
  ]
}
```

### Field definitions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | Report display title (i18n-aware using receipt-labels.ts pattern) |
| `currency` | string | yes | Always `"MAD"` for Moroccan businesses |
| `language` | string | yes | `"fr"`, `"ar"`, or `"en"` — from user's `language_preference` |
| `business_type` | string | yes | The business's type — lets frontend show/hide type-specific columns |
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
source: transaction_items JOIN products JOIN categories
       GROUP BY product_id ORDER BY total_ttc DESC LIMIT 10
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
source: transaction_items JOIN products JOIN categories
        GROUP BY category_id ORDER BY total_ttc DESC
```

---

#### `sales-by-product` — Core
Product-level detail.

**Summary cards:**
- Total products sold, Total TTC, Unique products

**Table: "Product Sales"**
```
columns: product_name, category_name, quantity_sold, total_ttc, avg_unit_price
source: transaction_items JOIN products JOIN categories
        GROUP BY product_id ORDER BY total_ttc DESC
```

---

#### `sales-by-table` — High (Restaurant ONLY)
Table revenue analysis. Return 404 for non-restaurant businesses.

**Summary cards:**
- Total table revenue, Total sessions, Avg revenue per table, Avg session duration

**Table: "Table Performance"**
```
columns: table_number, area_name, sessions_count, total_ttc, avg_per_session, avg_duration_minutes
source: transactions JOIN table_sessions JOIN tables JOIN dining_areas
        WHERE table_session_id IS NOT NULL
        GROUP BY table_id
```

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
- Total customers (active), New in period, Returning in period (customers with 2+ transactions), Total points issued

**Table: "Customer Activity"**
```
columns: date, new_customers, transactions_with_customer, points_earned
source: customers for new, transactions for activity
        GROUP BY DATE(created_at AT TIME ZONE 'Africa/Casablanca')
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
- Total points issued (period), Total points redeemed (period), Net points issued, Total outstanding balance

**Table: "Points Activity by Day"**
```
columns: date, points_earned, points_redeemed, points_adjusted, net_change
source: customer_points_history GROUP BY DATE(created_at AT TIME ZONE 'Africa/Casablanca')
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
source: transactions JOIN users ON transactions.user_id = users.id
        GROUP BY user_id ORDER BY total_ttc DESC
```

---

#### `kitchen-performance` — High (Restaurant ONLY)
KDS metrics. Return 404 for non-restaurant.

**Summary cards:**
- Items prepared, Items cancelled, Avg prep time (if trackable)

**Table: "Kitchen Items by Status"**
```
columns: date, items_new, items_preparing, items_ready, items_served, items_cancelled
source: table_session_items
        GROUP BY DATE(added_at AT TIME ZONE 'Africa/Casablanca')
```

---

#### `table-turnover` — Medium (Restaurant ONLY)
Table utilization. Return 404 for non-restaurant.

**Summary cards:**
- Total sessions, Avg duration, Avg covers, Revenue per cover

**Table: "Table Utilization"**
```
columns: table_number, area_name, sessions_count, avg_duration_minutes, avg_guest_count, total_ttc, revenue_per_cover
source: table_sessions JOIN tables JOIN dining_areas
        WHERE status = 'paid'
        GROUP BY table_id
```

---

#### `voids-cancellations` — High (ALL business types)
Track waste and losses.

**Summary cards:**
- Total voided transactions, Voided amount, Cancelled table sessions (restaurant only)

**Table 1: "Voided Transactions"**
```
columns: date, transaction_number, employee_name, total_ttc, reason
source: voids JOIN transactions JOIN users
```

**Table 2: "Cancelled Table Sessions"** (restaurant only, omit for other types)
```
columns: date, table_number, employee_name, items_count, reason
source: table_sessions WHERE status = 'cancelled' JOIN tables JOIN users
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
rows (fixed structure):
  - Gross TTC
  - Total discounts
  - Net TTC (= total_ttc)
  - Total HT
  - Total TVA
  - Cash payments
  - Card payments (CMI + Payzone)
  - Transaction count
  - Void count
  - Points earned
  - Points redeemed
  - Coupons redeemed
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
source: transactions WHERE status = 'completed'
        ORDER BY created_at ASC
```

**NOTE:** This table can be large. Paginate server-side: max 500 rows. Add `page` and `limit` query params. Return `meta: { total_rows, page, limit }` in the response.

---

#### `tva-by-rate` — Medium
TVA analysis broken down by rate over time.

**Summary cards:**
- Total TVA collected, Weighted average TVA rate

**Table: "TVA by Rate and Day"**
```
columns: date, tva_rate_20_ht, tva_rate_20_tva, tva_rate_10_ht, tva_rate_10_tva, tva_rate_7_ht, tva_rate_7_tva, tva_rate_0_ht
source: transaction_items GROUP BY DATE(created_at), pivot by tva_rate
        Uses calendar date per XCC-018
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
TVA reports use calendar dates per XCC-018. All other reports use operational dates (Africa/Casablanca timezone). These are different things — don't unify them.

### TRAP 3: Business type gating
Restaurant-only reports (sales-by-table, kitchen-performance, table-turnover) must return 404 for non-restaurant businesses. Fetch `business.type` from the JWT or DB and gate.

### TRAP 4: Money precision
All money values are `NUMERIC(12,2)` with banker's rounding. Use `bankersRound()` from `money.ts` for any computed values (percentages, averages).

### TRAP 5: Empty data
Reports for periods with no transactions should return the universal schema with empty `rows` arrays and zero-value summary cards — NOT a 404 or empty response.

### TRAP 6: Daily-close is not a range report
It's always a single day. Ignore `to` date. When `type=this_month`, show today's close. The owner uses date-range reports for trends and daily-close for end-of-day reconciliation.

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
