# Phase 12D: COGS, Vendor Balance & Bill Aging Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new inventory reports — COGS, Vendor Balance, and Bill Aging — to the existing ReportsModule with zero new migrations.

**Architecture:** Three new generator methods added to `InventoryReportsGenerator`, registered in `ReportsService` dispatcher. One optional query param (`as_of_date`) added to `ReportQueryDto`. All data sources (stock_batches, stock_movements, vendor_payments, purchase_orders, vendors) already exist from Phase 12A/12C.

**Tech Stack:** NestJS, TypeORM raw SQL via `DataSource.query()`, `UniversalReportResponse` schema, Jest unit tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/backend/src/modules/reports/dto/report-query.dto.ts` | Modify | Add `as_of_date` optional param |
| `apps/backend/src/modules/reports/generators/inventory-reports.generator.ts` | Modify | Add `cogs()`, `vendorBalance()`, `billAging()` |
| `apps/backend/src/modules/reports/reports.service.ts` | Modify | Register 3 new IDs in `ALL_REPORT_IDS`, add 3 switch cases |
| `apps/backend/src/modules/reports/reports.service.spec.ts` | Modify | 4 new tests (3 report tests + 1 smoke test for new IDs) |
| `CLAUDE.md` | Modify | Update test count and phase status |
| `docs/IMPLEMENTATION_LOG.md` | Modify | Add Phase 12D DONE entry |

---

## Task 1: Add `as_of_date` to ReportQueryDto

**Files:**
- Modify: `apps/backend/src/modules/reports/dto/report-query.dto.ts`

- [ ] **Step 1: Add `as_of_date` field**

Open `apps/backend/src/modules/reports/dto/report-query.dto.ts`. After the `low_stock_only` line (line 35), add:

```typescript
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'as_of_date must be YYYY-MM-DD' })
  as_of_date?: string;
```

The full updated block at the bottom of the class (lines 30–37) becomes:

```typescript
  // Inventory-specific optional filters (INV-090-093)
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsUUID() product_id?: string;
  @IsOptional() @IsUUID() category_id?: string;
  @IsOptional() @IsUUID() vendor_id?: string;
  @IsOptional() @IsIn(['receive', 'sale', 'adjustment', 'waste', 'expiry_disposal', 'transfer_in', 'transfer_out']) movement_type?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() low_stock_only?: boolean;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'as_of_date must be YYYY-MM-DD' })
  as_of_date?: string;
```

- [ ] **Step 2: Run existing tests to confirm no regression**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="reports.service.spec"
```

Expected: all existing tests PASS (39 suites, 527 tests).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/reports/dto/report-query.dto.ts
git commit -m "phase-12d: add as_of_date param to ReportQueryDto"
```

---

## Task 2: COGS Report (TDD)

**Files:**
- Modify: `apps/backend/src/modules/reports/reports.service.spec.ts`
- Modify: `apps/backend/src/modules/reports/generators/inventory-reports.generator.ts`
- Modify: `apps/backend/src/modules/reports/reports.service.ts`

### Step-by-step

- [ ] **Step 1: Write the failing test**

In `apps/backend/src/modules/reports/reports.service.spec.ts`, after the last `describe('Inventory Reports', ...)` block (after line 762), add a new describe block:

```typescript
// ─── Phase 12D Reports (INV-094, INV-095, INV-096) ─────────────────────────

describe('Phase 12D Reports', () => {
  it('cogs returns title, summary with total_cogs, tables with by_product', async () => {
    const dsQuery = jest.fn()
      .mockResolvedValueOnce([
        // cost query rows (stock_movements JOIN stock_batches JOIN products)
        { product_id: 'p-1', product_name: 'Coffee', category_id: 'c-1', category_name: 'Beverages', total_cost: '300.00', units_sold: '60' },
      ])
      .mockResolvedValueOnce([
        // revenue query rows (transaction_items JOIN transactions)
        { product_id: 'p-1', revenue: '600.00' },
      ]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'cogs', { type: 'this_month' }, 'en');
    expect(result.title).toBe('Cost of Goods Sold');
    expect(result.summary.some((s: any) => s.label === 'Total COGS')).toBe(true);
    expect(result.tables.some((t: any) => t.title === 'By Product')).toBe(true);
  });

  it('vendor-balance returns title, summary with total_outstanding, per-vendor rows', async () => {
    const dsQuery = jest.fn().mockResolvedValue([
      { vendor_id: 'v-1', vendor_name: 'Supplier A', total_purchases: '5000', total_paid: '3000', balance_due: '2000' },
    ]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'vendor-balance', { type: 'today' }, 'fr');
    expect(result.title).toBe('Solde fournisseurs');
    expect(result.summary.some((s: any) => s.label === 'Total impayé')).toBe(true);
    expect(result.tables[0].rows).toHaveLength(1);
  });

  it('bill-aging returns 4 aging buckets in summary, per-vendor rows', async () => {
    const dsQuery = jest.fn().mockResolvedValue([
      { vendor_id: 'v-1', vendor_name: 'Supplier A', po_id: 'po-1', po_number: 'PO-2026-0001',
        order_date: '2026-04-01', balance_due: '1200', days_overdue: '46', aging_bucket: '31-60' },
    ]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'bill-aging', { type: 'today' }, 'en');
    expect(result.title).toBe('Bill Aging');
    expect(result.summary.some((s: any) => s.label === '31-60 days')).toBe(true);
    expect(result.tables[0].rows).toHaveLength(1);
  });

  it('all 3 Phase 12D report IDs are accepted without REPORT_NOT_IMPLEMENTED', async () => {
    const phase12dIds = ['cogs', 'vendor-balance', 'bill-aging'];
    for (const id of phase12dIds) {
      const dsQuery = jest.fn()
        .mockResolvedValue([]);
      const { service } = await buildService('retail', dsQuery);
      let threw = false;
      try {
        await service.getReport(BIZ_ID, id, { type: 'today' }, 'fr');
      } catch (e: any) {
        if (e?.response?.error === 'REPORT_NOT_IMPLEMENTED') threw = true;
      }
      expect(threw).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail with REPORT_NOT_FOUND (not REPORT_NOT_IMPLEMENTED)**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="reports.service.spec"
```

Expected: 4 new tests FAIL (REPORT_NOT_FOUND because IDs not yet registered).

- [ ] **Step 3: Register the 3 new IDs in `reports.service.ts`**

In `apps/backend/src/modules/reports/reports.service.ts`:

**3a.** Add to `ALL_REPORT_IDS` set (after `'input-tva'` on the last line of the set):

```typescript
  // Phase 12D reports
  'cogs', 'vendor-balance', 'bill-aging',
```

**3b.** Add 3 switch cases after the `case 'input-tva':` block (before the `default:` case):

```typescript
      // Phase 12D reports
      case 'cogs':
        return this.inventoryGen.cogs(businessId, lang, businessType, period, query.type, {
          warehouse_id: query.warehouse_id,
          category_id: query.category_id,
        });
      case 'vendor-balance':
        return this.inventoryGen.vendorBalance(businessId, lang, businessType, period, query.type, {
          as_of_date: query.as_of_date,
        });
      case 'bill-aging':
        return this.inventoryGen.billAging(businessId, lang, businessType, period, query.type, {
          as_of_date: query.as_of_date,
        });
```

- [ ] **Step 4: Run tests again — now should fail with "method not found" or similar**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="reports.service.spec"
```

Expected: tests still fail but differently — TypeScript error or runtime: `this.inventoryGen.cogs is not a function`.

- [ ] **Step 5: Implement `cogs()` in `inventory-reports.generator.ts`**

Add this method after `inputTva()` (after line 311) in `apps/backend/src/modules/reports/generators/inventory-reports.generator.ts`:

```typescript
  // ── INV-094: COGS Report ───────────────────────────────────────────────────

  async cogs(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    opts: { warehouse_id?: string; category_id?: string },
  ): Promise<UniversalReportResponse> {
    // Query 1: cost side — stock_movements (sale) joined to batches for unit_cost
    let costSql = `
      SELECT
        p.id                                                  AS product_id,
        p.name                                                AS product_name,
        p.category_id,
        COALESCE(c.name, '')                                  AS category_name,
        COALESCE(SUM(ABS(sm.quantity) * b.unit_cost), 0)     AS total_cost,
        COALESCE(SUM(ABS(sm.quantity)), 0)                   AS units_sold
      FROM stock_movements sm
      JOIN stock_batches b ON b.id = sm.batch_id
      JOIN products p ON p.id = b.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE sm.business_id = $1
        AND sm.movement_type = 'sale'
        AND DATE(sm.created_at) BETWEEN $2 AND $3
    `;
    const costParams: any[] = [businessId, period.fromStr, period.toStr];
    let idx = 4;

    if (opts.warehouse_id) { costSql += ` AND b.warehouse_id = $${idx}`; costParams.push(opts.warehouse_id); idx++; }
    if (opts.category_id) { costSql += ` AND p.category_id = $${idx}`; costParams.push(opts.category_id); idx++; }

    costSql += ` GROUP BY p.id, p.name, p.category_id, c.name ORDER BY total_cost DESC`;

    // Query 2: revenue side — transaction_items joined to transactions
    let revSql = `
      SELECT
        ti.product_id,
        COALESCE(SUM(ti.item_ttc), 0) AS revenue
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.business_id = $1
        AND DATE(t.created_at) BETWEEN $2 AND $3
        AND t.status = 'completed'
      GROUP BY ti.product_id
    `;
    const revParams: any[] = [businessId, period.fromStr, period.toStr];

    const [costRows, revRows] = await Promise.all([
      this.ds.query(costSql, costParams),
      this.ds.query(revSql, revParams),
    ]);

    // Merge by product_id in TypeScript
    const revByProduct = new Map<string, number>();
    for (const r of revRows) revByProduct.set(r.product_id, Number(r.revenue));

    const byProduct = costRows.map((r: any) => {
      const cost = Number(r.total_cost);
      const revenue = revByProduct.get(r.product_id) ?? 0;
      const gross_profit = revenue - cost;
      const margin_pct = revenue > 0 ? Math.round((gross_profit / revenue) * 10000) / 100 : null;
      return {
        product_name: r.product_name,
        category_name: r.category_name,
        units_sold: Number(r.units_sold),
        total_cost: Math.round(cost * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        gross_profit: Math.round(gross_profit * 100) / 100,
        margin_pct,
      };
    });

    // Aggregate by category in TypeScript
    const catMap = new Map<string, { category_name: string; total_cost: number; revenue: number }>();
    for (const row of byProduct) {
      const key = row.category_name || '';
      const existing = catMap.get(key) ?? { category_name: row.category_name, total_cost: 0, revenue: 0 };
      existing.total_cost += row.total_cost;
      existing.revenue += row.revenue;
      catMap.set(key, existing);
    }
    const byCategory = Array.from(catMap.values()).map((c) => ({
      category_name: c.category_name,
      total_cost: Math.round(c.total_cost * 100) / 100,
      revenue: Math.round(c.revenue * 100) / 100,
      gross_profit: Math.round((c.revenue - c.total_cost) * 100) / 100,
    }));

    const totalCogs = byProduct.reduce((s, r) => s + r.total_cost, 0);
    const totalRevenue = byProduct.reduce((s, r) => s + r.revenue, 0);
    const totalGrossProfit = totalRevenue - totalCogs;
    const overallMargin = totalRevenue > 0
      ? Math.round((totalGrossProfit / totalRevenue) * 10000) / 100
      : null;

    return {
      title: lang === 'ar' ? 'تكلفة البضاعة المباعة' : lang === 'en' ? 'Cost of Goods Sold' : 'Coût des marchandises vendues',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: lang === 'en' ? 'Total COGS' : 'Total CMV', value: Math.round(totalCogs * 100) / 100, type: 'money' },
        { label: lang === 'en' ? 'Total Revenue' : 'Chiffre d\'affaires', value: Math.round(totalRevenue * 100) / 100, type: 'money' },
        { label: lang === 'en' ? 'Gross Profit' : 'Marge brute', value: Math.round(totalGrossProfit * 100) / 100, type: 'money' },
        { label: lang === 'en' ? 'Margin %' : 'Taux de marge', value: overallMargin ?? 0, type: 'percentage' },
      ],
      tables: [
        {
          title: lang === 'en' ? 'By Product' : 'Par produit',
          columns: [
            { key: 'product_name', label: lang === 'en' ? 'Product' : 'Produit', type: 'text' },
            { key: 'category_name', label: lang === 'en' ? 'Category' : 'Catégorie', type: 'text' },
            { key: 'units_sold', label: lang === 'en' ? 'Units Sold' : 'Qté vendue', type: 'quantity' },
            { key: 'total_cost', label: lang === 'en' ? 'COGS' : 'CMV', type: 'money' },
            { key: 'revenue', label: lang === 'en' ? 'Revenue' : 'CA', type: 'money' },
            { key: 'gross_profit', label: lang === 'en' ? 'Gross Profit' : 'Marge brute', type: 'money' },
            { key: 'margin_pct', label: lang === 'en' ? 'Margin %' : 'Taux %', type: 'percentage' },
          ],
          rows: byProduct,
        },
        {
          title: lang === 'en' ? 'By Category' : 'Par catégorie',
          columns: [
            { key: 'category_name', label: lang === 'en' ? 'Category' : 'Catégorie', type: 'text' },
            { key: 'total_cost', label: lang === 'en' ? 'COGS' : 'CMV', type: 'money' },
            { key: 'revenue', label: lang === 'en' ? 'Revenue' : 'CA', type: 'money' },
            { key: 'gross_profit', label: lang === 'en' ? 'Gross Profit' : 'Marge brute', type: 'money' },
          ],
          rows: byCategory,
        },
      ],
      meta: null,
    };
  }
```

- [ ] **Step 6: Run tests — cogs test should now pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="reports.service.spec"
```

Expected: `cogs` test PASSES; `vendor-balance` and `bill-aging` still fail with "not a function".

- [ ] **Step 7: Implement `vendorBalance()` in `inventory-reports.generator.ts`**

Add this method after `cogs()`:

```typescript
  // ── INV-095: Vendor Balance Report ─────────────────────────────────────────

  async vendorBalance(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    opts: { as_of_date?: string },
  ): Promise<UniversalReportResponse> {
    const asOfDate = opts.as_of_date ?? new Date().toISOString().slice(0, 10);

    const rows: any[] = await this.ds.query(
      `SELECT
         v.id                                              AS vendor_id,
         v.name                                            AS vendor_name,
         COALESCE(SUM(po.total_ttc), 0)                   AS total_purchases,
         COALESCE(SUM(COALESCE(vp_sum.amount_paid, 0)), 0) AS total_paid,
         COALESCE(SUM(po.total_ttc - COALESCE(vp_sum.amount_paid, 0)), 0) AS balance_due
       FROM vendors v
       JOIN purchase_orders po
         ON po.vendor_id = v.id
         AND po.business_id = $1
         AND po.status NOT IN ('cancelled', 'draft')
         AND po.order_date::date <= $2::date
       LEFT JOIN (
         SELECT purchase_order_id, SUM(amount_paid) AS amount_paid
         FROM vendor_payments
         WHERE business_id = $1
           AND status IN ('pending', 'confirmed')
           AND payment_date::date <= $2::date
         GROUP BY purchase_order_id
       ) vp_sum ON vp_sum.purchase_order_id = po.id
       WHERE v.business_id = $1
       GROUP BY v.id, v.name
       HAVING COALESCE(SUM(po.total_ttc - COALESCE(vp_sum.amount_paid, 0)), 0) > 0
       ORDER BY balance_due DESC`,
      [businessId, asOfDate],
    );

    const totalOutstanding = rows.reduce((s: number, r: any) => s + Number(r.balance_due), 0);
    const totalPurchases = rows.reduce((s: number, r: any) => s + Number(r.total_purchases), 0);

    return {
      title: lang === 'ar' ? 'أرصدة الموردين' : lang === 'en' ? 'Vendor Balance' : 'Solde fournisseurs',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: lang === 'en' ? 'Vendors with Balance' : 'Fournisseurs créditeurs', value: rows.length, type: 'number' },
        { label: lang === 'en' ? 'Total Purchases' : 'Total achats', value: Math.round(totalPurchases * 100) / 100, type: 'money' },
        { label: lang === 'en' ? 'Total Outstanding' : 'Total impayé', value: Math.round(totalOutstanding * 100) / 100, type: 'money' },
      ],
      tables: [
        {
          title: lang === 'en' ? 'By Vendor' : 'Par fournisseur',
          columns: [
            { key: 'vendor_name', label: lang === 'en' ? 'Vendor' : 'Fournisseur', type: 'text' },
            { key: 'total_purchases', label: lang === 'en' ? 'Total Purchases' : 'Total achats', type: 'money' },
            { key: 'total_paid', label: lang === 'en' ? 'Total Paid' : 'Total réglé', type: 'money' },
            { key: 'balance_due', label: lang === 'en' ? 'Balance Due' : 'Solde dû', type: 'money' },
          ],
          rows: rows.map((r: any) => ({
            vendor_name: r.vendor_name,
            total_purchases: Math.round(Number(r.total_purchases) * 100) / 100,
            total_paid: Math.round(Number(r.total_paid) * 100) / 100,
            balance_due: Math.round(Number(r.balance_due) * 100) / 100,
          })),
        },
      ],
      meta: null,
    };
  }
```

- [ ] **Step 8: Implement `billAging()` in `inventory-reports.generator.ts`**

Add this method after `vendorBalance()`:

```typescript
  // ── INV-096: Bill Aging Report ─────────────────────────────────────────────

  async billAging(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    opts: { as_of_date?: string },
  ): Promise<UniversalReportResponse> {
    const asOfDate = opts.as_of_date ?? new Date().toISOString().slice(0, 10);

    const rows: any[] = await this.ds.query(
      `SELECT
         v.id                                              AS vendor_id,
         v.name                                            AS vendor_name,
         po.id                                             AS po_id,
         po.po_number,
         po.order_date,
         po.total_ttc - COALESCE(vp_sum.amount_paid, 0)   AS balance_due,
         GREATEST(0, ($2::date - (po.order_date::date + COALESCE(v.payment_terms_days, 30)))::int) AS days_overdue,
         CASE
           WHEN GREATEST(0, ($2::date - (po.order_date::date + COALESCE(v.payment_terms_days, 30)))::int) <= 30 THEN '0-30'
           WHEN GREATEST(0, ($2::date - (po.order_date::date + COALESCE(v.payment_terms_days, 30)))::int) <= 60 THEN '31-60'
           WHEN GREATEST(0, ($2::date - (po.order_date::date + COALESCE(v.payment_terms_days, 30)))::int) <= 90 THEN '61-90'
           ELSE '90+'
         END AS aging_bucket
       FROM purchase_orders po
       JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN (
         SELECT purchase_order_id, SUM(amount_paid) AS amount_paid
         FROM vendor_payments
         WHERE business_id = $1
           AND status IN ('pending', 'confirmed')
           AND payment_date::date <= $2::date
         GROUP BY purchase_order_id
       ) vp_sum ON vp_sum.purchase_order_id = po.id
       WHERE po.business_id = $1
         AND po.status NOT IN ('cancelled', 'draft')
         AND po.order_date::date <= $2::date
         AND (po.total_ttc - COALESCE(vp_sum.amount_paid, 0)) > 0
       ORDER BY days_overdue DESC, v.name`,
      [businessId, asOfDate],
    );

    // Compute bucket totals
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const r of rows) {
      const bucket = r.aging_bucket as keyof typeof buckets;
      buckets[bucket] = (buckets[bucket] ?? 0) + Number(r.balance_due);
    }
    const totalOverdue = rows.reduce((s: number, r: any) => s + Number(r.balance_due), 0);

    return {
      title: lang === 'ar' ? 'تقادم الفواتير' : lang === 'en' ? 'Bill Aging' : 'Vieillissement des factures',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: lang === 'en' ? 'Total Outstanding' : 'Total impayé', value: Math.round(totalOverdue * 100) / 100, type: 'money' },
        { label: lang === 'en' ? '0-30 days' : '0-30 jours', value: Math.round(buckets['0-30'] * 100) / 100, type: 'money' },
        { label: lang === 'en' ? '31-60 days' : '31-60 jours', value: Math.round(buckets['31-60'] * 100) / 100, type: 'money' },
        { label: lang === 'en' ? '61-90 days' : '61-90 jours', value: Math.round(buckets['61-90'] * 100) / 100, type: 'money' },
        { label: lang === 'en' ? '90+ days' : '>90 jours', value: Math.round(buckets['90+'] * 100) / 100, type: 'money' },
      ],
      tables: [
        {
          title: lang === 'en' ? 'Outstanding Bills' : 'Factures impayées',
          columns: [
            { key: 'vendor_name', label: lang === 'en' ? 'Vendor' : 'Fournisseur', type: 'text' },
            { key: 'po_number', label: lang === 'en' ? 'PO #' : 'N° BC', type: 'text' },
            { key: 'order_date', label: lang === 'en' ? 'Order Date' : 'Date commande', type: 'date' },
            { key: 'balance_due', label: lang === 'en' ? 'Balance Due' : 'Solde dû', type: 'money' },
            { key: 'days_overdue', label: lang === 'en' ? 'Days Overdue' : 'Jours dépassés', type: 'number' },
            { key: 'aging_bucket', label: lang === 'en' ? 'Bucket' : 'Tranche', type: 'text' },
          ],
          rows: rows.map((r: any) => ({
            vendor_name: r.vendor_name,
            po_number: r.po_number,
            order_date: r.order_date,
            balance_due: Math.round(Number(r.balance_due) * 100) / 100,
            days_overdue: Number(r.days_overdue),
            aging_bucket: r.aging_bucket,
          })),
        },
      ],
      meta: null,
    };
  }
```

- [ ] **Step 9: Run the full test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend
```

Expected: All 4 new tests PASS. Total: **531 tests passing, 39 suites**.

- [ ] **Step 10: Commit**

```bash
git add \
  apps/backend/src/modules/reports/dto/report-query.dto.ts \
  apps/backend/src/modules/reports/generators/inventory-reports.generator.ts \
  apps/backend/src/modules/reports/reports.service.ts \
  apps/backend/src/modules/reports/reports.service.spec.ts
git commit -m "phase-12d: COGS, Vendor Balance, Bill Aging reports (INV-094-096)"
```

---

## Task 3: Update Docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/IMPLEMENTATION_LOG.md`

- [ ] **Step 1: Update `CLAUDE.md` implementation status**

In `CLAUDE.md`, find the implementation status section and update:

```
**Current state: 531 tests passing, 39 suites, zero regressions.**

Completed phases: 0, 5, 6, 7, 8, 9, 10, Reports, 11A, 12A, 12B, 12C, 12D.
Next: 13 (CHN — Chain Management).
```

Also update the Key architectural facts section, add after the last bullet:

```
- `InventoryReportsGenerator` has 7 report methods: stockPosition, stockMovements, vendorPurchases, inputTva (12A), cogs, vendorBalance, billAging (12D)
- `vendor_payments` table exists from Phase 12C; used by vendorBalance and billAging queries
```

- [ ] **Step 2: Add Phase 12D entry to `docs/IMPLEMENTATION_LOG.md`**

After the Phase 12B DONE entry (at the end of the file before "### Phases 13-15"), add:

```markdown
### Phase 12C — Vendor Payments (DONE). 527 tests passing (39 suites).

See extension spec §12 (INV-097-103) for requirement IDs.

- [x] Migration `1714012000000-AddVendorPayments` — `vendor_payments` table with 15 columns:
      id, business_id, vendor_id, purchase_order_id (nullable), payment_number, amount_paid,
      payment_date, payment_method, reference_number, notes, status, created_by_user_id,
      confirmed_by_user_id, confirmed_at, created_at; UNIQUE on (business_id, payment_number)
- [x] `VendorPayment` entity with ManyToOne relations to Business, Vendor, PurchaseOrder, User (×2)
- [x] `VendorPaymentService` — 7 methods: listPayments, getPayment, createPayment (VP-YYYY-NNNNN),
      confirmPayment, voidPayment, getVendorOutstanding, getVendorPaymentSummary
- [x] `VendorPaymentController` — 7 endpoints under `/api/business/vendor-payments/` and
      `/api/business/vendors/:id/`; owner-only confirm/void; manager+owner for reads/create
- [x] `PurchaseOrderService.getPurchaseOrder` enriched with try/catch-guarded `amount_paid`
      + `balance_due` fields computed from `vendor_payments`
- [x] 16 unit tests in `vendor-payment.service.spec.ts` + 2 enrichment tests in
      `purchase-order.service.spec.ts`

### Phase 12D — COGS, Vendor Balance & Bill Aging Reports (DONE). 531 tests passing (39 suites).

- [x] `as_of_date` optional param added to `ReportQueryDto` (YYYY-MM-DD, for balance/aging)
- [x] `InventoryReportsGenerator.cogs()` — 2-query approach: stock_movements JOIN batches for COGS,
      transaction_items for revenue; merged in TypeScript; by-product + by-category tables;
      summary: total COGS, revenue, gross profit, margin %
- [x] `InventoryReportsGenerator.vendorBalance()` — single raw SQL with aggregated LEFT JOINs;
      supports as_of_date parameter; HAVING balance_due > 0 filters paid-in-full vendors
- [x] `InventoryReportsGenerator.billAging()` — single raw SQL with GREATEST(0,...) for days_overdue;
      4 aging buckets (0-30, 31-60, 61-90, 90+) computed in SQL CASE WHEN;
      bucket totals aggregated in TypeScript from result rows
- [x] 3 new IDs registered in `ALL_REPORT_IDS` and dispatcher: 'cogs', 'vendor-balance', 'bill-aging'
- [x] 4 new tests in `reports.service.spec.ts` (1 per report + smoke test for all 3 new IDs)
```

- [ ] **Step 3: Run full test suite one final time**

```bash
docker compose exec backend npm test --workspace=apps/backend
```

Expected: 531 tests passing, 39 suites, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/IMPLEMENTATION_LOG.md
git commit -m "phase-12d: update docs — 531 tests, 39 suites, mark Phase 12D DONE"
```

---

## Self-Review

**Spec coverage:**
- COGS report: ✅ stock_movements (sale) for cost, transaction_items for revenue, by-product + by-category
- Vendor Balance: ✅ purchase_orders minus vendor_payments, as_of_date filter, balance_due > 0 filter
- Bill Aging: ✅ 4 buckets, days_overdue = GREATEST(0, as_of_date - (order_date + payment_terms_days)), per-PO breakdown

**Placeholder scan:** No TBD, no "implement later", no vague instructions — all code is complete.

**Type consistency:**
- `cogs(businessId, lang, businessType, period, type, opts: { warehouse_id?, category_id? })` — matches call in reports.service.ts
- `vendorBalance(businessId, lang, businessType, period, type, opts: { as_of_date? })` — matches call in reports.service.ts
- `billAging(businessId, lang, businessType, period, type, opts: { as_of_date? })` — matches call in reports.service.ts
- All return `Promise<UniversalReportResponse>` — matches the interface
- Summary items: `{ label: string, value: number, type: 'money'|'number'|'percentage' }` — correct
- Test mock shape for cogs: 2 `.mockResolvedValueOnce()` calls matching the 2-query `Promise.all` — correct

**Existing tests:** The smoke test at `reports.service.spec.ts:748` tests only `['stock-position', 'stock-movements', 'vendor-purchases', 'input-tva']` — NOT modified. New smoke test uses a separate describe block.

**`as_of_date` default:** Both `vendorBalance` and `billAging` default to today when `as_of_date` is absent — safe for `type: 'today'` in tests.

**`payment_terms_days` nullable:** `COALESCE(v.payment_terms_days, 30)` in billAging SQL handles vendors without payment terms (defaults to 30 days).
