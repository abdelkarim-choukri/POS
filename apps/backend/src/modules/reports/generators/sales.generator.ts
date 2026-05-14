import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { bankersRound } from '../../../common/utils/money';
import { REPORT_LABELS, ReportLanguage } from '../../../common/i18n/report-labels';
import { DateRange } from '../../../common/utils/date-range';
import { UniversalReportResponse } from '../dto/report-query.dto';

const DAY_NAMES: Record<string, string[]> = {
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const TZ = 'Africa/Casablanca';

@Injectable()
export class SalesGenerator {
  constructor(private ds: DataSource) {}

  async salesSummary(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const [kpiRows, dailyRows, topProductRows] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           COALESCE(SUM(total_ttc), 0)                                          AS total_ttc,
           COALESCE(SUM(total_ht), 0)                                           AS total_ht,
           COALESCE(SUM(total_tva), 0)                                          AS total_tva,
           COUNT(*)                                                              AS orders,
           COALESCE(SUM(discount_total), 0)                                     AS discount_total,
           COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL)   AS customers_served
         FROM transactions
         WHERE business_id = $1
           AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4)  AS date,
           COUNT(*)                          AS orders,
           COALESCE(SUM(total_ttc), 0)       AS total_ttc,
           COALESCE(SUM(total_ht), 0)        AS total_ht,
           COALESCE(SUM(total_tva), 0)       AS total_tva,
           COALESCE(AVG(total_ttc), 0)       AS avg_order_value,
           COALESCE(SUM(discount_total), 0)  AS discount_total
         FROM transactions
         WHERE business_id = $1 AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY DATE(created_at AT TIME ZONE $4)
         ORDER BY date ASC`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           p.name                          AS product_name,
           COALESCE(c.name, '')            AS category_name,
           COALESCE(SUM(ti.quantity), 0)   AS quantity_sold,
           COALESCE(SUM(ti.item_ttc), 0)   AS total_ttc
         FROM transaction_items ti
         INNER JOIN transactions t ON t.id = ti.transaction_id
         INNER JOIN products p ON p.id = ti.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE t.business_id = $1 AND t.status = 'completed'
           AND DATE(t.created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY p.id, p.name, c.name
         ORDER BY total_ttc DESC
         LIMIT 10`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    const kpi = kpiRows[0];
    const totalTtc = bankersRound(Number(kpi.total_ttc));
    const orders = Number(kpi.orders);

    return {
      title: 'Sales Summary',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_ttc, value: totalTtc, type: 'money' },
        { label: L.total_ht, value: bankersRound(Number(kpi.total_ht)), type: 'money' },
        { label: L.total_tva, value: bankersRound(Number(kpi.total_tva)), type: 'money' },
        { label: L.orders, value: orders, type: 'number' },
        { label: L.avg_order_value, value: orders > 0 ? bankersRound(totalTtc / orders) : 0, type: 'money' },
        { label: L.customers, value: Number(kpi.customers_served), type: 'number' },
        { label: L.discount_total, value: bankersRound(Number(kpi.discount_total)), type: 'money' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'المبيعات حسب اليوم' : lang === 'en' ? 'Sales by Day' : 'Ventes par jour',
          columns: [
            { key: 'date', label: L.date, type: 'date' },
            { key: 'orders', label: L.orders, type: 'number' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'total_ht', label: L.total_ht, type: 'money' },
            { key: 'total_tva', label: L.total_tva, type: 'money' },
            { key: 'avg_order_value', label: L.avg_order_value, type: 'money' },
            { key: 'discount_total', label: L.discount_total, type: 'money' },
          ],
          rows: dailyRows.map((r) => ({
            date: String(r.date).slice(0, 10),
            orders: Number(r.orders),
            total_ttc: bankersRound(Number(r.total_ttc)),
            total_ht: bankersRound(Number(r.total_ht)),
            total_tva: bankersRound(Number(r.total_tva)),
            avg_order_value: bankersRound(Number(r.avg_order_value)),
            discount_total: bankersRound(Number(r.discount_total)),
          })),
        },
        {
          title: lang === 'ar' ? 'أفضل المنتجات' : lang === 'en' ? 'Top Products' : 'Top Produits',
          columns: [
            { key: 'product_name', label: L.product_name, type: 'text' },
            { key: 'category_name', label: L.category_name, type: 'text' },
            { key: 'quantity_sold', label: L.quantity_sold, type: 'quantity' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
          ],
          rows: topProductRows.map((r) => ({
            product_name: r.product_name,
            category_name: r.category_name,
            quantity_sold: Number(r.quantity_sold),
            total_ttc: bankersRound(Number(r.total_ttc)),
          })),
        },
      ],
      meta: null,
    };
  }

  async salesByHour(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const rows = await this.ds.query<any[]>(
      `SELECT
         EXTRACT(HOUR FROM created_at AT TIME ZONE $4)::int  AS hour,
         COUNT(*)                                             AS orders,
         COALESCE(SUM(total_ttc), 0)                         AS total_ttc,
         COALESCE(AVG(total_ttc), 0)                         AS avg_order_value
       FROM transactions
       WHERE business_id = $1 AND status = 'completed'
         AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
       GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE $4)
       ORDER BY hour ASC`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const kpiRow = await this.ds.query<any[]>(
      `SELECT COUNT(*) AS orders FROM transactions
       WHERE business_id = $1 AND status = 'completed'
         AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const totalOrders = Number(kpiRow[0]?.orders ?? 0);
    const peakRow = rows.length > 0 ? rows.reduce((a, b) => (Number(a.total_ttc) >= Number(b.total_ttc) ? a : b)) : null;
    const quietRow = rows.length > 0 ? rows.reduce((a, b) => (Number(a.total_ttc) <= Number(b.total_ttc) ? a : b)) : null;

    return {
      title: lang === 'ar' ? 'المبيعات حسب الساعة' : lang === 'en' ? 'Sales by Hour' : 'Ventes par heure',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.peak_hour, value: peakRow ? `${peakRow.hour}:00` : '-', type: 'text' },
        { label: L.peak_revenue, value: peakRow ? bankersRound(Number(peakRow.total_ttc)) : 0, type: 'money' },
        { label: L.quietest_hour, value: quietRow ? `${quietRow.hour}:00` : '-', type: 'text' },
        { label: L.orders, value: totalOrders, type: 'number' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'توزيع ساعي' : lang === 'en' ? 'Hourly Breakdown' : 'Répartition horaire',
          columns: [
            { key: 'hour', label: L.hour, type: 'number' },
            { key: 'orders', label: L.orders, type: 'number' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'avg_order_value', label: L.avg_order_value, type: 'money' },
          ],
          rows: rows.map((r) => ({
            hour: Number(r.hour),
            orders: Number(r.orders),
            total_ttc: bankersRound(Number(r.total_ttc)),
            avg_order_value: bankersRound(Number(r.avg_order_value)),
          })),
        },
      ],
      meta: null,
    };
  }

  async salesByDay(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];
    const dayNames = DAY_NAMES[lang];

    const rows = await this.ds.query<any[]>(
      `SELECT
         DATE(created_at AT TIME ZONE $4)                          AS date,
         EXTRACT(DOW FROM created_at AT TIME ZONE $4)::int         AS dow,
         COUNT(*)                                                   AS orders,
         COALESCE(SUM(total_ttc), 0)                               AS total_ttc,
         COALESCE(SUM(total_ht), 0)                                AS total_ht,
         COALESCE(SUM(total_tva), 0)                               AS total_tva,
         COALESCE(AVG(total_ttc), 0)                               AS avg_order_value
       FROM transactions
       WHERE business_id = $1 AND status = 'completed'
         AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
       GROUP BY DATE(created_at AT TIME ZONE $4), EXTRACT(DOW FROM created_at AT TIME ZONE $4)
       ORDER BY date ASC`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const kpiRow = await this.ds.query<any[]>(
      `SELECT
         COALESCE(SUM(total_ttc), 0) AS total_ttc,
         COUNT(*) AS orders
       FROM transactions
       WHERE business_id = $1 AND status = 'completed'
         AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const kpi = kpiRow[0];
    const bestRow = rows.length > 0 ? rows.reduce((a, b) => (Number(a.total_ttc) >= Number(b.total_ttc) ? a : b)) : null;

    return {
      title: lang === 'ar' ? 'المبيعات اليومية' : lang === 'en' ? 'Sales by Day' : 'Ventes par jour',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_ttc, value: bankersRound(Number(kpi.total_ttc)), type: 'money' },
        { label: L.orders, value: Number(kpi.orders), type: 'number' },
        { label: L.avg_order_value, value: Number(kpi.orders) > 0 ? bankersRound(Number(kpi.total_ttc) / Number(kpi.orders)) : 0, type: 'money' },
        { label: L.best_day, value: bestRow ? String(bestRow.date).slice(0, 10) : '-', type: 'text' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'المبيعات اليومية' : lang === 'en' ? 'Daily Sales' : 'Ventes journalières',
          columns: [
            { key: 'date', label: L.date, type: 'date' },
            { key: 'day_of_week', label: L.day_of_week, type: 'text' },
            { key: 'orders', label: L.orders, type: 'number' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'total_ht', label: L.total_ht, type: 'money' },
            { key: 'total_tva', label: L.total_tva, type: 'money' },
            { key: 'avg_order_value', label: L.avg_order_value, type: 'money' },
          ],
          rows: rows.map((r) => ({
            date: String(r.date).slice(0, 10),
            day_of_week: dayNames[Number(r.dow)],
            orders: Number(r.orders),
            total_ttc: bankersRound(Number(r.total_ttc)),
            total_ht: bankersRound(Number(r.total_ht)),
            total_tva: bankersRound(Number(r.total_tva)),
            avg_order_value: bankersRound(Number(r.avg_order_value)),
          })),
        },
      ],
      meta: null,
    };
  }

  async salesByMonth(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const rows = await this.ds.query<any[]>(
      `SELECT
         TO_CHAR(created_at AT TIME ZONE $4, 'YYYY-MM')  AS month,
         COUNT(*)                                         AS orders,
         COALESCE(SUM(total_ttc), 0)                     AS total_ttc,
         COALESCE(SUM(total_ht), 0)                      AS total_ht,
         COALESCE(SUM(total_tva), 0)                     AS total_tva,
         COALESCE(AVG(total_ttc), 0)                     AS avg_order_value
       FROM transactions
       WHERE business_id = $1 AND status = 'completed'
         AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
       GROUP BY TO_CHAR(created_at AT TIME ZONE $4, 'YYYY-MM')
       ORDER BY month ASC`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const totalTtc = rows.reduce((s, r) => s + Number(r.total_ttc), 0);
    const totalOrders = rows.reduce((s, r) => s + Number(r.orders), 0);

    return {
      title: lang === 'ar' ? 'المبيعات الشهرية' : lang === 'en' ? 'Sales by Month' : 'Ventes par mois',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_ttc, value: bankersRound(totalTtc), type: 'money' },
        { label: L.orders, value: totalOrders, type: 'number' },
        { label: L.avg_monthly_revenue, value: rows.length > 0 ? bankersRound(totalTtc / rows.length) : 0, type: 'money' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'المبيعات الشهرية' : lang === 'en' ? 'Monthly Sales' : 'Ventes mensuelles',
          columns: [
            { key: 'month', label: L.month, type: 'text' },
            { key: 'orders', label: L.orders, type: 'number' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'total_ht', label: L.total_ht, type: 'money' },
            { key: 'total_tva', label: L.total_tva, type: 'money' },
            { key: 'avg_order_value', label: L.avg_order_value, type: 'money' },
          ],
          rows: rows.map((r) => ({
            month: r.month,
            orders: Number(r.orders),
            total_ttc: bankersRound(Number(r.total_ttc)),
            total_ht: bankersRound(Number(r.total_ht)),
            total_tva: bankersRound(Number(r.total_tva)),
            avg_order_value: bankersRound(Number(r.avg_order_value)),
          })),
        },
      ],
      meta: null,
    };
  }

  async salesByCategory(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const rows = await this.ds.query<any[]>(
      `SELECT
         COALESCE(c.name, 'Uncategorized')  AS category_name,
         COALESCE(SUM(ti.quantity), 0)      AS items_sold,
         COALESCE(SUM(ti.item_ttc), 0)      AS total_ttc
       FROM transaction_items ti
       INNER JOIN transactions t ON t.id = ti.transaction_id
       INNER JOIN products p ON p.id = ti.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE t.business_id = $1 AND t.status = 'completed'
         AND DATE(t.created_at AT TIME ZONE $4) BETWEEN $2 AND $3
       GROUP BY c.id, c.name
       ORDER BY total_ttc DESC`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const grandTotal = rows.reduce((s, r) => s + Number(r.total_ttc), 0);
    const topCat = rows.length > 0 ? rows[0].category_name : '-';

    return {
      title: lang === 'ar' ? 'المبيعات حسب الفئة' : lang === 'en' ? 'Sales by Category' : 'Ventes par catégorie',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_ttc, value: bankersRound(grandTotal), type: 'money' },
        { label: L.categories_with_sales, value: rows.length, type: 'number' },
        { label: L.top_category, value: topCat, type: 'text' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'أداء الفئات' : lang === 'en' ? 'Category Performance' : 'Performance par catégorie',
          columns: [
            { key: 'category_name', label: L.category_name, type: 'text' },
            { key: 'items_sold', label: L.quantity_sold, type: 'quantity' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'percentage_of_total', label: L.percentage_of_total, type: 'percentage' },
          ],
          rows: rows.map((r) => {
            const ttc = bankersRound(Number(r.total_ttc));
            return {
              category_name: r.category_name,
              items_sold: Number(r.items_sold),
              total_ttc: ttc,
              percentage_of_total: grandTotal > 0 ? bankersRound((ttc / grandTotal) * 100) : 0,
            };
          }),
        },
      ],
      meta: null,
    };
  }

  async salesByProduct(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const rows = await this.ds.query<any[]>(
      `SELECT
         p.name                            AS product_name,
         COALESCE(c.name, '')              AS category_name,
         COALESCE(SUM(ti.quantity), 0)     AS quantity_sold,
         COALESCE(SUM(ti.item_ttc), 0)     AS total_ttc,
         COALESCE(AVG(ti.unit_price), 0)   AS avg_unit_price
       FROM transaction_items ti
       INNER JOIN transactions t ON t.id = ti.transaction_id
       INNER JOIN products p ON p.id = ti.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE t.business_id = $1 AND t.status = 'completed'
         AND DATE(t.created_at AT TIME ZONE $4) BETWEEN $2 AND $3
       GROUP BY p.id, p.name, c.name
       ORDER BY total_ttc DESC`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const totalSold = rows.reduce((s, r) => s + Number(r.quantity_sold), 0);
    const totalTtc = rows.reduce((s, r) => s + Number(r.total_ttc), 0);

    return {
      title: lang === 'ar' ? 'المبيعات حسب المنتج' : lang === 'en' ? 'Sales by Product' : 'Ventes par produit',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_products_sold, value: totalSold, type: 'number' },
        { label: L.total_ttc, value: bankersRound(totalTtc), type: 'money' },
        { label: L.unique_products, value: rows.length, type: 'number' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'مبيعات المنتجات' : lang === 'en' ? 'Product Sales' : 'Ventes produits',
          columns: [
            { key: 'product_name', label: L.product_name, type: 'text' },
            { key: 'category_name', label: L.category_name, type: 'text' },
            { key: 'quantity_sold', label: L.quantity_sold, type: 'quantity' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'avg_unit_price', label: L.avg_unit_price, type: 'money' },
          ],
          rows: rows.map((r) => ({
            product_name: r.product_name,
            category_name: r.category_name,
            quantity_sold: Number(r.quantity_sold),
            total_ttc: bankersRound(Number(r.total_ttc)),
            avg_unit_price: bankersRound(Number(r.avg_unit_price)),
          })),
        },
      ],
      meta: null,
    };
  }

  async salesByTable(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    // Use subquery to aggregate transactions per session first — this correctly
    // handles split bills where multiple transactions share one table_session_id.
    const [rows, kpiRow] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           rt.table_number,
           COALESCE(da.name, '')                                              AS area_name,
           COUNT(DISTINCT ts.id)                                              AS sessions_count,
           COALESCE(SUM(txn.session_ttc), 0)                                 AS total_ttc,
           COALESCE(SUM(txn.session_ttc) / NULLIF(COUNT(DISTINCT ts.id), 0), 0) AS avg_per_session,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (ts.closed_at - ts.opened_at)) / 60),
             0
           )                                                                  AS avg_duration_minutes
         FROM table_sessions ts
         INNER JOIN tables rt ON rt.id = ts.table_id
         LEFT JOIN dining_areas da ON da.id = rt.area_id
         LEFT JOIN (
           SELECT table_session_id, SUM(total_ttc) AS session_ttc
           FROM transactions
           WHERE business_id = $1 AND status = 'completed'
           GROUP BY table_session_id
         ) txn ON txn.table_session_id = ts.id
         WHERE ts.business_id = $1
           AND ts.status = 'paid'
           AND DATE(ts.opened_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY rt.id, rt.table_number, da.name
         ORDER BY total_ttc DESC`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           COALESCE(SUM(txn.session_ttc), 0) AS total_ttc,
           COUNT(ts.id)                       AS total_sessions
         FROM table_sessions ts
         LEFT JOIN (
           SELECT table_session_id, SUM(total_ttc) AS session_ttc
           FROM transactions
           WHERE business_id = $1 AND status = 'completed'
           GROUP BY table_session_id
         ) txn ON txn.table_session_id = ts.id
         WHERE ts.business_id = $1
           AND ts.status = 'paid'
           AND DATE(ts.opened_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    const kpi = kpiRow[0];
    const totalTtc = bankersRound(Number(kpi.total_ttc));
    const totalSessions = Number(kpi.total_sessions);

    return {
      title: lang === 'ar' ? 'مبيعات الطاولات' : lang === 'en' ? 'Sales by Table' : 'Ventes par table',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_table_revenue, value: totalTtc, type: 'money' },
        { label: L.total_sessions, value: totalSessions, type: 'number' },
        { label: L.avg_revenue_per_table, value: rows.length > 0 ? bankersRound(totalTtc / rows.length) : 0, type: 'money' },
        {
          label: L.avg_session_duration,
          value: rows.length > 0 ? bankersRound(rows.reduce((s, r) => s + Number(r.avg_duration_minutes), 0) / rows.length) : 0,
          type: 'number',
        },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'أداء الطاولات' : lang === 'en' ? 'Table Performance' : 'Performance par table',
          columns: [
            { key: 'table_number', label: L.table_number, type: 'text' },
            { key: 'area_name', label: L.area_name, type: 'text' },
            { key: 'sessions_count', label: L.sessions_count, type: 'number' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'avg_per_session', label: L.avg_per_session, type: 'money' },
            { key: 'avg_duration_minutes', label: L.avg_duration_minutes, type: 'number' },
          ],
          rows: rows.map((r) => ({
            table_number: r.table_number,
            area_name: r.area_name,
            sessions_count: Number(r.sessions_count),
            total_ttc: bankersRound(Number(r.total_ttc)),
            avg_per_session: bankersRound(Number(r.avg_per_session)),
            avg_duration_minutes: bankersRound(Number(r.avg_duration_minutes)),
          })),
        },
      ],
      meta: null,
    };
  }
}
