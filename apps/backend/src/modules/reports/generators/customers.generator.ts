import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { bankersRound } from '../../../common/utils/money';
import { REPORT_LABELS, ReportLanguage } from '../../../common/i18n/report-labels';
import { DateRange } from '../../../common/utils/date-range';
import { UniversalReportResponse } from '../dto/report-query.dto';

const TZ = 'Africa/Casablanca';

@Injectable()
export class CustomersGenerator {
  constructor(private ds: DataSource) {}

  async customerSummary(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    // Total active customers is NOT date-filtered — always the current live count.
    const [totalRow, newRow, returningRow, pointsRow, newDailyRows, txnDailyRows, pointsDailyRows] =
      await Promise.all([
        this.ds.query<any[]>(
          `SELECT COUNT(*) AS count
           FROM customers
           WHERE business_id = $1 AND is_active = true`,
          [businessId],
        ),
        this.ds.query<any[]>(
          `SELECT COUNT(*) AS count
           FROM customers
           WHERE business_id = $1 AND is_active = true
             AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
          [businessId, period.fromStr, period.toStr, TZ],
        ),
        this.ds.query<any[]>(
          `SELECT COUNT(DISTINCT customer_id) AS count
           FROM (
             SELECT customer_id
             FROM transactions
             WHERE business_id = $1 AND status = 'completed'
               AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
               AND customer_id IS NOT NULL
             GROUP BY customer_id
             HAVING COUNT(*) >= 2
           ) sub`,
          [businessId, period.fromStr, period.toStr, TZ],
        ),
        this.ds.query<any[]>(
          `SELECT COALESCE(SUM(delta), 0) AS total
           FROM customer_points_history
           WHERE business_id = $1 AND delta > 0
             AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
          [businessId, period.fromStr, period.toStr, TZ],
        ),
        this.ds.query<any[]>(
          `SELECT DATE(created_at AT TIME ZONE $4) AS date, COUNT(*) AS new_count
           FROM customers
           WHERE business_id = $1 AND is_active = true
             AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
           GROUP BY DATE(created_at AT TIME ZONE $4)
           ORDER BY date ASC`,
          [businessId, period.fromStr, period.toStr, TZ],
        ),
        this.ds.query<any[]>(
          `SELECT DATE(created_at AT TIME ZONE $4) AS date, COUNT(*) AS txn_count
           FROM transactions
           WHERE business_id = $1 AND status = 'completed'
             AND customer_id IS NOT NULL
             AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
           GROUP BY DATE(created_at AT TIME ZONE $4)
           ORDER BY date ASC`,
          [businessId, period.fromStr, period.toStr, TZ],
        ),
        this.ds.query<any[]>(
          `SELECT DATE(created_at AT TIME ZONE $4) AS date, COALESCE(SUM(delta), 0) AS points_earned
           FROM customer_points_history
           WHERE business_id = $1 AND delta > 0
             AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
           GROUP BY DATE(created_at AT TIME ZONE $4)
           ORDER BY date ASC`,
          [businessId, period.fromStr, period.toStr, TZ],
        ),
      ]);

    // Merge daily rows by date
    const dateMap = new Map<string, { date: string; new_customers: number; transactions_with_customer: number; points_earned: number }>();
    for (const r of newDailyRows) {
      const d = String(r.date).slice(0, 10);
      if (!dateMap.has(d)) dateMap.set(d, { date: d, new_customers: 0, transactions_with_customer: 0, points_earned: 0 });
      dateMap.get(d)!.new_customers = Number(r.new_count);
    }
    for (const r of txnDailyRows) {
      const d = String(r.date).slice(0, 10);
      if (!dateMap.has(d)) dateMap.set(d, { date: d, new_customers: 0, transactions_with_customer: 0, points_earned: 0 });
      dateMap.get(d)!.transactions_with_customer = Number(r.txn_count);
    }
    for (const r of pointsDailyRows) {
      const d = String(r.date).slice(0, 10);
      if (!dateMap.has(d)) dateMap.set(d, { date: d, new_customers: 0, transactions_with_customer: 0, points_earned: 0 });
      dateMap.get(d)!.points_earned = Number(r.points_earned);
    }
    const dailyRows = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      title: lang === 'ar' ? 'ملخص العملاء' : lang === 'en' ? 'Customer Summary' : 'Résumé clients',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_customers, value: Number(totalRow[0]?.count ?? 0), type: 'number' },
        { label: L.new_customers, value: Number(newRow[0]?.count ?? 0), type: 'number' },
        { label: L.returning_customers, value: Number(returningRow[0]?.count ?? 0), type: 'number' },
        { label: L.total_points_issued, value: Number(pointsRow[0]?.total ?? 0), type: 'number' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'نشاط العملاء' : lang === 'en' ? 'Customer Activity' : 'Activité clients',
          columns: [
            { key: 'date', label: L.date, type: 'date' },
            { key: 'new_customers', label: L.new_customers, type: 'number' },
            { key: 'transactions_with_customer', label: L.transactions_with_customer, type: 'number' },
            { key: 'points_earned', label: L.points_earned, type: 'number' },
          ],
          rows: dailyRows,
        },
      ],
      meta: null,
    };
  }

  async topCustomers(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const rows = await this.ds.query<any[]>(
      `SELECT
         c.customer_code,
         TRIM(CONCAT(c.first_name, ' ', c.last_name))    AS customer_name,
         c.phone,
         COALESCE(cg.name, '')                            AS grade_name,
         COUNT(t.id)                                      AS visit_count,
         COALESCE(SUM(t.total_ttc), 0)                   AS total_spent,
         COALESCE(
           SUM(t.total_ttc) / NULLIF(COUNT(t.id), 0),
           0
         )                                               AS avg_per_visit,
         c.points_balance
       FROM transactions t
       INNER JOIN customers c ON c.id = t.customer_id
       LEFT JOIN customer_grades cg ON cg.id = c.grade_id
       WHERE t.business_id = $1 AND t.status = 'completed'
         AND t.customer_id IS NOT NULL
         AND DATE(t.created_at AT TIME ZONE $4) BETWEEN $2 AND $3
       GROUP BY c.id, c.customer_code, c.first_name, c.last_name, c.phone,
                cg.name, c.points_balance
       ORDER BY total_spent DESC
       LIMIT 50`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const grandTotal = rows.reduce((s, r) => s + Number(r.total_spent), 0);

    return {
      title: lang === 'ar' ? 'أفضل العملاء' : lang === 'en' ? 'Top Customers' : 'Meilleurs clients',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_customer_revenue, value: bankersRound(grandTotal), type: 'money' },
        { label: L.avg_spend_per_customer, value: rows.length > 0 ? bankersRound(grandTotal / rows.length) : 0, type: 'money' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'أفضل 50 عميل' : lang === 'en' ? 'Top 50 Customers' : 'Top 50 clients',
          columns: [
            { key: 'customer_code', label: L.customer_code, type: 'text' },
            { key: 'customer_name', label: L.customer_name, type: 'text' },
            { key: 'phone', label: L.phone, type: 'text' },
            { key: 'grade_name', label: L.grade_name, type: 'text' },
            { key: 'visit_count', label: L.visit_count, type: 'number' },
            { key: 'total_spent', label: L.total_spent, type: 'money' },
            { key: 'avg_per_visit', label: L.avg_per_visit, type: 'money' },
            { key: 'points_balance', label: L.points_balance, type: 'number' },
          ],
          rows: rows.map((r) => ({
            customer_code: r.customer_code,
            customer_name: r.customer_name,
            phone: r.phone ?? '',
            grade_name: r.grade_name,
            visit_count: Number(r.visit_count),
            total_spent: bankersRound(Number(r.total_spent)),
            avg_per_visit: bankersRound(Number(r.avg_per_visit)),
            points_balance: Number(r.points_balance),
          })),
        },
      ],
      meta: null,
    };
  }

  async customerGrades(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const rows = await this.ds.query<any[]>(
      `SELECT
         COALESCE(cg.name, 'No Grade')              AS grade_name,
         COUNT(c.id)                                 AS customer_count,
         COALESCE(SUM(spend.total_spent), 0)         AS total_spent,
         COALESCE(AVG(spend.total_spent), 0)         AS avg_per_customer,
         COALESCE(AVG(c.points_balance), 0)          AS avg_points_balance
       FROM customers c
       LEFT JOIN customer_grades cg ON cg.id = c.grade_id
       LEFT JOIN (
         SELECT customer_id, SUM(total_ttc) AS total_spent
         FROM transactions
         WHERE business_id = $1 AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY customer_id
       ) spend ON spend.customer_id = c.id
       WHERE c.business_id = $1 AND c.is_active = true
       GROUP BY cg.id, cg.name
       ORDER BY total_spent DESC`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const totalCustomers = rows.reduce((s, r) => s + Number(r.customer_count), 0);
    const noGradeRow = rows.find((r) => r.grade_name === 'No Grade');
    const ungradedCount = noGradeRow ? Number(noGradeRow.customer_count) : 0;
    const gradedCount = totalCustomers - ungradedCount;
    const avgSpendPerGrade =
      rows.length > 0
        ? bankersRound(rows.reduce((s, r) => s + Number(r.total_spent), 0) / rows.length)
        : 0;

    return {
      title: lang === 'ar' ? 'درجات العملاء' : lang === 'en' ? 'Customer Grades' : 'Grades clients',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_graded_customers, value: gradedCount, type: 'number' },
        { label: L.ungraded_customers, value: ungradedCount, type: 'number' },
        { label: L.avg_spend_per_grade, value: avgSpendPerGrade, type: 'money' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'أداء الدرجات' : lang === 'en' ? 'Grade Performance' : 'Performance par grade',
          columns: [
            { key: 'grade_name', label: L.grade_name, type: 'text' },
            { key: 'customer_count', label: L.customer_count, type: 'number' },
            { key: 'total_spent', label: L.total_spent, type: 'money' },
            { key: 'avg_per_customer', label: L.avg_per_customer, type: 'money' },
            { key: 'avg_points_balance', label: L.avg_points_balance, type: 'number' },
          ],
          rows: rows.map((r) => ({
            grade_name: r.grade_name,
            customer_count: Number(r.customer_count),
            total_spent: bankersRound(Number(r.total_spent)),
            avg_per_customer: bankersRound(Number(r.avg_per_customer)),
            avg_points_balance: bankersRound(Number(r.avg_points_balance)),
          })),
        },
      ],
      meta: null,
    };
  }

  async loyaltySummary(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    // Outstanding balance is NOT date-filtered — always the current live liability.
    const [outstandingRow, periodStatsRow, dailyRows] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT COALESCE(SUM(points_balance), 0) AS outstanding
         FROM customers
         WHERE business_id = $1 AND is_active = true`,
        [businessId],
      ),
      this.ds.query<any[]>(
        `SELECT
           COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)                                         AS total_issued,
           COALESCE(SUM(CASE WHEN delta < 0 AND source IN ('sale', 'coupon_purchase') THEN ABS(delta) ELSE 0 END), 0) AS total_redeemed
         FROM customer_points_history
         WHERE business_id = $1
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4)                                                                         AS date,
           COALESCE(SUM(CASE WHEN delta > 0 AND source = 'sale' THEN delta ELSE 0 END), 0)                         AS points_earned,
           COALESCE(SUM(CASE WHEN delta < 0 AND source IN ('sale', 'coupon_purchase') THEN ABS(delta) ELSE 0 END), 0) AS points_redeemed,
           COALESCE(SUM(CASE WHEN source = 'manual_adjustment' THEN delta ELSE 0 END), 0)                          AS points_adjusted,
           COALESCE(SUM(delta), 0)                                                                                 AS net_change
         FROM customer_points_history
         WHERE business_id = $1
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY DATE(created_at AT TIME ZONE $4)
         ORDER BY date ASC`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    const outstanding = Number(outstandingRow[0]?.outstanding ?? 0);
    const periodStats = periodStatsRow[0];
    const issued = Number(periodStats?.total_issued ?? 0);
    const redeemed = Number(periodStats?.total_redeemed ?? 0);

    return {
      title: lang === 'ar' ? 'ملخص النقاط' : lang === 'en' ? 'Loyalty Summary' : 'Résumé fidélité',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_points_issued, value: issued, type: 'number' },
        { label: L.total_points_redeemed, value: redeemed, type: 'number' },
        { label: L.net_points_issued, value: issued - redeemed, type: 'number' },
        { label: L.total_points_outstanding, value: outstanding, type: 'number' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'نشاط النقاط يومياً' : lang === 'en' ? 'Points Activity by Day' : 'Activité points par jour',
          columns: [
            { key: 'date', label: L.date, type: 'date' },
            { key: 'points_earned', label: L.points_earned, type: 'number' },
            { key: 'points_redeemed', label: L.points_redeemed, type: 'number' },
            { key: 'points_adjusted', label: L.points_adjusted, type: 'number' },
            { key: 'net_change', label: L.net_change, type: 'number' },
          ],
          rows: dailyRows.map((r) => ({
            date: String(r.date).slice(0, 10),
            points_earned: Number(r.points_earned),
            points_redeemed: Number(r.points_redeemed),
            points_adjusted: Number(r.points_adjusted),
            net_change: Number(r.net_change),
          })),
        },
      ],
      meta: null,
    };
  }
}
