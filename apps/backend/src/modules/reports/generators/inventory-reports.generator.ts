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
}
