import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { bankersRound } from '../../../common/utils/money';
import { DateRange } from '../../../common/utils/date-range';
import { UniversalReportResponse } from '../dto/report-query.dto';
import { ReportLanguage } from '../../../common/i18n/report-labels';

const TZ = 'Africa/Casablanca';

@Injectable()
export class CapitalDetailGenerator {
  constructor(private ds: DataSource) {}

  async capitalDetail(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const [salesRows, refundRows, inputTvaRows, pointsRows] = await Promise.all([
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4)              AS day,
           COALESCE(SUM(total_ttc),  0)                  AS revenue_ttc,
           COALESCE(SUM(total_tva),  0)                  AS tva_collected,
           COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_ttc ELSE 0 END), 0) AS cash_collected,
           COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_ttc ELSE 0 END), 0) AS card_collected
         FROM transactions
         WHERE business_id = $1
           AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY 1
         ORDER BY 1`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4)          AS day,
           COALESCE(SUM(total_ttc), 0)               AS refunds_issued
         FROM transactions
         WHERE business_id = $1
           AND status = 'refunded'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY 1
         ORDER BY 1`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      this.ds.query<any[]>(
        `SELECT
           DATE(po.order_date)                        AS day,
           COALESCE(SUM(poi.quantity * poi.unit_price_ht * (poi.tva_rate / 100.0)), 0) AS tva_paid_input
         FROM purchase_order_items poi
         INNER JOIN purchase_orders po ON po.id = poi.purchase_order_id
         WHERE po.business_id = $1
           AND po.status IN ('confirmed','received','partially_received')
           AND DATE(po.order_date) BETWEEN $2 AND $3
         GROUP BY 1
         ORDER BY 1`,
        [businessId, period.fromStr, period.toStr],
      ),
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4)          AS day,
           COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) AS points_earned,
           COALESCE(SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END), 0) AS points_redeemed
         FROM customer_points_history
         WHERE business_id = $1
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY 1
         ORDER BY 1`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    const byDay = new Map<string, any>();
    for (const r of salesRows) {
      byDay.set(r.day, {
        day: r.day,
        revenue_ttc: bankersRound(Number(r.revenue_ttc)),
        tva_collected: bankersRound(Number(r.tva_collected)),
        cash_collected: bankersRound(Number(r.cash_collected)),
        card_collected: bankersRound(Number(r.card_collected)),
        refunds_issued: 0,
        tva_paid_input: 0,
        points_liability_change: 0,
        stored_value_liability_change: 0,
      });
    }
    for (const r of refundRows) {
      const d = byDay.get(r.day) ?? { day: r.day, revenue_ttc: 0, tva_collected: 0, cash_collected: 0, card_collected: 0, refunds_issued: 0, tva_paid_input: 0, points_liability_change: 0, stored_value_liability_change: 0 };
      d.refunds_issued = bankersRound(Number(r.refunds_issued));
      byDay.set(r.day, d);
    }
    for (const r of inputTvaRows) {
      const d = byDay.get(r.day);
      if (d) d.tva_paid_input = bankersRound(Number(r.tva_paid_input));
    }
    for (const r of pointsRows) {
      const d = byDay.get(r.day);
      if (d) d.points_liability_change = bankersRound((Number(r.points_earned) - Number(r.points_redeemed)) * 0.05);
    }

    const rows = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));

    let runningCash = 0;
    for (const row of rows) {
      runningCash = bankersRound(runningCash + row.cash_collected + row.card_collected - row.refunds_issued);
      row.running_cash_position = runningCash;
    }

    const totRevenue = bankersRound(rows.reduce((s, r) => s + r.revenue_ttc, 0));
    const totTva = bankersRound(rows.reduce((s, r) => s + r.tva_collected, 0));
    const totRefunds = bankersRound(rows.reduce((s, r) => s + r.refunds_issued, 0));
    const totCash = bankersRound(rows.reduce((s, r) => s + r.cash_collected, 0));
    const totCard = bankersRound(rows.reduce((s, r) => s + r.card_collected, 0));

    return {
      title: 'Capital Detail',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: 'Chiffre d\'affaires TTC', value: totRevenue, type: 'money' },
        { label: 'TVA collectée', value: totTva, type: 'money' },
        { label: 'Remboursements', value: totRefunds, type: 'money' },
        { label: 'Encaissements espèces', value: totCash, type: 'money' },
        { label: 'Encaissements carte', value: totCard, type: 'money' },
      ],
      tables: [
        {
          title: 'Détail journalier',
          columns: [
            { key: 'day', label: 'Date', type: 'date' },
            { key: 'revenue_ttc', label: 'CA TTC', type: 'money' },
            { key: 'tva_collected', label: 'TVA collectée', type: 'money' },
            { key: 'tva_paid_input', label: 'TVA déductible', type: 'money' },
            { key: 'refunds_issued', label: 'Remboursements', type: 'money' },
            { key: 'cash_collected', label: 'Espèces', type: 'money' },
            { key: 'card_collected', label: 'Carte', type: 'money' },
            { key: 'points_liability_change', label: 'Variation points', type: 'money' },
            { key: 'running_cash_position', label: 'Position trésorerie', type: 'money' },
          ],
          rows,
        },
      ],
      meta: null,
    };
  }
}
