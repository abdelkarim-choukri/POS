import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { bankersRound } from '../../../common/utils/money';
import { REPORT_LABELS, ReportLanguage } from '../../../common/i18n/report-labels';
import { DateRange } from '../../../common/utils/date-range';
import { UniversalReportResponse } from '../dto/report-query.dto';

const TZ = 'Africa/Casablanca';

function casablancaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function resolveTargetDay(type: string, period: DateRange): string {
  if (type === 'yesterday' || type === 'custom') return period.fromStr;
  if (type === 'today') return period.fromStr;
  return casablancaToday();
}

@Injectable()
export class AccountingGenerator {
  constructor(private ds: DataSource) {}

  async tvaDeclaration(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const rows = await this.ds.query<any[]>(
      `SELECT
         ti.tva_rate,
         COALESCE(SUM(ti.item_ht), 0)                    AS total_ht,
         COALESCE(SUM(ti.item_tva), 0)                   AS total_tva,
         COALESCE(SUM(ti.item_ttc), 0)                   AS total_ttc,
         COUNT(DISTINCT ti.transaction_id)               AS transaction_count
       FROM transaction_items ti
       INNER JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.business_id = $1
         AND t.status = 'completed'
         AND DATE(t.created_at AT TIME ZONE $4) BETWEEN $2 AND $3
       GROUP BY ti.tva_rate
       ORDER BY ti.tva_rate DESC`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const byRate = rows.map((r) => ({
      tva_rate: bankersRound(Number(r.tva_rate)),
      total_ht: bankersRound(Number(r.total_ht)),
      total_tva: bankersRound(Number(r.total_tva)),
      total_ttc: bankersRound(Number(r.total_ttc)),
      transaction_count: Number(r.transaction_count),
    }));

    const totalHt = bankersRound(byRate.reduce((s, r) => s + r.total_ht, 0));
    const totalTva = bankersRound(byRate.reduce((s, r) => s + r.total_tva, 0));
    const totalTtc = bankersRound(byRate.reduce((s, r) => s + r.total_ttc, 0));
    const totalTxns = byRate.reduce((s, r) => s + r.transaction_count, 0);

    return {
      title: 'Déclaration TVA',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_ht, value: totalHt, type: 'money' },
        { label: L.total_tva, value: totalTva, type: 'money' },
        { label: L.total_ttc, value: totalTtc, type: 'money' },
        { label: L.transaction_count, value: totalTxns, type: 'number' },
      ],
      tables: [
        {
          title: 'TVA par taux',
          columns: [
            { key: 'tva_rate', label: L.tva_rate, type: 'percentage' },
            { key: 'total_ht', label: L.total_ht, type: 'money' },
            { key: 'total_tva', label: L.total_tva, type: 'money' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'transaction_count', label: L.transaction_count, type: 'number' },
          ],
          rows: byRate,
        },
      ],
      meta: null,
    };
  }

  async dailyClose(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    cutoffTime?: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];
    const cutoffHours = cutoffTime ? parseInt(cutoffTime.split(':')[0], 10) : 2;
    const targetDay = resolveTargetDay(type, period);

    const [mainRows, voidRows, couponRows] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           COALESCE(SUM(total_ttc + discount_total), 0)                                                          AS gross_ttc,
           COALESCE(SUM(discount_total), 0)                                                                      AS total_discounts,
           COALESCE(SUM(total_ttc), 0)                                                                           AS net_ttc,
           COALESCE(SUM(total_ht), 0)                                                                            AS total_ht,
           COALESCE(SUM(total_tva), 0)                                                                           AS total_tva,
           COALESCE(SUM(total_ttc) FILTER (WHERE payment_method = 'cash'), 0)                                    AS cash_payments,
           COALESCE(SUM(total_ttc) FILTER (WHERE payment_method IN ('card_cmi', 'card_payzone')), 0)             AS card_payments,
           COUNT(*)                                                                                               AS transaction_count,
           COALESCE(SUM(points_earned), 0)                                                                       AS points_earned,
           COALESCE(SUM(points_redeemed), 0)                                                                     AS points_redeemed
         FROM transactions
         WHERE business_id = $1
           AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $3) = $2::date`,
        [businessId, targetDay, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT COUNT(*) AS void_count
         FROM voids v
         INNER JOIN transactions t ON t.id = v.transaction_id
         WHERE t.business_id = $1
           AND DATE(v.voided_at AT TIME ZONE $3) = $2::date`,
        [businessId, targetDay, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT COUNT(*) AS coupons_redeemed
         FROM coupon_redemptions cr
         INNER JOIN transactions t ON t.id = cr.transaction_id
         WHERE t.business_id = $1
           AND DATE(cr.redeemed_at AT TIME ZONE $3) = $2::date`,
        [businessId, targetDay, TZ],
      ),
    ]);

    const m = mainRows[0] ?? {};
    const grossTtc = bankersRound(Number(m.gross_ttc ?? 0));
    const totalDiscounts = bankersRound(Number(m.total_discounts ?? 0));
    const netTtc = bankersRound(Number(m.net_ttc ?? 0));
    const totalHt = bankersRound(Number(m.total_ht ?? 0));
    const totalTva = bankersRound(Number(m.total_tva ?? 0));
    const cashPayments = bankersRound(Number(m.cash_payments ?? 0));
    const cardPayments = bankersRound(Number(m.card_payments ?? 0));
    const txnCount = Number(m.transaction_count ?? 0);
    const pointsEarned = Number(m.points_earned ?? 0);
    const pointsRedeemed = Number(m.points_redeemed ?? 0);
    const voidCount = Number(voidRows[0]?.void_count ?? 0);
    const couponsRedeemed = Number(couponRows[0]?.coupons_redeemed ?? 0);

    return {
      title: 'Clôture journalière',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: targetDay, to: targetDay },
      summary: [
        { label: L.total_ttc, value: netTtc, type: 'money' },
        { label: L.total_tva, value: totalTva, type: 'money' },
        { label: L.transaction_count, value: txnCount, type: 'number' },
        { label: L.cash_total, value: cashPayments, type: 'money' },
        { label: L.card_total, value: cardPayments, type: 'money' },
      ],
      tables: [
        {
          title: 'Résumé de la journée',
          columns: [
            { key: 'metric', label: L.metric, type: 'text' },
            { key: 'value', label: 'Valeur', type: 'number' },
          ],
          rows: [
            { metric: L.gross_ttc, value: grossTtc },
            { metric: L.discount_total, value: totalDiscounts },
            { metric: L.net_ttc, value: netTtc },
            { metric: L.total_ht, value: totalHt },
            { metric: L.total_tva, value: totalTva },
            { metric: L.cash_payments_row, value: cashPayments },
            { metric: L.card_payments_row, value: cardPayments },
            { metric: L.transaction_count, value: txnCount },
            { metric: L.voids_count, value: voidCount },
            { metric: L.points_earned, value: pointsEarned },
            { metric: L.points_redeemed, value: pointsRedeemed },
            { metric: L.coupons_redeemed_row, value: couponsRedeemed },
          ],
        },
      ],
      meta: null,
    };
  }

  async invoiceRegister(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    page: number,
    limit: number,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];
    const offset = (page - 1) * limit;

    const [summaryRows, countRows, rows] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           COUNT(*)                        AS total_invoices,
           COALESCE(SUM(total_ttc), 0)    AS total_ttc,
           COALESCE(SUM(total_tva), 0)    AS total_tva
         FROM transactions
         WHERE business_id = $1 AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT COUNT(*) AS total_rows
         FROM transactions
         WHERE business_id = $1 AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           t.invoice_number,
           DATE(t.created_at AT TIME ZONE $4)                                           AS date,
           TRIM(CONCAT(c.first_name, ' ', c.last_name))                                AS customer_name,
           t.payment_method,
           t.total_ht,
           t.total_tva,
           t.total_ttc,
           TRIM(CONCAT(u.first_name, ' ', u.last_name))                                AS employee_name
         FROM transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         INNER JOIN users u ON u.id = t.user_id
         WHERE t.business_id = $1 AND t.status = 'completed'
           AND DATE(t.created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         ORDER BY t.created_at ASC
         LIMIT $5 OFFSET $6`,
        [businessId, period.fromStr, period.toStr, TZ, limit, offset],
      ),
    ]);

    const s = summaryRows[0] ?? {};
    const totalInvoices = Number(s.total_invoices ?? 0);
    const totalTtc = bankersRound(Number(s.total_ttc ?? 0));
    const totalTva = bankersRound(Number(s.total_tva ?? 0));
    const totalRows = Number(countRows[0]?.total_rows ?? 0);

    return {
      title: 'Registre des factures',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_invoices, value: totalInvoices, type: 'number' },
        { label: L.total_ttc, value: totalTtc, type: 'money' },
        { label: L.total_tva, value: totalTva, type: 'money' },
      ],
      tables: [
        {
          title: 'Registre des factures',
          columns: [
            { key: 'invoice_number', label: L.invoice_number, type: 'text' },
            { key: 'date', label: L.date, type: 'date' },
            { key: 'customer_name', label: L.customer_name, type: 'text' },
            { key: 'payment_method', label: L.payment_method, type: 'text' },
            { key: 'total_ht', label: L.total_ht, type: 'money' },
            { key: 'total_tva', label: L.total_tva, type: 'money' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'employee_name', label: L.employee_name, type: 'text' },
          ],
          rows: rows.map((r) => ({
            invoice_number: r.invoice_number ?? '',
            date: r.date,
            customer_name: r.customer_name?.trim() || null,
            payment_method: r.payment_method,
            total_ht: bankersRound(Number(r.total_ht)),
            total_tva: bankersRound(Number(r.total_tva)),
            total_ttc: bankersRound(Number(r.total_ttc)),
            employee_name: r.employee_name,
          })),
        },
      ],
      meta: { total_rows: totalRows, page, limit },
    };
  }

  async tvaByRate(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const rows = await this.ds.query<any[]>(
      `SELECT
         DATE(t.created_at AT TIME ZONE $4)                                       AS date,
         COALESCE(SUM(CASE WHEN ti.tva_rate = 20 THEN ti.item_ht  ELSE 0 END), 0) AS tva_rate_20_ht,
         COALESCE(SUM(CASE WHEN ti.tva_rate = 20 THEN ti.item_tva ELSE 0 END), 0) AS tva_rate_20_tva,
         COALESCE(SUM(CASE WHEN ti.tva_rate = 10 THEN ti.item_ht  ELSE 0 END), 0) AS tva_rate_10_ht,
         COALESCE(SUM(CASE WHEN ti.tva_rate = 10 THEN ti.item_tva ELSE 0 END), 0) AS tva_rate_10_tva,
         COALESCE(SUM(CASE WHEN ti.tva_rate = 7  THEN ti.item_ht  ELSE 0 END), 0) AS tva_rate_7_ht,
         COALESCE(SUM(CASE WHEN ti.tva_rate = 7  THEN ti.item_tva ELSE 0 END), 0) AS tva_rate_7_tva,
         COALESCE(SUM(CASE WHEN ti.tva_rate = 0  THEN ti.item_ht  ELSE 0 END), 0) AS tva_rate_0_ht
       FROM transaction_items ti
       INNER JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.business_id = $1
         AND t.status = 'completed'
         AND DATE(t.created_at AT TIME ZONE $4) BETWEEN $2 AND $3
       GROUP BY DATE(t.created_at AT TIME ZONE $4)
       ORDER BY date ASC`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const totalTva = bankersRound(
      rows.reduce(
        (s, r) =>
          s + Number(r.tva_rate_20_tva) + Number(r.tva_rate_10_tva) + Number(r.tva_rate_7_tva),
        0,
      ),
    );

    const totalHt = rows.reduce(
      (s, r) =>
        s +
        Number(r.tva_rate_20_ht) +
        Number(r.tva_rate_10_ht) +
        Number(r.tva_rate_7_ht) +
        Number(r.tva_rate_0_ht),
      0,
    );
    const weightedAvgRate =
      totalHt > 0 ? bankersRound((totalTva / totalHt) * 100) : 0;

    return {
      title: 'TVA par taux et par jour',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_tva, value: totalTva, type: 'money' },
        { label: L.weighted_avg_rate, value: weightedAvgRate, type: 'percentage' },
      ],
      tables: [
        {
          title: 'TVA par taux et par jour',
          columns: [
            { key: 'date', label: L.date, type: 'date' },
            { key: 'tva_rate_20_ht', label: L.tva_rate_20_ht, type: 'money' },
            { key: 'tva_rate_20_tva', label: L.tva_rate_20_tva, type: 'money' },
            { key: 'tva_rate_10_ht', label: L.tva_rate_10_ht, type: 'money' },
            { key: 'tva_rate_10_tva', label: L.tva_rate_10_tva, type: 'money' },
            { key: 'tva_rate_7_ht', label: L.tva_rate_7_ht, type: 'money' },
            { key: 'tva_rate_7_tva', label: L.tva_rate_7_tva, type: 'money' },
            { key: 'tva_rate_0_ht', label: L.tva_rate_0_ht, type: 'money' },
          ],
          rows: rows.map((r) => ({
            date: r.date,
            tva_rate_20_ht: bankersRound(Number(r.tva_rate_20_ht)),
            tva_rate_20_tva: bankersRound(Number(r.tva_rate_20_tva)),
            tva_rate_10_ht: bankersRound(Number(r.tva_rate_10_ht)),
            tva_rate_10_tva: bankersRound(Number(r.tva_rate_10_tva)),
            tva_rate_7_ht: bankersRound(Number(r.tva_rate_7_ht)),
            tva_rate_7_tva: bankersRound(Number(r.tva_rate_7_tva)),
            tva_rate_0_ht: bankersRound(Number(r.tva_rate_0_ht)),
          })),
        },
      ],
      meta: null,
    };
  }
}
