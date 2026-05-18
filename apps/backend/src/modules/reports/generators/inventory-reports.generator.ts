import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportLanguage } from '../../../common/i18n/report-labels';
import { DateRange } from '../../../common/utils/date-range';
import { UniversalReportResponse } from '../dto/report-query.dto';

@Injectable()
export class InventoryReportsGenerator {
  constructor(private ds: DataSource) {}

  // ── INV-090: Current Stock Position ────────────────────────────────────────

  async stockPosition(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    opts: { warehouse_id?: string; category_id?: string; low_stock_only?: boolean },
  ): Promise<UniversalReportResponse> {
    let sql = `
      SELECT
        p.id                                            AS product_id,
        p.name                                          AS product_name,
        COALESCE(c.name, '')                            AS category_name,
        COALESCE(SUM(b.quantity_remaining), 0)          AS total_quantity,
        COALESCE(SUM(b.quantity_remaining * b.unit_cost), 0) AS total_value,
        MIN(b.expires_at)                               AS oldest_expiry,
        p.reorder_point                                 AS reorder_point,
        COUNT(DISTINCT b.id)                            AS batch_count
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock_batches b
        ON b.product_id = p.id
        AND b.business_id = $1
        AND b.is_active = true
      WHERE p.business_id = $1
        AND p.is_active = true
        AND p.track_stock = true
    `;
    const params: any[] = [businessId];
    let idx = 2;

    if (opts.warehouse_id) { sql += ` AND b.warehouse_id = $${idx}`; params.push(opts.warehouse_id); idx++; }
    if (opts.category_id) { sql += ` AND p.category_id = $${idx}`; params.push(opts.category_id); idx++; }

    sql += ` GROUP BY p.id, p.name, c.name, p.reorder_point`;
    if (opts.low_stock_only) sql += ` HAVING COALESCE(SUM(b.quantity_remaining), 0) <= p.reorder_point`;
    sql += ` ORDER BY p.name`;

    const rows = await this.ds.query(sql, params);

    const totalProducts = rows.length;
    const totalValue = rows.reduce((s: number, r: any) => s + Number(r.total_value), 0);
    const lowStockCount = rows.filter((r: any) => Number(r.total_quantity) <= Number(r.reorder_point ?? 0)).length;

    return {
      title: lang === 'ar' ? 'وضعية المخزون' : lang === 'en' ? 'Stock Position' : 'Position de stock',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: lang === 'en' ? 'Total Products' : 'Total produits', value: totalProducts, type: 'number' },
        { label: lang === 'en' ? 'Total Stock Value' : 'Valeur du stock', value: Math.round(totalValue * 100) / 100, type: 'money' },
        { label: lang === 'en' ? 'Low Stock Items' : 'Articles en rupture', value: lowStockCount, type: 'number' },
      ],
      tables: [
        {
          title: lang === 'en' ? 'Stock by Product' : 'Stock par produit',
          columns: [
            { key: 'product_name', label: lang === 'en' ? 'Product' : 'Produit', type: 'text' },
            { key: 'category_name', label: lang === 'en' ? 'Category' : 'Catégorie', type: 'text' },
            { key: 'total_quantity', label: lang === 'en' ? 'Quantity' : 'Quantité', type: 'quantity' },
            { key: 'total_value', label: lang === 'en' ? 'Stock Value' : 'Valeur', type: 'money' },
            { key: 'oldest_expiry', label: lang === 'en' ? 'Oldest Expiry' : 'Expiration proche', type: 'date' },
            { key: 'batch_count', label: lang === 'en' ? 'Batches' : 'Lots', type: 'number' },
          ],
          rows: rows.map((r: any) => ({
            product_name: r.product_name,
            category_name: r.category_name,
            total_quantity: Number(r.total_quantity),
            total_value: Math.round(Number(r.total_value) * 100) / 100,
            oldest_expiry: r.oldest_expiry ?? null,
            batch_count: Number(r.batch_count),
            reorder_point: r.reorder_point,
            low_stock: Number(r.total_quantity) <= Number(r.reorder_point ?? 0),
          })),
        },
      ],
      meta: null,
    };
  }

  // ── INV-091: Stock Movement History ────────────────────────────────────────

  async stockMovements(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    opts: { warehouse_id?: string; product_id?: string; movement_type?: string; page: number; limit: number },
  ): Promise<UniversalReportResponse> {
    let sql = `
      SELECT
        sm.id,
        sm.movement_type,
        sm.quantity,
        sm.source_origin,
        sm.reference_type,
        sm.reference_id,
        sm.created_at,
        sm.notes,
        b.batch_code,
        b.warehouse_id,
        p.name AS product_name
      FROM stock_movements sm
      JOIN stock_batches b ON b.id = sm.batch_id
      JOIN products p ON p.id = b.product_id
      WHERE sm.business_id = $1
        AND DATE(sm.created_at) BETWEEN $2 AND $3
    `;
    const params: any[] = [businessId, period.fromStr, period.toStr];
    let idx = 4;

    if (opts.warehouse_id) { sql += ` AND b.warehouse_id = $${idx}`; params.push(opts.warehouse_id); idx++; }
    if (opts.product_id) { sql += ` AND b.product_id = $${idx}`; params.push(opts.product_id); idx++; }
    if (opts.movement_type) { sql += ` AND sm.movement_type = $${idx}`; params.push(opts.movement_type); idx++; }

    const countSql = `SELECT COUNT(*) AS cnt FROM (${sql}) sub`;
    const [{ cnt }] = await this.ds.query(countSql, params);
    const total = Number(cnt);

    sql += ` ORDER BY sm.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(opts.limit, (opts.page - 1) * opts.limit);

    const rows = await this.ds.query(sql, params);

    return {
      title: lang === 'en' ? 'Stock Movement History' : 'Historique des mouvements',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: lang === 'en' ? 'Total Movements' : 'Total mouvements', value: total, type: 'number' },
      ],
      tables: [
        {
          title: lang === 'en' ? 'Movements' : 'Mouvements',
          columns: [
            { key: 'created_at', label: lang === 'en' ? 'Date' : 'Date', type: 'datetime' },
            { key: 'product_name', label: lang === 'en' ? 'Product' : 'Produit', type: 'text' },
            { key: 'batch_code', label: lang === 'en' ? 'Batch' : 'Lot', type: 'text' },
            { key: 'movement_type', label: lang === 'en' ? 'Type' : 'Type', type: 'text' },
            { key: 'quantity', label: lang === 'en' ? 'Quantity' : 'Quantité', type: 'quantity' },
            { key: 'source_origin', label: lang === 'en' ? 'Source' : 'Source', type: 'text' },
          ],
          rows: rows.map((r: any) => ({
            created_at: r.created_at,
            product_name: r.product_name,
            batch_code: r.batch_code,
            movement_type: r.movement_type,
            quantity: Number(r.quantity),
            source_origin: r.source_origin,
            notes: r.notes,
          })),
        },
      ],
      meta: { total_rows: total, page: opts.page, limit: opts.limit },
    };
  }

  // ── INV-092: Vendor Purchase Report ────────────────────────────────────────

  async vendorPurchases(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    opts: { vendor_id?: string },
  ): Promise<UniversalReportResponse> {
    let sql = `
      SELECT
        v.id                              AS vendor_id,
        v.name                            AS vendor_name,
        COUNT(DISTINCT po.id)             AS po_count,
        COALESCE(SUM(po.subtotal_ht), 0)  AS total_ht,
        COALESCE(SUM(po.total_tva), 0)    AS total_tva,
        COALESCE(SUM(po.total_ttc), 0)    AS total_ttc,
        COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'received') AS received_count
      FROM purchase_orders po
      JOIN vendors v ON v.id = po.vendor_id
      WHERE po.business_id = $1
        AND po.order_date BETWEEN $2 AND $3
        AND po.status != 'cancelled'
    `;
    const params: any[] = [businessId, period.fromStr, period.toStr];
    let idx = 4;

    if (opts.vendor_id) { sql += ` AND po.vendor_id = $${idx}`; params.push(opts.vendor_id); idx++; }

    sql += ` GROUP BY v.id, v.name ORDER BY total_ttc DESC`;

    const rows = await this.ds.query(sql, params);
    const grandTotal = rows.reduce((s: number, r: any) => s + Number(r.total_ttc), 0);

    return {
      title: lang === 'en' ? 'Vendor Purchase Report' : 'Rapport achats fournisseurs',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: lang === 'en' ? 'Total Vendors' : 'Total fournisseurs', value: rows.length, type: 'number' },
        { label: lang === 'en' ? 'Total Spend (TTC)' : 'Total achats (TTC)', value: Math.round(grandTotal * 100) / 100, type: 'money' },
      ],
      tables: [
        {
          title: lang === 'en' ? 'By Vendor' : 'Par fournisseur',
          columns: [
            { key: 'vendor_name', label: lang === 'en' ? 'Vendor' : 'Fournisseur', type: 'text' },
            { key: 'po_count', label: lang === 'en' ? 'PO Count' : 'Nb. commandes', type: 'number' },
            { key: 'total_ht', label: lang === 'en' ? 'Total HT' : 'Total HT', type: 'money' },
            { key: 'total_tva', label: lang === 'en' ? 'Total TVA' : 'Total TVA', type: 'money' },
            { key: 'total_ttc', label: lang === 'en' ? 'Total TTC' : 'Total TTC', type: 'money' },
          ],
          rows: rows.map((r: any) => ({
            vendor_name: r.vendor_name,
            po_count: Number(r.po_count),
            total_ht: Math.round(Number(r.total_ht) * 100) / 100,
            total_tva: Math.round(Number(r.total_tva) * 100) / 100,
            total_ttc: Math.round(Number(r.total_ttc) * 100) / 100,
          })),
        },
      ],
      meta: null,
    };
  }

  // ── INV-093: Input TVA Reclaim Report ──────────────────────────────────────

  async inputTva(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    // Per XCC-018: use calendar date (NOT cutoff-adjusted) — order_date is a DATE column
    const rows: any[] = await this.ds.query(
      `SELECT
         poi.tva_rate,
         COALESCE(SUM(poi.line_total_ht), 0)  AS total_ht,
         COALESCE(SUM(poi.line_total_tva), 0) AS total_tva
       FROM purchase_order_items poi
       JOIN purchase_orders po ON po.id = poi.purchase_order_id
       WHERE po.business_id = $1
         AND po.order_date BETWEEN $2 AND $3
         AND po.status != 'cancelled'
       GROUP BY poi.tva_rate
       ORDER BY poi.tva_rate DESC`,
      [businessId, period.fromStr, period.toStr],
    );

    const [{ cnt }] = await this.ds.query(
      `SELECT COUNT(DISTINCT po.id) AS cnt
       FROM purchase_orders po
       WHERE po.business_id = $1
         AND po.order_date BETWEEN $2 AND $3
         AND po.status != 'cancelled'`,
      [businessId, period.fromStr, period.toStr],
    );

    const totalInputTva = rows.reduce((s: number, r: any) => s + Number(r.total_tva), 0);

    return {
      title: lang === 'en' ? 'Input TVA Reclaim' : 'TVA déductible sur achats',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: lang === 'en' ? 'Total Input TVA' : 'TVA déductible totale', value: Math.round(totalInputTva * 100) / 100, type: 'money' },
        { label: lang === 'en' ? 'Linked Purchase Orders' : 'Bons de commande liés', value: Number(cnt), type: 'number' },
      ],
      tables: [
        {
          title: lang === 'en' ? 'By TVA Rate' : 'Par taux de TVA',
          columns: [
            { key: 'tva_rate', label: lang === 'en' ? 'TVA Rate (%)' : 'Taux TVA (%)', type: 'percentage' },
            { key: 'total_ht', label: lang === 'en' ? 'Total HT' : 'Total HT', type: 'money' },
            { key: 'total_tva', label: lang === 'en' ? 'Total TVA' : 'Total TVA', type: 'money' },
          ],
          rows: rows.map((r: any) => ({
            tva_rate: Number(r.tva_rate),
            total_ht: Math.round(Number(r.total_ht) * 100) / 100,
            total_tva: Math.round(Number(r.total_tva) * 100) / 100,
          })),
        },
      ],
      meta: null,
    };
  }

  // ── INV-094: COGS Report ───────────────────────────────────────────────────

  async cogs(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    opts: { warehouse_id?: string; category_id?: string },
  ): Promise<UniversalReportResponse> {
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

    const revSql = `
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

    const totalCogs = byProduct.reduce((s: number, r: any) => s + r.total_cost, 0);
    const totalRevenue = byProduct.reduce((s: number, r: any) => s + r.revenue, 0);
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
        { label: lang === 'en' ? 'Total Revenue' : "Chiffre d'affaires", value: Math.round(totalRevenue * 100) / 100, type: 'money' },
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
         v.id                                               AS vendor_id,
         v.name                                             AS vendor_name,
         COALESCE(SUM(po.total_ttc), 0)                    AS total_purchases,
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
         v.id                                               AS vendor_id,
         v.name                                             AS vendor_name,
         po.id                                              AS po_id,
         po.po_number,
         po.order_date,
         po.total_ttc - COALESCE(vp_sum.amount_paid, 0)    AS balance_due,
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
         AND v.business_id = $1
         AND po.status NOT IN ('cancelled', 'draft')
         AND po.order_date::date <= $2::date
         AND (po.total_ttc - COALESCE(vp_sum.amount_paid, 0)) > 0
       ORDER BY days_overdue DESC, v.name`,
      [businessId, asOfDate],
    );

    const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const r of rows) {
      const bucket = r.aging_bucket as string;
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
}
