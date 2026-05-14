import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';
import { SalesGenerator } from './generators/sales.generator';
import { PaymentsGenerator } from './generators/payments.generator';
import { CustomersGenerator } from './generators/customers.generator';
import { OperationsGenerator } from './generators/operations.generator';
import { AccountingGenerator } from './generators/accounting.generator';
import { ExistingWrappersGenerator } from './generators/existing-wrappers.generator';
import { PromotionService } from '../promotion/promotion.service';
import { CouponExtService } from '../promotion/coupon-ext.service';
import { PointsExchangeService } from '../promotion/pex.service';
import { Business } from '../../common/entities/business.entity';
import { resolveDateRange } from '../../common/utils/date-range';
import { REPORT_LABELS } from '../../common/i18n/report-labels';

// ─── helpers ───────────────────────────────────────────────────────────────

const BIZ_ID = 'biz-reports-1';

function makeBusinessRepo(businessType = 'retail') {
  return {
    findOne: jest.fn().mockResolvedValue({
      id: BIZ_ID,
      business_type: { name: businessType },
    }),
  };
}

const EMPTY_KPI = [{ total_ttc: '0', total_ht: '0', total_tva: '0', orders: '0', discount_total: '0', customers_served: '0' }];

const MOCK_PROMO_SERVICE = {
  promotionReport: jest.fn().mockResolvedValue({ per_promotion: [], totals: { total_redemptions: 0, total_discount_given: 0, revenue_with_promotion: 0 } }),
};
const MOCK_COUPON_EXT_SERVICE = {
  couponReport: jest.fn().mockResolvedValue({ per_coupon_type: [], totals: { total_issued: 0, total_redeemed: 0, total_expired: 0, total_voided: 0, total_discount_given: 0 } }),
  discountWriteOffReport: jest.fn().mockResolvedValue({ by_terminal: [], totals: { count: 0, total_written_off_amount: 0 } }),
};
const MOCK_PEX_SERVICE = {
  report: jest.fn().mockResolvedValue([]),
};

async function buildService(businessType = 'retail', dsQuery?: jest.Mock) {
  const ds = { query: dsQuery ?? jest.fn().mockResolvedValue([]) } as unknown as DataSource;
  const module = await Test.createTestingModule({
    providers: [
      ReportsService,
      SalesGenerator,
      PaymentsGenerator,
      CustomersGenerator,
      OperationsGenerator,
      AccountingGenerator,
      ExistingWrappersGenerator,
      { provide: getRepositoryToken(Business), useValue: makeBusinessRepo(businessType) },
      { provide: DataSource, useValue: ds },
      { provide: PromotionService, useValue: MOCK_PROMO_SERVICE },
      { provide: CouponExtService, useValue: MOCK_COUPON_EXT_SERVICE },
      { provide: PointsExchangeService, useValue: MOCK_PEX_SERVICE },
    ],
  }).compile();
  return { service: module.get(ReportsService), ds };
}

// ─── date-range utility ────────────────────────────────────────────────────

describe('resolveDateRange', () => {
  it('resolves today', () => {
    const r = resolveDateRange('today');
    expect(r.fromStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.fromStr).toBe(r.toStr);
    expect(r.from).toBeInstanceOf(Date);
  });

  it('resolves yesterday as one day before today', () => {
    const today = resolveDateRange('today');
    const yest = resolveDateRange('yesterday');
    const diffMs = today.from.getTime() - yest.from.getTime();
    expect(diffMs).toBe(86_400_000);
  });

  it('resolves last_7days spanning 7 days inclusive', () => {
    const r = resolveDateRange('last_7days');
    const diffMs = r.to.getTime() - r.from.getTime();
    expect(diffMs).toBe(6 * 86_400_000);
  });

  it('resolves custom range', () => {
    const r = resolveDateRange('custom', '2026-01-01', '2026-01-31');
    expect(r.fromStr).toBe('2026-01-01');
    expect(r.toStr).toBe('2026-01-31');
  });

  it('throws on custom with missing to', () => {
    expect(() => resolveDateRange('custom', '2026-01-01')).toThrow(BadRequestException);
  });

  it('throws on custom with from > to', () => {
    expect(() => resolveDateRange('custom', '2026-05-10', '2026-05-01')).toThrow(BadRequestException);
  });

  it('throws on invalid type', () => {
    expect(() => resolveDateRange('not_a_type')).toThrow(BadRequestException);
  });
});

// ─── ReportsService dispatcher ─────────────────────────────────────────────

describe('ReportsService', () => {
  it('throws 404 for unknown reportId', async () => {
    const { service } = await buildService();
    await expect(
      service.getReport(BIZ_ID, 'not-a-real-report', { type: 'today' }, 'fr'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 404 for sales-by-table on retail business', async () => {
    const { service } = await buildService('retail');
    await expect(
      service.getReport(BIZ_ID, 'sales-by-table', { type: 'today' }, 'fr'),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows sales-by-table for restaurant business', async () => {
    const dsQuery = jest
      .fn()
      .mockResolvedValueOnce([]) // table rows
      .mockResolvedValueOnce([{ total_ttc: '1000', total_sessions: '5' }]); // KPI
    const { service } = await buildService('restaurant', dsQuery);
    const result = await service.getReport(BIZ_ID, 'sales-by-table', { type: 'today' }, 'fr');
    expect(result.title).toContain('table');
    expect(result.currency).toBe('MAD');
  });

  it('allows sales-by-table for hotel business', async () => {
    const dsQuery = jest
      .fn()
      .mockResolvedValueOnce([]) // table rows
      .mockResolvedValueOnce([{ total_ttc: '500', total_sessions: '2' }]); // KPI
    const { service } = await buildService('hotel', dsQuery);
    const result = await service.getReport(BIZ_ID, 'sales-by-table', { type: 'today' }, 'fr');
    expect(result).toHaveProperty('title');
    expect(result.currency).toBe('MAD');
  });

  it('sales-summary returns universal schema shape', async () => {
    const dsQuery = jest
      .fn()
      .mockResolvedValueOnce(EMPTY_KPI)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'sales-summary', { type: 'today' }, 'fr');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('currency', 'MAD');
    expect(result).toHaveProperty('language', 'fr');
    expect(result).toHaveProperty('business_type', 'retail');
    expect(result).toHaveProperty('generated_at');
    expect(result).toHaveProperty('period');
    expect(result).toHaveProperty('meta', null);
    expect(Array.isArray(result.summary)).toBe(true);
    expect(Array.isArray(result.tables)).toBe(true);
    expect(result.summary.length).toBe(7);
    expect(result.tables.length).toBe(2);
  });

  it('sales-summary summary cards include all required keys', async () => {
    const dsQuery = jest
      .fn()
      .mockResolvedValueOnce([{
        total_ttc: '1200.50',
        total_ht: '1000.00',
        total_tva: '200.50',
        orders: '15',
        discount_total: '50.00',
        customers_served: '10',
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'sales-summary', { type: 'today' }, 'en');
    const summaryKeys = result.summary.map((s) => s.type);
    expect(summaryKeys).toContain('money');
    expect(summaryKeys).toContain('number');
    expect(result.summary.find((s) => s.value === 1200.50)).toBeDefined();
    expect(result.summary.find((s) => s.value === 15)).toBeDefined();
  });

  it('sales-summary in Arabic uses Arabic labels', async () => {
    const dsQuery = jest
      .fn()
      .mockResolvedValueOnce(EMPTY_KPI)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'sales-summary', { type: 'today' }, 'ar');
    expect(result.language).toBe('ar');
    expect(result.summary[0].label).toBe('المجموع الكلي');
  });

  it('sales-by-category computes percentage_of_total', async () => {
    const dsQuery = jest.fn().mockResolvedValue([
      { category_name: 'Food', items_sold: '10', total_ttc: '600.00' },
      { category_name: 'Drinks', items_sold: '5', total_ttc: '400.00' },
    ]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'sales-by-category', { type: 'today' }, 'fr');
    const rows = result.tables[0].rows;
    expect(rows[0].percentage_of_total).toBe(60);
    expect(rows[1].percentage_of_total).toBe(40);
  });

  it('sales-by-day includes day_of_week field', async () => {
    const kpiQuery = jest.fn()
      .mockResolvedValueOnce([{ date: '2026-05-11', dow: '1', orders: '5', total_ttc: '500', total_ht: '420', total_tva: '80', avg_order_value: '100' }])
      .mockResolvedValueOnce([{ total_ttc: '500', orders: '5' }]);
    const { service } = await buildService('retail', kpiQuery);
    const result = await service.getReport(BIZ_ID, 'sales-by-day', { type: 'today' }, 'fr');
    expect(result.tables[0].rows[0]).toHaveProperty('day_of_week');
    expect(result.tables[0].rows[0].day_of_week).toBe('Lundi');
  });

  it('sales-by-hour identifies peak and quietest hour', async () => {
    const hourRows = [
      { hour: '9', orders: '10', total_ttc: '500', avg_order_value: '50' },
      { hour: '12', orders: '30', total_ttc: '2000', avg_order_value: '67' },
      { hour: '15', orders: '5', total_ttc: '100', avg_order_value: '20' },
    ];
    const dsQuery = jest.fn()
      .mockResolvedValueOnce(hourRows)
      .mockResolvedValueOnce([{ orders: '45' }]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'sales-by-hour', { type: 'today' }, 'fr');
    const peakCard = result.summary.find((s) => s.label === REPORT_LABELS_FR.peak_hour);
    expect(peakCard?.value).toBe('12:00');
  });

  it('empty period returns zero summary values, not 404', async () => {
    const dsQuery = jest
      .fn()
      .mockResolvedValueOnce([{ total_ttc: '0', total_ht: '0', total_tva: '0', orders: '0', discount_total: '0', customers_served: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'sales-summary', { type: 'today' }, 'fr');
    expect(result.summary[0].value).toBe(0);
    expect(result.tables[0].rows).toHaveLength(0);
  });

  // ─── Part B tests ──────────────────────────────────────────────────────────

  it('payment-summary returns correct percentages summing to 100', async () => {
    const methodRows = [
      { payment_method: 'cash', transaction_count: '10', total_ttc: '600.00' },
      { payment_method: 'card_cmi', transaction_count: '5', total_ttc: '400.00' },
    ];
    const { service } = await buildService('retail', jest.fn().mockResolvedValue(methodRows));
    const result = await service.getReport(BIZ_ID, 'payment-summary', { type: 'today' }, 'fr');
    const rows = result.tables[0].rows;
    expect(rows[0].percentage_of_total).toBe(60);
    expect(rows[1].percentage_of_total).toBe(40);
    expect(rows[0].percentage_of_total + rows[1].percentage_of_total).toBe(100);
  });

  it('payment-summary returns empty rows not 404 for empty period (TRAP 5)', async () => {
    const { service } = await buildService('retail', jest.fn().mockResolvedValue([]));
    const result = await service.getReport(BIZ_ID, 'payment-summary', { type: 'today' }, 'fr');
    expect(result.tables[0].rows).toHaveLength(0);
    expect(result.summary[0].value).toBe(0); // total collected = 0
  });

  it('customer-summary total_customers card is NOT date-filtered', async () => {
    // First query = non-date-filtered total (50); subsequent queries are date-filtered.
    const dsQuery = jest.fn()
      .mockResolvedValueOnce([{ count: '50' }])  // total active (no date filter)
      .mockResolvedValueOnce([{ count: '3' }])   // new in period
      .mockResolvedValueOnce([{ count: '2' }])   // returning in period
      .mockResolvedValueOnce([{ total: '100' }]) // points issued
      .mockResolvedValueOnce([])                 // new per day
      .mockResolvedValueOnce([])                 // txn with customer per day
      .mockResolvedValueOnce([]);                // points per day
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'customer-summary', { type: 'today' }, 'fr');
    // Total customers card = 50 (from non-date-filtered query)
    const totalCard = result.summary[0];
    expect(totalCard.value).toBe(50);
    // The first DS query must NOT include BETWEEN (it's the non-date-filtered total)
    const firstCall = (dsQuery.mock.calls[0] as [string, any[]])[0];
    expect(firstCall).not.toMatch(/BETWEEN/);
  });

  it('loyalty-summary total_points_outstanding card is NOT date-filtered', async () => {
    // First query = outstanding balance (live, no date filter); subsequent queries filtered.
    const dsQuery = jest.fn()
      .mockResolvedValueOnce([{ outstanding: '5000' }])               // outstanding (no date filter)
      .mockResolvedValueOnce([{ total_issued: '200', total_redeemed: '50' }]) // period stats
      .mockResolvedValueOnce([]);                                      // daily rows
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'loyalty-summary', { type: 'today' }, 'fr');
    // outstanding balance is the 4th summary card (index 3)
    const outstandingCard = result.summary.find((s) => s.value === 5000);
    expect(outstandingCard).toBeDefined();
    // The first DS query must NOT include BETWEEN
    const firstCall = (dsQuery.mock.calls[0] as [string, any[]])[0];
    expect(firstCall).not.toMatch(/BETWEEN/);
  });

  it('kitchen-performance returns 404 for retail business', async () => {
    const { service } = await buildService('retail');
    await expect(
      service.getReport(BIZ_ID, 'kitchen-performance', { type: 'today' }, 'fr'),
    ).rejects.toThrow(NotFoundException);
  });

  it('table-turnover returns 404 for retail business', async () => {
    const { service } = await buildService('retail');
    await expect(
      service.getReport(BIZ_ID, 'table-turnover', { type: 'today' }, 'fr'),
    ).rejects.toThrow(NotFoundException);
  });

  it('table-turnover returns 404 for pharmacy business', async () => {
    const { service } = await buildService('pharmacy');
    await expect(
      service.getReport(BIZ_ID, 'table-turnover', { type: 'today' }, 'fr'),
    ).rejects.toThrow(NotFoundException);
  });

  it('table-turnover handles split bills (2 transactions on one session)', async () => {
    // Per split-bill handling: the SQL subquery sums multiple transactions per session.
    // The mock returns a per-table row where total_ttc = 300 (two splits of 150 each).
    const tableRows = [
      {
        table_number: 'T1', area_name: 'Main', sessions_count: '1',
        total_ttc: '300.00', avg_duration_minutes: '45', total_guest_count: '2',
        avg_guest_count: '2',
      },
    ];
    const kpiRow = [{ total_sessions: '1', avg_duration: '45', avg_covers: '2', grand_total_ttc: '300', grand_guest_count: '2' }];
    const dsQuery = jest.fn()
      .mockResolvedValueOnce(tableRows)
      .mockResolvedValueOnce(kpiRow);
    const { service } = await buildService('restaurant', dsQuery);
    const result = await service.getReport(BIZ_ID, 'table-turnover', { type: 'today' }, 'fr');
    const row = result.tables[0].rows[0];
    expect(row.total_ttc).toBe(300); // sum of both split transactions
    expect(row.revenue_per_cover).toBe(150); // 300 / 2 guests
  });

  it('employee-performance voids_count reflects voided_by user not transaction creator', async () => {
    // Manager (user B) voided a transaction created by cashier (user A).
    // voids_count should be on user B, not user A.
    const empRows = [
      { employee_name: 'Alice Cashier', transactions_count: '10', total_ttc: '1000', avg_order_value: '100', voids_count: '0' },
      { employee_name: 'Bob Manager', transactions_count: '2', total_ttc: '200', avg_order_value: '100', voids_count: '3' },
    ];
    const kpiRow = [{ employee_count: '2', orders_total: '12' }];
    const dsQuery = jest.fn()
      .mockResolvedValueOnce(empRows)
      .mockResolvedValueOnce(kpiRow);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'employee-performance', { type: 'today' }, 'fr');
    const rows = result.tables[0].rows;
    const alice = rows.find((r) => r.employee_name === 'Alice Cashier');
    const bob = rows.find((r) => r.employee_name === 'Bob Manager');
    expect(alice?.voids_count).toBe(0);
    expect(bob?.voids_count).toBe(3);
    // The SQL query for employee-performance must reference voids table with voided_by
    const sqlCall = (dsQuery.mock.calls[0] as [string, any[]])[0];
    expect(sqlCall).toMatch(/voided_by/);
  });

  it('top-customers returns at most 50 rows', async () => {
    const fiftyRows = Array.from({ length: 50 }, (_, i) => ({
      customer_code: `C${i}`,
      customer_name: `Customer ${i}`,
      phone: '0600000000',
      grade_name: '',
      visit_count: '5',
      total_spent: '500',
      avg_per_visit: '100',
      points_balance: 10,
    }));
    const { service } = await buildService('retail', jest.fn().mockResolvedValue(fiftyRows));
    const result = await service.getReport(BIZ_ID, 'top-customers', { type: 'today' }, 'fr');
    expect(result.tables[0].rows.length).toBeLessThanOrEqual(50);
    expect(result.tables[0].rows.length).toBe(50);
  });

  it('voids-cancellations omits cancelled-sessions table for non-restaurant', async () => {
    const dsQuery = jest.fn()
      .mockResolvedValueOnce([]) // void rows
      .mockResolvedValueOnce([{ total_voided: '0', voided_amount: '0' }]); // kpi
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'voids-cancellations', { type: 'today' }, 'fr');
    expect(result.tables).toHaveLength(1); // only "Voided Transactions" table
    expect(result.tables[0].columns.some((c) => c.key === 'transaction_number')).toBe(true);
  });

  it('voids-cancellations includes cancelled-sessions table for restaurant', async () => {
    const dsQuery = jest.fn()
      .mockResolvedValueOnce([]) // void rows
      .mockResolvedValueOnce([{ total_voided: '0', voided_amount: '0' }]) // void kpi
      .mockResolvedValueOnce([]) // cancelled sessions rows
      .mockResolvedValueOnce([{ cancelled_count: '0' }]); // cancelled kpi
    const { service } = await buildService('restaurant', dsQuery);
    const result = await service.getReport(BIZ_ID, 'voids-cancellations', { type: 'today' }, 'fr');
    expect(result.tables).toHaveLength(2); // both tables present
    expect(result.tables[1].columns.some((c) => c.key === 'opened_by_name')).toBe(true);
  });
});

// expose label keys for assertion above
const REPORT_LABELS_FR = REPORT_LABELS['fr'];

// ─── Part C tests ──────────────────────────────────────────────────────────────

describe('ReportsService Part C — TVA & Accounting', () => {
  it('tva-declaration returns universal schema with TVA rate table', async () => {
    const dsQuery = jest.fn().mockResolvedValue([
      { tva_rate: '20', total_ht: '1000', total_tva: '200', total_ttc: '1200', transaction_count: '5' },
    ]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'tva-declaration', { type: 'today' }, 'fr');
    expect(result.currency).toBe('MAD');
    expect(result.meta).toBeNull();
    expect(result.tables[0].columns.some((c) => c.key === 'tva_rate')).toBe(true);
    expect(result.summary[0].type).toBe('money');
    expect(result.tables[0].rows[0].tva_rate).toBe(20);
    expect(result.tables[0].rows[0].total_ttc).toBe(1200);
  });

  it('tva-declaration uses calendar date (tva-by-rate SQL must reference t.created_at)', async () => {
    const dsQuery = jest.fn().mockResolvedValue([]);
    const { service } = await buildService('retail', dsQuery);
    await service.getReport(BIZ_ID, 'tva-declaration', { type: 'today' }, 'fr');
    const sql: string = dsQuery.mock.calls[0][0];
    expect(sql).toMatch(/t\.created_at AT TIME ZONE/);
    expect(sql).not.toMatch(/ti\.created_at AT TIME ZONE/);
  });

  it('tva-declaration empty period returns zero-value summary, not 404', async () => {
    const { service } = await buildService('retail', jest.fn().mockResolvedValue([]));
    const result = await service.getReport(BIZ_ID, 'tva-declaration', { type: 'today' }, 'fr');
    expect(result.summary.every((s) => s.value === 0)).toBe(true);
    expect(result.tables[0].rows).toHaveLength(0);
  });

  it('daily-close returns exactly 12 fixed rows', async () => {
    const mainRow = [{
      gross_ttc: '0', total_discounts: '0', net_ttc: '0', total_ht: '0', total_tva: '0',
      cash_payments: '0', card_payments: '0', transaction_count: '0',
      points_earned: '0', points_redeemed: '0',
    }];
    const zeroRow = [{ void_count: '0' }];
    const couponRow = [{ coupons_redeemed: '0' }];
    const dsQuery = jest.fn()
      .mockResolvedValueOnce(mainRow)
      .mockResolvedValueOnce(zeroRow)
      .mockResolvedValueOnce(couponRow);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'daily-close', { type: 'today' }, 'fr');
    expect(result.tables[0].rows).toHaveLength(12);
  });

  it('daily-close type=custom uses from date only, ignores to', async () => {
    const mainRow = [{ gross_ttc: '0', total_discounts: '0', net_ttc: '0', total_ht: '0', total_tva: '0', cash_payments: '0', card_payments: '0', transaction_count: '0', points_earned: '0', points_redeemed: '0' }];
    const dsQuery = jest.fn()
      .mockResolvedValueOnce(mainRow)
      .mockResolvedValueOnce([{ void_count: '0' }])
      .mockResolvedValueOnce([{ coupons_redeemed: '0' }]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'daily-close', { type: 'custom', from: '2026-05-01', to: '2026-05-10' }, 'fr');
    // period.from and period.to in response must both be the from date (2026-05-01)
    expect(result.period.from).toBe('2026-05-01');
    expect(result.period.to).toBe('2026-05-01');
    // The SQL call must use 2026-05-01 as target_day param
    const params: any[] = dsQuery.mock.calls[0][1];
    expect(params[1]).toBe('2026-05-01');
  });

  it('daily-close empty day returns 12 zero-value rows', async () => {
    const emptyMain = [{ gross_ttc: '0', total_discounts: '0', net_ttc: '0', total_ht: '0', total_tva: '0', cash_payments: '0', card_payments: '0', transaction_count: '0', points_earned: '0', points_redeemed: '0' }];
    const dsQuery = jest.fn()
      .mockResolvedValueOnce(emptyMain)
      .mockResolvedValueOnce([{ void_count: '0' }])
      .mockResolvedValueOnce([{ coupons_redeemed: '0' }]);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'daily-close', { type: 'today' }, 'fr');
    expect(result.tables[0].rows).toHaveLength(12);
    expect(result.tables[0].rows.every((r) => r.value === 0)).toBe(true);
  });

  it('invoice-register meta contains total_rows, page, limit', async () => {
    const summaryRow = [{ total_invoices: '10', total_ttc: '1000', total_tva: '50' }];
    const countRow = [{ total_rows: '10' }];
    const invoiceRows: any[] = [];
    const dsQuery = jest.fn()
      .mockResolvedValueOnce(summaryRow)
      .mockResolvedValueOnce(countRow)
      .mockResolvedValueOnce(invoiceRows);
    const { service } = await buildService('retail', dsQuery);
    const result = await service.getReport(BIZ_ID, 'invoice-register', { type: 'today', page: 1, limit: 500 }, 'fr');
    expect(result.meta).not.toBeNull();
    expect(result.meta!.total_rows).toBe(10);
    expect(result.meta!.page).toBe(1);
    expect(result.meta!.limit).toBe(500);
  });

  it('invoice-register summary totals do not change across pages', async () => {
    const summaryRow = [{ total_invoices: '1200', total_ttc: '60000', total_tva: '3000' }];
    const countRow = [{ total_rows: '1200' }];
    const dsQueryPage1 = jest.fn()
      .mockResolvedValueOnce(summaryRow)
      .mockResolvedValueOnce(countRow)
      .mockResolvedValueOnce([]);
    const dsQueryPage2 = jest.fn()
      .mockResolvedValueOnce(summaryRow)
      .mockResolvedValueOnce(countRow)
      .mockResolvedValueOnce([]);
    const { service: svc1 } = await buildService('retail', dsQueryPage1);
    const { service: svc2 } = await buildService('retail', dsQueryPage2);
    const page1 = await svc1.getReport(BIZ_ID, 'invoice-register', { type: 'this_month', page: 1, limit: 500 }, 'fr');
    const page2 = await svc2.getReport(BIZ_ID, 'invoice-register', { type: 'this_month', page: 2, limit: 500 }, 'fr');
    // Summary totals must be identical regardless of page
    expect(page1.summary.find((s) => s.value === 60000)).toBeDefined();
    expect(page2.summary.find((s) => s.value === 60000)).toBeDefined();
    expect(page1.meta!.total_rows).toBe(page2.meta!.total_rows);
  });

  it('tva-by-rate joins through transactions for date grouping (TRAP 8)', async () => {
    const dsQuery = jest.fn().mockResolvedValue([]);
    const { service } = await buildService('retail', dsQuery);
    await service.getReport(BIZ_ID, 'tva-by-rate', { type: 'today' }, 'fr');
    const sql: string = dsQuery.mock.calls[0][0];
    // Must group by t.created_at, not ti.created_at
    expect(sql).toMatch(/DATE\(t\.created_at AT TIME ZONE/);
    expect(sql).not.toMatch(/DATE\(ti\.created_at/);
  });

  it('tva-by-rate empty period returns zero-value summary', async () => {
    const { service } = await buildService('retail', jest.fn().mockResolvedValue([]));
    const result = await service.getReport(BIZ_ID, 'tva-by-rate', { type: 'today' }, 'fr');
    expect(result.tables[0].rows).toHaveLength(0);
    expect(result.summary[0].value).toBe(0); // total TVA = 0
    expect(result.meta).toBeNull();
  });
});

describe('ReportsService Part C — Existing Wrappers', () => {
  it('promotion-report wraps existing service output into universal schema', async () => {
    const promoMock = {
      promotionReport: jest.fn().mockResolvedValue({
        per_promotion: [{ promotion_name: 'Summer Sale', total_redemptions: 10, total_discount_given: 50, unique_customers: 8, revenue_with_promotion: 800 }],
        totals: { total_redemptions: 10, total_discount_given: 50, revenue_with_promotion: 800 },
      }),
    };
    const module = await Test.createTestingModule({
      providers: [
        ReportsService, SalesGenerator, PaymentsGenerator, CustomersGenerator, OperationsGenerator,
        AccountingGenerator, ExistingWrappersGenerator,
        { provide: getRepositoryToken(Business), useValue: makeBusinessRepo() },
        { provide: DataSource, useValue: { query: jest.fn().mockResolvedValue([]) } },
        { provide: PromotionService, useValue: promoMock },
        { provide: CouponExtService, useValue: MOCK_COUPON_EXT_SERVICE },
        { provide: PointsExchangeService, useValue: MOCK_PEX_SERVICE },
      ],
    }).compile();
    const service = module.get(ReportsService);
    const result = await service.getReport(BIZ_ID, 'promotion-report', { type: 'today' }, 'fr');
    expect(result.currency).toBe('MAD');
    expect(result.meta).toBeNull();
    expect(result.tables[0].rows[0].promotion_name).toBe('Summer Sale');
    expect(result.summary.find((s) => s.value === 10)).toBeDefined(); // total redemptions
    // Existing service must be called — not a new query
    expect(promoMock.promotionReport).toHaveBeenCalledWith(BIZ_ID, expect.objectContaining({ from_date: expect.any(String), to_date: expect.any(String) }));
  });

  it('coupon-report wraps existing service output into universal schema', async () => {
    const couponMock = {
      couponReport: jest.fn().mockResolvedValue({
        per_coupon_type: [{ coupon_type_name: 'PROMO10', total_issued: 20, total_redeemed: 15, total_expired: 3, total_voided: 2, total_discount_given: 150, redemption_rate: 75 }],
        totals: { total_issued: 20, total_redeemed: 15, total_expired: 3, total_voided: 2, total_discount_given: 150 },
      }),
      discountWriteOffReport: jest.fn().mockResolvedValue({ by_terminal: [], totals: { count: 0, total_written_off_amount: 0 } }),
    };
    const module = await Test.createTestingModule({
      providers: [
        ReportsService, SalesGenerator, PaymentsGenerator, CustomersGenerator, OperationsGenerator,
        AccountingGenerator, ExistingWrappersGenerator,
        { provide: getRepositoryToken(Business), useValue: makeBusinessRepo() },
        { provide: DataSource, useValue: { query: jest.fn().mockResolvedValue([]) } },
        { provide: PromotionService, useValue: MOCK_PROMO_SERVICE },
        { provide: CouponExtService, useValue: couponMock },
        { provide: PointsExchangeService, useValue: MOCK_PEX_SERVICE },
      ],
    }).compile();
    const service = module.get(ReportsService);
    const result = await service.getReport(BIZ_ID, 'coupon-report', { type: 'today' }, 'fr');
    expect(result.currency).toBe('MAD');
    expect(result.meta).toBeNull();
    expect(result.tables[0].rows[0].coupon_type_name).toBe('PROMO10');
    expect(couponMock.couponReport).toHaveBeenCalled();
  });

  it('discount-write-offs wraps existing service output into universal schema', async () => {
    const writeOffMock = {
      couponReport: jest.fn(),
      discountWriteOffReport: jest.fn().mockResolvedValue({
        by_terminal: [{ terminal_id: 'T001', count: 3, total_written_off_amount: 45.00 }],
        totals: { count: 3, total_written_off_amount: 45.00 },
      }),
    };
    const module = await Test.createTestingModule({
      providers: [
        ReportsService, SalesGenerator, PaymentsGenerator, CustomersGenerator, OperationsGenerator,
        AccountingGenerator, ExistingWrappersGenerator,
        { provide: getRepositoryToken(Business), useValue: makeBusinessRepo() },
        { provide: DataSource, useValue: { query: jest.fn().mockResolvedValue([]) } },
        { provide: PromotionService, useValue: MOCK_PROMO_SERVICE },
        { provide: CouponExtService, useValue: writeOffMock },
        { provide: PointsExchangeService, useValue: MOCK_PEX_SERVICE },
      ],
    }).compile();
    const service = module.get(ReportsService);
    const result = await service.getReport(BIZ_ID, 'discount-write-offs', { type: 'today' }, 'fr');
    expect(result.meta).toBeNull();
    expect(result.tables[0].rows[0].terminal_id).toBe('T001');
    expect(result.summary.find((s) => s.value === 3)).toBeDefined();
    expect(writeOffMock.discountWriteOffReport).toHaveBeenCalled();
  });

  it('points-exchange-report wraps existing service output into universal schema', async () => {
    const pexMock = {
      report: jest.fn().mockResolvedValue([
        { rule_id: 'r1', rule_name: 'Coffee', rule_type: 'discount', point_value: 1, total_redemptions: 5, points_spent_total: 500, customers_reached: 3, granted_coupon_redemption_rate: null },
      ]),
    };
    const module = await Test.createTestingModule({
      providers: [
        ReportsService, SalesGenerator, PaymentsGenerator, CustomersGenerator, OperationsGenerator,
        AccountingGenerator, ExistingWrappersGenerator,
        { provide: getRepositoryToken(Business), useValue: makeBusinessRepo() },
        { provide: DataSource, useValue: { query: jest.fn().mockResolvedValue([]) } },
        { provide: PromotionService, useValue: MOCK_PROMO_SERVICE },
        { provide: CouponExtService, useValue: MOCK_COUPON_EXT_SERVICE },
        { provide: PointsExchangeService, useValue: pexMock },
      ],
    }).compile();
    const service = module.get(ReportsService);
    const result = await service.getReport(BIZ_ID, 'points-exchange-report', { type: 'today' }, 'fr');
    expect(result.meta).toBeNull();
    expect(result.tables[0].rows[0].rule_name).toBe('Coffee');
    expect(result.summary.find((s) => s.value === 500)).toBeDefined(); // total points spent
    expect(pexMock.report).toHaveBeenCalled();
  });

  it('all 26 report IDs return a result — none throws REPORT_NOT_IMPLEMENTED', async () => {
    const allIds = [
      'sales-summary', 'sales-by-hour', 'sales-by-day', 'sales-by-month',
      'sales-by-category', 'sales-by-product',
      'payment-summary', 'cash-report', 'card-report',
      'customer-summary', 'top-customers', 'customer-grades', 'loyalty-summary',
      'employee-performance', 'voids-cancellations',
      'tva-declaration', 'daily-close', 'invoice-register', 'tva-by-rate',
      'promotion-report', 'coupon-report', 'discount-write-offs', 'points-exchange-report',
    ];
    // restaurant-only IDs tested separately
    const restaurantIds = ['sales-by-table', 'kitchen-performance', 'table-turnover'];

    for (const id of allIds) {
      const dsQuery = jest.fn().mockResolvedValue([{ gross_ttc: '0', total_discounts: '0', net_ttc: '0', total_ht: '0', total_tva: '0', cash_payments: '0', card_payments: '0', transaction_count: '0', points_earned: '0', points_redeemed: '0', void_count: '0', coupons_redeemed: '0', total_invoices: '0', total_rows: '0', tva_rate: '0' }]);
      const { service } = await buildService('retail', dsQuery);
      let threw500 = false;
      try {
        await service.getReport(BIZ_ID, id, { type: 'today' }, 'fr');
      } catch (e: any) {
        if (e?.response?.error === 'REPORT_NOT_IMPLEMENTED') threw500 = true;
      }
      expect(threw500).toBe(false);
    }

    for (const id of restaurantIds) {
      const dsQuery = jest.fn().mockResolvedValue([]);
      const { service } = await buildService('restaurant', dsQuery);
      let threw500 = false;
      try {
        await service.getReport(BIZ_ID, id, { type: 'today' }, 'fr');
      } catch (e: any) {
        if (e?.response?.error === 'REPORT_NOT_IMPLEMENTED') threw500 = true;
      }
      expect(threw500).toBe(false);
    }
  });
});
