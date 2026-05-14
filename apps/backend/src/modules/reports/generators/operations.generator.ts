import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { bankersRound } from '../../../common/utils/money';
import { REPORT_LABELS, ReportLanguage } from '../../../common/i18n/report-labels';
import { DateRange } from '../../../common/utils/date-range';
import { ReportSummaryItem, ReportTable, UniversalReportResponse } from '../dto/report-query.dto';

const TZ = 'Africa/Casablanca';

@Injectable()
export class OperationsGenerator {
  constructor(private ds: DataSource) {}

  async employeePerformance(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const [rows, kpiRow] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS employee_name,
           COUNT(DISTINCT t.id)                          AS transactions_count,
           COALESCE(SUM(t.total_ttc), 0)                AS total_ttc,
           COALESCE(AVG(t.total_ttc), 0)                AS avg_order_value,
           COALESCE(v.void_count, 0)                    AS voids_count
         FROM transactions t
         INNER JOIN users u ON u.id = t.user_id
         LEFT JOIN (
           SELECT vd.voided_by, COUNT(*) AS void_count
           FROM voids vd
           INNER JOIN transactions t2 ON t2.id = vd.transaction_id
           WHERE t2.business_id = $1
             AND DATE(vd.voided_at AT TIME ZONE $4) BETWEEN $2 AND $3
           GROUP BY vd.voided_by
         ) v ON v.voided_by = u.id
         WHERE t.business_id = $1 AND t.status = 'completed'
           AND DATE(t.created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY u.id, u.first_name, u.last_name, v.void_count
         ORDER BY total_ttc DESC`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           COUNT(DISTINCT user_id) AS employee_count,
           COUNT(*)                AS orders_total
         FROM transactions
         WHERE business_id = $1 AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    const kpi = kpiRow[0];
    const topPerformer = rows.length > 0 ? rows[0].employee_name : '-';

    return {
      title: lang === 'ar' ? 'أداء الموظفين' : lang === 'en' ? 'Employee Performance' : 'Performance employés',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_employees, value: Number(kpi?.employee_count ?? 0), type: 'number' },
        { label: L.top_performer, value: topPerformer, type: 'text' },
        { label: L.orders_processed, value: Number(kpi?.orders_total ?? 0), type: 'number' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'مبيعات الموظفين' : lang === 'en' ? 'Employee Sales' : 'Ventes par employé',
          columns: [
            { key: 'employee_name', label: L.employee_name, type: 'text' },
            { key: 'transactions_count', label: L.transaction_count, type: 'number' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'avg_order_value', label: L.avg_order_value, type: 'money' },
            { key: 'voids_count', label: L.voids_count, type: 'number' },
          ],
          rows: rows.map((r) => ({
            employee_name: r.employee_name,
            transactions_count: Number(r.transactions_count),
            total_ttc: bankersRound(Number(r.total_ttc)),
            avg_order_value: bankersRound(Number(r.avg_order_value)),
            voids_count: Number(r.voids_count),
          })),
        },
      ],
      meta: null,
    };
  }

  async kitchenPerformance(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const [rows, kpiRow] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           DATE(added_at AT TIME ZONE $4)                                         AS date,
           COALESCE(SUM(CASE WHEN kds_status = 'new'       THEN quantity ELSE 0 END), 0) AS items_new,
           COALESCE(SUM(CASE WHEN kds_status = 'preparing' THEN quantity ELSE 0 END), 0) AS items_preparing,
           COALESCE(SUM(CASE WHEN kds_status = 'ready'     THEN quantity ELSE 0 END), 0) AS items_ready,
           COALESCE(SUM(CASE WHEN kds_status = 'served'    THEN quantity ELSE 0 END), 0) AS items_served,
           COALESCE(SUM(CASE WHEN kds_status = 'cancelled' THEN quantity ELSE 0 END), 0) AS items_cancelled
         FROM table_session_items
         WHERE business_id = $1
           AND DATE(added_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY DATE(added_at AT TIME ZONE $4)
         ORDER BY date ASC`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           COALESCE(SUM(CASE WHEN kds_status IN ('served','ready','preparing') THEN quantity ELSE 0 END), 0) AS items_prepared,
           COALESCE(SUM(CASE WHEN kds_status = 'cancelled' THEN quantity ELSE 0 END), 0)                    AS items_cancelled
         FROM table_session_items
         WHERE business_id = $1
           AND DATE(added_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    const kpi = kpiRow[0];

    return {
      title: lang === 'ar' ? 'أداء المطبخ' : lang === 'en' ? 'Kitchen Performance' : 'Performance cuisine',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.items_prepared, value: Number(kpi?.items_prepared ?? 0), type: 'number' },
        { label: L.items_cancelled_total, value: Number(kpi?.items_cancelled ?? 0), type: 'number' },
        { label: L.avg_prep_time, value: '-', type: 'text' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'عناصر المطبخ حسب الحالة' : lang === 'en' ? 'Kitchen Items by Status' : 'Articles cuisine par statut',
          columns: [
            { key: 'date', label: L.date, type: 'date' },
            { key: 'items_new', label: L.items_new, type: 'number' },
            { key: 'items_preparing', label: L.items_preparing, type: 'number' },
            { key: 'items_ready', label: L.items_ready, type: 'number' },
            { key: 'items_served', label: L.items_served, type: 'number' },
            { key: 'items_cancelled', label: L.items_cancelled, type: 'number' },
          ],
          rows: rows.map((r) => ({
            date: String(r.date).slice(0, 10),
            items_new: Number(r.items_new),
            items_preparing: Number(r.items_preparing),
            items_ready: Number(r.items_ready),
            items_served: Number(r.items_served),
            items_cancelled: Number(r.items_cancelled),
          })),
        },
      ],
      meta: null,
    };
  }

  async tableTurnover(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const [rows, kpiRow] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           tbl.table_number,
           COALESCE(da.name, '')                                                 AS area_name,
           COUNT(ts.id)                                                          AS sessions_count,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (ts.closed_at - ts.opened_at)) / 60), 0
           )                                                                     AS avg_duration_minutes,
           COALESCE(AVG(ts.guest_count), 0)                                     AS avg_guest_count,
           COALESCE(SUM(txn.session_ttc), 0)                                    AS total_ttc,
           COALESCE(SUM(ts.guest_count), 0)                                     AS total_guest_count
         FROM table_sessions ts
         INNER JOIN tables tbl ON tbl.id = ts.table_id
         LEFT JOIN dining_areas da ON da.id = tbl.area_id
         LEFT JOIN (
           SELECT table_session_id, SUM(total_ttc) AS session_ttc
           FROM transactions
           WHERE business_id = $1 AND status = 'completed'
           GROUP BY table_session_id
         ) txn ON txn.table_session_id = ts.id
         WHERE ts.business_id = $1 AND ts.status = 'paid'
           AND DATE(ts.opened_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY tbl.id, tbl.table_number, da.name
         ORDER BY total_ttc DESC`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           COUNT(ts.id)                                                         AS total_sessions,
           COALESCE(AVG(EXTRACT(EPOCH FROM (ts.closed_at - ts.opened_at)) / 60), 0) AS avg_duration,
           COALESCE(AVG(ts.guest_count), 0)                                    AS avg_covers,
           COALESCE(SUM(txn.session_ttc), 0)                                   AS grand_total_ttc,
           COALESCE(SUM(ts.guest_count), 0)                                    AS grand_guest_count
         FROM table_sessions ts
         LEFT JOIN (
           SELECT table_session_id, SUM(total_ttc) AS session_ttc
           FROM transactions
           WHERE business_id = $1 AND status = 'completed'
           GROUP BY table_session_id
         ) txn ON txn.table_session_id = ts.id
         WHERE ts.business_id = $1 AND ts.status = 'paid'
           AND DATE(ts.opened_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    const kpi = kpiRow[0];
    const grandGuestCount = Number(kpi?.grand_guest_count ?? 0);
    const grandTotalTtc = Number(kpi?.grand_total_ttc ?? 0);

    return {
      title: lang === 'ar' ? 'دوران الطاولات' : lang === 'en' ? 'Table Turnover' : 'Rotation des tables',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_sessions, value: Number(kpi?.total_sessions ?? 0), type: 'number' },
        { label: L.avg_duration, value: bankersRound(Number(kpi?.avg_duration ?? 0)), type: 'number' },
        { label: L.avg_covers, value: bankersRound(Number(kpi?.avg_covers ?? 0)), type: 'number' },
        {
          label: L.revenue_per_cover,
          value: grandGuestCount > 0 ? bankersRound(grandTotalTtc / grandGuestCount) : 0,
          type: 'money',
        },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'استخدام الطاولات' : lang === 'en' ? 'Table Utilization' : 'Utilisation des tables',
          columns: [
            { key: 'table_number', label: L.table_number, type: 'text' },
            { key: 'area_name', label: L.area_name, type: 'text' },
            { key: 'sessions_count', label: L.sessions_count, type: 'number' },
            { key: 'avg_duration_minutes', label: L.avg_duration_minutes, type: 'number' },
            { key: 'avg_guest_count', label: L.avg_guest_count, type: 'number' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'revenue_per_cover', label: L.revenue_per_cover, type: 'money' },
          ],
          rows: rows.map((r) => ({
            table_number: r.table_number,
            area_name: r.area_name,
            sessions_count: Number(r.sessions_count),
            avg_duration_minutes: bankersRound(Number(r.avg_duration_minutes)),
            avg_guest_count: bankersRound(Number(r.avg_guest_count)),
            total_ttc: bankersRound(Number(r.total_ttc)),
            revenue_per_cover:
              Number(r.total_guest_count) > 0
                ? bankersRound(Number(r.total_ttc) / Number(r.total_guest_count))
                : 0,
          })),
        },
      ],
      meta: null,
    };
  }

  async voidsCancellations(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];
    const isRestaurant = businessType === 'restaurant';

    const queries: Promise<any[]>[] = [
      this.ds.query<any[]>(
        `SELECT
           DATE(v.voided_at AT TIME ZONE $4)                         AS date,
           t.invoice_number                                           AS transaction_number,
           TRIM(CONCAT(u.first_name, ' ', u.last_name))              AS employee_name,
           COALESCE(t.total_ttc, 0)                                  AS total_ttc,
           v.reason
         FROM voids v
         INNER JOIN transactions t ON t.id = v.transaction_id
         INNER JOIN users u ON u.id = v.voided_by
         WHERE t.business_id = $1
           AND DATE(v.voided_at AT TIME ZONE $4) BETWEEN $2 AND $3
         ORDER BY v.voided_at DESC`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           COALESCE(COUNT(*), 0)           AS total_voided,
           COALESCE(SUM(t.total_ttc), 0)  AS voided_amount
         FROM voids v
         INNER JOIN transactions t ON t.id = v.transaction_id
         WHERE t.business_id = $1
           AND DATE(v.voided_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ];

    if (isRestaurant) {
      queries.push(
        this.ds.query<any[]>(
          `SELECT
             DATE(ts.closed_at AT TIME ZONE $4)                          AS date,
             tbl.table_number,
             TRIM(CONCAT(u.first_name, ' ', u.last_name))                AS opened_by_name,
             (SELECT COUNT(*) FROM table_session_items
              WHERE table_session_id = ts.id)                            AS items_count
           FROM table_sessions ts
           INNER JOIN tables tbl ON tbl.id = ts.table_id
           INNER JOIN users u ON u.id = ts.opened_by_user_id
           WHERE ts.business_id = $1
             AND ts.status = 'cancelled'
             AND DATE(ts.closed_at AT TIME ZONE $4) BETWEEN $2 AND $3
           ORDER BY ts.closed_at DESC`,
          [businessId, period.fromStr, period.toStr, TZ],
        ),
        this.ds.query<any[]>(
          `SELECT COUNT(*) AS cancelled_count
           FROM table_sessions
           WHERE business_id = $1 AND status = 'cancelled'
             AND DATE(closed_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
          [businessId, period.fromStr, period.toStr, TZ],
        ),
      );
    }

    const results = await Promise.all(queries);
    const voidRows = results[0];
    const voidKpi = results[1][0];
    const cancelledRows = isRestaurant ? results[2] : [];
    const cancelledKpi = isRestaurant ? results[3][0] : null;

    const summary: ReportSummaryItem[] = [
      { label: L.total_voided, value: Number(voidKpi?.total_voided ?? 0), type: 'number' },
      { label: L.voided_amount, value: bankersRound(Number(voidKpi?.voided_amount ?? 0)), type: 'money' },
    ];
    if (isRestaurant) {
      summary.push({ label: L.cancelled_sessions_count, value: Number(cancelledKpi?.cancelled_count ?? 0), type: 'number' });
    }

    const tables: ReportTable[] = [
      {
        title: lang === 'ar' ? 'المعاملات الملغاة' : lang === 'en' ? 'Voided Transactions' : 'Transactions annulées',
        columns: [
          { key: 'date', label: L.date, type: 'date' },
          { key: 'transaction_number', label: L.transaction_number, type: 'text' },
          { key: 'employee_name', label: L.employee_name, type: 'text' },
          { key: 'total_ttc', label: L.total_ttc, type: 'money' },
          { key: 'reason', label: L.reason, type: 'text' },
        ],
        rows: voidRows.map((r) => ({
          date: String(r.date).slice(0, 10),
          transaction_number: r.transaction_number ?? '',
          employee_name: r.employee_name,
          total_ttc: bankersRound(Number(r.total_ttc)),
          reason: r.reason ?? '',
        })),
      },
    ];

    if (isRestaurant) {
      tables.push({
        title: lang === 'ar' ? 'الجلسات الملغاة' : lang === 'en' ? 'Cancelled Table Sessions' : 'Sessions annulées',
        columns: [
          { key: 'date', label: L.date, type: 'date' },
          { key: 'table_number', label: L.table_number, type: 'text' },
          { key: 'opened_by_name', label: L.opened_by_name, type: 'text' },
          { key: 'items_count', label: L.items_count, type: 'number' },
        ],
        rows: cancelledRows.map((r) => ({
          date: String(r.date).slice(0, 10),
          table_number: r.table_number,
          opened_by_name: r.opened_by_name,
          items_count: Number(r.items_count),
        })),
      });
    }

    return {
      title: lang === 'ar' ? 'الإلغاءات' : lang === 'en' ? 'Voids & Cancellations' : 'Annulations',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary,
      tables,
      meta: null,
    };
  }
}
