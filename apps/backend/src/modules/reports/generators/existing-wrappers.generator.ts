import { Injectable } from '@nestjs/common';
import { bankersRound } from '../../../common/utils/money';
import { REPORT_LABELS, ReportLanguage } from '../../../common/i18n/report-labels';
import { DateRange } from '../../../common/utils/date-range';
import { UniversalReportResponse } from '../dto/report-query.dto';
import { PromotionService } from '../../promotion/promotion.service';
import { CouponExtService } from '../../promotion/coupon-ext.service';
import { PointsExchangeService } from '../../promotion/pex.service';

@Injectable()
export class ExistingWrappersGenerator {
  constructor(
    private promotionService: PromotionService,
    private couponExtService: CouponExtService,
    private pexService: PointsExchangeService,
  ) {}

  async promotionReport(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];
    const data = await this.promotionService.promotionReport(businessId, {
      from_date: period.fromStr,
      to_date: period.toStr,
    } as any);

    const rows = data.per_promotion.map((r) => ({
      promotion_name: r.promotion_name,
      type: '',
      redemption_count: r.total_redemptions,
      total_discount_given: bankersRound(r.total_discount_given),
      avg_discount_per_use:
        r.total_redemptions > 0
          ? bankersRound(r.total_discount_given / r.total_redemptions)
          : 0,
    }));

    return {
      title: 'Rapport promotions',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_promotions_active, value: data.per_promotion.length, type: 'number' },
        { label: L.total_redemptions, value: data.totals.total_redemptions, type: 'number' },
        { label: L.total_discount_given, value: bankersRound(data.totals.total_discount_given), type: 'money' },
      ],
      tables: [
        {
          title: 'Performance des promotions',
          columns: [
            { key: 'promotion_name', label: L.promotion_name, type: 'text' },
            { key: 'type', label: L.promotion_type, type: 'text' },
            { key: 'redemption_count', label: L.redemption_count, type: 'number' },
            { key: 'total_discount_given', label: L.total_discount_given, type: 'money' },
            { key: 'avg_discount_per_use', label: L.avg_discount_per_use, type: 'money' },
          ],
          rows,
        },
      ],
      meta: null,
    };
  }

  async couponReport(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];
    const data = await this.couponExtService.couponReport(businessId, {
      from_date: period.fromStr,
      to_date: period.toStr,
    } as any);

    const rows = data.per_coupon_type.map((r) => ({
      coupon_type_name: r.coupon_type_name,
      issued: r.total_issued,
      redeemed: r.total_redeemed,
      expired: r.total_expired,
      voided: r.total_voided,
      discount_given: bankersRound(r.total_discount_given),
      redemption_rate: r.redemption_rate,
    }));

    const overallRate =
      data.totals.total_issued > 0
        ? bankersRound((data.totals.total_redeemed / data.totals.total_issued) * 100)
        : 0;

    return {
      title: 'Rapport coupons',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_issued, value: data.totals.total_issued, type: 'number' },
        { label: L.total_redeemed_label, value: data.totals.total_redeemed, type: 'number' },
        { label: L.redemption_rate, value: overallRate, type: 'percentage' },
        { label: L.total_discount_given, value: bankersRound(data.totals.total_discount_given), type: 'money' },
      ],
      tables: [
        {
          title: 'Détail par type de coupon',
          columns: [
            { key: 'coupon_type_name', label: L.coupon_type_name, type: 'text' },
            { key: 'issued', label: L.total_issued, type: 'number' },
            { key: 'redeemed', label: L.total_redeemed_label, type: 'number' },
            { key: 'expired', label: L.total_expired, type: 'number' },
            { key: 'voided', label: L.total_voided_label, type: 'number' },
            { key: 'discount_given', label: L.discount_given, type: 'money' },
            { key: 'redemption_rate', label: L.redemption_rate, type: 'percentage' },
          ],
          rows,
        },
      ],
      meta: null,
    };
  }

  async discountWriteOffs(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];
    const data = await this.couponExtService.discountWriteOffReport(businessId, {
      from_date: period.fromStr,
      to_date: period.toStr,
    } as any);

    return {
      title: 'Annulations de remises',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_write_offs_count, value: data.totals.count, type: 'number' },
        { label: L.total_write_off_amount, value: bankersRound(data.totals.total_written_off_amount), type: 'money' },
      ],
      tables: [
        {
          title: 'Annulations par terminal',
          columns: [
            { key: 'terminal_id', label: L.terminal_id_label, type: 'text' },
            { key: 'count', label: L.write_off_count_label, type: 'number' },
            { key: 'total_written_off_amount', label: L.total_write_off_amount, type: 'money' },
          ],
          rows: data.by_terminal.map((r) => ({
            terminal_id: r.terminal_id,
            count: r.count,
            total_written_off_amount: bankersRound(r.total_written_off_amount),
          })),
        },
      ],
      meta: null,
    };
  }

  async pointsExchangeReport(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const L = REPORT_LABELS[lang];
    const rows = await this.pexService.report(businessId, {
      from_date: period.fromStr,
      to_date: period.toStr,
    } as any);

    const totalRedemptions = rows.reduce((s: number, r: any) => s + r.total_redemptions, 0);
    const totalPointsSpent = rows.reduce((s: number, r: any) => s + r.points_spent_total, 0);
    const uniqueCustomers = rows.reduce((s: number, r: any) => s + r.customers_reached, 0);

    return {
      title: "Rapport d'échange de points",
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: L.total_redemptions, value: totalRedemptions, type: 'number' },
        { label: L.total_points_spent, value: totalPointsSpent, type: 'number' },
        { label: L.unique_customers_served, value: uniqueCustomers, type: 'number' },
      ],
      tables: [
        {
          title: "Activité d'échange",
          columns: [
            { key: 'rule_name', label: L.rule_name, type: 'text' },
            { key: 'redemption_count', label: L.redemption_count, type: 'number' },
            { key: 'points_spent', label: L.points_spent, type: 'number' },
            { key: 'items_issued', label: L.items_issued, type: 'number' },
          ],
          rows: rows.map((r: any) => ({
            rule_name: r.rule_name,
            redemption_count: r.total_redemptions,
            points_spent: r.points_spent_total,
            items_issued: r.total_redemptions,
          })),
        },
      ],
      meta: null,
    };
  }
}
