import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { bankersRound } from '../../../common/utils/money';
import { REPORT_LABELS, ReportLanguage } from '../../../common/i18n/report-labels';
import { DateRange } from '../../../common/utils/date-range';
import { UniversalReportResponse } from '../dto/report-query.dto';

const TZ = 'Africa/Casablanca';

@Injectable()
export class PaymentsGenerator {
  constructor(private ds: DataSource) {}

  async paymentSummary(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const methodRows = await this.ds.query<any[]>(
      `SELECT
         payment_method,
         COUNT(*)                    AS transaction_count,
         COALESCE(SUM(total_ttc), 0) AS total_ttc
       FROM transactions
       WHERE business_id = $1 AND status = 'completed'
         AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
       GROUP BY payment_method
       ORDER BY total_ttc DESC`,
      [businessId, period.fromStr, period.toStr, TZ],
    );

    const grandTotal = methodRows.reduce((s, r) => s + Number(r.total_ttc), 0);
    const grandCount = methodRows.reduce((s, r) => s + Number(r.transaction_count), 0);

    return {
      title: lang === 'ar' ? 'ملخص المدفوعات' : lang === 'en' ? 'Payment Summary' : 'Résumé des paiements',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_collected, value: bankersRound(grandTotal), type: 'money' },
        { label: L.transaction_count, value: grandCount, type: 'number' },
        { label: L.payment_methods_used, value: methodRows.length, type: 'number' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'حسب طريقة الدفع' : lang === 'en' ? 'By Payment Method' : 'Par mode de paiement',
          columns: [
            { key: 'payment_method', label: L.payment_method, type: 'text' },
            { key: 'transaction_count', label: L.transaction_count, type: 'number' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'percentage_of_total', label: L.percentage_of_total, type: 'percentage' },
          ],
          rows: methodRows.map((r) => ({
            payment_method: r.payment_method,
            transaction_count: Number(r.transaction_count),
            total_ttc: bankersRound(Number(r.total_ttc)),
            percentage_of_total: grandTotal > 0 ? bankersRound((Number(r.total_ttc) / grandTotal) * 100) : 0,
          })),
        },
      ],
      meta: null,
    };
  }

  async cashReport(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const [cashRows, grandRow] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4) AS date,
           COALESCE(SUM(total_ttc), 0)      AS total_ttc,
           COUNT(*)                         AS transaction_count
         FROM transactions
         WHERE business_id = $1 AND status = 'completed'
           AND payment_method = 'cash'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY DATE(created_at AT TIME ZONE $4)
         ORDER BY date ASC`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT COALESCE(SUM(total_ttc), 0) AS grand_total
         FROM transactions
         WHERE business_id = $1 AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    const cashTotal = cashRows.reduce((s, r) => s + Number(r.total_ttc), 0);
    const cashCount = cashRows.reduce((s, r) => s + Number(r.transaction_count), 0);
    const grandTotal = Number(grandRow[0]?.grand_total ?? 0);

    return {
      title: lang === 'ar' ? 'تقرير النقد' : lang === 'en' ? 'Cash Report' : 'Rapport espèces',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.cash_total, value: bankersRound(cashTotal), type: 'money' },
        { label: L.cash_transactions, value: cashCount, type: 'number' },
        { label: L.cash_share, value: grandTotal > 0 ? bankersRound((cashTotal / grandTotal) * 100) : 0, type: 'percentage' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'النقد حسب التاريخ' : lang === 'en' ? 'Cash by Date' : 'Espèces par date',
          columns: [
            { key: 'date', label: L.date, type: 'date' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'transaction_count', label: L.transaction_count, type: 'number' },
          ],
          rows: cashRows.map((r) => ({
            date: String(r.date).slice(0, 10),
            total_ttc: bankersRound(Number(r.total_ttc)),
            transaction_count: Number(r.transaction_count),
          })),
        },
      ],
      meta: null,
    };
  }

  async cardReport(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];

    const [cardRows, grandRow] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4) AS date,
           COALESCE(SUM(total_ttc), 0)      AS total_ttc,
           COUNT(*)                         AS transaction_count
         FROM transactions
         WHERE business_id = $1 AND status = 'completed'
           AND payment_method IN ('card_cmi', 'card_payzone')
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY DATE(created_at AT TIME ZONE $4)
         ORDER BY date ASC`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT COALESCE(SUM(total_ttc), 0) AS grand_total
         FROM transactions
         WHERE business_id = $1 AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    const cardTotal = cardRows.reduce((s, r) => s + Number(r.total_ttc), 0);
    const cardCount = cardRows.reduce((s, r) => s + Number(r.transaction_count), 0);
    const grandTotal = Number(grandRow[0]?.grand_total ?? 0);

    return {
      title: lang === 'ar' ? 'تقرير البطاقة' : lang === 'en' ? 'Card Report' : 'Rapport carte',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.card_total, value: bankersRound(cardTotal), type: 'money' },
        { label: L.card_transactions, value: cardCount, type: 'number' },
        { label: L.card_share, value: grandTotal > 0 ? bankersRound((cardTotal / grandTotal) * 100) : 0, type: 'percentage' },
      ],
      tables: [
        {
          title: lang === 'ar' ? 'البطاقة حسب التاريخ' : lang === 'en' ? 'Card by Date' : 'Carte par date',
          columns: [
            { key: 'date', label: L.date, type: 'date' },
            { key: 'total_ttc', label: L.total_ttc, type: 'money' },
            { key: 'transaction_count', label: L.transaction_count, type: 'number' },
          ],
          rows: cardRows.map((r) => ({
            date: String(r.date).slice(0, 10),
            total_ttc: bankersRound(Number(r.total_ttc)),
            transaction_count: Number(r.transaction_count),
          })),
        },
      ],
      meta: null,
    };
  }
}
